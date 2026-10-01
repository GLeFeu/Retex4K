// MICRO (voix) : dire la COULEUR de l'encre (piège : le mot écrit est une autre couleur)
Engine.register({
  id: 'couleur',
  name: 'Quelle couleur ?',
  icon: '🎨',
  instruction: 'DIS LA COULEUR !',
  input: 'micro',
  hint: 'LA COULEUR DE L\'ENCRE, PAS LE MOT',
  duration: 7,
  needsMic: true,
  needsVoice: true,
  noSpeedup: true,
  // mots à reconnaître (moteur vocal intégré)
  vocab: ['rouge', 'bleu', 'vert', 'jaune'],
  COLS: [
    { key: 'rouge', name: 'ROUGE', hex: '#ef233c' },
    { key: 'bleu', name: 'BLEU', hex: '#3a86ff' },
    { key: 'vert', name: 'VERT', hex: '#2b9348' },
    { key: 'jaune', name: 'JAUNE', hex: '#ffd400' },
  ],

  start(c) {
    const ink = Math.floor(c.rng() * 4);
    let word = Math.floor(c.rng() * 4);
    if (c.diff >= 1) while (word === ink) word = Math.floor(c.rng() * 4);
    return { t: 0, ink, word, stroop: c.diff >= 1 };
  },

  update(s, dt, c) {
    s.t += dt;
    if (s.won || s.lost || c.over) return;
    const text = c.heard();
    if (Voice.match(text, [WORDS[this.COLS[s.ink].key]]) === 0) s.won = true;
    else if (Voice.match(text, this.COLS.map(col => WORDS[col.key])) >= 0) { s.lost = true; c.sfx.hit(); }
  },

  draw(s, g) {
    Draw.stripes(g, s.t * 0.3, '#f8f9fa', '#e9ecef');
    const col = this.COLS[s.ink];
    if (s.stroop) {
      g.save();
      g.translate(W / 2, H / 2);
      g.rotate(Math.sin(s.t * 2) * 0.04);
      Draw.text(g, this.COLS[s.word].name, 0, 0, 170, col.hex, '#1a1a1a');
      g.restore();
    } else {
      Draw.circle(g, W / 2, H / 2, 130 + Math.sin(s.t * 4) * 6); Draw.fillStroke(g, col.hex, '#1a1a1a', 8);
    }
    if (s.won || s.lost) Draw.text(g, `C'ÉTAIT ${col.name}`, W / 2, H - 70, 40, col.hex);
  },
});
