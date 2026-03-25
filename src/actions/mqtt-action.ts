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
import type { GlobalSettings, MqttActionSettings, BrokerConfig } from "../types/settings";

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
   * Read broker config from global settings.
   * Returns null if no broker is configured.
   */
  private async getBrokerConfig(): Promise<BrokerConfig | null> {
    const globalSettings = await streamDeck.settings.getGlobalSettings<GlobalSettings>();
    if (globalSettings.broker && globalSettings.broker.host) {
      return globalSettings.broker;
    }
    logger.warn("No broker configured in global settings");
    return null;
  }

  /**
   * Subscribe to topic on appear (SUB-01, SUB-02).
   * Restores cached lastValue if available.
   */
  override async onWillAppear(ev: WillAppearEvent<MqttActionSettings>): Promise<void> {
    const config = await this.getBrokerConfig();
    const settings = ev.payload.settings;

    if (!config) {
      await ev.action.setTitle("No Broker");
      return;
    }

    const key = brokerKey(config);
    connectionManager.getOrCreate(config);

    if (settings.subscribeTopic) {
      const callback = (payload: string) => {
        ev.action.setTitle(payload);
        ev.action.setSettings({ ...settings, lastValue: payload });
      };

      const isFirst = topicRouter.register(key, settings.subscribeTopic, ev.action.id, callback);
      if (isFirst) {
        connectionManager.ensureSubscribed(key, settings.subscribeTopic);
      }

      // Track current topic for didReceiveSettings change detection
      this.previousTopics.set(ev.action.id, settings.subscribeTopic);
    }

    // Restore cached value from last session
    if (settings.lastValue) {
      await ev.action.setTitle(settings.lastValue);
    }
  }

  /**
   * Publish payload on key press (PUB-01, PUB-02, PUB-03).
   */
  override async onKeyDown(ev: KeyDownEvent<MqttActionSettings>): Promise<void> {
    const config = await this.getBrokerConfig();
    const settings = ev.payload.settings;

    if (!config) {
      return;
    }

    if (settings.publishTopic && settings.publishPayload) {
      const client = connectionManager.getOrCreate(config);
      client.publish(settings.publishTopic, settings.publishPayload, {
        qos: settings.qos ?? 0,
        retain: settings.retain ?? false,
      });
      logger.info(`Published to ${settings.publishTopic}: ${settings.publishPayload}`);
    }
  }

  /**
   * Unsubscribe on disappear to clean up resources.
   */
  override async onWillDisappear(ev: WillDisappearEvent<MqttActionSettings>): Promise<void> {
    const config = await this.getBrokerConfig();
    const settings = ev.payload.settings;

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
    const config = await this.getBrokerConfig();
    const settings = ev.payload.settings;

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

      // Register new topic
      if (newTopic) {
        const callback = (payload: string) => {
          ev.action.setTitle(payload);
          ev.action.setSettings({ ...settings, lastValue: payload });
        };

        const isFirst = topicRouter.register(key, newTopic, ev.action.id, callback);
        if (isFirst) {
          connectionManager.ensureSubscribed(key, newTopic);
        }

        this.previousTopics.set(ev.action.id, newTopic);
      } else {
        this.previousTopics.delete(ev.action.id);
      }
    }
  }
}
