// MICRO (voix) : dire le contraire du mot affiché
Engine.register({
  id: 'contraire',
  name: 'Le contraire',
  icon: '🔄',
  instruction: 'DIS LE CONTRAIRE !',
  input: 'micro',
  hint: 'EX. : CHAUD → « FROID »',
  duration: 7,
  needsMic: true,
  needsVoice: true,
  noSpeedup: true,
  // mots à reconnaître (moteur vocal intégré)
  vocab: ['froid', 'petit', 'nuit', 'bas', 'blanc', 'vide', 'fermé', 'mou', 'lent', 'lentement', 'droite', 'content', 'joyeux', 'heureux'],
  PAIRS: [
    ['CHAUD', ['froid', 'froide', 'froids']],
    ['GRAND', ['petit', 'petite', 'petits']],
    ['JOUR', ['nuit', 'nuits', 'nui']],
    ['HAUT', ['bas', 'ba', 'bah', 'en bas']],
    ['NOIR', ['blanc', 'blanche', 'blancs']],
    ['PLEIN', ['vide', 'vides']],
    ['OUVERT', ['ferme', 'fermee', 'fermer', 'fermez']],
    ['DUR', ['mou', 'molle', 'mous', 'moue']],
    ['RAPIDE', ['lent', 'lente', 'lentement', 'lend']],
    ['GAUCHE', ['droite', 'droit', 'a droite']],
    ['TRISTE', ['content', 'contente', 'joyeux', 'heureux', 'heureuse', 'gai']],
  ],

  start(c) { return { t: 0, p: this.PAIRS[Math.floor(c.rng() * this.PAIRS.length)] }; },

  update(s, dt, c) {
    s.t += dt;
    if (!s.won && !c.over && Voice.match(c.heard(), [s.p[1]]) === 0) s.won = true;
  },

  draw(s, g) {
    Draw.stripes(g, -s.t * 0.4, '#06d6a0', '#1b9aaa');
    g.save();
    g.translate(W / 2, 230);
    g.rotate(Math.sin(s.t * 3) * 0.05);
    Draw.text(g, s.p[0], 0, 0, 150, '#fff');
    g.restore();
    Draw.text(g, '↓↑', W / 2, 360, 70, '#ffd400');
    Draw.text(g, s.won ? s.p[1][0].toUpperCase() : '???', W / 2, 450, 70, s.won ? '#ffd400' : 'rgba(255,255,255,0.6)');
  },
});
