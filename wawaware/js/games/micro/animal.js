// MICRO (voix) : nommer l'animal qui sort de la boîte
Engine.register({
  id: 'animal',
  name: 'Quel animal ?',
  icon: '🐷',
  instruction: 'NOMME-LE !',
  input: 'micro',
  hint: 'DIS LE NOM DE L\'ANIMAL',
  duration: 6,
  needsMic: true,
  needsVoice: true,
  noSpeedup: true,
  // mots à reconnaître (moteur vocal intégré)
  vocab: ['chien', 'chat', 'poisson', 'oiseau', 'cochon', 'toutou', 'chiot', 'minou', 'chaton', 'poussin', 'canari', 'poule', 'porc'],
  ANIMALS: [
    { name: 'CHIEN', words: ['chien', 'chiens', 'chienne', 'toutou', 'chiot'] },
    { name: 'CHAT', words: ['chat', 'chats', 'chatte', 'sha', 'minou', 'chaton'] },
    { name: 'POISSON', words: ['poisson', 'poissons', 'poison'] },
    { name: 'OISEAU', words: ['oiseau', 'oiseaux', 'poussin', 'poussins', 'canari', 'poule'] },
    { name: 'COCHON', words: ['cochon', 'cochons', 'porc', 'cochonne', 'goret'] },
  ],

  start(c) { return { t: 0, k: Math.floor(c.rng() * this.ANIMALS.length) }; },

  update(s, dt, c) {
    s.t += dt;
    if (s.won || s.lost || c.over) return;
    const text = c.heard();
    if (Voice.match(text, [this.ANIMALS[s.k].words]) === 0) s.won = true;
    else if (Voice.match(text, this.ANIMALS.map(a => a.words)) >= 0) { s.lost = true; c.sfx.hit(); }
  },

  draw(s, g) {
    Draw.stripes(g, s.t * 0.4, '#ffafcc', '#ffc8dd');
    const pop = clamp(s.t / 0.3, 0, 1);
    const x = W / 2, y = 400;
    g.save();
    g.translate(0, (1 - pop) * 150);
    switch (s.k) {
      case 0: Draw.dog(g, x - 20, y, { pose: 'assis', t: s.t }); break;
      case 1: Draw.cat(g, x, y, { t: s.t }); break;
      case 2:
        g.save(); g.translate(x, y - 80); g.scale(2, 2);
        g.beginPath(); g.moveTo(-34, 0); g.lineTo(-58, -18); g.lineTo(-58, 18); g.closePath(); Draw.fillStroke(g, '#fb8500', '#1a1a1a', 2);
        Draw.ellipse(g, 0, 0, 38, 22); Draw.fillStroke(g, '#ffb703', '#1a1a1a', 2);
        Draw.circle(g, 20, -5, 5); g.fillStyle = '#1a1a1a'; g.fill();
        g.restore(); break;
      case 3:
        g.save(); g.translate(x, y - 70); g.scale(2.5, 2.5);
        Draw.ellipse(g, 0, 6, 30, 24); Draw.fillStroke(g, '#ffd60a', '#1a1a1a', 2);
        Draw.circle(g, 14, -14, 18); Draw.fillStroke(g, '#ffd60a', '#1a1a1a', 2);
        Draw.circle(g, 20, -18, 4); g.fillStyle = '#1a1a1a'; g.fill();
        g.beginPath(); g.moveTo(30, -14); g.lineTo(44, -9); g.lineTo(30, -5); g.closePath(); Draw.fillStroke(g, '#fb8500', '#1a1a1a', 2);
        g.restore(); break;
      default:
        Draw.ellipse(g, x, y - 70, 110, 75); Draw.fillStroke(g, '#ffafcc');
        for (const lx of [-60, -25, 25, 60]) { g.fillStyle = '#ff8fab'; g.fillRect(x + lx - 10, y - 10, 20, 12); }
        Draw.circle(g, x + 90, y - 110, 55); Draw.fillStroke(g, '#ffafcc');
        Draw.ellipse(g, x + 140, y - 100, 20, 26); Draw.fillStroke(g, '#ff8fab');
        Draw.circle(g, x + 135, y - 100, 5); Draw.circle(g, x + 146, y - 100, 5); g.fillStyle = '#1a1a1a'; g.fill();
        Draw.circle(g, x + 95, y - 125, 6); g.fill();
        g.beginPath(); g.moveTo(x + 70, y - 155); g.lineTo(x + 60, y - 185); g.lineTo(x + 95, y - 162); g.closePath(); Draw.fillStroke(g, '#ff8fab');
    }
    g.restore();
    // boîte
    Draw.rrect(g, x - 160, y, 320, 120, 10); Draw.fillStroke(g, '#c9a227');
    Draw.text(g, '?', x, y + 60, 70, '#fff');
    if (s.won || s.lost) Draw.text(g, this.ANIMALS[s.k].name, x, 70, 60, '#fff');
  },
});
