🌐 GrowthPulse AI-CMO — Render.com Deployment Guide

# 3 Services to Deploy

| # | Service | Folder | Render Type | Port |
|---|---|---|---|---|
| 1 | n8n (workflow + video) | `render-n8n/` | Web Service (Docker) | 5678 |
| 2 | Instagram Publisher | `render-ig-publisher/` | Web Service (Docker) | 5051 |
| 3 | (Optional) Video-only server | `render-video-server/` | Web Service (Docker) | 5050 |

---

# STEP 1 — Push to GitHub

```
cd V:\ai-cmo\deploy
git init
git add .
git commit -m "GrowthPulse cloud deployment"
gh repo create growthpulse-deploy --public --push --source=.
```

---

# STEP 2 — Deploy Service 1: n8n + Video Server (Combined)

1. Go to → https://render.com → "New Web Service"
2. Connect your GitHub repo → select root folder: `render-n8n/`
3. Settings:
   - **Name**: `growthpulse-n8n`
   - **Environment**: `Docker`
   - **Plan**: `Free` (or Starter $7/mo for no sleep)
   - **Health Check Path**: `/healthz`
4. Environment Variables (click "Add Env Var"):

| Key | Value |
|-----|-------|
| `N8N_HOST` | `0.0.0.0` |
| `N8N_PORT` | `5678` |
| `N8N_PROTOCOL` | `https` |
| `WEBHOOK_URL` | `https://growthpulse-n8n.onrender.com/` |
| `N8N_BASIC_AUTH_ACTIVE` | `true` |
| `N8N_BASIC_AUTH_USER` | `admin` |
| `N8N_BASIC_AUTH_PASSWORD` | *(pick a strong password)* |
| `N8N_ENCRYPTION_KEY` | *(paste the key from your local config)* |

5. Add a **Persistent Disk**:
   - Mount Path: `/home/node/.n8n`
   - Size: 1 GB (free tier)

6. Click **"Create Web Service"** → wait ~5 min to build

---

# STEP 3 — Deploy Service 2: Instagram Publisher

1. "New Web Service" → `render-ig-publisher/`
2. Settings:
   - **Name**: `growthpulse-ig-publisher`
   - **Environment**: `Docker`
   - **Plan**: `Free`
   - **Health Check Path**: `/health`
3. Environment Variables:

| Key | Value |
|-----|-------|
| `PORT` | `5051` |
| `IG_SESSION_PATH` | `/data/ig_session.json` |
| `PING_URL` | `https://growthpulse-ig-publisher.onrender.com` |
| `PING_INTERVAL` | `540` |

4. Add a **Persistent Disk**:
   - Mount Path: `/data`
   - Size: 1 GB

5. Click **"Create Web Service"**

---

# STEP 4 — Upload Instagram Session to Persistent Disk

After the IG Publisher deploys, run this ONE TIME on your PC:
```
# Replace <render-service-id> with your actual Render service ID
render ssh growthpulse-ig-publisher
# Inside the shell:
mkdir -p /data
# Then paste your ig_session.json content
```

**OR** base64-encode and POST it via the `/upload-session` endpoint we can add.

---

# STEP 5 — Update n8n Workflow URLs

After both services are live, update these in your n8n workflow:

| Old (local) | New (cloud) |
|---|---|
| `http://127.0.0.1:5050/render-reel` | `https://growthpulse-n8n.onrender.com:5050/render-reel` (internal) |
| `http://host.docker.internal:5051/post-reel` | `https://growthpulse-ig-publisher.onrender.com/post-reel` |

---

# STEP 6 — Import Your Workflow

In your hosted n8n UI:
1. Open `https://growthpulse-n8n.onrender.com`
2. Settings → Import workflow → paste `V:\ai-cmo\AI_CMO_Shorts_and_Reels_Generator.json`
3. Update credentials (Airtable, OpenRouter, Gmail)
4. Test run!

---

# Keep-Alive: Preventing Render Sleep

The IG Publisher already self-pings every 9 minutes via the `PING_URL` env var.
For n8n, add an external pinger:
- UptimeRobot (free): https://uptimerobot.com → monitor `https://growthpulse-n8n.onrender.com/healthz` every 5 min

---

# Cost Summary

| Service | Plan | Monthly Cost |
|---|---|---|
| n8n + video server | Free | \$0 |
| Instagram publisher | Free | \$0 |
| UptimeRobot pinger | Free | \$0 |
| **Total** | | **\$0/month** |

> ⚠ Render free tier has 750 compute-hours/month. With 3 services, that's ~250 hrs each.
> With keep-alive pinging, you use all hours → upgrade 1 service to Starter (\$7/mo) if you hit limits.

