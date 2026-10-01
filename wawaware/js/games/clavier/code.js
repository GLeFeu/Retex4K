// CLAVIER (mémoire + chiffres) : retenir le code affiché un instant, puis le taper
Engine.register({
  id: 'code', name: 'Code secret', icon: '🔑', instruction: 'MÉMORISE !', input: 'clavier',
  hint: 'RETIENS LE CODE PUIS TAPE-LE', duration: 6,
  keys: ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'],

  start(c) {
    const len = Math.min(6, 3 + Math.floor(c.diff / 2));
    return { t: 0, code: Array.from({ length: len }, () => Math.floor(c.rng() * 10)).join(''), show: 1.3, typed: '' };
  },

  update(s, dt, c) {
    s.t += dt;
    if (s.won || s.lost || c.over || s.t < s.show) return;
    for (const d of c.input.digits) {
      s.typed += d;
      if (!s.code.startsWith(s.typed)) { s.lost = true; c.sfx.hit(); return; }
      c.sfx.tone(600, 0.04, 'square', 0.06);
      if (s.typed === s.code) { s.won = true; c.sfx.tone(1000, 0.15, 'square', 0.1); return; }
    }
  },

  draw(s, g) {
    g.fillStyle = '#212529'; g.fillRect(0, 0, W, H);
    Draw.rrect(g, 180, 120, 600, 300, 24); Draw.fillStroke(g, '#343a40', '#6c757d', 6);
    const hidden = s.t >= s.show;
    for (let i = 0; i < s.code.length; i++) {
      const x = W / 2 + (i - (s.code.length - 1) / 2) * 80;
      Draw.rrect(g, x - 32, 200, 64, 90, 10); Draw.fillStroke(g, '#1a1a1a', '#06d6a0', 3);
      const ch = !hidden ? s.code[i] : s.typed[i] || (i === s.typed.length && Math.floor(s.t * 3) % 2 ? '_' : '');
      Draw.text(g, ch, x, 247, 56, s.lost && i === s.typed.length - 1 ? '#ef233c' : '#06d6a0', null);
    }
    Draw.text(g, hidden ? 'TAPE LE CODE' : 'MÉMORISE…', W / 2, 360, 34, '#fff', null);
    if (!hidden) { Draw.rrect(g, 300, 380, 360 * (1 - s.t / s.show), 10, 5); g.fillStyle = '#ffd400'; g.fill(); }
    if (s.lost) Draw.text(g, `C'ÉTAIT ${s.code}`, W / 2, 480, 40, '#ef233c');
  },
});
