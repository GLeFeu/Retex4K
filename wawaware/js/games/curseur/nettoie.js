// CURSEUR : frotter la vitre sale avec l'éponge jusqu'à ce qu'elle brille
Engine.register({
  id: 'nettoie', name: 'Vitre sale', icon: '🧽', instruction: 'NETTOIE !', input: 'curseur',
  hint: 'FROTTE TOUTE LA VITRE', duration: 5, cursor: 'none', GX: 12, GY: 7, X0: 180, Y0: 70, C: 50,

  start(c) { return { t: 0, dirt: new Array(this.GX * this.GY).fill(1), need: Math.min(0.95, 0.85 + 0.015 * c.diff), px: c.input.x, py: c.input.y, spots: Array.from({ length: 30 }, () => ({ x: c.rng(), y: c.rng(), r: 10 + c.rng() * 30 })) }; },

  update(s, dt, c) {
    s.t += dt;
    const mv = Math.hypot(c.input.x - s.px, c.input.y - s.py);
    s.px = c.input.x; s.py = c.input.y;
    if (s.won || c.over || mv < 1) return;
    for (let i = 0; i < s.dirt.length; i++) {
      const cx = this.X0 + (i % this.GX) * this.C + 25, cy = this.Y0 + Math.floor(i / this.GX) * this.C + 25;
      if (Math.abs(cx - s.px) < 55 && Math.abs(cy - s.py) < 45) s.dirt[i] = Math.max(0, s.dirt[i] - mv * 0.012);
    }
    const clean = s.dirt.filter(d => d === 0).length / s.dirt.length;
    if (clean >= s.need) { s.won = true; c.sfx.tone(1400, 0.2, 'sine', 0.08); }
  },

  draw(s, g, c) {
    g.fillStyle = '#e07a5f'; g.fillRect(0, 0, W, H);
    const w = this.GX * this.C, h = this.GY * this.C;
    Draw.rrect(g, this.X0 - 20, this.Y0 - 20, w + 40, h + 40, 10); Draw.fillStroke(g, '#fff');
    Draw.sky(g, '#48cae4', '#ade8f4');
    g.save(); g.beginPath(); g.rect(this.X0, this.Y0, w, h); g.clip();
    Draw.sky(g, '#48cae4', '#caf0f8'); Draw.cloud(g, 400, 160); Draw.circle(g, 700, 140, 50); g.fillStyle = '#ffd60a'; g.fill();
    g.restore();
    g.fillStyle = '#e07a5f'; g.fillRect(0, 0, W, this.Y0 - 20); g.fillRect(0, this.Y0 + h + 20, W, H); g.fillRect(0, 0, this.X0 - 20, H); g.fillRect(this.X0 + w + 20, 0, W, H);
    Draw.rrect(g, this.X0 - 20, this.Y0 - 20, w + 40, h + 40, 10); g.lineWidth = 16; g.strokeStyle = '#fff'; g.stroke();
    s.dirt.forEach((d, i) => { if (d > 0) { g.fillStyle = `rgba(110,85,50,${0.85 * d})`; g.fillRect(this.X0 + (i % this.GX) * this.C, this.Y0 + Math.floor(i / this.GX) * this.C, this.C, this.C); } });
    const clean = s.dirt.filter(d => d === 0).length / s.dirt.length;
    Draw.text(g, `${Math.floor(clean * 100)}%`, W / 2, 500, 40);
    g.save(); g.translate(c.input.x, c.input.y); g.rotate(Math.sin(s.t * 20) * 0.1);
    Draw.rrect(g, -50, -30, 100, 60, 14); Draw.fillStroke(g, '#ffd166');
    Draw.rrect(g, -50, 14, 100, 16, 6); Draw.fillStroke(g, '#52b788');
    g.restore();
  },
});
