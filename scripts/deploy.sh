#!/usr/bin/env bash
set -euo pipefail

REMOTE="admin@mini-von-jorg-7.local"
PLUGIN_DIR="io.github.meintechblog.mqtt-master.sdPlugin"
# Resolved on the remote side — modern macOS scp uses sftp and won't expand ~.
REMOTE_PLUGINS_PATH='Library/Application Support/com.elgato.StreamDeck/Plugins'

echo "Building..."
pnpm run build

echo "Staging on remote..."
ssh "$REMOTE" "rm -rf '/tmp/$PLUGIN_DIR'"
scp -r "$PLUGIN_DIR" "$REMOTE:/tmp/"

echo "Installing into Stream Deck plugins dir..."
ssh "$REMOTE" "rsync -a --delete '/tmp/$PLUGIN_DIR/' \"\$HOME/$REMOTE_PLUGINS_PATH/$PLUGIN_DIR/\" && rm -rf '/tmp/$PLUGIN_DIR'"

echo "Restarting Stream Deck..."
ssh "$REMOTE" 'pkill "Elgato Stream Deck" || true; sleep 2; open -a "Elgato Stream Deck"'

echo "Done."
