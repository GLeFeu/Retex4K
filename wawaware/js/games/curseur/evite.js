// CURSEUR : le vaisseau suit la souris, éviter les météores
Engine.register({
  id: 'evite',
  name: 'Pluie de météores',
  icon: '🚀',
  instruction: 'ÉVITE !',
  input: 'curseur',
  hint: 'LE VAISSEAU SUIT TA SOURIS',
  duration: 5,
  survival: true,
  cursor: 'none',

  start(c) {
    return {
      t: 0, shots: [], spawnT: 0.4,
      rate: Math.max(0.12, 0.32 - 0.03 * c.diff),
      sp: 280 + 40 * Math.min(c.diff, 6),
      sx: clamp(c.input.x, 20, W - 20), sy: clamp(c.input.y, 20, H - 20),
      stars: Array.from({ length: 70 }, () => ({ x: c.rng() * W, y: c.rng() * H, r: 0.5 + c.rng() * 2 })),
    };
  },

  update(s, dt, c) {
    s.t += dt;
    if (!s.lost) { s.sx = clamp(c.input.x, 20, W - 20); s.sy = clamp(c.input.y, 20, H - 20); }
    s.spawnT -= dt;
    if (s.spawnT <= 0 && s.t < c.duration - 0.4) {
      const side = Math.floor(c.rng() * 4);
      const x = side === 0 ? -30 : side === 1 ? W + 30 : c.rng() * W;
      const y = side === 2 ? -30 : side === 3 ? H + 30 : c.rng() * H;
      const a = Math.atan2(s.sy - y, s.sx - x) + (c.rng() - 0.5) * 0.4;
      s.shots.push({ x, y, vx: Math.cos(a) * s.sp, vy: Math.sin(a) * s.sp, r: 12 + c.rng() * 10, rot: c.rng() * 6 });
      s.spawnT = s.rate * (0.7 + c.rng() * 0.6);
    }
    for (const m of s.shots) {
      m.x += m.vx * dt; m.y += m.vy * dt; m.rot += dt * 3;
      if (!s.lost && !c.over && Math.hypot(m.x - s.sx, m.y - s.sy) < m.r + 14) { s.lost = true; c.sfx.hit(); }
    }
    s.shots = s.shots.filter(m => m.x > -100 && m.x < W + 100 && m.y > -100 && m.y < H + 100);
  },

  draw(s, g) {
    g.fillStyle = '#03071e'; g.fillRect(0, 0, W, H);
    g.fillStyle = '#fff';
    for (const st of s.stars) { Draw.circle(g, (st.x - s.t * 30 * st.r + W * 10) % W, st.y, st.r); g.fill(); }
    Draw.circle(g, 820, 430, 90); Draw.fillStroke(g, '#7209b7', null);

    for (const m of s.shots) {
      g.save(); g.translate(m.x, m.y); g.rotate(m.rot);
      Draw.circle(g, 0, 0, m.r * 1.5); g.fillStyle = 'rgba(255,120,0,0.3)'; g.fill();
      g.beginPath();
      for (let k = 0; k < 8; k++) { const a = (k / 8) * Math.PI * 2, r = m.r * (k % 2 ? 0.8 : 1); g.lineTo(Math.cos(a) * r, Math.sin(a) * r); }
      g.closePath(); Draw.fillStroke(g, '#8d6e63', '#1a1a1a', 3);
      g.restore();
    }

    g.save();
    g.translate(s.sx, s.sy);
    if (s.lost) {
      for (let k = 0; k < 10; k++) { const a = k * 0.63; Draw.circle(g, Math.cos(a) * 26, Math.sin(a) * 26, 12); g.fillStyle = k % 2 ? '#ff7b00' : '#ffd400'; g.fill(); }
    } else {
      Draw.circle(g, 0, 22, 6 + Math.random() * 5); g.fillStyle = '#ff7b00'; g.fill();
      g.beginPath(); g.moveTo(0, -22); g.lineTo(16, 16); g.lineTo(0, 8); g.lineTo(-16, 16); g.closePath();
      Draw.fillStroke(g, '#e5e5e5', '#1a1a1a', 3);
      Draw.circle(g, 0, -4, 5); g.fillStyle = '#4cc9f0'; g.fill();
    }
    g.restore();
  },
});
