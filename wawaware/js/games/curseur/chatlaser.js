// CURSEUR : le chat poursuit le point laser, l'emmener jusque dans le carton
Engine.register({
  id: 'chatlaser', name: 'Le point rouge', icon: '📦', instruction: 'DANS LE CARTON !', input: 'curseur',
  hint: 'LE CHAT SUIT TON POINT LASER', duration: 5, cursor: 'none',

  start(c) {
    return { t: 0, cx: 120, cy: 440, face: 1, bx: 560 + c.rng() * 280, by: 200 + c.rng() * 240, sp: Math.max(220, 330 - 15 * c.diff), inBox: false };
  },

  update(s, dt, c) {
    s.t += dt;
    if (s.won) return;
    const dx = c.input.x - s.cx, dy = (c.input.y + 20) - s.cy, d = Math.hypot(dx, dy);
    if (d > 10) { const k = Math.min(d, s.sp * dt); s.cx += dx / d * k; s.cy += dy / d * k; if (Math.abs(dx) > 5) s.face = Math.sign(dx); }
    if (!c.over && Math.abs(s.cx - s.bx) < 60 && Math.abs(s.cy - s.by) < 45) { s.won = true; s.cx = s.bx; s.cy = s.by; c.sfx.tone(700, 0.3, 'triangle', 0.1); }
  },

  draw(s, g, c) {
    g.fillStyle = '#ffe8d6'; g.fillRect(0, 0, W, H);
    g.fillStyle = '#ddbea9'; for (let y = 0; y < H; y += 60) g.fillRect(0, y, W, 4);
    // carton (arrière)
    Draw.rrect(g, s.bx - 80, s.by - 70, 160, 90, 4); Draw.fillStroke(g, '#bc8a5f');
    if (s.won) {
      Draw.circle(g, s.bx, s.by - 70, 30); Draw.fillStroke(g, '#f4a261');
      for (const sx of [-1, 1]) { g.beginPath(); g.moveTo(s.bx + sx * 26, s.by - 80); g.lineTo(s.bx + sx * 22, s.by - 112); g.lineTo(s.bx + sx * 4, s.by - 96); g.closePath(); Draw.fillStroke(g, '#f4a261', '#1a1a1a', 3); }
      g.lineWidth = 3; for (const sx of [-1, 1]) { g.beginPath(); g.arc(s.bx + sx * 11, s.by - 74, 6, 0.2, Math.PI - 0.2); g.stroke(); }
      Draw.text(g, 'PARFAIT.', s.bx, s.by - 160, 40, '#7b2cbf');
    } else Draw.cat(g, s.cx, s.cy, { pose: 'debout', face: s.face, t: s.t, scale: 0.75 });
    Draw.rrect(g, s.bx - 80, s.by - 30, 160, 70, 4); Draw.fillStroke(g, '#d4a373');
    Draw.text(g, '📦', s.bx, s.by + 6, 30, '#000', null);
    if (!s.won) { Draw.circle(g, c.input.x, c.input.y, 7); g.fillStyle = '#ff0000'; g.fill(); Draw.circle(g, c.input.x, c.input.y, 14); g.fillStyle = 'rgba(255,0,0,0.25)'; g.fill(); }
  },
});
