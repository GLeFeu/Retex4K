// MICRO (voix) : dire la formule magique pour faire sortir le lapin du chapeau
Engine.register({
  id: 'magie',
  name: 'Tour de magie',
  icon: '🎩',
  instruction: 'FORMULE MAGIQUE !',
  input: 'micro',
  hint: 'DIS « ABRACADABRA ! »',
  duration: 7,
  needsMic: true,
  needsVoice: true,
  noSpeedup: true,
  // mots à reconnaître (moteur vocal intégré)
  vocab: ['abracadabra'],
  SPELL: ['abracadabra', 'abra cadabra', 'cadabra', 'abraca', 'abracadab', 'abracadabrant', 'abrakadabra'],

  start() { return { t: 0, poof: 0 }; },

  update(s, dt, c) {
    s.t += dt;
    if (s.won) { s.poof += dt; return; }
    if (!c.over && Voice.match(c.heard(), [this.SPELL]) === 0) { s.won = true; c.sfx.tone(1200, 0.3, 'sine', 0.12); }
  },

  draw(s, g) {
    g.fillStyle = '#3c096c'; g.fillRect(0, 0, W, H);
    // rideaux
    g.fillStyle = '#9d0208';
    for (let i = 0; i < 6; i++) { g.fillRect(i * 28, 0, 22, H); g.fillRect(W - 22 - i * 28, 0, 22, H); }
    g.fillStyle = '#6a040f'; g.fillRect(0, 0, W, 40);
    Draw.ground(g, 430, '#7f5539', '#582f0e');
    // table
    Draw.rrect(g, 380, 380, 200, 20, 6); Draw.fillStroke(g, '#ffd166');
    g.fillStyle = '#1a1a1a'; g.fillRect(470, 400, 20, 40);
    // lapin
    if (s.won) {
      const up = Math.min(1, s.poof * 3) * 90;
      g.save(); g.translate(480, 300 - up);
      for (const sx of [-14, 14]) { Draw.ellipse(g, sx, -70, 12, 40, sx * 0.01); Draw.fillStroke(g, '#fff'); }
      Draw.circle(g, 0, -20, 38); Draw.fillStroke(g, '#fff');
      Draw.circle(g, -12, -26, 5); Draw.circle(g, 12, -26, 5); g.fillStyle = '#1a1a1a'; g.fill();
      Draw.circle(g, 0, -12, 5); g.fillStyle = '#ff8fa3'; g.fill();
      g.restore();
      for (let i = 0; i < 8; i++) {
        const a = i * 0.8 + s.poof * 3, r = 80 + s.poof * 100;
        Draw.text(g, '✦', 480 + Math.cos(a) * r, 250 + Math.sin(a) * r * 0.6, 30, '#ffd400', null);
      }
    }
    // chapeau
    Draw.ellipse(g, 480, 380, 90, 16); Draw.fillStroke(g, '#1a1a1a', '#000');
    Draw.rrect(g, 420, 270, 120, 110, 6); Draw.fillStroke(g, '#212529', '#000');
    g.fillStyle = '#ef233c'; g.fillRect(420, 350, 120, 16);
    Draw.ellipse(g, 480, 272, 60, 12); Draw.fillStroke(g, '#000', '#000');
    // magicien
    Draw.hero(g, 250, 500, { shirt: '#7209b7', pants: '#1a1a1a' });
    g.save(); g.translate(285, 440); g.rotate(-0.6 + Math.sin(s.t * 6) * 0.2);
    g.fillStyle = '#1a1a1a'; g.fillRect(0, -6, 110, 12); g.fillStyle = '#fff'; g.fillRect(90, -6, 20, 12);
    g.restore();
    if (!s.won) Draw.text(g, 'ABRA… CADABRA ?', 700, 160, 40, '#ffd400');
  },
});
