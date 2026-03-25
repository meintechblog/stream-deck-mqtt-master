import streamDeck from "@elgato/streamdeck";
import { MqttAction } from "./actions/mqtt-action";

// Register actions BEFORE connecting
streamDeck.actions.registerAction(new MqttAction());

// Connect to Stream Deck
streamDeck.connect();
