"""transcript.md -> satir satir edge-tts sesi + kelime zamanlari -> voice.wav + timeline.json

Her satir ayri seslendirilir, sonra sahne kurallarina gore (on-bosluk, satir arasi,
sahne arasi) tek bir zaman cizgisine dizilir. Videodaki her sey timeline.json'dan okur.
"""
import asyncio, json, re, subprocess, sys, wave
from pathlib import Path

import edge_tts

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "dakay" / "assets" / "voice"
OUT.mkdir(parents=True, exist_ok=True)
VOICE = "tr-TR-AhmetNeural"
RATE = "+3%"
PITCH = "-2Hz"

# Ekranda yazilan -> okunan (TTS telaffuzu)
SPOKEN = {
    "Claude": "Klod",
    "backend": "bekend",
}

# sahne basina: ilk satirdan once bekleme, satir arasi, sahne sonu payi
SCENE_PAD = {
    1: (1.9, 0.45, 0.7),
    2: (1.5, 0.45, 1.6),   # sonda huysuz an
    3: (0.5, 0.45, 0.8),
    4: (2.2, 0.45, 0.8),   # basta uyku
    5: (0.4, 0.45, 0.9),
    6: (0.4, 0.45, 0.9),
    7: (0.4, 0.5, 0.9),
    8: (1.6, 0.75, 1.2),   # yavas, nefesli
    9: (0.5, 0.55, 4.2),   # son gag
}


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


async def synth(text, path):
    com = edge_tts.Communicate(spoken(text), VOICE, rate=RATE, pitch=PITCH, boundary="WordBoundary")
    words, audio = [], bytearray()
    async for ch in com.stream():
        if ch["type"] == "audio":
            audio.extend(ch["data"])
        elif ch["type"] == "WordBoundary":
            words.append({"w": ch["text"], "t": ch["offset"] / 1e7, "d": ch["duration"] / 1e7})
    path.write_bytes(bytes(audio))
    return words


def to_wav(mp3, wav, lead, tail):
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", str(mp3),
                    "-af", f"atrim={lead:.3f}:{tail:.3f},asetpts=PTS-STARTPTS,afade=t=out:st={tail - lead - 0.08:.3f}:d=0.08",
                    "-ac", "1", "-ar", "44100", str(wav)], check=True)
    with wave.open(str(wav)) as w:
        return w.getnframes() / w.getframerate()


async def main():
    scenes = parse()
    t = 0.0
    clips = []
    for sc in scenes:
        pre, gap, post = SCENE_PAD[sc["n"]]
        sc["start"] = round(t, 3)
        t += pre
        sc["items"] = []
        for i, text in enumerate(sc["lines"]):
            base = OUT / f"s{sc['n']}_{i}"
            words = await synth(text, base.with_suffix(".mp3"))
            # edge-tts basta ~0.1 sn, sonda ~1.2 sn sessizlik birakiyor: kelime sinirlarina gore kirp
            lead = max(0.0, words[0]["t"] - 0.05)
            tail = words[-1]["t"] + words[-1]["d"] + 0.22
            dur = to_wav(base.with_suffix(".mp3"), base.with_suffix(".wav"), lead, tail)
            # display kelimelerini spoken kelimelere sirayla esle (sayi ayni)
            disp = text.split()
            if len(disp) != len(words):
                print("  ! kelime sayisi tutmuyor:", len(disp), len(words), [w["w"] for w in words])
            for k, w in enumerate(words):
                w["disp"] = disp[k] if len(disp) == len(words) else w["w"]
                w["t"] = round(t + w["t"] - lead, 3)
                w["d"] = round(w["d"], 3)
            sc["items"].append({"text": text, "start": round(t, 3), "dur": round(dur, 3), "words": words,
                                "file": f"assets/voice/{base.name}.wav"})
            clips.append((t, base.with_suffix(".wav")))
            t += dur + (gap if i < len(sc["lines"]) - 1 else 0)
            print(f"{sc['n']}.{i} {dur:5.2f}s  {text}")
        t += post
        sc["end"] = round(t, 3)
    total = round(t, 3)

    # tek voice.wav: sessiz zemin uzerine satirlari yerlestir
    inputs, filt = [], []
    for k, (st, p) in enumerate(clips):
        inputs += ["-i", str(p)]
        ms = int(st * 1000)
        filt.append(f"[{k}]adelay={ms}|{ms}[a{k}]")
    mix = "".join(f"[a{k}]" for k in range(len(clips)))
    filt.append(f"{mix}amix=inputs={len(clips)}:normalize=0,apad=whole_dur={total}[out]")
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", *inputs, "-filter_complex", ";".join(filt),
                    "-map", "[out]", "-ac", "1", "-ar", "44100", str(OUT / "voice.wav")], check=True)

    (ROOT / "dakay" / "timeline.json").write_text(
        json.dumps({"total": total, "scenes": scenes}, ensure_ascii=False, indent=1), encoding="utf-8")
    print("TOPLAM", total)


asyncio.run(main())
