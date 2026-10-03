// DUO (curseur + clic) : le canon à laser. Le VISEUR oriente le canon avec sa souris,
// le TIREUR tient le clic pour tirer… mais le canon chauffe : il faut relâcher avant la surchauffe.
Engine.register({
  id: 'd_rayon', name: 'Le canon à deux', icon: '🔆', instruction: 'ÉCLATEZ-LES !', input: 'curseur',
  hint: 'L\'UN VISE, L\'AUTRE TIRE (SANS SURCHAUFFE)', duration: 8, cursor: 'none', duo: true,
  CANON: { x: 480, y: 500 }, CHAUD: 1.4,
  IM: PA.images('d_rayon', ['fond']),

  start(c) {
    const bulles = [];
    while (bulles.length < 7) { const x = 100 + c.rng() * 760, y = 90 + c.rng() * 280; if (bulles.every(b => Math.hypot(b.x - x, b.y - y) > 90)) bulles.push({ x, y, r: 24 + c.rng() * 12, ph: c.rng() * 6, pop: 0 }); }
    return { t: 0, bulles, chaleur: 0, panne: 0, tir: false };
  },
  ghost(s, c) { return Duo.fantome(s, c); },
  bot(s, c) {
    const b = s.bot || (s.bot = { x: 480, y: 250 }), dt = Duo.dtRobot(s);
    const reste = s.bulles.filter(o => !o.pop).map(o => this.bpos(s, o));
    if (c.duo.role === 1) { // le robot vise la bulle la plus proche du rayon
      if (reste.length) { const K = this.CANON; reste.sort((p, q) => Math.abs(Math.atan2(p.y - K.y, p.x - K.x) - (s.ang ?? -1.57)) - Math.abs(Math.atan2(q.y - K.y, q.x - K.x) - (s.ang ?? -1.57))); Duo.suivre(b, reste[0].x, reste[0].y, 500, dt); }
      return b;
    }
    // le robot tire quand le rayon passe sur une bulle, et relâche avant la surchauffe
    const vise = reste.some(p => this.touche(s, p, 34));
    return { x: 600, y: 450, f: { d: vise && s.chaleur < this.CHAUD * 0.8 } };
  },

  bpos(s, o) { return { x: o.x + Math.sin(s.t * 1.5 + o.ph) * 30, y: o.y + Math.cos(s.t * 1.2 + o.ph) * 18 }; },
  bout(s) { const K = this.CANON; return { x: K.x + Math.cos(s.ang) * 1100, y: K.y + Math.sin(s.ang) * 1100 }; },
  touche(s, p, r) { const K = this.CANON, E = this.bout(s); return Duo.distSeg(p.x, p.y, K.x, K.y, E.x, E.y) < r; },

  update(s, dt, c) {
    s.t += dt;
    const [A, B] = Duo.paire(c, { x: 480, y: 250 }, { x: 600, y: 450 });
    s.A = A; s.B = B;
    const K = this.CANON;
    s.ang = Math.atan2(Math.min(A.y, K.y - 20) - K.y, A.x - K.x);
    if (s.won) return;
    s.panne = Math.max(0, s.panne - dt);
    s.tir = !c.over && s.panne <= 0 && Duo.tenuDe(c, 1);
    if (s.tir) { s.chaleur += dt; if (s.chaleur > this.CHAUD) { s.panne = 1.2; s.chaleur = this.CHAUD; c.sfx.hit(); } }
    else s.chaleur = Math.max(0, s.chaleur - dt * (s.panne > 0 ? 1.1 : 0.8));
    for (const o of s.bulles) {
      if (o.pop) { o.pop += dt; continue; }
      if (s.tir && this.touche(s, this.bpos(s, o), o.r)) { o.pop = 0.001; c.sfx.pop(); }
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
    const K = this.CANON, a = s.ang ?? -Math.PI / 2, E = this.bout(s.ang != null ? s : { ang: a });
    if (s.tir) { // le rayon
      PA.forme((x) => { x.moveTo(K.x, K.y); x.lineTo(E.x, E.y); }, '#ff2d6f', 12);
      PA.forme((x) => { x.moveTo(K.x, K.y); x.lineTo(E.x, E.y); }, '#ffd0e0', 4);
    } else PA.forme((x) => { x.moveTo(K.x, K.y); x.lineTo(K.x + Math.cos(a) * 900, K.y + Math.sin(a) * 900); }, 'rgba(255,45,111,0.25)', 2); // la visée
    // le canon
    PA.forme((x) => { x.save(); x.translate(K.x, K.y); x.rotate(a); x.rect(0, -12, 70, 24); x.restore(); }, s.panne > 0 ? '#ef233c' : '#8a8d9c');
    PA.disque(K.x, K.y + 10, 40, '#5a5d6c');
    // la jauge de chaleur
    const k = (s.chaleur || 0) / this.CHAUD;
    PA.rect(40, 300, 22, 200, '#1a1222'); PA.rect(44, 496 - 192 * k, 14, 192 * k, PA.mix('#06d6a0', '#ef233c', k));
    PA.texte(s.panne > 0 ? 'SURCHAUFFE !' : '🔥', 51, 280, 20, '#ef233c');
    PA.texte(`${s.bulles.filter(o => !o.pop).length}`, W - 60, 50, 44);
    PA.texte(c.duo.role === 0 ? 'TOI : VISE AVEC LA SOURIS' : 'TOI : TIENS LE CLIC POUR TIRER', W / 2, 40, 24, '#ffd400');
    Duo.mains(c, s.A || { x: 480, y: 250 }, s.B || { x: 600, y: 450 });
    PA.fin(g);
  },
});
