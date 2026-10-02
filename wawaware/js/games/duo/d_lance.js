// DUO (curseur + clic) : l'un lance les balles (clic, la hauteur de sa souris règle la force),
// l'autre les rattrape avec le panier. 3 balles à attraper.
Engine.register({
  id: 'd_lance', name: 'Lance et attrape', icon: '🧺', instruction: 'LANCE, ATTRAPE !', input: 'curseur',
  hint: 'L\'UN LANCE (CLIC), L\'AUTRE ATTRAPE AVEC LE PANIER', duration: 8, cursor: 'none', duo: true, NEED: 3, PY: 470,
  IM: PA.images('d_lance', ['fond', 'panier']),

  start(c) { return { t: 0, balles: [], lances: 0, pris: 0, rates: 0, dernier: -1 }; },
  ghost(s, c) { return { x: c.input.x, y: c.input.y, f: { n: s.lances, p: Math.round(this.force(c.input.y) * 100) } }; },
  force(y) { return clamp(1 - (y - 60) / 400, 0.2, 1); },
  lancer(s, f) { s.balles.push({ x: 110, y: 380, vx: 260 + f * 520, vy: -520 - f * 120, etat: 0 }); },
  bot(s, c) { // robot (rôle 1 : le panier) : va là où la balle va tomber
    const b = s.bot || (s.bot = { x: 600, y: this.PY });
    const v = s.balles.find(o => o.etat === 0);
    let cible = 600;
    if (v) { const a = 700, disc = v.vy * v.vy + 2 * a * (this.PY - v.y), tt = (-v.vy + Math.sqrt(Math.max(0, disc))) / a; cible = v.x + v.vx * tt; }
    return Duo.suivre(b, clamp(cible, 200, 900), this.PY, 650, Duo.dtRobot(s));
  },
  roleSolo: 0,

  update(s, dt, c) {
    s.t += dt;
    const [A, B] = Duo.paire(c, { x: 110, y: 260 }, { x: 600, y: this.PY });
    s.A = A; s.B = B; s.panier = clamp(B.x, 200, 900);
    if (!s.won && !s.lost && !c.over) {
      if (c.duo.role === 0 && c.input.clicked && s.balles.filter(o => o.etat === 0).length < 2) { s.lances++; this.lancer(s, this.force(c.input.y)); c.sfx.jump(); }
      if (c.duo.role === 1 && Duo.nouveauxClics(s, c)) { const a = c.duo.ami(); this.lancer(s, a && a.f ? a.f.p / 100 : 0.6); }
    }
    for (const o of s.balles) {
      if (o.etat) continue;
      o.vy += 700 * dt; o.x += o.vx * dt; o.y += o.vy * dt;
      if (o.y >= this.PY - 10 && Math.abs(o.x - s.panier) < 55) { o.etat = 1; s.pris++; c.sfx.tone(800, 0.08, 'square', 0.1); if (s.pris >= this.NEED) s.won = true; }
      else if (o.y > H + 30) { o.etat = 2; s.rates++; if (s.rates >= 3 && !s.won) s.lost = true; }
    }
  },

  draw(s, g, c) {
    const l = PA.debut(g, { ...this.IM, ...PA.HEROS }, '#bde0fe');
    if (!l) return;
    PA.fond(this.IM.fond);
    const [moiCoul, amiCoul] = Duo.couleurs(c);
    PA.heros(90, 450, { shirt: (c.duo.role === 0 ? moiCoul : amiCoul).length === 7 ? (c.duo.role === 0 ? moiCoul : amiCoul) : '#ffd400' });
    // jauge de force du lanceur (hauteur de sa souris)
    const A = s.A || { x: 110, y: 260 }, f = this.force(A.y);
    PA.rect(30, 140, 20, 260, '#1a1222'); PA.rect(32, 398 - 256 * f, 16, 256 * f, '#fb8500');
    for (const o of s.balles) if (o.etat === 0) PA.boule(o.x, o.y, 14, '#ef233c');
    PA.spr(this.IM.panier, s.panier ?? 600, this.PY + 30, { ay: 1 });
    PA.texte(`${s.pris} / ${this.NEED}`, W - 90, 50, 40);
    PA.texte(c.duo.role === 0 ? 'TOI : LANCE (CLIC, HAUTEUR = FORCE)' : 'TOI : ATTRAPE AVEC LE PANIER', W / 2, 40, 22, '#ffd400');
    Duo.mains(c, A, s.B || { x: 600, y: this.PY });
    PA.fin(g);
  },
});
