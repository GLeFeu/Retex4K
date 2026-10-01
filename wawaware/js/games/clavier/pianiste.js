// CLAVIER (D F J K) : jouer les notes qui tombent au bon moment
Engine.register({
  id: 'pianiste', name: 'Piano Hero', icon: '🎹', instruction: 'JOUE !', input: 'clavier',
  hint: 'TOUCHES D F J K QUAND LA NOTE ARRIVE', duration: 6, HIT: 430,
  LANES: [{ code: 'KeyD', key: 'D' }, { code: 'KeyF', key: 'F' }, { code: 'KeyJ', key: 'J' }, { code: 'KeyK', key: 'K' }],

  start(c) {
    const n = 6 + Math.min(c.diff, 6), notes = [];
    const sp = 300 + 20 * Math.min(c.diff, 6);
    for (let i = 0; i < n; i++) notes.push({ lane: Math.floor(c.rng() * 4), y: -i * (600 / 1.3) / (1 + c.diff * 0.06) * (0.55) - 60, hit: false, miss: false });
    return { t: 0, notes, sp, misses: 0, got: 0, flash: [0, 0, 0, 0] };
  },

  laneX(i) { return 300 + i * 120; },

  update(s, dt, c) {
    s.t += dt;
    s.flash = s.flash.map(f => Math.max(0, f - dt));
    for (const n of s.notes) {
      if (n.hit) continue;
      n.y += s.sp * dt;
      if (!n.miss && n.y > this.HIT + 50) { n.miss = true; s.misses++; c.sfx.tone(120, 0.1, 'sawtooth', 0.06); }
    }
    if (s.misses >= 2 && !s.lost && !c.over) { s.lost = true; return; }
    if (s.won || s.lost || c.over) return;
    this.LANES.forEach((ln, i) => {
      if (!c.input.wasPressed(ln.code)) return;
      s.flash[i] = 0.12;
      const n = s.notes.find(o => !o.hit && !o.miss && o.lane === i && Math.abs(o.y - this.HIT) < 50);
      if (n) { n.hit = true; s.got++; c.sfx.tone([523, 659, 784, 1047][i], 0.12, 'triangle', 0.12); }
    });
    if (s.notes.every(n => n.hit || n.miss) && !s.lost) s.won = true;
  },

  draw(s, g) {
    g.fillStyle = '#10002b'; g.fillRect(0, 0, W, H);
    this.LANES.forEach((ln, i) => {
      const x = this.laneX(i);
      g.fillStyle = i % 2 ? '#240046' : '#3c096c'; g.fillRect(x - 55, 0, 110, H);
      Draw.rrect(g, x - 50, this.HIT - 25, 100, 50, 12); Draw.fillStroke(g, s.flash[i] > 0 ? '#ffd400' : '#5a189a', '#fff', 3);
      Draw.text(g, ln.key, x, this.HIT + 2, 30, '#fff', null);
    });
    for (const n of s.notes) {
      if (n.hit || n.y < -40 || n.y > H + 40) continue;
      Draw.rrect(g, this.laneX(n.lane) - 44, n.y - 18, 88, 36, 12); Draw.fillStroke(g, n.miss ? '#6c757d' : ['#ef233c', '#ffd400', '#06d6a0', '#4cc9f0'][n.lane]);
    }
    Draw.text(g, `RATÉES : ${s.misses}/2`, 130, 50, 26, '#ff8fa3');
  },
});
