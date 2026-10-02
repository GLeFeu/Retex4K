// DUO (souris) : un seul des deux voit dans quel cadeau est l'étoile. Il la montre avec sa souris,
// l'autre doit cliquer le bon cadeau.
Engine.register({
  id: 'd_souffleur', name: 'Le souffleur', icon: '🎁', instruction: 'LE BON CADEAU !', input: 'souris',
  hint: 'L\'UN VOIT L\'ÉTOILE ET LA MONTRE, L\'AUTRE CLIQUE', duration: 6, cursor: 'none', duo: true, roleSolo: 1,
  IM: PA.images('d_souffleur', ['fond', 'cadeau']),

  start(c) { return { t: 0, bon: Math.floor(c.rng() * 9), choix: -1, clics: 0, dernier: -1 }; },
  pos(i) { return { x: 300 + (i % 3) * 180, y: 140 + Math.floor(i / 3) * 140 }; },
  ghost(s, c) { return { x: c.input.x, y: c.input.y, f: { n: s.clics, k: s.dernier } }; },
  bot(s, c) { // robot souffleur : tourne autour du bon cadeau
    const b = s.bot || (s.bot = { x: 480, y: 300 });
    const p = this.pos(s.bon);
    return Duo.suivre(b, p.x + Math.cos(s.t * 6) * 30, p.y + Math.sin(s.t * 6) * 20, 500, Duo.dtRobot(s));
  },
  caseSous(x, y) { for (let i = 0; i < 9; i++) { const p = this.pos(i); if (Math.abs(x - p.x) < 70 && Math.abs(y - p.y) < 60) return i; } return -1; },

  update(s, dt, c) {
    s.t += dt;
    const [A, B] = Duo.paire(c);
    s.A = A; s.B = B;
    if (s.choix >= 0 || c.over) return;
    let k = -1;
    if (c.duo.role === 1 && c.input.clicked) { k = this.caseSous(c.input.x, c.input.y); if (k >= 0) { s.clics++; s.dernier = k; } }
    if (c.duo.role === 0 && Duo.nouveauxClics(s, c)) { const a = c.duo.ami(); k = a && a.f ? a.f.k : -1; }
    if (k >= 0) { s.choix = k; if (k === s.bon) s.won = true; else { s.lost = true; c.sfx.hit(); } }
  },

  draw(s, g, c) {
    const l = PA.debut(g, this.IM, '#3a0ca3');
    if (!l) return;
    PA.fond(this.IM.fond);
    const voit = c.duo.role === 0 || s.choix >= 0;
    for (let i = 0; i < 9; i++) {
      const p = this.pos(i), ouvert = s.choix === i || (s.choix >= 0 && i === s.bon);
      if (ouvert && i === s.bon) PA.texte('★', p.x, p.y, 80, '#ffd400'); // le cadeau ouvert : la bonne étoile
      else PA.spr(this.IM.cadeau, p.x, p.y + 30, { ay: 1, sy: ouvert ? 0.5 : 1 });
      if (voit && i === s.bon && s.choix < 0) PA.cercle(p.x, p.y, 62, '#ffd400', 2); // seul le souffleur le voit
      if (s.choix === i) PA.cercle(p.x, p.y, 66, i === s.bon ? '#06d6a0' : '#ef233c', 2);
    }
    PA.texte(c.duo.role === 0 ? 'TOI : MONTRE-LUI LE BON !' : 'TOI : CLIQUE OÙ IL TE MONTRE', W / 2, 40, 24, '#ffd400');
    Duo.mains(c, s.A || { x: 300, y: 270 }, s.B || { x: 660, y: 270 });
    PA.fin(g);
  },
});
