// MICRO (voix) : guider la souris vers le fromage en disant "gauche" ou "droite"
Engine.register({
  id: 'direction',
  name: 'Gauche ou droite ?',
  icon: '🧀',
  instruction: 'GUIDE-LA !',
  input: 'micro',
  hint: 'DIS « GAUCHE » OU « DROITE »',
  duration: 6,
  needsMic: true,
  needsVoice: true,
  noSpeedup: true,
  // mots à reconnaître (moteur vocal intégré)
  vocab: ['gauche', 'droite'],

  start(c) { return { t: 0, side: c.rng() < 0.5 ? -1 : 1, x: W / 2, go: 0 }; },

  update(s, dt, c) {
    s.t += dt;
    if (s.go) s.x = clamp(s.x + s.go * 500 * dt, 140, W - 140);
    if (s.go || c.over) return;
    const m = Voice.match(c.heard(), [WORDS.gauche, WORDS.droite]);
    if (m < 0) return;
    s.go = m === 0 ? -1 : 1;
    if (s.go === s.side) s.won = true; else { s.lost = true; c.sfx.hit(); }
  },

  draw(s, g) {
    g.fillStyle = '#ffe8d6'; g.fillRect(0, 0, W, H);
    Draw.ground(g, 400, '#ddbea9', '#cb997e');
    const cheese = W / 2 + s.side * 340, trap = W / 2 - s.side * 340;
    // fromage
    g.beginPath(); g.moveTo(cheese - 60, 400); g.lineTo(cheese + 60, 400); g.lineTo(cheese + 60, 340); g.closePath();
    Draw.fillStroke(g, '#ffd166');
    Draw.circle(g, cheese + 30, 380, 8); g.fillStyle = '#e9b949'; g.fill();
    // tapette
    Draw.rrect(g, trap - 70, 380, 140, 22, 4); Draw.fillStroke(g, '#bc6c25');
    g.strokeStyle = '#adb5bd'; g.lineWidth = 6; g.beginPath(); g.moveTo(trap - 50, 380); g.lineTo(trap + 50, 330); g.stroke();
    // souris
    const face = s.go || 1;
    g.save(); g.translate(s.x, 400); g.scale(face, 1);
    g.strokeStyle = '#1a1a1a'; g.lineWidth = 4; g.beginPath(); g.moveTo(-40, -15); g.quadraticCurveTo(-80, -40, -90, -10); g.stroke();
    Draw.ellipse(g, 0, -28, 46, 28); Draw.fillStroke(g, '#adb5bd');
    Draw.circle(g, 30, -60, 18); Draw.fillStroke(g, '#ced4da');
    Draw.circle(g, 48, -36, 5); g.fillStyle = '#1a1a1a'; g.fill();
    Draw.circle(g, 58, -28, 6); g.fillStyle = '#ff8fa3'; g.fill();
    g.restore();
    Draw.text(g, '← GAUCHE', 140, 110, 40, s.go === -1 ? '#ffd400' : '#fff');
    Draw.text(g, 'DROITE →', W - 140, 110, 40, s.go === 1 ? '#ffd400' : '#fff');
  },
});
