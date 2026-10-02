// DUO (curseur) : la toile du trampoline est tendue entre les deux souris, faites rebondir le héros
Engine.register({
  id: 'd_trampoline', name: 'Le trampoline', icon: '🤸', instruction: 'FAITES-LE REBONDIR !', input: 'curseur',
  hint: 'METTEZ LA TOILE SOUS LUI', duration: 7, cursor: 'none', duo: true, NEED: 3,
  IM: PA.images('d_trampoline', ['fond']),

  start(c) { return { t: 0, x: 300 + c.rng() * 360, y: 60, vx: (c.rng() - 0.5) * 120, vy: 0, bonds: 0, rot: 0 }; },
  ghost(s, c) { return { x: c.input.x, y: c.input.y }; },
  bot(s, c) {
    const b = s.bot || (s.bot = { x: 600, y: 440 });
    return Duo.suivre(b, s.x + (c.input.x < s.x ? 90 : -90), 440, 700, Duo.dtRobot(s));
  },

  update(s, dt, c) {
    s.t += dt;
    const [A, B] = Duo.paire(c, { x: 360, y: 440 }, { x: 600, y: 440 });
    s.A = A; s.B = B;
    if (s.lost) { s.rot += dt * 6; return; }
    const py = s.y;
    s.vy += 700 * dt; s.x += s.vx * dt; s.y += s.vy * dt;
    if (s.x < 60 || s.x > W - 60) s.vx = -s.vx;
    const lo = Math.min(A.x, B.x), hi = Math.max(A.x, B.x);
    if (s.vy > 0 && s.x > lo && s.x < hi && Math.hypot(B.x - A.x, B.y - A.y) > 60) {
      const k = (s.x - A.x) / ((B.x - A.x) || 1), ny = A.y + (B.y - A.y) * k;
      if (py <= ny && s.y >= ny) {
        s.y = ny; s.vy = -620; s.vx = (s.x < W / 2 ? 1 : -1) * (100 + ((s.bonds * 37) % 5) * 30); s.bonds++; // pas de hasard : identique chez les deux joueurs
        c.sfx.jump();
        if (s.bonds >= this.NEED) s.won = true;
      }
    }
    if (s.y > 520 && !s.won) { s.lost = true; c.sfx.hit(); }
    if (s.won && s.y > 600) s.y = 600;
  },

  draw(s, g, c) {
    const l = PA.debut(g, { ...this.IM, ...PA.HEROS }, '#bde0fe');
    if (!l) return;
    PA.fond(this.IM.fond);
    const A = s.A || { x: 360, y: 440 }, B = s.B || { x: 600, y: 440 };
    PA.forme((x) => { x.moveTo(A.x, A.y); x.lineTo(B.x, B.y); }, '#1a1222', 12);
    PA.forme((x) => { x.moveTo(A.x, A.y); x.lineTo(B.x, B.y); }, '#3a86ff', 7);
    PA.heros(s.x, s.y + 4, { rot: s.lost ? s.rot : clamp(s.vx / 600, -0.4, 0.4) });
    PA.texte(`${s.bonds} / ${this.NEED}`, W - 90, 50, 44);
    Duo.mains(c, A, B);
    PA.fin(g);
  },
});
