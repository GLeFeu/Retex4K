// CLAVIER (↑ ↓) : le gardien de hockey bloque les palets
Engine.register({
  id: 'gardien', name: 'Le gardien', icon: '🏒', instruction: 'ARRÊTE-LES !', input: 'clavier',
  hint: '↑ ↓ (OU Z / S) POUR BLOQUER', duration: 6, GX: 150,

  start(c) {
    const n = 3, shots = [];
    for (let i = 0; i < n; i++) shots.push({ t: 0.5 + i * Math.max(1, 1.5 - 0.08 * c.diff), y0: 150 + c.rng() * 260, y1: 170 + c.rng() * 220, x: 820, done: false });
    return { t: 0, y: 290, shots, sp: 520 + 50 * Math.min(c.diff, 6), saved: 0 };
  },

  update(s, dt, c) {
    s.t += dt;
    if (!c.over && !s.lost) {
      if (c.input.isDown('ArrowUp', 'KeyW')) s.y -= 420 * dt;
      if (c.input.isDown('ArrowDown', 'KeyS')) s.y += 420 * dt;
      s.y = clamp(s.y, 160, 420);
    }
    for (const sh of s.shots) {
      if (sh.done || s.t < sh.t) continue;
      sh.x -= s.sp * dt;
      const k = clamp((820 - sh.x) / (820 - this.GX), 0, 1);
      sh.y = sh.y0 + (sh.y1 - sh.y0) * k;
      if (sh.x <= this.GX + 20 && !sh.done) {
        sh.done = true;
        if (Math.abs(sh.y - s.y) < 60) { s.saved++; c.sfx.thump(); if (s.saved >= s.shots.length && !c.over) s.won = true; }
        else if (!c.over) { s.lost = true; c.sfx.lose(); }
      }
    }
  },

  draw(s, g) {
    g.fillStyle = '#e0fbfc'; g.fillRect(0, 0, W, H);
    g.strokeStyle = '#ef233c'; g.lineWidth = 6; g.beginPath(); g.moveTo(W / 2, 0); g.lineTo(W / 2, H); g.stroke();
    g.strokeStyle = '#3a86ff'; g.beginPath(); g.moveTo(320, 0); g.lineTo(320, H); g.stroke();
    // but
    g.fillStyle = 'rgba(0,0,0,0.1)'; g.fillRect(40, 140, 80, 300);
    g.lineWidth = 8; g.strokeStyle = '#ef233c'; g.strokeRect(40, 140, 80, 300);
    Draw.hero(g, this.GX, s.y + 50, { shirt: '#3a86ff', pants: '#1a1a1a' });
    Draw.rrect(g, this.GX + 20, s.y - 55, 22, 110, 6); Draw.fillStroke(g, '#adb5bd');
    for (const sh of s.shots) if (s.t >= sh.t && !sh.done) { Draw.ellipse(g, sh.x, sh.y, 18, 9); Draw.fillStroke(g, '#1a1a1a', '#000'); }
    Draw.text(g, `${s.saved} / ${s.shots.length}`, W - 90, 50, 44);
  },
});
