// Motor: her kare yalnızca zamanın fonksiyonu. HyperFrames timeline'ı seek edince
// driver setter'ı render(t)'yi çağırır; hiçbir yerde performance.now / random yok.
(function () {
  const { EX, P } = window.DK_DATA;
  const TL = window.TIMELINE;
  const f = n => Math.round(n * 100) / 100;
  const lerp = (a, b, t) => a + (b - a) * t;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const EASE = {
    linear: t => t,
    inOut: t => t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2,
    out: t => 1 - Math.pow(1 - t, 3),
    in: t => t * t * t,
    back: t => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); },
    bigback: t => { const c1 = 3.2, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); },
    elastic: t => t === 0 || t === 1 ? t : Math.pow(2, -10 * t) * Math.sin((t * 10 - .75) * (2 * Math.PI / 3)) + 1
  };

  // ---------- izler (tracks) ----------
  const TR = {};       // "obj.prop" -> [{t0,t1,to,ease,from}]
  const BASE = {};     // "obj.prop" -> varsayılan değer
  let seq = 0;
  function K(obj, t0, props, dur = .3, ease = 'inOut') {
    for (const k in props) {
      const key = obj + '.' + k;
      (TR[key] = TR[key] || []).push({ t0, t1: t0 + Math.max(0, dur), to: props[k], ease: EASE[ease] || EASE.inOut, n: seq++ });
    }
  }
  function valueAt(key, t, upto) {
    const segs = TR[key];
    let v = BASE[key];
    if (!segs) return v;
    let s = null;
    const lim = upto === undefined ? segs.length : upto;
    for (let i = 0; i < lim; i++) { if (segs[i].t0 <= t) s = segs[i]; else break; }
    if (!s) return v;
    if (t >= s.t1) return s.to;
    const p = s.ease((t - s.t0) / (s.t1 - s.t0));
    if (Array.isArray(s.to)) return s.to.map((b, i) => lerp(s.from[i], b, p));
    return lerp(s.from, s.to, p);
  }
  function finalize() {
    for (const key in TR) {
      const segs = TR[key].sort((a, b) => a.t0 - b.t0 || a.n - b.n);
      segs.forEach((s, i) => {
        let fr = valueAt(key, s.t0, i);
        if (fr === undefined) fr = Array.isArray(s.to) ? s.to.slice() : (typeof s.to === 'number' ? 0 : s.to);
        s.from = Array.isArray(fr) ? fr.slice() : fr;
      });
    }
  }
  function def(obj, defaults) {
    for (const k in defaults) BASE[obj + '.' + k] = Array.isArray(defaults[k]) ? defaults[k].slice() : defaults[k];
  }
  const keysOf = obj => Object.keys(TR).filter(k => k.startsWith(obj + '.')).map(k => k.slice(obj.length + 1));
  function state(obj, defaults, t) {
    const out = {};
    for (const k in defaults) {
      const key = obj + '.' + k;
      if (!(key in BASE)) BASE[key] = defaults[k];
      out[k] = valueAt(key, t);
    }
    return out;
  }

  // ---------- Dakay rig ----------
  const LN_L=[63,68,107,68,105,88,104,95,99,98,93,98,75,98,68,98,65,94,64,88], LF_L=[64,51,107,51,105.5,61,105,65,101,67,96,67,75,67,69,67,66,65,65.5,61];
  const LN_R=[157,68,113,68,115,88,116,95,121,98,127,98,145,98,152,98,155,94,156,88], LF_R=[156,51,113,51,114.5,61,115,65,119,67,124,67,145,67,151,67,154,65,154.5,61];
  const BR_N=[105,69,115,69,115,76,105,76], BR_F=[105,52,115,52,115,56,105,56];
  const GL_N=[70,77,71,73.5,78,73.5,120,77,121,73.5,128,73.5], GL_F=[71,57.5,72,55,78,55,121,57.5,122,55,128,55];
  const mix = (A, B, t) => A.map((a, k) => lerp(a, B[k], t));
  const lensD = a => `M${f(a[0])},${f(a[1])} L${f(a[2])},${f(a[3])} L${f(a[4])},${f(a[5])} C${f(a[6])},${f(a[7])} ${f(a[8])},${f(a[9])} ${f(a[10])},${f(a[11])} L${f(a[12])},${f(a[13])} C${f(a[14])},${f(a[15])} ${f(a[16])},${f(a[17])} ${f(a[18])},${f(a[19])} Z`;
  const bridgeD = a => `M${f(a[0])},${f(a[1])} L${f(a[2])},${f(a[3])} L${f(a[4])},${f(a[5])} L${f(a[6])},${f(a[7])} Z`;
  const glintD = a => `M${f(a[0])},${f(a[1])} Q${f(a[2])},${f(a[3])} ${f(a[4])},${f(a[5])} M${f(a[6])},${f(a[7])} Q${f(a[8])},${f(a[9])} ${f(a[10])},${f(a[11])}`;
  const qD = a => `M${f(a[0])},${f(a[1])} Q${f(a[2])},${f(a[3])} ${f(a[4])},${f(a[5])}`;
  const armD = a => `M${f(a[0])},${f(a[1])} C${f(a[2])},${f(a[3])} ${f(a[4])},${f(a[5])} ${f(a[6])},${f(a[7])}`;
  const handT = (a, flip) => `translate(${f(a[6])} ${f(a[7])}) rotate(${f(a[8])}) scale(${flip} 1)`;
  const HAND = 'M-5,-4 C-7,4 -7,13 -3,17 C0,20 4,18 5,14 L5,10 C7,12 10,12 10,9 C10,5 7,2 5,-2 Z';
  const LEG = 'M0,0 L0,41 L-2,46 C-3,49 -2,51 1,51 L10,51 C18,51 22,50 21,47 C20,43 16,41 9,41 L9,0 Z';
  const BODY = 'M110,40 C150,40 172,110 178,160 C184,205 160,232 110,232 C60,232 36,205 42,160 C48,110 70,40 110,40 Z';

  const RIG_DEFAULTS = Object.assign({}, JSON.parse(JSON.stringify(EX.def)), {
    rx: 0, ry: 0, rr: 0, sq: 1, look: 0, lookX: 0, gu: 0, gc: 0, eo: 0, lid: 83, pupil: 1.2,
    aL: P.sideL.slice(), aR: P.sideR.slice(), swing: 0, br: 1, shake: 0, tap: 0, lips: 1, nod: 0, nay: 0,
    px: 960, py: 905, sc: 1, o: 0, glare: 0
  });

  function rigMarkup(pre) {
    return `<svg class="rig-svg" viewBox="-40 0 300 320" width="600" height="640" overflow="visible">
  <defs>
    <radialGradient id="${pre}gB" cx="0.42" cy="0.26" r="0.82"><stop offset="0" stop-color="#62656E"/><stop offset=".5" stop-color="#4C4F56"/><stop offset="1" stop-color="#3B3E45"/></radialGradient>
    <clipPath id="${pre}cE"><circle cx="89" cy="84" r="12.5"/><circle cx="131" cy="84" r="12.5"/></clipPath>
  </defs>
  <g data-r="rig">
    <ellipse data-r="shadow" cx="110" cy="279" rx="56" ry="7" fill="#000" opacity=".2"/>
    <g data-r="legL"><path d="${LEG}" transform="translate(96,226) scale(-1,1)" fill="#474A51" stroke="#0B0B0D" stroke-width="2.4" stroke-linejoin="round"/></g>
    <g data-r="legR"><path d="${LEG}" transform="translate(124,226)" fill="#474A51" stroke="#0B0B0D" stroke-width="2.4" stroke-linejoin="round"/></g>
    <g data-r="torso">
      <path d="${BODY}" fill="url(#${pre}gB)" stroke="#0B0B0D" stroke-width="3.2"/>
      <path d="M80,68 C85,55 96,48 108,46" fill="none" stroke="rgba(255,255,255,.09)" stroke-width="5" stroke-linecap="round"/>
      <g data-r="face">
        <path data-r="browL" fill="none" stroke="#0B0B0D" stroke-width="2.6" stroke-linecap="round"/>
        <path data-r="browR" fill="none" stroke="#0B0B0D" stroke-width="2.6" stroke-linecap="round"/>
        <path data-r="fur" d="M108.5,56 L109.5,62 M111.5,56 L110.5,62" fill="none" stroke="#2C2E34" stroke-width="1.2" stroke-linecap="round"/>
        <g data-r="eyes" opacity="0"></g>
        <path data-r="mouth" fill="none" stroke="#0B0B0D" stroke-width="2.4" stroke-linecap="round"/>
        <ellipse data-r="talk" cx="110" cy="108" rx="5" ry="2" fill="#2C2E34" stroke="#0B0B0D" stroke-width="2" opacity="0"/>
        <ellipse data-r="mouthO" cx="110" cy="109" rx="3.6" ry="4.6" fill="#2C2E34" stroke="#0B0B0D" stroke-width="2" opacity="0"/>
        <path data-r="dimple" d="M121.5,100.5 Q124.5,102 124,105" fill="none" stroke="#2C2E34" stroke-width="1.3" stroke-linecap="round" opacity="0"/>
        <path data-r="chin" d="M105,112.5 Q110,114 115,112.5" fill="none" stroke="#2C2E34" stroke-width="1.3" stroke-linecap="round"/>
        <g data-r="glasses">
          <ellipse data-r="lsL" cx="85" cy="101" rx="19" ry="3.5" fill="#000" opacity=".16"/>
          <ellipse data-r="lsR" cx="135" cy="101" rx="19" ry="3.5" fill="#000" opacity=".16"/>
          <g fill="#070708" stroke="#0B0B0D" stroke-width="2" stroke-linejoin="round"><path data-r="lensL"/><path data-r="lensR"/><path data-r="bridge"/></g>
          <path data-r="glint" fill="none" stroke="#62656E" stroke-width="2.2" stroke-linecap="round"/>
          <path data-r="glare" d="M66,72 L80,72 L70,94 L60,94 Z M116,72 L130,72 L120,94 L110,94 Z" fill="#F1ECD6" opacity="0"/>
        </g>
      </g>
      <g data-r="armL"><path fill="none" stroke="#0B0B0D" stroke-width="10.5" stroke-linecap="round"/><path d="${HAND}" fill="#474A51" stroke="#0B0B0D" stroke-width="2.4" stroke-linejoin="round"/><path fill="none" stroke="#474A51" stroke-width="5.8" stroke-linecap="round"/></g>
      <g data-r="armR"><path fill="none" stroke="#0B0B0D" stroke-width="10.5" stroke-linecap="round"/><path d="${HAND}" fill="#474A51" stroke="#0B0B0D" stroke-width="2.4" stroke-linejoin="round"/><path fill="none" stroke="#474A51" stroke-width="5.8" stroke-linecap="round"/></g>
    </g>
    <g data-r="fx"></g>
  </g>
</svg>`;
  }

  function eyeSVG(cx, look, lid) {
    const Rr = 12.5, EY = 84, dy = EY - lid, hw = Math.sqrt(Math.max(0, Rr * Rr - dy * dy)), a = f(cx - hw), b = f(cx + hw), px = cx + look;
    const big = lid < EY ? 1 : 0;
    return `<ellipse cx="${cx}" cy="${EY + 4}" rx="15.5" ry="14" fill="#000" opacity=".16"/>`
      + `<circle cx="${cx}" cy="${EY}" r="${Rr}" fill="#52555C"/>`
      + (hw > .3 ? `<path d="M${a},${f(lid)} A${Rr},${Rr} 0 ${big} 0 ${b},${f(lid)} Z" fill="#F3F1EA"/>` : '')
      + `<circle cx="${f(px)}" cy="${f(lid + 3)}" r="5.4" fill="#070708"/><circle cx="${f(px - 1.8)}" cy="${f(lid + 2)}" r="1.25" fill="#fff"/>`
      + (hw > .3 ? `<path d="M${a},${f(lid)} A${Rr},${Rr} 0 ${1 - big} 1 ${b},${f(lid)} Z" fill="#52555C"/>` : '')
      + `<path d="M${f(cx - hw - .6)},${f(lid)} L${f(cx + hw + .6)},${f(lid)}" stroke="#0B0B0D" stroke-width="2.4" stroke-linecap="round"/>`;
  }
  function eyesSVG(pre, lid, look) {
    return `<g clip-path="url(#${pre}cE)">${eyeSVG(89, look, lid)}${eyeSVG(131, -look, lid)}</g>`
      + `<circle cx="89" cy="84" r="12.5" fill="none" stroke="#0B0B0D" stroke-width="2"/><circle cx="131" cy="84" r="12.5" fill="none" stroke="#0B0B0D" stroke-width="2"/>`
      + `<path d="M82,99.5 Q89,102 96,99.5 M124,99.5 Q131,102 138,99.5" fill="none" stroke="#2C2E34" stroke-width="1.1" stroke-linecap="round"/>`;
  }

  // ---------- efektler (rig koordinatında, yaşlarına göre çizilir) ----------
  const STAR = 'M0,-9 L2,-2 L9,0 L2,2 L0,9 L-2,2 L-9,0 L-2,-2 Z';
  const popCurve = a => {      // 0..1.7 sn
    if (a < .3) { const p = a / .3; return { s: EASE.back(p) * 1.05, r: lerp(-14, 0, p), o: Math.min(1, p * 3) }; }
    if (a < 1.36) return { s: 1, r: 0, o: 1 };
    const p = (a - 1.36) / .34; return { s: 1, r: 0, o: 1 - p, y: -8 * p };
  };
  const FXDRAW = {
    exclaim: a => [0, 1].map(n => { const c = popCurve(a - n * .1); if (a - n * .1 < 0) return ''; return `<text x="${176 + n * 16}" y="${52 - n * 8}" transform="translate(0 ${f(c.y || 0)}) rotate(${f(c.r)} ${176 + n * 16} 52) " style="transform-box:fill-box;transform-origin:50% 100%;" opacity="${f(c.o)}" class="fxt" font-size="${f(46 * c.s)}">!</text>`; }).join(''),
    question: a => { const c = popCurve(a); return `<text x="178" y="48" opacity="${f(c.o)}" class="fxt" font-size="${f(46 * c.s)}" transform="translate(0 ${f(c.y || 0)})">?</text>`; },
    steam: a => [0, 1, 2, 3, 4, 5, 6, 7].map(n => {
      const d = Math.floor(n / 2) * .24, p = (a - d) / .9; if (p < 0 || p > 1) return '';
      const sx = n % 2 ? 1 : -1, o = p < .2 ? p / .2 : 1 - (p - .2) / .8, s = lerp(.3, 1.4, EASE.out(p));
      return `<circle cx="${f((n % 2 ? 140 : 80) + sx * 26 * EASE.out(p))}" cy="${f(50 - 30 * EASE.out(p))}" r="${f((5 + n % 3) * s)}" fill="#fff" stroke="#0B0B0D" stroke-width="2" opacity="${f(o)}"/>`;
    }).join(''),
    sweat: a => { const p = a / 1.9; if (p > 1) return ''; const o = p < .2 ? p / .2 : 1 - (p - .2) / .8, y = p < .2 ? -6 + 6 * p / .2 : 36 * EASE.in((p - .2) / .8), s = p < .2 ? lerp(.2, 1, p / .2) : lerp(1, .9, (p - .2) / .8);
      return `<g transform="translate(170 ${f(64 + y)}) scale(${f(s)})"><path d="M0,-9 C4,-3 6.5,1 6.5,4.5 A6.5,6.5 0 1 1 -6.5,4.5 C-6.5,1 -4,-3 0,-9 Z" fill="#9ED8FF" stroke="#0B0B0D" stroke-width="2" opacity="${f(o)}"/></g>`; },
    spark: a => [[70, 72, 0], [152, 70, .16]].map(([x, y, d]) => { const p = (a - d) / .95; if (p < 0 || p > 1) return ''; const s = p < .4 ? 1.25 * p / .4 : 1.25 * (1 - (p - .4) / .6), r = 90 * p;
      return `<g transform="translate(${x} ${y}) rotate(${f(r)}) scale(${f(Math.max(.01, s))})"><path d="${STAR}" fill="#fff" stroke="#0B0B0D" stroke-width="1.2"/></g>`; }).join(''),
    dots: a => [0, 1, 2].map(n => { const p = (a - n * .35) / 2.6; if (p < 0 || p > 1) return ''; const o = p < .15 ? p / .15 : p > .85 ? (1 - p) / .15 : 1;
      return `<circle cx="${168 + n * 13}" cy="${40 - n * 7}" r="${3.5 + n * .8}" fill="#F1ECD6" stroke="#0B0B0D" stroke-width="1.8" opacity="${f(o)}"/>`; }).join(''),
    zzz: (a, life) => [0, 1, 2].map(n => {
      let p = ((a - n * .9) % 2.7) / 2.7; if (a - n * .9 < 0) return ''; if (a > life - .4) return '';
      const o = p < .2 ? p / .2 : 1 - (p - .2) / .8, s = lerp(.6, 1.25, p);
      return `<text x="${f(178 + n * 8 - 22 * p)}" y="${f(56 - n * 6 - 40 * p)}" class="fxt" font-size="${f((16 + n * 4) * s)}" stroke-width="2.4" opacity="${f(o)}">z</text>`;
    }).join(''),
    hearts: a => [0, 1, 2].map(n => { const p = (a - n * .25) / 1.6; if (p < 0 || p > 1) return ''; const o = p < .15 ? p / .15 : 1 - (p - .15) / .85, s = lerp(.4, 1.1, EASE.out(p));
      return `<g transform="translate(${f(160 + n * 18 + Math.sin(p * 9 + n) * 5)} ${f(60 - 60 * p - n * 6)}) scale(${f(s)})"><path d="M0,4 C-8,-3 -8,-10 -3,-10 C-1,-10 0,-8 0,-7 C0,-8 1,-10 3,-10 C8,-10 8,-3 0,4 Z" fill="#F0602B" stroke="#0B0B0D" stroke-width="1.6" opacity="${f(o)}"/></g>`; }).join('')
  };
  const FXLIFE = { exclaim: 1.8, question: 1.7, steam: 1.7, sweat: 1.9, spark: 1.2, dots: 3.4, zzz: 0, hearts: 2.2 };
  const FXS = [];      // {rig, kind, t0, life}
  function fx(rig, kind, t0, life) { FXS.push({ rig, kind, t0, life: life || FXLIFE[kind] || 2 }); }

  class Rig {
    constructor(host, name) {
      this.name = name; this.pre = 'r' + name + '_';
      host.innerHTML = rigMarkup(this.pre);
      this.svg = host.querySelector('svg'); this.host = host;
      this.E = {}; host.querySelectorAll('[data-r]').forEach(n => this.E[n.getAttribute('data-r')] = n);
      this.E.aL = [...this.E.armL.children]; this.E.aR = [...this.E.armR.children];
      this.eyeKey = ''; this.fxKey = '';
    }
    draw(S, t, talk) {
      const E = this.E;
      const br = Math.sin(t * 2.1) * .009 * S.br;
      const sy = S.sq + br, sx = 1 + (1 - S.sq) * .7 - br * .4;
      const shx = S.shake ? (Math.sin(t * 90) + Math.sin(t * 137) * .6) * S.shake : 0;
      E.rig.setAttribute('transform', `translate(${f(S.rx + shx)} ${f(S.ry)}) rotate(${f(S.rr)} 110 277)`);
      E.torso.setAttribute('transform', `translate(110 232) scale(${sx.toFixed(4)} ${sy.toFixed(4)}) translate(-110 -232)`);
      const fx_ = S.lookX + Math.sin(t * 15) * 5 * S.nay, fy = S.look + Math.max(0, Math.sin(t * 13)) * 3 * S.nod;
      E.face.setAttribute('transform', `translate(${f(fx_)} ${f(fy)})`);
      E.browL.setAttribute('d', qD(S.bL)); E.browR.setAttribute('d', qD(S.bR));
      E.browL.setAttribute('stroke-width', f(S.bw)); E.browR.setAttribute('stroke-width', f(S.bw));
      E.fur.setAttribute('opacity', f(clamp(S.fur, 0, 1) * (1 - S.gu)));
      E.fur.setAttribute('stroke-width', f(1.2 + Math.max(0, S.fur - 1) * .4));
      const u = S.gu;
      E.glasses.setAttribute('transform', `translate(0 ${f(S.gy + 38 * S.gc)}) rotate(${f(S.gr)} 110 83)`);
      E.lensL.setAttribute('d', lensD(mix(LN_L, LF_L, u))); E.lensR.setAttribute('d', lensD(mix(LN_R, LF_R, u)));
      E.bridge.setAttribute('d', bridgeD(mix(BR_N, BR_F, u))); E.glint.setAttribute('d', glintD(mix(GL_N, GL_F, u)));
      for (const s of [E.lsL, E.lsR]) { s.setAttribute('cy', f(lerp(101, 68.5, u))); s.setAttribute('rx', f(lerp(19, 17, u))); s.setAttribute('ry', f(lerp(3.5, 2, u))); }
      E.glare.setAttribute('opacity', f(S.glare * (1 - u)));
      E.eyes.setAttribute('opacity', f(S.eo));
      const k = S.lid.toFixed(1) + '/' + S.pupil.toFixed(1);
      if (S.eo > .01 && k !== this.eyeKey) { this.eyeKey = k; E.eyes.innerHTML = eyesSVG(this.pre, S.lid, S.pupil); }
      const tk = clamp(talk * S.lips, 0, 1);
      const mc = [(S.m[0] + S.m[4]) / 2, (S.m[1] + S.m[3] + S.m[5]) / 3];
      E.mouth.setAttribute('d', qD(S.m)); E.mouth.setAttribute('opacity', f((1 - S.mo) * (1 - clamp(tk * 2.2, 0, 1))));
      E.talk.setAttribute('opacity', tk > .04 ? 1 : 0);
      E.talk.setAttribute('cx', f(mc[0])); E.talk.setAttribute('cy', f(mc[1] + 1 + 1.6 * tk));
      E.talk.setAttribute('rx', f(4.6 + 2.2 * tk)); E.talk.setAttribute('ry', f(.8 + 4 * tk));
      E.mouthO.setAttribute('opacity', S.mo > .02 ? 1 : 0);
      E.mouthO.setAttribute('transform', `translate(110 109) scale(${f(Math.max(.01, S.mo))}) translate(-110 -109)`);
      E.dimple.setAttribute('opacity', f(S.dim)); E.chin.setAttribute('opacity', f(S.chin * (1 - S.gc)));
      const [lo, lh, lf] = E.aL, [ro, rh, rf] = E.aR;
      const dl = armD(S.aL), dr = armD(S.aR);
      lo.setAttribute('d', dl); lf.setAttribute('d', dl); lh.setAttribute('transform', handT(S.aL, 1));
      ro.setAttribute('d', dr); rf.setAttribute('d', dr); rh.setAttribute('transform', handT(S.aR, -1));
      E.legL.setAttribute('transform', `rotate(${f(Math.sin(t * 2.3) * 5 * S.swing)} 96 226)`);
      const tap = S.tap ? Math.max(0, Math.sin(t * 9)) * 9 * S.tap : 0;
      E.legR.setAttribute('transform', `rotate(${f(Math.sin(t * 2.3 + 2.6) * 5 * S.swing - tap)} 124 276)`);
      E.shadow.setAttribute('opacity', f(clamp(.2 * (1 + S.ry / 60), 0, .2)));
      E.shadow.setAttribute('rx', f(56 * clamp(1 + S.ry / 200, .5, 1)));
      // efektler
      let html = '';
      for (const e of FXS) {
        if (e.rig !== this.name) continue;
        const a = t - e.t0;
        if (a < 0 || (e.life && a > e.life)) continue;
        html += FXDRAW[e.kind](a, e.life || 1e9);
      }
      if (html !== this.fxKey) { this.fxKey = html; E.fx.innerHTML = html; }
    }
  }

  // ---------- konuşma / ağız ----------
  const LINES = [];
  TL.scenes.forEach(sc => sc.items.forEach((it, i) => LINES.push(Object.assign({ scene: sc.n, idx: i }, it))));
  const VOW = /[aeıioöuüâî]/gi;
  LINES.forEach(l => l.words.forEach(w => { w.syl = Math.max(1, (w.w.match(VOW) || []).length); }));
  function talkAt(t) {
    for (const l of LINES) {
      if (t < l.start || t > l.start + l.dur) continue;
      for (const w of l.words) {
        if (t >= w.t && t < w.t + w.d) {
          const p = (t - w.t) / w.d;
          return Math.pow(Math.abs(Math.sin(Math.PI * p * w.syl)), .7) * (.75 + .25 * Math.sin(w.t * 7.3));
        }
      }
    }
    return 0;
  }

  // ---------- zaman yardımcıları ----------
  const scene = n => TL.scenes.find(s => s.n === n);
  const L = (s, i) => scene(s).items[i].start;
  const LE = (s, i) => { const it = scene(s).items[i]; return it.start + it.dur; };
  const Wd = (s, i, needle, nth = 0) => {
    const ws = scene(s).items[i].words, nd = needle.toLocaleLowerCase('tr');
    const hits = ws.filter(w => (w.disp || w.w).toLocaleLowerCase('tr').includes(nd));
    if (!hits.length) { console.warn('kelime yok', s, i, needle); return L(s, i); }
    return hits[Math.min(nth, hits.length - 1)].t;
  };
  const S0 = s => scene(s).start, S1 = s => scene(s).end;

  window.DK_ENGINE = { TR, K, fx, finalize, state, def, keysOf, valueAt, Rig, RIG_DEFAULTS, EASE, talkAt, LINES, L, LE, Wd, S0, S1, f, lerp, clamp, EX, P };
})();
