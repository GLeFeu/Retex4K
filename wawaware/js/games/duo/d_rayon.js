// DUO (curseur) : un rayon laser va d'une souris à l'autre et éclate les bulles qu'il touche
Engine.register({
  id: 'd_rayon', name: 'Le rayon à deux', icon: '🔆', instruction: 'ÉCLATEZ-LES !', input: 'curseur',
  hint: 'LE RAYON RELIE VOS DEUX SOURIS', duration: 6, cursor: 'none', duo: true,
  IM: PA.images('d_rayon', ['fond']),

  start(c) {
    const bulles = [];
    while (bulles.length < 10) { const x = 80 + c.rng() * 800, y = 80 + c.rng() * 380; if (bulles.every(b => Math.hypot(b.x - x, b.y - y) > 80)) bulles.push({ x, y, r: 22 + c.rng() * 14, ph: c.rng() * 6, pop: 0 }); }
    return { t: 0, bulles };
  },
  ghost(s, c) { return { x: c.input.x, y: c.input.y }; },
  bot(s, c) { // le robot va vers la bulle restante la plus proche de lui
    const b = s.bot || (s.bot = { x: 800, y: 300 });
    const reste = s.bulles.filter(o => !o.pop);
    if (reste.length) { reste.sort((p, q) => Math.hypot(p.x - b.x, p.y - b.y) - Math.hypot(q.x - b.x, q.y - b.y)); Duo.suivre(b, reste[0].x + 30, reste[0].y + 30, 380, Duo.dtRobot(s)); }
    return b;
  },

  bpos(s, o) { return { x: o.x + Math.sin(s.t * 1.5 + o.ph) * 20, y: o.y + Math.cos(s.t * 1.2 + o.ph) * 14 }; },

  update(s, dt, c) {
    s.t += dt;
    const [A, B] = Duo.paire(c);
    s.A = A; s.B = B;
    if (s.won) return;
    for (const o of s.bulles) {
      if (o.pop) { o.pop += dt; continue; }
      const p = this.bpos(s, o);
      if (Duo.distSeg(p.x, p.y, A.x, A.y, B.x, B.y) < o.r) { o.pop = 0.001; c.sfx.pop(); }
    }
    if (s.bulles.every(o => o.pop)) s.won = true;
  },

  draw(s, g, c) {
    const l = PA.debut(g, this.IM, '#1d1a3a');
    if (!l) return;
    PA.fond(this.IM.fond);
    for (const o of s.bulles) {
      const p = this.bpos(s, o);
      if (o.pop) { if (o.pop < 0.25) for (let i = 0; i < 8; i++) { const a = i * 0.8; PA.disque(p.x + Math.cos(a) * (o.r + o.pop * 120), p.y + Math.sin(a) * (o.r + o.pop * 120), 3, 'rgba(180,230,255,0.8)'); } continue; }
      PA.disque(p.x, p.y, o.r, 'rgba(120,220,255,0.28)'); // bulle bien visible sur le décor chargé
      PA.cercle(p.x, p.y, o.r, '#1a1222', 2);
      PA.cercle(p.x, p.y, o.r - 3, '#9ff0ff', 1);
      PA.disque(p.x - o.r * 0.35, p.y - o.r * 0.35, 5, '#ffffff');
    }
    const A = s.A || { x: 300, y: 270 }, B = s.B || { x: 660, y: 270 };
    PA.forme((x) => { x.moveTo(A.x, A.y); x.lineTo(B.x, B.y); }, '#ff2d6f', 10);
    PA.forme((x) => { x.moveTo(A.x, A.y); x.lineTo(B.x, B.y); }, '#ffd0e0', 3);
    PA.texte(`${s.bulles.filter(o => !o.pop).length}`, W - 60, 50, 44);
    Duo.mains(c, A, B);
    PA.fin(g);
  },
});
