// MICRO (voix) : le chien file vers la route, dis "au pied" pour le rappeler
Engine.register({
  id: 'aupied',
  name: 'Au pied !',
  icon: '🦮',
  instruction: 'RAPPELLE-LE !',
  input: 'micro',
  hint: 'DIS « AU PIED ! »',
  duration: 7,
  needsMic: true,
  needsVoice: true,
  noSpeedup: true,
  // mots à reconnaître (moteur vocal intégré)
  vocab: ['au pied'],
  ROAD: 800,

  start(c) {
    return { t: 0, x: 360, speed: 70 + 8 * Math.min(c.diff, 6), back: false };
  },

  update(s, dt, c) {
    s.t += dt;
    if (s.back) { s.x = Math.max(240, s.x - 380 * dt); return; }
    if (s.lost) { s.x += 200 * dt; return; }
    s.x += s.speed * dt;
    if (c.over) return;
    if (Voice.match(c.heard(), [WORDS.aupied]) === 0) {
      s.back = true;
      s.won = true;
      c.sfx.tone(600, 0.1, 'square', 0.1);
    } else if (s.x > this.ROAD - 40) { s.lost = true; c.sfx.tone(300, 0.4, 'sawtooth', 0.1); }
  },

  draw(s, g) {
    Draw.sky(g, '#bde0fe', '#ffffff', 330);
    for (let x = 30; x < 760; x += 130) { g.fillStyle = '#e5989b'; g.fillRect(x, 170, 100, 160); g.fillStyle = '#90e0ef'; g.fillRect(x + 20, 200, 25, 30); g.fillRect(x + 55, 200, 25, 30); }
    Draw.ground(g, 330, '#d8e2dc', '#adb5bd');
    // route
    g.fillStyle = '#495057'; g.fillRect(this.ROAD, 300, W - this.ROAD, H);
    g.fillStyle = '#fff';
    for (let y = 310; y < H; y += 50) g.fillRect(this.ROAD + 70, y, 10, 28);
    // voiture qui passe
    const cy = ((s.t * 260) % 900) - 200;
    Draw.rrect(g, this.ROAD + 20, cy, 50, 90, 12); Draw.fillStroke(g, '#ef233c');
    Draw.hero(g, 150, 470, {});
    if (!s.back && !s.lost) {
      Draw.bubble(g, 230, 200, 230, 70, 180, 260);
      Draw.text(g, 'AU PIED !', 230, 202, 36, '#ef233c', null);
    }
    Draw.dog(g, s.x, 470, { pose: s.back ? 'court' : 'court', face: s.back ? -1 : 1, t: s.t, scale: 0.8 });
    if (s.lost) Draw.text(g, 'IL S\'EST SAUVÉ !', 480, 120, 50, '#ef233c');
    // flèche de danger
    const k = clamp((s.x - 360) / (this.ROAD - 400), 0, 1);
    Draw.rrect(g, 300, 380, 400, 22, 11); Draw.fillStroke(g, '#fff', '#1a1a1a', 3);
    if (k > 0.02) { Draw.rrect(g, 303, 383, 394 * k, 16, 8); g.fillStyle = k > 0.7 ? '#ef233c' : '#ffb703'; g.fill(); }
  },
});
