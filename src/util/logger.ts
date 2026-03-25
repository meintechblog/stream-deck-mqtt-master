import streamDeck from "@elgato/streamdeck";

export const logger: ReturnType<typeof streamDeck.logger.createScope> = streamDeck.logger.createScope("MqttMaster");
