FROM python:3.11-slim

# ffmpeg for thumbnail extraction
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY ig_publisher.py .

# Persistent session storage (mount a Render Disk or use env var)
RUN mkdir -p /data /tmp/reel_uploads

ENV PORT=5051
ENV IG_SESSION_PATH=/data/ig_session.json
ENV UPLOAD_DIR=/tmp/reel_uploads

EXPOSE 5051

CMD ["python", "-u", "ig_publisher.py"]

