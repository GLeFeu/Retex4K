// SOURIS : retrouver l'ombre qui correspond exactement à l'étoile (bon nombre de branches)
Engine.register({
  id: 'ombre', name: 'La bonne ombre', icon: '🌑', instruction: 'QUELLE OMBRE ?', input: 'souris',
  hint: 'CLIQUE L\'OMBRE QUI A LE MÊME NOMBRE DE BRANCHES', duration: 5, cursor: 'pointer',

  start(c) {
    const n = 4 + Math.floor(c.rng() * 4);
    const opts = shuffle([n, n + 1, n - 1 > 2 ? n - 1 : n + 2], c.rng);
    return { t: 0, n, opts, rots: opts.map(() => c.rng() * 6), picked: -1, depth: c.diff >= 3 ? 0.55 : 0.4 };
  },

  star(g, x, y, k, r, rot, depth) {
    g.beginPath();
    for (let i = 0; i < k * 2; i++) { const a = rot + i * Math.PI / k, rr = i % 2 ? r * depth : r; g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); }
    g.closePath();
  },

  update(s, dt, c) {
    s.t += dt;
    if (s.picked >= 0 || c.over || !c.input.clicked) return;
    s.opts.forEach((k, i) => {
      if (Math.hypot(c.input.x - (220 + i * 260), c.input.y - 390) < 90) {
        s.picked = i;
        if (k === s.n) s.won = true; else { s.lost = true; c.sfx.hit(); }
      }
    });
  },

  draw(s, g) {
    g.fillStyle = '#fff3b0'; g.fillRect(0, 0, W, H);
    this.star(g, W / 2, 140, s.n, 90, s.t * 0.5, s.depth); Draw.fillStroke(g, '#ff9f1c');
    g.fillStyle = '#e0c068'; g.fillRect(0, 270, W, 4);
    s.opts.forEach((k, i) => {
      this.star(g, 220 + i * 260, 390, k, 80, s.rots[i], s.depth);
      g.fillStyle = s.picked === i ? (k === s.n ? '#06d6a0' : '#ef233c') : '#343a40'; g.fill();
    });
  },
});
