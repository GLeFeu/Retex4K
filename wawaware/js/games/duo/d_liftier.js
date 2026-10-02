// DUO (curseur + clic) : le liftier. L'un monte / descend l'ascenseur (souris en haut / en bas),
// l'autre ouvre les portes (clic) quand la cabine est au bon étage. 2 passagers à livrer.
Engine.register({
  id: 'd_liftier', name: 'Les liftiers', icon: '🛗', instruction: 'LIVREZ-LES !', input: 'curseur',
  hint: 'L\'UN CONDUIT, L\'AUTRE OUVRE LES PORTES', duration: 9, cursor: 'none', duo: true,
  FLOORS: 6, FH: 70, BASE: 500, NEED: 2,
  IM: PA.images('d_liftier', ['fond']),

  start(c) {
    const r = () => Math.floor(c.rng() * 6);
    const trajets = []; for (let i = 0; i < 2; i++) { const a = r(); let b = r(); if (b === a) b = (a + 3) % 6; trajets.push({ de: a, vers: b }); }
    return { t: 0, trajets, i: 0, abord: false, clics: 0, livres: 0, porte: 0 };
  },
  ghost(s, c) { return { x: c.input.x, y: c.input.y, f: { n: s.clics } }; },
  etage(y) { return clamp(Math.round((this.BASE - y) / this.FH - 0.5), 0, this.FLOORS - 1); },
  bot(s, c) { // robot (rôle 1 : les portes) : ouvre quand c'est le bon étage
    const b = s.bot || (s.bot = { n: 0, tc: 0 });
    const tr = s.trajets[s.i], cible = tr ? (s.abord ? tr.vers : tr.de) : -1;
    if (cible >= 0 && this.etage(c.input.y) === cible && s.t - b.tc > 0.7) { b.n++; b.tc = s.t; }
    return { x: 760, y: 300, f: { n: b.n } };
  },
  roleSolo: 0,

  update(s, dt, c) {
    s.t += dt; s.porte = Math.max(0, s.porte - dt);
    const [A, B] = Duo.paire(c, { x: 400, y: 400 }, { x: 760, y: 300 });
    s.A = A; s.B = B;
    s.cab = this.etage(A.y);
    if (s.won || c.over) return;
    let ouvre = false;
    if (c.duo.role === 1 && c.input.clicked) { s.clics++; ouvre = true; }
    if (c.duo.role === 0 && Duo.nouveauxClics(s, c)) ouvre = true;
    if (!ouvre) return;
    s.porte = 0.5;
    const tr = s.trajets[s.i];
    if (!s.abord && s.cab === tr.de) { s.abord = true; c.sfx.tone(600, 0.08, 'square', 0.1); }
    else if (s.abord && s.cab === tr.vers) { s.abord = false; s.livres++; s.i++; c.sfx.tone(900, 0.12, 'square', 0.1); if (s.livres >= this.NEED) s.won = true; }
  },

  draw(s, g, c) {
    const l = PA.debut(g, { ...this.IM, ...PA.HEROS }, '#e9ecef');
    if (!l) return;
    PA.fond(this.IM.fond);
    const top = this.BASE - this.FLOORS * this.FH;
    PA.rect(326, top - 4, 228, this.FLOORS * this.FH + 8, '#2e2a3a'); PA.rect(330, top, 220, this.FLOORS * this.FH, '#9aa0b0');
    const tr = s.trajets[Math.min(s.i, s.trajets.length - 1)], petit = PA.reduit(PA.HEROS.heros, 0.5);
    for (let i = 0; i < this.FLOORS; i++) {
      const y = this.BASE - (i + 1) * this.FH;
      PA.rect(330, y + this.FH - 3, 220, 3, '#5a5d6e');
      PA.texte(String(i), 300, y + this.FH / 2, 26, '#f8f4ea');
      if (!s.won && !s.abord && i === tr.de) PA.spr(petit, 590, y + this.FH - 3, { ay: 1, flip: true });
      if (!s.won && i === tr.vers) PA.texte('★', 600, y + this.FH / 2, 28, '#ffd400');
    }
    const cab = s.cab ?? 0, cy = this.BASE - (cab + 1) * this.FH;
    PA.forme((x) => x.roundRect(360, cy + 4, 140, this.FH - 8, 4), '#ffd166');
    if (s.porte <= 0) { PA.rect(368, cy + 10, 60, this.FH - 20, '#c99a3a'); PA.rect(432, cy + 10, 60, this.FH - 20, '#c99a3a'); }
    if (s.abord) PA.spr(petit, 430, cy + this.FH - 6, { ay: 1 });
    // bouton des portes
    const [moiCoul, amiCoul] = Duo.couleurs(c);
    PA.bouton(760, 300, 150, 90, 'PORTES', s.porte > 0 ? '#06d6a0' : (c.duo.role === 1 ? moiCoul : amiCoul), 26);
    PA.texte(`${s.livres} / ${this.NEED}`, W - 90, 50, 40);
    PA.texte(c.duo.role === 0 ? 'TOI : CONDUIS (HAUT / BAS)' : 'TOI : OUVRE LES PORTES', W / 2, 30, 22, '#ffd400');
    Duo.mains(c, s.A || { x: 400, y: 400 }, s.B || { x: 760, y: 300 });
    PA.fin(g);
  },
});
