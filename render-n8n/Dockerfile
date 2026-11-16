FROM n8nio/n8n:latest

USER root

# Install rsvg-convert + ffmpeg (needed by the video render sidecar)
RUN apk add --no-cache \
    ffmpeg \
    librsvg \
    font-noto \
    font-noto-emoji \
    fontconfig \
    && fc-cache -f

# Install msedge-tts for the video render server
WORKDIR /home/node
COPY server/package.json .
RUN npm install

# Copy the render server + media assets
COPY server/tts_server.js .
COPY assets/mascot.png .
COPY assets/mascot_loop.mp4 .
COPY assets/lofi_groove.mp3 .

# Startup script: boot n8n + the render sidecar together
COPY start.sh /start.sh
RUN chmod +x /start.sh

USER node

ENV N8N_PORT=5678
EXPOSE 5678 5050

ENTRYPOINT ["/start.sh"]

