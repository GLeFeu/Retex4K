// SOURIS : cliquer les bulles dans l'ordre 1, 2, 3...
Engine.register({
  id: 'ordre', name: 'Dans l\'ordre', icon: '🔢', instruction: 'DANS L\'ORDRE !', input: 'souris',
  hint: 'CLIQUE 1, PUIS 2, PUIS 3…', duration: 5, cursor: 'pointer',

  start(c) {
    const n = 4 + Math.min(c.diff, 5), dots = [];
    while (dots.length < n) { const x = 90 + c.rng() * 780, y = 90 + c.rng() * 370; if (dots.every(d => Math.hypot(d.x - x, d.y - y) > 100)) dots.push({ x, y }); }
    return { t: 0, dots, next: 0, bad: -1 };
  },

  update(s, dt, c) {
    s.t += dt;
    if (s.won || s.lost || c.over || !c.input.clicked) return;
    const i = s.dots.findIndex(d => Math.hypot(c.input.x - d.x, c.input.y - d.y) < 40);
    if (i < 0 || i < s.next) return;
    if (i === s.next) { s.next++; c.sfx.tone(400 + s.next * 80, 0.06, 'square', 0.1); if (s.next >= s.dots.length) s.won = true; }
    else { s.bad = i; s.lost = true; c.sfx.hit(); }
  },

  draw(s, g) {
    Draw.stripes(g, s.t * 0.3, '#ffe5ec', '#ffd6e0');
    g.strokeStyle = '#1a1a1a'; g.lineWidth = 4;
    if (s.next > 1) { g.beginPath(); s.dots.slice(0, s.next).forEach((d, i) => (i ? g.lineTo(d.x, d.y) : g.moveTo(d.x, d.y))); g.stroke(); }
    s.dots.forEach((d, i) => {
      Draw.circle(g, d.x, d.y, 36); Draw.fillStroke(g, i < s.next ? '#06d6a0' : i === s.bad ? '#ef233c' : '#fff');
      Draw.text(g, String(i + 1), d.x, d.y + 2, 36, i < s.next ? '#fff' : '#1a1a1a', null);
    });
  },
});
