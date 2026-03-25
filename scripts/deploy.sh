#!/usr/bin/env bash
set -euo pipefail

REMOTE="admin@mini-von-jorg-7.local"
PLUGIN_DIR="io.github.meintechblog.mqtt-master.sdPlugin"
REMOTE_PLUGINS="~/Library/Application Support/com.elgato.StreamDeck/Plugins"

echo "Building..."
npm run build

echo "Deploying to $REMOTE..."
scp -r "$PLUGIN_DIR" "$REMOTE:\"$REMOTE_PLUGINS/\""

echo "Restarting Stream Deck..."
ssh "$REMOTE" 'pkill "Elgato Stream Deck" || true; sleep 2; open -a "Elgato Stream Deck"'

echo "Done."
