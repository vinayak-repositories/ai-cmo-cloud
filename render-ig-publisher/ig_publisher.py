import os
import json
import time
import threading
import urllib.request
from http.server import HTTPServer, BaseHTTPRequestHandler
from pathlib import Path
from instagrapi import Client
from PIL import Image

# ─── Config ───────────────────────────────────────────────────────────────────
PORT         = int(os.environ.get('PORT', 5051))
SESSION_PATH = os.environ.get('IG_SESSION_PATH', '/data/ig_session.json')
UPLOAD_DIR   = os.environ.get('UPLOAD_DIR', '/tmp/reel_uploads')
PING_URL     = os.environ.get('PING_URL', '')        # self-URL for keep-alive
PING_INTERVAL = int(os.environ.get('PING_INTERVAL', 540))  # 9 min default

os.makedirs(UPLOAD_DIR, exist_ok=True)

# Auto-hydrate session from environment variable if provided
SESSION_RAW = os.environ.get('IG_SESSION_JSON', '').strip()
if SESSION_RAW:
    try:
        Path(SESSION_PATH).parent.mkdir(parents=True, exist_ok=True)
        with open(SESSION_PATH, 'w', encoding='utf-8') as f:
            f.write(SESSION_RAW)
        print(f"[IG] Wrote session from IG_SESSION_JSON env var to {SESSION_PATH}")
    except Exception as e:
        print(f"[IG] Error writing IG_SESSION_JSON env var: {e}")

# ─── Keep-alive pinger (prevents Render free tier sleep) ─────────────────────
def _keep_alive():
    if not PING_URL:
        return
    while True:
        try:
            urllib.request.urlopen(f"{PING_URL}/health", timeout=10)
            print(f"[KeepAlive] Pinged {PING_URL}/health OK")
        except Exception as e:
            print(f"[KeepAlive] Ping failed: {e}")
        time.sleep(PING_INTERVAL)

if PING_URL:
    t = threading.Thread(target=_keep_alive, daemon=True)
    t.start()
    print(f"[KeepAlive] Pinger started → {PING_URL}/health every {PING_INTERVAL}s")

# ─── Instagram Client ─────────────────────────────────────────────────────────
cl = Client()

def get_client():
    if not Path(SESSION_PATH).exists():
        return None
    try:
        cl.load_settings(SESSION_PATH)
        return cl
    except Exception as e:
        print(f"[IG] Session load error: {e}")
        return None

# ─── Request Handler ──────────────────────────────────────────────────────────
class Handler(BaseHTTPRequestHandler):
    def log_message(self, fmt, *args):
        print(f"[HTTP] {self.address_string()} {fmt % args}")

    def _json(self, code, body):
        data = json.dumps(body).encode()
        self.send_response(code)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Content-Length', len(data))
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        self.wfile.write(data)

    def do_OPTIONS(self):
        self.send_response(204)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()

    def do_GET(self):
        if self.path == '/health':
            client = get_client()
            self._json(200, {
                'status':   'ok',
                'service':  'growthpulse-ig-publisher',
                'logged_in': client is not None,
                'username': 'yourdailywebdev',
                'session':  Path(SESSION_PATH).exists()
            })
            return
        self.send_response(404); self.end_headers()

    def do_POST(self):
        if self.path == '/post-reel':
            length = int(self.headers.get('Content-Length', 0))
            body   = self.rfile.read(length)
            try:
                payload       = json.loads(body) if body else {}
                caption       = payload.get('caption', '')
                video_b64     = payload.get('video_b64')      # base64-encoded mp4
                video_url     = payload.get('video_url')      # URL to download mp4
                thumbnail_b64 = payload.get('thumbnail_b64')  # optional base64 jpg

                # ── Resolve video file ──────────────────────────────────────
                video_path = None
                if video_b64:
                    import base64
                    video_path = os.path.join(UPLOAD_DIR, f'reel_{int(time.time())}.mp4')
                    with open(video_path, 'wb') as f:
                        f.write(base64.b64decode(video_b64))
                    print(f"[IG] Video from base64 → {video_path}")
                elif video_url:
                    video_path = os.path.join(UPLOAD_DIR, f'reel_{int(time.time())}.mp4')
                    urllib.request.urlretrieve(video_url, video_path)
                    print(f"[IG] Video downloaded from URL → {video_path}")
                else:
                    self._json(400, {'error': 'Provide video_b64 or video_url'})
                    return

                # ── Resolve thumbnail ───────────────────────────────────────
                thumb_path = None
                if thumbnail_b64:
                    import base64
                    thumb_path = video_path.replace('.mp4', '_thumb.jpg')
                    with open(thumb_path, 'wb') as f:
                        f.write(base64.b64decode(thumbnail_b64))
                else:
                    # Extract first frame via ffmpeg
                    thumb_path = video_path.replace('.mp4', '_thumb.jpg')
                    try:
                        os.system(f'ffmpeg -y -ss 0 -i "{video_path}" -vframes 1 -q:v 2 "{thumb_path}"')
                    except Exception:
                        pass
                    # Fallback: solid ivory image
                    if not Path(thumb_path).exists():
                        img = Image.new('RGB', (1080, 1920), color=(238, 235, 226))
                        img.save(thumb_path, 'JPEG', quality=90)

                # ── Instagram upload ────────────────────────────────────────
                client = get_client()
                if not client:
                    self._json(401, {'error': 'Not logged in. Upload ig_session.json to /data/'})
                    return

                print(f"[IG] Uploading reel: {video_path}")
                print(f"[IG] Caption: {caption[:80]}...")
                media = client.clip_upload(video_path, caption=caption, thumbnail=thumb_path)
                reel_url = f"https://www.instagram.com/reel/{media.code}/"
                print(f"[IG] ✅ Posted: {reel_url}")

                # Cleanup upload files
                try: os.remove(video_path)
                except: pass
                try: os.remove(thumb_path)
                except: pass

                self._json(200, {
                    'status':   'success',
                    'reel_url': reel_url,
                    'code':     media.code,
                    'media_id': str(media.pk)
                })

            except Exception as e:
                print(f"[IG] ❌ Error: {e}")
                self._json(500, {'error': str(e)})
            return

        self.send_response(404); self.end_headers()

# ─── Boot ─────────────────────────────────────────────────────────────────────
if __name__ == '__main__':
    print(f"🚀 GrowthPulse IG Publisher on port {PORT}")
    print(f"   Session: {SESSION_PATH}")
    print(f"   Keep-alive: {PING_URL or 'disabled'}")
    HTTPServer(('0.0.0.0', PORT), Handler).serve_forever()

