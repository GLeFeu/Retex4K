// SOURIS (clics rapides) : enfoncer le clou à coups de marteau
Engine.register({
  id: 'clou',
  name: 'Enfonce le clou',
  icon: '🪛',
  instruction: 'ENFONCE !',
  input: 'souris',
  hint: 'CLIQUE VITE SUR LE CLOU',
  duration: 5,
  cursor: 'none',
  NX: W / 2,
  PLANK: 330,

  start(c) {
    return { t: 0, need: 6 + Math.min(c.diff, 6), hits: 0, swing: 0, shake: 0 };
  },

  headY(s) { return this.PLANK - 130 * (1 - s.hits / s.need); },

  update(s, dt, c) {
    s.t += dt;
    s.swing = Math.max(0, s.swing - dt);
    s.shake = Math.max(0, s.shake - dt);
    if (!c.input.clicked || c.over || s.won) return;
    s.swing = 0.1;
    if (Math.abs(c.input.x - this.NX) < 80 && Math.abs(c.input.y - this.headY(s)) < 90) {
      s.hits++;
      s.shake = 0.1;
      c.sfx.tone(180 + s.hits * 30, 0.08, 'square', 0.12);
      c.sfx.thump();
      if (s.hits >= s.need) s.won = true;
    } else c.sfx.swat();
  },

  draw(s, g, c) {
    g.fillStyle = '#577590'; g.fillRect(0, 0, W, H);
    g.strokeStyle = '#4d6a85'; g.lineWidth = 4;
    for (let x = 0; x < W; x += 80) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, H); g.stroke(); }
    // établi
    g.fillStyle = '#7f5539'; g.fillRect(0, 420, W, H - 420);
    const sh = s.shake > 0 ? (Math.random() - 0.5) * 6 : 0;
    Draw.rrect(g, 180, this.PLANK + sh, 600, 90, 8); Draw.fillStroke(g, '#ddb892');
    g.strokeStyle = '#b08968'; g.lineWidth = 3;
    for (let i = 0; i < 4; i++) { g.beginPath(); g.moveTo(200, this.PLANK + 20 + i * 18 + sh); g.bezierCurveTo(400, this.PLANK + 10 + i * 18, 560, this.PLANK + 30 + i * 18, 760, this.PLANK + 18 + i * 18 + sh); g.stroke(); }

    const hy = this.headY(s);
    Draw.rrect(g, this.NX - 6, hy, 12, this.PLANK - hy + 4, 3); Draw.fillStroke(g, '#adb5bd', '#1a1a1a', 3);
    Draw.ellipse(g, this.NX, hy, 28, 8); Draw.fillStroke(g, '#ced4da');

    // jauge
    for (let i = 0; i < s.need; i++) {
      Draw.circle(g, W / 2 - (s.need - 1) * 16 + i * 32, 60, 11);
      Draw.fillStroke(g, i < s.hits ? '#ffd400' : 'rgba(255,255,255,0.3)', '#1a1a1a', 3);
    }

    g.save();
    g.translate(c.input.x, c.input.y);
    g.rotate(s.swing > 0 ? 0.2 : -0.5);
    Draw.rrect(g, 0, -8, 130, 16, 6); Draw.fillStroke(g, '#bc6c25');
    Draw.rrect(g, -22, -34, 44, 68, 6); Draw.fillStroke(g, '#6c757d');
    g.restore();
  },
});
