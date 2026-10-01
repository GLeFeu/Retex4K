// CLAVIER : retourner la crêpe quand elle est dorée (Espace), puis la rattraper (← →)
Engine.register({
  id: 'crepe', name: 'La crêpe', icon: '🥞', instruction: 'FAIS-LA SAUTER !', input: 'clavier',
  hint: 'ESPACE QUAND C\'EST DORÉ, PUIS ← → POUR RATTRAPER', duration: 7, PANY: 400,

  start(c) { return { t: 0, cook: 0, rate: 0.28 + 0.03 * Math.min(c.diff, 6), phase: 'cuit', px: W / 2, cx: W / 2, cy: this.PANY, vx: 0, vy: 0, rot: 0 }; },

  update(s, dt, c) {
    s.t += dt;
    const inp = c.input;
    if (s.phase === 'cuit') {
      s.cook += s.rate * dt;
      if (s.cook > 1) { s.lost = true; s.phase = 'brule'; c.sfx.lose(); return; }
      if (!c.over && inp.wasPressed('Space', 'ArrowUp', 'KeyW')) {
        if (s.cook < 0.55) { s.lost = true; s.phase = 'cru'; c.sfx.hit(); return; }
        s.phase = 'vol'; s.vy = -900; s.vx = (c.rng() - 0.5) * 2 * (150 + 30 * Math.min(c.diff, 6)); c.sfx.jump();
      }
      s.cx = s.px; s.cy = this.PANY;
      return;
    }
    if (s.phase !== 'vol') return;
    if (!c.over) { if (inp.isDown('ArrowLeft', 'KeyA')) s.px -= 600 * dt; if (inp.isDown('ArrowRight', 'KeyD')) s.px += 600 * dt; s.px = clamp(s.px, 100, W - 100); }
    s.vy += 1500 * dt; s.cx += s.vx * dt; s.cy += s.vy * dt; s.rot += dt * 9;
    if (s.cx < 60 || s.cx > W - 60) s.vx = -s.vx;
    if (s.vy > 0 && s.cy >= this.PANY) {
      if (Math.abs(s.cx - s.px) < 85) { s.won = true; s.phase = 'ok'; s.cy = this.PANY; s.rot = 0; c.sfx.thump(); }
      else { s.lost = true; s.phase = 'sol'; s.cy = 480; c.sfx.splat(); }
    }
  },

  draw(s, g) {
    g.fillStyle = '#fff1e6'; g.fillRect(0, 0, W, H);
    g.fillStyle = '#e9c46a'; for (let x = 0; x < W; x += 80) g.fillRect(x, 0, 40, H);
    g.fillStyle = '#6c757d'; g.fillRect(0, 440, W, 100);
    // poêle
    g.fillStyle = '#1a1a1a'; g.fillRect(s.px + 90, this.PANY + 2, 120, 16);
    Draw.ellipse(g, s.px, this.PANY + 10, 100, 22); Draw.fillStroke(g, '#343a40', '#000');
    // crêpe
    const col = s.phase === 'brule' ? '#3d2817' : s.phase === 'cru' ? '#fefae0' : `hsl(${45 - s.cook * 15}, ${60 + s.cook * 30}%, ${85 - s.cook * 40}%)`;
    g.save(); g.translate(s.cx, s.cy); g.scale(1, Math.abs(Math.cos(s.rot)) * 0.25 + 0.12);
    Draw.ellipse(g, 0, 0, 80, 80); Draw.fillStroke(g, col);
    g.restore();
    if (s.phase === 'cuit') {
      const zx = 300, zw = 360;
      Draw.rrect(g, zx, 470, zw, 26, 13); Draw.fillStroke(g, '#fff');
      g.fillStyle = 'rgba(255,183,3,0.6)'; g.fillRect(zx + zw * 0.55, 473, zw * 0.45 - 3, 20);
      g.fillStyle = '#1a1a1a'; g.fillRect(zx + zw * Math.min(1, s.cook) - 3, 462, 6, 42);
      Draw.text(g, s.cook > 0.55 ? 'DORÉE !' : 'ÇA CUIT…', W / 2, 90, 44, s.cook > 0.55 ? '#fb8500' : '#1a1a1a', '#fff');
    }
    if (s.phase === 'brule') Draw.text(g, 'CRAMÉE !', W / 2, 90, 60, '#ef233c');
    if (s.phase === 'cru') Draw.text(g, 'PAS CUITE !', W / 2, 90, 60, '#ef233c');
  },
});
