"""
Procedural audio for the "Dakay" motion-graphics video.

Everything here is synthesized from math (oscillators, filtered noise, envelopes).
No samples, no downloads -> no copyright issues.

Outputs (44100 Hz, 16-bit):
  dakay/assets/sfx/*.wav            mono, peak ~ -3 dBFS
  dakay/assets/music/bed.wav        stereo, 130 s, ~105 BPM, peak ~ -6 dBFS
                                    (section times follow the ElevenLabs voice: see BEAT/T0 below)
  dakay/assets/music/bed.mp3        192 kbps (ffmpeg)
  dakay/assets/music/bed_breakdown_times.txt

Deterministic: fixed RNG seed.
"""
import math
import os
import shutil
import subprocess
import wave

import numpy as np
from scipy import signal

SR = 44100
SEED = 20261008
rng = np.random.default_rng(SEED)

HERE = os.path.dirname(os.path.abspath(__file__))
ASSETS = os.path.normpath(os.path.join(HERE, "..", "dakay", "assets"))
SFX_DIR = os.path.join(ASSETS, "sfx")
MUSIC_DIR = os.path.join(ASSETS, "music")


# ----------------------------------------------------------------------------
# basic helpers
# ----------------------------------------------------------------------------
def tt(dur):
    return np.arange(int(round(dur * SR))) / SR


def noise(n):
    return rng.standard_normal(n)


def phase(freq, n, ph0=0.0):
    f = np.full(n, float(freq)) if np.isscalar(freq) else np.asarray(freq, float)
    return ph0 + 2 * np.pi * np.cumsum(f) / SR


def bl_saw(ph, f_max, cap=60):
    """Band-limited saw from a phase array (additive)."""
    nh = max(1, min(cap, int(15000 / max(f_max, 1.0))))
    out = np.zeros_like(ph)
    for k in range(1, nh + 1):
        out += np.sin(k * ph) / k
    return out * (2 / np.pi)


def sos_filter(x, kind, freq, order=2):
    sos = signal.butter(order, freq, btype=kind, fs=SR, output="sos")
    return signal.sosfilt(sos, x)


def lp(x, f, order=2):
    return sos_filter(x, "lowpass", f, order)


def hp(x, f, order=2):
    return sos_filter(x, "highpass", f, order)


def bp(x, lo, hi, order=2):
    return sos_filter(x, "bandpass", [lo, hi], order)


def svf(x, fc, q=1.0, mode="bp"):
    """TPT state-variable filter with per-sample cutoff (time-varying sweeps)."""
    fc = np.broadcast_to(np.asarray(fc, float), x.shape)
    g = np.tan(np.pi * np.clip(fc, 10, SR * 0.45) / SR)
    k = 1.0 / q
    a1 = 1.0 / (1.0 + g * (g + k))
    a2 = g * a1
    a3 = g * a2
    out = np.empty_like(x)
    ic1 = ic2 = 0.0
    xs, a1s, a2s, a3s = x.tolist(), a1.tolist(), a2.tolist(), a3.tolist()
    m = {"lp": 0, "bp": 1, "hp": 2}[mode]
    for i in range(len(xs)):
        v0 = xs[i]
        v3 = v0 - ic2
        v1 = a1s[i] * ic1 + a2s[i] * v3
        v2 = ic2 + a2s[i] * ic1 + a3s[i] * v3
        ic1 = 2 * v1 - ic1
        ic2 = 2 * v2 - ic2
        out[i] = v1 if m == 1 else (v2 if m == 0 else v0 - k * v1 - v2)
    return out


def ad(t, attack, tau):
    """Linear attack then exponential decay."""
    return np.minimum(t / attack, 1.0) * np.exp(-np.maximum(t - attack, 0) / tau)


def place(buf, x, start_s, gain=1.0):
    i0 = int(round(start_s * SR))
    if i0 >= len(buf):
        return
    if i0 < 0:
        x = x[-i0:]
        i0 = 0
    i1 = min(len(buf), i0 + len(x))
    buf[i0:i1] += gain * x[: i1 - i0]


def cos_fade(n_len):
    return 0.5 - 0.5 * np.cos(np.linspace(0, np.pi, n_len))


def fades(x, in_ms=1.5, out_ms=20.0):
    x = x.copy()
    ni = max(2, int(in_ms * SR / 1000))
    no = max(2, int(out_ms * SR / 1000))
    x[:ni] *= cos_fade(ni)
    x[-no:] *= cos_fade(no)[::-1]
    x[0] = 0.0
    x[-1] = 0.0
    return x


def finalize_sfx(x, out_ms=20.0, in_ms=1.5, peak_db=-3.0):
    x = np.asarray(x, float)
    x = hp(x, 20)                      # kill DC / sub-rumble
    x = x - np.mean(x)
    x = fades(x, in_ms, out_ms)
    x = x * (10 ** (peak_db / 20) / np.max(np.abs(x)))
    return x


def write_wav(path, x):
    x = np.asarray(x, float)
    assert np.all(np.isfinite(x)), path
    data = np.round(np.clip(x, -1.0, 1.0) * 32767).astype("<i2")
    ch = 1 if data.ndim == 1 else data.shape[1]
    with wave.open(path, "wb") as w:
        w.setnchannels(ch)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(data.tobytes())


def mtof(m):
    return 440.0 * 2 ** ((m - 69) / 12)


# ----------------------------------------------------------------------------
# SFX
# ----------------------------------------------------------------------------
def sfx_pop(base=1.0):
    t = tt(0.15)
    n = len(t)
    f = 350 * base + 900 * base * (1 - np.exp(-t / 0.012))
    ph = phase(f, n)
    body = (np.sin(ph) + 0.2 * np.sin(2 * ph)) * ad(t, 0.002, 0.025)
    click = bp(noise(n), 1000, 5000) * np.exp(-t / 0.003) * 0.3
    return finalize_sfx(body + click, out_ms=20)


def sfx_whoosh(dur=0.45, peak_at=0.45):
    t = tt(dur)
    n = len(t)
    u = t / dur
    # skewed bell envelope peaking at `peak_at`
    a = peak_at / (1 - peak_at)
    env = (u ** a) * (1 - u)
    env /= env.max()
    fc = 350 * (2600 / 350) ** env
    x = noise(n)
    band = svf(x, fc, q=1.3, mode="bp")
    body = lp(noise(n), 500) * 0.6
    y = (band + body) * env ** 1.3
    y = lp(y, 6500)
    return finalize_sfx(y, out_ms=30, in_ms=5)


def sfx_boing():
    t = tt(0.5)
    n = len(t)
    wob = np.sin(2 * np.pi * 13 * t)
    depth = 0.28 * np.exp(-t / 0.13)
    rise = 0.75 + 0.25 * (1 - np.exp(-t / 0.02))
    f = (170 + 70 * t / 0.5) * rise * (1 + depth * wob)
    ph = phase(f, n)
    wah = 0.5 + 0.5 * wob
    y = np.sin(ph) + 0.55 * wah * np.sin(2 * ph) + 0.25 * wah * np.sin(3 * ph) + 0.1 * np.sin(4 * ph)
    y *= ad(t, 0.003, 0.17)
    return finalize_sfx(y, out_ms=60)


def sfx_thud():
    t = tt(0.25)
    n = len(t)
    f = 45 + 75 * np.exp(-t / 0.03)
    body = np.sin(phase(f, n)) * ad(t, 0.0015, 0.07)
    knock = lp(noise(n), 400) * np.exp(-t / 0.015) * 0.4
    return finalize_sfx(body + knock, out_ms=40)


def sfx_jump():
    t = tt(0.3)
    n = len(t)
    prog = np.clip(t / 0.22, 0, 1) ** 0.8
    f = 280 * (1100 / 280) ** prog
    ph = phase(f, n)
    y = np.sin(ph) + 0.3 * np.sin(2 * ph) + 0.15 * np.sin(3 * ph)
    y *= ad(t, 0.005, 0.12)
    return finalize_sfx(lp(y, 5000), out_ms=40)


def sfx_steam():
    t = tt(1.0)
    n = len(t)
    out = np.zeros(n)
    for start, length, tau, lo, hi in [(0.0, 0.28, 0.08, 3500, 9000),
                                       (0.32, 0.26, 0.07, 4000, 9500),
                                       (0.62, 0.36, 0.12, 3200, 8500)]:
        m = int(length * SR)
        tl = np.arange(m) / SR
        hiss = bp(noise(m), lo, hi)
        sputter = lp(noise(m), 35)
        sputter = 0.75 + 0.25 * sputter / (np.max(np.abs(sputter)) + 1e-9)
        env = ad(tl, 0.015, tau)
        env *= cos_fade(m)[::-1] ** 0.3
        place(out, hiss * sputter * env, start)
    return finalize_sfx(lp(out, 11000), out_ms=50, in_ms=3)


def bell(f, t, ratios, amps, taus, attack=0.002):
    y = np.zeros_like(t)
    for r, a, tau in zip(ratios, amps, taus):
        if f * r < SR * 0.45:
            y += a * np.sin(2 * np.pi * f * r * t + rng.uniform(0, 2 * np.pi)) * np.exp(-t / tau)
    return y * np.minimum(t / attack, 1.0)


def sfx_ding():
    t = tt(0.8)
    out = np.zeros(len(t))
    place(out, bell(mtof(84), t, [1, 2, 3, 4.2], [1, .35, .12, .06], [.30, .16, .09, .05]), 0.0, 0.8)
    place(out, bell(mtof(91), t, [1, 2, 3, 4.2], [1, .35, .12, .06], [.42, .20, .10, .05]), 0.085, 1.0)
    return finalize_sfx(out, out_ms=80)


def sfx_buzz():
    t = tt(0.4)
    n = len(t)
    out = np.zeros(n)
    for start, length, f0 in [(0.0, 0.17, 140.0), (0.2, 0.19, 124.0)]:
        m = int(length * SR)
        tl = np.arange(m) / SR
        f = f0 * (1 - 0.04 * tl / length)
        s = bl_saw(phase(f, m), f0) + bl_saw(phase(f * 1.015, m, 1.0), f0)
        env = np.minimum(tl / 0.008, 1) * np.minimum((length - tl) / 0.025, 1)
        place(out, s * env, start)
    out = lp(out, 1800, order=4)
    return finalize_sfx(out, out_ms=30)


def sfx_type(variant):
    body_f, res_f, bottom_dt = [(240, 2600, 0.013), (310, 3100, 0.016), (200, 2300, 0.011)][variant]
    t = tt(0.05)
    n = len(t)
    out = np.zeros(n)
    click = bp(noise(n), 1800, 7000) * np.exp(-t / 0.0015)
    body = np.sin(2 * np.pi * body_f * t) * np.exp(-t / 0.012) * 0.35
    res = np.sin(2 * np.pi * res_f * t) * np.exp(-t / 0.006) * 0.25
    out += click + body + res
    m = n - int(bottom_dt * SR)
    tb = np.arange(m) / SR
    bottom = bp(noise(m), 1200, 5000) * np.exp(-tb / 0.001) * 0.5 \
        + np.sin(2 * np.pi * body_f * 0.8 * tb) * np.exp(-tb / 0.008) * 0.2
    place(out, bottom, bottom_dt)
    return finalize_sfx(out, out_ms=8, in_ms=0.3)


def sfx_tick():
    t = tt(0.08)
    n = len(t)
    y = np.sin(2 * np.pi * 1900 * t) * np.exp(-t / 0.012) \
        + 0.3 * np.sin(2 * np.pi * 3800 * t) * np.exp(-t / 0.006) \
        + 0.3 * hp(noise(n), 3000) * np.exp(-t / 0.001)
    return finalize_sfx(y, out_ms=15, in_ms=0.3)


def sfx_swipe():
    t = tt(0.3)
    n = len(t)
    u = t / 0.3
    env = (u ** 0.5) * (1 - u) ** 1.6
    env /= env.max()
    fc = 1200 * (3500 / 1200) ** np.clip(u * 1.5, 0, 1)
    paper = svf(noise(n), fc, q=0.9, mode="bp")
    grit = lp(np.abs(noise(n)), 80)
    grit = 0.6 + 0.4 * grit / grit.max()
    low = bp(noise(n), 300, 1200) * 0.4
    y = (paper * grit + low) * env
    return finalize_sfx(lp(y, 9000), out_ms=40, in_ms=3)


def sfx_glasses():
    t = tt(0.35)
    n = len(t)
    out = np.zeros(n)
    m = int(0.13 * SR)
    tl = np.arange(m) / SR
    shh = bp(noise(m), 2500, 7000) * np.sin(np.pi * tl / 0.13) ** 0.8
    place(out, shh, 0.0)
    k = int(0.012 * SR)
    tk = np.arange(k) / SR
    place(out, bp(noise(k), 1500, 6000) * np.exp(-tk / 0.0015) * 0.8, 0.125)
    g = int(0.2 * SR)
    tg = np.arange(g) / SR
    shimmer = 1 + 0.3 * np.sin(2 * np.pi * 30 * tg)
    glint = (0.35 * np.sin(2 * np.pi * 3136 * tg) * np.exp(-tg / 0.06)
             + 0.2 * np.sin(2 * np.pi * 4699 * tg) * np.exp(-tg / 0.04)) * shimmer * np.minimum(tg / 0.002, 1)
    place(out, glint, 0.14)
    return finalize_sfx(out, out_ms=40, in_ms=3)


def sfx_sparkle():
    t = tt(0.6)
    n = len(t)
    out = np.zeros(n)
    scale = [mtof(m) for m in (96, 98, 100, 103, 105, 108)]  # C7 D7 E7 G7 A7 C8
    for i in range(11):
        idx = min(len(scale) - 1, int(i * len(scale) / 11 + rng.integers(0, 2)))
        start = i * 0.042 + rng.uniform(0, 0.012)
        m = n - int(start * SR)
        tl = np.arange(m) / SR
        tone = bell(scale[idx], tl, [1, 2.76], [1, 0.2], [rng.uniform(0.08, 0.15), 0.03], attack=0.001)
        place(out, tone, start, 1.0 - 0.05 * i)
    out += hp(noise(n), 6000) * np.sin(np.pi * t / 0.6) ** 2 * 0.05
    return finalize_sfx(lp(out, 12000), out_ms=80)


def sfx_snore():
    t = tt(1.2)
    n = len(t)
    out = np.zeros(n)
    # inhale growl: low flutter (soft palate) at ~28 Hz with jitter
    m = int(0.72 * SR)
    tl = np.arange(m) / SR
    f = 28 + 4 * np.sin(2 * np.pi * 1.3 * tl) + 1.5 * lp(noise(m), 10) / 0.05 * 0.01
    src = 0.65 * bl_saw(phase(f, m), 32, cap=40) + 0.35 * lp(noise(m), 800)
    growl = bp(src, 180, 750) + 0.4 * bp(src, 900, 1300)
    env = np.sin(np.pi * tl / 0.72) ** 1.2 * (0.6 + 0.4 * tl / 0.72)
    place(out, growl * env, 0.0)
    # exhale whistle "pshew"
    w = int(0.45 * SR)
    tw = np.arange(w) / SR
    fw = (1100 + 450 * np.sin(np.pi * tw / 0.45)) * (1 + 0.02 * np.sin(2 * np.pi * 6 * tw))
    wenv = np.sin(np.pi * tw / 0.45) ** 1.5
    whistle = np.sin(phase(fw, w)) * 0.4 * wenv
    breath = bp(noise(w), 1000, 3000) * 0.15 * wenv
    place(out, whistle + breath, 0.75)
    return finalize_sfx(out, out_ms=80, in_ms=10)


def sfx_stamp():
    t = tt(0.3)
    n = len(t)
    f = 40 + 110 * np.exp(-t / 0.02)
    y = np.sin(phase(f, n)) * ad(t, 0.001, 0.11)
    y += lp(noise(n), 1200) * np.exp(-t / 0.035) * 0.7
    y += bp(noise(n), 1000, 6000) * np.exp(-t / 0.004) * 0.5
    y += lp(noise(n), 600) * np.exp(-t / 0.08) * 0.1
    y = np.tanh(1.8 * y / np.max(np.abs(y))) / np.tanh(1.8)
    return finalize_sfx(y, out_ms=50, in_ms=0.5)


def sfx_riser():
    t = tt(1.5)
    n = len(t)
    u = t / 1.5
    fc = 250 * (7000 / 250) ** (u ** 1.3)
    nz = svf(noise(n), fc, q=2.0, mode="bp")
    f = 110 * 2 ** (2.5 * u ** 1.5)
    ph = phase(f, n)
    tone = bl_saw(ph, f.max(), cap=12) + bl_saw(phase(f * 1.007, n, 2.0), f.max(), cap=12)
    tone = svf(tone, 400 + 5000 * u ** 2, q=0.8, mode="lp")
    rate = 4 + 16 * u ** 2
    trem = 1 - 0.3 * (0.5 + 0.5 * np.sin(2 * np.pi * np.cumsum(rate) / SR))
    y = (0.7 * nz / np.std(nz) + 0.4 * tone / np.std(tone)) * (0.08 + 0.92 * u ** 2) * trem
    return finalize_sfx(lp(y, 10000), out_ms=15, in_ms=20)


def sfx_glitch():
    d = 0.4
    t = tt(d)
    n = len(t)
    sources = [np.tanh(4 * np.sin(phase(660, n))),
               lp(noise(n), 7000) * 0.6,
               np.sin(phase(2000 * (300 / 2000) ** (t / d), n))]
    out = np.zeros(n)
    pos = 0
    edge = 13
    while pos < n - int(0.03 * SR):
        chunk = int(rng.choice([0.012, 0.02, 0.03, 0.045]) * SR)
        grain_len = int(rng.choice([0.004, 0.006, 0.008, 0.012]) * SR)
        src = sources[rng.integers(len(sources))]
        st = rng.integers(0, n - grain_len)
        grain = src[st:st + grain_len].copy()
        grain[:edge] *= np.linspace(0, 1, edge)
        grain[-edge:] *= np.linspace(1, 0, edge)
        seg = np.tile(grain, int(np.ceil(chunk / grain_len)))[:chunk]
        bits = int(rng.integers(3, 7))
        q = 2 ** (bits - 1)
        seg = np.round(seg * q) / q
        hold = int(rng.integers(1, 6))
        seg = np.repeat(seg[::hold], hold)[:chunk]
        place(out, seg * rng.uniform(0.5, 1.0), pos / SR)
        pos += chunk + int(rng.choice([0, 0, 0.008, 0.015]) * SR)
    return finalize_sfx(lp(out, 8000), out_ms=20, in_ms=0.5)


def sfx_blink():
    t = tt(0.12)
    f = 1400 + 900 * (1 - np.exp(-t / 0.015))
    y = np.sin(phase(f, len(t))) * ad(t, 0.003, 0.03)
    return finalize_sfx(y, out_ms=30)


# ----------------------------------------------------------------------------
# Music bed
# ----------------------------------------------------------------------------
# Tempo chosen so the requested section boundaries land exactly on bar lines:
#   bar = 2.45 s  ->  7.0 + 40 bars = 105.0 s,  + 8 bars = 124.6 s
BEAT = (97.98 - 6.6) / 40 / 4   # 2026-10-08 ElevenLabs sesi: 40 bar = 6.6 -> 97.98 sn (~105 BPM)
BPM = 60.0 / BEAT        # 97.959...
BAR = 4 * BEAT           # 2.45 s
TOTAL = 130.0
T0 = 6.6                 # cold open: silence before this
FADE_IN = 0.5
SWING = 0.08             # offbeat 8ths land at 0.58 of a beat (~58% swing)
GROOVE_BARS = 40         # bars 0-39   : 7.0  - 105.0
BREAK_START_BAR, BREAK_END_BAR = 40, 48     # bars 40-47 : 105.0 - 124.6
OUTRO_BARS = [48, 49, 50]                   # drums back gently : 124.6 - 131.95
FINAL_BAR = 51                              # final chord at 131.95
FADE_OUT_START, SILENT_FROM = 124.4, 125.9
LIFT_TIME_BEATS = 34 * 4 + 2                # bar 34 beat 3 -> 91.525 s (closest half-bar to ~91.8)

# (bass midi, keys voicing)  -- A minor-ish, cheeky E9 turnaround
AM9 = (33, [57, 60, 64, 67, 71])
D9 = (38, [54, 60, 64, 69])
FMAJ9 = (29, [57, 60, 64, 67])
E9 = (28, [56, 62, 66, 71])
PROG = [AM9, D9, FMAJ9, E9]
# breakdown: softer, more open and a bit wistful
BREAK_PROG = [FMAJ9, (28, [55, 59, 62, 66]), (38, [53, 57, 60, 64]), (33, [55, 60, 64, 71]),   # Fmaj9 Em9 Dm9 Am9
              FMAJ9, (28, [55, 59, 62, 66]), (38, [53, 57, 60, 64]), E9]
# breakdown melody: (bar offset, beat, midi, beats)
BREAK_MELODY = [(0, 0, 76, 2.5), (0, 2.5, 72, 1.5), (1, 0, 71, 4), (2, 0, 69, 2), (2, 2, 72, 2),
                (3, 0, 71, 2.5), (3, 2.5, 67, 1.5), (4, 0, 76, 2), (4, 2, 79, 2), (5, 0, 78, 1.5),
                (5, 1.5, 71, 2.5), (6, 0, 69, 2), (6, 2, 76, 2), (7, 0, 68, 2), (7, 2, 71, 2)]
MOTIFS = [[(2.0, 76), (0.5 * 5 + SWING, 79), (0.5 * 5 + SWING + 0.25, 80), (3.0, 83), (0.5 * 7 + SWING, 76)],
          [(2.0, 83), (0.5 * 5 + SWING, 81), (3.0, 80), (0.5 * 7 + SWING, 76)]]


def swung(eighth_idx):
    return eighth_idx * 0.5 + (SWING if eighth_idx % 2 else 0.0)


def rhodes(freq, dur, vel, tau_scale=1.0):
    rel = 0.25
    n = int((dur + rel) * SR)
    t = np.arange(n) / SR
    tau = 1.8 * (220 / freq) ** 0.3 * tau_scale
    env = np.minimum(t / 0.004, 1) * np.exp(-t / tau)
    env *= np.where(t > dur, np.exp(-(t - dur) / 0.045), 1.0)
    p = rng.uniform(0, 2 * np.pi, 4)
    y = np.sin(2 * np.pi * freq * t + p[0])
    y += 0.28 * vel * np.sin(2 * np.pi * 2 * freq * t + p[1]) * np.exp(-t / 0.4)
    y += 0.08 * vel * np.sin(2 * np.pi * 3 * freq * t + p[2]) * np.exp(-t / 0.25)
    if 7 * freq < 5000:
        y += 0.04 * vel * np.sin(2 * np.pi * 7 * freq * t + p[3]) * np.exp(-t / 0.02)
    y *= env * vel
    y[-int(0.01 * SR):] *= np.linspace(1, 0, int(0.01 * SR))
    return y


def sub_bass(freq, dur, vel):
    rel = 0.15
    n = int((dur + rel) * SR)
    t = np.arange(n) / SR
    ph = 2 * np.pi * freq * t
    y = np.sin(ph) + 0.22 * np.sin(2 * ph) + 0.05 * np.sin(3 * ph)
    env = np.minimum(t / 0.008, 1) * np.exp(-t / 2.5)
    env *= np.where(t > dur, np.exp(-(t - dur) / 0.03), 1.0)
    y *= env * vel
    y[-int(0.01 * SR):] *= np.linspace(1, 0, int(0.01 * SR))
    return y


def kick():
    t = tt(0.35)
    n = len(t)
    f = 46 + 90 * np.exp(-t / 0.035)
    y = np.sin(phase(f, n)) * ad(t, 0.001, 0.18)
    y += lp(noise(n), 2000) * np.exp(-t / 0.003) * 0.15
    return fades(y, 0.3, 30)


def brush_snare():
    t = tt(0.3)
    n = len(t)
    y = bp(noise(n), 600, 3500) * ad(t, 0.006, 0.09)
    y += np.sin(2 * np.pi * 185 * t) * np.exp(-t / 0.05) * 0.3
    return fades(lp(y, 4500), 1, 40)


def hat(open_=False):
    t = tt(0.3 if open_ else 0.06)
    n = len(t)
    y = bp(noise(n), 6500, 11000) * np.exp(-t / (0.12 if open_ else 0.018))
    return fades(y, 0.3, 10)


def pluck(freq, dur=0.35):
    t = tt(dur)
    y = np.sin(2 * np.pi * freq * t) * np.exp(-t / 0.25) \
        + 0.25 * np.sin(2 * np.pi * 4 * freq * t) * np.exp(-t / 0.05)
    return fades(y * np.minimum(t / 0.002, 1), 0.2, 30)


def peaking_sos(f0, gain_db, q):
    A = 10 ** (gain_db / 40)
    w0 = 2 * np.pi * f0 / SR
    alpha = np.sin(w0) / (2 * q)
    b = [1 + alpha * A, -2 * np.cos(w0), 1 - alpha * A]
    a = [1 + alpha / A, -2 * np.cos(w0), 1 - alpha / A]
    return signal.tf2sos(np.array(b) / a[0], np.array(a) / a[0])


def highshelf_sos(f0, gain_db, s=0.8):
    A = 10 ** (gain_db / 40)
    w0 = 2 * np.pi * f0 / SR
    alpha = np.sin(w0) / 2 * np.sqrt((A + 1 / A) * (1 / s - 1) + 2)
    cw = np.cos(w0)
    b = [A * ((A + 1) + (A - 1) * cw + 2 * np.sqrt(A) * alpha),
         -2 * A * ((A - 1) + (A + 1) * cw),
         A * ((A + 1) + (A - 1) * cw - 2 * np.sqrt(A) * alpha)]
    a = [(A + 1) - (A - 1) * cw + 2 * np.sqrt(A) * alpha,
         2 * ((A - 1) - (A + 1) * cw),
         (A + 1) - (A - 1) * cw - 2 * np.sqrt(A) * alpha]
    return signal.tf2sos(np.array(b) / a[0], np.array(a) / a[0])


def soft_bell(freq, dur):
    """Gentle sine bell for the breakdown melody."""
    n = int((dur + 0.6) * SR)
    t = np.arange(n) / SR
    y = np.sin(2 * np.pi * freq * t) + 0.12 * np.sin(2 * np.pi * 2 * freq * t) * np.exp(-t / 0.3)
    env = np.minimum(t / 0.012, 1) * np.exp(-t / 1.1)
    env *= np.where(t > dur, np.exp(-(t - dur) / 0.15), 1.0)
    return fades(y * env, 0.5, 40)


def make_bed():
    N = int(round(TOTAL * SR))
    keys = np.zeros(N)
    keys_bd = np.zeros(N)
    bass = np.zeros(N)
    drums_l = np.zeros(N)
    drums_r = np.zeros(N)
    pl = np.zeros(N)
    mel = np.zeros(N)
    swell = np.zeros(N)

    def hum():
        return rng.normal(0, 0.004)

    def bt(bar, beat=0.0):
        return T0 + bar * BAR + beat * BEAT

    K, S = kick(), brush_snare()
    lift_t = T0 + LIFT_TIME_BEATS * BEAT
    ev = {"fills": [], "motifs": [], "lift": lift_t}

    def chord(bus, voicing, start, dur_beats, vel, tau_scale=1.0, octave_top=0.0):
        roll = 0.0
        for m in voicing:
            v = vel * rng.uniform(0.9, 1.0)
            place(bus, rhodes(mtof(m), dur_beats * BEAT, v, tau_scale), start + roll + hum())
            roll += rng.uniform(0.006, 0.012)
        if octave_top:
            place(bus, rhodes(mtof(voicing[-1] + 12), dur_beats * BEAT, vel * octave_top), start + roll + hum())

    def drum_bar(bar, gain=1.0, kick_pat=None, snare=True, fill=False, sixteenths_from=None):
        if kick_pat is None:
            if bar % 2 == 0:
                kick_pat = [0, 5, 7] if (bar // 8) % 2 == 1 and bar % 4 == 2 else [0, 5]
            else:
                kick_pat = [0, 3, 5]
        for e in kick_pat:
            st = bt(bar, swung(e)) + hum() * 0.5
            place(drums_l, K, st, 0.95 * gain)
            place(drums_r, K, st, 0.95 * gain)
        if snare:
            for beat in (1.0, 3.0):
                st = bt(bar, beat) + hum()
                v = rng.uniform(0.85, 1.0) * gain
                place(drums_l, S, st, 0.45 * v)
                place(drums_r, S, st, 0.55 * v)
        if fill:
            for beat, g in [(3.25, 0.22), (swung(7), 0.33), (swung(7) + 0.21, 0.45)]:
                st = bt(bar, beat) + hum()
                place(drums_l, S, st, 0.5 * g * gain)
                place(drums_r, S, st, 0.5 * g * gain)
            ev["fills"].append(round(bt(bar, 3.25), 3))
        for e in range(8):
            if fill and e >= 6:
                continue
            opn = (e == 7 and bar % 4 == 3 and not fill)
            v = (0.8 if e % 2 == 0 else 0.5) * rng.uniform(0.85, 1.0) * gain
            st = bt(bar, swung(e)) + hum()
            h = hat(opn)
            place(drums_l, h, st, 0.62 * v)
            place(drums_r, h, st, 0.38 * v)
        if sixteenths_from is not None:      # the "lift": soft swung 16th ghost hats
            for e in range(8):
                beat = e * 0.5 + 0.25 + (SWING * 0.5 if e % 2 else 0.04)
                if beat < sixteenths_from or (fill and beat >= 3.0):
                    continue
                v = 0.28 * rng.uniform(0.8, 1.0) * gain
                st = bt(bar, beat) + hum()
                h = hat()
                place(drums_l, h, st, 0.35 * v)
                place(drums_r, h, st, 0.65 * v)

    # ---------------- groove: bars 0-39 (7.0 - 105.0 s)
    for bar in range(GROOVE_BARS):
        bass_m, voicing = PROG[bar % 4]
        lifted = bar >= 35
        b0 = bt(bar)
        chord(keys, voicing, b0, 1.3, 0.85, octave_top=0.3 if lifted else 0.0)
        chord(keys, voicing, bt(bar, swung(3)), 1.2, 0.62)
        chord(keys, voicing, bt(bar, 3.0), 0.4, 0.45)
        bpat = [(0.0, 1.4, 1.0, 0), (swung(5), 0.35, 0.7, 0), (3.0, 0.9, 0.85, 0)]
        if lifted:
            bpat[-1] = (3.0, 0.45, 0.8, 0)
            bpat.append((swung(7), 0.3, 0.55, 12))
        for beat, dur, vel, oc in bpat:
            place(bass, sub_bass(mtof(bass_m + oc), dur * BEAT, vel), bt(bar, beat) + hum() * 0.5)
        drum_bar(bar, fill=(bar % 8 == 7),
                 sixteenths_from=(2.0 if bar == 34 else (0.0 if lifted else None)))
        if bar % 8 == 7:
            for beat, m in MOTIFS[(bar // 8) % 2]:
                place(pl, pluck(mtof(m)), bt(bar, beat) + hum() * 0.5)
            ev["motifs"].append(round(bt(bar, 2.0), 3))

    # soft swell leading into the lift (bar 34, beats 1-2)
    m = int(2 * BEAT * SR)
    u = np.arange(m) / m
    sw = svf(noise(m), 400 * (3000 / 400) ** u, q=1.2, mode="bp") * u ** 2
    place(swell, fades(lp(sw, 5000), 5, 15), lift_t - 2 * BEAT)

    # ---------------- breakdown: bars 40-47 (105.0 - 124.6 s), keys + sub only
    for i, bar in enumerate(range(BREAK_START_BAR, BREAK_END_BAR)):
        bass_m, voicing = BREAK_PROG[i]
        chord(keys_bd, voicing, bt(bar), 2.4, 0.6, tau_scale=1.5)
        chord(keys_bd, voicing, bt(bar, swung(5)), 1.4, 0.36, tau_scale=1.5)
        place(bass, sub_bass(mtof(bass_m), 3.8 * BEAT, 0.7), bt(bar) + hum() * 0.5)
    for off, beat, mid, dur in BREAK_MELODY:
        place(mel, soft_bell(mtof(mid), dur * BEAT), bt(BREAK_START_BAR + off, beat) + hum())

    # ---------------- outro: bars 48-50 (124.6 - 131.95 s), drums back gently
    for bar, (bass_m, voicing), g in zip(OUTRO_BARS, [AM9, D9, E9], [0.55, 0.75, 0.85]):
        chord(keys, voicing, bt(bar), 1.3, 0.78)
        chord(keys, voicing, bt(bar, swung(3)), 1.2, 0.55)
        chord(keys, voicing, bt(bar, 3.0), 0.4, 0.4)
        for beat, dur, vel in [(0.0, 1.4, 0.9), (swung(5), 0.35, 0.6), (3.0, 0.9, 0.75)]:
            place(bass, sub_bass(mtof(bass_m), dur * BEAT, vel), bt(bar, beat) + hum() * 0.5)
        if bar == OUTRO_BARS[0]:
            drum_bar(bar, gain=g, kick_pat=[0], snare=False)
        else:
            drum_bar(bar, gain=g, fill=(bar == OUTRO_BARS[-1]))
    for beat, mid in MOTIFS[0]:
        place(pl, pluck(mtof(mid)), bt(OUTRO_BARS[-1], beat) + hum() * 0.5)
    ev["motifs"].append(round(bt(OUTRO_BARS[-1], 2.0), 3))

    # ---------------- final chord at bar 51 (131.95 s), rings out, silent from 136.5 s
    fin = bt(FINAL_BAR)
    bass_m, voicing = AM9
    roll = 0.0
    for mid in voicing + [45]:
        place(keys, rhodes(mtof(mid), SILENT_FROM - fin, 0.8, tau_scale=1.4), fin + roll)
        roll += 0.02
    place(bass, sub_bass(mtof(bass_m), 3.0, 0.85), fin)
    place(drums_l, K, fin, 0.6)
    place(drums_r, K, fin, 0.6)
    ev["final"] = fin

    # ---------------- mix
    t = np.arange(N) / SR
    keys = lp(keys, 2400) + lp(keys_bd, 1600)
    # tremolo/auto-pan, a little slower during the breakdown
    in_bd = np.clip(np.minimum((t - bt(BREAK_START_BAR)) / 0.5, (bt(BREAK_END_BAR) - t) / 0.5), 0, 1)
    rate = 4.0 - 1.4 * in_bd
    trem = 0.22 * np.sin(2 * np.pi * np.cumsum(rate) / SR)
    keys_l = keys * (1 + trem) / 1.22
    keys_r = keys * (1 - trem) / 1.22
    pl = lp(pl, 3000)
    mel = lp(mel, 2500)
    swell = lp(swell, 4000)

    L = 0.50 * keys_l + 0.55 * bass + 0.55 * drums_l + 0.15 * pl * 0.8 + 0.16 * mel * 0.85 + 0.10 * swell
    R = 0.50 * keys_r + 0.55 * bass + 0.55 * drums_r + 0.15 * pl * 1.2 + 0.16 * mel * 1.15 + 0.10 * swell

    # master: HP 30 Hz, speech-range dip around 2.5 kHz, soften highs
    eq = np.vstack([signal.butter(2, 30, "highpass", fs=SR, output="sos"),
                    peaking_sos(2500, -4.0, 0.8),
                    highshelf_sos(7000, -5.0),
                    signal.butter(2, 12000, "lowpass", fs=SR, output="sos")])
    L = signal.sosfilt(eq, L)
    R = signal.sosfilt(eq, R)

    # silence before T0, 0.5 s fade-in, fade-out 134.5 -> 136.5, hard silence after
    i0 = int(round(T0 * SR))
    fi = int(FADE_IN * SR)
    f0 = int(round(FADE_OUT_START * SR))
    f1 = int(round(SILENT_FROM * SR))
    for ch in (L, R):
        ch[:i0] = 0.0
        ch[i0:i0 + fi] *= cos_fade(fi)
        ch[f0:f1] *= cos_fade(f1 - f0)[::-1]
        ch[f1:] = 0.0

    st = np.stack([L, R], axis=1)
    st *= 10 ** (-6 / 20) / np.max(np.abs(st))
    return st, ev


# ----------------------------------------------------------------------------
# verification
# ----------------------------------------------------------------------------
def read_wav(path):
    with wave.open(path, "rb") as w:
        ch, sw, sr, n = w.getnchannels(), w.getsampwidth(), w.getframerate(), w.getnframes()
        x = np.frombuffer(w.readframes(n), dtype="<i2").astype(float) / 32768
    if ch > 1:
        x = x.reshape(-1, ch)
    return x, sr, ch, sw


def band_fraction(x, lo, hi):
    mono = x if x.ndim == 1 else x.mean(axis=1)
    spec = np.abs(np.fft.rfft(mono)) ** 2
    freqs = np.fft.rfftfreq(len(mono), 1 / SR)
    return spec[(freqs >= lo) & (freqs < hi)].sum() / spec.sum()


def centroid(x):
    mono = x if x.ndim == 1 else x.mean(axis=1)
    spec = np.abs(np.fft.rfft(mono))
    freqs = np.fft.rfftfreq(len(mono), 1 / SR)
    return (spec * freqs).sum() / spec.sum()


def find_ffmpeg():
    p = shutil.which("ffmpeg")
    if p:
        return p
    cand = os.path.expandvars(r"%LOCALAPPDATA%\Microsoft\WinGet\Links\ffmpeg.exe")
    return cand if os.path.exists(cand) else None


def main():
    os.makedirs(SFX_DIR, exist_ok=True)
    os.makedirs(MUSIC_DIR, exist_ok=True)

    sfx = {
        "pop": lambda: sfx_pop(1.0),
        "pop2": lambda: sfx_pop(1.35),
        "whoosh": lambda: sfx_whoosh(0.45, 0.45),
        "whoosh_short": lambda: sfx_whoosh(0.25, 0.4),
        "boing": sfx_boing,
        "thud": sfx_thud,
        "jump": sfx_jump,
        "steam": sfx_steam,
        "ding": sfx_ding,
        "buzz": sfx_buzz,
        "type1": lambda: sfx_type(0),
        "type2": lambda: sfx_type(1),
        "type3": lambda: sfx_type(2),
        "tick": sfx_tick,
        "swipe": sfx_swipe,
        "glasses": sfx_glasses,
        "sparkle": sfx_sparkle,
        "snore": sfx_snore,
        "stamp": sfx_stamp,
        "riser": sfx_riser,
        "glitch": sfx_glitch,
        "blink": sfx_blink,
    }
    paths = []
    for name, fn in sfx.items():
        p = os.path.join(SFX_DIR, name + ".wav")
        write_wav(p, fn())
        paths.append(p)

    bed, ev = make_bed()
    bed_wav = os.path.join(MUSIC_DIR, "bed.wav")
    write_wav(bed_wav, bed)
    paths.append(bed_wav)

    def bt(bar, beat=0.0):
        return T0 + bar * BAR + beat * BEAT

    with open(os.path.join(MUSIC_DIR, "bed_breakdown_times.txt"), "w", encoding="utf-8") as f:
        f.write("Dakay music bed - section boundaries (seconds from file start)\n")
        f.write(f"BPM: {BPM:.3f}   (beat = {BEAT:.4f} s, bar = {BAR:.4f} s, 4/4, swung 8ths)\n")
        f.write("  tempo picked so 7.0 / 105.0 / 124.6 all fall exactly on bar lines\n")
        f.write(f"total_seconds: {TOTAL:.3f}\n\n")
        f.write(f"cold_open_silence: 0.000 - {T0:.3f}\n")
        f.write(f"music_start: {T0:.3f}   (fade-in {FADE_IN:.1f} s, full groove from the first bar)\n")
        f.write(f"groove: {T0:.3f} - {bt(GROOVE_BARS):.3f}   (bars 1-{GROOVE_BARS})\n")
        f.write(f"lift_swell_start: {ev['lift'] - 2 * BEAT:.3f}\n")
        f.write(f"lift: {ev['lift']:.3f}   (16th ghost hats, octave-doubled keys top, bass octave pops; until breakdown)\n")
        f.write("fills (drum fill start, last bar of each 8-bar phrase): "
                + ", ".join(f"{x:.3f}" for x in ev["fills"]) + "\n")
        f.write("pluck_motif_starts: " + ", ".join(f"{x:.3f}" for x in ev["motifs"]) + "\n")
        f.write(f"breakdown_start: {bt(BREAK_START_BAR):.3f}   (drums out; soft keys + sub + quiet bell melody)\n")
        f.write(f"breakdown_end: {bt(BREAK_END_BAR):.3f}   (= outro start, drums back gently)\n")
        f.write(f"outro: {bt(BREAK_END_BAR):.3f} - {ev['final']:.3f}\n")
        f.write(f"final_chord: {ev['final']:.3f}   (Am9 rings out)\n")
        f.write(f"fade_out: {FADE_OUT_START:.3f} - {SILENT_FROM:.3f}\n")
        f.write(f"silent_from: {SILENT_FROM:.3f} - {TOTAL:.3f}   (digital silence)\n\n")
        f.write("groove chord loop (1 bar each): Am9 | D9 | Fmaj9 | E9\n")
        f.write("breakdown chords: Fmaj9 | Em9 | Dm9 | Am9 | Fmaj9 | Em9 | Dm9 | E9\n")
        f.write("outro chords: Am9 | D9 | E9 | (final) Am9\n")
        f.write("bar_downbeats: " + ", ".join(f"{bt(b):.3f}" for b in range(FINAL_BAR + 1)) + "\n")

    ff = find_ffmpeg()
    mp3 = os.path.join(MUSIC_DIR, "bed.mp3")
    if ff:
        subprocess.run([ff, "-y", "-loglevel", "error", "-i", bed_wav,
                        "-codec:a", "libmp3lame", "-b:a", "192k", mp3], check=True)
    else:
        print("WARNING: ffmpeg not found, bed.mp3 not written")

    # ---- verification
    print(f"{'file':<20}{'ch':>3}{'dur(s)':>9}{'peak dBFS':>11}{'DC':>10}{'edge':>8}{'centroid':>10}")
    ok = True
    for p in paths:
        x, sr, ch, sw = read_wav(p)
        peak = np.max(np.abs(x))
        dc = np.abs(x.mean(axis=0)).max()
        edge = max(np.abs(x[0]).max(), np.abs(x[-1]).max())
        clipped = np.sum(np.abs(x) >= 32767 / 32768)
        bad = (not np.all(np.isfinite(x))) or clipped > 0 or sr != SR or sw != 2 or dc > 1e-3
        ok &= not bad
        print(f"{os.path.basename(p):<20}{ch:>3}{len(x) / sr:>9.3f}{20 * np.log10(peak):>11.2f}"
              f"{dc:>10.1e}{edge:>8.4f}{centroid(x):>9.0f}Hz{'  <-- CHECK' if bad else ''}")

    x, _, _, _ = read_wav(bed_wav)
    print("\nbed spectral energy share: <200 Hz {:.1%}, 1-4 kHz {:.1%}, >6 kHz {:.2%}".format(
        band_fraction(x, 0, 200), band_fraction(x, 1000, 4000), band_fraction(x, 6000, SR / 2)))

    def rms_db(a, b):
        seg = x[int(a * SR):int(b * SR)]
        return 20 * np.log10(np.sqrt(np.mean(seg ** 2)) + 1e-12)

    def hf_share(a, b):
        return band_fraction(x[int(a * SR):int(b * SR)], 5000, SR / 2)

    for label, a, b in [("groove", 8, 90), ("lift", ev["lift"], bt(GROOVE_BARS)),
                        ("breakdown", bt(BREAK_START_BAR) + 0.5, bt(BREAK_END_BAR) - 0.2),
                        ("outro", bt(BREAK_END_BAR), ev["final"]), ("final", ev["final"], SILENT_FROM)]:
        print(f"  {label:<10} {a:6.2f}-{b:6.2f}s  RMS {rms_db(a, b):6.1f} dBFS   >5kHz share {hf_share(a, b):.3%}")

    pre = np.max(np.abs(x[:int(T0 * SR)]))
    post = np.max(np.abs(x[int(SILENT_FROM * SR):]))
    first = np.argmax(np.abs(x).max(axis=1) > 0) / SR
    last = (len(x) - np.argmax(np.abs(x[::-1]).max(axis=1) > 0)) / SR
    print(f"  silence 0-{T0}: max {pre:.6f}   silence {SILENT_FROM}-{TOTAL}: max {post:.6f}"
          f"   first sound {first:.3f}s, last sound {last:.3f}s")
    ok &= pre == 0 and post == 0

    if ff and os.path.exists(mp3):
        probe = shutil.which("ffprobe") or os.path.join(os.path.dirname(ff), "ffprobe.exe")
        try:
            out = subprocess.run([probe, "-v", "error", "-show_entries", "format=duration,bit_rate",
                                  "-of", "default=nw=1", mp3], capture_output=True, text=True).stdout
            print("\nbed.mp3:", out.strip().replace("\n", "  "), f" size={os.path.getsize(mp3) / 1e6:.2f} MB")
        except OSError:
            print("\nbed.mp3 written, size", os.path.getsize(mp3))

    print("\nALL CHECKS OK" if ok else "\nSOME CHECKS FAILED")


if __name__ == "__main__":
    main()
