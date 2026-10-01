// MOLETTE : relancer la toupie pour qu'elle ne tombe pas
Engine.register({
  id: 'toupie', name: 'La toupie', icon: '🪀', instruction: 'FAIS-LA TOURNER !', input: 'molette',
  hint: 'TOURNE LA MOLETTE POUR LA RELANCER', duration: 5, survival: true,

  start(c) { return { t: 0, spin: 0.75, a: 0, decay: 0.32 + 0.04 * Math.min(c.diff, 6), fall: 0 }; },

  update(s, dt, c) {
    s.t += dt;
    if (s.lost) { s.fall = Math.min(1, s.fall + dt * 3); return; }
    if (!c.over) s.spin = Math.min(1, s.spin + c.input.wheelNotches * 0.07);
    s.spin -= s.decay * dt;
    s.a += s.spin * 30 * dt;
    if (s.spin <= 0.12 && !c.over) { s.lost = true; c.sfx.thump(); }
  },

  draw(s, g) {
    g.fillStyle = '#ffd6a5'; g.fillRect(0, 0, W, H);
    Draw.ground(g, 420, '#9c6644', '#7f5539');
    const wob = (1 - s.spin) * 0.5 * Math.sin(s.t * 12);
    g.save(); g.translate(480, 420); g.rotate(s.lost ? s.fall * 1.4 : wob);
    g.beginPath(); g.moveTo(0, 0); g.lineTo(-90, -110); g.quadraticCurveTo(0, -170, 90, -110); g.closePath();
    Draw.fillStroke(g, '#ef233c');
    g.save(); g.clip();
    for (let i = -3; i <= 3; i++) { g.fillStyle = i % 2 ? '#ffd400' : '#3a86ff'; g.fillRect(i * 30 + (s.a * 20) % 60 - 15, -170, 15, 170); }
    g.restore();
    g.beginPath(); g.moveTo(0, 0); g.lineTo(-90, -110); g.quadraticCurveTo(0, -170, 90, -110); g.closePath(); g.lineWidth = 4; g.strokeStyle = '#1a1a1a'; g.stroke();
    Draw.rrect(g, -8, -200, 16, 60, 6); Draw.fillStroke(g, '#7f5539');
    g.restore();
    Draw.rrect(g, 300, 470, 360, 30, 15); Draw.fillStroke(g, '#fff');
    const k = clamp(s.spin, 0, 1);
    if (k > 0.02) { Draw.rrect(g, 304, 474, 352 * k, 22, 11); g.fillStyle = k < 0.3 ? '#ef233c' : '#06d6a0'; g.fill(); }
  },
});
