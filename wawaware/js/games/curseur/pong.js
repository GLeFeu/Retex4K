// CURSEUR : la raquette suit la souris, ne pas laisser passer la balle
Engine.register({
  id: 'pong', name: 'Ping-pong', icon: '🏓', instruction: 'RENVOIE !', input: 'curseur',
  hint: 'LA RAQUETTE SUIT TA SOURIS', duration: 5, survival: true, cursor: 'none', PY: 470,

  start(c) {
    const sp = 420 + 50 * Math.min(c.diff, 6), a = -Math.PI / 2 + (c.rng() - 0.5) * 1.2;
    return { t: 0, x: W / 2, y: 120, vx: Math.cos(a) * sp, vy: Math.abs(Math.sin(a)) * sp, w: Math.max(90, 150 - 8 * c.diff), hits: 0 };
  },

  update(s, dt, c) {
    s.t += dt;
    const px = clamp(c.input.x, s.w / 2, W - s.w / 2);
    s.x += s.vx * dt; s.y += s.vy * dt;
    if (s.x < 16 || s.x > W - 16) { s.vx = -s.vx; s.x = clamp(s.x, 16, W - 16); }
    if (s.y < 16) { s.vy = Math.abs(s.vy); }
    if (!s.lost && s.vy > 0 && s.y > this.PY - 16 && s.y < this.PY + 10 && Math.abs(s.x - px) < s.w / 2 + 14) {
      s.vy = -Math.abs(s.vy) * 1.04; s.vx += (s.x - px) * 4; s.hits++; c.sfx.tone(500, 0.05, 'square', 0.1);
    }
    if (s.y > H + 20 && !s.lost && !c.over) { s.lost = true; c.sfx.lose(); }
  },

  draw(s, g, c) {
    g.fillStyle = '#2a9d8f'; g.fillRect(0, 0, W, H);
    g.strokeStyle = 'rgba(255,255,255,0.6)'; g.lineWidth = 4; g.strokeRect(10, 10, W - 20, H + 20);
    g.setLineDash([16, 12]); g.beginPath(); g.moveTo(0, H / 2); g.lineTo(W, H / 2); g.stroke(); g.setLineDash([]);
    Draw.circle(g, s.x, s.y, 14); Draw.fillStroke(g, '#fff');
    const px = clamp(c.input.x, s.w / 2, W - s.w / 2);
    Draw.rrect(g, px - s.w / 2, this.PY, s.w, 20, 10); Draw.fillStroke(g, '#ef233c');
    Draw.text(g, String(s.hits), W - 60, 50, 44);
  },
});
