// MICRO (voix) : pierre-feuille-ciseaux, dire ce qui bat la main du robot
Engine.register({
  id: 'chifoumi',
  name: 'Chifoumi',
  icon: '✂️',
  instruction: 'BATS-LE !',
  input: 'micro',
  hint: 'PIERRE, FEUILLE OU CISEAUX ?',
  duration: 7,
  needsMic: true,
  needsVoice: true,
  noSpeedup: true,
  // mots à reconnaître (moteur vocal intégré)
  vocab: ['pierre', 'feuille', 'ciseaux', 'caillou', 'papier'],
  HANDS: [
    { name: 'PIERRE', words: ['pierre', 'pierres', 'pier', 'caillou', 'cailloux'] },
    { name: 'FEUILLE', words: ['feuille', 'feuilles', 'papier', 'fouille'] },
    { name: 'CISEAUX', words: ['ciseaux', 'ciseau', 'cizeau', 'ciso', 'si zo'] },
  ],

  start(c) { return { t: 0, bot: Math.floor(c.rng() * 3), me: -1 }; },

  update(s, dt, c) {
    s.t += dt;
    if (s.me >= 0 || c.over) return;
    const text = c.heard(), win = (s.bot + 1) % 3; // feuille bat pierre, ciseaux bat feuille, pierre bat ciseaux
    if (Voice.match(text, [this.HANDS[win].words]) === 0) { s.me = win; s.won = true; }
    else {
      const m = Voice.match(text, this.HANDS.map(h => h.words));
      if (m >= 0) { s.me = m; s.lost = true; c.sfx.hit(); }
    }
  },

  hand(g, k, x, y, flip) {
    g.save(); g.translate(x, y); g.scale(flip, 1);
    if (k === 0) {
      g.beginPath();
      for (let i = 0; i < 9; i++) { const a = (i / 9) * Math.PI * 2; g.lineTo(Math.cos(a) * (70 + (i % 2) * 12), Math.sin(a) * (60 + (i % 3) * 8)); }
      g.closePath(); Draw.fillStroke(g, '#adb5bd', '#1a1a1a', 5);
    } else if (k === 1) {
      g.rotate(-0.1);
      Draw.rrect(g, -65, -85, 130, 170, 6); Draw.fillStroke(g, '#fff', '#1a1a1a', 5);
      g.strokeStyle = '#a2d2ff'; g.lineWidth = 3;
      for (let yy = -55; yy < 80; yy += 22) { g.beginPath(); g.moveTo(-50, yy); g.lineTo(50, yy); g.stroke(); }
    } else {
      for (const r of [-0.35, 0.35]) {
        g.save(); g.rotate(r);
        Draw.rrect(g, -8, -100, 16, 100, 8); Draw.fillStroke(g, '#ced4da', '#1a1a1a', 4);
        Draw.ellipse(g, 0, 35, 22, 30); Draw.fillStroke(g, '#ef233c', '#1a1a1a', 5);
        Draw.ellipse(g, 0, 35, 10, 16); g.fillStyle = '#ffe8d6'; g.fill();
        g.restore();
      }
    }
    g.restore();
  },

  draw(s, g) {
    g.fillStyle = '#ffe8d6'; g.fillRect(0, 0, W, H);
    g.fillStyle = '#ffd6a5'; g.fillRect(W / 2, 0, W / 2, H);
    // robot
    Draw.rrect(g, 640, 40, 200, 150, 24); Draw.fillStroke(g, '#90e0ef');
    Draw.circle(g, 700, 110, 18); Draw.circle(g, 780, 110, 18); g.fillStyle = '#1a1a1a'; g.fill();
    Draw.text(g, 'ROBOT', 740, 220, 30);
    this.hand(g, s.bot, 740, 360, -1);
    if (s.me >= 0) this.hand(g, s.me, 240, 360, 1);
    else Draw.text(g, '?', 240, 340, 160, '#fff');
    Draw.text(g, 'TOI', 240, 120, 50);
    Draw.text(g, this.HANDS[s.bot].name, 740, 480, 40, '#fff');
  },
});
