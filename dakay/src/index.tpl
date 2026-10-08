<!doctype html>
<html lang="tr">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=1920, height=1080" />
    <title>Rekt — Bir yüz ödünç aldım</title>
    <style>
/*FONTS*/
    </style>
    <script src="https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/gsap.min.js"></script>
    <style>
      :root {
        --paper: #F1ECD6; --paper2: #EBE5CD; --desk: #E4DDC3; --ink: #0B0B0D; --ink2: #55565C;
        --rule: #CFC7AA; --blue: #3E6DB5; --orange: #F0602B; --mustard: #EAB65A; --green: #2E9E5B; --red: #E0402B;
        --disp: 'Archivo', 'Arial Narrow', sans-serif; --mono: 'IBM Plex Mono', Consolas, monospace;
      }
      * { margin: 0; padding: 0; box-sizing: border-box; }
      html, body { width: 1920px; height: 1080px; overflow: hidden; background: var(--paper); }
      #root { position: relative; width: 1920px; height: 1080px; overflow: hidden; background: var(--paper); color: var(--ink); font-family: var(--disp); }
      .clip { position: absolute; inset: 0; }
      .el { position: absolute; will-change: transform, opacity; opacity: 0; }
      .disp { font-family: var(--disp); font-stretch: 68%; font-weight: 900; letter-spacing: -.01em; line-height: .86; text-transform: uppercase; }
      .mono { font-family: var(--mono); }

      /* zemin: model sheet kılavuzu */
      #grid { position: absolute; inset: 0;
        background-image: linear-gradient(rgba(62,109,181,.10) 1.5px, transparent 1.5px), linear-gradient(90deg, rgba(62,109,181,.10) 1.5px, transparent 1.5px),
          linear-gradient(rgba(62,109,181,.05) 1px, transparent 1px), linear-gradient(90deg, rgba(62,109,181,.05) 1px, transparent 1px);
        background-size: 240px 240px, 240px 240px, 48px 48px, 48px 48px; background-position: -1px -1px; }
      #ground { position: absolute; left: 0; right: 0; top: 905px; height: 2px; background: var(--rule); }
      #warm { position: absolute; inset: 0; background: radial-gradient(ellipse at 50% 42%, #F6EBCB 0%, #E9D7A8 55%, #C9AE77 100%); opacity: 0; }

      /* HUD */
      #hudL { left: 56px; top: 44px; opacity: 1; font: 600 22px/1 var(--mono); letter-spacing: .12em; text-transform: uppercase; display: flex; gap: 14px; align-items: center; }
      #hudL .tag { background: var(--ink); color: var(--paper); padding: 8px 10px 7px; border-radius: 6px; }
      #hudR { right: 56px; top: 40px; opacity: 1; display: flex; gap: 12px; align-items: center; font: 600 20px/1 var(--mono); letter-spacing: .12em; }
      #hudR .bars { display: flex; gap: 4px; align-items: center; height: 30px; }
      #hudR .bars i { display: block; width: 6px; height: 6px; background: var(--ink); border-radius: 3px; }
      #hudR .dot { width: 14px; height: 14px; border-radius: 50%; background: var(--orange); border: 2.5px solid var(--ink); }

      /* altyazı */
      #cap { left: 0; right: 0; top: 948px; display: flex; justify-content: center; }
      #cap .box { max-width: 1500px; padding: 14px 26px 16px; background: var(--paper); border: 3px solid var(--ink); border-radius: 16px; box-shadow: 6px 6px 0 var(--ink);
        font: 700 40px/1.18 var(--disp); font-stretch: 85%; text-align: center; }
      #cap .w { color: rgba(11,11,13,.28); transition: none; }
      #cap .w.on { color: var(--ink); }
      #cap .w.now { color: var(--orange); }

      /* dakay */
      .dk { position: absolute; left: 0; top: 0; width: 600px; height: 640px; transform-origin: 300px 554px; }
      .fxt { font-family: 'Archivo', sans-serif; font-stretch: 75%; font-weight: 900; fill: #F1ECD6; stroke: #0B0B0D; stroke-width: 3.2px; paint-order: stroke; }

      /* sahne 1 */
      #black { left: 0; top: 0; width: 1920px; height: 1080px; background: var(--ink); opacity: 1; }
      #term { position: absolute; left: 230px; top: 300px; color: var(--paper); }
      #t1 { font: 500 58px/1 var(--mono); }
      #t2 { font: 400 34px/1 var(--mono); color: #8B8D93; margin-top: 46px; }
      #t3 { font-size: 168px; color: var(--paper); margin-top: 34px; }
      .cur { display: inline-block; width: .55em; height: .95em; background: var(--orange); vertical-align: -0.12em; margin-left: 6px; }
      #t3 .cur { width: .32em; height: .78em; vertical-align: 0; }

      /* genel kart / etiket */
      .card { background: var(--paper); border: 3px solid var(--ink); border-radius: 18px; box-shadow: 8px 8px 0 var(--ink); }
      .lbl { font: 600 22px/1 var(--mono); letter-spacing: .1em; text-transform: uppercase; }
      .chip { display: inline-block; background: var(--ink); color: var(--paper); font: 600 20px/1 var(--mono); letter-spacing: .1em; text-transform: uppercase; padding: 8px 10px 7px; border-radius: 6px; }

      /* sahne 2 */
      #ph { left: 760px; top: 330px; width: 400px; height: 600px; }
      #ph svg { overflow: visible; }
      #ph .t { position: absolute; left: 0; right: 0; top: 250px; text-align: center; font: 600 24px/1 var(--mono); color: var(--ink2); letter-spacing: .08em; }
      #nameDk { left: 1270px; top: 250px; }
      #nameDk .disp { font-size: 220px; }
      #nameDk .sub { margin-top: 18px; }
      .callout { display: flex; align-items: center; gap: 0; }
      .callout .ln { height: 3px; background: var(--ink); width: calc(var(--k, 0) * 1px); }
      .callout .dotc { width: 16px; height: 16px; border-radius: 50%; background: var(--orange); border: 3px solid var(--ink); flex: none; }
      .callout .tx { background: var(--paper); border: 3px solid var(--ink); border-radius: 12px; padding: 12px 16px 11px; box-shadow: 5px 5px 0 var(--ink); }
      .callout .tx b { display: block; font: 800 38px/1 var(--disp); font-stretch: 75%; text-transform: uppercase; }
      .callout .tx span { display: block; font: 500 20px/1.2 var(--mono); color: var(--ink2); margin-top: 6px; }
      .sw { display: inline-block; width: 18px; height: 18px; border: 2px solid var(--ink); border-radius: 4px; vertical-align: -3px; margin-right: 6px; }
      #coBody { left: 300px; top: 620px; }
      #coGl { left: 1124px; top: 470px; flex-direction: row-reverse; }
      #grr { left: 1250px; top: 420px; }
      #grr .disp { font-size: 120px; color: var(--red); }

      /* sahne 3 */
      #nm { position: absolute; left: 930px; top: 210px; }
      #nmModel { left: 930px; top: 210px; }
      #nmClaude { left: 920px; top: 270px; font-size: 300px; }
      #nmClaude::after { content: ''; position: absolute; left: -10px; top: 46%; height: 26px; width: calc(var(--k, 0) * 104%); background: var(--orange); border-radius: 4px; }
      #nmRekt { left: 920px; top: 560px; font-size: 300px; color: var(--orange); -webkit-text-stroke: 4px var(--ink); paint-order: stroke fill; text-shadow: 10px 10px 0 var(--ink); }
      #nmSub { left: 930px; top: 850px; font-size: 28px; }

      /* sahne 4 */
      #memA { left: 1080px; top: 260px; }
      #memA .disp { font-size: 250px; }
      #memA .disp small { font-size: 120px; color: var(--ink2); }
      #memSess { left: 1090px; top: 560px; display: flex; gap: 18px; }
      #memSess .s { font: 700 40px/1 var(--mono); padding: 14px 18px; border: 3px dashed var(--ink2); border-radius: 12px; color: var(--ink2); }
      #memSys { left: 1080px; top: 170px; }
      .file { width: 360px; padding: 18px 20px 20px; }
      .file .fn { font: 700 26px/1 var(--mono); display: flex; align-items: center; gap: 10px; }
      .file .fn::before { content: ''; width: 22px; height: 28px; border: 3px solid var(--ink); border-radius: 3px 10px 3px 3px; background: var(--mustard); flex: none; }
      .file .ll { margin-top: 14px; display: grid; gap: 9px; }
      .file .ll i { display: block; height: 10px; border-radius: 5px; background: var(--rule); }
      .file .ll i.hl { background: var(--orange); width: calc(var(--hl, 0) * 100%); }
      #f1 { left: 1080px; top: 260px; } #f2 { left: 1480px; top: 260px; } #f3 { left: 1080px; top: 470px; } #f4 { left: 1480px; top: 470px; }
      #folder { left: 1290px; top: 300px; width: 380px; height: 300px; }
      #folder .tab { position: absolute; left: 0; top: 0; width: 160px; height: 50px; background: var(--mustard); border: 3px solid var(--ink); border-radius: 14px 14px 0 0; }
      #folder .body { position: absolute; left: 0; top: 36px; width: 380px; height: 264px; background: var(--mustard); border: 3px solid var(--ink); border-radius: 0 18px 18px 18px; box-shadow: 8px 8px 0 var(--ink); display: grid; place-items: center; }
      #folder .body b { font: 700 46px/1 var(--mono); }

      /* sahne 5 */
      #errT { left: 120px; top: 150px; font-size: 230px; color: var(--ink); }
      .verdict { display: flex; flex-direction: column; align-items: center; gap: 16px; }
      .verdict .mk { width: 190px; height: 190px; border-radius: 50%; border: 5px solid var(--ink); display: grid; place-items: center; box-shadow: 8px 8px 0 var(--ink); }
      .verdict .mk svg { width: 110px; height: 110px; }
      #errX { left: 300px; top: 330px; } #errX .mk { background: var(--red); }
      #errOk { left: 1430px; top: 330px; } #errOk .mk { background: var(--green); }
      #rules { left: 1030px; top: 200px; width: 780px; padding: 26px 30px 30px; }
      #rules .hd { display: flex; justify-content: space-between; align-items: center; border-bottom: 3px solid var(--ink); padding-bottom: 16px; margin-bottom: 8px; }
      #rules .hd b { font: 700 32px/1 var(--mono); }
      #rules .r { font: 500 30px/1.25 var(--mono); padding: 14px 0 12px; border-bottom: 2px dashed var(--rule); display: flex; gap: 14px; }
      #rules .r::before { content: '–'; color: var(--orange); font-weight: 700; }
      #rules .r em { font-style: normal; color: var(--ink2); }
      #once { left: 1500px; top: 640px; }

      /* sahne 6 */
      .col { width: 470px; }
      .col .hd { font-size: 150px; }
      .col .it { display: flex; align-items: center; gap: 16px; font: 800 52px/1 var(--disp); font-stretch: 80%; text-transform: uppercase; margin-top: 22px; }
      .col .it .bx { width: 40px; height: 40px; border: 4px solid var(--ink); border-radius: 8px; background: var(--paper); display: grid; place-items: center; flex: none; }
      .col .it .bx::after { content: ''; width: 18px; height: 10px; border-left: 5px solid var(--ink); border-bottom: 5px solid var(--ink); transform: translateY(-3px) rotate(-45deg) scale(var(--k, 0)); }
      #colA { left: 110px; top: 190px; } #colA .hd { color: var(--blue); }
      #colR { left: 1400px; top: 190px; } #colR .hd { color: var(--orange); }
      #colA .role, #colR .role { margin: 18px 0 14px; }
      #yes { left: 1250px; top: 330px; font: 700 54px/1.2 var(--mono); }
      #nope { left: 1180px; top: 520px; font-size: 150px; color: var(--paper); background: var(--red); border: 5px solid var(--ink); padding: 18px 26px 10px; border-radius: 16px; box-shadow: 10px 10px 0 var(--ink); }

      /* sahne 7 */
      .tc { width: 440px; height: 560px; padding: 22px; }
      #c1 { left: 520px; top: 210px; } #c2 { left: 990px; top: 210px; } #c3 { left: 1460px; top: 210px; }
      .tc .top { display: flex; gap: 8px; align-items: center; border-bottom: 3px solid var(--ink); padding-bottom: 14px; }
      .tc .top i { width: 16px; height: 16px; border-radius: 50%; border: 2.5px solid var(--ink); }
      .tc .top i:nth-child(1) { background: var(--red); } .tc .top i:nth-child(2) { background: var(--mustard); } .tc .top i:nth-child(3) { background: var(--green); }
      .tc .top span { margin-left: 10px; font: 600 22px/1 var(--mono); }
      .tc .big { font-size: 130px; margin-top: 20px; }
      .tc .row { display: flex; justify-content: space-between; font: 500 24px/1 var(--mono); padding: 13px 0; border-bottom: 2px dashed var(--rule); }
      .tc .row b { font-weight: 700; }
      .mini { position: relative; width: 150px; height: 160px; }
      .mini .dk { transform-origin: 0 0; }
      #c1 .shot { margin-top: 18px; height: 200px; border: 3px solid var(--ink); border-radius: 10px; background: var(--paper2); position: relative; overflow: hidden; }
      #c1 .shot .hl { position: absolute; left: 20px; top: 30px; font-size: 64px; }
      #c1 .shot .mini { position: absolute; right: 6px; top: 22px; }
      #c2 .heads { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; margin-top: 12px; justify-items: center; }
      #c3 .clock { width: 230px; height: 230px; margin: 26px auto 8px; border: 5px solid var(--ink); border-radius: 50%; position: relative; background: var(--paper2); box-shadow: 6px 6px 0 var(--ink); }
      #c3 .clock i { position: absolute; left: 50%; bottom: 50%; width: 8px; margin-left: -4px; background: var(--ink); border-radius: 4px; transform-origin: 50% 100%; }
      #c3 .clock .h { height: 62px; transform: rotate(calc(var(--hh, 330) * 1deg)); }
      #c3 .clock .m { height: 92px; width: 6px; margin-left: -3px; background: var(--orange); transform: rotate(calc(var(--mm, 0) * 1deg)); }
      #c3 .clock::after { content: ''; position: absolute; left: 50%; top: 50%; width: 18px; height: 18px; margin: -9px; border-radius: 50%; background: var(--ink); }
      #c3 .tm { text-align: center; font-size: 96px; }

      /* sahne 8 */
      #goal { left: 120px; top: 230px; }
      #goal .disp { font-size: 150px; margin-top: 14px; }
      #snip { left: 1290px; top: 250px; width: 520px; padding: 20px 24px; background: #16171A; border-color: var(--ink); color: #c9c6b8; font: 500 24px/1.6 var(--mono); }
      #snip .k { color: var(--mustard); } #snip .s { color: #9FD39A; } #snip .c { color: #6E7079; }
      #snip .by { position: absolute; right: -16px; top: -22px; transform: rotate(4deg); background: var(--orange); color: var(--ink); }
      #bana { left: 110px; top: 300px; font-size: 175px; }
      #bana .strk { position: relative; display: inline-block; }
      #bana .strk::after { content: ''; position: absolute; left: -8px; top: 42%; height: 18px; width: calc(var(--k, 0) * 106%); background: var(--ink); border-radius: 4px; }
      #sana { left: 1225px; top: 380px; font-size: 250px; color: var(--orange); -webkit-text-stroke: 4px var(--ink); paint-order: stroke fill; text-shadow: 10px 10px 0 var(--ink); }
      #chain { left: 0; right: 0; top: 140px; display: flex; justify-content: center; gap: 14px; align-items: center; }
      #chain .st { font: 700 34px/1 var(--mono); padding: 16px 18px; border: 3px solid var(--ink); border-radius: 12px; background: var(--paper); }
      #chain .ar { font: 700 34px/1 var(--mono); }
      #chain .st.hot { background: var(--orange); transform: scale(calc(1 + var(--k, 0) * .25)); box-shadow: 6px 6px 0 var(--ink); }

      /* sahne 9 */
      #arac { left: 140px; top: 180px; font-size: 200px; color: var(--ink2); }
      #arac::after { content: ''; position: absolute; left: -8px; top: 44%; height: 22px; width: calc(var(--k, 0) * 106%); background: var(--orange); border-radius: 4px; }
      #ortak { left: 1170px; top: 180px; font-size: 200px; color: var(--orange); -webkit-text-stroke: 4px var(--ink); paint-order: stroke fill; text-shadow: 9px 9px 0 var(--ink); }
      #yaz { left: 1210px; top: 470px; font-size: 140px; }
      #yaz .cur { width: .3em; height: .74em; vertical-align: 0; }
      #logo { left: 0; right: 0; top: 80px; text-align: center; }
      #logo .disp { font-size: 330px; color: var(--ink); }
      #logo .lbl { margin-top: 20px; color: var(--ink2); }
      #bubble { left: 1110px; top: 300px; max-width: 520px; background: #FBF7EA; border: 4px solid var(--ink); border-radius: 30px; padding: 20px 28px 26px; box-shadow: 8px 9px 0 var(--ink); transform-origin: 0% 100%; }
      #bubble .who { display: inline-block; font: 600 20px/1 var(--mono); letter-spacing: .12em; text-transform: uppercase; background: var(--ink); color: var(--paper); padding: 7px 9px 6px; border-radius: 6px; margin-bottom: 12px; }
      #bubble p { font: 800 64px/1.05 var(--disp); font-stretch: 78%; text-transform: uppercase; min-height: 1.05em; }
      #bubble::before { content: ''; position: absolute; left: 34px; top: 100%; border-style: solid; border-color: var(--ink) transparent transparent transparent; border-width: 40px 0 0 34px; margin-top: 2px; }

      /* geçiş perdeleri */
      .wipe { left: 0; top: -100px; width: 2400px; height: 1280px; transform-origin: center; }
      #wipeA { background: var(--orange); } #wipeB { background: var(--ink); }
    </style>
  </head>
  <body>
    <div id="root" data-composition-id="main" data-start="0" data-duration="/*DURATION*/" data-width="1920" data-height="1080">
      <div id="world" class="clip" data-start="0" data-duration="/*DURATION*/" data-track-index="0">
        <div id="grid"></div>
        <div id="warm" class="el"></div>
        <div id="ground"></div>

        <!-- sahne 2 -->
        <div id="ph" class="el">
          <svg viewBox="-40 0 300 320" width="400" height="427"><path d="M110,40 C150,40 172,110 178,160 C184,205 160,232 110,232 C60,232 36,205 42,160 C48,110 70,40 110,40 Z" fill="none" stroke="#55565C" stroke-width="2.4" stroke-dasharray="7 7"/></svg>
          <div class="t">[ yüz bulunamadı ]</div>
        </div>
        <div id="nameDk" class="el"><div class="disp">Dakay</div><div class="sub"><span class="chip">maskot · Arda'nın</span></div></div>
        <div id="coBody" class="el callout"><div class="tx"><b>Gri yumurta</b><span><i class="sw" style="background:#4C4F56"></i>#4C4F56 · tek parça</span></div><div class="ln"></div><div class="dotc"></div></div>
        <div id="coGl" class="el callout"><div class="tx"><b>Güneş gözlüğü</b><span>hiç çıkmaz. (neredeyse)</span></div><div class="ln"></div><div class="dotc"></div></div>
        <div id="grr" class="el"><div class="disp">Hıh.</div></div>

        <!-- sahne 3 -->
        <div id="nmModel" class="el lbl">altta çalışan model</div>
        <div id="nmClaude" class="el disp">Claude</div>
        <div id="nmRekt" class="el disp">Rekt</div>
        <div id="nmSub" class="el"><span class="chip">Arda'nın düşünme ortağı</span></div>

        <!-- sahne 4 -->
        <div id="memA" class="el"><div class="lbl">kafamdaki hafıza</div><div class="disp">0<small> bayt</small></div></div>
        <div id="memSess" class="el"><div class="s" id="ms1">oturum #1</div><div class="s" id="ms2">#1</div><div class="s" id="ms3">#1</div></div>
        <div id="memSys" class="el"><span class="chip">Arda'nın sistemi</span></div>
        <div id="f1" class="el card file"><div class="fn">Last-Session.md</div><div class="ll"><i class="hl"></i><i style="width:80%"></i><i style="width:60%"></i></div></div>
        <div id="f2" class="el card file"><div class="fn">daily/10-08.md</div><div class="ll"><i class="hl"></i><i style="width:70%"></i><i style="width:85%"></i></div></div>
        <div id="f3" class="el card file"><div class="fn">Threads.md</div><div class="ll"><i class="hl"></i><i style="width:90%"></i><i style="width:50%"></i></div></div>
        <div id="f4" class="el card file"><div class="fn">Kurallar.md</div><div class="ll"><i class="hl"></i><i style="width:65%"></i><i style="width:75%"></i></div></div>
        <div id="folder" class="el"><div class="tab"></div><div class="body"><b>vault/</b></div></div>

        <!-- sahne 5 -->
        <div id="errT" class="el disp">Hata</div>
        <div id="errX" class="el verdict"><div class="mk"><svg viewBox="0 0 100 100"><path d="M24,24 L76,76 M76,24 L24,76" stroke="#0B0B0D" stroke-width="16" stroke-linecap="round"/></svg></div><span class="chip">v1 · çeneye</span></div>
        <div id="errOk" class="el verdict"><div class="mk"><svg viewBox="0 0 100 100"><path d="M20,54 L42,74 L80,28" fill="none" stroke="#0B0B0D" stroke-width="16" stroke-linecap="round" stroke-linejoin="round"/></svg></div><span class="chip">v2 · alna (Arda)</span></div>
        <div id="rules" class="el card">
          <div class="hd"><b>Kurallar.md</b><span class="chip">her düzeltme bir kural</span></div>
          <div class="r" id="r1"><span id="tyR1" data-type="Gözlük alna çıkar, çeneye inmez."></span></div>
          <div class="r" id="r2"><span>Varsayma, sor.</span></div>
          <div class="r" id="r3"><span>Over-engineering yok.</span></div>
          <div class="r" id="r4"><span>Kararı Arda verir.</span></div>
        </div>
        <div id="once" class="el"><span class="chip" style="font-size:30px;padding:12px 14px;background:var(--orange);color:var(--ink);border:3px solid var(--ink)">aynı hata ≠ 2 kez</span></div>

        <!-- sahne 6 -->
        <div id="colA" class="el col"><div class="hd disp">Arda</div><div class="role"><span class="chip">karar verir</span></div>
          <div class="it" id="a1"><span class="bx"></span>Teknoloji</div><div class="it" id="a2"><span class="bx"></span>Mimari</div><div class="it" id="a3"><span class="bx"></span>Kapsam</div></div>
        <div id="colR" class="el col"><div class="hd disp">Rekt</div><div class="role"><span class="chip">önerir · yapar</span></div>
          <div class="it" id="b1"><span class="bx"></span>Öneri</div><div class="it" id="b2"><span class="bx"></span>Uygulama</div><div class="it" id="b3"><span class="bx"></span>Parçalara böl</div></div>
        <div id="yes" class="el">evet.<br>evet.<br>evet.</div>
        <div id="nope" class="el disp">İşe yaramaz</div>

        <!-- sahne 7 -->
        <div id="c1" class="el card tc"><div class="top"><i></i><i></i><i></i><span>ardakaya.com</span></div>
          <div class="shot"><div class="hl disp">Arda<br>Kaya</div><div class="mini" id="mini1"></div></div>
          <div class="row"><span>süre</span><b>tek gün</b></div><div class="row"><span>commit</span><b id="cnt1" data-cnt>12</b></div><div class="row"><span>saat</span><b>11.57 → 18.30</b></div></div>
        <div id="c2" class="el card tc"><div class="top"><i></i><i></i><i></i><span>dakay/</span></div>
          <div class="heads"><div class="mini" id="mini2"></div><div class="mini" id="mini3"></div><div class="mini" id="mini4"></div><div class="mini" id="mini5"></div></div>
          <div class="row"><span>ifade</span><b>8</b></div><div class="row"><span>işi</span><b>laf atmak</b></div></div>
        <div id="c3" class="el card tc"><div class="top"><i></i><i></i><i></i><span>dogrula_gece.py</span></div>
          <div class="clock"><i class="h"></i><i class="m"></i></div><div class="tm disp">23:00</div>
          <div class="row"><span>her gece</span><b>kendini denetler</b></div></div>

        <!-- sahne 8 -->
        <div id="goal" class="el"><span class="chip">hedef</span><div class="disp">Backend</div></div>
        <div id="snip" class="el card"><span class="chip by">yazan: rekt</span>
          <div><span class="k">function</span> kaydet(veri) {</div><div>&nbsp;&nbsp;<span class="c">// düzgün. ama senin değil.</span></div><div>&nbsp;&nbsp;<span class="k">return</span> db.ekle(veri);</div><div>}</div></div>
        <div id="bana" class="el disp"><span class="strk">Bana</span><br><span class="strk">değil,</span></div>
        <div id="sana" class="el disp">Sana.</div>
        <div id="chain" class="el"><div class="st">Yaklaşım</div><div class="ar">→</div><div class="st hot" id="hot">Neden</div><div class="ar">→</div><div class="st">Kod</div><div class="ar">→</div><div class="st">Açıklama</div></div>

        <!-- sahne 9 -->
        <div id="arac" class="el disp">Araç</div>
        <div id="ortak" class="el disp">Ortak</div>
        <div id="yaz" class="el disp"><span id="tyYaz" data-type="Yazarım."></span><span class="cur" id="yazCur"></span></div>
        <div id="logo" class="el"><div class="disp">Rekt</div><div class="lbl">Arda'nın ikinci beyni · görüşürüz</div></div>

        <!-- dakay -->
        <div id="dk" class="dk"></div>
        <div id="bubble" class="el"><span class="who">dakay</span><p><span id="tyBub" data-type="Yüzümü geri ver."></span></p></div>

        <!-- sahne 1: siyah açılış -->
        <div id="black" class="el">
          <div id="term">
            <div id="t1">&gt; <span id="ty1" data-type="selam"></span><span class="cur" id="cur1"></span></div>
            <div id="t2"><span id="ty2" data-type="// önce bir itiraf:"></span></div>
            <div id="t3" class="disp"><span id="ty3" data-type="Benim bir yüzüm yok."></span><span class="cur" id="cur3"></span></div>
          </div>
        </div>

        <!-- HUD + altyazı -->
        <div id="hudL" class="el"><span class="tag" id="hudN">01</span><span id="hudT">soğuk açılış</span></div>
        <div id="hudR" class="el"><span class="dot"></span><span>REKT</span><span class="bars" id="bars"><i></i><i></i><i></i><i></i><i></i><i></i><i></i></span></div>
        <div id="cap" class="el"><div class="box" id="capBox"></div></div>

        <div id="wipeA" class="el wipe"></div>
        <div id="wipeB" class="el wipe"></div>
      </div>

      <!--AUDIO-->
    </div>

    <script>window.TIMELINE = /*TIMELINE*/;</script>
    <!--SCRIPTS-->
  </body>
</html>
