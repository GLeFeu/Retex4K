// SOURIS (clic) : trouver le poussin qui regarde dans l'autre sens
Engine.register({
  id: 'intrus',
  name: 'Trouve l\'intrus',
  icon: '🐤',
  instruction: 'L\'INTRUS !',
  input: 'souris',
  hint: 'CLIQUE SUR LE POUSSIN DIFFÉRENT',
  duration: 5,

  start(c) {
    const cols = Math.min(8, 5 + Math.floor(c.diff / 2));
    const rows = c.diff >= 3 ? 4 : 3;
    return {
      t: 0, cols, rows, picked: -1,
      odd: Math.floor(c.rng() * cols * rows),
      dir: c.rng() < 0.5 ? 1 : -1,
      phases: Array.from({ length: cols * rows }, () => c.rng() * 6),
    };
  },

  cell(s, i) {
    const cw = 760 / s.cols, ch = 340 / s.rows;
    return { x: 100 + cw * (i % s.cols) + cw / 2, y: 110 + ch * Math.floor(i / s.cols) + ch / 2, r: Math.min(30, cw * 0.32) };
  },

  update(s, dt, c) {
    s.t += dt;
    if (!c.input.clicked || c.over || s.won || s.lost) return;
    for (let i = 0; i < s.cols * s.rows; i++) {
      const p = this.cell(s, i);
      if (Math.hypot(c.input.x - p.x, c.input.y - p.y) < p.r + 12) {
        s.picked = i;
        if (i === s.odd) s.won = true; else { s.lost = true; c.sfx.hit(); }
        return;
      }
    }
  },

  draw(s, g) {
    g.fillStyle = '#ffe8a3'; g.fillRect(0, 0, W, H);
    g.fillStyle = '#d4a373'; g.fillRect(0, H - 60, W, 60);
    for (let x = 0; x < W; x += 40) { g.fillStyle = '#bc8a5f'; g.fillRect(x, H - 60, 6, 60); }
    for (let i = 0; i < s.cols * s.rows; i++) {
      const p = this.cell(s, i);
      const face = i === s.odd ? -s.dir : s.dir;
      const bob = Math.abs(Math.sin(s.t * 5 + s.phases[i])) * 6;
      g.save();
      g.translate(p.x, p.y - bob);
      g.scale(face * p.r / 30, p.r / 30);
      Draw.ellipse(g, 0, 6, 30, 24); Draw.fillStroke(g, '#ffd60a');
      Draw.ellipse(g, -8, 10, 14, 9, -0.3); Draw.fillStroke(g, '#ffc300', '#1a1a1a', 3);
      Draw.circle(g, 14, -14, 18); Draw.fillStroke(g, '#ffd60a');
      Draw.circle(g, 20, -18, 4); g.fillStyle = '#1a1a1a'; g.fill();
      g.beginPath(); g.moveTo(30, -14); g.lineTo(44, -9); g.lineTo(30, -5); g.closePath();
      Draw.fillStroke(g, '#fb8500', '#1a1a1a', 3);
      g.restore();
      if (s.picked === i) {
        Draw.circle(g, p.x, p.y, p.r + 16);
        g.lineWidth = 6; g.strokeStyle = s.won ? '#06d6a0' : '#ef233c'; g.stroke();
      }
    }
    if (s.lost) { const p = this.cell(s, s.odd); Draw.circle(g, p.x, p.y, p.r + 16); g.lineWidth = 6; g.strokeStyle = '#06d6a0'; g.stroke(); }
  },
});
