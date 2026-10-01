// CLAVIER (Espace) : battre des ailes pour passer entre les tuyaux
Engine.register({
  id: 'flappy',
  name: 'Oiseau volant',
  icon: '🐦',
  instruction: 'VOLE !',
  input: 'clavier',
  hint: 'ESPACE POUR BATTRE DES AILES',
  duration: 5,
  survival: true,
  BX: 200, PW: 80,

  start(c) {
    const gap = Math.max(150, 210 - 10 * c.diff);
    const pipes = [520, 820, 1120, 1420].map(x => ({ x, gy: 150 + c.rng() * 220 }));
    return { t: 0, by: 240, vy: -300, pipes, gap, flap: 0 };
  },

  update(s, dt, c) {
    s.t += dt;
    s.flap = Math.max(0, s.flap - dt);
    if (!s.lost) {
      for (const p of s.pipes) p.x -= 280 * dt;
      if (!c.over && c.input.wasPressed('Space', 'ArrowUp', 'KeyW')) { s.vy = -420; s.flap = 0.15; c.sfx.jump(); }
    }
    s.vy += 1300 * dt;
    s.by = Math.min(GROUND - 16, s.by + s.vy * dt);
    if (s.lost || c.over) return;
    let hit = s.by < 16 || s.by >= GROUND - 16;
    for (const p of s.pipes) {
      if (Math.abs(p.x - this.BX) < this.PW / 2 + 14 && (s.by - 14 < p.gy - s.gap / 2 || s.by + 14 > p.gy + s.gap / 2)) hit = true;
    }
    if (hit) { s.lost = true; s.vy = -200; c.sfx.hit(); }
  },

  draw(s, g) {
    g.fillStyle = '#4cc9f0'; g.fillRect(0, 0, W, H);
    g.fillStyle = '#fff';
    for (let i = 0; i < 5; i++) {
      const x = (((i * 250 - s.t * 40) % (W + 200)) + W + 200) % (W + 200) - 100;
      Draw.circle(g, x, 80 + (i % 3) * 50, 30); g.fill();
      Draw.circle(g, x + 34, 90 + (i % 3) * 50, 24); g.fill();
    }
    for (const p of s.pipes) {
      const top = p.gy - s.gap / 2, bot = p.gy + s.gap / 2;
      Draw.rrect(g, p.x - this.PW / 2, -10, this.PW, top + 10, 6); Draw.fillStroke(g, '#70e000');
      Draw.rrect(g, p.x - this.PW / 2 - 8, top - 30, this.PW + 16, 30, 6); Draw.fillStroke(g, '#70e000');
      Draw.rrect(g, p.x - this.PW / 2, bot, this.PW, GROUND - bot, 6); Draw.fillStroke(g, '#70e000');
      Draw.rrect(g, p.x - this.PW / 2 - 8, bot, this.PW + 16, 30, 6); Draw.fillStroke(g, '#70e000');
    }
    g.fillStyle = '#ddb892'; g.fillRect(0, GROUND, W, H - GROUND);
    g.fillStyle = '#70e000'; g.fillRect(0, GROUND, W, 12);

    g.save();
    g.translate(this.BX, s.by);
    g.rotate(clamp(s.vy / 800, -0.5, 1.2));
    Draw.ellipse(g, 0, 0, 22, 18); Draw.fillStroke(g, '#ffd60a');
    Draw.ellipse(g, -6, s.flap > 0 ? -10 : 4, 12, 7, 0.3); Draw.fillStroke(g, '#fff', '#1a1a1a', 3);
    Draw.circle(g, 9, -6, 6); Draw.fillStroke(g, '#fff', '#1a1a1a', 2);
    Draw.circle(g, 11, -6, 2.5); g.fillStyle = '#1a1a1a'; g.fill();
    g.beginPath(); g.moveTo(18, 0); g.lineTo(32, 4); g.lineTo(18, 9); g.closePath(); Draw.fillStroke(g, '#fb8500', '#1a1a1a', 3);
    g.restore();
  },
});
