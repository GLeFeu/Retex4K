// DUO (souris) : le moustique. Il faut l'écraser à DEUX MAINS : vos deux mains sur lui et un clic en même temps.
Engine.register({
  id: 'd_clap', name: 'Clap à deux', icon: '🦟', instruction: 'CLAP !', input: 'souris',
  hint: 'VOS DEUX MAINS SUR LE MOUSTIQUE, CLIQUEZ ENSEMBLE', duration: 7, cursor: 'none', duo: true, FENETRE: 0.4,
  IM: PA.images('d_clap', ['fond', 'moustique']),

  start(c) { return { t: 0, x: 480, y: 270, vx: 0, p: [0, 1, 2, 3].map(() => c.rng() * 6), clics: 0, moiT: -9, amiT: -9, moiP: null, amiP: null }; },
  ghost(s, c) { return { x: c.input.x, y: c.input.y, f: { n: s.clics } }; },
  bot(s, c) { // robot : suit le moustique et clique juste après toi
    const b = s.bot || (s.bot = { x: 600, y: 270, n: 0, at: -1, lastSeen: -9 });
    Duo.suivre(b, s.x + 40, s.y, 520, Duo.dtRobot(s));
    if (s.moiT > b.lastSeen && b.at < 0) b.at = s.t + 0.1;
    b.lastSeen = Math.max(b.lastSeen, s.moiT);
    if (b.at > 0 && s.t >= b.at) { b.n++; b.at = -1; }
    return { x: b.x, y: b.y, f: { n: b.n } };
  },
  update(s, dt, c) {
    s.t += dt;
    const [A, B] = Duo.paire(c);
    s.A = A; s.B = B;
    if (s.won) return;
    // trajet qui ne dépend que du temps : les deux joueurs voient le moustique au même endroit
    const p = s.p, nx = 480 + Math.sin(s.t * 1.3 + p[0]) * 250 + Math.sin(s.t * 3.1 + p[1]) * 90, ny = 270 + Math.sin(s.t * 1.7 + p[2]) * 140 + Math.sin(s.t * 2.9 + p[3]) * 50;
    s.vx = nx - s.x; s.x = nx; s.y = ny;
    if (c.over) return;
    const moi = c.duo.role === 0 ? A : B, ami = c.duo.role === 0 ? B : A;
    if (c.input.clicked) { s.clics++; s.moiT = s.t; s.moiP = { x: moi.x, y: moi.y }; c.sfx.swat(); }
    if (Duo.nouveauxClics(s, c)) { s.amiT = s.t; s.amiP = { x: ami.x, y: ami.y }; }
    if (s.moiP && s.amiP && Math.abs(s.moiT - s.amiT) <= this.FENETRE) {
      const pres = (p) => Math.hypot(p.x - s.x, p.y - s.y) < 80;
      if (pres(s.moiP) && pres(s.amiP)) { s.won = true; c.sfx.splat(); }
      s.moiP = s.amiP = null;
    }
  },

  draw(s, g, c) {
    const l = PA.debut(g, this.IM, '#2a2440');
    if (!l) return;
    PA.fond(this.IM.fond);
    if (s.won) { PA.disque(s.x, s.y, 14, '#5a1a1a'); PA.texte('CLAP !', W / 2, 120, 70, '#ffd400'); PA.secousse(1); }
    else PA.sprContour(this.IM.moustique, s.x, s.y + Math.round(Math.sin(s.t * 30)) * 3, '#1a1222', { flip: s.vx < 0 }); // contour sombre : visible même sur le tapis clair
    Duo.mains(c, s.A || { x: 300, y: 270 }, s.B || { x: 660, y: 270 });
    PA.fin(g);
  },
});
