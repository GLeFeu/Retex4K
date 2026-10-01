// CURSEUR : l'abeille suit la souris, butiner toutes les fleurs
Engine.register({
  id: 'abeille', name: 'Butinage', icon: '🐝', instruction: 'BUTINE !', input: 'curseur',
  hint: 'GUIDE L\'ABEILLE SUR TOUTES LES FLEURS', duration: 5, cursor: 'none',

  start(c) {
    const n = 4 + Math.min(3, Math.floor(c.diff / 2)), flowers = [];
    while (flowers.length < n) { const x = 80 + c.rng() * 800, y = 120 + c.rng() * 320; if (flowers.every(f => Math.hypot(f.x - x, f.y - y) > 140)) flowers.push({ x, y, done: false, col: ['#ff6b9d', '#ffd400', '#9d4edd', '#ef233c'][flowers.length % 4] }); }
    return { t: 0, bx: c.input.x, by: c.input.y, flowers, lag: Math.max(3, 7 - 0.5 * c.diff), face: 1 };
  },

  update(s, dt, c) {
    s.t += dt;
    const k = Math.min(1, dt * s.lag), nx = s.bx + (c.input.x - s.bx) * k;
    if (Math.abs(nx - s.bx) > 0.5) s.face = nx > s.bx ? 1 : -1;
    s.bx = nx; s.by += (c.input.y - s.by) * k;
    if (c.over) return;
    for (const f of s.flowers) if (!f.done && Math.hypot(f.x - s.bx, f.y - s.by) < 40) { f.done = true; c.sfx.tone(900, 0.06, 'square', 0.08); }
    if (!s.won && s.flowers.every(f => f.done)) s.won = true;
  },

  draw(s, g) {
    Draw.sky(g, '#caffbf', '#9bf6ff');
    for (const f of s.flowers) {
      g.strokeStyle = '#2d6a4f'; g.lineWidth = 6; g.beginPath(); g.moveTo(f.x, f.y); g.lineTo(f.x, f.y + 120); g.stroke();
      for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3 + (f.done ? s.t : 0); Draw.circle(g, f.x + Math.cos(a) * 22, f.y + Math.sin(a) * 22, 15); Draw.fillStroke(g, f.done ? f.col : '#e9ecef', '#1a1a1a', 3); }
      Draw.circle(g, f.x, f.y, 14); Draw.fillStroke(g, f.done ? '#ffd400' : '#adb5bd', '#1a1a1a', 3);
    }
    g.save(); g.translate(s.bx, s.by); g.scale(s.face, 1);
    const flap = Math.sin(s.t * 50) * 6;
    Draw.ellipse(g, -4, -16, 12, 8 + flap * 0.4, -0.3); Draw.fillStroke(g, 'rgba(255,255,255,0.8)', '#1a1a1a', 2);
    Draw.ellipse(g, 0, 0, 22, 15); Draw.fillStroke(g, '#ffd400');
    g.fillStyle = '#1a1a1a'; g.fillRect(-8, -14, 6, 28); g.fillRect(4, -14, 6, 28);
    Draw.circle(g, 16, -4, 3); g.fill();
    g.restore();
  },
});
