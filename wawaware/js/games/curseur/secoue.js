// CURSEUR (secouer) : agiter la bouteille de soda jusqu'à ce qu'elle explose
Engine.register({
  id: 'secoue',
  name: 'Soda explosif',
  icon: '🥤',
  instruction: 'SECOUE !',
  input: 'curseur',
  hint: 'AGITE LA SOURIS DANS TOUS LES SENS',
  duration: 5,
  cursor: 'none',

  start(c) {
    return {
      t: 0, acc: 0, need: 5000 + 700 * Math.min(c.diff, 6),
      px: c.input.x, py: c.input.y, tilt: 0, spray: [],
    };
  },

  update(s, dt, c) {
    s.t += dt;
    const dx = c.input.x - s.px, dy = c.input.y - s.py;
    s.px = c.input.x; s.py = c.input.y;
    s.tilt += (clamp(dx * 0.03, -0.8, 0.8) - s.tilt) * Math.min(1, dt * 20);
    if (!s.won && !c.over) {
      s.acc += Math.min(150, Math.hypot(dx, dy));
      if (s.acc >= s.need) {
        s.won = true;
        c.sfx.pop();
        for (let i = 0; i < 60; i++) {
          const a = -Math.PI / 2 + (c.rng() - 0.5) * 1.2, v = 300 + c.rng() * 500;
          s.spray.push({ x: s.px, y: s.py - 110, vx: Math.cos(a) * v, vy: Math.sin(a) * v, r: 4 + c.rng() * 8 });
        }
      }
    }
    for (const p of s.spray) { p.vy += 900 * dt; p.x += p.vx * dt; p.y += p.vy * dt; }
  },

  draw(s, g) {
    g.fillStyle = '#ffafcc'; g.fillRect(0, 0, W, H);
    g.fillStyle = '#ffc8dd';
    for (let i = 0; i < 10; i++) { Draw.circle(g, (i * 211) % W, (i * 137) % H, 40); g.fill(); }

    const f = Math.min(1, s.acc / s.need);
    const x = clamp(s.px, 60, W - 60), y = clamp(s.py, 140, H - 60);
    g.save();
    g.translate(x, y);
    g.rotate(s.tilt + (f > 0.6 ? Math.sin(s.t * 70) * 0.05 : 0));
    Draw.rrect(g, -40, -60, 80, 140, 18); Draw.fillStroke(g, 'rgba(255,255,255,0.5)');
    const lh = 120 * Math.min(1, 0.4 + f * 0.6);
    Draw.rrect(g, -34, 74 - lh, 68, lh, 12); g.fillStyle = '#9b2226'; g.fill();
    for (let i = 0; i < 8 * f; i++) { Draw.circle(g, -20 + ((i * 17) % 40), 60 - ((i * 23 + s.t * 300) % lh), 4); g.fillStyle = '#ffccd5'; g.fill(); }
    Draw.rrect(g, -18, -100, 36, 44, 8); Draw.fillStroke(g, 'rgba(255,255,255,0.5)');
    Draw.rrect(g, -40, -10, 80, 40, 4); Draw.fillStroke(g, '#ffd400', '#1a1a1a', 3);
    Draw.text(g, 'POP', 0, 10, 24, '#ef233c', null);
    if (!s.won) { Draw.rrect(g, -20, -112, 40, 16, 4); Draw.fillStroke(g, '#ef233c'); }
    g.restore();

    for (const p of s.spray) { Draw.circle(g, p.x, p.y, p.r); g.fillStyle = '#9b2226'; g.fill(); }

    Draw.rrect(g, 40, 40, 300, 30, 15); Draw.fillStroke(g, 'rgba(255,255,255,0.6)');
    if (f > 0.02) { Draw.rrect(g, 44, 44, 292 * f, 22, 11); g.fillStyle = f > 0.75 ? '#ef233c' : '#fb8500'; g.fill(); }
  },
});
