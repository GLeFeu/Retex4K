// CLAVIER (lettres) : appuyer vite sur la lettre géante affichée, plusieurs fois
Engine.register({
  id: 'touche', name: 'Lettre géante', icon: '🅰️', instruction: 'APPUIE DESSUS !', input: 'clavier',
  hint: 'APPUIE SUR LA LETTRE AFFICHÉE', duration: 5,
  POOL: 'AZERTYUIOPQSDFGHJKLMWXCVBN',

  start(c) {
    const n = 3 + Math.min(2, Math.floor(c.diff / 2)), seq = [];
    while (seq.length < n) { const ch = this.POOL[Math.floor(c.rng() * this.POOL.length)]; if (!seq.includes(ch)) seq.push(ch); }
    return { t: 0, seq, i: 0, pop: 0 };
  },

  update(s, dt, c) {
    s.t += dt;
    s.pop = Math.max(0, s.pop - dt);
    if (s.won || s.lost || c.over) return;
    for (const ch of c.input.typed) {
      if (ch === s.seq[s.i]) { s.i++; s.pop = 0.15; c.sfx.tone(600 + s.i * 100, 0.06, 'square', 0.1); if (s.i >= s.seq.length) { s.won = true; return; } }
      else { s.lost = true; s.bad = ch; c.sfx.hit(); return; }
    }
  },

  draw(s, g) {
    Draw.stripes(g, s.t * 0.6, '#4cc9f0', '#4895ef');
    const ch = s.seq[Math.min(s.i, s.seq.length - 1)];
    const k = 1 + s.pop * 2;
    g.save(); g.translate(W / 2, 260); g.scale(k, k);
    Draw.rrect(g, -120, -120, 240, 240, 36); Draw.fillStroke(g, '#fff', '#1a1a1a', 8);
    Draw.rrect(g, -120, 90, 240, 30, [0, 0, 36, 36]); g.fillStyle = '#ced4da'; g.fill();
    Draw.text(g, s.won ? '✓' : ch, 0, -5, 170, '#1a1a1a', null);
    g.restore();
    s.seq.forEach((l, j) => Draw.btn(g, W / 2 + (j - (s.seq.length - 1) / 2) * 70, 480, 56, 56, l, j < s.i ? '#06d6a0' : '#fff', 28));
    if (s.bad) Draw.text(g, `PAS ${s.bad} !`, W / 2, 60, 50, '#ef233c');
  },
});
