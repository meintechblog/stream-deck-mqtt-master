# MQTT Master for Stream Deck

Bidirectional MQTT plugin for Elgato Stream Deck. Publish on press, subscribe for live status updates.

## Features

- Publish configurable MQTT messages on button press
- Subscribe to MQTT topics with live button title updates
- Toggle mode: button reflects and changes device state (on/off)
- JSON path extraction from MQTT payloads
- Display templates for formatted values
- Auto-reconnect with visible disconnect indicator
- Per-button broker configuration (host, port, TLS, auth)

## Requirements

- Elgato Stream Deck with Stream Deck software 6.6+
- An MQTT broker (e.g., Mosquitto)

## Installation

1. Download the `.streamDeckPlugin` file from the [latest GitHub Release](https://github.com/meintechblog/stream-deck-mqtt-master/releases/latest)
2. Double-click to install in Stream Deck

## Configuration

Add the **MQTT Master** action to a button, then configure it in the Property Inspector panel.

### Broker Settings

- **Host**: MQTT broker hostname or IP (e.g., `192.168.1.100`)
- **Port**: Broker port (default: `1883`)
- **Username / Password**: Optional authentication credentials

### Publish Settings

- **Topic**: MQTT topic to publish to on button press
- **Payload**: Message content to send

### Subscribe Settings

- **Topic**: MQTT topic to subscribe to for live updates
- **JSON Path**: Optional path to extract a value from JSON payloads (e.g., `temperature`)
- **Display Template**: Format the displayed value (e.g., `{value} C`)

### Toggle Mode

Enable toggle mode to switch between two payloads on each press. The button state reflects the current MQTT value -- press to toggle between on and off.

- **On Value / Off Value**: The payloads that represent each state
- **On Label / Off Label**: Optional display text for each state

## Development

### Prerequisites

- Node.js 20+
- npm or pnpm

### Commands

```bash
# Install dependencies
npm install

# Build the plugin
npm run build

# Build and deploy to Mac Mini (dev workflow)
npm run deploy

# Create .streamDeckPlugin installer (requires @elgato/cli)
# npm install -g @elgato/cli
npm run package
```

## License

MIT
