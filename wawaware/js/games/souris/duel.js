// SOURIS (réflexe) : duel de western, cliquer dès que "PAN !" s'affiche (pas avant)
Engine.register({
  id: 'duel', name: 'Duel au soleil', icon: '🤠', instruction: 'DÉGAINE !', input: 'souris',
  hint: 'CLIQUE DÈS QUE « PAN ! » APPARAÎT', duration: 5, cursor: 'crosshair',

  start(c) { return { t: 0, fire: 1 + c.rng() * 2.2, react: Math.max(0.35, 0.8 - 0.06 * c.diff), shot: false, early: false }; },

  update(s, dt, c) {
    s.t += dt;
    if (s.won || s.lost || c.over) return;
    if (c.input.clicked) {
      if (s.t < s.fire) { s.early = true; s.lost = true; c.sfx.hit(); }
      else { s.shot = true; s.won = true; c.sfx.noise(0.2, 0.4, 0, 2000); }
    } else if (s.t > s.fire + s.react) { s.lost = true; c.sfx.noise(0.2, 0.4, 0, 2000); }
  },

  draw(s, g) {
    Draw.sky(g, '#ffb703', '#ffe8d6', 360);
    Draw.circle(g, 480, 300, 90); g.fillStyle = '#fb8500'; g.fill();
    Draw.ground(g, 360, '#dda15e', '#bc6c25');
    g.fillStyle = '#606c38'; for (const x of [80, 860]) { Draw.rrect(g, x - 12, 250, 24, 120, 10); g.fill(); }
    const fired = s.t >= s.fire;
    Draw.hero(g, 220, 450, { shirt: '#3a86ff', pants: '#6f1d1b', rot: s.lost && !s.early ? -1.2 : 0 });
    Draw.hero(g, 740, 450, { face: -1, shirt: '#1a1a1a', pants: '#1a1a1a', rot: s.won ? 1.2 : 0 });
    if (fired) {
      g.save(); g.translate(W / 2, 140); g.rotate(-0.08);
      Draw.burst(g, 0, 0, 120, ['#ef233c', '#ffd400']);
      Draw.text(g, 'PAN !', 0, 0, 80, '#fff');
      g.restore();
    } else Draw.text(g, '…', W / 2, 140, 80, '#1a1a1a', null);
    if (s.early) Draw.text(g, 'TROP TÔT !', W / 2, 500, 50, '#ef233c');
  },
});
