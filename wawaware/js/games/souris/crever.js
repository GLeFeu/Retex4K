// SOURIS (clic) : crever tous les ballons qui s'envolent
Engine.register({
  id: 'crever',
  name: 'Crève les ballons',
  icon: '🎯',
  instruction: 'CRÈVE-LES !',
  input: 'souris',
  hint: 'CLIQUE SUR TOUS LES BALLONS',
  duration: 5,
  cursor: 'crosshair',
  COLORS: ['#ef233c', '#3a86ff', '#ffd400', '#06d6a0', '#ff6b9d', '#9d4edd'],

  start(c) {
    const n = 3 + Math.min(c.diff, 4);
    const balloons = [];
    for (let i = 0; i < n; i++) {
      balloons.push({
        x: 120 + (i + 0.5) * (720 / n) + (c.rng() - 0.5) * 40,
        y: 240 + c.rng() * 220,
        vy: -(50 + 18 * c.diff + c.rng() * 40),
        ph: c.rng() * 6,
        col: this.COLORS[i % this.COLORS.length],
        popped: false,
      });
    }
    return { t: 0, balloons, parts: [] };
  },

  bx(b, s) { return b.x + Math.sin(s.t * 2 + b.ph) * 20; },

  update(s, dt, c) {
    s.t += dt;
    for (const b of s.balloons) {
      if (b.popped) continue;
      b.y += b.vy * dt;
      if (b.y < -80) b.y = H + 80;
    }
    if (c.input.clicked && !c.over && !s.won) {
      const hit = s.balloons.find(b => !b.popped && Math.hypot(c.input.x - this.bx(b, s), c.input.y - b.y) < 44);
      if (hit) {
        hit.popped = true;
        c.sfx.pop();
        for (let k = 0; k < 14; k++) {
          const a = c.rng() * Math.PI * 2, v = 100 + c.rng() * 250;
          s.parts.push({ x: this.bx(hit, s), y: hit.y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, col: hit.col, life: 0.6 });
        }
        if (s.balloons.every(b => b.popped)) s.won = true;
      } else c.sfx.swat();
    }
    for (const p of s.parts) { p.vy += 600 * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt; }
    s.parts = s.parts.filter(p => p.life > 0);
  },

  draw(s, g) {
    const sky = g.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, '#48cae4'); sky.addColorStop(1, '#caf0f8');
    g.fillStyle = sky;
    g.fillRect(0, 0, W, H);
    g.fillStyle = '#90be6d';
    g.beginPath(); g.moveTo(0, H);
    for (let x = 0; x <= W; x += 40) g.lineTo(x, H - 60 - 20 * Math.sin(x / 90));
    g.lineTo(W, H); g.fill();

    for (const b of s.balloons) {
      if (b.popped) continue;
      const x = this.bx(b, s);
      g.strokeStyle = '#1a1a1a'; g.lineWidth = 2;
      g.beginPath(); g.moveTo(x, b.y + 42); g.quadraticCurveTo(x + 10, b.y + 70, x, b.y + 100); g.stroke();
      Draw.ellipse(g, x, b.y, 34, 42); Draw.fillStroke(g, b.col);
      Draw.ellipse(g, x - 12, b.y - 14, 7, 12, 0.5); g.fillStyle = 'rgba(255,255,255,0.5)'; g.fill();
      g.beginPath(); g.moveTo(x - 7, b.y + 48); g.lineTo(x + 7, b.y + 48); g.lineTo(x, b.y + 40); g.closePath();
      Draw.fillStroke(g, b.col, '#1a1a1a', 2);
    }
    for (const p of s.parts) { g.fillStyle = p.col; g.fillRect(p.x - 4, p.y - 4, 8, 8); }
    const left = s.balloons.filter(b => !b.popped).length;
    Draw.text(g, `RESTE : ${left}`, W - 120, 40, 32);
  },
});
