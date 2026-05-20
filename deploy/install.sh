#!/bin/bash
# mediamtx-admin-ui — LXC deployment script
# Run as root on the LXC host.
# Usage: bash deploy/install.sh

set -euo pipefail

APP_DIR="/opt/mediamtx-admin-ui"
SOURCE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
APP_USER="mediamtx-ui"
APP_GROUP="mediamtx-ui"
BACKEND_PORT=9088
SERVICE_NAME="mediamtx-admin-ui"

RED='\033[0;31m'
GREEN='\033[0;32m'
NC='\033[0m'

log()  { echo -e "${GREEN}[✓]${NC} $1"; }
err()  { echo -e "${RED}[✗]${NC} $1"; exit 1; }

# ── Pre-flight checks ──────────────────────────────────────────
if [[ $EUID -ne 0 ]]; then
  err "This script must be run as root."
fi

if ! command -v node &>/dev/null; then
  err "Node.js is not installed. Install Node 22+ first."
fi

NODE_VER=$(node --version | cut -d'.' -f1 | sed 's/v//')
if [[ "$NODE_VER" -lt 22 ]]; then
  err "Node.js 22+ required, found v$NODE_VER."
fi

log "Node.js $(node --version) detected"

# ── Create app user ────────────────────────────────────────────
if ! id -u "$APP_USER" &>/dev/null; then
  groupadd --system "$APP_GROUP"
  useradd --system --gid "$APP_GROUP" --no-create-home --shell /usr/sbin/nologin "$APP_USER"
  log "Created system user $APP_USER"
else
  log "User $APP_USER already exists"
fi

# Allow journalctl without sudo (read-only access to systemd journal)
usermod -aG systemd-journal "$APP_USER" 2>/dev/null || true
log "User $APP_USER added to systemd-journal group"

# ── Copy app files ─────────────────────────────────────────────
mkdir -p "$APP_DIR"
if [[ "$SOURCE_DIR" != "$APP_DIR" ]]; then
  cp -r "$SOURCE_DIR/backend" "$SOURCE_DIR/frontend" "$SOURCE_DIR/shared" "$APP_DIR/"
  log "Copied app files to $APP_DIR"
else
  log "Using existing app checkout at $APP_DIR"
fi
cp -r "$SOURCE_DIR/deploy/systemd/"*.service /etc/systemd/system/
log "Installed systemd unit"

# ── Build frontend ─────────────────────────────────────────────
cd "$APP_DIR/frontend"
npm ci
npm run build
log "Frontend built"

# ── Build backend ──────────────────────────────────────────────
cd "$APP_DIR/backend"
npm ci
npm run build
log "Backend compiled"

# ── Keep only production backend dependencies ──────────────────
npm prune --omit=dev
log "Backend pruned to production dependencies"

# ── Configure .env ─────────────────────────────────────────────
if [[ ! -f "$APP_DIR/backend/.env" ]]; then
  cp "$APP_DIR/backend/.env.example" "$APP_DIR/backend/.env"
  chown "$APP_USER:$APP_GROUP" "$APP_DIR/backend/.env"
  chmod 600 "$APP_DIR/backend/.env"
  log "Created .env — edit $APP_DIR/backend/.env to customize"
else
  log ".env already exists, skipping"
fi

# ── Permissions ────────────────────────────────────────────────
chown -R "$APP_USER:$APP_GROUP" "$APP_DIR"
chmod 750 "$APP_DIR"
log "Permissions set"

# ── Polkit for systemctl (no sudo needed) ─────────────────────
POLKIT_DIR="/etc/polkit-1/rules.d"
if [[ -d "$POLKIT_DIR" ]]; then
  cp "$SOURCE_DIR/deploy/polkit/50-mediamtx-admin-ui.rules" "$POLKIT_DIR/"
  log "Polkit rules installed"
else
  log "Polkit not found; systemctl may need alternative configuration"
fi

# ── Sudoers for journalctl (systemd-journal may not be enough) ─
SUDOERS_FILE="/etc/sudoers.d/mediamtx-admin-ui"
if [[ ! -f "$SUDOERS_FILE" ]]; then
  cat > "$SUDOERS_FILE" << EOF
# mediamtx-admin-ui: allow read-only systemctl for mediamtx
$APP_USER ALL=(root) NOPASSWD: /usr/bin/systemctl show mediamtx.service *
$APP_USER ALL=(root) NOPASSWD: /usr/bin/systemctl is-active mediamtx.service
$APP_USER ALL=(root) NOPASSWD: /usr/bin/systemctl status mediamtx.service --no-pager
# journalctl is available through systemd-journal group, no sudo needed
EOF
  chmod 440 "$SUDOERS_FILE"
  log "Sudoers configured at $SUDOERS_FILE"
else
  log "Sudoers already exists, skipping"
fi

# ── Enable and start service ───────────────────────────────────
systemctl daemon-reload
systemctl enable "$SERVICE_NAME"
systemctl start "$SERVICE_NAME"
log "Service $SERVICE_NAME started"

# ── Verify ─────────────────────────────────────────────────────
sleep 2
if systemctl is-active --quiet "$SERVICE_NAME"; then
  log "Service is running"
  echo ""
  echo "── Health check ─────────────────────────────"
  curl -s "http://127.0.0.1:$BACKEND_PORT/api/health" | head -c 200
  echo ""
  echo "─────────────────────────────────────────────"
  echo ""
  log "Deployment complete!"
  echo "Edit $APP_DIR/backend/.env to configure auth and paths."
  echo "UI will be available at http://127.0.0.1:$BACKEND_PORT"
  echo "(frontend static files are served by the backend)"
else
  err "Service failed to start. Check: journalctl -u $SERVICE_NAME -n 50 --no-pager"
fi
