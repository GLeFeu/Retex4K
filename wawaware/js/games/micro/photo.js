// MICRO (voix) : dire "ouistiti" pour prendre la photo de famille
Engine.register({
  id: 'photo',
  name: 'Photo de famille',
  icon: '📸',
  instruction: 'SOURIEZ !',
  input: 'micro',
  hint: 'DIS « FROMAGE ! » (OU « OUISTITI »)',
  duration: 7,
  needsMic: true,
  needsVoice: true,
  noSpeedup: true,
  // mots à reconnaître (moteur vocal intégré)
  vocab: ['ouistiti', 'cheese', 'fromage'],
  WORDS: ['fromage', 'fromages', 'ouistiti', 'wistiti', 'ouisti', 'oui titi', 'wi sis', 'oui sis', 'wi titi', 'cheese', 'chiz'],

  start() { return { t: 0, flash: 0 }; },

  update(s, dt, c) {
    s.t += dt;
    if (s.won) { s.flash += dt; return; }
    if (!c.over && Voice.match(c.heard(), [this.WORDS]) === 0) { s.won = true; c.sfx.noise(0.15, 0.3, 0, 5000); }
  },

  draw(s, g) {
    g.fillStyle = '#fefae0'; g.fillRect(0, 0, W, H);
    g.fillStyle = '#e9edc9';
    for (let x = 0; x < W; x += 60) g.fillRect(x, 0, 30, H);
    Draw.ground(g, 430, '#ccd5ae', '#a3b18a');
    const fam = [['#ef233c', '#264653'], ['#ffd400', '#7b2cbf'], ['#06d6a0', '#3a86ff'], ['#ff8fa3', '#6a040f']];
    fam.forEach(([sh, pa], i) => Draw.hero(g, 300 + i * 120, 470 - (i % 2) * 10 + Math.abs(Math.sin(s.t * 4 + i)) * -6, { shirt: sh, pants: pa, face: i < 2 ? 1 : -1 }));
    // viseur
    g.strokeStyle = '#1a1a1a'; g.lineWidth = 8;
    for (const [x, y, dx, dy] of [[200, 120, 1, 1], [760, 120, -1, 1], [200, 500, 1, -1], [760, 500, -1, -1]]) {
      g.beginPath(); g.moveTo(x, y + dy * 50); g.lineTo(x, y); g.lineTo(x + dx * 50, y); g.stroke();
    }
    if (!s.won) {
      Draw.circle(g, 800, 70, 14); g.fillStyle = Math.floor(s.t * 3) % 2 ? '#ef233c' : '#6a040f'; g.fill();
    } else {
      g.fillStyle = `rgba(255,255,255,${Math.max(0, 1 - s.flash * 2)})`; g.fillRect(0, 0, W, H);
      Draw.text(g, 'CLIC !', W / 2, 90, 70, '#ffd400');
    }
  },
});
