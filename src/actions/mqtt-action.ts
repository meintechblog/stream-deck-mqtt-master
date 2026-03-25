import streamDeck, {
  action,
  SingletonAction,
  type KeyDownEvent,
  type WillAppearEvent,
  type WillDisappearEvent,
  type DidReceiveSettingsEvent,
} from "@elgato/streamdeck";
import { connectionManager } from "../services/connection-manager";
import { topicRouter } from "../services/topic-router";
import { brokerKey } from "../util/broker-key";
import { logger } from "../util/logger";
import { resolveJsonPath, applyDisplayTemplate } from "../util/resolve-json-path";
import type { MqttActionSettings, BrokerConfig } from "../types/settings";

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

  /**
   * Read broker config from action settings.
   * Phase 1: broker config in action settings for sdpi-components auto-binding.
   * Phase 2: move to global settings for credential security (CONN-06).
   */
  private getBrokerConfigFromSettings(settings: MqttActionSettings): BrokerConfig | null {
    const host = (settings.brokerHost || "").trim();
    if (host) {
      return {
        host,
        port: parseInt((settings.brokerPort || "1883").trim(), 10) || 1883,
        username: settings.brokerUsername || undefined,
        password: settings.brokerPassword || undefined,
        tls: settings.brokerTls ?? false,
      };
    }
    logger.warn("No broker configured in action settings");
    return null;
  }

  /**
   * Build a subscription callback with JSON path extraction, display template,
   * setState for toggle feedback, and lastValue caching.
   * Shared by onWillAppear and onDidReceiveSettings to avoid duplication.
   */
  private buildSubscriptionCallback(
    settings: MqttActionSettings,
    actionRef: WillAppearEvent<MqttActionSettings>["action"],
  ): (payload: string) => void {
    return (rawPayload: string) => {
      // Step 1: Extract value via JSON path (SUB-03, D-16)
      const extracted = settings.jsonPath
        ? resolveJsonPath(rawPayload, settings.jsonPath)
        : rawPayload;

      // Step 2: Apply display template (D-17)
      const displayValue = settings.displayTemplate
        ? applyDisplayTemplate(settings.displayTemplate, extracted)
        : extracted;

      logger.info(`callback: raw="${rawPayload.substring(0, 80)}" jsonPath="${settings.jsonPath}" extracted="${extracted}" display="${displayValue}"`);

      // Step 3: Update button title
      actionRef.setTitle(displayValue).catch((err: unknown) => {
        logger.error(`setTitle failed: ${err instanceof Error ? err.message : String(err)}`);
      });

      // Step 4: Update button state based on onValue/offValue (TOGL-03, D-18)
      // Logic: exact match for set values, inverse for unset values
      // - Both set: exact match for on and off
      // - Only offValue set: match = off, everything else = on
      // - Only onValue set: match = on, everything else = off
      if (settings.onValue && settings.offValue) {
        // Both defined: exact match
        if (extracted === settings.onValue) {
          actionRef.setState(1).catch(() => {});
        } else if (extracted === settings.offValue) {
          actionRef.setState(0).catch(() => {});
        }
      } else if (settings.offValue && !settings.onValue) {
        // Only offValue: match = off, anything else = on
        actionRef.setState(extracted === settings.offValue ? 0 : 1).catch(() => {});
      } else if (settings.onValue && !settings.offValue) {
        // Only onValue: match = on, anything else = off
        actionRef.setState(extracted === settings.onValue ? 1 : 0).catch(() => {});
      }

      // Step 5: Update lastValue in the captured settings reference
      // NOTE: We do NOT call setSettings() here — it would overwrite any PI changes
      // the user made since this callback was created. lastValue is cached in memory
      // and will be persisted on next didReceiveSettings or willDisappear.
      settings.lastValue = extracted;
    };
  }

  /**
   * Subscribe to topic on appear (SUB-01, SUB-02).
   * Restores cached lastValue if available.
   */
  override async onWillAppear(ev: WillAppearEvent<MqttActionSettings>): Promise<void> {
    const settings = ev.payload.settings;
    logger.info(`willAppear settings: ${JSON.stringify(settings)}`);

    // Auto-fix whitespace in all string settings (PI textfields often have trailing spaces)
    let needsSave = false;
    for (const key of ["brokerHost", "brokerPort", "subscribeTopic", "publishTopic", "publishPayload", "jsonPath", "displayTemplate", "onPayload", "offPayload", "onValue", "offValue"] as const) {
      const val = settings[key as keyof MqttActionSettings];
      if (typeof val === "string" && val !== val.trim()) {
        (settings as Record<string, unknown>)[key] = val.trim();
        needsSave = true;
      }
    }
    if (needsSave) {
      await ev.action.setSettings(settings);
      logger.info("Auto-trimmed whitespace in saved settings");
    }

    const config = this.getBrokerConfigFromSettings(settings);

    if (!config) {
      await ev.action.setTitle("No Broker");
      return;
    }

    const key = brokerKey(config);
    connectionManager.getOrCreate(config);

    if (settings.subscribeTopic) {
      const callback = this.buildSubscriptionCallback(settings, ev.action);

      const isFirst = topicRouter.register(key, settings.subscribeTopic, ev.action.id, callback);
      if (isFirst) {
        connectionManager.ensureSubscribed(key, settings.subscribeTopic);
      }

      // Track current topic for didReceiveSettings change detection
      this.previousTopics.set(ev.action.id, settings.subscribeTopic);
    }

    // Restore cached value from last session (apply display template + setState)
    if (settings.lastValue) {
      const displayValue = settings.displayTemplate
        ? applyDisplayTemplate(settings.displayTemplate, settings.lastValue)
        : settings.lastValue;
      await ev.action.setTitle(displayValue);

      // Restore toggle state from cached value (same logic as subscription callback)
      if (settings.onValue && settings.offValue) {
        if (settings.lastValue === settings.onValue) await ev.action.setState(1);
        else if (settings.lastValue === settings.offValue) await ev.action.setState(0);
      } else if (settings.offValue && !settings.onValue) {
        await ev.action.setState(settings.lastValue === settings.offValue ? 0 : 1);
      } else if (settings.onValue && !settings.offValue) {
        await ev.action.setState(settings.lastValue === settings.onValue ? 1 : 0);
      }
    }
  }

  /**
   * Publish payload on key press (PUB-01, PUB-02, PUB-03).
   */
  override async onKeyDown(ev: KeyDownEvent<MqttActionSettings>): Promise<void> {
    const settings = ev.payload.settings;
    const config = this.getBrokerConfigFromSettings(settings);

    if (!config) {
      return;
    }

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
      // Toggle: publish opposite of current state
      // Unknown state defaults to "turn on" (Pitfall 5)
      payload = settings.lastValue === settings.onValue
        ? settings.offPayload
        : settings.onPayload;
      logger.info(`Toggle mode: lastValue="${settings.lastValue}" -> publishing ${payload === settings.onPayload ? "ON" : "OFF"}`);
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
      logger.info(`Published to ${settings.publishTopic}: ${payload}`);
    }
  }

  /**
   * Unsubscribe on disappear to clean up resources.
   */
  override async onWillDisappear(ev: WillDisappearEvent<MqttActionSettings>): Promise<void> {
    const settings = ev.payload.settings;
    const config = this.getBrokerConfigFromSettings(settings);

    if (!config) {
      return;
    }

    if (settings.subscribeTopic) {
      const key = brokerKey(config);
      const isLast = topicRouter.unregister(key, settings.subscribeTopic, ev.action.id);
      if (isLast) {
        connectionManager.ensureUnsubscribed(key, settings.subscribeTopic);
      }
    }

    this.previousTopics.delete(ev.action.id);
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

      // Register new topic with full callback pipeline
      if (newTopic) {
        const callback = this.buildSubscriptionCallback(settings, ev.action);

        const isFirst = topicRouter.register(key, newTopic, ev.action.id, callback);
        if (isFirst) {
          connectionManager.ensureSubscribed(key, newTopic);
        }

        this.previousTopics.set(ev.action.id, newTopic);
      } else {
        this.previousTopics.delete(ev.action.id);
      }
    } else {
      // Topic unchanged -- likely a lastValue-only update from subscription callback
      logger.debug("didReceiveSettings: lastValue-only change, skipping re-registration");
    }
  }
}
