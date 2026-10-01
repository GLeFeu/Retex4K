// CLAVIER (← → + Espace) : abattre tous les envahisseurs
Engine.register({
  id: 'invaders', name: 'Envahisseurs', icon: '👾', instruction: 'TIRE !', input: 'clavier',
  hint: '← → POUR BOUGER, ESPACE POUR TIRER', duration: 6, PY: 480,

  start(c) {
    const n = 4 + Math.min(4, c.diff), aliens = [];
    for (let i = 0; i < n; i++) aliens.push({ x: 200 + (i % 4) * 160 + Math.floor(i / 4) * 80, y: 90 + Math.floor(i / 4) * 80, dead: 0 });
    return { t: 0, x: W / 2, shots: [], aliens, dir: 1, sp: 90 + 15 * Math.min(c.diff, 6), cd: 0 };
  },

  update(s, dt, c) {
    s.t += dt;
    s.cd = Math.max(0, s.cd - dt);
    const inp = c.input;
    if (!c.over) {
      if (inp.isDown('ArrowLeft', 'KeyA')) s.x -= 560 * dt;
      if (inp.isDown('ArrowRight', 'KeyD')) s.x += 560 * dt;
      s.x = clamp(s.x, 40, W - 40);
      if (inp.wasPressed('Space') && s.cd === 0) { s.shots.push({ x: s.x, y: this.PY - 30 }); s.cd = 0.18; c.sfx.tone(1200, 0.05, 'square', 0.06, 0, 0.5); }
    }
    const alive = s.aliens.filter(a => !a.dead);
    const minX = Math.min(...alive.map(a => a.x), W), maxX = Math.max(...alive.map(a => a.x), 0);
    if ((maxX > W - 50 && s.dir > 0) || (minX < 50 && s.dir < 0)) { s.dir = -s.dir; for (const a of s.aliens) a.y += 14; }
    for (const a of s.aliens) { if (a.dead) a.dead += dt; else a.x += s.dir * s.sp * dt; }
    for (const sh of s.shots) {
      sh.y -= 700 * dt;
      const a = s.aliens.find(o => !o.dead && Math.abs(o.x - sh.x) < 30 && Math.abs(o.y - sh.y) < 24);
      if (a) { a.dead = 0.001; sh.y = -100; c.sfx.noise(0.1, 0.2, 0, 2000); }
    }
    s.shots = s.shots.filter(sh => sh.y > -20);
    if (!s.won && s.aliens.every(a => a.dead)) s.won = true;
  },

  draw(s, g) {
    g.fillStyle = '#000814'; g.fillRect(0, 0, W, H);
    for (let i = 0; i < 50; i++) { Draw.circle(g, (i * 179) % W, (i * 61) % H, 1.2); g.fillStyle = '#fff'; g.fill(); }
    for (const a of s.aliens) {
      if (a.dead > 0.3) continue;
      if (a.dead) { Draw.burst(g, a.x, a.y, 30); continue; }
      const f = Math.floor(s.t * 4) % 2;
      g.save(); g.translate(a.x, a.y);
      Draw.rrect(g, -24, -16, 48, 30, 10); Draw.fillStroke(g, '#70e000', '#1a1a1a', 3);
      g.fillStyle = '#1a1a1a'; g.fillRect(-12, -8, 7, 7); g.fillRect(5, -8, 7, 7);
      g.fillStyle = '#70e000'; g.fillRect(-26, 12, 8, f ? 12 : 6); g.fillRect(18, 12, 8, f ? 6 : 12);
      g.restore();
    }
    g.fillStyle = '#ffd400'; for (const sh of s.shots) g.fillRect(sh.x - 3, sh.y - 12, 6, 18);
    g.save(); g.translate(s.x, this.PY);
    g.beginPath(); g.moveTo(0, -30); g.lineTo(34, 16); g.lineTo(-34, 16); g.closePath(); Draw.fillStroke(g, '#4cc9f0');
    g.restore();
  },
});
