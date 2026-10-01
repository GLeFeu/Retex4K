// MICRO : souffler les bougies du gâteau
Engine.register({
  id: 'bougies',
  name: 'Joyeux anniversaire',
  icon: '🎂',
  instruction: 'SOUFFLE !',
  input: 'micro',
  hint: 'SOUFFLE DANS LE MICRO',
  duration: 5,
  needsMic: true,
  micThreshold: 0.2,

  start(c) {
    return { t: 0, n: Math.min(7, 3 + c.diff), out: 0, acc: 0, per: 0.25, lvl: 0, smoke: [] };
  },

  candleX(s, i) {
    const sp = Math.min(80, 320 / (s.n - 1));
    return W / 2 + (i - (s.n - 1) / 2) * sp;
  },

  update(s, dt, c) {
    s.t += dt;
    s.lvl = c.input.mic.level;
    if (!s.won && !c.over && s.lvl > this.micThreshold) {
      s.acc += s.lvl * dt;
      while (s.acc >= s.per && s.out < s.n) {
        s.acc -= s.per;
        for (let k = 0; k < 6; k++) {
          s.smoke.push({ x: this.candleX(s, s.out), y: 220, vx: (c.rng() - 0.3) * 40, life: 1 + c.rng() * 0.5, r: 6 + c.rng() * 6 });
        }
        s.out++;
        c.sfx.puff();
      }
      if (s.out >= s.n) s.won = true;
    }
    for (const p of s.smoke) { p.y -= 50 * dt; p.x += p.vx * dt; p.r += 8 * dt; p.life -= dt; }
    s.smoke = s.smoke.filter(p => p.life > 0);
  },

  draw(s, g) {
    // mur + guirlande
    g.fillStyle = s.won ? '#ffe5ec' : '#3d2c5a';
    g.fillRect(0, 0, W, H);
    const cols = ['#ff3c6e', '#ffd400', '#3a86ff', '#06d6a0'];
    g.strokeStyle = '#1a1a1a'; g.lineWidth = 3;
    g.beginPath(); g.moveTo(0, 30);
    for (let x = 0; x <= W; x += 80) g.quadraticCurveTo(x + 40, 70, x + 80, 30);
    g.stroke();
    for (let i = 0; i < 12; i++) {
      const x = 40 + i * 80;
      g.beginPath(); g.moveTo(x - 16, 48); g.lineTo(x + 16, 48); g.lineTo(x, 80); g.closePath();
      Draw.fillStroke(g, cols[i % 4], '#1a1a1a', 3);
    }
    // halo des bougies
    const lit = s.n - s.out;
    if (lit > 0) {
      const halo = g.createRadialGradient(W / 2, 220, 20, W / 2, 220, 380);
      halo.addColorStop(0, `rgba(255,200,100,${0.12 * lit})`); halo.addColorStop(1, 'rgba(255,200,100,0)');
      g.fillStyle = halo;
      g.fillRect(0, 0, W, H);
    }
    // table
    g.fillStyle = '#8d5524'; g.fillRect(0, 430, W, H - 430);
    g.fillStyle = '#6f4518'; g.fillRect(0, 430, W, 10);

    // gâteau
    Draw.ellipse(g, W / 2, 432, 250, 26); Draw.fillStroke(g, '#e9ecef');
    Draw.rrect(g, W / 2 - 210, 300, 420, 128, 18); Draw.fillStroke(g, '#f4a261');
    g.fillStyle = '#e76f51'; g.fillRect(W / 2 - 206, 360, 412, 14);
    Draw.rrect(g, W / 2 - 214, 290, 428, 34, 16); Draw.fillStroke(g, '#ff99c8');
    for (let i = 0; i < 9; i++) {
      const x = W / 2 - 190 + i * 47;
      Draw.ellipse(g, x, 326, 10, 16 + (i % 3) * 5); g.fillStyle = '#ff99c8'; g.fill();
    }

    // bougies
    for (let i = 0; i < s.n; i++) {
      const x = this.candleX(s, i), top = 230;
      Draw.rrect(g, x - 9, top, 18, 64, 4); Draw.fillStroke(g, i % 2 ? '#a0c4ff' : '#ffd6a5', '#1a1a1a', 3);
      g.strokeStyle = 'rgba(255,255,255,0.7)'; g.lineWidth = 4;
      g.beginPath(); g.moveTo(x - 7, top + 14); g.lineTo(x + 7, top + 6); g.moveTo(x - 7, top + 36); g.lineTo(x + 7, top + 28); g.stroke();
      g.strokeStyle = '#1a1a1a'; g.lineWidth = 3;
      g.beginPath(); g.moveTo(x, top); g.lineTo(x, top - 8); g.stroke();
      if (i >= s.out) {
        const lean = s.lvl * 28;
        const k = 1 - 0.4 * s.lvl + 0.08 * Math.sin(s.t * 30 + i * 2);
        g.save();
        g.translate(x, top - 6);
        g.scale(k, k);
        this.flame(g, lean, '#ff7b00');
        g.translate(0, -8); g.scale(0.55, 0.55); g.translate(0, 8);
        this.flame(g, lean * 0.6, '#ffe14d');
        g.restore();
      }
    }

    for (const p of s.smoke) {
      g.globalAlpha = clamp(p.life, 0, 0.6);
      Draw.circle(g, p.x, p.y, p.r); g.fillStyle = '#ced4da'; g.fill();
    }
    g.globalAlpha = 1;
  },

  flame(g, lean, col) {
    g.beginPath();
    g.moveTo(lean, -42);
    g.quadraticCurveTo(-14, -20, -10, -8);
    g.arc(0, -8, 10, Math.PI, 0, true);
    g.quadraticCurveTo(14, -20, lean, -42);
    g.closePath();
    g.fillStyle = col;
    g.fill();
  },
});
