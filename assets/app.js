/* Квант-7 · v4 — ритм и брейк, синтез и бас, библиотека брейков, коды паттернов. Без зависимостей. */
(() => {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const store = {
    get(k) { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* storage unavailable */ } },
  };
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const comma = s => String(s).replace('.', ',');
  const HEX = '0123456789ABCDEF';
  const BANKS = 'ABCD';

  /* =========================================================
     Parameters
     ========================================================= */
  const WAVES = [{ t: 'sawtooth', ru: 'ПИЛА' }, { t: 'square', ru: 'МЕАНДР' }, { t: 'triangle', ru: 'ТРЕУГ.' }, { t: 'sine', ru: 'СИНУС' }];
  const fmtSec = v => v < 1 ? Math.round(v * 1000) + ' мс' : comma(v.toFixed(2)) + ' с';
  const fmtHz = v => v >= 1000 ? comma((v / 1000).toFixed(1)) + ' кГц' : Math.round(v) + ' Гц';
  const pct = v => Math.round(v * 100) + ' %';
  const DEFS = {
    wave:    { g: 'synth', label: 'ФОРМА',    min: 0,     max: 3,     steps: 4, def: 0,    fmt: v => WAVES[v].ru },
    cutoff:  { g: 'synth', label: 'СРЕЗ',     min: 60,    max: 12000, log: true, def: 520, fmt: fmtHz },
    res:     { g: 'synth', label: 'РЕЗОНАНС', min: 0.5,   max: 20,    def: 13,   fmt: v => 'Q ' + comma(v.toFixed(1)) },
    env:     { g: 'synth', label: 'ОГИБ.',    min: 0,     max: 1,     def: 0.6,  fmt: pct },
    attack:  { g: 'synth', label: 'АТАКА',    min: 0.002, max: 2,     log: true, def: 0.003, fmt: fmtSec },
    release: { g: 'synth', label: 'ЗАТУХ.',   min: 0.02,  max: 3,     log: true, def: 0.22, fmt: fmtSec },
    glide:   { g: 'synth', label: 'ГЛАЙД',    min: 0,     max: 0.5,   def: 0.05, fmt: v => Math.round(v * 1000) + ' мс' },
    drive:   { g: 'synth', label: 'ДРАЙВ',    min: 0,     max: 1,     def: 0.4,  fmt: pct },
    delay:   { g: 'synth', label: 'ДИЛЕЙ',    min: 0,     max: 1,     def: 0.3,  fmt: pct },
    swing:   { g: 'brk', label: 'СВИНГ', min: 0, max: 0.6, def: 0.08, fmt: pct },
    drums:   { g: 'brk', label: 'РИТМ',  min: 0, max: 1,   def: 0.8,  fmt: pct },
    synth:   { g: 'mix', label: 'СИНТ',  min: 0, max: 1,   def: 0.7,  fmt: pct },
    brk:     { g: 'brk', label: 'БРЕЙК', min: 0, max: 1,  def: 0.85, fmt: pct },
    dirt:    { g: 'brk', label: 'ГРЯЗЬ', min: 0, max: 1,  def: 0.25, fmt: pct },
    bpm:     { g: 'bpm', label: 'ТЕМП', min: 70, max: 300, steps: 231, def: 128, fmt: v => v + ' BPM' },
  };
  const KEYS = Object.keys(DEFS);
  const SOUND_KEYS = ['wave', 'cutoff', 'res', 'env', 'attack', 'release', 'glide', 'drive', 'delay'];
  const PRESETS = {
    acid:  { wave: 0, cutoff: 520,  res: 13, env: 0.6,  attack: 0.003, release: 0.22, glide: 0.05, drive: 0.4,  delay: 0.3 },
    thund: { wave: 0, cutoff: 240,  res: 4,  env: 0.3,  attack: 0.004, release: 0.35, glide: 0.08, drive: 0.85, delay: 0.08 },
    bass:  { wave: 0, cutoff: 380,  res: 9,  env: 0.35, attack: 0.004, release: 0.18, glide: 0.03, drive: 0.2,  delay: 0.05 },
    lead:  { wave: 1, cutoff: 2200, res: 7,  env: 0.4,  attack: 0.012, release: 0.45, glide: 0.09, drive: 0.15, delay: 0.45 },
    ether: { wave: 3, cutoff: 5200, res: 1,  env: 0.1,  attack: 0.7,   release: 2.4,  glide: 0.28, drive: 0,    delay: 0.6 },
    pluck: { wave: 2, cutoff: 900,  res: 16, env: 0.75, attack: 0.002, release: 0.12, glide: 0,    drive: 0.3,  delay: 0.4 },
  };

  const P = {};
  KEYS.forEach(k => { P[k] = DEFS[k].def; });

  const toT = (k, v) => {
    const d = DEFS[k];
    if (d.log) return Math.log(v / d.min) / Math.log(d.max / d.min);
    return (v - d.min) / (d.max - d.min);
  };
  const fromT = (k, t) => {
    const d = DEFS[k]; t = Math.min(1, Math.max(0, t));
    if (d.steps) return d.min + Math.round(t * (d.steps - 1)) * (d.max - d.min) / (d.steps - 1);
    if (d.log) return d.min * Math.pow(d.max / d.min, t);
    return d.min + (d.max - d.min) * t;
  };
  const stepT = k => DEFS[k].steps ? 1 / (DEFS[k].steps - 1) : 0.02;

  /* =========================================================
     Patterns
     ========================================================= */
  const DRUMS = ['БОЧКА', 'СНЕЙР', 'КЛЭП', 'ХЭТ ЗАКР.', 'ХЭТ ОТКР.'];
  const PROB = [1, 0.75, 0.5, 0.25];
  const blankNote = () => ({ n: -1, a: 0, s: 0 });
  const blankPattern = () => ({
    d: DRUMS.map(() => Array(16).fill(0)),
    n: Array.from({ length: 16 }, blankNote),
    b: Array(16).fill(-1), rv: Array(16).fill(0), r: Array(16).fill(1), p: Array(16).fill(0),
  });
  function normalize(pat) {
    const out = blankPattern();
    if (!pat || !Array.isArray(pat.d)) return out;
    // v2 stored 4 drum rows: kick, clap, closed hat, open hat
    const rows = pat.d.length === 4 ? [pat.d[0], null, pat.d[1], pat.d[2], pat.d[3]] : pat.d;
    rows.forEach((row, i) => { if (row && i < 5) for (let s = 0; s < 16; s++) out.d[i][s] = row[s] ? 1 : 0; });
    if (Array.isArray(pat.n)) pat.n.forEach((st, s) => { if (st && s < 16) out.n[s] = { n: st.n ?? -1, a: st.a ? 1 : 0, s: st.s ? 1 : 0 }; });
    ['b', 'rv', 'r', 'p'].forEach(k => { if (Array.isArray(pat[k])) for (let s = 0; s < 16; s++) if (typeof pat[k][s] === 'number') out[k][s] = pat[k][s]; });
    return out;
  }
  const isEmpty = pat => pat.d.every(r => r.every(x => !x)) && pat.n.every(x => x.n < 0) && pat.b.every(x => x < 0);
  const _ = [-1];
  function build(rows, line, extra) {
    const pat = blankPattern();
    rows.forEach((r, i) => { for (let s = 0; s < 16; s++) pat.d[i][s] = r[s] === 'x' ? 1 : 0; });
    line.forEach((st, s) => { pat.n[s] = { n: st[0], a: st[1] || 0, s: st[2] || 0 }; });
    if (extra) Object.assign(pat, extra);
    return pat;
  }
  const breakcoreBank = () => build(
    ['x.........x.....', '....x.......x.xx', '................', '................', '................'],
    [[0, 1], _, _, _, _, _, [0, 0, 1], [12], [3, 1], _, _, _, [0, 0, 1], [10], _, [7, 1]],
    {
      b:  [0, 1, 2, 3, 4, 5, 4, 5, 8, 9, 10, 2, 12, 12, 14, 15],
      rv: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0],
      r:  [1, 1, 1, 1, 1, 1, 1, 2, 1, 1, 1, 1, 1, 3, 2, 4],
      p:  [0, 0, 0, 0, 0, 0, 1, 0, 0, 2, 0, 0, 0, 0, 0, 0],
    });
  function defaultBanks() {
    return [
      build(['x...x...x...x...', '................', '....x.......x...', 'xx.xxx.xxx.xxx.x', '..x...x...x...x.'],
        [[0, 1], _, [12, 0, 1], [0], _, [3], [0], _, [10, 1], [0, 0, 1], _, [7], [0], _, [3, 1], [5]]),
      build(['x..x..x...x..x..', '................', '....x.......x..x', 'xxxxxxxxxxxxxxxx', '................'],
        [[0, 1], [0], _, [7, 0, 1], [8], _, [0], [12, 1], _, [0], [3, 0, 1], [5], _, [0], [10, 1], _]),
      build(['x...x...x...x...', '................', '................', '..x...x...x...x.', '......x.......x.'],
        [[0, 1, 1], [0], [0], [0], _, _, [0, 0, 1], [3], _, _, _, _, [0, 1], _, [12], _]),
      breakcoreBank(),
    ];
  }
  let banks = defaultBanks();
  let bank = 0, pendingBank = null;
  let octave = 2;

  /* =========================================================
     7-segment displays
     ========================================================= */
  const H = (y) => `3,${y} 5,${y - 2} 15,${y - 2} 17,${y} 15,${y + 2} 5,${y + 2}`;
  const V = (x, y1, y2) => `${x},${y1} ${x + 2},${y1 + 2} ${x + 2},${y2 - 2} ${x},${y2} ${x - 2},${y2 - 2} ${x - 2},${y1 + 2}`;
  const SEGS = { a: H(2), b: V(18, 3, 16), c: V(18, 18, 31), d: H(32), e: V(2, 18, 31), f: V(2, 3, 16), g: H(17) };
  const GLYPH = { 0: 'abcdef', 1: 'bc', 2: 'abged', 3: 'abgcd', 4: 'fgbc', 5: 'afgcd', 6: 'afgedc', 7: 'abc', 8: 'abcdefg', 9: 'abcdfg', '-': 'g', ' ': '', A: 'abcefg', B: 'cdefg', C: 'adef', D: 'bcdeg', E: 'adefg', F: 'aefg' };
  function makeSeg(el, n) {
    el.innerHTML = '';
    const NS = 'http://www.w3.org/2000/svg', digits = [];
    for (let i = 0; i < n; i++) {
      const svg = document.createElementNS(NS, 'svg'); svg.setAttribute('viewBox', '-2 0 24 34');
      const g = document.createElementNS(NS, 'g'); g.setAttribute('transform', 'skewX(-6) translate(2 0)');
      const polys = {};
      for (const s in SEGS) { const p = document.createElementNS(NS, 'polygon'); p.setAttribute('points', SEGS[s]); g.appendChild(p); polys[s] = p; }
      svg.appendChild(g); el.appendChild(svg); digits.push(polys);
    }
    return str => {
      str = String(str).padStart(n, ' ').slice(-n);
      digits.forEach((polys, i) => { const on = GLYPH[str[i]] ?? ''; for (const s in polys) polys[s].classList.toggle('on', on.includes(s)); });
    };
  }
  const segBpm = makeSeg($('#seg-bpm'), 3);
  const segStep = makeSeg($('#seg-step'), 2);
  const segSlice = makeSeg($('#seg-slice'), 1);
  segStep('--'); segSlice('-');

  /* =========================================================
     Knobs and sliders
     ========================================================= */
  const knobEls = {};
  const isSound = k => DEFS[k].g === 'synth';
  function attachControl(el, k) {
    let startY = 0, startT = 0, dragging = false;
    el.addEventListener('pointerdown', e => {
      dragging = true; startY = e.clientY; startT = toT(k, P[k]);
      el.setPointerCapture(e.pointerId); el.focus({ preventScroll: true });
      if (isSound(k)) clearPreset();
    });
    el.addEventListener('pointermove', e => {
      if (!dragging) return;
      set(k, fromT(k, startT + (startY - e.clientY) / (e.shiftKey ? 900 : 220)));
    });
    const end = () => { dragging = false; };
    el.addEventListener('pointerup', end); el.addEventListener('pointercancel', end);
    el.addEventListener('wheel', e => {
      e.preventDefault(); if (isSound(k)) clearPreset();
      const step = DEFS[k].steps ? Math.sign(-e.deltaY) * stepT(k) : -e.deltaY * 0.0012;
      set(k, fromT(k, toT(k, P[k]) + step));
    }, { passive: false });
    el.addEventListener('dblclick', () => { if (isSound(k)) clearPreset(); set(k, DEFS[k].def); });
    el.addEventListener('keydown', e => {
      const s = stepT(k); let t = toT(k, P[k]);
      if (e.key === 'ArrowUp' || e.key === 'ArrowRight') t += s;
      else if (e.key === 'ArrowDown' || e.key === 'ArrowLeft') t -= s;
      else if (e.key === 'PageUp') t += s * 5;
      else if (e.key === 'PageDown') t -= s * 5;
      else if (e.key === 'Home') t = 0;
      else if (e.key === 'End') t = 1;
      else return;
      e.preventDefault(); e.stopPropagation();
      if (isSound(k)) clearPreset();
      set(k, fromT(k, t));
    });
  }
  const KNOB_HOME = { synth: '#controls', mix: '#syn-mix', brk: '#brk-knobs' };
  KEYS.forEach(k => {
    const d = DEFS[k];
    if (d.g === 'bpm') { knobEls[k] = $('#bpm'); attachControl(knobEls[k], k); return; }
    const el = document.createElement('div');
    el.className = 'knob' + (d.g !== 'synth' ? ' sm' : '');
    el.tabIndex = 0; el.setAttribute('role', 'slider'); el.setAttribute('aria-label', d.label.toLowerCase());
    el.innerHTML = '<div class="dial"><span class="cap"></span></div><span class="kv"></span><span class="kl">' + d.label + '</span>';
    $(KNOB_HOME[d.g]).appendChild(el);
    knobEls[k] = el; attachControl(el, k);
  });
  function render(k) {
    const el = knobEls[k], d = DEFS[k];
    if (d.g === 'bpm') {
      const b = Math.round(P.bpm);
      segBpm(String(b)); $('#hdr-bpm').textContent = b;
      const brk = b >= 160;
      $('#hdr-mode').textContent = $('#tb-mode').textContent = brk ? 'БРЕЙКОР' : 'ТЕХНО';
      document.documentElement.classList.toggle('breakcore', brk);
    } else {
      el.querySelector('.dial').style.setProperty('--t', toT(k, P[k]).toFixed(4));
      el.querySelector('.kv').textContent = d.fmt(P[k]);
    }
    el.setAttribute('aria-valuetext', d.fmt(P[k]));
    el.setAttribute('aria-valuenow', (+P[k]).toFixed(3));
  }
  function set(k, v) {
    P[k] = v; render(k); applyParam(k);
    if (isSound(k)) waveDirty = true;
    updateReadout(); saveSoon();
  }

  const presetBtns = $$('.preset');
  function clearPreset() { presetBtns.forEach(b => b.setAttribute('aria-pressed', 'false')); }
  function usePreset(name) {
    const pr = PRESETS[name]; for (const k in pr) set(k, pr[k]);
    clearPreset(); presetBtns.forEach(b => b.setAttribute('aria-pressed', String(b.dataset.preset === name)));
  }
  presetBtns.forEach(b => b.addEventListener('click', () => { usePreset(b.dataset.preset); ensureAudio(); if (!playing) demoPhrase(); }));

  /* =========================================================
     Keyboard
     ========================================================= */
  const CODES = ['KeyA', 'KeyW', 'KeyS', 'KeyE', 'KeyD', 'KeyF', 'KeyT', 'KeyG', 'KeyY', 'KeyH', 'KeyU', 'KeyJ', 'KeyK'];
  const LETTERS = ['A', 'W', 'S', 'E', 'D', 'F', 'T', 'G', 'Y', 'H', 'U', 'J', 'K'];
  const NAMES = ['C', 'C♯', 'D', 'D♯', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'A♯', 'B'];
  const BLACK = [1, 3, 6, 8, 10];
  const keysEl = $('#keys'), keyEls = [];
  const whiteIdx = [];
  for (let i = 0; i < 13; i++) if (!BLACK.includes(i)) whiteIdx.push(i);
  for (let i = 0; i < 13; i++) {
    const el = document.createElement('div');
    el.className = 'key' + (BLACK.includes(i) ? ' black' : ''); el.dataset.i = i;
    el.innerHTML = '<span>' + LETTERS[i] + '</span>'; keyEls[i] = el;
  }
  whiteIdx.forEach(i => keysEl.appendChild(keyEls[i]));
  BLACK.forEach(i => {
    const left = whiteIdx.indexOf(i - 1), w = 100 / whiteIdx.length, el = keyEls[i];
    el.style.left = 'calc(' + ((left + 1) * w) + '% - ' + (w * 0.3) + '%)';
    el.style.width = (w * 0.6) + '%';
    keysEl.appendChild(el);
  });

  const held = [];
  const pointerNote = new Map();
  keysEl.addEventListener('pointerdown', e => {
    const k = e.target.closest('.key'); if (!k) return;
    e.preventDefault(); keysEl.setPointerCapture(e.pointerId);
    const i = +k.dataset.i; pointerNote.set(e.pointerId, i); press(i);
  });
  keysEl.addEventListener('pointermove', e => {
    if (!pointerNote.has(e.pointerId)) return;
    const k = document.elementFromPoint(e.clientX, e.clientY)?.closest('.key'); if (!k) return;
    const i = +k.dataset.i, prev = pointerNote.get(e.pointerId); if (i === prev) return;
    pointerNote.set(e.pointerId, i); press(i); release(prev);
  });
  const pEnd = e => { if (!pointerNote.has(e.pointerId)) return; release(pointerNote.get(e.pointerId)); pointerNote.delete(e.pointerId); };
  keysEl.addEventListener('pointerup', pEnd); keysEl.addEventListener('pointercancel', pEnd);

  window.addEventListener('keydown', e => {
    if (e.target.closest('input,select,textarea') || e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.code === 'Space') {
      if (e.target.closest('button,[role="slider"],a,label')) return;
      e.preventDefault(); togglePlay(); return;
    }
    if (e.repeat) return;
    if (e.code === 'KeyQ') { stutter(true); return; }
    if (e.code === 'KeyZ') { shiftOct(-1); return; }
    if (e.code === 'KeyX') { shiftOct(1); return; }
    if (e.code === 'KeyR') { toggleRec(); return; }
    const dg = ['Digit1', 'Digit2', 'Digit3', 'Digit4'].indexOf(e.code);
    if (dg >= 0) { chooseBank(dg); return; }
    const i = CODES.indexOf(e.code); if (i < 0) return;
    e.preventDefault(); press(i);
  });
  window.addEventListener('keyup', e => {
    if (e.code === 'KeyQ') { stutter(false); return; }
    const i = CODES.indexOf(e.code); if (i >= 0) release(i);
  });
  window.addEventListener('blur', () => { held.length = 0; keyEls.forEach(k => k.classList.remove('down')); liveOff(); stutter(false); });

  function press(i) {
    ensureAudio();
    const j = held.indexOf(i); if (j >= 0) held.splice(j, 1);
    const legato = held.length > 0;
    held.push(i); keyEls[i].classList.add('down');
    liveOn(i, legato);
    if (playing && recording) recordNote(i);
  }
  function release(i) {
    const j = held.indexOf(i); if (j >= 0) held.splice(j, 1);
    if (!held.includes(i)) keyEls[i].classList.remove('down');
    if (held.length) liveOn(held[held.length - 1], true); else liveOff();
  }
  function shiftOct(d) { octave = Math.min(5, Math.max(0, octave + d)); $('#oct').textContent = 'C' + octave; saveSoon(); }
  $('#oct-down').onclick = () => shiftOct(-1);
  $('#oct-up').onclick = () => shiftOct(1);
  const freqOf = i => 440 * Math.pow(2, ((octave + 1) * 12 + i - 69) / 12);
  const nameOf = i => NAMES[i % 12] + (octave + Math.floor(i / 12));

  /* =========================================================
     Audio graph
     ========================================================= */
  let ctx = null, osc, filt, filt2, vca, shaper, post, synthBus, dly, fb, dlp, send, drumBus, breakBus, dirtShaper, dirtPost, mix, comp, out, anaSynth, anaMix, bufS, bufM, liveEnv;
  let powered = false, liveGate = false, curFreq = 110;
  const makeNoise = c => { const b = c.createBuffer(1, c.sampleRate, c.sampleRate), d = b.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; return b; };

  function ensureAudio() {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); if (!powered) setPower(true); return true; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) { say('Этот браузер не поддерживает Web Audio.'); return false; }
    ctx = new AC();
    osc = ctx.createOscillator(); osc.type = WAVES[P.wave].t; osc.frequency.value = curFreq;
    filt = ctx.createBiquadFilter(); filt.type = 'lowpass';
    filt2 = ctx.createBiquadFilter(); filt2.type = 'lowpass'; filt2.Q.value = 0.7;
    vca = ctx.createGain(); vca.gain.value = 0;
    shaper = ctx.createWaveShaper(); shaper.oversample = '2x';
    post = ctx.createGain();
    synthBus = ctx.createGain();
    dly = ctx.createDelay(2); fb = ctx.createGain(); dlp = ctx.createBiquadFilter(); dlp.type = 'lowpass'; dlp.frequency.value = 3200;
    send = ctx.createGain();
    drumBus = ctx.createGain(); breakBus = ctx.createGain();
    dirtShaper = ctx.createWaveShaper(); dirtPost = ctx.createGain();
    mix = ctx.createGain(); mix.gain.value = 0.8;
    comp = ctx.createDynamicsCompressor(); comp.threshold.value = -12; comp.ratio.value = 4; comp.attack.value = 0.004; comp.release.value = 0.1;
    out = ctx.createGain(); out.gain.value = 0;
    anaSynth = ctx.createAnalyser(); anaSynth.fftSize = 2048; bufS = new Float32Array(anaSynth.fftSize);
    anaMix = ctx.createAnalyser(); anaMix.fftSize = 512; bufM = new Float32Array(anaMix.fftSize);

    osc.connect(filt); filt.connect(filt2); filt2.connect(vca); vca.connect(shaper); shaper.connect(post); post.connect(synthBus);
    synthBus.connect(anaSynth); synthBus.connect(mix);
    synthBus.connect(send); send.connect(dly); dly.connect(dlp); dlp.connect(fb); fb.connect(dly); dlp.connect(mix);
    drumBus.connect(dirtShaper); breakBus.connect(dirtShaper); dirtShaper.connect(dirtPost); dirtPost.connect(mix);
    mix.connect(comp); comp.connect(out); out.connect(anaMix); out.connect(ctx.destination);

    liveEnv = { c: ctx, dest: drumBus, noise: makeNoise(ctx), openHat: null };
    KEYS.forEach(applyParam);
    osc.start();
    setPower(true);
    if (!brk.buf) selectBreak(libId === 'custom' ? 'amen' : libId);
    return true;
  }
  function driveCurve(d) {
    const n = 1024, c = new Float32Array(n), k = d * 30;
    for (let i = 0; i < n; i++) { const x = i / (n - 1) * 2 - 1; c[i] = (1 + k) * x / (1 + k * Math.abs(x)); }
    return c;
  }
  function crushCurve(d) {
    if (d < 0.01) return null;
    const n = 2048, c = new Float32Array(n), k = 1 + d * 10, levels = Math.pow(2, 16 - d * 13) / 2, norm = Math.tanh(k);
    for (let i = 0; i < n; i++) { const x = i / (n - 1) * 2 - 1; c[i] = Math.round(Math.tanh(k * x) / norm * levels) / levels; }
    return c;
  }
  function applyParam(k) {
    if (!ctx) return;
    const now = ctx.currentTime;
    switch (k) {
      case 'wave': osc.type = WAVES[P.wave].t; break;
      case 'cutoff':
        if (!playing && !liveGate) { filt.frequency.cancelScheduledValues(now); filt.frequency.setTargetAtTime(P.cutoff, now, 0.03); }
        filt2.frequency.setTargetAtTime(Math.min(18000, P.cutoff * 1.6), now, 0.03); break;
      case 'res': filt.Q.setTargetAtTime(P.res, now, 0.02); break;
      case 'drive': shaper.curve = driveCurve(P.drive); post.gain.setTargetAtTime(1 / (1 + P.drive * 1.2), now, 0.02); break;
      case 'delay':
      case 'bpm':
        dly.delayTime.setTargetAtTime(3 * 60 / P.bpm / 4, now, 0.05);
        fb.gain.setTargetAtTime(0.2 + P.delay * 0.45, now, 0.05);
        send.gain.setTargetAtTime(P.delay * 0.7, now, 0.05); break;
      case 'synth': synthBus.gain.setTargetAtTime(P.synth * 0.55, now, 0.02); break;
      case 'drums': drumBus.gain.setTargetAtTime(P.drums, now, 0.02); break;
      case 'brk': breakBus.gain.setTargetAtTime(P.brk * 1.1, now, 0.02); break;
      case 'dirt': dirtShaper.curve = crushCurve(P.dirt); dirtPost.gain.setTargetAtTime(1 / (1 + P.dirt * 0.9), now, 0.02); break;
    }
  }
  function setPower(on) {
    powered = on;
    $('#power').setAttribute('aria-pressed', String(on));
    $('#lamp-power').classList.toggle('on', on);
    $('#ro-mode').textContent = on ? 'ЖИВОЙ СИГНАЛ' : 'ДЕМО';
    if (ctx) { out.gain.setTargetAtTime(on ? 1 : 0, ctx.currentTime, 0.03); if (on && ctx.state === 'suspended') ctx.resume(); }
    if (!on && playing) stopSeq();
  }
  $('#power').addEventListener('click', () => { if (!ctx) ensureAudio(); else setPower(!powered); });

  /* ---- synth voice ---- */
  function trigger(t, f, acc, slideIn) {
    const fr = osc.frequency;
    fr.cancelScheduledValues(t);
    if (slideIn) fr.setTargetAtTime(f, t, 0.02 + P.glide / 3);
    else fr.setValueAtTime(f, t);
    const g = vca.gain, cf = filt.frequency;
    g.cancelScheduledValues(t);
    if (slideIn) return;
    const tc = Math.max(0.001, P.attack / 4);
    g.setTargetAtTime(acc ? 1 : 0.7, t, tc);
    const peak = Math.min(16000, P.cutoff * (1 + P.env * (acc ? 14 : 8)));
    cf.cancelScheduledValues(t);
    cf.setTargetAtTime(peak, t, Math.max(0.002, tc));
    cf.setTargetAtTime(P.cutoff, t + P.attack + 0.004, 0.04 + P.release * 0.25 * (acc ? 0.7 : 1));
  }
  function releaseAt(t) { vca.gain.setTargetAtTime(0, t, Math.max(0.005, P.release / 5)); }
  function liveOn(i, legato) {
    curFreq = freqOf(i);
    $('#ro-note').textContent = nameOf(i) + ' · ' + comma(curFreq.toFixed(1)) + ' Гц';
    if (!ctx || !powered) return;
    const now = ctx.currentTime;
    if (legato && P.glide > 0.001) trigger(now, curFreq, 0, true);
    else if (legato) { osc.frequency.cancelScheduledValues(now); osc.frequency.setValueAtTime(curFreq, now); }
    else trigger(now, curFreq, 0, false);
    liveGate = true;
  }
  function liveOff() { liveGate = false; if (ctx) releaseAt(ctx.currentTime); }
  function demoPhrase() {
    if (!ctx) return;
    const t0 = ctx.currentTime + 0.05, d = 60 / P.bpm / 4;
    [[0, 1], [12, 0], [0, 0], [10, 1], [7, 0], [3, 0]].forEach(([n, a], i) => { const t = t0 + i * d; trigger(t, freqOf(n), a, false); releaseAt(t + d * 0.6); });
  }

  /* ---- drums: each voice takes an env {c, dest, noise} so it also renders offline ---- */
  function kick(E, t, v) {
    const { c } = E, o = c.createOscillator(), g = c.createGain();
    o.frequency.setValueAtTime(170, t); o.frequency.exponentialRampToValueAtTime(50, t + 0.1); o.frequency.exponentialRampToValueAtTime(38, t + 0.4);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(1.1 * v, t + 0.003); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.45);
    o.connect(g); g.connect(E.dest); o.start(t); o.stop(t + 0.48);
    const n = c.createBufferSource(), ng = c.createGain(), hp = c.createBiquadFilter();
    n.buffer = E.noise; hp.type = 'highpass'; hp.frequency.value = 2500;
    ng.gain.setValueAtTime(0.25 * v, t); ng.gain.exponentialRampToValueAtTime(0.0001, t + 0.012);
    n.connect(hp); hp.connect(ng); ng.connect(E.dest); n.start(t); n.stop(t + 0.02);
  }
  function snare(E, t, v) {
    const { c } = E, o = c.createOscillator(), og = c.createGain();
    o.type = 'triangle'; o.frequency.setValueAtTime(240, t); o.frequency.exponentialRampToValueAtTime(170, t + 0.06);
    og.gain.setValueAtTime(0.0001, t); og.gain.exponentialRampToValueAtTime(0.7 * v, t + 0.002); og.gain.exponentialRampToValueAtTime(0.0001, t + 0.1);
    o.connect(og); og.connect(E.dest); o.start(t); o.stop(t + 0.12);
    const n = c.createBufferSource(), hp = c.createBiquadFilter(), ng = c.createGain();
    n.buffer = E.noise; hp.type = 'highpass'; hp.frequency.value = 1400;
    ng.gain.setValueAtTime(0.0001, t); ng.gain.exponentialRampToValueAtTime(0.75 * v, t + 0.002); ng.gain.exponentialRampToValueAtTime(0.0001, t + 0.19);
    n.connect(hp); hp.connect(ng); ng.connect(E.dest); n.start(t, Math.random() * 0.5); n.stop(t + 0.21);
  }
  function clap(E, t, v) {
    const { c } = E, s = c.createBufferSource(), bp = c.createBiquadFilter(), g = c.createGain();
    s.buffer = E.noise; bp.type = 'bandpass'; bp.frequency.value = 1300; bp.Q.value = 1.2;
    g.gain.setValueAtTime(0.0001, t);
    [0, 0.011, 0.022].forEach(o => { g.gain.setValueAtTime(0.8 * v, t + o); g.gain.exponentialRampToValueAtTime(0.08 * v, t + o + 0.009); });
    g.gain.setValueAtTime(0.6 * v, t + 0.032); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.22);
    s.connect(bp); bp.connect(g); g.connect(E.dest); s.start(t, Math.random() * 0.5); s.stop(t + 0.25);
  }
  function hat(E, t, v, open) {
    const { c } = E, s = c.createBufferSource(), hp = c.createBiquadFilter(), g = c.createGain();
    s.buffer = E.noise; hp.type = 'highpass'; hp.frequency.value = open ? 6500 : 8000;
    const len = open ? 0.32 : 0.045;
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.42 * v, t + 0.002); g.gain.exponentialRampToValueAtTime(0.0001, t + len);
    s.connect(hp); hp.connect(g); g.connect(E.dest); s.start(t, Math.random() * 0.5); s.stop(t + len + 0.02);
    if (open) E.openHat = g;
    else if (E.openHat) { E.openHat.gain.cancelScheduledValues(t); E.openHat.gain.setTargetAtTime(0.0001, t, 0.008); E.openHat = null; }
  }
  const DRUM_FN = [kick, snare, clap, (E, t, v) => hat(E, t, v, false), (E, t, v) => hat(E, t, v, true)];

  /* =========================================================
     Break slicer
     ========================================================= */
  const brk = { buf: null, rev: null, name: '', builtin: true, fit: true };
  function reversed(buf) {
    const r = ctx.createBuffer(buf.numberOfChannels, buf.length, buf.sampleRate);
    for (let ch = 0; ch < buf.numberOfChannels; ch++) { const a = buf.getChannelData(ch), b = r.getChannelData(ch); for (let i = 0, n = a.length; i < n; i++) b[i] = a[n - 1 - i]; }
    return r;
  }
  function setBreak(buf, name, builtin) {
    brk.buf = buf; brk.rev = reversed(buf); brk.name = name; brk.builtin = builtin;
    $('#brk-name').textContent = name;
    $('#brk-len').textContent = comma(buf.duration.toFixed(2)) + ' с · ' + (buf.numberOfChannels > 1 ? 'стерео' : 'моно');
    drawBreakWave();
  }
  /* Break library: famous break rhythms re-played from scratch with the synth voices (no recordings). */
  const LIB = [
    { id: 'amen',   name: 'Амен-ритм',  bpm: 136, note: 'рисунок в духе Amen Brother, райд на восьмых', drive: 0.35, tone: 7500, swing: 0, room: 0.18,
      k: [[0, 1], [2, 0.9], [10, 1], [11, 0.85]], s: [[4, 1], [7, 0.55], [9, 0.5], [12, 1], [15, 0.6]], ride: 8 },
    { id: 'think',  name: 'Тинк-ритм',  bpm: 112, note: 'плотные шестнадцатые хэты, сухой снейр', drive: 0.25, tone: 9500, swing: 0.04, room: 0.08,
      k: [[0, 1], [7, 0.8], [10, 0.9]], s: [[4, 1], [12, 1], [14, 0.35]], hats: 16, oh: [[6, 0.45]] },
    { id: 'apache', name: 'Апач-ритм',  bpm: 118, note: 'бочка с подскоком и томы-бонги', drive: 0.3, tone: 8000, swing: 0.06, room: 0.22,
      k: [[0, 1], [3, 0.7], [8, 1], [10, 0.8]], s: [[4, 1], [12, 1]], hats: 8, tom: [[2, 0.6], [6, 0.5], [11, 0.65], [14, 0.7], [15, 0.5]] },
    { id: 'funky',  name: 'Фанки-ритм', bpm: 100, note: 'призрачные ноты на снейре, свинг', drive: 0.2, tone: 9000, swing: 0.12, room: 0.12,
      k: [[0, 1], [2, 0.8], [6, 0.8], [10, 1], [13, 0.7]], s: [[4, 1], [7, 0.3], [9, 0.35], [12, 1], [15, 0.3]], hats: 16, oh: [[14, 0.5]] },
    { id: 'zgrad',  name: 'Зеленоград', bpm: 170, note: 'наш собственный, под джангл', drive: 0.35, tone: 9000, swing: 0.08, room: 0.1,
      k: [[0, 1], [2, 0.55], [10, 1], [11, 0.7]], s: [[4, 1], [7, 0.32], [9, 0.4], [12, 1], [15, 0.35]], hats: 16, oh: [[14, 0.6]] },
    { id: 'gabber', name: 'Габбер',     bpm: 200, note: 'перегруженная бочка в каждую долю', drive: 0.95, tone: 6000, swing: 0, room: 0.05,
      gk: [[0, 1], [4, 1], [8, 1], [12, 1]], hats: 'off' },
  ];
  const libCache = new Map();
  let libId = 'amen', customBuf = null;
  function ride(E, t, v) {
    const { c } = E, bp = c.createBiquadFilter(), hp = c.createBiquadFilter(), g = c.createGain();
    bp.type = 'bandpass'; bp.frequency.value = 8200; bp.Q.value = 0.8; hp.type = 'highpass'; hp.frequency.value = 5200;
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.22 * v, t + 0.002); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.7);
    bp.connect(hp); hp.connect(g); g.connect(E.dest);
    [2, 3, 4.16, 5.43, 6.79, 8.21].forEach(m => { const o = c.createOscillator(); o.type = 'square'; o.frequency.value = 76 * m; o.connect(bp); o.start(t); o.stop(t + 0.72); });
  }
  function tom(E, t, v) {
    const { c } = E, o = c.createOscillator(), g = c.createGain();
    o.frequency.setValueAtTime(260, t); o.frequency.exponentialRampToValueAtTime(150, t + 0.18);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.7 * v, t + 0.003); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.28);
    o.connect(g); g.connect(E.dest); o.start(t); o.stop(t + 0.3);
  }
  function gabberKick(E, t, v) {
    const { c } = E, o = c.createOscillator(), sh = c.createWaveShaper(), g = c.createGain();
    sh.curve = driveCurve(1);
    o.frequency.setValueAtTime(320, t); o.frequency.exponentialRampToValueAtTime(58, t + 0.05); o.frequency.exponentialRampToValueAtTime(48, t + 0.3);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.9 * v, t + 0.002); g.gain.setTargetAtTime(0.0001, t + 0.18, 0.05);
    o.connect(sh); sh.connect(g); g.connect(E.dest); o.start(t); o.stop(t + 0.42);
  }
  async function renderLib(def) {
    const sr = ctx.sampleRate, sd = 60 / def.bpm / 4, len = Math.round(16 * sd * sr);
    const oc = new OfflineAudioContext(1, len + Math.round(0.8 * sr), sr);
    const bus = oc.createGain(); bus.gain.value = 0.7;
    const sat = oc.createWaveShaper(); sat.curve = driveCurve(def.drive);
    const tone = oc.createBiquadFilter(); tone.type = 'lowpass'; tone.frequency.value = def.tone;
    const room = oc.createDelay(0.1), rfb = oc.createGain(), rmix = oc.createGain();
    room.delayTime.value = 0.027; rfb.gain.value = 0.35; rmix.gain.value = def.room;
    bus.connect(sat); sat.connect(tone); tone.connect(oc.destination);
    tone.connect(room); room.connect(rfb); rfb.connect(room); room.connect(rmix); rmix.connect(oc.destination);
    const E = { c: oc, dest: bus, noise: makeNoise(oc), openHat: null };
    const at = st => st * sd + (st % 2 ? sd * def.swing : 0);
    const hit = (fn, list) => (list || []).forEach(([st, v]) => fn(E, at(st), v));
    hit(kick, def.k); hit(gabberKick, def.gk); hit(snare, def.s); hit(tom, def.tom);
    const ohSteps = (def.oh || []).map(x => x[0]);
    for (let st = 0; st < 16; st++) {
      if (!ohSteps.includes(st)) {
        if (def.hats === 16) hat(E, at(st), st % 2 ? 0.32 : 0.62, false);
        else if (def.hats === 8 && st % 2 === 0) hat(E, at(st), st % 4 ? 0.45 : 0.65, false);
        else if (def.hats === 'off' && st % 4 === 2) hat(E, at(st), 0.8, false);
      }
      if (def.ride === 8 && st % 2 === 0) ride(E, at(st), st % 4 ? 0.7 : 1);
    }
    (def.oh || []).forEach(([st, v]) => hat(E, at(st), v, true));
    const rendered = await oc.startRendering();
    const buf = ctx.createBuffer(1, len, sr);
    const a = rendered.getChannelData(0), b = buf.getChannelData(0);
    for (let i = 0; i < len; i++) b[i] = a[i] + (i < a.length - len ? a[len + i] : 0); // fold the tail back so the loop is seamless
    return buf;
  }
  async function selectBreak(id) {
    const def = LIB.find(d => d.id === id) || LIB[0];
    libId = def.id; renderLib_ui();
    if (!ctx) { $('#brk-name').textContent = def.name; return; }
    $('#brk-len').textContent = 'собираю…';
    let buf = libCache.get(def.id);
    if (!buf) { buf = await renderLib(def); libCache.set(def.id, buf); }
    if (libId !== def.id) return;
    setBreak(buf, def.name + ' · ' + def.bpm + ' BPM', true);
    saveSoon();
  }
  function renderLib_ui() {
    const el = $('#lib');
    if (!el.childElementCount) {
      LIB.forEach(d => {
        const b = document.createElement('button'); b.type = 'button'; b.className = 'lib-item'; b.dataset.id = d.id;
        b.innerHTML = '<b>' + d.name + '</b><span><em>' + d.bpm + '</em> ' + d.note + '</span>';
        b.addEventListener('click', async () => { if (!ensureAudio()) return; await selectBreak(d.id); auditionBreak(); });
        el.appendChild(b);
      });
      const c = document.createElement('button'); c.type = 'button'; c.className = 'lib-item custom'; c.dataset.id = 'custom'; c.hidden = true;
      c.innerHTML = '<b id="lib-custom-name">Свой файл</b><span>загружен с вашего устройства</span>';
      c.addEventListener('click', () => { if (customBuf) { libId = 'custom'; setBreak(customBuf.buf, customBuf.name, false); renderLib_ui(); auditionBreak(); } });
      el.appendChild(c);
    }
    $$('.lib-item', el).forEach(b => b.setAttribute('aria-pressed', String(b.dataset.id === libId)));
  }
  function auditionBreak() {
    if (!ctx || !brk.buf || playing) return;
    const t0 = ctx.currentTime + 0.05, d = stepDur();
    for (let i = 0; i < 16; i++) playSlice(t0 + i * d, i, 0, d);
  }
  function playSlice(t, idx, rev, dur) {
    if (!brk.buf) return;
    const b = rev ? brk.rev : brk.buf, sl = b.duration / 16;
    const rate = brk.fit ? b.duration / (16 * stepDur()) : 1;
    const src = ctx.createBufferSource(), g = ctx.createGain();
    src.buffer = b; src.playbackRate.value = rate;
    const off = (rev ? 15 - idx : idx) * sl;
    g.gain.setValueAtTime(1, t);
    g.gain.setTargetAtTime(0, t + Math.max(0.004, dur - 0.006), 0.002);
    src.connect(g); g.connect(breakBus);
    src.start(t, off); src.stop(t + dur + 0.02);
  }
  async function loadFile(file) {
    if (!file) return;
    if (!ensureAudio()) return;
    try {
      const data = await file.arrayBuffer();
      const buf = await ctx.decodeAudioData(data);
      if (buf.duration < 0.2) { say('Файл слишком короткий: нужен луп хотя бы на 0,2 секунды.'); return; }
      const nm = file.name.replace(/\.[^.]+$/, '');
      customBuf = { buf, name: nm }; libId = 'custom';
      setBreak(buf, nm, false);
      $('.lib-item.custom').hidden = false; $('#lib-custom-name').textContent = 'Свой: ' + nm; renderLib_ui();
      say('Сэмпл загружен и разрезан на 16 частей. Лучше всего работает луп ровно в один такт.' + (buf.duration > 8 ? ' Этот файл длиннее 8 секунд, части получатся длинными.' : ''));
    } catch {
      say('Не получилось прочитать файл. Подойдут WAV, MP3, OGG или FLAC.');
    }
  }
  $('#brk-file').addEventListener('change', e => { loadFile(e.target.files[0]); e.target.value = ''; });
  const brkEl = $('#break');
  ['dragenter', 'dragover'].forEach(ev => brkEl.addEventListener(ev, e => { e.preventDefault(); brkEl.classList.add('drop'); }));
  ['dragleave', 'drop'].forEach(ev => brkEl.addEventListener(ev, e => { e.preventDefault(); brkEl.classList.remove('drop'); }));
  brkEl.addEventListener('drop', e => loadFile(e.dataTransfer?.files?.[0]));
  $('#brk-fit').addEventListener('click', e => { brk.fit = !brk.fit; e.currentTarget.setAttribute('aria-pressed', String(brk.fit)); say(brk.fit ? 'Брейк подстраивается под темп (меняется и высота).' : 'Брейк играет со своей скоростью.'); });

  /* stutter: hold to repeat the current step in 32nds */
  let stutterOn = false, stutterStep = 0;
  function stutter(on) {
    if (on === stutterOn) return;
    stutterOn = on && playing; stutterStep = lastPlayed.s;
    $('#stutter').classList.toggle('on', stutterOn);
  }
  const stBtn = $('#stutter');
  stBtn.addEventListener('pointerdown', e => { e.preventDefault(); stBtn.setPointerCapture(e.pointerId); stutter(true); });
  ['pointerup', 'pointercancel'].forEach(ev => stBtn.addEventListener(ev, () => stutter(false)));
  stBtn.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); if (!e.repeat) stutter(true); } });
  stBtn.addEventListener('keyup', e => { if (e.key === 'Enter' || e.key === ' ') stutter(false); });

  /* break waveform */
  const bw = $('#brk-wave'), bg = bw.getContext('2d');
  let bwW = 0, bwH = 0, peaks = null, curSlice = -1;
  function resizeBreak() {
    const dpr = Math.min(2, window.devicePixelRatio || 1), r = bw.getBoundingClientRect();
    bwW = r.width; bwH = r.height; bw.width = Math.max(1, bwW * dpr); bw.height = Math.max(1, bwH * dpr); bg.setTransform(dpr, 0, 0, dpr, 0, 0);
    peaks = null; drawBreakWave();
  }
  function drawBreakWave() {
    if (!bwW) return;
    bg.fillStyle = C.win; bg.fillRect(0, 0, bwW, bwH);
    const sw = bwW / 16;
    if (curSlice >= 0) { bg.fillStyle = 'rgba(255,174,43,.16)'; bg.fillRect(curSlice * sw, 0, sw, bwH); }
    bg.strokeStyle = C.grid; bg.lineWidth = 1; bg.beginPath();
    for (let i = 1; i < 16; i++) { const x = Math.round(i * sw) + 0.5; bg.moveTo(x, 0); bg.lineTo(x, bwH); }
    bg.stroke();
    if (brk.buf) {
      const cols = Math.max(1, Math.floor(bwW));
      if (!peaks || peaks.length !== cols) {
        const d = brk.buf.getChannelData(0), per = Math.max(1, Math.floor(d.length / cols)); peaks = new Float32Array(cols);
        let mxp = 0.001;
        for (let x = 0; x < cols; x++) { let m = 0; for (let i = x * per, e = Math.min(d.length, i + per); i < e; i += 4) m = Math.max(m, Math.abs(d[i])); peaks[x] = m; mxp = Math.max(mxp, m); }
        for (let x = 0; x < cols; x++) peaks[x] /= mxp;
      }
      bg.fillStyle = C.amber;
      for (let x = 0; x < peaks.length; x++) {
        const h = Math.max(1, peaks[x] * (bwH - 20) / 2);
        bg.globalAlpha = curSlice >= 0 && Math.floor(x / sw) === curSlice ? 1 : 0.6;
        bg.fillRect(x, bwH / 2 - h, 1, h * 2);
      }
      bg.globalAlpha = 1;
    } else {
      bg.fillStyle = C.muted; bg.font = '12px "IBM Plex Mono", monospace'; bg.textAlign = 'center';
      bg.fillText('ВКЛЮЧИТЕ ПИТАНИЕ ИЛИ ВЫБЕРИТЕ БРЕЙК', bwW / 2, bwH / 2 + 4);
    }
    bg.fillStyle = C.muted; bg.font = '9.5px "IBM Plex Mono", monospace'; bg.textAlign = 'center';
    for (let i = 0; i < 16; i++) bg.fillText(HEX[i], i * sw + sw / 2, bwH - 4);
  }

  /* =========================================================
     Sequencer
     ========================================================= */
  let playing = false, recording = false, curStep = 0, nextTime = 0, timer = null;
  const queue = [];
  let drawnStep = -1, lastPlayed = { s: 0, t: 0 };
  const stepDur = () => 60 / P.bpm / 4;

  function startSeq() {
    if (!ensureAudio()) return;
    if (!powered) setPower(true);
    playing = true; curStep = 0; nextTime = ctx.currentTime + 0.08;
    timer = setInterval(tick, 25); tick();
    syncTransport();
  }
  function stopSeq() {
    playing = false; clearInterval(timer); timer = null; queue.length = 0; stutter(false);
    if (ctx) releaseAt(ctx.currentTime);
    if (pendingBank !== null) { bank = pendingBank; pendingBank = null; renderSeq(); }
    drawnStep = -1; paintPlayhead(-1); segStep('--'); segSlice('-'); $('#hdr-step').textContent = '--';
    curSlice = -1; drawBreakWave();
    syncTransport();
  }
  const togglePlay = () => (playing ? stopSeq() : startSeq());
  function syncTransport() {
    $('#play').setAttribute('aria-pressed', String(playing));
    $('#play').lastChild.textContent = playing ? 'Стоп' : 'Старт';
    $$('.scene').forEach(b => b.classList.toggle('live', playing && b.dataset.scene === activeScene));
  }
  $('#play').addEventListener('click', togglePlay);

  /* scenes: one click from the hero */
  let activeScene = '';
  const SCENES = {
    techno: () => { chooseBank(0, true); set('bpm', 128); set('dirt', 0.2); usePreset('acid'); },
    breakcore: () => {
      if (isEmpty(banks[3])) banks[3] = breakcoreBank();
      chooseBank(3, true); set('bpm', 190); set('dirt', 0.45); usePreset('thund');
    },
  };
  $$('.scene').forEach(b => b.addEventListener('click', () => {
    const name = b.dataset.scene;
    if (playing && activeScene === name) { stopSeq(); return; }
    activeScene = name; SCENES[name]();
    if (!playing) startSeq(); else syncTransport();
    if (b.closest('.hero')) $('#transport').scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
  }));

  function toggleRec() {
    recording = !recording;
    $('#rec').setAttribute('aria-pressed', String(recording));
    say(recording ? 'Запись включена: ноты с клавиатуры встают на ближайший шаг.' : 'Запись выключена.');
  }
  $('#rec').addEventListener('click', toggleRec);

  function tick() {
    while (nextTime < ctx.currentTime + 0.12) {
      if (curStep === 0 && pendingBank !== null) { bank = pendingBank; pendingBank = null; queue.push({ s: -2, t: nextTime }); }
      const d = stepDur();
      const t = nextTime + (curStep % 2 ? P.swing * d * 0.6 : 0);
      scheduleStep(curStep, t, d);
      nextTime += d; curStep = (curStep + 1) % 16;
    }
  }
  function scheduleStep(s, t, d) {
    const pat = banks[bank];
    const src = stutterOn ? stutterStep : s;
    const rat = stutterOn ? Math.max(2, pat.r[src]) : pat.r[src];
    const fire = stutterOn || Math.random() < PROB[pat.p[src]];
    let kicked = false, hitHard = false, slice = -1;
    if (fire) {
      const sub = d / rat;
      pat.d.forEach((row, r) => {
        if (!row[src]) return;
        for (let k = 0; k < rat; k++) DRUM_FN[r](liveEnv, t + k * sub, k ? 0.82 : 1);
        if (r === 0) kicked = true; if (r === 1 || r === 2) hitHard = true;
      });
      if (pat.b[src] >= 0) { slice = pat.b[src]; for (let k = 0; k < rat; k++) playSlice(t + k * sub, slice, pat.rv[src], sub); if (rat > 1) hitHard = true; }
    }
    if (!stutterOn) {
      const st = pat.n[s], prev = pat.n[(s + 15) % 16], next = pat.n[(s + 1) % 16];
      if (st.n >= 0) {
        const slideIn = prev.n >= 0 && prev.s === 1;
        const hold = st.s === 1 && next.n >= 0;
        trigger(t, freqOf(st.n), st.a, slideIn);
        if (!hold) releaseAt(t + d * 0.55);
      }
    }
    queue.push({ s, t, kick: kicked, hard: hitHard || stutterOn, slice });
  }
  function recordNote(i) {
    const d = stepDur(), now = ctx.currentTime;
    let s = lastPlayed.s;
    if (now - lastPlayed.t > d / 2) s = (s + 1) % 16;
    banks[bank].n[s] = { n: i, a: 0, s: 0 };
    renderSeq(); saveSoon();
  }

  /* ---- grids: rhythm + break in module 1, bass roll in module 2; one shared playhead ---- */
  const gridEls = [$('#seq-drums'), $('#seq-notes')];
  let cols = [];
  function buildSeq() {
    cols = Array.from({ length: 16 }, () => []);
    gridEls.forEach(g => { g.innerHTML = ''; });
    const nums = g => {
      const el = document.createElement('div'); el.className = 'stepnums';
      el.innerHTML = '<span></span>' + Array.from({ length: 16 }, (_x, s) => '<span data-s="' + s + '">' + String(s + 1).padStart(2, '0') + '</span>').join('');
      g.appendChild(el); $$('span[data-s]', el).forEach(sp => cols[+sp.dataset.s].push(sp));
    };
    const gap = g => { const el = document.createElement('div'); el.className = 'gap'; g.appendChild(el); };
    const addRow = (g, label, cls, attrs, black) => {
      const l = document.createElement('div'); l.className = 'rl' + (black ? ' black' : ''); l.textContent = label; g.appendChild(l);
      for (let s = 0; s < 16; s++) {
        const b = document.createElement('button'); b.type = 'button';
        b.className = 'cell ' + cls + (Math.floor(s / 4) % 2 === 0 ? ' q' : '') + (black ? ' bk' : '');
        b.dataset.s = s; for (const k in attrs) b.dataset[k] = attrs[k];
        b.setAttribute('aria-label', label.toLowerCase() + ', шаг ' + (s + 1));
        g.appendChild(b); cols[s].push(b);
      }
    };
    const [gd, gn] = gridEls;
    nums(gd);
    addRow(gd, 'БРЕЙК', 't br', { k: 'b' });
    addRow(gd, 'РЕВЕРС', 'flag', { k: 'rv' });
    addRow(gd, 'ДРОБЬ', 't rt', { k: 'r' });
    addRow(gd, 'ШАНС', 't pr', { k: 'p' });
    gap(gd);
    DRUMS.forEach((name, r) => addRow(gd, name, 'd', { r }));
    nums(gn);
    for (let n = 12; n >= 0; n--) addRow(gn, NAMES[n % 12] + (n === 12 ? '+' : ''), 'n', { n }, BLACK.includes(n % 12));
    gap(gn);
    addRow(gn, 'АКЦ', 'acc', { k: 'a' });
    addRow(gn, 'СЛАЙД', 'sld', { k: 'sl' });
  }
  const allCells = () => gridEls.flatMap(g => $$('.cell', g));
  const onGridClick = e => {
    const b = e.target.closest('.cell'); if (!b) return;
    const pat = banks[bank], s = +b.dataset.s, ds = b.dataset;
    const audition = ctx && powered && !playing;
    if (ds.r !== undefined) {
      const r = +ds.r; pat.d[r][s] ^= 1;
      if (pat.d[r][s] && audition) DRUM_FN[r](liveEnv, ctx.currentTime, 1);
    } else if (ds.n !== undefined) {
      const n = +ds.n;
      pat.n[s] = pat.n[s].n === n ? blankNote() : { ...pat.n[s], n };
      if (pat.n[s].n >= 0 && ensureAudio() && !playing) { const t = ctx.currentTime; trigger(t, freqOf(n), pat.n[s].a, false); releaseAt(t + 0.15); }
    } else if (ds.k === 'b') {
      if (e.shiftKey || e.altKey) pat.b[s] = -1;
      else if (pat.b[s] < 0) pat.b[s] = s;
      else { const nx = (pat.b[s] + 1) % 16; pat.b[s] = nx === s ? -1 : nx; }
      if (pat.b[s] >= 0 && audition) playSlice(ctx.currentTime, pat.b[s], pat.rv[s], stepDur());
    } else if (ds.k === 'rv') pat.rv[s] ^= 1;
    else if (ds.k === 'r') pat.r[s] = pat.r[s] % 4 + 1;
    else if (ds.k === 'p') pat.p[s] = (pat.p[s] + 1) % 4;
    else if (ds.k === 'a') pat.n[s].a ^= 1;
    else if (ds.k === 'sl') pat.n[s].s ^= 1;
    renderSeq(); saveSoon();
  };
  gridEls.forEach(g => {
    g.addEventListener('click', onGridClick);
    g.addEventListener('contextmenu', e => {
      const b = e.target.closest('.cell.br'); if (!b) return;
      e.preventDefault(); banks[bank].b[+b.dataset.s] = -1; renderSeq(); saveSoon();
    });
  });
  function renderSeq() {
    const pat = banks[bank];
    allCells().forEach(b => {
      const s = +b.dataset.s, ds = b.dataset; let on = false, txt = '';
      if (ds.r !== undefined) on = !!pat.d[+ds.r][s];
      else if (ds.n !== undefined) on = pat.n[s].n === +ds.n;
      else if (ds.k === 'b') { on = pat.b[s] >= 0; txt = on ? HEX[pat.b[s]] : ''; }
      else if (ds.k === 'rv') on = !!pat.rv[s];
      else if (ds.k === 'r') { on = pat.r[s] > 1; txt = on ? '×' + pat.r[s] : ''; }
      else if (ds.k === 'p') { on = pat.p[s] > 0; txt = on ? String(PROB[pat.p[s]] * 100) : ''; }
      else if (ds.k === 'a') on = !!pat.n[s].a;
      else if (ds.k === 'sl') on = !!pat.n[s].s;
      b.classList.toggle('on', on); b.setAttribute('aria-pressed', String(on));
      if (b.classList.contains('t')) b.textContent = txt;
    });
    $$('.bank').forEach(b => {
      const i = +b.dataset.bank;
      b.setAttribute('aria-pressed', String(i === bank));
      b.classList.toggle('pending', i === pendingBank);
    });
    $('#hdr-bank').textContent = $('#roll-bank').textContent = $('#code-bank').textContent = BANKS[bank];
  }
  let lastHead = -1;
  function paintPlayhead(s) {
    if (lastHead >= 0) cols[lastHead].forEach(c => c.classList.remove('now'));
    if (s >= 0) cols[s].forEach(c => c.classList.add('now'));
    lastHead = s;
  }
  function chooseBank(i, now) {
    if (i === bank && pendingBank === null) return;
    if (playing && !now) pendingBank = i === bank ? null : i;
    else { bank = i; pendingBank = null; }
    renderSeq(); saveSoon();
  }
  $$('.bank').forEach(b => b.addEventListener('click', () => chooseBank(+b.dataset.bank)));

  /* ---- generators ---- */
  const SCALE = [0, 0, 0, 3, 5, 7, 7, 10, 12];
  const pick = a => a[Math.floor(Math.random() * a.length)];
  const chance = p => Math.random() < p;
  function randomBass(pat) {
    for (let s = 0; s < 16; s++) pat.n[s] = s === 0 || chance(0.6) ? { n: pick(SCALE), a: chance(0.28) ? 1 : 0, s: chance(0.18) ? 1 : 0 } : blankNote();
  }
  function randomDrums(pat) {
    const d = pat.d;
    for (let s = 0; s < 16; s++) {
      d[0][s] = s % 4 === 0 || (s === 14 && chance(0.35)) || (s === 7 && chance(0.2)) ? 1 : 0;
      d[1][s] = (s === 4 || s === 12) && chance(0.5) ? 1 : 0;
      d[2][s] = (s === 4 || s === 12) && !d[1][s] ? 1 : 0;
      d[4][s] = s % 4 === 2 && chance(0.75) ? 1 : 0;
      d[3][s] = !d[4][s] && chance(0.6) ? 1 : 0;
    }
  }
  function grind(pat) {
    // breakcore: chop the break, sprinkle ratchets toward the end of the bar
    let prev = 0;
    for (let s = 0; s < 16; s++) {
      const late = s >= 12 ? 2 : 1;
      if (s === 0) pat.b[s] = 0;
      else if (chance(0.55)) pat.b[s] = Math.floor(Math.random() * 16);
      else if (chance(0.45)) pat.b[s] = prev;
      else pat.b[s] = s;
      prev = pat.b[s];
      pat.rv[s] = chance(0.1) ? 1 : 0;
      pat.r[s] = chance(0.06 * late) ? 4 : chance(0.08 * late) ? 3 : chance(0.16 * late) ? 2 : 1;
      pat.p[s] = s % 4 === 0 ? 0 : chance(0.12) ? 1 : chance(0.05) ? 2 : 0;
    }
    pat.d[0] = pat.d[0].map((_x, s) => s === 0 || (s === 10 && chance(0.6)) ? 1 : 0);
    pat.d[1] = pat.d[1].map((_x, s) => s === 4 || s === 12 || (s > 12 && chance(0.5)) ? 1 : 0);
  }
  function straight(pat) { for (let s = 0; s < 16; s++) { pat.b[s] = s; pat.rv[s] = 0; pat.r[s] = 1; pat.p[s] = 0; } }
  function mutate(pat) {
    for (let k = 0; k < 4; k++) {
      const s = Math.floor(Math.random() * 16), what = Math.random();
      if (what < 0.35) pat.n[s] = pat.n[s].n >= 0 && chance(0.3) ? blankNote() : { n: pick(SCALE), a: pat.n[s].a, s: pat.n[s].s };
      else if (what < 0.6) pat.d[1 + Math.floor(Math.random() * 4)][s] ^= 1;
      else if (what < 0.85 && pat.b.some(x => x >= 0)) pat.b[s] = Math.floor(Math.random() * 16);
      else pat.r[s] = pat.r[s] % 4 + 1;
    }
  }
  const edit = (fn, text) => () => { fn(banks[bank]); renderSeq(); saveSoon(); say(text); };
  $('#rnd-bass').addEventListener('click', edit(randomBass, 'Новая басовая линия.'));
  $('#rnd-drums').addEventListener('click', edit(randomDrums, 'Новый ритм.'));
  $('#mutate').addEventListener('click', edit(mutate, 'Четыре шага изменены.'));
  $('#grind').addEventListener('click', edit(grind, 'Брейк перемолот.'));
  $('#straight').addEventListener('click', edit(straight, 'Брейк идёт по порядку, без дробей.'));
  $('#brk-off').addEventListener('click', edit(p => { p.b.fill(-1); p.rv.fill(0); }, 'Брейк убран из банка.'));
  let clearArmed = 0;
  $('#clear').addEventListener('click', () => {
    const btn = $('#clear');
    if (Date.now() - clearArmed > 2500) {
      clearArmed = Date.now(); btn.textContent = 'Точно очистить?'; btn.classList.add('armed');
      setTimeout(() => { if (Date.now() - clearArmed >= 2400) { btn.textContent = 'Очистить банк'; btn.classList.remove('armed'); } }, 2500);
      return;
    }
    clearArmed = 0; btn.textContent = 'Очистить банк'; btn.classList.remove('armed');
    banks[bank] = blankPattern(); renderSeq(); saveSoon(); say('Банк ' + BANKS[bank] + ' очищен.');
  });

  /* =========================================================
     Pattern codes, v3: 58 bytes → base32, prefix Q7-
     ========================================================= */
  const B32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  function encode() {
    const pat = banks[bank], bytes = [4, Math.round(P.bpm) - 50, Math.round(P.swing / 0.6 * 255)];
    SOUND_KEYS.forEach(k => bytes.push(Math.round(toT(k, P[k]) * 255)));
    pat.d.forEach(row => { let v = 0; row.forEach((x, s) => { if (x) v |= 1 << s; }); bytes.push(v & 255, v >> 8); });
    pat.n.forEach(st => bytes.push((st.n + 1) | (st.a << 4) | (st.s << 5)));
    for (let s = 0; s < 16; s++) bytes.push((pat.b[s] + 1) | (pat.rv[s] << 5) | ((pat.r[s] - 1) << 6));
    for (let q = 0; q < 4; q++) bytes.push(pat.p[q * 4] | (pat.p[q * 4 + 1] << 2) | (pat.p[q * 4 + 2] << 4) | (pat.p[q * 4 + 3] << 6));
    const li = LIB.findIndex(d => d.id === libId); bytes.push(li < 0 ? 255 : li);
    let bits = 0, val = 0, s = '';
    bytes.forEach(b => { val = (val << 8) | b; bits += 8; while (bits >= 5) { s += B32[(val >> (bits - 5)) & 31]; bits -= 5; } val &= (1 << bits) - 1; });
    if (bits) s += B32[(val << (5 - bits)) & 31];
    return 'Q7-' + s;
  }
  function decode(str) {
    const s = str.trim().toUpperCase().replace(/^#/, '').replace(/^Q7-?/, '').replace(/[^A-Z2-7]/g, '');
    const bytes = []; let bits = 0, val = 0;
    for (const ch of s) { val = (val << 5) | B32.indexOf(ch); bits += 5; if (bits >= 8) { bytes.push((val >> (bits - 8)) & 255); bits -= 8; val &= (1 << bits) - 1; } }
    const ver = bytes[0];
    if (!((ver === 2 && bytes.length >= 36) || (ver === 3 && bytes.length >= 58) || (ver === 4 && bytes.length >= 59))) return null;
    const res = { bpm: Math.min(300, Math.max(70, bytes[1] + (ver === 2 ? 40 : 50))), swing: bytes[2] / 255 * 0.6, sound: {}, pat: blankPattern() };
    SOUND_KEYS.forEach((k, i) => { res.sound[k] = fromT(k, bytes[3 + i] / 255); });
    let o = 3 + SOUND_KEYS.length;
    const rowMap = ver === 2 ? [0, 2, 3, 4] : [0, 1, 2, 3, 4];
    rowMap.forEach(r => { const v = bytes[o] | (bytes[o + 1] << 8); o += 2; for (let x = 0; x < 16; x++) res.pat.d[r][x] = (v >> x) & 1; });
    for (let x = 0; x < 16; x++) { const b = bytes[o + x], n = (b & 15) - 1; res.pat.n[x] = { n: n > 12 ? -1 : n, a: (b >> 4) & 1, s: (b >> 5) & 1 }; }
    o += 16;
    if (ver >= 3) {
      for (let x = 0; x < 16; x++) { const b = bytes[o + x], sl = (b & 31) - 1; res.pat.b[x] = sl > 15 ? -1 : sl; res.pat.rv[x] = (b >> 5) & 1; res.pat.r[x] = ((b >> 6) & 3) + 1; }
      o += 16;
      for (let q = 0; q < 4; q++) for (let j = 0; j < 4; j++) res.pat.p[q * 4 + j] = (bytes[o + q] >> (j * 2)) & 3;
      o += 4;
      if (ver >= 4 && LIB[bytes[o]]) res.lib = LIB[bytes[o]].id;
    }
    return res;
  }
  function applyCode(str, quiet) {
    const r = decode(str);
    if (!r) { if (!quiet) say('Код не распознан. Скопируйте его целиком, вместе с префиксом Q7-.'); return false; }
    banks[bank] = r.pat; set('bpm', r.bpm); set('swing', r.swing);
    for (const k in r.sound) set(k, r.sound[k]);
    if (r.lib) selectBreak(r.lib);
    clearPreset(); renderSeq(); saveSoon();
    if (!quiet) say('Паттерн загружен в банк ' + BANKS[bank] + '.' + (r.pat.b.some(x => x >= 0) && !brk.builtin ? ' Брейк играет из вашего сэмпла.' : ''));
    return true;
  }
  $('#copy').addEventListener('click', () => {
    const code = encode(), inp = $('#code');
    inp.value = code;
    const fallback = () => { inp.focus(); inp.select(); say('Код выделен в поле: скопируйте его вручную.'); };
    if (navigator.clipboard?.writeText) navigator.clipboard.writeText(code).then(() => say('Код банка ' + BANKS[bank] + ' скопирован.' + (brk.builtin ? ' Брейк из библиотеки входит в код.' : ' Свой сэмпл в код не входит: у получателя заиграет Амен-ритм.')), fallback);
    else fallback();
  });
  $('#load').addEventListener('click', () => applyCode($('#code').value));
  $('#code').addEventListener('keydown', e => { if (e.key === 'Enter') applyCode($('#code').value); });

  let msgTimer = 0;
  function say(t) { const m = $('#msg'); m.textContent = t; clearTimeout(msgTimer); msgTimer = setTimeout(() => { m.textContent = ''; }, 7000); }

  let saveT = 0;
  function saveSoon() { clearTimeout(saveT); saveT = setTimeout(() => store.set('quant7.v3', { P, banks, bank, octave, lib: libId === 'custom' ? 'amen' : libId }), 300); }

  /* =========================================================
     Scope
     ========================================================= */
  const cv = $('#scope'), g2 = cv.getContext('2d'); let W = 0, Hh = 0;
  function resizeScope() {
    const dpr = Math.min(2, window.devicePixelRatio || 1), r = cv.getBoundingClientRect();
    W = r.width; Hh = r.height; cv.width = Math.max(1, W * dpr); cv.height = Math.max(1, Hh * dpr); g2.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  const css = n => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
  const C = {
    ph: css('--phosphor') || '#8ff0a8', grid: css('--scope-grid') || '#163222', bg: css('--scope-bg') || '#06100b',
    led: css('--led') || '#ff4122', amber: css('--amber') || '#ffae2b', win: css('--window') || '#0c1210', muted: '#5f6e66', ghost: '#1a2420',
  };
  const N = 600, PER = 200; const sim = new Float32Array(N); let waveDirty = true;
  function rawWave(ph) { switch (P.wave) { case 0: return 1 - 2 * ph; case 1: return ph < 0.5 ? 1 : -1; case 2: return ph < 0.5 ? 4 * ph - 1 : 3 - 4 * ph; default: return Math.sin(ph * 2 * Math.PI); } }
  function computeSim() {
    const fs = 220 * PER, a = 1 - Math.exp(-2 * Math.PI * Math.min(P.cutoff * (1 + P.env * 2), fs * 0.45) / fs), k = Math.min(3.7, (P.res - 0.5) / 19.5 * 3.9);
    const drv = 1 + P.drive * 4;
    let s1 = 0, s2 = 0, s3 = 0, s4 = 0, peak = 0.001;
    for (let pass = 0; pass < 4; pass++) for (let n = 0; n < N; n++) {
      const u = Math.tanh(rawWave((n % PER) / PER) - k * s4);
      s1 += a * (u - s1); s2 += a * (s1 - s2); s3 += a * (s2 - s3); s4 += a * (s3 - s4);
      if (pass === 3) { sim[n] = Math.tanh(s4 * drv); peak = Math.max(peak, Math.abs(sim[n])); }
    }
    for (let n = 0; n < N; n++) sim[n] = sim[n] / peak * 0.78;
    waveDirty = false;
  }
  function scopeGrid() {
    g2.strokeStyle = C.grid; g2.lineWidth = 1; g2.beginPath();
    for (let x = 0; x <= 10; x++) { const px = Math.round(W * x / 10) + 0.5; g2.moveTo(px, 0); g2.lineTo(px, Hh); }
    for (let y = 0; y <= 6; y++) { const py = Math.round(Hh * y / 6) + 0.5; g2.moveTo(0, py); g2.lineTo(W, py); }
    g2.stroke();
  }
  function trace(get, count, alpha) {
    g2.save(); g2.strokeStyle = C.ph; g2.lineWidth = 2; g2.lineJoin = 'round'; g2.shadowColor = C.ph; g2.shadowBlur = 12; g2.globalAlpha = alpha;
    g2.beginPath();
    for (let n = 0; n < count; n++) { const x = n / (count - 1) * W, y = Hh / 2 - get(n) * Hh * 0.42; n ? g2.lineTo(x, y) : g2.moveTo(x, y); }
    g2.stroke(); g2.restore();
  }
  let drift = 0;
  function drawScope() {
    g2.fillStyle = C.bg; g2.fillRect(0, 0, W, Hh); scopeGrid();
    const live = ctx && powered && vca.gain.value > 0.004;
    $('#lamp-gate').classList.toggle('on', !!live);
    if (live) {
      anaSynth.getFloatTimeDomainData(bufS);
      const per = ctx.sampleRate / Math.max(20, osc.frequency.value), span = Math.min(bufS.length - 1, Math.round(per * 2.2));
      let start = 0;
      for (let n = 1; n < bufS.length - span; n++) { if (bufS[n - 1] < 0 && bufS[n] >= 0) { start = n; break; } }
      let pk = 0.02; for (let n = 0; n < span; n++) pk = Math.max(pk, Math.abs(bufS[start + n]));
      const sc = Math.min(0.8 / pk, 8);
      trace(n => bufS[start + Math.round(n * span / 419)] * sc, 420, 1);
    } else {
      if (waveDirty) computeSim();
      if (!reduceMotion) drift = (drift + 0.6) % PER;
      const off = Math.floor(drift);
      trace(n => sim[PER + (n + off) % (2 * PER)], PER * 2, 0.85);
    }
  }
  function updateReadout() {
    $('#ro-wave').textContent = WAVES[P.wave].ru + ' · Q ' + comma(P.res.toFixed(1));
    $('#ro-cut').textContent = 'СРЕЗ ' + fmtHz(P.cutoff);
  }

  /* =========================================================
     Hero: LED dot-matrix title. Kick = light wave, snare / ratchet = the rows get chopped sideways.
     ========================================================= */
  const mx = $('#matrix'), mg = mx.getContext('2d');
  let mask = null, mCols = 0, mRows = 0, cell = 9, flicker = null;
  const kicks = [];
  let chopUntil = 0, chop = null;
  function buildMatrix() {
    const mW = $('#matrix-wrap').clientWidth || 1000;
    cell = mW < 520 ? 5 : mW < 900 ? 7 : 9;
    mCols = Math.floor(mW / cell);
    const text = 'КВАНТ-7', font = px => '900 ' + px + 'px Tektur, "Arial Black", sans-serif';
    const off = document.createElement('canvas'), oc = off.getContext('2d');
    oc.font = font(100);
    const fontPx = Math.floor(100 * (mCols - 2) / oc.measureText(text).width);
    oc.font = font(fontPx);
    const m2 = oc.measureText(text), asc = m2.actualBoundingBoxAscent || fontPx * 0.72;
    mRows = Math.ceil(asc) + 2;
    off.width = mCols; off.height = mRows;
    oc.font = font(fontPx); oc.fillStyle = '#fff'; oc.textBaseline = 'alphabetic';
    oc.fillText(text, Math.round((mCols - m2.width) / 2), Math.ceil(asc) + 1);
    const data = oc.getImageData(0, 0, mCols, mRows).data;
    mask = new Uint8Array(mCols * mRows);
    for (let i = 0; i < mask.length; i++) mask[i] = data[i * 4 + 3] > 110 ? 1 : 0;
    flicker = new Float32Array(mask.length);
    chop = new Int8Array(mRows);
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    mx.width = mCols * cell * dpr; mx.height = mRows * cell * dpr;
    mx.style.aspectRatio = mCols + ' / ' + mRows;
    mg.setTransform(dpr, 0, 0, dpr, 0, 0);
    drawMatrix(performance.now());
  }
  function chopRows(strength) {
    if (!chop) return;
    chop.fill(0);
    const bands = 2 + Math.floor(Math.random() * 3);
    for (let b = 0; b < bands; b++) {
      const y0 = Math.floor(Math.random() * mRows), h = 1 + Math.floor(Math.random() * Math.max(2, mRows / 4));
      const dx = Math.round((Math.random() * 2 - 1) * strength);
      for (let y = y0; y < Math.min(mRows, y0 + h); y++) chop[y] = dx;
    }
  }
  let level = 0;
  function drawMatrix(now) {
    if (!mask) return;
    mg.clearRect(0, 0, mCols * cell, mRows * cell);
    const r = cell * 0.36, chopping = now < chopUntil;
    mg.fillStyle = C.ghost; mg.beginPath();
    for (let y = 0; y < mRows; y++) for (let x = 0; x < mCols; x++) {
      if (mask[y * mCols + x] && !chopping) continue;
      const cx = x * cell + cell / 2, cy = y * cell + cell / 2;
      mg.moveTo(cx + r * 0.7, cy); mg.arc(cx, cy, r * 0.7, 0, 6.2832);
    }
    mg.fill();
    const fronts = [];
    for (let i = kicks.length - 1; i >= 0; i--) { const age = (now - kicks[i]) / 420; if (age > 1.2) kicks.splice(i, 1); else fronts.push(age); }
    const buckets = [[], [], [], [], []];
    for (let y = 0; y < mRows; y++) {
      const dx = chopping ? chop[y] : 0;
      for (let x = 0; x < mCols; x++) {
        const i = y * mCols + x; if (!mask[i]) continue;
        const xx = x + dx; if (xx < 0 || xx >= mCols) continue;
        let b = 0.62 + level * 0.9 - flicker[i];
        const xn = x / mCols;
        for (const a of fronts) { const d = Math.abs(xn - a); if (d < 0.12) b += (1 - d / 0.12) * 0.6 * (1.2 - a); }
        if (dx) b += 0.25;
        b = Math.max(0.25, Math.min(1, b));
        buckets[Math.min(4, Math.floor(b * 5))].push(xx, y);
      }
    }
    buckets.forEach((pts, bi) => {
      if (!pts.length) return;
      mg.globalAlpha = 0.3 + bi * 0.175; mg.fillStyle = C.led; mg.beginPath();
      for (let j = 0; j < pts.length; j += 2) { const cx = pts[j] * cell + cell / 2, cy = pts[j + 1] * cell + cell / 2; mg.moveTo(cx + r, cy); mg.arc(cx, cy, r, 0, 6.2832); }
      mg.fill();
    });
    mg.globalAlpha = 1;
  }
  function stepFlicker() {
    if (!flicker || reduceMotion) return;
    for (let k = 0; k < 14; k++) flicker[Math.floor(Math.random() * flicker.length)] = Math.random() * 0.4;
    for (let i = 0; i < flicker.length; i++) flicker[i] *= 0.93;
  }

  /* =========================================================
     Main loop
     ========================================================= */
  function frame(now) {
    if (playing && ctx) {
      while (queue.length && queue[0].t <= ctx.currentTime) {
        const q = queue.shift();
        if (q.s === -2) { renderSeq(); continue; }
        lastPlayed = { s: q.s, t: q.t };
        if (q.s !== drawnStep) {
          drawnStep = q.s; paintPlayhead(q.s);
          const lbl = String(q.s + 1).padStart(2, '0'); segStep(lbl); $('#hdr-step').textContent = lbl;
          if (q.kick) kicks.push(now);
          if (q.hard && !reduceMotion) { chopRows(P.bpm >= 160 ? 9 : 4); chopUntil = now + 90; }
          segSlice(q.slice >= 0 ? HEX[q.slice] : '-');
          if (q.slice !== curSlice) { curSlice = q.slice; drawBreakWave(); }
        }
      }
    }
    if (ctx && powered) {
      anaMix.getFloatTimeDomainData(bufM);
      let sum = 0; for (let i = 0; i < bufM.length; i++) sum += bufM[i] * bufM[i];
      level = level * 0.8 + Math.min(0.5, Math.sqrt(sum / bufM.length)) * 0.2;
    } else level *= 0.9;
    drawScope();
    if (!reduceMotion) { stepFlicker(); drawMatrix(now); }
    requestAnimationFrame(frame);
  }

  /* =========================================================
     Boot
     ========================================================= */
  function boot(saved) {
    let s = saved && saved.P ? saved : store.get('quant7.v3');
    let migrated = false;
    if (!s) { s = store.get('quant7.v2'); migrated = !!s; }
    if (s && s.lib && LIB.some(d => d.id === s.lib)) libId = s.lib;
    if (s && s.P) {
      KEYS.forEach(k => { if (typeof s.P[k] === 'number') P[k] = s.P[k]; });
      if (Array.isArray(s.banks) && s.banks.length === 4) banks = s.banks.map(normalize);
      if (migrated && isEmpty(banks[3])) banks[3] = breakcoreBank();
      if (typeof s.bank === 'number') bank = s.bank;
      if (typeof s.octave === 'number') octave = s.octave;
    } else {
      presetBtns[0].setAttribute('aria-pressed', 'true');
    }
    buildSeq();
    renderLib_ui(); $('#brk-name').textContent = LIB.find(d => d.id === libId).name;
    KEYS.forEach(render);
    $('#oct').textContent = 'C' + octave;
    updateReadout(); renderSeq();
    if (/^#Q7-/i.test(location.hash) && applyCode(location.hash, true)) say('Паттерн из ссылки загружен в банк ' + BANKS[bank] + '. Нажмите «Старт».');

    new ResizeObserver(resizeScope).observe(cv); resizeScope();
    new ResizeObserver(resizeBreak).observe(bw); resizeBreak();
    let lastW = 0;
    const mw = $('#matrix-wrap');
    new ResizeObserver(() => { const w = mw.clientWidth; if (Math.abs(w - lastW) > 4) { lastW = w; buildMatrix(); } }).observe(mw);
    (document.fonts?.ready || Promise.resolve()).then(() => { lastW = mw.clientWidth; buildMatrix(); resizeBreak(); });
    requestAnimationFrame(frame);
  }
  const hot = window.claude?.hot;
  hot?.snapshot?.(() => ({ P: { ...P }, banks, bank, octave, lib: libId }));
  hot?.ready ? hot.ready(boot) : boot(hot?.data ?? null);
})();
