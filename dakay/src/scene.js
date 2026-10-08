// Koreografi. Bütün zamanlar sesten (timeline.json) türetilir: L(sahne, satır) satırın
// başlangıcı, Wd(sahne, satır, "kelime") o kelimenin söylendiği an. Ses yeniden üretilirse
// her şey kendiliğinden kayar. sfx() çağrıları build.mjs'te tek bir efekt izine karılır.
window.CHOREO = function (E, sfx) {
  const { K, fx: fxRaw, L, LE, Wd, S0, S1, EX, P } = E;

  // ---- yardımcılar ----
  const dk = (t, props, dur = .3, ease = 'inOut') => K('dk', t, props, dur, ease);
  const ex = (name, extra) => { const e = JSON.parse(JSON.stringify(EX[name])); return Object.assign(e, extra || {}); };
  const A = (id, t, props, dur = .4, ease = 'inOut') => K('e:' + id, t, props, dur, ease);
  const fx = (kind, t, life) => fxRaw('dk', kind, t, life);
  const show = (id, t, from = { y: 40 }, dur = .5, ease = 'back') => {
    A(id, t, Object.assign({ o: 0 }, from), 0);
    const to = { o: 1 }; for (const k in from) to[k] = k === 's' ? 1 : 0;
    A(id, t, to, dur, ease);
  };
  const hide = (id, t, to = { y: -30 }, dur = .32, ease = 'in') => A(id, t, Object.assign({ o: 0 }, to), dur, ease);
  const pop = (id, t, s = .3, snd = 'pop') => { show(id, t, { s }, .5, 'bigback'); if (snd) sfx(snd, t, .55); };
  const stamp = (id, t, from = { s: 2.2 }) => { show(id, t, from, .32, 'out'); sfx('stamp', t + .2, .7); };
  const type = (id, t, dur, chars, vol = .28) => {
    A(id, t, { type: 0 }, 0); A(id, t, { type: 1 }, dur, 'linear');
    const n = Math.max(1, Math.round(chars * .6));
    for (let i = 0; i < n; i++) sfx('type' + (1 + i % 3), t + dur * i / n, vol);
  };
  const strike = (id, t, d = .28) => { A(id, t, { k: 0 }, 0); A(id, t, { k: 1 }, d, 'out'); sfx('swipe', t, .45); };
  const blink = (t, base) => { dk(t, { lid: 96 }, .07, 'in'); dk(t + .1, { lid: base }, .1, 'out'); };
  const walk = (t, px, dur = .8, hop = 9) => {
    dk(t, { px }, dur, 'inOut');
    const n = Math.max(2, Math.round(dur / .22)), h = dur / n;
    for (let i = 0; i < n; i++) { dk(t + i * h, { ry: -hop, rr: i % 2 ? 2 : -2 }, h / 2, 'out'); dk(t + i * h + h / 2, { ry: 0, rr: 0 }, h / 2, 'in'); }
    sfx('swipe', t, .3);
  };
  const wipe = tw => {
    A('wipeA', tw, { o: 1, x: -2600 }, 0); A('wipeA', tw, { x: 2600 }, .9, 'inOut'); A('wipeA', tw + .95, { o: 0 }, 0);
    A('wipeB', tw + .07, { o: 1, x: -2600 }, 0); A('wipeB', tw + .07, { x: 2600 }, .9, 'inOut'); A('wipeB', tw + 1.0, { o: 0 }, 0);
    sfx('whoosh', tw + .12, .7);
    return tw + .5;    // perdenin tam kapattığı an
  };
  const sideArms = { aL: P.sideL, aR: P.sideR };

  // ================= 1 · SOĞUK AÇILIŞ =================
  A('black', 0, { o: 1 }, 0);
  ['cap', 'hudL', 'hudR'].forEach(id => A(id, 0, { o: 0 }, 0));
  A('t2', 0, { o: 1 }, 0);
  type('ty1', .55, .5, 5, .4);
  A('cur1', L(1, 1), { o: 0 }, 0);
  type('ty2', L(1, 1) - .1, 1.05, 18, .3);
  const tB = Wd(1, 1, 'benim');
  type('ty3', tB, LE(1, 1) - tB - .1, 20, .4);
  A('t2', tB, { o: .45 }, .4);
  const g1 = LE(1, 1) + .2;
  A('black', g1, { jit: 18 }, .05); A('black', g1 + .32, { jit: 0 }, .05);
  sfx('glitch', g1, .6);
  A('black', S0(2) - .4, { y: -1180 }, .55, 'in');
  sfx('whoosh', S0(2) - .42, .7);
  A('black', S0(2) + .2, { o: 0 }, 0);

  // ================= 2 · ÖDÜNÇ BEDEN =================
  ['hudL', 'hudR'].forEach((id, i) => show(id, S0(2) + .3 + i * .1, { y: -60 }, .5, 'out'));
  show('cap', S0(2) + .2, { y: 80 }, .5, 'out');
  show('ph', S0(2) + .5, { s: .9 }, .6, 'out');
  sfx('blink', S0(2) + .5, .5);
  const tDrop = Wd(2, 0, 'ödünç') + .15;
  dk(0, Object.assign(ex('def'), { o: 0, ry: -560, px: 960, py: 905, lips: 1 }), 0);
  dk(tDrop - .45, { o: 1 }, 0);
  dk(tDrop - .45, { ry: 0 }, .45, 'in');
  sfx('whoosh_short', tDrop - .42, .5);
  dk(tDrop, { sq: .8 }, .09, 'out'); dk(tDrop + .09, { sq: 1.07 }, .15, 'out'); dk(tDrop + .24, { sq: 1 }, .35, 'back');
  sfx('thud', tDrop, .8); sfx('boing', tDrop + .04, .55);
  A('ph', tDrop - .05, { o: 0 }, .12);
  dk(tDrop + .3, ex('shock'), .12); dk(tDrop + .8, ex('def'), .4);
  dk(tDrop + .5, { swing: .4 }, .4);

  const tName = Wd(2, 1, 'Dakay');
  stamp('nameDk', tName, { s: 1.8, r: -6 });
  dk(tName, ex('smirk'), .3); fx('spark', tName + .1); sfx('sparkle', tName + .1, .4);
  dk(tName + .1, { aR: P.waveR }, .25); dk(tName + .35, { aR: P.waveR2 }, .18); dk(tName + .53, { aR: P.waveR }, .18);
  dk(tName + .71, { aR: P.waveR2 }, .18); dk(tName + .9, { aR: P.sideR }, .3);
  const tGri = Wd(2, 1, 'Gri');
  dk(tGri, ex('def'), .3);
  show('coBody', tGri, { x: -40 }, .45, 'out'); A('coBody', tGri + .1, { k: 0 }, 0); A('coBody', tGri + .1, { k: 150 }, .4, 'out'); sfx('pop', tGri, .5);
  const tGz = Wd(2, 1, 'güneş');
  show('coGl', tGz, { x: 40 }, .45, 'out'); A('coGl', tGz + .1, { k: 0 }, 0); A('coGl', tGz + .1, { k: 120 }, .4, 'out'); sfx('pop2', tGz, .5);
  dk(tGz + .35, { glare: .85 }, .12); dk(tGz + .6, { glare: 0 }, .35); sfx('sparkle', tGz + .35, .45);
  dk(tGz + .2, { gy: -2 }, .15, 'out'); dk(tGz + .4, { gy: 0 }, .25);

  const tKen = Wd(2, 2, 'Kendisi');
  hide('nameDk', tKen - .1, { y: -40 }); hide('coBody', tKen - .1, { x: -40 }); hide('coGl', tKen - .05, { x: 40 });
  dk(tKen, Object.assign(ex('angry'), { aL: P.hipL, aR: P.hipR, lips: 0, swing: 0 }), .35);
  dk(tKen + .35, { tap: 1 }, .1);
  fx('steam', tKen + .4); fx('steam', tKen + 1.5);
  sfx('steam', tKen + .4, .55); sfx('steam', tKen + 1.5, .45);
  stamp('grr', Wd(2, 2, 'sevinmedi') + .35, { s: 1.8, r: 8 });
  dk(S1(2) - .5, { tap: 0 }, .1);
  hide('grr', S1(2) - .4, { s: .6 });

  // ================= 3 · İSİM =================
  dk(S0(3), Object.assign(ex('meh'), sideArms, { lips: .8 }), .4);
  walk(S0(3) + .05, 540, .85);
  show('nmModel', L(3, 0) + .1, { x: -30 }, .4, 'out');
  const tCl = Wd(3, 0, 'Claude');
  show('nmClaude', tCl - .05, { y: 70, s: .92 }, .5, 'back'); sfx('whoosh_short', tCl - .05, .5);
  dk(Wd(3, 1, 'Ama'), Object.assign(ex('sus'), { lips: 1 }), .3);
  const tRk = Wd(3, 1, 'Rekt');
  strike('nmClaude', tRk - .1, .25);
  A('nmClaude', tRk + .2, { o: .35 }, .4);
  A('nmModel', tRk + .2, { o: .35 }, .4);
  stamp('nmRekt', tRk + .05, { s: 2.4, r: -8 });
  dk(tRk + .05, Object.assign(ex('smirk'), { aR: P.pointR }), .3, 'out');
  fx('spark', tRk + .25); sfx('sparkle', tRk + .25, .35);
  show('nmSub', Wd(3, 1, 'düşünme'), { y: 30 }, .45, 'back'); sfx('pop', Wd(3, 1, 'düşünme'), .45);
  dk(Wd(3, 1, 'ortağıyım') + .2, { aR: P.sideR }, .4);
  ['nmModel', 'nmClaude', 'nmRekt', 'nmSub'].forEach((id, i) => hide(id, S1(3) - .7 + i * .04, { y: -40 }));

  // ================= 4 · HAFIZA =================
  const c4 = wipe(S1(3) - .5);
  dk(c4, Object.assign(ex('meh'), sideArms, { px: 680, ry: 0, rr: 0 }), 0);
  const s4 = S0(4) + .25;
  dk(s4, { aR: P.peekLo }, .3);
  dk(s4 + .3, { gu: 1, eo: 1, lid: 87.5, aR: P.peekHi }, .45); sfx('glasses', s4 + .3, .5);
  dk(s4 + .8, { aR: P.sideR, rr: -3, swing: .25, lips: .55 }, .5);
  dk(s4 + .9, { mo: 1 }, .4); dk(s4 + 1.5, { mo: 0 }, .3);
  fx('zzz', s4 + 1.3, L(4, 1) - (s4 + 1.3));
  sfx('snore', s4 + 1.1, .55);
  const tHt = Wd(4, 0, 'hatırlamam');
  show('memA', tHt - .1, { y: 40 }, .5, 'back'); sfx('pop', tHt - .1, .4);

  const tUy = L(4, 1);
  hide('memA', tUy, { y: -30 });
  dk(tUy, { sq: .88 }, .1, 'out');
  dk(tUy + .02, Object.assign(ex('shock'), { gu: 0, eo: 0, rr: 0, swing: 0, lips: 1 }), .16);
  dk(tUy + .1, { sq: 1.08, ry: -34 }, .2, 'out'); dk(tUy + .3, { sq: .93, ry: 0 }, .22, 'in'); dk(tUy + .52, { sq: 1 }, .25, 'back');
  sfx('jump', tUy + .08, .6); sfx('glasses', tUy + .05, .4); sfx('thud', tUy + .52, .5);
  fx('exclaim', tUy + .1); fx('sweat', tUy + .15);
  const tOt = Wd(4, 1, 'oturumda');
  A('ms1', 0, { o: 0 }, 0); A('ms2', 0, { o: 0 }, 0); A('ms3', 0, { o: 0 }, 0);
  A('memSess', tOt - .05, { o: 1 }, 0);
  ['ms1', 'ms2', 'ms3'].forEach((id, i) => { show(id, tOt + i * .32, { y: 30, s: .7 }, .35, 'back'); sfx('tick', tOt + i * .32, .55); });
  dk(tUy + 1.3, ex('def'), .4);
  hide('memSess', L(4, 2) - .05, { y: -30 });

  const tSis = Wd(4, 2, 'sistem');
  dk(Wd(4, 2, 'Arda'), ex('sus'), .3);
  show('memSys', tSis, { y: 20 }, .4, 'back'); sfx('pop2', tSis, .45);
  dk(LE(4, 2), Object.assign(ex('smirk'), { lookX: 4 }), .4);
  [['f1', 'not'], ['f2', 'yaptık'], ['f3', 'yarım'], ['f4', 'karar']].forEach(([id, w], i) => {
    const t = Wd(4, 3, w) - .05;
    A(id, t, { o: 0, x: 520, y: -260, r: 18 - i * 9, s: .8 }, 0);
    A(id, t, { o: 1, x: 0, y: 0, r: i % 2 ? 1.5 : -1.5, s: 1 }, .55, 'back');
    sfx('swipe', t, .5);
  });
  const tOk = Wd(4, 4, 'okumak') - .5;
  dk(L(4, 4), Object.assign(ex('def'), { lookX: 5, look: 1.5 }), .4);
  ['f1', 'f2', 'f3', 'f4'].forEach((id, i) => { A(id, tOk + i * .28, { hl: 0 }, 0); A(id, tOk + i * .28, { hl: 1 }, .35, 'out'); sfx('tick', tOk + i * .28, .35); });
  dk(tOk, { glare: .8 }, .15); dk(tOk + .5, { glare: 0 }, .4);

  const tKf = Wd(4, 5, 'kafamda');
  dk(tKf - .15, Object.assign(ex('meh'), { aR: P.templeR, lookX: 0, look: 0 }), .3);
  dk(tKf + .15, { nay: 1 }, .15); dk(tKf + .85, { nay: 0 }, .2);
  const tKl = Wd(4, 5, 'klasörde');
  pop('folder', tKl - .15, .3, 'pop');
  dk(tKl - .1, Object.assign(ex('smirk'), { aR: P.presentR }), .35);
  [[180, 140], [-220, 140], [180, -70], [-220, -70]].forEach(([dx, dy], i) => {
    const id = 'f' + (i + 1);
    A(id, tKl + .1 + i * .07, { x: dx, y: dy, s: .15, o: 0, r: 0 }, .42, 'in');
  });
  sfx('whoosh_short', tKl + .1, .5);
  A('folder', tKl + .55, { s: 1.12 }, .1, 'out'); A('folder', tKl + .65, { s: 1 }, .3, 'back'); sfx('pop2', tKl + .58, .5);
  dk(LE(4, 5) + .2, sideArms, .4);
  hide('folder', S1(4) - .45, { y: -40, s: .9 }); hide('memSys', S1(4) - .45);

  // ================= 5 · HATA =================
  dk(S0(5) - .3, ex('def'), .3);
  walk(S0(5) - .3, 960, .8);
  const tHa = Wd(5, 0, 'Hata');
  show('errT', tHa - .05, { s: 1.3 }, .25, 'out'); sfx('glitch', tHa - .05, .55);
  A('errT', tHa, { jit: 16 }, .05); A('errT', tHa + .3, { jit: 0 }, .05);
  dk(tHa, Object.assign(ex('meh'), { aL: P.shrugL, aR: P.shrugR, rr: 0 }), .3, 'back');
  dk(LE(5, 0), sideArms, .35);
  hide('errT', L(5, 1) + .2, { y: -40 });

  const tCe = Wd(5, 1, 'çenesine');
  dk(tCe - .1, { aR: P.chinR }, .3);
  dk(tCe + .1, { gc: 1, eo: 1, lid: 83, pupil: 1.2 }, .45, 'back'); sfx('glasses', tCe + .1, .55);
  dk(tCe + .5, Object.assign(ex('meh'), { aR: P.sideR }), .35);
  pop('errX', tCe + .55, .3, null); sfx('buzz', tCe + .6, .5);
  const tAl = Wd(5, 1, 'alnına');
  dk(tAl - .2, { aR: P.peekLo }, .25);
  dk(tAl, { gc: 0, gu: 1, aR: P.peekHi }, .45, 'back'); sfx('glasses', tAl, .55);
  dk(tAl + .45, Object.assign(ex('soft'), { aR: P.sideR }), .4);
  pop('errOk', tAl + .45, .3, null); sfx('ding', tAl + .5, .5);
  A('errX', tAl + .5, { o: .35, s: .85 }, .3);

  const t52 = L(5, 2);
  hide('errX', t52 - .2, { y: 40 }); hide('errOk', t52 - .15, { y: 40 });
  dk(t52 - .1, { aR: P.peekHi }, .25); dk(t52 + .15, { gu: 0, eo: 0, aR: P.peekLo }, .35); sfx('glasses', t52 + .15, .45);
  dk(t52 + .5, Object.assign(ex('def'), sideArms), .35);
  walk(t52 + .55, 560, .8);
  show('rules', t52 + .45, { x: 420, r: 3 }, .6, 'back'); sfx('swipe', t52 + .45, .5);
  const tKr = Wd(5, 2, 'kurallar');
  type('tyR1', tKr, 1.1, 32, .25);
  A('r1', 0, { o: 1 }, 0);
  [['r2', Wd(5, 2, 'düzeltme')], ['r3', Wd(5, 2, 'kural', 1)], ['r4', Wd(5, 2, 'olur')]].forEach(([id, t]) => {
    A(id, 0, { o: 0 }, 0); show(id, t, { x: 40 }, .35, 'out'); sfx('tick', t, .5);
  });
  dk(Wd(5, 2, 'düzeltme'), Object.assign(ex('smirk'), { lookX: -4 }), .35);
  const tAy = Wd(5, 2, 'Aynı');
  stamp('once', tAy, { s: 2, r: -10 });
  dk(tAy, Object.assign(ex('def'), { lookX: 0, nod: 1 }), .3); dk(LE(5, 2) + .1, { nod: 0 }, .2);
  hide('rules', S1(5) - .5, { x: 300 }); hide('once', S1(5) - .5, { s: .7 });

  // ================= 6 · ROLLER =================
  const c6 = wipe(S1(5) - .5);
  dk(c6, Object.assign(ex('def'), sideArms, { px: 960, sc: .92 }), 0);
  show('colA', L(6, 0) + .2, { x: -80 }, .5, 'out'); sfx('whoosh_short', L(6, 0) + .2, .45);
  dk(Wd(6, 0, 'vermem'), { nay: 1 }, .12); dk(Wd(6, 0, 'vermem') + .6, { nay: 0 }, .15);
  [['a1', 'Teknoloji'], ['a2', 'mimari'], ['a3', 'kapsam']].forEach(([id, w]) => {
    const t = Wd(6, 0, w); A(id, t, { k: 0 }, 0); A(id, t, { k: 1 }, .3, 'back'); sfx('tick', t, .55);
  });
  dk(Wd(6, 0, 'Teknoloji') - .2, { aL: P.pointL }, .3);
  dk(Wd(6, 0, 'Arda'), Object.assign(ex('smirk'), { aL: P.pointL }), .3);
  show('colR', L(6, 1) - .1, { x: 80 }, .5, 'out'); sfx('whoosh_short', L(6, 1) - .1, .45);
  dk(L(6, 1), Object.assign(ex('def'), { aL: P.sideL, aR: P.pointR }), .35);
  [['b1', 'önerir'], ['b2', 'uygular'], ['b3', 'parçalara']].forEach(([id, w]) => {
    const t = Wd(6, 1, w); A(id, t, { k: 0 }, 0); A(id, t, { k: 1 }, .3, 'back'); sfx('tick', t, .55);
  });
  const tKt = Wd(6, 2, 'katılmıyorsam');
  hide('colA', tKt - .2, { x: -700 }, .4); hide('colR', tKt - .2, { x: 700 }, .4); sfx('whoosh', tKt - .2, .45);
  dk(tKt - .1, Object.assign(ex('sus'), sideArms, { sc: 1.06 }), .35);
  const tSy = Wd(6, 2, 'söylerim');
  dk(tSy, Object.assign(ex('angry'), { aL: P.hipL, aR: P.hipR }), .3); fx('exclaim', tSy + .1); sfx('pop2', tSy + .1, .45);
  const tBs = Wd(6, 2, 'başını');
  dk(tBs - .3, Object.assign(ex('smirk', { dim: 1 }), sideArms, { nod: 1.3 }), .3);
  show('yes', tBs - .2, { x: 40 }, .35, 'out');
  ['blink', 'blink', 'blink'].forEach((s, i) => sfx(s, tBs - .1 + i * .24, .4));
  const tIs = Wd(6, 2, 'işe');
  hide('yes', tIs - .1, { x: 40 });
  dk(tIs - .05, Object.assign(ex('angry'), { nod: 0, nay: 1.2 }), .2);
  stamp('nope', tIs + .1, { s: 2.2, r: -14 }); A('nope', tIs + .45, { r: -5 }, .2);
  sfx('buzz', tIs + .2, .5);
  dk(LE(6, 2) + .1, Object.assign(ex('def'), { nay: 0, sc: .92 }), .3);
  hide('nope', S1(6) - .45, { s: .6 });

  // ================= 7 · BİRLİKTE =================
  dk(S0(7) - .4, Object.assign(ex('smirk'), { sc: .82 }), .3);
  walk(S0(7) - .4, 270, .9);
  dk(S0(7) + .6, { aL: P.hipL, aR: P.hipR }, .35);
  [['c1', L(7, 0)], ['c2', L(7, 1)], ['c3', L(7, 2)]].forEach(([id, t], i) => {
    A(id, t - .1, { o: 0, y: 700, r: -10 + i * 6 }, 0); A(id, t - .1, { o: 1, y: 0, r: i === 1 ? 1.5 : -1.5 }, .6, 'back');
    sfx('whoosh_short', t - .1, .5); sfx('thud', t + .35, .35);
  });
  const tPf = Wd(7, 0, 'portföy');
  A('cnt1', 0, { cnt: 0 }, 0); A('cnt1', tPf, { cnt: 12 }, 1.0, 'out');
  for (let i = 0; i < 6; i++) sfx('tick', tPf + i * .16, .3);
  const tLf = Wd(7, 1, 'laf');
  dk(tLf, Object.assign(ex('smirk'), { aR: P.waveR }), .25); dk(tLf + .25, { aR: P.waveR2 }, .18); dk(tLf + .43, { aR: P.hipR }, .3);
  fx('spark', tLf + .1); sfx('sparkle', tLf + .1, .4);
  const tGc = Wd(7, 2, 'gece');
  A('c3', 0, { mm: 0, hh: 240 }, 0); A('c3', tGc, { mm: 1080, hh: 330 }, 1.6, 'inOut');
  sfx('riser', tGc - .2, .3);
  const tOn = Wd(7, 2, 'denetleyen');
  dk(tOn, Object.assign(ex('sus'), { aR: P.pointR }), .3); dk(tOn + 1.2, { aR: P.hipR }, .3);
  ['c1', 'c2', 'c3'].forEach((id, i) => hide(id, S1(7) - .6 + i * .07, { y: -620, r: 6 }, .45, 'in'));
  sfx('whoosh', S1(7) - .6, .5);

  // ================= 8 · SÖYLEMEK İSTEDİĞİM =================
  A('warm', S0(8) - .2, { o: 1 }, 1.4);
  A('grid', S0(8) - .2, { o: .25 }, 1.4); A('ground', S0(8) - .2, { o: 0 }, .8);
  dk(S0(8) - .2, Object.assign(ex('def'), sideArms), .3);
  walk(S0(8) - .2, 960, .9, 7);
  dk(S0(8) + .75, { sc: 1.42, py: 420 + 388 * 1.42 }, 2.6, 'inOut');
  dk(S0(8) + 3.4, { sc: 1.52, py: 420 + 388 * 1.52 }, S1(8) - S0(8) - 3.6, 'linear');
  const s8 = S0(8) + .85;
  dk(s8, { aR: P.peekLo }, .3);
  dk(s8 + .32, Object.assign(ex('soft'), { gu: 1, eo: 1, lid: 81, pupil: 1.2, aR: P.peekHi }), .55); sfx('glasses', s8 + .32, .4);
  dk(s8 + .95, { aR: P.sideR }, .5);
  blink(L(8, 0) + 1.3, 81);
  const tBe = Wd(8, 1, 'backend');
  show('goal', tBe - .1, { x: -40 }, .5, 'out'); sfx('pop', tBe - .1, .35);
  show('snip', Wd(8, 1, 'kodunun') - .1, { x: 40, r: 2 }, .5, 'out'); sfx('swipe', Wd(8, 1, 'kodunun') - .1, .35);
  const tEl = Wd(8, 1, 'elimden');
  dk(tEl - .2, Object.assign(ex('sad'), { look: 3, lid: 85, pupil: 0 }), .6);
  blink(LE(8, 1) - .4, 85);
  hide('goal', L(8, 2) - .3, { x: -40 }); hide('snip', L(8, 2) - .3, { x: 40 });
  dk(L(8, 2) - .1, Object.assign(ex('soft'), { look: 0, lid: 80.5, pupil: 1.2 }), .5);
  show('bana', L(8, 2) + .05, { y: 30 }, .45, 'out');
  strike('bana', Wd(8, 2, 'değil') + .15, .3);
  const tSa = Wd(8, 2, 'sana');
  stamp('sana', tSa - .05, { s: 1.9, r: 6 });
  fx('hearts', tSa + .2); sfx('sparkle', tSa + .15, .3);
  blink(LE(8, 2) - .3, 80.5);
  hide('bana', L(8, 3) - .3, { y: -30 }); hide('sana', L(8, 3) - .3, { y: -30 });
  show('chain', L(8, 3) - .05, { y: -30 }, .45, 'out'); sfx('whoosh_short', L(8, 3) - .05, .35);
  const tNd = Wd(8, 3, 'neden');
  A('hot', tNd, { k: 0 }, 0); A('hot', tNd, { k: 1 }, .35, 'back'); sfx('ding', tNd + .05, .35);
  dk(tNd + .1, { nod: .6 }, .2); dk(tNd + 1.1, { nod: 0 }, .3);
  hide('chain', S1(8) - .3, { y: -30 });

  // ================= 9 · KAPANIŞ =================
  A('warm', S0(9) - .1, { o: 0 }, 1.0); A('grid', S0(9) - .1, { o: 1 }, 1.0); A('ground', S0(9) + .3, { o: 1 }, .6);
  const s9 = S0(9) - .1;
  dk(s9, { aR: P.peekHi }, .3);
  dk(s9 + .3, { gu: 0, eo: 0, aR: P.peekLo }, .4); sfx('glasses', s9 + .3, .5);
  dk(s9 + .7, Object.assign(ex('def'), sideArms, { sc: 1, py: 905 }), .9, 'inOut');
  show('arac', Wd(9, 0, 'araç') - .1, { y: 30 }, .4, 'out');
  strike('arac', Wd(9, 0, 'değil') + .1, .3);
  stamp('ortak', Wd(9, 0, 'ortak') - .05, { s: 2, r: -6 });
  dk(Wd(9, 0, 'ortak'), ex('smirk'), .3);
  hide('arac', L(9, 1) - .25); hide('ortak', L(9, 1) - .25);
  dk(Wd(9, 1, 'unutmam'), ex('sus'), .3);
  const tYz = Wd(9, 1, 'yazarım');
  A('yaz', L(9, 1) + .2, { o: 1 }, .3);
  type('tyYaz', tYz - .05, .55, 8, .4);
  dk(tYz, ex('smirk'), .3);
  hide('yaz', L(9, 2) - .15);
  const tGr = L(9, 2);
  dk(tGr - .1, Object.assign(ex('smirk'), { aR: P.waveR }), .25);
  for (let i = 0; i < 5; i++) { dk(tGr + .15 + i * .36, { aR: P.waveR2 }, .18); dk(tGr + .33 + i * .36, { aR: P.waveR }, .18); }
  fx('spark', tGr + .2); sfx('sparkle', tGr + .2, .45);
  show('logo', tGr + .1, { y: -50, s: .9 }, .55, 'back'); sfx('stamp', tGr + .3, .45);
  const tEnd = LE(9, 2);
  dk(tGr + 2.1, { aR: P.sideR }, .3);
  hide('cap', tEnd + .4, { y: 80 }, .4);

  // son şaka: Dakay yüzünü geri ister
  const tG = Math.max(tEnd + 1.0, tGr + 2.45);   // el sallama bitmeden şaka başlamasın
  hide('logo', tG - .2, { y: -40 });
  dk(tG, Object.assign(ex('angry'), { aL: P.hipL, aR: P.hipR, lips: 0 }), .3, 'back');
  dk(tG + .3, { tap: 1 }, .1);
  fx('steam', tG + .3); sfx('steam', tG + .3, .5);
  pop('bubble', tG + .45, .2, 'pop2');
  type('tyBub', tG + .7, .8, 16, .35);
  fx('steam', tG + 1.8); sfx('steam', tG + 1.8, .4);
};
