// SOURIS : fléchettes, le viseur tremble, cliquer pour lancer et viser le centre
Engine.register({
  id: 'flechettes', name: 'Fléchettes', icon: '🎯', instruction: 'DANS LE MILLE !', input: 'souris',
  hint: 'CLIQUE QUAND LE VISEUR EST AU CENTRE', duration: 5, cursor: 'none', CX: 480, CY: 260,

  start(c) { return { t: 0, darts: [], left: 3, sway: 40 + 8 * Math.min(c.diff, 6), bull: Math.max(26, 44 - 3 * c.diff), ph: c.rng() * 6 }; },

  aim(s, c) {
    return { x: c.input.x + Math.sin(s.t * 3.1 + s.ph) * s.sway, y: c.input.y + Math.sin(s.t * 2.3 + s.ph * 2) * s.sway * 0.8 };
  },

  update(s, dt, c) {
    s.t += dt;
    if (s.won || s.lost || c.over || !c.input.clicked) return;
    const a = this.aim(s, c);
    s.darts.push(a); s.left--;
    c.sfx.thump();
    if (Math.hypot(a.x - this.CX, a.y - this.CY) < s.bull) s.won = true;
    else if (!s.left) { s.lost = true; c.sfx.lose(); }
  },

  draw(s, g, c) {
    g.fillStyle = '#582f0e'; g.fillRect(0, 0, W, H);
    for (const [r, col] of [[220, '#1a1a1a'], [190, '#fefae0'], [150, '#ef233c'], [110, '#fefae0'], [70, '#2b9348'], [s.bull, '#ef233c']]) {
      Draw.circle(g, this.CX, this.CY, r); Draw.fillStroke(g, col, '#1a1a1a', 3);
    }
    for (const d of s.darts) {
      g.strokeStyle = '#1a1a1a'; g.lineWidth = 5; g.beginPath(); g.moveTo(d.x, d.y); g.lineTo(d.x + 30, d.y + 30); g.stroke();
      g.fillStyle = '#3a86ff'; g.beginPath(); g.moveTo(d.x + 30, d.y + 30); g.lineTo(d.x + 50, d.y + 30); g.lineTo(d.x + 30, d.y + 50); g.fill();
    }
    if (!s.won && !s.lost) {
      const a = this.aim(s, c);
      g.strokeStyle = '#ffd400'; g.lineWidth = 4;
      Draw.circle(g, a.x, a.y, 18); g.stroke();
      g.beginPath(); g.moveTo(a.x - 28, a.y); g.lineTo(a.x + 28, a.y); g.moveTo(a.x, a.y - 28); g.lineTo(a.x, a.y + 28); g.stroke();
    }
    for (let i = 0; i < s.left; i++) Draw.text(g, '➶', 820 + i * 40, 490, 40, '#ffd400', null);
  },
});
