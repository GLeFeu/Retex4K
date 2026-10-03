// DUO (souris) : le moustique. L'un tient la LAMPE : le moustique est attiré par la lumière et la suit ;
// l'autre tient la TAPETTE et clique pour l'écraser quand il passe dessous.
Engine.register({
  id: 'd_clap', name: 'Le moustique', icon: '🦟', instruction: 'ÉCRASEZ-LE !', input: 'souris',
  hint: 'L\'UN L\'ATTIRE AVEC LA LAMPE, L\'AUTRE TAPE', duration: 8, cursor: 'none', duo: true,
  IM: PA.images('d_clap', ['fond', 'moustique']),

  start(c) { return { t: 0, x: 480, y: 200, vx: 0, vy: 0, ph: c.rng() * 6, rate: 0 }; },
  ghost(s, c) { return Duo.fantome(s, c); },
  bot(s, c) {
    const b = s.bot || (s.bot = { x: 600, y: 350, n: 0, tc: 0 }), dt = Duo.dtRobot(s);
    if (c.duo.role === 1) { // le robot porte la lampe : il l'amène doucement vers la tapette
      const T = s.B || { x: 600, y: 350 };
      return Duo.suivre(b, T.x + 60, T.y - 40, 160, dt);
    }
    Duo.suivre(b, s.x, s.y, 260, dt); // le robot tapeur : s'approche et tape quand il est dessus
    if (Math.hypot(b.x - s.x, b.y - s.y) < 30 && s.t - b.tc > 0.5) { b.n++; b.tc = s.t; }
    return { x: b.x, y: b.y, f: { n: b.n } };
  },

  update(s, dt, c) {
    s.t += dt; s.rate = Math.max(0, s.rate - dt);
    const [A, B] = Duo.paire(c, { x: 300, y: 270 }, { x: 660, y: 330 });
    s.A = A; s.B = B;
    if (s.won) return;
    // le moustique vole vers la lampe en zigzaguant (il ne s'arrête jamais tout à fait)
    const zx = Math.sin(s.t * 5 + s.ph) * 90, zy = Math.cos(s.t * 6.3 + s.ph) * 70;
    s.vx += ((A.x + zx) - s.x) * 4 * dt; s.vy += ((A.y + zy) - s.y) * 4 * dt;
    s.vx *= 0.94; s.vy *= 0.94;
    s.x = clamp(s.x + s.vx * dt, 30, W - 30); s.y = clamp(s.y + s.vy * dt, 60, H - 30);
    if (!c.over && Duo.clicDe(s, c, 1)) {
      if (Math.hypot(B.x - s.x, B.y - s.y) < 50) { s.won = true; c.sfx.splat(); }
      else { s.rate = 0.3; c.sfx.swat(); }
    }
  },

  draw(s, g, c) {
    const l = PA.debut(g, this.IM, '#2a2440');
    if (!l) return;
    PA.fond(this.IM.fond);
    const A = s.A || { x: 300, y: 270 }, B = s.B || { x: 660, y: 330 };
    // la lampe : un halo jaune
    PA.disque(A.x, A.y, 70, 'rgba(255,214,102,0.18)'); PA.disque(A.x, A.y, 40, 'rgba(255,214,102,0.25)');
    PA.disque(A.x, A.y, 14, '#ffd166'); PA.disque(A.x, A.y, 7, '#fff8d0');
    if (s.won) { PA.disque(s.x, s.y, 14, '#5a1a1a'); PA.texte('SPLATCH !', W / 2, 120, 70, '#ffd400'); PA.secousse(1); }
    else PA.sprContour(this.IM.moustique, s.x, s.y + Math.round(Math.sin(s.t * 30)) * 3, '#1a1222', { flip: s.vx < 0 }); // contour sombre : visible même sur le tapis clair
    // la tapette
    PA.forme((x) => x.roundRect(B.x - 32, B.y - 32, 64, 64, 10), s.rate ? '#ef233c' : '#06d6a0');
    for (let k = -2; k <= 2; k++) { PA.rect(B.x + k * 12, B.y - 28, 2, 56, 'rgba(26,18,34,0.5)'); PA.rect(B.x - 28, B.y + k * 12, 56, 2, 'rgba(26,18,34,0.5)'); }
    PA.rect(B.x - 4, B.y + 32, 8, 70, '#7a5230');
    PA.texte(c.duo.role === 0 ? 'TOI : LA LAMPE (ATTIRE-LE)' : 'TOI : LA TAPETTE (CLIQUE)', W / 2, 40, 24, '#ffd400');
    Duo.mains(c, A, B);
    PA.fin(g);
  },
});
