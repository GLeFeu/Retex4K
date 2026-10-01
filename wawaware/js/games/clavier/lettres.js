// CLAVIER (lettres) : taper les lettres qui tombent avant qu'elles ne touchent le sol
Engine.register({
  id: 'lettres', name: 'Pluie de lettres', icon: '🔠', instruction: 'TAPE-LES !', input: 'clavier',
  hint: 'TAPE CHAQUE LETTRE AVANT QU\'ELLE TOMBE', duration: 6, POOL: 'AZERTYUIOPQSDFGHJKLMWXCVBN',

  start(c) {
    const n = 5 + Math.min(4, c.diff), letters = [];
    for (let i = 0; i < n; i++) letters.push({ ch: this.POOL[Math.floor(c.rng() * this.POOL.length)], x: 80 + c.rng() * 800, y: -40 - i * 90, dead: false });
    return { t: 0, letters, sp: 110 + 15 * Math.min(c.diff, 6), pops: [] };
  },

  update(s, dt, c) {
    s.t += dt;
    for (const p of s.pops) p.life -= dt;
    s.pops = s.pops.filter(p => p.life > 0);
    if (s.won || s.lost) return;
    for (const l of s.letters) if (!l.dead) l.y += s.sp * dt;
    if (!c.over) for (const ch of c.input.typed) {
      const target = s.letters.filter(l => !l.dead && l.ch === ch && l.y > -20).sort((a, b) => b.y - a.y)[0];
      if (target) { target.dead = true; s.pops.push({ x: target.x, y: target.y, life: 0.3 }); c.sfx.tone(800, 0.05, 'square', 0.08); }
    }
    if (!c.over && s.letters.some(l => !l.dead && l.y > 440)) { s.lost = true; c.sfx.hit(); }
    if (s.letters.every(l => l.dead)) s.won = true;
  },

  draw(s, g) {
    Draw.sky(g, '#5e548e', '#9f86c0', 460);
    Draw.ground(g, 460, '#231942', '#e0b1cb');
    for (const l of s.letters) {
      if (l.dead || l.y < -60) continue;
      Draw.rrect(g, l.x - 30, l.y - 30, 60, 60, 12); Draw.fillStroke(g, l.y > 340 ? '#ff8fa3' : '#fff');
      Draw.text(g, l.ch, l.x, l.y + 2, 40, '#1a1a1a', null);
    }
    for (const p of s.pops) Draw.burst(g, p.x, p.y, 40 * (1 - p.life), ['#ffd400', '#fff']);
    Draw.text(g, `${s.letters.filter(l => !l.dead).length}`, W - 60, 50, 44);
  },
});
