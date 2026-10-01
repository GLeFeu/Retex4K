// MICRO (voix) : quiz express, répondre oui ou non
Engine.register({
  id: 'ouinon',
  name: 'Vrai ou faux',
  icon: '❓',
  instruction: 'OUI OU NON ?',
  input: 'micro',
  hint: 'RÉPONDS « OUI » OU « NON »',
  duration: 7,
  needsMic: true,
  needsVoice: true,
  noSpeedup: true,
  // mots à reconnaître (moteur vocal intégré)
  vocab: ['oui', 'non', 'ouais'],
  QUESTIONS: [
    ['UN CHAT A 4 PATTES ?', true], ['LE FEU EST FROID ?', false], ['2 + 2 = 4 ?', true],
    ['LES POISSONS VOLENT ?', false], ['LA NEIGE EST BLANCHE ?', true], ['UNE BANANE EST BLEUE ?', false],
    ['LE SOLEIL BRILLE LA NUIT ?', false], ['UNE SEMAINE A 7 JOURS ?', true], ['LES VACHES FONT MIAOU ?', false],
    ['10 EST PLUS GRAND QUE 3 ?', true], ['PARIS EST EN FRANCE ?', true], ['UN TRIANGLE A 4 CÔTÉS ?', false],
    ['L\'EAU MOUILLE ?', true], ['UNE ARAIGNÉE A 6 PATTES ?', false], ['LA LUNE EST UN FROMAGE ?', false],
  ],

  start(c) { return { t: 0, q: this.QUESTIONS[Math.floor(c.rng() * this.QUESTIONS.length)], said: -1 }; },

  update(s, dt, c) {
    s.t += dt;
    if (s.said >= 0 || c.over) return;
    const good = s.q[1] ? WORDS.oui : WORDS.non, bad = s.q[1] ? WORDS.non : WORDS.oui;
    const text = c.heard();
    if (Voice.match(text, [good]) === 0) { s.said = s.q[1] ? 0 : 1; s.won = true; }
    else if (Voice.match(text, [bad]) === 0) { s.said = s.q[1] ? 1 : 0; s.lost = true; c.sfx.hit(); }
  },

  draw(s, g) {
    Draw.stripes(g, s.t * 0.5, '#3a0ca3', '#4361ee');
    Draw.rrect(g, 80, 70, 800, 200, 24); Draw.fillStroke(g, '#fff');
    const size = s.q[0].length > 22 ? 44 : 54;
    Draw.text(g, s.q[0], W / 2, 170, size, '#1a1a1a', null);
    Draw.btn(g, 320, 400, 220, 100, 'OUI', s.said === 0 ? '#06d6a0' : '#b7e4c7', 56);
    Draw.btn(g, 640, 400, 220, 100, 'NON', s.said === 1 ? '#ef233c' : '#ffccd5', 56);
  },
});
