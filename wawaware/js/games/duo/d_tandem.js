// DUO (clavier) : le tandem. Le PÉDALEUR tape ESPACE pour avancer, le PILOTE tape ESPACE pour SAUTER
// par-dessus les troncs. Il faut arriver au drapeau avant la fin.
Engine.register({
  id: 'd_tandem', name: 'Le tandem', icon: '🚲', instruction: 'PÉDALEZ, SAUTEZ !', input: 'clavier',
  hint: 'L\'UN PÉDALE (ESPACE), L\'AUTRE SAUTE (ESPACE)', duration: 9, duo: true, NEED: 30, SAUT: 0.75,
  IM: PA.images('d_tandem', ['fond', 'tandem']),

  start(c) { return { t: 0, dist: 0, vit: 0, saut: 0, troncs: [9 + c.rng() * 2, 17 + c.rng() * 2, 24 + c.rng() * 2] }; },
  ecranX(d) { return 140 + (d / this.NEED) * 640; },
  ghost(s, c) { return Duo.fantome(s, c, 'Space'); },
  bot(s, c) {
    const b = s.bot || (s.bot = { n: 0, tc: 0 });
    if (c.duo.role === 1) { if (s.t - b.tc > 0.13) { b.n++; b.tc = s.t; } } // le robot pédale
    else { // le robot saute juste avant un tronc
      const proche = s.troncs.some(d => d - s.dist > 0 && d - s.dist < 0.4 + s.vit * 0.25);
      if (proche && s.saut <= 0 && s.t - b.tc > 0.5) { b.n++; b.tc = s.t; }
    }
    return { x: 0, y: 0, f: { n: b.n } };
  },

  update(s, dt, c) {
    s.t += dt;
    s.saut = Math.max(0, s.saut - dt);
    if (s.won || s.lost || c.over) return;
    const coups = Duo.clicDe(s, c, 0, 'Space');
    if (coups) { s.vit = Math.min(6, s.vit + 1.1 * coups); c.sfx.tone(440, 0.03, 'square', 0.06); }
    if (Duo.clicDe(s, c, 1, 'Space') && s.saut <= 0) { s.saut = this.SAUT; c.sfx.jump(); }
    s.vit = Math.max(0, s.vit - dt * 1.8);
    s.dist += s.vit * dt;
    for (const d of s.troncs) if (Math.abs(this.ecranX(d) - this.ecranX(s.dist)) < 50 && s.saut <= 0) { s.lost = true; c.sfx.hit(); return; }
    if (s.dist >= this.NEED) s.won = true;
  },

  draw(s, g, c) {
    const l = PA.debut(g, this.IM, '#bde0fe');
    if (!l) return;
    PA.fond(this.IM.fond);
    // la route vue de côté (le décor reste fixe, seuls les traits défilent)
    PA.rect(0, 432, W, 108, '#4a4458'); PA.rect(0, 432, W, 6, '#8a8296'); PA.rect(0, 528, W, 12, '#3a8a3a');
    const off = (s.dist * 24) % 120;
    for (let x = -off; x < W; x += 120) PA.rect(x, 486, 60, 6, '#f8f4ea');
    for (const d of s.troncs) { const x = this.ecranX(d); PA.forme((xx) => xx.roundRect(x - 26, 448, 52, 28, 10), '#7a5230'); PA.disque(x + 18, 462, 9, '#c9a46a'); }
    const x = this.ecranX(s.dist), h = s.saut > 0 ? Math.sin((1 - s.saut / this.SAUT) * Math.PI) * 120 : 0;
    PA.ombre(x, 476, 90, 8, 0.3);
    PA.spr(this.IM.tandem, x, 474 - h, { ay: 1, rot: s.lost ? 0.5 : -h * 0.001 });
    PA.rect(880, 316, 6, 160, '#f8f4ea'); for (let y = 316; y < 476; y += 20) PA.rect(886, y, 14, 10, (y / 20) % 2 ? '#1a1222' : '#f8f4ea');
    if (s.lost) PA.texte('BADABOUM !', W / 2, 160, 60, '#ef233c');
    PA.texte(c.duo.role === 0 ? 'TOI : PÉDALE (ESPACE ESPACE…)' : 'TOI : SAUTE LES TRONCS (ESPACE)', W / 2, 60, 30, '#ffd400');
    PA.fin(g);
  },
});
