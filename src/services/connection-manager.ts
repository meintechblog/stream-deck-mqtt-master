import * as crypto from "node:crypto";
import * as mqtt from "mqtt";
import type { BrokerConfig } from "../types/settings";
import { brokerKey } from "../util/broker-key";
import { logger } from "../util/logger";
import { topicRouter } from "./topic-router";

/**
 * Status listener — called by the connection manager on connect/offline events
 * so individual actions can restore their last-known display value rather than
 * having the connection layer overwrite titles.
 */
export interface StatusListener {
  /** Restore display from cached lastValue (no value = leave title alone). */
  restoreDisplay: () => void;
}

/**
 * Singleton managing MQTT connections. One TCP connection per unique broker.
 * Explicitly resubscribes all active topics on every connect event.
 * Stable client IDs per broker so the broker can re-identify us across restarts.
 */
class ConnectionManager {
  private clients = new Map<string, mqtt.MqttClient>();
  private activeTopics = new Map<string, Set<string>>();
  private statusListeners = new Map<string, Map<string, StatusListener>>();

  /**
   * Get or create an MQTT client for the given broker config.
   * Returns existing client if one already exists for this broker.
   */
  getOrCreate(config: BrokerConfig): mqtt.MqttClient {
    // Normalize host to prevent ghost connections from trailing whitespace
    const normalizedConfig = { ...config, host: config.host.trim() };
    const key = brokerKey(normalizedConfig);

    if (this.clients.has(key)) {
      return this.clients.get(key)!;
    }

    const clientId = normalizedConfig.clientId || stableClientId(key);
    const protocol = normalizedConfig.tls ? "mqtts" : "mqtt";

    logger.info(`Creating MQTT client for ${key} (clientId=${clientId})`);

    const client = mqtt.connect({
      protocol,
      host: normalizedConfig.host,
      port: normalizedConfig.port,
      username: normalizedConfig.username || undefined,
      password: normalizedConfig.password || undefined,
      clientId,
      reconnectPeriod: 5000,
      clean: true,
      rejectUnauthorized: false,
    });

    client.on("connect", () => {
      logger.info(`Connected to ${key}`);
      const topics = this.activeTopics.get(key);
      if (topics && topics.size > 0) {
        const topicList = [...topics];
        logger.info(`Resubscribing ${topicList.length} topics on ${key}`);
        client.subscribe(topicList);
      }

      // Restore each action's display from its cached lastValue rather than
      // wiping titles. Buttons whose subscribe topic doesn't have a retained
      // message would otherwise stay blank until the next state change.
      const listeners = this.statusListeners.get(key);
      if (listeners) {
        for (const [, listener] of listeners) {
          try { listener.restoreDisplay(); } catch (err) {
            logger.error(`restoreDisplay failed: ${err instanceof Error ? err.message : String(err)}`);
          }
        }
      }
    });

    client.on("message", (topic: string, payload: Buffer) => {
      logger.info(`MQTT message on ${key}: ${topic} = ${payload.toString().substring(0, 80)}`);
      topicRouter.dispatch(key, topic, payload.toString());
    });

    client.on("error", (err: Error) => {
      logger.error(`MQTT error on ${key}: ${err.message}`);
    });

    client.on("offline", () => {
      // Don't overwrite button titles. Transient broker drops would otherwise
      // flicker "! Offline" across every subscribed button. Reconnect is
      // automatic; the next state change will refresh the display anyway.
      logger.warn(`MQTT client offline: ${key}`);
    });

    client.on("reconnect", () => {
      logger.info(`Reconnecting to ${key}...`);
    });

    this.clients.set(key, client);
    this.activeTopics.set(key, new Set());

    return client;
  }

  /**
   * Register an action to receive broker status notifications.
   * The listener's `restoreDisplay()` is called on every (re)connect.
   */
  registerActionForStatus(brokerKeyStr: string, actionId: string, listener: StatusListener): void {
    let listeners = this.statusListeners.get(brokerKeyStr);
    if (!listeners) {
      listeners = new Map();
      this.statusListeners.set(brokerKeyStr, listeners);
    }
    listeners.set(actionId, listener);
  }

  /**
   * Unregister an action from broker status notifications.
   */
  unregisterActionForStatus(brokerKeyStr: string, actionId: string): void {
    const listeners = this.statusListeners.get(brokerKeyStr);
    if (!listeners) return;
    listeners.delete(actionId);
    if (listeners.size === 0) {
      this.statusListeners.delete(brokerKeyStr);
    }
  }

  /**
   * Ensure a topic is subscribed on the given broker.
   * Adds to activeTopics set and subscribes immediately if connected.
   */
  ensureSubscribed(brokerKeyStr: string, topic: string): void {
    let topics = this.activeTopics.get(brokerKeyStr);
    if (!topics) {
      topics = new Set();
      this.activeTopics.set(brokerKeyStr, topics);
    }

    if (!topics.has(topic)) {
      topics.add(topic);
      const client = this.clients.get(brokerKeyStr);
      logger.info(`ensureSubscribed: topic="${topic}" broker="${brokerKeyStr}" connected=${client?.connected}`);
      if (client?.connected) {
        client.subscribe(topic, (err) => {
          if (err) logger.error(`Subscribe error for ${topic}: ${err.message}`);
          else logger.info(`Subscribed OK: ${topic} on ${brokerKeyStr}`);
        });
      }
      // If not connected yet, will be subscribed on 'connect' event
    }
  }

  /**
   * Ensure a topic is unsubscribed from the given broker.
   * Removes from activeTopics and unsubscribes if connected.
   */
  ensureUnsubscribed(brokerKeyStr: string, topic: string): void {
    const topics = this.activeTopics.get(brokerKeyStr);
    if (!topics) return;

    if (topics.has(topic)) {
      topics.delete(topic);
      const client = this.clients.get(brokerKeyStr);
      if (client?.connected) {
        client.unsubscribe(topic);
        logger.debug(`Unsubscribed from ${topic} on ${brokerKeyStr}`);
      }
    }
  }

  /**
   * Reset all tracking state (Pitfall 2 fix: plugin restart recovery).
   * Closes all connections and clears all maps.
   */
  reset(): void {
    for (const [key, client] of this.clients) {
      logger.info(`Closing MQTT connection: ${key}`);
      client.end(true);
    }
    this.clients.clear();
    this.activeTopics.clear();
    this.statusListeners.clear();
    logger.info("ConnectionManager reset -- all connections closed");
  }
}

/**
 * Derive a stable client ID per broker so reconnects look like the same client.
 * Random IDs per restart generate broker-side noise and can trip rate limits.
 */
function stableClientId(key: string): string {
  return `streamdeck-mqtt-${crypto.createHash("sha1").update(key).digest("hex").slice(0, 12)}`;
}

export const connectionManager = new ConnectionManager();
