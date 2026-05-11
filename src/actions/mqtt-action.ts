import streamDeck, {
  action,
  SingletonAction,
  type KeyDownEvent,
  type KeyUpEvent,
  type WillAppearEvent,
  type WillDisappearEvent,
  type DidReceiveSettingsEvent,
} from "@elgato/streamdeck";
import { connectionManager } from "../services/connection-manager";
import { topicRouter } from "../services/topic-router";
import { brokerKey } from "../util/broker-key";
import { logger } from "../util/logger";
import { resolveJsonPath, applyDisplayTemplate } from "../util/resolve-json-path";
import { StaleTracker } from "../util/stale-tracker";
import { LongPressCoordinator } from "../util/long-press-coordinator";
import type { MqttActionSettings, BrokerConfig } from "../types/settings";

/** Threshold for distinguishing short vs long press (D-27, v2.0: configurable deferred). */
const LONG_PRESS_THRESHOLD_MS = 500;

/**
 * Unified MQTT action handling both publish (on key press) and subscribe (on appear).
 * Single action per D-01. Broker config from global settings, action config per button.
 */
@action({ UUID: "io.github.meintechblog.mqtt-master.mqtt" })
export class MqttAction extends SingletonAction<MqttActionSettings> {
  /**
   * Cache of previous subscribeTopic per context, used for detecting topic changes
   * in onDidReceiveSettings to unregister old and register new topic.
   */
  private previousTopics = new Map<string, string>();
  /** In-memory cache of last received MQTT value per context (for toggle decisions) */
  private lastValues = new Map<string, string>();
  /** Timestamp of last keyDown per context, for long press duration calculation */
  private keyDownTimestamps = new Map<string, number>();
  /** Per-context stale-watch (timer + flag). Pure logic, see util/stale-tracker. */
  private staleTracker = new StaleTracker();
  /** Per-context long-press timer fired while key is still held. See util/long-press-coordinator. */
  private longPressCoordinator = new LongPressCoordinator();

  /** String setting keys that should always be trimmed before use or persistence. */
  private static readonly TRIMMABLE_KEYS = [
    "brokerHost", "brokerPort", "brokerUsername", "brokerPassword",
    "subscribeTopic", "publishTopic", "publishPayload", "jsonPath", "displayTemplate",
    "onPayload", "offPayload", "onValue", "offValue",
    "longPressTopic", "longPressPayload",
  ] as const;

  /**
   * Trim all string fields in settings (PI textfields commonly have stray spaces).
   * Returns true if anything actually changed, so the caller can persist.
   */
  private trimSettings(settings: MqttActionSettings): boolean {
    let changed = false;
    for (const key of MqttAction.TRIMMABLE_KEYS) {
      const val = settings[key];
      if (typeof val === "string") {
        const trimmed = val.trim();
        if (trimmed !== val) {
          (settings as Record<string, unknown>)[key] = trimmed;
          changed = true;
        }
      }
    }
    return changed;
  }

  /** Trim and persist via setSettings if anything changed — keeps PI clean across opens. */
  private async normalizeSettings(
    settings: MqttActionSettings,
    actionRef: { setSettings: (s: MqttActionSettings) => Promise<void> },
  ): Promise<void> {
    if (this.trimSettings(settings)) {
      await actionRef.setSettings(settings).catch((err: unknown) => {
        logger.error(`setSettings failed: ${err instanceof Error ? err.message : String(err)}`);
      });
    }
  }

  /** Build BrokerConfig from already-trimmed settings. */
  private getBrokerConfigFromSettings(settings: MqttActionSettings): BrokerConfig | null {
    const host = settings.brokerHost || "";
    if (!host) {
      logger.warn("No broker configured in action settings");
      return null;
    }
    return {
      host,
      port: parseInt(settings.brokerPort || "1883", 10) || 1883,
      username: settings.brokerUsername || undefined,
      password: settings.brokerPassword || undefined,
      tls: settings.brokerTls ?? false,
    };
  }

  /**
   * Apply a value (already extracted, post-jsonPath) to the button: render the
   * title via displayTemplate and update toggle state per onValue/offValue.
   *
   * Toggle state rules:
   * - Both onValue and offValue set: exact match -> on, anything else -> off.
   * - Only offValue set: match = off, anything else = on.
   * - Only onValue set: match = on, anything else = off.
   */
  private applyValueToButton(
    settings: MqttActionSettings,
    actionRef: WillAppearEvent<MqttActionSettings>["action"],
    extracted: string,
  ): void {
    const baseDisplay = settings.displayTemplate
      ? applyDisplayTemplate(settings.displayTemplate, extracted)
      : extracted;
    const stalePrefix = this.staleTracker.isStale(actionRef.id)
      ? (settings.stalePrefix || "⚠ ")
      : "";
    const displayValue = stalePrefix + baseDisplay;

    actionRef.setTitle(displayValue).catch((err: unknown) => {
      logger.error(`setTitle failed: ${err instanceof Error ? err.message : String(err)}`);
    });

    if (!actionRef.isKey()) return;

    const { onValue, offValue } = settings;
    if (onValue && offValue) {
      actionRef.setState(extracted === onValue ? 1 : 0).catch(() => {});
    } else if (offValue) {
      actionRef.setState(extracted === offValue ? 0 : 1).catch(() => {});
    } else if (onValue) {
      actionRef.setState(extracted === onValue ? 1 : 0).catch(() => {});
    }
  }

  /**
   * (Re)arm the stale-watch timer for a context. No-op when threshold is 0.
   * On fire, re-renders the cached value with the stale prefix.
   */
  private scheduleStaleTimer(
    settings: MqttActionSettings,
    actionRef: WillAppearEvent<MqttActionSettings>["action"],
  ): void {
    const threshold = settings.staleThresholdSeconds ?? 0;
    this.staleTracker.arm(actionRef.id, threshold, (id) => {
      const cached = this.lastValues.get(id) ?? settings.lastValue;
      if (cached) this.applyValueToButton(settings, actionRef, cached);
      logger.info(`Stale: context ${id} marked stale after ${threshold}s of subscribe inactivity`);
    });
  }

  /**
   * Build the subscription callback used by topicRouter. Extracts via jsonPath,
   * caches lastValue, and delegates display to applyValueToButton.
   */
  private buildSubscriptionCallback(
    settings: MqttActionSettings,
    actionRef: WillAppearEvent<MqttActionSettings>["action"],
  ): (payload: string) => void {
    return (rawPayload: string) => {
      const extracted = settings.jsonPath
        ? resolveJsonPath(rawPayload, settings.jsonPath)
        : rawPayload;

      logger.info(`callback: raw="${rawPayload.substring(0, 80)}" jsonPath="${settings.jsonPath}" extracted="${extracted}"`);

      // Fresh data — drop any stale flag before re-rendering, then arm the next watch.
      this.staleTracker.markFresh(actionRef.id);

      settings.lastValue = extracted;
      this.lastValues.set(actionRef.id, extracted);

      this.applyValueToButton(settings, actionRef, extracted);
      this.scheduleStaleTimer(settings, actionRef);
    };
  }

  /**
   * Subscribe to topic on appear. Restores cached lastValue if available, and
   * registers a status listener so the connection manager can re-render the
   * cached value on every (re)connect rather than wiping the title.
   */
  override async onWillAppear(ev: WillAppearEvent<MqttActionSettings>): Promise<void> {
    const settings = ev.payload.settings;
    logger.info(`willAppear settings: ${JSON.stringify(settings)}`);

    await this.normalizeSettings(settings, ev.action);

    const config = this.getBrokerConfigFromSettings(settings);
    if (!config) {
      await ev.action.setTitle("No Broker");
      return;
    }

    const key = brokerKey(config);
    connectionManager.getOrCreate(config);
    connectionManager.registerActionForStatus(key, ev.action.id, {
      restoreDisplay: () => {
        const cached = this.lastValues.get(ev.action.id) ?? settings.lastValue;
        if (cached) this.applyValueToButton(settings, ev.action, cached);
      },
    });

    if (settings.subscribeTopic) {
      const callback = this.buildSubscriptionCallback(settings, ev.action);
      const isFirst = topicRouter.register(key, settings.subscribeTopic, ev.action.id, callback);
      if (isFirst) {
        connectionManager.ensureSubscribed(key, settings.subscribeTopic);
      }
      this.previousTopics.set(ev.action.id, settings.subscribeTopic);
      // Arm stale watch from initial appear so a topic that never publishes
      // (no retained, no events) eventually flags rather than silently showing
      // a cached lastValue from a prior session forever.
      this.scheduleStaleTimer(settings, ev.action);
    }

    // Restore cached value from last session
    if (settings.lastValue) {
      this.lastValues.set(ev.action.id, settings.lastValue);
      this.applyValueToButton(settings, ev.action, settings.lastValue);
    }
  }

  /**
   * Record keyDown timestamp AND arm the long-press timer so the long-press
   * payload fires while the user is still holding the key — rather than
   * waiting for release. Short-press path stays gated by the coordinator's
   * `cancel` result in onKeyUp.
   */
  override async onKeyDown(ev: KeyDownEvent<MqttActionSettings>): Promise<void> {
    this.keyDownTimestamps.set(ev.action.id, Date.now());

    const settings = ev.payload.settings;
    if (!settings.longPressTopic || !settings.longPressPayload) {
      // Nothing to fire on hold — keep coordinator idle. KeyUp's "ignored"
      // log path still preserves the prior behavior for long holds.
      return;
    }
    const config = this.getBrokerConfigFromSettings(settings);
    if (!config) return;

    const topic = settings.longPressTopic;
    const payload = settings.longPressPayload;
    this.longPressCoordinator.arm(ev.action.id, LONG_PRESS_THRESHOLD_MS, () => {
      const client = connectionManager.getOrCreate(config);
      client.publish(topic, payload, {
        qos: settings.qos ?? 0,
        retain: settings.retain ?? false,
      });
      logger.info(`Long press (on hold, >=${LONG_PRESS_THRESHOLD_MS}ms): published "${payload}" to ${topic}`);
    });
  }

  /**
   * On release: if long-press already fired during the hold, suppress the
   * short-press path so the release doesn't double-publish. Otherwise branch
   * on press duration as before (PUB-01..03, LP-01..03).
   */
  override async onKeyUp(ev: KeyUpEvent<MqttActionSettings>): Promise<void> {
    const settings = ev.payload.settings;
    await this.normalizeSettings(settings, ev.action);
    const config = this.getBrokerConfigFromSettings(settings);

    if (!config) {
      this.longPressCoordinator.cancel(ev.action.id);
      this.keyDownTimestamps.delete(ev.action.id);
      return;
    }

    const longPressAlreadyFired = this.longPressCoordinator.cancel(ev.action.id);
    const downTime = this.keyDownTimestamps.get(ev.action.id);
    this.keyDownTimestamps.delete(ev.action.id);
    const duration = downTime ? Date.now() - downTime : 0;

    if (longPressAlreadyFired) {
      // Already published while held — release is a no-op so we don't double-fire.
      return;
    }

    if (duration >= LONG_PRESS_THRESHOLD_MS) {
      // Released after the threshold but coordinator didn't fire. The only
      // way this happens is when no longPressTopic/Payload was configured
      // (so onKeyDown deliberately skipped arming). Preserve the prior
      // "ignored" log path so users who intentionally have no long-press
      // config don't suddenly get their short-press payload on long holds.
      logger.info(`Long press (${duration}ms): no longPressTopic/Payload configured, ignoring`);
    } else {
      // Short press: original publish/toggle logic (moved from onKeyDown)
      if (!settings.publishTopic) {
        return;
      }

      // Determine toggle mode: all four toggle fields must be non-empty (TOGL-01, TOGL-02)
      const isToggleMode =
        !!settings.onPayload &&
        !!settings.offPayload &&
        !!settings.onValue &&
        !!settings.offValue;

      let payload: string | undefined;

      if (isToggleMode) {
        // Toggle: publish opposite of current state using in-memory cache
        // Unknown state defaults to "turn on" (Pitfall 5)
        const currentValue = this.lastValues.get(ev.action.id) ?? settings.lastValue;
        payload = currentValue === settings.onValue
          ? settings.offPayload
          : settings.onPayload;
        logger.info(`Toggle mode: currentValue="${currentValue}" -> publishing ${payload === settings.onPayload ? "ON" : "OFF"}`);
      } else {
        // Non-toggle: use fixed publishPayload (Phase 1 behavior)
        payload = settings.publishPayload;
      }

      if (payload) {
        const client = connectionManager.getOrCreate(config);
        client.publish(settings.publishTopic, payload, {
          qos: settings.qos ?? 0,
          retain: settings.retain ?? false,
        });
        logger.info(`Short press (${duration}ms): published "${payload}" to ${settings.publishTopic}`);
      }
    }
  }

  /**
   * Unsubscribe on disappear to clean up resources.
   */
  override async onWillDisappear(ev: WillDisappearEvent<MqttActionSettings>): Promise<void> {
    const settings = ev.payload.settings;
    // Trim before unregistering so subscribeTopic matches what onWillAppear registered.
    this.trimSettings(settings);
    const config = this.getBrokerConfigFromSettings(settings);

    if (!config) {
      return;
    }

    const key = brokerKey(config);
    connectionManager.unregisterActionForStatus(key, ev.action.id);

    if (settings.subscribeTopic) {
      const isLast = topicRouter.unregister(key, settings.subscribeTopic, ev.action.id);
      if (isLast) {
        connectionManager.ensureUnsubscribed(key, settings.subscribeTopic);
      }
    }

    // Memory cleanup (SUB-04, Pitfall 6)
    this.lastValues.delete(ev.action.id);
    this.keyDownTimestamps.delete(ev.action.id);
    const pendingTimer = this.debounceTimers.get(ev.action.id);
    if (pendingTimer) {
      clearTimeout(pendingTimer);
      this.debounceTimers.delete(ev.action.id);
    }
    this.previousTopics.delete(ev.action.id);
    this.staleTracker.clear(ev.action.id);
    this.longPressCoordinator.cancel(ev.action.id);
  }

  /**
   * Handle live PI changes -- re-register subscriptions when subscribe topic changes.
   */
  // Debounce timer per action context to avoid creating connections while user types
  private debounceTimers = new Map<string, ReturnType<typeof setTimeout>>();

  override async onDidReceiveSettings(ev: DidReceiveSettingsEvent<MqttActionSettings>): Promise<void> {
    const settings = ev.payload.settings;
    logger.info(`didReceiveSettings: ${JSON.stringify(settings)}`);

    // Debounce: wait 1s after last settings change before acting
    // Prevents ghost connections while user types port "1" -> "18" -> "188" -> "1883"
    const existingTimer = this.debounceTimers.get(ev.action.id);
    if (existingTimer) clearTimeout(existingTimer);

    this.debounceTimers.set(ev.action.id, setTimeout(() => {
      this.debounceTimers.delete(ev.action.id);
      this.handleSettingsChange(ev).catch((err: unknown) => {
        logger.error(`handleSettingsChange failed: ${err instanceof Error ? err.message : String(err)}`);
      });
    }, 1000));
  }

  private async handleSettingsChange(ev: DidReceiveSettingsEvent<MqttActionSettings>): Promise<void> {
    const settings = ev.payload.settings;
    await this.normalizeSettings(settings, ev.action);
    const config = this.getBrokerConfigFromSettings(settings);

    if (!config) {
      await ev.action.setTitle("No Broker");
      return;
    }

    // Ensure broker connection exists (handles initial config from PI)
    const key = brokerKey(config);
    connectionManager.getOrCreate(config);

    // Clear "No Broker" title when broker is first configured
    if (!this.previousTopics.has(ev.action.id) && !settings.subscribeTopic) {
      await ev.action.setTitle("MQTT");
    }

    const oldTopic = this.previousTopics.get(ev.action.id);
    const newTopic = settings.subscribeTopic?.trim();

    if (oldTopic !== newTopic) {
      // Unregister old topic
      if (oldTopic) {
        const isLast = topicRouter.unregister(key, oldTopic, ev.action.id);
        if (isLast) {
          connectionManager.ensureUnsubscribed(key, oldTopic);
        }
      }
      // Topic identity changed — drop any stale state tied to the old topic.
      this.staleTracker.clear(ev.action.id);

      // Register new topic with full callback pipeline
      if (newTopic) {
        const callback = this.buildSubscriptionCallback(settings, ev.action);

        const isFirst = topicRouter.register(key, newTopic, ev.action.id, callback);
        if (isFirst) {
          connectionManager.ensureSubscribed(key, newTopic);
        }

        this.previousTopics.set(ev.action.id, newTopic);
        this.scheduleStaleTimer(settings, ev.action);
      } else {
        this.previousTopics.delete(ev.action.id);
      }
    } else if (newTopic) {
      // Topic unchanged but other settings may have changed (offValue, jsonPath, etc.)
      // Re-register callback with fresh settings to pick up PI changes
      const callback = this.buildSubscriptionCallback(settings, ev.action);
      topicRouter.updateCallback(key, newTopic, ev.action.id, callback);
      logger.info("didReceiveSettings: topic unchanged, callback updated with new settings");
      // Re-arm in case staleThresholdSeconds itself changed in the PI.
      this.scheduleStaleTimer(settings, ev.action);
    }
  }
}
