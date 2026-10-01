// SOURIS : compter les étoiles et cliquer sur la bonne réponse
Engine.register({
  id: 'combien', name: 'Combien d\'étoiles ?', icon: '⭐', instruction: 'COMPTE !', input: 'souris',
  hint: 'CLIQUE SUR LE BON NOMBRE', duration: 5, cursor: 'pointer',

  start(c) {
    const n = 3 + Math.floor(c.rng() * Math.min(9, 4 + c.diff));
    const stars = [];
    while (stars.length < n) { const x = 90 + c.rng() * 780, y = 80 + c.rng() * 260; if (stars.every(o => Math.hypot(o.x - x, o.y - y) > 60)) stars.push({ x, y, p: c.rng() * 6 }); }
    const opts = [n];
    while (opts.length < 3) { const v = n + Math.floor(c.rng() * 5) - 2; if (v > 0 && !opts.includes(v)) opts.push(v); }
    shuffle(opts, c.rng);
    return { t: 0, n, stars, opts, picked: -1 };
  },

  update(s, dt, c) {
    s.t += dt;
    if (s.picked >= 0 || c.over || !c.input.clicked) return;
    s.opts.forEach((v, i) => {
      if (Math.abs(c.input.x - (240 + i * 240)) < 90 && Math.abs(c.input.y - 450) < 45) {
        s.picked = i;
        if (v === s.n) s.won = true; else { s.lost = true; c.sfx.hit(); }
      }
    });
  },

  draw(s, g) {
    g.fillStyle = '#14213d'; g.fillRect(0, 0, W, H);
    for (const st of s.stars) {
      const k = 1 + Math.sin(s.t * 4 + st.p) * 0.08;
      g.beginPath();
      for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, r = (i % 2 ? 11 : 26) * k; g.lineTo(st.x + Math.cos(a) * r, st.y + Math.sin(a) * r); }
      g.closePath(); Draw.fillStroke(g, '#ffd60a', '#1a1a1a', 3);
    }
    s.opts.forEach((v, i) => Draw.btn(g, 240 + i * 240, 450, 180, 80, String(v), s.picked === i ? (v === s.n ? '#06d6a0' : '#ef233c') : '#fff', 50));
  },
});
