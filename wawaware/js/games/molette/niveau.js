// MOLETTE (haut/bas) : incliner la planche pour garder la bille au centre
Engine.register({
  id: 'niveau', name: 'La bille', icon: '⚪', instruction: 'GARDE LA BILLE !', input: 'molette',
  hint: 'MOLETTE ↑↓ POUR INCLINER LA PLANCHE', duration: 5, survival: true, CX: 480, CY: 330, LEN: 300,

  start(c) { return { t: 0, tilt: 0, x: 0, v: 0, gust: 0, gustT: 0.4, power: 80 + 15 * Math.min(c.diff, 6) }; },

  update(s, dt, c) {
    s.t += dt;
    if (s.lost) { s.v += 300 * dt; s.x += Math.sign(s.x) * s.v * dt; return; }
    if (!c.over) s.tilt = clamp(s.tilt + c.input.wheelDelta * 0.04, -0.35, 0.35);
    s.gustT -= dt;
    if (s.gustT <= 0) { s.gust = (c.rng() - 0.5) * 2 * s.power; s.gustT = 0.5 + c.rng() * 0.6; }
    s.v += (Math.sin(s.tilt) * 900 + s.gust) * dt;
    s.v *= 1 - 0.8 * dt;
    s.x += s.v * dt;
    if (Math.abs(s.x) > this.LEN && !c.over) { s.lost = true; s.v = 0; c.sfx.thump(); }
  },

  draw(s, g) {
    g.fillStyle = '#f1faee'; g.fillRect(0, 0, W, H);
    g.fillStyle = '#457b9d'; g.beginPath(); g.moveTo(this.CX - 40, 500); g.lineTo(this.CX + 40, 500); g.lineTo(this.CX, this.CY + 10); g.closePath(); g.fill();
    g.save(); g.translate(this.CX, this.CY); g.rotate(s.tilt);
    Draw.rrect(g, -this.LEN - 20, 0, (this.LEN + 20) * 2, 22, 8); Draw.fillStroke(g, '#a8dadc');
    g.fillStyle = 'rgba(6,214,160,0.6)'; g.fillRect(-60, 2, 120, 18);
    if (!s.lost) { Draw.circle(g, s.x, -22, 22); Draw.fillStroke(g, '#e63946'); Draw.circle(g, s.x - 7, -29, 6); g.fillStyle = 'rgba(255,255,255,0.7)'; g.fill(); }
    g.restore();
    if (s.lost) { Draw.circle(g, this.CX + s.x, this.CY + s.v * 0.5, 22); Draw.fillStroke(g, '#e63946'); }
    if (Math.abs(s.gust) > s.power * 0.6) Draw.text(g, s.gust > 0 ? '≋ VENT →' : '← VENT ≋', W / 2, 90, 40, '#457b9d');
  },
});
