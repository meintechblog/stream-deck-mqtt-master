import * as crypto from "node:crypto";
import * as mqtt from "mqtt";
import type { BrokerConfig } from "../types/settings";
import { brokerKey } from "../util/broker-key";
import { logger } from "../util/logger";
import { topicRouter } from "./topic-router";

/**
 * Singleton managing MQTT connections. One TCP connection per unique broker (CONN-05, ARCH-02).
 * Explicitly resubscribes all active topics on every connect event (Pitfall 1 fix).
 * Uses crypto.randomUUID() for client IDs to avoid collisions (Pitfall 4 fix).
 */
class ConnectionManager {
  // brokerKey -> MqttClient
  private clients = new Map<string, mqtt.MqttClient>();
  // brokerKey -> Set<topic> for resubscription on connect
  private activeTopics = new Map<string, Set<string>>();

  /**
   * Get or create an MQTT client for the given broker config.
   * Returns existing client if one already exists for this broker.
   */
  getOrCreate(config: BrokerConfig): mqtt.MqttClient {
    const key = brokerKey(config);

    if (this.clients.has(key)) {
      return this.clients.get(key)!;
    }

    const clientId = config.clientId || `streamdeck-mqtt-${crypto.randomUUID()}`;
    const protocol = config.tls ? "mqtts" : "mqtt";

    logger.info(`Creating MQTT client for ${key} (clientId=${clientId})`);

    const client = mqtt.connect({
      protocol,
      host: config.host,
      port: config.port,
      username: config.username || undefined,
      password: config.password || undefined,
      clientId,
      reconnectPeriod: 5000, // CONN-04: auto-reconnect every 5s
      clean: true, // Pitfall 1: explicit resubscribe is more reliable
      rejectUnauthorized: false, // CONN-03: self-signed certs common in home networks
    });

    // Resubscribe ALL topics on every connect event (handles both initial connect and reconnect)
    // Pitfall 1 fix: do NOT rely on MQTT.js resubscribe
    client.on("connect", () => {
      logger.info(`Connected to ${key}`);
      const topics = this.activeTopics.get(key);
      if (topics && topics.size > 0) {
        const topicList = [...topics];
        logger.info(`Resubscribing ${topicList.length} topics on ${key}`);
        client.subscribe(topicList);
      }
    });

    // Route incoming messages to TopicRouter for dispatch to action contexts
    client.on("message", (topic: string, payload: Buffer) => {
      topicRouter.dispatch(key, topic, payload.toString());
    });

    client.on("error", (err: Error) => {
      logger.error(`MQTT error on ${key}: ${err.message}`);
    });

    client.on("offline", () => {
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
      if (client?.connected) {
        client.subscribe(topic);
        logger.debug(`Subscribed to ${topic} on ${brokerKeyStr}`);
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
    logger.info("ConnectionManager reset -- all connections closed");
  }
}

export const connectionManager = new ConnectionManager();
