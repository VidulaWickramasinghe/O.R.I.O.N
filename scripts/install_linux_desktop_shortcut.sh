#!/usr/bin/env bash
set -e
PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DESKTOP_FILE="$HOME/.local/share/applications/orion-aurora-os.desktop"
mkdir -p "$HOME/.local/share/applications"
cat > "$DESKTOP_FILE" <<EOF
[Desktop Entry]
Name=O.R.I.O.N. Aurora OS
Comment=Operational Response and Intelligent Orchestration Network
Exec=$PROJECT_ROOT/scripts/orion_desktop.sh
Icon=utilities-terminal
Terminal=true
Type=Application
Categories=Development;Utility;AI;
StartupNotify=true
EOF
chmod +x "$DESKTOP_FILE"
echo "Installed desktop shortcut:"
echo "$DESKTOP_FILE"
echo ""
echo "Search for O.R.I.O.N. Aurora OS in your app launcher."
