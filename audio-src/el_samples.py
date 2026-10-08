"""Hazir seslerle Turkce ornekler (with-timestamps: zaman damgasi da sinanir)."""
import base64, json, sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))
from el_common import call

OUT = Path(__file__).resolve().parent.parent / "voice-test"
OUT.mkdir(exist_ok=True)
TEXT = ("Selam. Önce bir itirafla başlayayım: benim bir yüzüm yok. O yüzden bugün bir yüz ödünç aldım. "
        "Ben kodunun bana değil, sana benzemesini istiyorum.")
SESLER = {"chris": "iP95p4xoKVk53GoZ742B", "eric": "cjVigY5qzO86Huf0OWal", "will": "bIHbv24MWmeRgasZH58o", "brian": "nPczCjzI2devNBz1zQrb"}
DENEME = [("chris", m) for m in ("eleven_v4", "eleven_v3", "eleven_multilingual_v2")] + [(v, "eleven_v4") for v in ("eric", "will", "brian")]
for ses, model in DENEME:
    body = {"text": TEXT, "model_id": model, "seed": 2026}
    if model != "eleven_multilingual_v2":
        body["language_code"] = "tr"
    r = call("POST", f"/v1/text-to-speech/{SESLER[ses]}/with-timestamps?output_format=mp3_44100_128", body)
    f = OUT / f"{ses}-{model.replace('eleven_', '')}.mp3"
    f.write_bytes(base64.b64decode(r["audio_base64"]))
    al = r.get("alignment") or {}
    print(f.name, "harf:", len(al.get("characters", [])), "son:", (al.get("character_end_times_seconds") or [0])[-1])
print("kullanilan:", call("GET", "/v1/user/subscription")["character_count"])
