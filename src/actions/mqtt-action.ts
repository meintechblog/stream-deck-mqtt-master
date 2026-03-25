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

      // Step 3: Update button title
      actionRef.setTitle(displayValue).catch((err: unknown) => {
        logger.error(`setTitle failed: ${err instanceof Error ? err.message : String(err)}`);
      });

      // Step 4: Update button state based on onValue/offValue (TOGL-03, D-18)
      if (settings.onValue && extracted === settings.onValue) {
        actionRef.setState(1).catch((err: unknown) => {
          logger.error(`setState(1) failed: ${err instanceof Error ? err.message : String(err)}`);
        });
      } else if (settings.offValue && extracted === settings.offValue) {
        actionRef.setState(0).catch((err: unknown) => {
          logger.error(`setState(0) failed: ${err instanceof Error ? err.message : String(err)}`);
        });
      }

      // Step 5: Cache lastValue only when changed (avoid feedback loop)
      if (extracted !== settings.lastValue) {
        settings.lastValue = extracted;
        actionRef.setSettings({ ...settings, lastValue: extracted }).catch((err: unknown) => {
          logger.error(`setSettings failed: ${err instanceof Error ? err.message : String(err)}`);
        });
      }
    };
  }

  /**
   * Subscribe to topic on appear (SUB-01, SUB-02).
   * Restores cached lastValue if available.
   */
  override async onWillAppear(ev: WillAppearEvent<MqttActionSettings>): Promise<void> {
    const settings = ev.payload.settings;
    logger.info(`willAppear settings: ${JSON.stringify(settings)}`);

    // Auto-fix whitespace in saved settings (one-time cleanup)
    if (settings.brokerHost && settings.brokerHost !== settings.brokerHost.trim()) {
      settings.brokerHost = settings.brokerHost.trim();
      await ev.action.setSettings(settings);
      logger.info("Auto-trimmed brokerHost whitespace in saved settings");
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

      // Restore toggle state from cached value
      if (settings.onValue && settings.lastValue === settings.onValue) {
        await ev.action.setState(1);
      } else if (settings.offValue && settings.lastValue === settings.offValue) {
        await ev.action.setState(0);
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
  override async onDidReceiveSettings(ev: DidReceiveSettingsEvent<MqttActionSettings>): Promise<void> {
    const settings = ev.payload.settings;
    logger.info(`didReceiveSettings: ${JSON.stringify(settings)}`);
    const config = this.getBrokerConfigFromSettings(settings);

    if (!config) {
      return;
    }

    const key = brokerKey(config);
    const oldTopic = this.previousTopics.get(ev.action.id);
    const newTopic = settings.subscribeTopic;

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
