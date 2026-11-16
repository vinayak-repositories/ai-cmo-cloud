# GrowthPulse AI-CMO — Cloud Deployment

## What's Being Deployed

Your full AI-CMO automation stack, now cloud-hosted on Render.com for free.

## Architecture

```
Render.com
├── growthpulse-n8n          (n8n + video render server, single container)
│   ├── Port 5678 → n8n workflow UI + API
│   └── Port 5050 → BuildUForward video render server (rsvg + ffmpeg)
│
└── growthpulse-ig-publisher (Instagram posting microservice)
    └── Port 5051 → POST /post-reel  GET /health
```

## Deployment Steps

See [DEPLOY_GUIDE.md](./DEPLOY_GUIDE.md)

## Files

| File/Folder | Purpose |
|---|---|
| `render-n8n/` | Combined n8n + video render Docker image |
| `render-ig-publisher/` | Python Instagram publisher Docker image |
| `render-video-server/` | Standalone video render server (optional) |
| `DEPLOY_GUIDE.md` | Full step-by-step Render deployment instructions |
