// SOURIS (glisser-lâcher) : mini-golf, tirer en arrière pour viser le trou
Engine.register({
  id: 'golf', name: 'Mini-golf', icon: '⛳', instruction: 'DANS LE TROU !', input: 'souris',
  hint: 'TIRE EN ARRIÈRE DEPUIS LA BALLE, LÂCHE', duration: 6, cursor: 'grab',

  start(c) {
    return {
      t: 0, x: 160, y: 270, vx: 0, vy: 0, aiming: false, hx: 760 + c.rng() * 80, hy: 150 + c.rng() * 240,
      wall: c.diff >= 2 ? { x: 440, y: 160 + c.rng() * 100, w: 40, h: 160 } : null, sunk: false,
    };
  },

  update(s, dt, c) {
    s.t += dt;
    const inp = c.input;
    const moving = Math.hypot(s.vx, s.vy) > 5;
    if (!moving && !s.won && !c.over) {
      if (!s.aiming && inp.clicked && Math.hypot(inp.x - s.x, inp.y - s.y) < 60) s.aiming = true;
      if (s.aiming && !inp.down) {
        s.aiming = false;
        const dx = s.x - inp.x, dy = s.y - inp.y, d = Math.hypot(dx, dy);
        const p = Math.min(d, 220) * 4.5;
        if (d > 10) { s.vx = dx / d * p; s.vy = dy / d * p; c.sfx.tone(500, 0.05, 'square', 0.08); }
      }
    }
    s.x += s.vx * dt; s.y += s.vy * dt;
    const f = Math.pow(0.35, dt); s.vx *= f; s.vy *= f;
    if (Math.hypot(s.vx, s.vy) < 8) { s.vx = 0; s.vy = 0; }
    if (s.x < 60 || s.x > W - 60) { s.vx = -s.vx; s.x = clamp(s.x, 60, W - 60); }
    if (s.y < 60 || s.y > 460) { s.vy = -s.vy; s.y = clamp(s.y, 60, 460); }
    const w = s.wall;
    if (w && s.x > w.x - 14 && s.x < w.x + w.w + 14 && s.y > w.y - 14 && s.y < w.y + w.h + 14) {
      if (Math.min(Math.abs(s.x - w.x + 14), Math.abs(s.x - w.x - w.w - 14)) < Math.min(Math.abs(s.y - w.y + 14), Math.abs(s.y - w.y - w.h - 14))) s.vx = -s.vx; else s.vy = -s.vy;
      s.x += s.vx * dt * 2; s.y += s.vy * dt * 2;
    }
    if (!s.won && Math.hypot(s.x - s.hx, s.y - s.hy) < 22 && Math.hypot(s.vx, s.vy) < 700) {
      s.won = true; s.sunk = true; s.vx = 0; s.vy = 0; s.x = s.hx; s.y = s.hy; c.sfx.tone(1000, 0.2, 'sine', 0.12);
    }
  },

  draw(s, g, c) {
    g.fillStyle = '#386641'; g.fillRect(0, 0, W, H);
    Draw.rrect(g, 40, 40, W - 80, 440, 30); Draw.fillStroke(g, '#6a994e', '#bc6c25', 12);
    if (s.wall) { Draw.rrect(g, s.wall.x, s.wall.y, s.wall.w, s.wall.h, 6); Draw.fillStroke(g, '#bc6c25'); }
    Draw.circle(g, s.hx, s.hy, 20); g.fillStyle = '#1a1a1a'; g.fill();
    g.fillStyle = '#fff'; g.fillRect(s.hx - 2, s.hy - 90, 4, 90);
    g.beginPath(); g.moveTo(s.hx + 2, s.hy - 90); g.lineTo(s.hx + 40, s.hy - 78); g.lineTo(s.hx + 2, s.hy - 66); g.closePath(); Draw.fillStroke(g, '#ef233c', '#1a1a1a', 2);
    if (s.aiming) {
      const dx = s.x - c.input.x, dy = s.y - c.input.y;
      g.setLineDash([8, 8]); g.strokeStyle = '#fff'; g.lineWidth = 4;
      g.beginPath(); g.moveTo(s.x, s.y); g.lineTo(s.x + dx, s.y + dy); g.stroke(); g.setLineDash([]);
    }
    if (!s.sunk) { Draw.circle(g, s.x, s.y, 13); Draw.fillStroke(g, '#fff', '#1a1a1a', 3); }
  },
});
