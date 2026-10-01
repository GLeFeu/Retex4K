// CURSEUR : suivre le chemin électrique sans toucher les bords
Engine.register({
  id: 'labyrinthe',
  name: 'Fil électrique',
  icon: '⚡',
  instruction: 'NE TOUCHE PAS !',
  input: 'curseur',
  hint: 'VA AU DRAPEAU SANS SORTIR DU CHEMIN',
  duration: 5,
  cursor: 'none',

  start(c) {
    const n = 6, pts = [];
    for (let i = 0; i < n; i++) pts.push({ x: 90 + (i * 780) / (n - 1), y: i === 0 ? 280 : 110 + c.rng() * 320 });
    return { t: 0, pts, w: Math.max(44, 84 - 6 * c.diff), started: false };
  },

  dist(s, x, y) {
    let best = Infinity;
    for (let i = 0; i < s.pts.length - 1; i++) {
      const a = s.pts[i], b = s.pts[i + 1];
      const dx = b.x - a.x, dy = b.y - a.y;
      const k = clamp(((x - a.x) * dx + (y - a.y) * dy) / (dx * dx + dy * dy), 0, 1);
      best = Math.min(best, Math.hypot(x - (a.x + dx * k), y - (a.y + dy * k)));
    }
    return best;
  },

  update(s, dt, c) {
    s.t += dt;
    if (c.over || s.won || s.lost) return;
    const { x, y } = c.input;
    const a = s.pts[0], z = s.pts[s.pts.length - 1];
    if (!s.started) { if (Math.hypot(x - a.x, y - a.y) < s.w / 2) s.started = true; return; }
    if (this.dist(s, x, y) > s.w / 2) { s.lost = true; s.zap = { x, y }; c.sfx.hit(); return; }
    if (Math.hypot(x - z.x, y - z.y) < s.w / 2) s.won = true;
  },

  draw(s, g, c) {
    g.fillStyle = '#14213d'; g.fillRect(0, 0, W, H);
    g.strokeStyle = '#1d2d50'; g.lineWidth = 2;
    for (let x = 0; x < W; x += 40) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, H); g.stroke(); }
    for (let y = 0; y < H; y += 40) { g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke(); }

    const path = () => { g.beginPath(); s.pts.forEach((p, i) => (i ? g.lineTo(p.x, p.y) : g.moveTo(p.x, p.y))); };
    g.lineCap = 'round'; g.lineJoin = 'round';
    path(); g.lineWidth = s.w + 10; g.strokeStyle = s.lost ? '#ff3c6e' : '#fca311'; g.stroke();
    path(); g.lineWidth = s.w; g.strokeStyle = '#e5e5e5'; g.stroke();

    const a = s.pts[0], z = s.pts[s.pts.length - 1];
    Draw.circle(g, a.x, a.y, s.w / 2 - 4); g.fillStyle = s.started ? '#b7e4c7' : '#06d6a0'; g.fill();
    if (!s.started) Draw.text(g, 'DÉPART', a.x, a.y - s.w / 2 - 22, 22, '#06d6a0');
    g.fillStyle = '#1a1a1a'; g.fillRect(z.x - 3, z.y - 40, 6, 44);
    g.beginPath(); g.moveTo(z.x + 3, z.y - 40); g.lineTo(z.x + 36, z.y - 30); g.lineTo(z.x + 3, z.y - 20); g.closePath();
    Draw.fillStroke(g, '#ef233c', '#1a1a1a', 3);

    if (s.zap) {
      g.strokeStyle = '#ffd400'; g.lineWidth = 4;
      for (let k = 0; k < 6; k++) {
        g.beginPath(); g.moveTo(s.zap.x, s.zap.y);
        let px = s.zap.x, py = s.zap.y;
        for (let j = 0; j < 4; j++) { px += (Math.random() - 0.5) * 40; py += (Math.random() - 0.5) * 40; g.lineTo(px, py); }
        g.stroke();
      }
    }
    Draw.circle(g, c.input.x, c.input.y, 8); Draw.fillStroke(g, s.started ? '#3a86ff' : '#fff', '#1a1a1a', 3);
  },
});
