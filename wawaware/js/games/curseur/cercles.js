// CURSEUR : tourner en rond autour de la spirale pour hypnotiser
Engine.register({
  id: 'cercles', name: 'Hypnose', icon: '🌀', instruction: 'TOURNE EN ROND !', input: 'curseur',
  hint: 'FAIS DES CERCLES AUTOUR DU CENTRE', duration: 5, cursor: 'none', CX: 480, CY: 270,

  start(c) { return { t: 0, turn: 0, need: 3 + Math.min(c.diff, 6) * 0.5, prev: null, spin: 0 }; },

  update(s, dt, c) {
    s.t += dt;
    const dx = c.input.x - this.CX, dy = c.input.y - this.CY;
    const a = Math.atan2(dy, dx);
    if (s.prev !== null && Math.hypot(dx, dy) > 50 && !s.won && !c.over) {
      let d = a - s.prev;
      if (d > Math.PI) d -= Math.PI * 2; if (d < -Math.PI) d += Math.PI * 2;
      s.turn += d;
      s.spin += Math.abs(d);
    }
    s.prev = a;
    if (!s.won && Math.abs(s.turn) >= s.need * Math.PI * 2) { s.won = true; c.sfx.tone(500, 0.4, 'sine', 0.12, 0, 2); }
  },

  draw(s, g, c) {
    g.fillStyle = '#7209b7'; g.fillRect(0, 0, W, H);
    g.save(); g.translate(this.CX, this.CY); g.rotate(s.spin * 1.5);
    g.lineWidth = 18;
    for (let k = 0; k < 2; k++) {
      g.strokeStyle = k ? '#f72585' : '#fff';
      g.beginPath();
      for (let a = 0; a < Math.PI * 10; a += 0.1) { const r = a * 7; g.lineTo(Math.cos(a + k * Math.PI) * r, Math.sin(a + k * Math.PI) * r); }
      g.stroke();
    }
    g.restore();
    Draw.circle(g, this.CX, this.CY, 50); g.lineWidth = 3; g.setLineDash([6, 6]); g.strokeStyle = '#fff'; g.stroke(); g.setLineDash([]);
    const k = clamp(Math.abs(s.turn) / (s.need * Math.PI * 2), 0, 1);
    g.beginPath(); g.arc(80, 80, 40, -Math.PI / 2, -Math.PI / 2 + k * Math.PI * 2); g.lineWidth = 12; g.strokeStyle = '#ffd400'; g.stroke();
    Draw.text(g, `${Math.floor(Math.abs(s.turn) / (Math.PI * 2))}/${s.need}`, 80, 80, 22);
    if (s.won) Draw.text(g, '@_@', this.CX, this.CY, 80, '#ffd400');
    Draw.circle(g, c.input.x, c.input.y, 12); Draw.fillStroke(g, '#ffd400');
  },
});
