// MOLETTE (haut/bas) : régler la radio sur la bonne station
Engine.register({
  id: 'radio',
  name: 'Règle la radio',
  icon: '📻',
  instruction: 'RÈGLE !',
  input: 'molette',
  hint: 'MOLETTE ↑↓ JUSQU\'À L\'ÉTOILE',
  duration: 5,
  X0: 220, X1: 740,

  start(c) {
    const target = 90 + c.rng() * 16;
    let f = target + (c.rng() < 0.5 ? -1 : 1) * (5 + c.rng() * 4);
    f = clamp(f, 88, 108);
    if (Math.abs(f - target) < 4) f = target > 98 ? 88.5 : 107.5;
    return { t: 0, f, target, zone: Math.max(0.4, 0.75 - 0.06 * c.diff), hold: 0, notes: [] };
  },

  fx(f) { return this.X0 + ((f - 88) / 20) * (this.X1 - this.X0); },

  update(s, dt, c) {
    s.t += dt;
    if (!s.won && !c.over && c.input.wheelDelta) {
      s.f = clamp(s.f - c.input.wheelDelta * 0.6, 88, 108);
      c.sfx.tone(300 + (s.f - 88) * 30, 0.03, 'square', 0.04);
    }
    const inZone = Math.abs(s.f - s.target) < s.zone;
    s.hold = inZone ? s.hold + dt : 0;
    if (!s.won && !c.over && s.hold >= 0.45) { s.won = true; }
    if (inZone && Math.random() < dt * 8) s.notes.push({ x: 300 + Math.random() * 360, y: 330, life: 1 });
    for (const n of s.notes) { n.y -= 80 * dt; n.life -= dt; }
    s.notes = s.notes.filter(n => n.life > 0);
  },

  draw(s, g) {
    g.fillStyle = '#f2e8cf'; g.fillRect(0, 0, W, H);
    g.fillStyle = '#bc6c25'; g.fillRect(0, 470, W, 70);
    Draw.rrect(g, 150, 90, 660, 380, 40); Draw.fillStroke(g, '#99582a');
    Draw.rrect(g, 175, 115, 610, 330, 26); Draw.fillStroke(g, '#bb9457', '#1a1a1a', 3);

    // cadran
    Draw.rrect(g, this.X0 - 30, 140, this.X1 - this.X0 + 60, 90, 12); Draw.fillStroke(g, '#fefae0');
    g.strokeStyle = '#1a1a1a'; g.lineWidth = 2;
    for (let f = 88; f <= 108; f += 1) {
      const x = this.fx(f);
      g.beginPath(); g.moveTo(x, 205); g.lineTo(x, f % 2 === 0 ? 185 : 195); g.stroke();
      if (f % 4 === 0) Draw.text(g, String(f), x, 165, 18, '#1a1a1a', null);
    }
    Draw.text(g, '★', this.fx(s.target), 218, 22, '#ef233c', null);
    const nx = this.fx(s.f);
    g.strokeStyle = '#ef233c'; g.lineWidth = 5;
    g.beginPath(); g.moveTo(nx, 145); g.lineTo(nx, 226); g.stroke();

    // haut-parleur
    Draw.rrect(g, 220, 255, 380, 170, 20); Draw.fillStroke(g, '#7f5539');
    const inZone = Math.abs(s.f - s.target) < s.zone;
    for (let y = 270; y < 415; y += 16) for (let x = 235; x < 590; x += 16) {
      Draw.circle(g, x, y, 4);
      g.fillStyle = !inZone && Math.random() < 0.15 ? '#fefae0' : '#582f0e';
      g.fill();
    }
    // bouton molette
    Draw.circle(g, 690, 340, 55); Draw.fillStroke(g, '#6f4518');
    g.save(); g.translate(690, 340); g.rotate((s.f - 88) * 0.6);
    g.fillStyle = '#fefae0'; g.fillRect(-5, -50, 10, 30);
    g.restore();
    // barres de signal
    const sig = clamp(1 - Math.abs(s.f - s.target) / 6, 0, 1);
    for (let i = 0; i < 5; i++) {
      Draw.rrect(g, 640 + i * 18, 430 - i * 10 - 20, 12, 20 + i * 10, 3);
      Draw.fillStroke(g, i < sig * 5 ? '#06d6a0' : '#ddd', '#1a1a1a', 2);
    }
    for (const n of s.notes) { g.globalAlpha = n.life; Draw.text(g, '♪', n.x, n.y, 40, '#3a86ff'); }
    g.globalAlpha = 1;
    if (!inZone) Draw.text(g, 'KSSHHH...', 410, 60, 36, '#adb5bd');
  },
});
