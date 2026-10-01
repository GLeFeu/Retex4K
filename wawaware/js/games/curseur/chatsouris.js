// CURSEUR : tu es la souris, échappe au chat !
Engine.register({
  id: 'chatsouris', name: 'Le chat et la souris', icon: '🐭', instruction: 'FUIS !', input: 'curseur',
  hint: 'TU ES LA SOURIS, LE CHAT TE SUIT', duration: 5, survival: true, cursor: 'none',

  start(c) {
    const left = c.input.x > W / 2;
    return { t: 0, cx: left ? 80 : W - 80, cy: 80, vx: 0, vy: 0, sp: 300 + 30 * Math.min(c.diff, 6), face: 1 };
  },

  update(s, dt, c) {
    s.t += dt;
    if (s.lost) return;
    const mx = clamp(c.input.x, 20, W - 20), my = clamp(c.input.y, 20, H - 20);
    const dx = mx - s.cx, dy = my - s.cy, d = Math.hypot(dx, dy) || 1;
    s.vx += (dx / d * s.sp - s.vx) * Math.min(1, dt * 3);
    s.vy += (dy / d * s.sp - s.vy) * Math.min(1, dt * 3);
    s.cx += s.vx * dt; s.cy += s.vy * dt;
    if (Math.abs(s.vx) > 20) s.face = Math.sign(s.vx);
    if (d < 45 && s.t > 0.3 && !c.over) { s.lost = true; c.sfx.hit(); }
  },

  draw(s, g, c) {
    g.fillStyle = '#f4e3b2'; g.fillRect(0, 0, W, H);
    g.strokeStyle = '#e0c068'; g.lineWidth = 2;
    for (let x = 0; x < W; x += 60) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, H); g.stroke(); }
    const mx = clamp(c.input.x, 20, W - 20), my = clamp(c.input.y, 20, H - 20);
    if (!s.lost) {
      g.save(); g.translate(mx, my);
      g.strokeStyle = '#1a1a1a'; g.lineWidth = 3; g.beginPath(); g.moveTo(-14, 6); g.quadraticCurveTo(-34, 20, -40, 0); g.stroke();
      Draw.ellipse(g, 0, 4, 18, 12); Draw.fillStroke(g, '#adb5bd', '#1a1a1a', 3);
      Draw.circle(g, 12, -6, 7); Draw.fillStroke(g, '#ced4da', '#1a1a1a', 2);
      g.restore();
    }
    Draw.cat(g, s.cx, s.cy + 60, { pose: 'debout', face: s.face, t: s.t, col: '#495057', scale: 0.8 });
    if (s.lost) Draw.text(g, 'MIAM !', s.cx, s.cy - 80, 50, '#ef233c');
  },
});
