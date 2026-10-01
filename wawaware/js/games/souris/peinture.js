// SOURIS (maintenir + bouger) : repeindre tout le mur avec le rouleau
Engine.register({
  id: 'peinture', name: 'Coup de peinture', icon: '🖌️', instruction: 'PEINS TOUT !', input: 'souris',
  hint: 'MAINTIENS LE CLIC ET FROTTE LE MUR', duration: 5, cursor: 'none', GX: 16, GY: 8, X0: 80, Y0: 60, CW: 50, CH: 50,

  start(c) { return { t: 0, cells: new Array(this.GX * this.GY).fill(false), need: Math.min(0.95, 0.8 + 0.02 * c.diff), col: ['#ff6b9d', '#4cc9f0', '#80ed99', '#ffd166'][Math.floor(c.rng() * 4)] }; },

  update(s, dt, c) {
    s.t += dt;
    if (s.won || c.over || !c.input.down) return;
    const { x, y } = c.input;
    for (let i = 0; i < s.cells.length; i++) {
      const cx = this.X0 + (i % this.GX) * this.CW + 25, cy = this.Y0 + Math.floor(i / this.GX) * this.CH + 25;
      if (Math.abs(cx - x) < 60 && Math.abs(cy - y) < 40) s.cells[i] = true;
    }
    if (s.cells.filter(Boolean).length / s.cells.length >= s.need) s.won = true;
  },

  draw(s, g, c) {
    g.fillStyle = '#6c757d'; g.fillRect(0, 0, W, H);
    g.fillStyle = '#ced4da'; g.fillRect(this.X0, this.Y0, this.GX * this.CW, this.GY * this.CH);
    g.fillStyle = s.col;
    s.cells.forEach((on, i) => { if (on) g.fillRect(this.X0 + (i % this.GX) * this.CW - 1, this.Y0 + Math.floor(i / this.GX) * this.CH - 1, this.CW + 2, this.CH + 2); });
    g.lineWidth = 6; g.strokeStyle = '#1a1a1a'; g.strokeRect(this.X0, this.Y0, this.GX * this.CW, this.GY * this.CH);
    const k = s.cells.filter(Boolean).length / s.cells.length;
    Draw.text(g, `${Math.floor(k * 100)}% / ${Math.round(s.need * 100)}%`, W / 2, 500, 40);
    // rouleau
    g.save(); g.translate(c.input.x, c.input.y);
    Draw.rrect(g, -60, -22, 120, 44, 14); Draw.fillStroke(g, s.col);
    g.lineWidth = 8; g.strokeStyle = '#1a1a1a'; g.beginPath(); g.moveTo(60, 0); g.lineTo(80, 0); g.lineTo(80, 50); g.lineTo(0, 50); g.lineTo(0, 120); g.stroke();
    g.restore();
  },
});
