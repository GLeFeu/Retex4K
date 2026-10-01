// SOURIS : cliquer sur la plus grosse boule
Engine.register({
  id: 'grand', name: 'Le plus gros', icon: '🔵', instruction: 'LE PLUS GROS !', input: 'souris',
  hint: 'CLIQUE SUR LA PLUS GROSSE BOULE', duration: 4, cursor: 'pointer',

  start(c) {
    const n = 4 + Math.min(c.diff, 6), gap = Math.max(4, 14 - c.diff * 1.5), balls = [];
    const big = 50 + c.rng() * 20;
    for (let i = 0; i < n; i++) {
      const r = i === 0 ? big : big - gap - c.rng() * 25;
      let x, y, tries = 0;
      do { x = 100 + c.rng() * 760; y = 100 + c.rng() * 340; tries++; } while (tries < 50 && balls.some(b => Math.hypot(b.x - x, b.y - y) < b.r + r + 10));
      balls.push({ x, y, r, col: ['#ef233c', '#3a86ff', '#ffd400', '#06d6a0', '#ff6b9d', '#9d4edd'][Math.floor(c.rng() * 6)] });
    }
    return { t: 0, balls, picked: -1 };
  },

  update(s, dt, c) {
    s.t += dt;
    if (s.picked >= 0 || c.over || !c.input.clicked) return;
    const i = s.balls.findIndex(b => Math.hypot(c.input.x - b.x, c.input.y - b.y) < b.r);
    if (i < 0) return;
    s.picked = i;
    if (i === 0) s.won = true; else { s.lost = true; c.sfx.hit(); }
  },

  draw(s, g) {
    Draw.stripes(g, s.t * 0.2, '#f1faee', '#e9ecef');
    s.balls.forEach((b, i) => {
      Draw.circle(g, b.x, b.y, b.r); Draw.fillStroke(g, b.col);
      Draw.circle(g, b.x - b.r * 0.3, b.y - b.r * 0.3, b.r * 0.2); g.fillStyle = 'rgba(255,255,255,0.5)'; g.fill();
      if ((s.lost && i === 0) || s.picked === i) { Draw.circle(g, b.x, b.y, b.r + 10); g.lineWidth = 6; g.strokeStyle = i === 0 ? '#06d6a0' : '#ef233c'; g.stroke(); }
    });
  },
});
