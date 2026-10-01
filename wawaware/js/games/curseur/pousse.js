// CURSEUR : pousser le ballon dans le but avec le curseur (sans cliquer)
Engine.register({
  id: 'pousse', name: 'Tir au but', icon: '🥅', instruction: 'MARQUE !', input: 'curseur',
  hint: 'POUSSE LE BALLON AVEC TA SOURIS', duration: 5, cursor: 'none',

  start(c) { return { t: 0, x: 380, y: 270, vx: 0, vy: 0, px: c.input.x, py: c.input.y, gy: 270, gmove: c.diff >= 2 ? 90 : 0, keeper: c.diff >= 4 }; },

  update(s, dt, c) {
    s.t += dt;
    const mx = c.input.x, my = c.input.y;
    const mvx = (mx - s.px) / Math.max(dt, 0.001), mvy = (my - s.py) / Math.max(dt, 0.001);
    s.px = mx; s.py = my;
    const gy = s.gy + Math.sin(s.t * 1.6) * s.gmove;
    if (!s.won) {
      const dx = s.x - mx, dy = s.y - my, d = Math.hypot(dx, dy);
      if (d < 54 && d > 0) {
        s.x = mx + dx / d * 54; s.y = my + dy / d * 54;
        const push = Math.max(200, (mvx * dx + mvy * dy) / d);
        s.vx = dx / d * push * 1.2; s.vy = dy / d * push * 1.2;
      }
    }
    s.x += s.vx * dt; s.y += s.vy * dt;
    const f = Math.pow(0.4, dt); s.vx *= f; s.vy *= f;
    if (s.y < 30 || s.y > H - 30) { s.vy = -s.vy; s.y = clamp(s.y, 30, H - 30); }
    if (s.x < 30) { s.vx = Math.abs(s.vx); s.x = 30; }
    const goal = s.x > W - 60 && Math.abs(s.y - gy) < 80;
    if (s.keeper && s.x > W - 120 && Math.abs(s.y - (gy + Math.sin(s.t * 5) * 60)) < 40) { s.vx = -Math.abs(s.vx) - 100; }
    if (!s.won && goal && !c.over) { s.won = true; c.sfx.tone(800, 0.3, 'square', 0.1); }
    if (!goal && s.x > W - 30) { s.vx = -Math.abs(s.vx); s.x = W - 30; }
  },

  draw(s, g, c) {
    g.fillStyle = '#52b788'; g.fillRect(0, 0, W, H);
    g.fillStyle = '#40916c'; for (let x = 0; x < W; x += 120) g.fillRect(x, 0, 60, H);
    g.strokeStyle = '#fff'; g.lineWidth = 4; g.strokeRect(20, 20, W - 40, H - 40);
    const gy = s.gy + Math.sin(s.t * 1.6) * s.gmove;
    g.fillStyle = 'rgba(255,255,255,0.4)'; g.fillRect(W - 50, gy - 80, 40, 160);
    g.lineWidth = 8; g.strokeRect(W - 50, gy - 80, 40, 160);
    if (s.keeper) Draw.hero(g, W - 90, gy + Math.sin(s.t * 5) * 60 + 40, { face: -1, shirt: '#ef233c' });
    Draw.circle(g, s.x, s.y, 24); Draw.fillStroke(g, '#fff');
    g.fillStyle = '#1a1a1a'; Draw.circle(g, s.x, s.y, 8); g.fill();
    Draw.circle(g, c.input.x, c.input.y, 30); Draw.fillStroke(g, 'rgba(58,134,255,0.6)', '#1a1a1a', 3);
    if (s.won) Draw.text(g, 'BUUUT !', W / 2, 80, 70, '#ffd400');
  },
});
