// CURSEUR : 1, 2, 3 soleil avec un T-rex ! Avancer quand il ne regarde pas, s'immobiliser sinon
Engine.register({
  id: 'statue', name: '1, 2, 3 dino !', icon: '🦖', instruction: 'NE BOUGE PLUS !', input: 'curseur',
  hint: 'AVANCE VERS LA DROITE, FIGE-TOI QUAND IL REGARDE', duration: 6, cursor: 'none', GOAL: 760,

  start(c) {
    const look = Math.max(0.7, 1.1 - 0.05 * c.diff);
    const phases = []; let t = 0, watch = false;
    while (t < 8) { const d = watch ? look : 0.8 + c.rng() * 0.8; phases.push({ t, watch }); t += d; watch = !watch; }
    return { t: 0, phases, hx: 100, px: c.input.x, py: c.input.y, moved: 0 };
  },

  watching(s) { let w = false; for (const p of s.phases) if (s.t >= p.t) w = p.watch; return w; },
  warning(s) { return s.phases.some(p => p.watch && s.t < p.t && p.t - s.t < 0.3); },

  update(s, dt, c) {
    s.t += dt;
    const dx = c.input.x - s.px, mv = Math.hypot(dx, c.input.y - s.py);
    s.px = c.input.x; s.py = c.input.y;
    if (s.won || s.lost || c.over) return;
    if (this.watching(s)) {
      s.moved += mv;
      if (s.moved > 12) { s.lost = true; c.sfx.hit(); }
      return;
    }
    s.moved = 0;
    if (dx > 0) s.hx += dx;
    if (s.hx >= this.GOAL) s.won = true;
  },

  draw(s, g) {
    Draw.sky(g, '#ffbe0b', '#ffe066', 430);
    Draw.ground(g, 430, '#bc6c25', '#99582a');
    const watch = this.watching(s);
    // T-rex à droite
    g.save(); g.translate(870, 430); g.scale(watch ? -1 : 1, 1);
    Draw.ellipse(g, 0, -120, 70, 90); Draw.fillStroke(g, '#2b9348');
    Draw.rrect(g, -30, -260, 110, 80, 30); Draw.fillStroke(g, '#2b9348');
    Draw.circle(g, 50, -235, 10); Draw.fillStroke(g, watch ? '#ef233c' : '#fff', '#1a1a1a', 3);
    g.fillStyle = '#fff'; for (let i = 0; i < 4; i++) g.fillRect(20 + i * 14, -192, 8, 10);
    g.fillStyle = '#2b9348'; g.fillRect(-30, -40, 24, 40); g.fillRect(20, -40, 24, 40);
    g.restore();
    if (watch) Draw.text(g, '👀', 870, 110, 50, '#000', null);
    if (this.warning(s)) Draw.text(g, '!', 820, 120, 80, '#ef233c');
    g.fillStyle = '#fff'; g.fillRect(this.GOAL, 330, 6, 100);
    Draw.hero(g, s.hx, 430, { run: s.hx * 0.1, rot: s.lost ? -1.3 : 0 });
    Draw.text(g, watch ? 'IL REGARDE !' : 'VAS-Y !', W / 2 - 100, 60, 50, watch ? '#ef233c' : '#06d6a0');
  },
});
