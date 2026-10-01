// MICRO (voix) : compter les moutons et dire le nombre
Engine.register({
  id: 'compte',
  name: 'Compte les moutons',
  icon: '🐑',
  instruction: 'COMBIEN ?',
  input: 'micro',
  hint: 'DIS LE NOMBRE DE MOUTONS',
  duration: 7,
  needsMic: true,
  needsVoice: true,
  noSpeedup: true,
  // mots à reconnaître (moteur vocal intégré)
  vocab: [],

  start(c) {
    const n = 2 + Math.floor(c.rng() * Math.min(9, 4 + c.diff * 1.5));
    const sheep = [];
    while (sheep.length < n) {
      const x = 100 + c.rng() * 760, y = 230 + c.rng() * 230;
      if (sheep.every(o => Math.hypot(o.x - x, o.y - y) > 95)) sheep.push({ x, y, ph: c.rng() * 6, face: c.rng() < 0.5 ? 1 : -1 });
    }
    sheep.sort((a, b) => a.y - b.y);
    return { t: 0, n, sheep };
  },

  update(s, dt, c) {
    s.t += dt;
    if (s.won || c.over) return;
    if (Voice.numbers(c.heard()).has(s.n)) s.won = true;
  },

  draw(s, g) {
    Draw.sky(g, '#caf0f8', '#ffffff', 200);
    Draw.ground(g, 180, '#95d5b2', '#74c69d');
    for (const o of s.sheep) {
      const b = Math.abs(Math.sin(s.t * 3 + o.ph)) * 6;
      g.save(); g.translate(o.x, o.y - b); g.scale(o.face, 1);
      g.fillStyle = '#1a1a1a'; g.fillRect(-22, 10, 9, 26); g.fillRect(14, 10, 9, 26);
      for (const [cx, cy] of [[-22, -6], [0, -14], [22, -6], [-12, 8], [12, 8]]) { Draw.circle(g, cx, cy, 18); Draw.fillStroke(g, '#fff', '#1a1a1a', 3); }
      Draw.ellipse(g, 36, -10, 14, 18); Draw.fillStroke(g, '#343a40');
      Draw.circle(g, 40, -14, 3); g.fillStyle = '#fff'; g.fill();
      g.restore();
    }
    if (s.won) Draw.text(g, `${s.n} !`, W / 2, 100, 90, '#ffd400');
  },
});
