// MICRO : souffler dans la voile pour amener le bateau à la bouée
Engine.register({
  id: 'voilier', name: 'Le voilier', icon: '⛵', instruction: 'SOUFFLE !', input: 'micro',
  hint: 'SOUFFLE POUR AVANCER', duration: 5, needsMic: true, micThreshold: 0.15, GOAL: 800,

  start(c) { return { t: 0, x: 140, v: 0, lvl: 0, drag: 0.8 + 0.1 * Math.min(c.diff, 6) }; },

  update(s, dt, c) {
    s.t += dt;
    s.lvl = c.input.mic.level;
    if (s.won) { s.x += s.v * dt; return; }
    if (!c.over && s.lvl > this.micThreshold) s.v += s.lvl * 520 * dt;
    s.v *= 1 - s.drag * dt;
    s.x += s.v * dt;
    if (s.x >= this.GOAL && !c.over) s.won = true;
  },

  draw(s, g) {
    Draw.sky(g, '#90e0ef', '#caf0f8', 320);
    Draw.cloud(g, 200, 80); Draw.cloud(g, 640, 60, 0.8);
    g.fillStyle = '#0077b6'; g.fillRect(0, 320, W, H);
    g.strokeStyle = 'rgba(255,255,255,0.5)'; g.lineWidth = 3;
    for (let y = 340; y < H; y += 40) { g.beginPath(); for (let x = 0; x <= W; x += 20) g.lineTo(x, y + Math.sin(x / 40 + s.t * 2 + y) * 5); g.stroke(); }
    // bouée d'arrivée
    const by = 330 + Math.sin(s.t * 3) * 5;
    Draw.circle(g, this.GOAL + 40, by, 26); Draw.fillStroke(g, '#ef233c');
    g.fillStyle = '#1a1a1a'; g.fillRect(this.GOAL + 38, by - 80, 4, 60);
    g.beginPath(); g.moveTo(this.GOAL + 42, by - 80); g.lineTo(this.GOAL + 80, by - 68); g.lineTo(this.GOAL + 42, by - 56); g.closePath(); Draw.fillStroke(g, '#ffd400', '#1a1a1a', 3);
    // bateau
    const y = 340 + Math.sin(s.t * 2.5) * 6, puff = Math.min(1, s.lvl * 1.5);
    g.save(); g.translate(s.x, y); g.rotate(Math.sin(s.t * 2) * 0.04);
    g.beginPath(); g.moveTo(-80, -10); g.lineTo(80, -10); g.lineTo(55, 30); g.lineTo(-55, 30); g.closePath(); Draw.fillStroke(g, '#bc6c25');
    g.fillStyle = '#1a1a1a'; g.fillRect(-4, -170, 8, 160);
    g.beginPath(); g.moveTo(4, -165); g.quadraticCurveTo(70 + puff * 50, -100, 4, -25); g.closePath(); Draw.fillStroke(g, '#fff');
    g.restore();
    // souffle
    if (s.lvl > this.micThreshold) {
      g.strokeStyle = 'rgba(255,255,255,0.8)'; g.lineWidth = 4;
      for (let i = 0; i < 4; i++) { const xx = s.x - 160 - ((s.t * 400 + i * 50) % 150); g.beginPath(); g.moveTo(xx, 220 + i * 25); g.lineTo(xx + 50 * s.lvl, 220 + i * 25); g.stroke(); }
    }
  },
});
