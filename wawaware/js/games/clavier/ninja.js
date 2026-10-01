// CLAVIER (↑ / ↓) : sauter les obstacles au sol, se baisser sous les oiseaux
Engine.register({
  id: 'ninja', name: 'Saute ou baisse-toi', icon: '🥷', instruction: 'ESQUIVE !', input: 'clavier',
  hint: '↑ SAUTER · ↓ (MAINTENU) SE BAISSER', duration: 5, survival: true, PX: 200,

  start(c) {
    // espacement mini ≈ longueur d'un saut, sinon un oiseau pourrait arriver pendant qu'on est en l'air
    const obs = [];
    for (let i = 0, x = 850; i < 4; i++, x += 400 + c.rng() * 60) obs.push({ x, high: c.rng() < 0.45 });
    return { t: 0, py: GROUND, vy: 0, ground: true, duck: false, obs, speed: 420 + 20 * Math.min(c.diff, 6), rot: 0, dist: 0 };
  },

  update(s, dt, c) {
    s.t += dt;
    const inp = c.input;
    if (!s.lost) {
      s.dist += s.speed * dt;
      for (const o of s.obs) o.x -= s.speed * dt;
      s.duck = s.ground && !c.over && inp.isDown('ArrowDown', 'KeyS');
      if (s.ground && !c.over && inp.wasPressed('ArrowUp', 'KeyW', 'Space')) { s.vy = -780; s.ground = false; c.sfx.jump(); }
    } else s.rot += dt * 10;
    s.vy += 2400 * dt; s.py += s.vy * dt;
    if (!s.lost && s.py >= GROUND) { s.py = GROUND; s.vy = 0; s.ground = true; }
    if (s.py > H + 100) s.py = H + 100;
    if (s.lost || c.over) return;
    for (const o of s.obs) {
      if (Math.abs(o.x - this.PX) > 40) continue;
      const hit = o.high ? !s.duck && s.py > GROUND - 120 && s.py - (s.duck ? 45 : 85) < GROUND - 70 : s.py > GROUND - 55;
      if (hit) { s.lost = true; s.vy = -500; c.sfx.hit(); }
    }
  },

  draw(s, g) {
    Draw.sky(g, '#3a0ca3', '#f72585', GROUND);
    Draw.circle(g, 760, 120, 70); g.fillStyle = '#ffd6ff'; g.fill();
    g.fillStyle = '#240046';
    for (let i = 0; i < 6; i++) { const x = (((i * 220 - s.dist * 0.3) % 1300) + 1300) % 1300 - 150; g.beginPath(); g.moveTo(x, GROUND); g.lineTo(x + 70, GROUND - 160); g.lineTo(x + 140, GROUND); g.fill(); }
    Draw.ground(g, GROUND, '#10002b', '#3c096c');
    for (const o of s.obs) {
      if (o.high) {
        const y = GROUND - 100, f = Math.sin(s.t * 20) * 14;
        Draw.ellipse(g, o.x, y, 30, 16); Draw.fillStroke(g, '#ff9e00');
        g.beginPath(); g.moveTo(o.x - 5, y); g.lineTo(o.x - 25, y - 20 - f); g.lineTo(o.x + 10, y - 4); g.closePath(); Draw.fillStroke(g, '#ff6d00', '#1a1a1a', 3);
        g.beginPath(); g.moveTo(o.x - 30, y); g.lineTo(o.x - 46, y + 4); g.lineTo(o.x - 30, y + 8); g.fillStyle = '#ffd400'; g.fill();
      } else {
        g.beginPath(); for (let k = 0; k < 3; k++) { g.moveTo(o.x - 30 + k * 20, GROUND); g.lineTo(o.x - 20 + k * 20, GROUND - 50); g.lineTo(o.x - 10 + k * 20, GROUND); }
        Draw.fillStroke(g, '#adb5bd', '#1a1a1a', 3);
      }
    }
    g.save(); g.translate(this.PX, s.py);
    if (s.duck) g.scale(1.25, 0.55);
    Draw.hero(g, 0, 0, { rot: s.rot, run: s.ground && !s.lost ? s.dist * 0.06 : 1, shirt: '#1a1a1a', pants: '#1a1a1a' });
    g.fillStyle = '#ef233c'; g.fillRect(-20, -82, 46, 8);
    g.restore();
  },
});
