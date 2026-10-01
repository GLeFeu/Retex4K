// MICRO : crier pour faire décoller la fusée jusqu'à la lune
Engine.register({
  id: 'fusee',
  name: 'Décollage',
  icon: '🌙',
  instruction: 'CRIE !',
  input: 'micro',
  hint: 'CRIE FORT DANS LE MICRO',
  duration: 5,
  needsMic: true,
  micThreshold: 0.2,

  start(c) {
    return {
      t: 0, h: 0, v: 0, lvl: 0, grav: 0.6 + 0.08 * Math.min(c.diff, 6),
      stars: Array.from({ length: 50 }, () => ({ x: c.rng() * W, y: c.rng() * H, r: 0.5 + c.rng() * 2 })),
    };
  },

  update(s, dt, c) {
    s.t += dt;
    s.lvl = c.input.mic.level;
    if (s.won) { s.h = Math.min(1.05, s.h + dt * 0.3); return; }
    const thrust = !c.over && s.lvl > this.micThreshold ? s.lvl * 2.2 : 0;
    s.v = clamp(s.v + (thrust - s.grav) * dt, -0.5, 0.9);
    s.h += s.v * dt;
    if (s.h < 0) { s.h = 0; s.v = Math.max(0, s.v); }
    if (s.h >= 1 && !c.over) s.won = true;
  },

  draw(s, g) {
    const k = clamp(s.h, 0, 1);
    const sky = g.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, k > 0.5 ? '#03071e' : '#023e8a'); sky.addColorStop(1, k > 0.5 ? '#370617' : '#48cae4');
    g.fillStyle = sky; g.fillRect(0, 0, W, H);
    g.fillStyle = '#fff';
    g.globalAlpha = 0.3 + k * 0.7;
    for (const st of s.stars) { Draw.circle(g, st.x, st.y, st.r); g.fill(); }
    g.globalAlpha = 1;
    // lune
    Draw.circle(g, 480, 20, 110); Draw.fillStroke(g, '#e9ecef');
    for (const [x, y, r] of [[430, 40, 18], [520, 70, 12], [480, -20, 22]]) { Draw.circle(g, x, y, r); g.fillStyle = '#ced4da'; g.fill(); }
    // sol
    const groundY = 470 + k * 200;
    g.fillStyle = '#6c757d'; g.fillRect(0, groundY, W, H);
    // fusée
    const ry = 440 - k * 300;
    const shake = s.lvl > this.micThreshold ? (Math.random() - 0.5) * 4 : 0;
    g.save();
    g.translate(480 + shake, ry);
    if (s.lvl > this.micThreshold || s.won) {
      const fl = 30 + s.lvl * 80 + Math.random() * 15;
      g.beginPath(); g.moveTo(-18, 30); g.lineTo(0, 30 + fl); g.lineTo(18, 30); g.closePath(); g.fillStyle = '#ff7b00'; g.fill();
      g.beginPath(); g.moveTo(-9, 30); g.lineTo(0, 30 + fl * 0.6); g.lineTo(9, 30); g.closePath(); g.fillStyle = '#ffd400'; g.fill();
    }
    g.beginPath(); g.moveTo(-26, 10); g.lineTo(-44, 40); g.lineTo(-26, 34); g.closePath(); Draw.fillStroke(g, '#ef233c');
    g.beginPath(); g.moveTo(26, 10); g.lineTo(44, 40); g.lineTo(26, 34); g.closePath(); Draw.fillStroke(g, '#ef233c');
    g.beginPath(); g.moveTo(0, -80); g.quadraticCurveTo(34, -40, 26, 34); g.lineTo(-26, 34); g.quadraticCurveTo(-34, -40, 0, -80); g.closePath();
    Draw.fillStroke(g, '#f8f9fa');
    Draw.circle(g, 0, -22, 12); Draw.fillStroke(g, '#4cc9f0', '#1a1a1a', 4);
    g.restore();
    if (s.won) Draw.text(g, 'ALUNISSAGE !', 480, 220, 56, '#ffd400');
  },
});
