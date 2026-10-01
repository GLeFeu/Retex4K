// MOLETTE (haut/bas) : piloter la profondeur du sous-marin pour éviter les mines
Engine.register({
  id: 'sousmarin', name: 'Sous-marin', icon: '🐙', instruction: 'PLONGE !', input: 'molette',
  hint: 'MOLETTE ↑↓ POUR MONTER / DESCENDRE', duration: 5, survival: true, SX: 180,

  start(c) {
    const speed = 300 + 30 * Math.min(c.diff, 6), mines = [];
    for (let x = 700; x < this.SX + speed * 5 - 80; x += 230 - 10 * Math.min(c.diff, 6) + c.rng() * 60) mines.push({ x, y: 140 + c.rng() * 320 });
    return { t: 0, y: 300, ty: 300, speed, mines, boom: false };
  },

  update(s, dt, c) {
    s.t += dt;
    if (s.lost) return;
    if (!c.over) s.ty = clamp(s.ty + c.input.wheelDelta * 30, 120, 480);
    s.y += (s.ty - s.y) * Math.min(1, dt * 8);
    for (const m of s.mines) m.x -= s.speed * dt;
    if (!c.over && s.mines.some(m => Math.abs(m.x - this.SX) < 60 && Math.abs(m.y - s.y) < 46)) { s.lost = true; s.boom = true; c.sfx.hit(); }
  },

  draw(s, g) {
    Draw.sky(g, '#0096c7', '#03045e');
    g.fillStyle = 'rgba(255,255,255,0.15)';
    for (let i = 0; i < 20; i++) {
      const bx = (((i * 211 - s.t * 60 * (1 + i % 3)) % W) + W) % W;
      Draw.circle(g, bx, (i * 97) % H, 4 + i % 5); g.fill();
    }
    g.fillStyle = '#7f5539'; g.beginPath(); g.moveTo(0, H); for (let x = 0; x <= W; x += 40) g.lineTo(x, 510 + Math.sin((x + s.t * s.speed) / 70) * 14); g.lineTo(W, H); g.fill();
    for (const m of s.mines) {
      g.strokeStyle = '#495057'; g.lineWidth = 3; g.beginPath(); g.moveTo(m.x, m.y); g.lineTo(m.x, 520); g.stroke();
      for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4; g.lineWidth = 6; g.strokeStyle = '#1a1a1a'; g.beginPath(); g.moveTo(m.x, m.y); g.lineTo(m.x + Math.cos(a) * 36, m.y + Math.sin(a) * 36); g.stroke(); }
      Draw.circle(g, m.x, m.y, 26); Draw.fillStroke(g, '#343a40', '#000');
    }
    g.save(); g.translate(this.SX, s.y);
    if (s.boom) Draw.burst(g, 0, 0, 80);
    else {
      Draw.ellipse(g, 0, 0, 70, 32); Draw.fillStroke(g, '#ffd400');
      Draw.rrect(g, -20, -52, 40, 28, 8); Draw.fillStroke(g, '#ffd400');
      for (const px of [-30, 0, 30]) { Draw.circle(g, px, 0, 9); Draw.fillStroke(g, '#90e0ef', '#1a1a1a', 3); }
      g.fillStyle = '#1a1a1a'; g.fillRect(-80, -12, 12, 24);
    }
    g.restore();
  },
});
