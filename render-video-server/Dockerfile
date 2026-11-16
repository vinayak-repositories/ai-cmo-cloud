# ─────────────────────────────────────────────────────────────────────────────
# Service 1: Video Render Server
# Base: n8nio/n8n (already has Node 22) + adds ffmpeg, librsvg, assets
# ─────────────────────────────────────────────────────────────────────────────
FROM node:22-alpine

# System deps: ffmpeg + librsvg (rsvg-convert)
RUN apk add --no-cache \
    ffmpeg \
    librsvg \
    font-noto \
    font-noto-emoji \
    fontconfig \
    && fc-cache -f

# App dir
WORKDIR /app

# Install msedge-tts
COPY package.json .
RUN npm install

# Copy server + assets
COPY tts_server.js .
COPY assets/mascot.png .
COPY assets/mascot_loop.mp4 .
COPY assets/lofi_groove.mp3 .

# Render.com sets PORT env var automatically
ENV PORT=5050
EXPOSE 5050

CMD ["node", "tts_server.js"]

