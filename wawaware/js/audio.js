// Effets sonores synthétisés (aucun fichier audio nécessaire)
const Sfx = (() => {
  let ac = null;

  function ctx() {
    if (!ac) ac = new (window.AudioContext || window.webkitAudioContext)();
    if (ac.state === 'suspended') ac.resume();
    return ac;
  }

  function tone(freq, dur = 0.12, type = 'square', vol = 0.12, when = 0, slide = 0) {
    const a = ctx(), t = a.currentTime + when;
    const o = a.createOscillator(), g = a.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, freq * slide), t + dur);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(a.destination);
    o.start(t);
    o.stop(t + dur + 0.02);
  }

  function noise(dur = 0.2, vol = 0.2, when = 0, lowpass = 0) {
    const a = ctx(), len = Math.floor(a.sampleRate * dur);
    const buf = a.createBuffer(1, len, a.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = a.createBufferSource(), g = a.createGain();
    src.buffer = buf;
    g.gain.value = vol;
    let node = src;
    if (lowpass) {
      const f = a.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.value = lowpass;
      src.connect(f);
      node = f;
    }
    node.connect(g).connect(a.destination);
    src.start(a.currentTime + when);
  }

  return {
    ctx, tone, noise,
    instruction() { tone(660, 0.08, 'square', 0.1); tone(990, 0.12, 'square', 0.1, 0.08); },
    win() { [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.12, 'square', 0.1, i * 0.07)); },
    lose() { [392, 330, 262, 175].forEach((f, i) => tone(f, 0.18, 'sawtooth', 0.08, i * 0.1)); },
    tick() { tone(1400, 0.04, 'square', 0.06); },
    speedup() { [0, 1, 2, 3, 4, 5].forEach(i => tone(440 * Math.pow(1.12, i), 0.1, 'square', 0.09, i * 0.06)); },
    swat() { noise(0.08, 0.15, 0, 2500); },
    splat() { noise(0.2, 0.35, 0, 900); tone(160, 0.15, 'sine', 0.2, 0, 0.4); },
    pump(f) { tone(f, 0.05, 'triangle', 0.08); },
    pop() { noise(0.3, 0.5, 0, 4000); },
    jump() { tone(280, 0.15, 'square', 0.08, 0, 2.6); },
    hit() { noise(0.18, 0.35, 0, 1200); tone(140, 0.25, 'sawtooth', 0.12, 0, 0.4); },
    thump() { tone(90, 0.12, 'sine', 0.15, 0, 0.6); },
    puff() { noise(0.25, 0.2, 0, 700); },
  };
})();
