// SOURIS : stand de tir, toucher les cibles qui défilent
Engine.register({
  id: 'cible', name: 'Stand de tir', icon: '🎯', instruction: 'TIRE !', input: 'souris',
  hint: 'CLIQUE SUR 4 CIBLES', duration: 5, cursor: 'crosshair',

  start(c) {
    const sp = 160 + 30 * Math.min(c.diff, 6), targets = [];
    for (let i = 0; i < 6; i++) {
      const row = i % 2;
      targets.push({ x: (i * 190 + c.rng() * 80) % W, row, v: row ? -sp : sp, hit: 0 });
    }
    return { t: 0, need: 4, got: 0, targets, holes: [] };
  },

  update(s, dt, c) {
    s.t += dt;
    for (const tg of s.targets) {
      if (tg.hit) { tg.hit += dt; continue; }
      tg.x += tg.v * dt;
      if (tg.x > W + 50) tg.x = -50; if (tg.x < -50) tg.x = W + 50;
    }
    if (!c.input.clicked || c.over || s.won) return;
    c.sfx.noise(0.08, 0.25, 0, 3000);
    const tg = s.targets.find(o => !o.hit && Math.hypot(c.input.x - o.x, c.input.y - (o.row ? 330 : 170)) < 42);
    if (tg) { tg.hit = 0.001; s.got++; c.sfx.tone(900, 0.08, 'square', 0.1); if (s.got >= s.need) s.won = true; }
    else s.holes.push({ x: c.input.x, y: c.input.y });
  },

  draw(s, g) {
    g.fillStyle = '#6f1d1b'; g.fillRect(0, 0, W, H);
    for (const y of [220, 380]) { g.fillStyle = '#432818'; g.fillRect(0, y, W, 18); }
    for (const tg of s.targets) {
      const y = tg.row ? 330 : 170;
      g.fillStyle = '#99582a'; g.fillRect(tg.x - 4, y, 8, (tg.row ? 380 : 220) - y);
      g.save(); g.translate(tg.x, y); if (tg.hit) g.scale(1, Math.max(0.05, 1 - tg.hit * 5));
      for (const [r, col] of [[40, '#fff'], [30, '#ef233c'], [20, '#fff'], [10, '#ef233c']]) { Draw.circle(g, 0, 0, r); Draw.fillStroke(g, col, '#1a1a1a', 3); }
      g.restore();
    }
    for (const h of s.holes) { Draw.circle(g, h.x, h.y, 5); g.fillStyle = '#1a1a1a'; g.fill(); }
    Draw.rrect(g, 0, 440, W, 100, 0); Draw.fillStroke(g, '#bb9457');
    Draw.text(g, `${s.got} / ${s.need}`, W - 90, 490, 44);
  },
});
