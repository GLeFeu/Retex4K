// CLAVIER (flèches) : reproduire la suite de flèches sans se tromper
Engine.register({
  id: 'sequence',
  name: 'Danse !',
  icon: '🕺',
  instruction: 'RÉPÈTE !',
  input: 'clavier',
  hint: 'FLÈCHES (OU Z Q S D) DANS L\'ORDRE',
  duration: 5,
  DIRS: [
    { codes: ['ArrowUp', 'KeyW'], a: -Math.PI / 2 },
    { codes: ['ArrowRight', 'KeyD'], a: 0 },
    { codes: ['ArrowDown', 'KeyS'], a: Math.PI / 2 },
    { codes: ['ArrowLeft', 'KeyA'], a: Math.PI },
  ],

  start(c) {
    const len = 3 + Math.min(c.diff, 4);
    return { t: 0, seq: Array.from({ length: len }, () => Math.floor(c.rng() * 4)), i: 0, pose: -1, poseT: 0 };
  },

  update(s, dt, c) {
    s.t += dt;
    s.poseT = Math.max(0, s.poseT - dt);
    if (s.won || s.lost || c.over) return;
    for (let d = 0; d < 4; d++) {
      if (!c.input.wasPressed(...this.DIRS[d].codes)) continue;
      s.pose = d; s.poseT = 0.25;
      if (d === s.seq[s.i]) {
        s.i++;
        c.sfx.tone([523, 587, 659, 698, 784, 880, 988][(s.i - 1) % 7], 0.1, 'square', 0.1);
        if (s.i >= s.seq.length) s.won = true;
      } else { s.lost = true; c.sfx.hit(); }
      return;
    }
  },

  arrow(g, x, y, a, size, fill) {
    g.save(); g.translate(x, y); g.rotate(a);
    g.beginPath();
    g.moveTo(size * 0.5, 0); g.lineTo(0, -size * 0.45); g.lineTo(0, -size * 0.18); g.lineTo(-size * 0.45, -size * 0.18);
    g.lineTo(-size * 0.45, size * 0.18); g.lineTo(0, size * 0.18); g.lineTo(0, size * 0.45); g.closePath();
    Draw.fillStroke(g, fill, '#1a1a1a', 4);
    g.restore();
  },

  draw(s, g) {
    Draw.stripes(g, s.t, '#7209b7', '#560bad');
    // piste de danse
    for (let i = 0; i < 8; i++) for (let j = 0; j < 2; j++) {
      g.fillStyle = ['#f72585', '#4cc9f0', '#ffd400', '#06d6a0'][(i + j * 2 + Math.floor(s.t * 4)) % 4];
      g.fillRect(i * 120, 400 + j * 70, 120, 70);
    }
    const n = s.seq.length, step = Math.min(110, 760 / n);
    s.seq.forEach((d, k) => {
      const x = W / 2 + (k - (n - 1) / 2) * step, y = 130;
      const cur = k === s.i && !s.won && !s.lost;
      Draw.rrect(g, x - step * 0.42, y - step * 0.42, step * 0.84, step * 0.84, 14);
      Draw.fillStroke(g, k < s.i ? '#06d6a0' : (s.lost && k === s.i) ? '#ef233c' : cur ? '#fff' : 'rgba(255,255,255,0.6)', '#1a1a1a', cur ? 6 : 4);
      this.arrow(g, x, y, this.DIRS[d].a, step * 0.6, k < s.i ? '#fff' : '#ffd400');
    });
    const pose = s.poseT > 0 ? s.pose : -1;
    const face = pose === 3 ? -1 : 1;
    const jump = pose === 0 ? -30 : pose === 2 ? 15 : 0;
    Draw.hero(g, W / 2, 440 + jump, { face, rot: pose === 1 ? 0.3 : pose === 3 ? -0.3 : 0 });
  },
});
