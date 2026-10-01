// SOURIS : attraper le bouton qui fuit la souris (coince-le dans un coin !)
Engine.register({
  id: 'boutonfuyant', name: 'Bouton timide', icon: '🔘', instruction: 'CLIQUE-LE !', input: 'souris',
  hint: 'IL FUIT ! COINCE-LE DANS UN COIN', duration: 5, cursor: 'pointer',

  start(c) { return { t: 0, x: W / 2, y: H / 2, sp: 380 + 50 * Math.min(c.diff, 6) }; },

  update(s, dt, c) {
    s.t += dt;
    if (s.won || c.over) return;
    const dx = s.x - c.input.x, dy = s.y - c.input.y, d = Math.hypot(dx, dy) || 1;
    if (d < 160) { s.x += (dx / d) * s.sp * dt; s.y += (dy / d) * s.sp * dt; }
    s.x = clamp(s.x, 90, W - 90); s.y = clamp(s.y, 40, H - 40);
    if (c.input.clicked && Math.abs(c.input.x - s.x) < 85 && Math.abs(c.input.y - s.y) < 34) s.won = true;
  },

  draw(s, g) {
    g.fillStyle = '#f8f9fa'; g.fillRect(0, 0, W, H);
    g.strokeStyle = '#dee2e6'; g.lineWidth = 2;
    for (let x = 0; x < W; x += 40) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, H); g.stroke(); }
    const scared = !s.won;
    g.save(); g.translate(s.x, s.y);
    if (scared) g.rotate(Math.sin(s.t * 30) * 0.05);
    Draw.btn(g, 0, 0, 170, 64, s.won ? 'MERCI !' : 'CLIQUE-MOI', s.won ? '#06d6a0' : '#ff3c6e', 28, '#fff');
    if (scared) { Draw.text(g, '>_<', 0, -55, 28, '#1a1a1a', null); }
    g.restore();
  },
});
