"""ElevenLabs ortak: anahtar ELEVENLABS_API_KEY ortam degiskeninden okunur, hic yazdirilmaz."""
import json, os, urllib.request, urllib.error

def key():
    k = os.environ.get("ELEVENLABS_API_KEY")
    if not k and os.name == "nt":               # Windows: setx sonrasi yeni acilmamis kabuklar icin kayit defteri
        import winreg
        with winreg.OpenKey(winreg.HKEY_CURRENT_USER, "Environment") as h:
            k = winreg.QueryValueEx(h, "ELEVENLABS_API_KEY")[0]
    if not k:
        raise OSError("ELEVENLABS_API_KEY tanimli degil")
    return k.strip()

API = "https://api.elevenlabs.io"

def call(method, path, body=None, timeout=180):
    req = urllib.request.Request(API + path, method=method,
                                 data=json.dumps(body).encode() if body is not None else None,
                                 headers={"xi-api-key": key(), "Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(req, timeout=timeout) as r:
            return json.loads(r.read().decode())
    except urllib.error.HTTPError as e:
        raise SystemExit(f"HTTP {e.code} {path}: {e.read().decode()[:600]}")
