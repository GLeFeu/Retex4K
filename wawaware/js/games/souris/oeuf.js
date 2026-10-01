// SOURIS : cliquer sur les œufs qui tombent avant qu'ils ne se cassent
Engine.register({
  id: 'oeuf', name: 'Pluie d\'œufs', icon: '🥚', instruction: 'RATTRAPE !', input: 'souris',
  hint: 'CLIQUE LES ŒUFS AVANT LE SOL', duration: 5, cursor: 'pointer', HENS: [180, 400, 620, 840],

  start(c) { return { t: 0, eggs: [], spawnT: 0.2, need: 4, got: 0, rate: Math.max(0.4, 0.8 - 0.06 * c.diff), fall: 150 + 25 * c.diff, splat: null }; },

  update(s, dt, c) {
    s.t += dt;
    s.spawnT -= dt;
    if (s.spawnT <= 0 && !s.won && !s.lost) {
      s.eggs.push({ x: this.HENS[Math.floor(c.rng() * 4)], y: 120, vy: s.fall });
      s.spawnT = s.rate * (0.8 + c.rng() * 0.4);
    }
    for (const e of s.eggs) { e.vy += 300 * dt; e.y += e.vy * dt; }
    if (!c.over && !s.lost && s.eggs.some(e => e.y > 450)) { s.lost = true; s.splat = s.eggs.find(e => e.y > 450); c.sfx.splat(); }
    s.eggs = s.eggs.filter(e => e.y <= 450);
    if (c.input.clicked && !c.over && !s.won && !s.lost) {
      const e = s.eggs.find(o => Math.hypot(c.input.x - o.x, c.input.y - o.y) < 40);
      if (e) { s.eggs.splice(s.eggs.indexOf(e), 1); s.got++; c.sfx.tone(800, 0.06, 'square', 0.1); if (s.got >= s.need) s.won = true; }
    }
  },

  draw(s, g) {
    Draw.sky(g, '#fde4cf', '#ffcfd2');
    g.fillStyle = '#9c6644'; g.fillRect(0, 100, W, 16);
    for (const x of this.HENS) {
      Draw.ellipse(g, x, 70, 40, 32); Draw.fillStroke(g, '#fff');
      Draw.circle(g, x + 30, 45, 18); Draw.fillStroke(g, '#fff');
      g.beginPath(); g.moveTo(x + 46, 45); g.lineTo(x + 60, 50); g.lineTo(x + 46, 55); g.closePath(); Draw.fillStroke(g, '#fb8500', '#1a1a1a', 2);
      Draw.circle(g, x + 34, 40, 3); g.fillStyle = '#1a1a1a'; g.fill();
      Draw.ellipse(g, x + 28, 26, 8, 6); g.fillStyle = '#ef233c'; g.fill();
    }
    Draw.ground(g, 470, '#d4a373', '#bc8a5f');
    for (const e of s.eggs) { Draw.ellipse(g, e.x, e.y, 20, 26); Draw.fillStroke(g, '#fefae0'); }
    if (s.splat) { Draw.ellipse(g, s.splat.x, 470, 50, 12); g.fillStyle = '#fff'; g.fill(); Draw.circle(g, s.splat.x, 468, 12); g.fillStyle = '#ffb703'; g.fill(); }
    Draw.text(g, `${s.got} / ${s.need}`, W - 90, 500, 40);
  },
});
