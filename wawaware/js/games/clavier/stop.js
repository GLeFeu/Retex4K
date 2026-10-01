// CLAVIER (timing) : appuyer sur Espace pile dans la zone verte (un seul essai)
Engine.register({
  id: 'stop',
  name: 'Marteau de foire',
  icon: '🔔',
  instruction: 'FRAPPE !',
  input: 'clavier',
  hint: 'ESPACE QUAND C\'EST DANS LE VERT',
  duration: 5,
  BX: 200, BW: 560, TX: 690, TOP: 70, BOT: 400,

  start(c) {
    const zw = Math.max(0.12, 0.2 - 0.012 * c.diff);
    return { t: 0, p: 0, dir: 1, sp: 1.0 + 0.08 * Math.min(c.diff, 6), zw, zc: zw + c.rng() * (1 - 2 * zw), done: false, hit: false, power: 0, puckT: 0 };
  },

  update(s, dt, c) {
    s.t += dt;
    if (s.done) { s.puckT += dt; return; }
    s.p += s.dir * s.sp * dt;
    if (s.p > 1) { s.p = 1; s.dir = -1; }
    if (s.p < 0) { s.p = 0; s.dir = 1; }
    if (!c.over && c.input.wasPressed('Space')) {
      s.done = true;
      s.hit = Math.abs(s.p - s.zc) < s.zw / 2;
      s.power = s.hit ? 1 : 0.25 + 0.5 * (1 - Math.min(1, Math.abs(s.p - s.zc) * 2));
      c.sfx.thump();
      if (s.hit) { s.won = true; c.sfx.tone(1500, 0.5, 'sine', 0.15, 0.25); } else s.lost = true;
    }
  },

  draw(s, g) {
    Draw.stripes(g, s.t * 0.3, '#ffe5ec', '#ffc2d1');
    // tour
    Draw.rrect(g, this.TX - 22, this.TOP, 44, this.BOT - this.TOP, 10); Draw.fillStroke(g, '#fff');
    for (let i = 1; i < 10; i++) { const y = this.BOT - (this.BOT - this.TOP) * i / 10; g.fillStyle = '#ef233c'; g.fillRect(this.TX - 22, y, 14, 4); }
    const ring = s.won && s.puckT > 0.25 && Math.floor(s.puckT * 20) % 2;
    Draw.circle(g, this.TX, this.TOP - 18, 30); Draw.fillStroke(g, ring ? '#fff3b0' : '#ffd400');
    if (s.won && s.puckT > 0.25) Draw.text(g, 'DING !', this.TX + 120, this.TOP, 50, '#ffd400');
    // palet
    const k = s.done ? Math.sin(Math.min(1, s.puckT / 0.5) * Math.PI / (s.hit ? 2 : 1)) * s.power : 0;
    const py = this.BOT - 15 - (this.BOT - this.TOP - 15) * k;
    Draw.rrect(g, this.TX - 26, py - 12, 52, 24, 8); Draw.fillStroke(g, '#3a86ff');
    Draw.rrect(g, this.TX - 60, this.BOT, 120, 26, 6); Draw.fillStroke(g, '#adb5bd');

    Draw.hero(g, 470, 430, { rot: s.done && s.puckT < 0.2 ? 0.4 : -0.2 });
    g.save(); g.translate(500, 360); g.rotate(s.done && s.puckT < 0.3 ? 0.8 : -0.6);
    Draw.rrect(g, -6, -110, 12, 110, 4); Draw.fillStroke(g, '#bc6c25');
    Draw.rrect(g, -35, -140, 70, 40, 8); Draw.fillStroke(g, '#6c757d');
    g.restore();

    // jauge
    const gy = 470;
    Draw.rrect(g, this.BX, gy, this.BW, 40, 20); Draw.fillStroke(g, '#ff8fa3');
    Draw.rrect(g, this.BX + this.BW * (s.zc - s.zw / 2), gy + 4, this.BW * s.zw, 32, 10); g.fillStyle = '#06d6a0'; g.fill();
    const nx = this.BX + this.BW * s.p;
    g.beginPath(); g.moveTo(nx, gy - 4); g.lineTo(nx - 14, gy - 26); g.lineTo(nx + 14, gy - 26); g.closePath();
    Draw.fillStroke(g, '#1a1a1a', '#fff', 3);
    g.fillStyle = '#1a1a1a'; g.fillRect(nx - 3, gy, 6, 40);
  },
});
