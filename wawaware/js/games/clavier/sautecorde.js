// CLAVIER (Espace en rythme) : sauter à la corde sans se prendre les pieds
Engine.register({
  id: 'sautecorde', name: 'Corde à sauter', icon: '➰', instruction: 'SAUTE EN RYTHME !', input: 'clavier',
  hint: 'ESPACE QUAND LA CORDE ARRIVE EN BAS', duration: 5, survival: true, PX: 480,

  start(c) { return { t: 0, a: -Math.PI / 2, w: (Math.PI * 2) / Math.max(0.7, 1.1 - 0.05 * c.diff), py: 0, vy: 0, jumps: 0 }; },

  update(s, dt, c) {
    s.t += dt;
    const prev = Math.sin(s.a);
    if (!s.lost) s.a += s.w * dt;
    if (!c.over && !s.lost && s.py === 0 && c.input.wasPressed('Space', 'ArrowUp', 'KeyW')) { s.vy = -520; c.sfx.jump(); }
    if (s.py < 0 || s.vy < 0) { s.vy += 2200 * dt; s.py = Math.min(0, s.py + s.vy * dt); if (s.py === 0) s.vy = 0; }
    // la corde passe sous les pieds quand sin(a) franchit 1 (en bas, devant)
    const now = Math.sin(s.a);
    const bottom = Math.cos(s.a) > 0 && prev < 0.97 && now >= 0.97;
    if (bottom && !s.lost && !c.over) {
      if (s.py > -25) { s.lost = true; c.sfx.hit(); } else { s.jumps++; c.sfx.tone(600, 0.04, 'square', 0.06); }
    }
  },

  draw(s, g) {
    Draw.sky(g, '#ffcad4', '#f4acb7', 440);
    Draw.ground(g, 440, '#9d8189', '#6d6875');
    const front = Math.cos(s.a) > 0;
    const ropeY = 300 + Math.sin(s.a) * 150, ropeK = Math.sin(s.a);
    const rope = () => { g.beginPath(); g.moveTo(this.PX - 160, 300); g.quadraticCurveTo(this.PX, ropeY + ropeK * 80, this.PX + 160, 300); g.lineWidth = 6; g.strokeStyle = '#ef233c'; g.stroke(); };
    if (!front) rope();
    Draw.hero(g, this.PX, 440 + s.py, { rot: s.lost ? 1.3 : 0 });
    if (front) rope();
    for (const sx of [-1, 1]) Draw.hero(g, this.PX + sx * 200, 440, { face: -sx, shirt: '#06d6a0' });
    Draw.text(g, String(s.jumps), W - 70, 60, 50);
  },
});
