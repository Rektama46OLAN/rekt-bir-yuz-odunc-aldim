// Bağlama: DOM'u toplar, koreografiyi çalıştırır, her kareyi render(t) ile çizer ve
// HyperFrames'e seek edilebilir bir timeline kaydeder.
(function () {
  const E = window.DK_ENGINE, TL = window.TIMELINE;
  const TOTAL = +document.getElementById('root').getAttribute('data-duration');
  const f = E.f;

  // Dakay + mini kopyalar (kart 2 ve site önizlemesi)
  const dkHost = document.getElementById('dk');
  const dk = new E.Rig(dkHost, 'dk');
  const MINI = [['mini1', 'smirk', .2], ['mini2', 'def', .25], ['mini3', 'sus', .25], ['mini4', 'angry', .25], ['mini5', 'shock', .25]].map(([id, exn, s]) => {
    const host = document.getElementById(id);
    const wrap = document.createElement('div'); wrap.className = 'dk'; wrap.style.transform = `scale(${s})`; wrap.style.transformOrigin = '0 0';
    host.appendChild(wrap);
    const r = new E.Rig(wrap, id);
    const st = Object.assign({}, JSON.parse(JSON.stringify(E.RIG_DEFAULTS)), JSON.parse(JSON.stringify(E.EX[exn])));
    if (exn === 'shock') { st.aL = E.P.pointL.slice(); }
    if (exn === 'angry') { st.aL = E.P.hipL.slice(); st.aR = E.P.hipR.slice(); }
    if (exn === 'smirk') { st.aR = E.P.waveR.slice(); }
    return { r, st, ph: id.length * .7 };
  });

  // koreografi
  window.CHOREO(E, () => {});
  E.def('dk', E.RIG_DEFAULTS);

  // zamanlanmış DOM nesneleri
  const OBJ = [];
  const ids = new Set(Object.keys(E.TR).filter(k => k.startsWith('e:')).map(k => k.slice(2, k.indexOf('.'))));
  document.querySelectorAll('.el').forEach(n => ids.add(n.id));
  ids.forEach(id => {
    const node = document.getElementById(id);
    if (!node) { console.warn('öğe yok', id); return; }
    const isEl = node.classList.contains('el');
    const keys = new Set(E.keysOf('e:' + id));
    const defs = { x: 0, y: 0, s: 1, r: 0, o: isEl ? 0 : 1, jit: 0, type: 0, cnt: 0 };
    keys.forEach(k => { if (!(k in defs)) defs[k] = 0; });
    E.def('e:' + id, defs);
    const xf = isEl || ['x', 'y', 's', 'r', 'jit'].some(k => keys.has(k));
    const vars = [...keys].filter(k => !(k in { x: 1, y: 1, s: 1, r: 1, o: 1, jit: 1, type: 1, cnt: 1 }));
    OBJ.push({ id, node, isEl, keys, defs, xf, vars, full: node.getAttribute('data-type'), cnt: node.hasAttribute('data-cnt'), last: '' });
  });
  E.finalize();

  const CURS = [...document.querySelectorAll('.cur')];
  const capBox = document.getElementById('capBox');
  const hudN = document.getElementById('hudN'), hudT = document.getElementById('hudT');
  const bars = [...document.querySelectorAll('#bars i')];
  let capLine = -2, capSpans = [], hudKey = '';

  function caption(t) {
    let li = -1;
    E.LINES.forEach((l, i) => { if (l.scene > 1 && t >= l.start - .08 && t <= l.start + l.dur + .45) li = i; });
    if (li !== capLine) {
      capLine = li;
      if (li < 0) { capBox.style.opacity = 0; capSpans = []; }
      else {
        capBox.style.opacity = 1;
        capBox.innerHTML = E.LINES[li].words.map(w => `<span class="w">${w.disp || w.w}</span>`).join(' ');
        capSpans = [...capBox.children];
      }
    }
    if (li >= 0) {
      const ws = E.LINES[li].words;
      ws.forEach((w, k) => {
        const on = t >= w.t, now = on && t < w.t + w.d + .05;
        capSpans[k].className = 'w' + (on ? ' on' : '') + (now ? ' now' : '');
      });
    }
  }

  const DBG = window.DK_DEBUG_T ? Object.assign(document.body.appendChild(document.createElement('div')), { style: 'position:fixed;left:20px;bottom:20px;z-index:99;font:700 60px monospace;background:#ff0;color:#000;padding:6px' }) : null;
  function render(t) {
    if (DBG) DBG.textContent = 't=' + t.toFixed(3) + ' gsap=' + (window.__timelines && window.__timelines.main ? window.__timelines.main.time().toFixed(3) : '-');
    // DOM nesneleri
    for (const o of OBJ) {
      const s = E.state('e:' + o.id, o.defs, t);
      if (o.xf) {
        const jx = s.jit ? (Math.sin(t * 71) + Math.sin(t * 43.7) * .6) * s.jit : 0;
        const jy = s.jit ? Math.sin(t * 57.3) * s.jit * .4 : 0;
        o.node.style.transform = `translate(${f(s.x + jx)}px, ${f(s.y + jy)}px) rotate(${f(s.r)}deg) scale(${f(s.s)})`;
      }
      if (o.isEl || o.keys.has('o')) o.node.style.opacity = f(Math.max(0, Math.min(1, s.o)));
      if (o.full !== null && o.keys.has('type')) {
        const txt = o.full.slice(0, Math.round(s.type * o.full.length));
        if (txt !== o.last) { o.last = txt; o.node.textContent = txt; }
      }
      if (o.cnt) { const v = String(Math.round(s.cnt)); if (v !== o.last) { o.last = v; o.node.textContent = v; } }
      for (const k of o.vars) o.node.style.setProperty('--' + k, f(s[k]));
    }
    for (const c of CURS) c.style.visibility = Math.floor(t * 2.4) % 2 === 0 ? 'visible' : 'hidden';

    // Dakay
    const S = E.state('dk', E.RIG_DEFAULTS, t);
    const talk = E.talkAt(t);
    dkHost.style.transform = `translate(${f(S.px - 300)}px, ${f(S.py - 554)}px) scale(${S.sc.toFixed(4)})`;
    dkHost.style.opacity = f(S.o);
    dk.draw(S, t, talk);
    for (const m of MINI) m.r.draw(m.st, t + m.ph, 0);

    // HUD
    const sc = TL.scenes.find(s => t >= s.start && t < s.end) || TL.scenes[TL.scenes.length - 1];
    const k = sc.n + sc.title;
    if (k !== hudKey) { hudKey = k; hudN.textContent = String(sc.n).padStart(2, '0'); hudT.textContent = sc.title; }
    bars.forEach((b, i) => { const v = E.talkAt(t - i * .035); b.style.height = f(6 + 24 * v) + 'px'; });
    caption(t);
  }

  // Not: HyperFrames içinde tween'in ara değeri doğrusal gelmiyor (9.7 sn'de 8.77 ölçüldü),
  // timeline'ın kendi zamanı ise doğru. Setter yalnızca tetikleyici; zaman tl.time()'dan okunur.
  const driver = { _t: -1 };
  Object.defineProperty(driver, 't', { get() { return this._t; }, set(v) { this._t = v; render(tl.time()); } });
  const tl = gsap.timeline({ paused: true });
  tl.to(driver, { t: TOTAL, duration: TOTAL, ease: 'none', lazy: false }, 0);
  window.__timelines = window.__timelines || {};
  window.__timelines['main'] = tl;
  render(0);
  window.__dkRender = render;   // hata ayıklama
})();
