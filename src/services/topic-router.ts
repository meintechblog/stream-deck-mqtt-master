import { logger } from "../util/logger";

/**
 * Routes MQTT messages to button action contexts (ARCH-03).
 * Maps brokerKey -> topic -> Set<contextId> for 1:N message dispatch.
 * Reference counting determines when to actually subscribe/unsubscribe at the MQTT level.
 */
class TopicRouter {
  // brokerKey -> topic -> Set<contextId>
  private subscriptions = new Map<string, Map<string, Set<string>>>();
  // contextId -> callback
  private callbacks = new Map<string, (payload: string) => void>();

  /**
   * Register an action context for a topic on a broker.
   * @returns true if this is the first subscriber for this topic (caller should MQTT subscribe)
   */
  register(
    brokerKey: string,
    topic: string,
    contextId: string,
    callback: (payload: string) => void,
  ): boolean {
    if (!this.subscriptions.has(brokerKey)) {
      this.subscriptions.set(brokerKey, new Map());
    }
    const brokerTopics = this.subscriptions.get(brokerKey)!;
    if (!brokerTopics.has(topic)) {
      brokerTopics.set(topic, new Set());
    }
    const contexts = brokerTopics.get(topic)!;
    const isFirst = contexts.size === 0;
    contexts.add(contextId);
    this.callbacks.set(contextId, callback);

    logger.debug(
      `Registered context ${contextId} for ${brokerKey} topic ${topic} (isFirst=${isFirst}, total=${contexts.size})`,
    );

    return isFirst;
  }

  /**
   * Unregister an action context from a topic on a broker.
   * @returns true if this was the last subscriber (caller should MQTT unsubscribe)
   */
  unregister(
    brokerKey: string,
    topic: string,
    contextId: string,
  ): boolean {
    const contexts = this.subscriptions.get(brokerKey)?.get(topic);
    if (!contexts) return false;
    contexts.delete(contextId);
    this.callbacks.delete(contextId);

    const isLast = contexts.size === 0;

    if (isLast) {
      // Clean up empty sets
      this.subscriptions.get(brokerKey)?.delete(topic);
      if (this.subscriptions.get(brokerKey)?.size === 0) {
        this.subscriptions.delete(brokerKey);
      }
    }

    logger.debug(
      `Unregistered context ${contextId} from ${brokerKey} topic ${topic} (isLast=${isLast})`,
    );

    return isLast;
  }

  /**
   * Update the callback for an existing subscription without re-subscribing at MQTT level.
   * Used when settings change (e.g. offValue, jsonPath) but the topic stays the same.
   */
  updateCallback(
    brokerKey: string,
    topic: string,
    contextId: string,
    callback: (payload: string) => void,
  ): void {
    this.callbacks.set(contextId, callback);
    logger.debug(`Updated callback for context ${contextId} on ${brokerKey}/${topic}`);
  }

  /**
   * Dispatch an incoming MQTT message to all subscribed action contexts.
   */
  dispatch(brokerKey: string, topic: string, payload: string): void {
    const brokerTopics = this.subscriptions.get(brokerKey);
    const topicKeys = brokerTopics ? [...brokerTopics.keys()] : [];
    logger.info(`dispatch: key="${brokerKey}" topic="${topic}" topics=${JSON.stringify(topicKeys)} callbacks=${this.callbacks.size}`);
    const contexts = brokerTopics?.get(topic);
    if (!contexts || contexts.size === 0) {
      logger.warn(`No subscribers for ${brokerKey} / ${topic} (topics in map: ${JSON.stringify(topicKeys)})`);
      return;
    }

    for (const contextId of contexts) {
      const callback = this.callbacks.get(contextId);
      logger.info(`dispatch to context ${contextId}: callback=${!!callback}`);
      if (callback) {
        try {
          callback(payload);
        } catch (err) {
          logger.error(
            `Error dispatching to context ${contextId}: ${err instanceof Error ? err.message : String(err)}`,
          );
        }
      }
    }
  }

  /**
   * Get all subscribed topics for a broker (for resubscription on connect).
   */
  getTopics(brokerKey: string): string[] {
    const brokerTopics = this.subscriptions.get(brokerKey);
    if (!brokerTopics) return [];
    return [...brokerTopics.keys()];
  }

  /**
   * Reset all tracking state (Pitfall 2 fix: plugin restart recovery).
   */
  reset(): void {
    this.subscriptions.clear();
    this.callbacks.clear();
    logger.info("TopicRouter reset -- all subscriptions cleared");
  }
}

export const topicRouter = new TopicRouter();
