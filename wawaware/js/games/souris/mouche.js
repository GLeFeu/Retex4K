// SOURIS (clic) : écraser la mouche avec la tapette
Engine.register({
  id: 'mouche',
  name: 'Écrase la mouche',
  icon: '🪰',
  instruction: 'ÉCRASE !',
  input: 'souris',
  hint: 'CLIQUE SUR LA MOUCHE',
  duration: 5,
  cursor: 'none',

  start(c) {
    const d = Math.min(c.diff, 8);
    return {
      t: 0, swat: 0, splat: null,
      x: 220 + c.rng() * 520, y: 120 + c.rng() * 220,
      vx: 0, vy: 0, dirT: 0,
      sp: 230 + 40 * d,          // vitesse de vol
      flee: 250 + 110 * d,       // réflexe de fuite face à la tapette
    };
  },

  update(s, dt, c) {
    const inp = c.input;
    s.t += dt;
    s.swat = Math.max(0, s.swat - dt);
    if (s.won) return;

    s.dirT -= dt;
    if (s.dirT <= 0) {
      const a = c.rng() * Math.PI * 2;
      s.vx = Math.cos(a) * s.sp;
      s.vy = Math.sin(a) * s.sp;
      s.dirT = 0.15 + c.rng() * 0.4;
    }
    const dx = s.x - inp.x, dy = s.y - inp.y, d = Math.hypot(dx, dy) || 1;
    if (d < 150) { s.vx += (dx / d) * s.flee * 4 * dt; s.vy += (dy / d) * s.flee * 4 * dt; }
    const v = Math.hypot(s.vx, s.vy), max = s.sp * 1.5;
    if (v > max) { s.vx *= max / v; s.vy *= max / v; }
    s.x += s.vx * dt;
    s.y += s.vy * dt;
    if (s.x < 50) { s.x = 50; s.vx = Math.abs(s.vx); }
    if (s.x > W - 50) { s.x = W - 50; s.vx = -Math.abs(s.vx); }
    if (s.y < 50) { s.y = 50; s.vy = Math.abs(s.vy); }
    if (s.y > H - 140) { s.y = H - 140; s.vy = -Math.abs(s.vy); }

    if (inp.clicked && !c.over) {
      s.swat = 0.15;
      if (Math.hypot(inp.x - s.x, inp.y - s.y) < 55) {
        s.won = true;
        c.sfx.splat();
        s.splat = Array.from({ length: 9 }, () => ({ dx: (c.rng() - 0.5) * 60, dy: (c.rng() - 0.5) * 60, r: 6 + c.rng() * 14 }));
      } else c.sfx.swat();
    }
  },

  draw(s, g, c) {
    // mur carrelé + table
    g.fillStyle = '#fff3c4';
    g.fillRect(0, 0, W, H);
    g.strokeStyle = '#f0d98a';
    g.lineWidth = 3;
    g.beginPath();
    for (let x = 0; x <= W; x += 60) { g.moveTo(x, 0); g.lineTo(x, H); }
    for (let y = 0; y <= H; y += 60) { g.moveTo(0, y); g.lineTo(W, y); }
    g.stroke();
    g.fillStyle = '#c97b3c'; g.fillRect(0, H - 90, W, 90);
    g.fillStyle = '#a8612b'; g.fillRect(0, H - 90, W, 10);

    if (s.splat) {
      for (const b of s.splat) { Draw.circle(g, s.x + b.dx, s.y + b.dy, b.r); g.fillStyle = '#9acd32'; g.fill(); }
      Draw.circle(g, s.x, s.y, 26); g.fillStyle = '#6b8e23'; g.fill();
      Draw.text(g, 'SPLAT!', s.x, s.y - 60, 40, '#9acd32');
    } else {
      g.save();
      g.translate(s.x, s.y);
      g.rotate(Math.atan2(s.vy, s.vx));
      const flap = Math.abs(Math.sin(s.t * 60));
      Draw.ellipse(g, -4, -14, 15, 3 + 8 * flap, -0.4); Draw.fillStroke(g, 'rgba(200,230,255,0.85)', '#335', 2);
      Draw.ellipse(g, -4, 14, 15, 3 + 8 * flap, 0.4); Draw.fillStroke(g, 'rgba(200,230,255,0.85)', '#335', 2);
      Draw.ellipse(g, 0, 0, 18, 11); Draw.fillStroke(g, '#222', '#000', 2);
      Draw.circle(g, 14, 0, 9); Draw.fillStroke(g, '#333', '#000', 2);
      Draw.circle(g, 17, -5, 5); g.fillStyle = '#e63946'; g.fill();
      Draw.circle(g, 17, 5, 5); g.fill();
      g.restore();
    }

    // tapette (curseur)
    const x = c.input.x, y = c.input.y;
    g.save();
    g.translate(x, y);
    g.rotate(s.swat > 0 ? -0.3 : 0.12);
    const k = s.swat > 0 ? 0.88 : 1;
    g.scale(k, k);
    g.lineCap = 'round';
    g.strokeStyle = '#1a1a1a'; g.lineWidth = 14;
    g.beginPath(); g.moveTo(30, 40); g.lineTo(100, 150); g.stroke();
    g.strokeStyle = '#3a86ff'; g.lineWidth = 7;
    g.beginPath(); g.moveTo(30, 40); g.lineTo(100, 150); g.stroke();
    Draw.rrect(g, -45, -45, 90, 90, 16); Draw.fillStroke(g, 'rgba(255,77,109,0.85)');
    g.strokeStyle = 'rgba(0,0,0,0.25)'; g.lineWidth = 2;
    g.beginPath();
    for (let i = -30; i <= 30; i += 15) { g.moveTo(i, -42); g.lineTo(i, 42); g.moveTo(-42, i); g.lineTo(42, i); }
    g.stroke();
    g.restore();
  },
});
