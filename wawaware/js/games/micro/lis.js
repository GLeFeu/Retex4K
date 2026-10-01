// MICRO (voix) : lire à voix haute le(s) mot(s) affiché(s)
Engine.register({
  id: 'lis',
  name: 'Lis à voix haute',
  icon: '📖',
  instruction: 'LIS-LE !',
  input: 'micro',
  hint: 'LIS LE MOT À VOIX HAUTE',
  duration: 7,
  needsMic: true,
  needsVoice: true,
  noSpeedup: true,
  // mots à reconnaître (moteur vocal intégré)
  vocab: ['banane', 'crocodile', 'saucisson', 'parapluie', 'hélicoptère', 'chocolat', 'trompette', 'papillon', 'dinosaure', 'pingouin', 'ordinateur', 'kangourou', 'croissant', 'téléphone'],
  LIST: ['BANANE', 'CROCODILE', 'SAUCISSON', 'PARAPLUIE', 'HÉLICOPTÈRE', 'CHOCOLAT', 'TROMPETTE',
    'PAPILLON', 'DINOSAURE', 'PINGOUIN', 'ORDINATEUR', 'KANGOUROU', 'CROISSANT', 'TÉLÉPHONE'],

  start(c) {
    const n = c.diff >= 2 ? 2 : 1, words = [];
    while (words.length < n) { const w = this.LIST[Math.floor(c.rng() * this.LIST.length)]; if (!words.includes(w)) words.push(w); }
    return { t: 0, words, ok: words.map(() => false) };
  },

  update(s, dt, c) {
    s.t += dt;
    if (s.won || c.over) return;
    const text = c.heard();
    s.words.forEach((w, i) => {
      const n = Voice.norm(w);
      if (!s.ok[i] && (text.includes(n) || text.includes(n.slice(0, 6)))) { s.ok[i] = true; c.sfx.tone(800, 0.08, 'square', 0.1); }
    });
    if (s.ok.every(Boolean)) s.won = true;
  },

  draw(s, g) {
    g.fillStyle = '#fff1e6'; g.fillRect(0, 0, W, H);
    // livre ouvert
    Draw.rrect(g, 100, 80, 760, 380, 20); Draw.fillStroke(g, '#bc6c25');
    Draw.rrect(g, 120, 95, 355, 350, 10); Draw.fillStroke(g, '#fefae0', '#1a1a1a', 3);
    Draw.rrect(g, 485, 95, 355, 350, 10); Draw.fillStroke(g, '#fefae0', '#1a1a1a', 3);
    s.words.forEach((w, i) => {
      const y = s.words.length === 1 ? 270 : 200 + i * 140;
      const size = Math.min(90, 1400 / w.length);
      Draw.text(g, w, W / 2, y, size, s.ok[i] ? '#06d6a0' : '#1a1a1a', '#fff');
      if (s.ok[i]) Draw.text(g, '✔', W / 2 + w.length * size * 0.33 + 30, y, 50, '#06d6a0', null);
    });
  },
});
