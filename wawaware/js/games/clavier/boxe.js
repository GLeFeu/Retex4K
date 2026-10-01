// CLAVIER (← →) : bloquer les coups du boxeur du bon côté
Engine.register({
  id: 'boxe', name: 'Le ring', icon: '🥊', instruction: 'BLOQUE !', input: 'clavier',
  hint: '← OU → DU CÔTÉ DU GANT QUI ARRIVE', duration: 6,

  start(c) {
    const n = 3 + Math.min(2, Math.floor(c.diff / 2)), punches = [];
    let t = 0.6;
    for (let i = 0; i < n; i++) { punches.push({ t, side: c.rng() < 0.5 ? -1 : 1, done: false }); t += Math.max(0.6, 1.1 - 0.06 * c.diff) + c.rng() * 0.3; }
    return { t: 0, punches, warn: Math.max(0.45, 0.65 - 0.03 * c.diff), block: 0, blockT: 0, hit: false };
  },

  current(s) { return s.punches.find(p => !p.done); },

  update(s, dt, c) {
    s.t += dt;
    s.blockT = Math.max(0, s.blockT - dt);
    if (s.won || s.lost || c.over) return;
    const l = c.input.wasPressed('ArrowLeft', 'KeyA'), r = c.input.wasPressed('ArrowRight', 'KeyD');
    if (l || r) { s.block = l ? -1 : 1; s.blockT = 0.3; }
    const p = this.current(s);
    if (!p) { s.won = true; return; }
    if (s.t >= p.t + s.warn) {
      p.done = true;
      if (s.blockT > 0 && s.block === p.side) c.sfx.thump();
      else { s.lost = true; s.hit = true; c.sfx.hit(); }
    }
  },

  draw(s, g) {
    g.fillStyle = '#1d3557'; g.fillRect(0, 0, W, H);
    g.strokeStyle = '#e63946'; g.lineWidth = 8; for (const y of [300, 340, 380]) { g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke(); }
    // boxeur
    const p = this.current(s);
    const k = p ? clamp((s.t - p.t) / s.warn, 0, 1) : 0;
    g.save(); g.translate(480, 300);
    Draw.ellipse(g, 0, 60, 110, 120); Draw.fillStroke(g, '#ef233c');
    Draw.circle(g, 0, -70, 70); Draw.fillStroke(g, '#ffcf9e');
    Draw.circle(g, -24, -80, 8); Draw.circle(g, 24, -80, 8); g.fillStyle = '#1a1a1a'; g.fill();
    g.fillStyle = '#1a1a1a'; g.fillRect(-30, -40, 60, 8);
    for (const side of [-1, 1]) {
      const active = p && s.t >= p.t && p.side === side;
      const gx = side * (active ? 150 - k * 110 : 150), gy = active ? -20 + k * 120 : 0, gs = active ? 1 + k * 1.2 : 1;
      Draw.circle(g, gx, gy, 45 * gs); Draw.fillStroke(g, '#e63946');
      if (active && k < 0.6) Draw.text(g, '!', side * 260, -100, 80, '#ffd400');
    }
    g.restore();
    // tes gants
    for (const side of [-1, 1]) {
      const up = s.blockT > 0 && s.block === side;
      Draw.circle(g, 480 + side * (up ? 220 : 260), up ? 380 : 480, 60); Draw.fillStroke(g, '#4361ee');
    }
    if (s.hit) Draw.text(g, 'K.O. !', W / 2, 140, 90, '#ffd400');
  },
});
