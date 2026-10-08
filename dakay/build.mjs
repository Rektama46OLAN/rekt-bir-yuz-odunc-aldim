// index.template.html + timeline.json + koreografideki sfx() çağrıları -> index.html + assets/sfx_mix.wav
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const DIR = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'));
const rd = p => fs.readFileSync(path.join(DIR, p), 'utf8');
const TL = JSON.parse(rd('timeline.json'));
const DUR = Math.round((TL.total + .2) * 100) / 100;

// koreografiyi DOM'suz çalıştır, efekt çağrılarını topla
const ctx = { console, Math, JSON, Object, Array, String, Number, Set };
ctx.window = ctx; ctx.globalThis = ctx; ctx.window.TIMELINE = TL;
vm.createContext(ctx);
for (const f of ['src/data.js', 'src/engine.js', 'src/scene.js']) vm.runInContext(rd(f), ctx, { filename: f });
const cues = [];
ctx.window.CHOREO(ctx.window.DK_ENGINE, (name, t, vol = .6) => cues.push({ name, t: Math.max(0, t), vol }));
cues.sort((a, b) => a.t - b.t);
console.log('sfx cue:', cues.length);

// efekt izi: her dosya bir kez okunur, asplit ile çoğaltılır
const names = [...new Set(cues.map(c => c.name))];
for (const n of names) if (!fs.existsSync(path.join(DIR, 'assets/sfx', n + '.wav'))) throw new Error('sfx yok: ' + n);
const args = ['-y', '-loglevel', 'error'];
names.forEach(n => args.push('-i', path.join(DIR, 'assets/sfx', n + '.wav')));
const filt = [], labels = [];
names.forEach((n, i) => {
  const mine = cues.filter(c => c.name === n);
  const outs = mine.map((_, k) => `[s${i}_${k}]`);
  filt.push(`[${i}]asplit=${mine.length}${outs.join('')}`);
  mine.forEach((c, k) => {
    const ms = Math.round(c.t * 1000);
    filt.push(`[s${i}_${k}]volume=${c.vol.toFixed(2)},adelay=${ms}|${ms}[d${i}_${k}]`);
    labels.push(`[d${i}_${k}]`);
  });
});
filt.push(`${labels.join('')}amix=inputs=${labels.length}:normalize=0:dropout_transition=0,apad=whole_dur=${DUR},atrim=0:${DUR},alimiter=limit=0.89[out]`);
const fscript = path.join(DIR, 'assets', 'sfx_filter.txt');
fs.writeFileSync(fscript, filt.join(';\n'));
execFileSync('ffmpeg', [...args, '-/filter_complex', fscript, '-map', '[out]', '-ac', '1', '-ar', '44100', path.join(DIR, 'assets', 'sfx_mix.wav')], { stdio: 'inherit' });
fs.unlinkSync(fscript);

const audio = [
  `<audio id="a-voice" src="assets/voice/voice.wav" data-start="0" data-duration="${DUR}" data-track-index="2" data-volume="1.25"></audio>`,
  `<audio id="a-music" src="assets/music/bed.wav" data-start="0" data-duration="${Math.min(DUR, 140)}" data-track-index="3" data-volume="0.5"></audio>`,
  `<audio id="a-sfx" src="assets/sfx_mix.wav" data-start="0" data-duration="${DUR}" data-track-index="4" data-volume="0.75"></audio>`
].join('\n      ');

// betikler satır içine gömülür (lint timeline kaydını satır içinde arıyor)
const scripts = ['src/data.js', 'src/engine.js', 'src/scene.js', 'src/main.js']
  .map(f => `<script>/* ${f} */\n${rd(f)}</script>`).join('\n    ');
const html = rd('src/index.tpl')
  .replace('/*FONTS*/', () => rd('assets/fonts/fonts.css'))
  .replaceAll('/*DURATION*/', String(DUR))
  .replace('/*TIMELINE*/', () => JSON.stringify(TL))
  .replace('<!--AUDIO-->', () => audio)
  .replace('<!--SCRIPTS-->', () => scripts);
fs.writeFileSync(path.join(DIR, 'index.html'), html);
console.log('index.html yazıldı, süre', DUR);
