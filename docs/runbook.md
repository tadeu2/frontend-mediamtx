# Runbook: mediamtx-admin-ui

## Service management

```bash
# Start / stop / restart the admin UI
sudo systemctl start mediamtx-admin-ui
sudo systemctl stop mediamtx-admin-ui
sudo systemctl restart mediamtx-admin-ui

# Enable on boot
sudo systemctl enable mediamtx-admin-ui

# View logs
sudo journalctl -u mediamtx-admin-ui -n 200 -f

# Check status
sudo systemctl status mediamtx-admin-ui --no-pager
```

## Health check

```bash
curl http://127.0.0.1:9088/api/health
# Expected: {"ok":true,"service":"mediamtx-admin-ui","generatedAt":"...","source":"fallback"}
```

## Logs endpoint

```bash
# Last 50 lines
curl http://127.0.0.1:9088/api/logs?lines=50

# Filter by level
curl http://127.0.0.1:9088/api/logs?lines=100&level=error

# Filter by text
curl http://127.0.0.1:9088/api/logs?lines=50&query=rtsp
```

## Disable / rollback

```bash
# Disable without affecting MediaMTX
sudo systemctl stop mediamtx-admin-ui
sudo systemctl disable mediamtx-admin-ui

# Full rollback (remove package + service)
sudo systemctl stop mediamtx-admin-ui
sudo systemctl disable mediamtx-admin-ui
sudo rm /etc/systemd/system/mediamtx-admin-ui.service
sudo systemctl daemon-reload
# Remove the app directory
sudo rm -rf /opt/mediamtx-admin-ui
```

## Verify MediaMTX access

```bash
# MediaMTX API
curl -s http://127.0.0.1:9997/v3/config/global/get

# MediaMTX metrics
curl -s http://127.0.0.1:9998/metrics | head

# MediaMTX systemd
systemctl status mediamtx --no-pager

# Recent logs
journalctl -u mediamtx -n 20 --no-pager
```

## Common issues

| Symptom | Likely cause | Fix |
|---------|-------------|-----|
| `/api/status` shows `unavailable` | `systemctl` access denied | Add sudoers entry for `journalctl` + `systemctl` |
| `/api/metrics` shows unavailable | Metrics endpoint disabled | Enable `metrics: yes` in `mediamtx.yml` |
| `/api/config` shows unavailable | Config path wrong or permissions | Check `MEDIAMTX_CONFIG_PATH` env var |
| Backend won't start | Port in use | Change `PORT` env var |
| Frontend can't reach backend | CORS or proxy misconfig | Check `CORS_ORIGIN` or dev proxy target |

## Config reference

- **Backend config**: environment variables (see `backend/.env.example`)
- **Frontend config**: Vite dev proxy in `vite.config.ts`
- **Pipeline order**: `backend` must be reachable before `frontend` can fetch data
- **Shared types**: modify `shared/admin-api.ts` when adding/changing API contracts, then rebuild both packages

## Architecture constraints

- Read-only MVP: no restart/reload/edit from UI — documented in ADR-0001.
- Same LXC + systemd: no Docker without a new ADR.
- Secrets redacted: passwords/tokens in config and log views are masked.
