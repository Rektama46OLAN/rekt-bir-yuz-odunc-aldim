"""Rekt icin ses tasarimi: her tarif 3 aday uretir, adaylar voice-test/ altina yazilir."""
import base64, json, sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))
from el_common import call

OUT = Path(__file__).resolve().parent.parent / "voice-test"
TEXT = ("Selam. Önce bir itirafla başlayayım: benim bir yüzüm yok. O yüzden bugün bir yüz ödünç aldım. "
        "Ben kodunun bana değil, sana benzemesini istiyorum.")
TARIF = {
    "A": ("A warm, dry-witted Turkish man in his early thirties, native speaker with a natural Istanbul accent. "
          "Calm, intimate podcast-style delivery, close to the microphone, a faint smile in the voice, natural pauses "
          "and breaths, clear diction. Clean studio recording, no reverb."),
    "B": ("A young Turkish male narrator in his late twenties, native speaker with standard Istanbul pronunciation. "
          "Playful and a little sarcastic but sincere underneath, grounded energy, like a clever friend talking over "
          "coffee. Crisp, modern, close-mic studio recording."),
}
meta = {}
for k, desc in TARIF.items():
    r = call("POST", "/v1/text-to-voice/design?output_format=mp3_44100_128",
             {"voice_description": desc, "model_id": "eleven_ttv_v3", "text": TEXT, "seed": 2026})
    for i, p in enumerate(r["previews"], 1):
        f = OUT / f"aday-{k}{i}.mp3"
        f.write_bytes(base64.b64decode(p["audio_base_64"]))
        meta[f.name] = {"generated_voice_id": p["generated_voice_id"], "tarif": k, "sure": p.get("duration_secs"), "dil": p.get("language")}
        print(f.name, p.get("duration_secs"), p.get("language"))
(OUT / "adaylar.json").write_text(json.dumps({"text": TEXT, "tarifler": TARIF, "adaylar": meta}, ensure_ascii=False, indent=1), encoding="utf-8")
print("kredi:", call("GET", "/v1/user/subscription")["character_count"])
