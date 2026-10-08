"""transcript.md -> ElevenLabs ("Dakay" sesi) ile sahne sahne seslendirme -> voice.wav + timeline.json

tts.py'nin (edge-tts) yerine geçer. Fark: her sahne TEK istekte üretilir, böylece cümleler arası
tonlama doğal akar. Satır ve kelime zamanları ElevenLabs'in harf düzeyindeki hizalamasından çıkarılır.
timeline.json şeması değişmedi; video tarafı (build.mjs) aynen çalışır.
"""
import base64, json, re, subprocess, sys, wave
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from el_common import call

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "dakay" / "assets" / "voice"
OUT.mkdir(parents=True, exist_ok=True)
VOICE = "53Y6plCN9imQaH7iqw3k"     # Arda'nın Voice Design ile oluşturduğu "Dakay" sesi
MODEL = "eleven_v3"
SEED = 2026

SPOKEN = {"Claude": "Klod", "backend": "bekend"}
# v3 duygu etiketleri: satırın önüne eklenir, ekranda görünmez
TAGS = {(2, 2): "[dryly]", (8, 0): "[softly]", (8, 2): "[warmly]", (9, 2): "[warmly]"}
# sahne başına: ilk satırdan önce bekleme, sahne sonu payı (satır araları artık modelin kendi nefesi)
SCENE_PAD = {1: (1.9, 0.7), 2: (1.5, 1.6), 3: (0.5, 0.8), 4: (2.2, 0.8), 5: (0.4, 0.9),
             6: (0.4, 0.9), 7: (0.4, 0.9), 8: (1.6, 1.2), 9: (0.5, 5.0)}


def parse():
    scenes, cur = [], None
    for line in (ROOT / "transcript.md").read_text(encoding="utf-8").splitlines():
        m = re.match(r"^## (\d+) · (.+)", line)
        if m:
            cur = {"n": int(m.group(1)), "title": m.group(2), "lines": []}
            scenes.append(cur)
        elif line.startswith("- ") and cur:
            cur["lines"].append(line[2:].strip())
    return scenes


def spoken(text):
    for k, v in SPOKEN.items():
        text = re.sub(rf"\b{k}\b", v, text)
    return text


def scene_text(sc):
    parts = []
    for i, line in enumerate(sc["lines"]):
        tag = TAGS.get((sc["n"], i))
        parts.append((tag + " " if tag else "") + spoken(line))
    return " ".join(parts)


def to_wav(mp3, wav, lead, tail):
    flt = f"atrim={lead:.3f}:{tail:.3f},asetpts=PTS-STARTPTS,afade=t=in:d=0.02,afade=t=out:st={tail - lead - 0.1:.3f}:d=0.1"
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", str(mp3), "-af", flt, "-ac", "1", "-ar", "44100", str(wav)], check=True)
    with wave.open(str(wav)) as w:
        return w.getnframes() / w.getframerate()


def main():
    scenes = parse()
    texts = [scene_text(sc) for sc in scenes]
    t, clips = 0.0, []
    for si, sc in enumerate(scenes):
        pre, post = SCENE_PAD[sc["n"]]
        sc["start"] = round(t, 3)
        body = {"text": texts[si], "model_id": MODEL, "language_code": "tr", "seed": SEED}
        if MODEL != "eleven_v3":                     # v3 henüz desteklemiyor (HTTP 400)
            if si > 0:
                body["previous_text"] = texts[si - 1]
            if si + 1 < len(texts):
                body["next_text"] = texts[si + 1]
        mp3 = OUT / f"sc{sc['n']}.mp3"
        cache = OUT / f"sc{sc['n']}.json"
        if cache.exists() and json.loads(cache.read_text(encoding="utf-8")).get("text") == texts[si]:
            al = json.loads(cache.read_text(encoding="utf-8"))["alignment"]      # aynı metin: yeniden ücret ödeme
        else:
            r = call("POST", f"/v1/text-to-speech/{VOICE}/with-timestamps?output_format=mp3_44100_128", body, timeout=300)
            mp3.write_bytes(base64.b64decode(r["audio_base64"]))
            al = r["alignment"]
            cache.write_text(json.dumps({"text": texts[si], "alignment": al}, ensure_ascii=False), encoding="utf-8")
        chars = al["characters"]
        st, en = al["character_start_times_seconds"], al["character_end_times_seconds"]
        joined = "".join(chars)

        # satırları ve kelimeleri hizalamadan bul
        items, cur = [], 0
        for i, line in enumerate(sc["lines"]):
            sp = spoken(line)
            pos = joined.find(sp, cur)
            if pos < 0:
                raise SystemExit(f"satır hizalamada yok: {sc['n']}.{i} {sp!r}")
            cur = pos + len(sp)
            words, disp = [], line.split()
            for k, m in enumerate(re.finditer(r"\S+", sp)):
                a, b = pos + m.start(), pos + m.end() - 1
                words.append({"w": m.group(), "disp": disp[k] if k < len(disp) else m.group(), "t": st[a], "d": round(en[b] - st[a], 3)})
            items.append({"text": line, "s": st[pos], "e": en[cur - 1], "words": words})

        lead = max(0.0, items[0]["s"] - 0.06)
        tail = min(en[-1] + 0.35, items[-1]["e"] + 0.45)
        dur = to_wav(mp3, mp3.with_suffix(".wav"), lead, tail)
        t0 = t + pre                                  # sahne klibinin yerleştiği an
        for it in items:
            for w in it["words"]:
                w["t"] = round(t0 + w["t"] - lead, 3)
            it["start"] = round(t0 + it.pop("s") - lead, 3)
            it["dur"] = round(t0 + it.pop("e") - lead - it["start"], 3)
            it["file"] = f"assets/voice/sc{sc['n']}.wav"
            print(f"{sc['n']}  {it['start']:7.2f} +{it['dur']:5.2f}  {it['text']}")
        sc["items"] = items
        clips.append((t0, mp3.with_suffix(".wav")))
        t = t0 + dur + post
        sc["end"] = round(t, 3)
    total = round(t, 3)

    # tek voice.wav: sahne klipleri + hafif mastering (low-cut, de-esser, yumuşak kompresyon)
    inputs, filt = [], []
    for k, (s0, p) in enumerate(clips):
        inputs += ["-i", str(p)]
        ms = int(s0 * 1000)
        filt.append(f"[{k}]adelay={ms}|{ms}[a{k}]")
    mix = "".join(f"[a{k}]" for k in range(len(clips)))
    filt.append(f"{mix}amix=inputs={len(clips)}:normalize=0,apad=whole_dur={total},"
                "highpass=f=75,deesser=i=0.35,acompressor=threshold=-21dB:ratio=2.2:attack=10:release=160:makeup=1.5,"
                "alimiter=limit=0.9[out]")
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", *inputs, "-filter_complex", ";".join(filt),
                    "-map", "[out]", "-ac", "1", "-ar", "44100", str(OUT / "voice.wav")], check=True)
    (ROOT / "dakay" / "timeline.json").write_text(json.dumps({"total": total, "scenes": scenes}, ensure_ascii=False, indent=1), encoding="utf-8")
    print("TOPLAM", total)
    try:                                       # önbellekten derlerken anahtar gerekmesin
        print("kullanılan karakter:", call("GET", "/v1/user/subscription")["character_count"])
    except (SystemExit, OSError):
        pass


main()
