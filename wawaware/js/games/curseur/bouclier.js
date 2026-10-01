// CURSEUR : orienter le bouclier vers les flèches qui arrivent de partout
Engine.register({
  id: 'bouclier', name: 'Le bouclier', icon: '🛡️', instruction: 'PROTÈGE-TOI !', input: 'curseur',
  hint: 'LE BOUCLIER POINTE VERS TA SOURIS', duration: 5, survival: true, cursor: 'crosshair', CX: 480, CY: 290,

  start(c) { return { t: 0, arrows: [], spawnT: 0.5, rate: Math.max(0.35, 0.8 - 0.06 * c.diff), sp: 260 + 30 * Math.min(c.diff, 6), blocked: [] }; },

  update(s, dt, c) {
    s.t += dt;
    const shield = Math.atan2(c.input.y - this.CY, c.input.x - this.CX);
    s.spawnT -= dt;
    if (s.spawnT <= 0 && s.t < c.duration - 0.5) {
      const a = c.rng() * Math.PI * 2;
      s.arrows.push({ a, d: 520 });
      s.spawnT = s.rate * (0.8 + c.rng() * 0.4);
    }
    for (const ar of s.arrows) {
      ar.d -= s.sp * dt;
      if (ar.d < 85 && !ar.done) {
        let diff = Math.abs(((ar.a - shield) % (Math.PI * 2) + Math.PI * 3) % (Math.PI * 2) - Math.PI);
        if (diff < 0.65) { ar.done = 'bloc'; c.sfx.tone(1000, 0.05, 'square', 0.08); }
        else if (ar.d < 40 && !c.over && !s.lost) { ar.done = 'touche'; s.lost = true; c.sfx.hit(); }
      }
    }
    s.arrows = s.arrows.filter(ar => !ar.done || ar.done === 'touche');
  },

  draw(s, g, c) {
    g.fillStyle = '#ccd5ae'; g.fillRect(0, 0, W, H);
    Draw.circle(g, this.CX, this.CY, 160); g.fillStyle = '#e9edc9'; g.fill();
    Draw.hero(g, this.CX, this.CY + 45, { rot: s.lost ? 1.2 : 0 });
    for (const ar of s.arrows) {
      const x = this.CX + Math.cos(ar.a) * ar.d, y = this.CY + Math.sin(ar.a) * ar.d;
      g.save(); g.translate(x, y); g.rotate(ar.a + Math.PI);
      g.fillStyle = '#7f5539'; g.fillRect(-40, -3, 50, 6);
      g.beginPath(); g.moveTo(16, 0); g.lineTo(4, -9); g.lineTo(4, 9); g.closePath(); g.fillStyle = '#495057'; g.fill();
      g.fillStyle = '#ef233c'; g.fillRect(-46, -6, 10, 12);
      g.restore();
    }
    const sh = Math.atan2(c.input.y - this.CY, c.input.x - this.CX);
    g.beginPath(); g.arc(this.CX, this.CY, 80, sh - 0.65, sh + 0.65); g.lineWidth = 22; g.strokeStyle = '#1a1a1a'; g.stroke();
    g.lineWidth = 14; g.strokeStyle = '#3a86ff'; g.stroke();
  },
});
