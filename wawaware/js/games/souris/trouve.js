// SOURIS : retrouver le personnage recherché dans la foule
Engine.register({
  id: 'trouve', name: 'Avis de recherche', icon: '🔍', instruction: 'TROUVE-LE !', input: 'souris',
  hint: 'CLIQUE SUR LE PERSONNAGE DE L\'AFFICHE', duration: 5, cursor: 'crosshair',
  COLORS: ['#ef233c', '#3a86ff', '#ffd400', '#06d6a0', '#ff6b9d', '#9d4edd', '#1a1a1a', '#fb8500'],

  start(c) {
    const pick = () => Math.floor(c.rng() * this.COLORS.length);
    const target = { shirt: pick(), pants: pick() };
    const n = 14 + 3 * Math.min(c.diff, 6), crowd = [];
    for (let i = 0; i < n; i++) {
      let shirt, pants;
      do { shirt = pick(); pants = pick(); } while (shirt === target.shirt && pants === target.pants);
      crowd.push({ shirt, pants, x: 60 + c.rng() * 840, y: 160 + c.rng() * 330, face: c.rng() < 0.5 ? 1 : -1, ph: c.rng() * 6 });
    }
    crowd[Math.floor(c.rng() * n)] = { ...crowd[0], ...target, x: 60 + c.rng() * 840, y: 160 + c.rng() * 330, target: true, face: 1, ph: 0 };
    crowd.sort((a, b) => a.y - b.y);
    return { t: 0, crowd, target, miss: 0 };
  },

  update(s, dt, c) {
    s.t += dt;
    s.miss = Math.max(0, s.miss - dt);
    if (s.won || c.over || !c.input.clicked) return;
    for (let i = s.crowd.length - 1; i >= 0; i--) {
      const p = s.crowd[i];
      if (Math.abs(c.input.x - p.x) < 22 && c.input.y < p.y && c.input.y > p.y - 60) {
        if (p.target) s.won = true; else { s.miss = 0.3; c.sfx.tone(150, 0.1, 'sawtooth', 0.08); }
        return;
      }
    }
  },

  draw(s, g) {
    g.fillStyle = '#e9edc9'; g.fillRect(0, 0, W, H);
    for (const p of s.crowd) {
      g.save(); g.translate(p.x, p.y); g.scale(0.65, 0.65);
      Draw.hero(g, 0, 0, { face: p.face, shirt: this.COLORS[p.shirt], pants: this.COLORS[p.pants], run: s.t * 4 + p.ph });
      g.restore();
      if (s.won && p.target) { Draw.circle(g, p.x, p.y - 30, 44); g.lineWidth = 6; g.strokeStyle = '#06d6a0'; g.stroke(); }
    }
    Draw.rrect(g, 10, 10, 150, 140, 8); Draw.fillStroke(g, '#fefae0');
    Draw.text(g, 'RECHERCHÉ', 85, 28, 20, '#ef233c', null);
    Draw.hero(g, 85, 140, { shirt: this.COLORS[s.target.shirt], pants: this.COLORS[s.target.pants] });
    if (s.miss > 0) Draw.text(g, 'NON !', W / 2, 60, 50, '#ef233c');
  },
});
