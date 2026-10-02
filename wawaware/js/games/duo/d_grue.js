// DUO (curseur + clic) : la pince de la machine à peluches. L'un la déplace de gauche à droite,
// l'autre la fait descendre et clique pour attraper la peluche.
Engine.register({
  id: 'd_grue', name: 'La pince à deux', icon: '🧸', instruction: 'ATTRAPEZ-LA !', input: 'curseur',
  hint: 'L\'UN BOUGE LA PINCE, L\'AUTRE DESCEND ET CLIQUE', duration: 7, cursor: 'none', duo: true,
  IM: PA.images('d_grue', ['fond', 'peluche']),

  start(c) { return { t: 0, tx: 250 + c.rng() * 460, ty: 430, clics: 0, prise: false, monte: 0 }; },
  ghost(s, c) { return { x: c.input.x, y: c.input.y, f: { n: s.clics } }; },
  bot(s, c) { // robot (rôle 1 : la hauteur) : descend quand la pince est au-dessus de la peluche, puis clique
    const b = s.bot || (s.bot = { x: 700, y: 120, n: 0, tc: 0 });
    const dt = Duo.dtRobot(s), cx = this.pinceX(s, c);
    const dessus = Math.abs(cx - s.tx) < 25;
    Duo.suivre(b, 700, dessus ? s.ty - 30 : 120, 260, dt);
    if (dessus && b.y > s.ty - 45 && s.t - b.tc > 0.6) { b.n++; b.tc = s.t; }
    return { x: b.x, y: b.y, f: { n: b.n } };
  },
  roleSolo: 0,
  pinceX(s, c) { return clamp(c.duo.role === 0 ? c.input.x : (c.duo.ami() || { x: 480 }).x, 80, 880); },

  update(s, dt, c) {
    s.t += dt;
    const [A, B] = Duo.paire(c, { x: 480, y: 120 }, { x: 700, y: 120 });
    s.A = A; s.B = B;
    s.cx = clamp(A.x, 80, 880); s.cy = clamp(B.y, 110, 440);
    if (s.prise) { s.monte += dt; return; }
    if (c.over) return;
    // clic du joueur qui a le rôle 1 (le mien si c'est moi, sinon on lit son compteur)
    let clic = false;
    if (c.duo.role === 1 && c.input.clicked) { s.clics++; clic = true; }
    if (c.duo.role === 0 && Duo.nouveauxClics(s, c)) clic = true;
    if (clic && Math.abs(s.cx - s.tx) < 40 && Math.abs(s.cy - (s.ty - 30)) < 45) { s.prise = true; s.won = true; c.sfx.tone(900, 0.2, 'square', 0.1); }
    else if (clic) c.sfx.swat();
  },

  draw(s, g, c) {
    const l = PA.debut(g, this.IM, '#3a2a5a');
    if (!l) return;
    PA.fond(this.IM.fond);
    const cx = s.cx ?? 480, cy = (s.cy ?? 120) - (s.prise ? s.monte * 300 : 0);
    PA.rect(60, 90, 840, 400, 'rgba(20,10,40,0.38)'); // la vitrine de la machine : le jeu se détache du décor
    PA.rect(60, 486, 840, 6, '#1a1222'); PA.rect(54, 86, 6, 406, '#1a1222'); PA.rect(900, 86, 6, 406, '#1a1222');
    PA.rect(60, 90, 840, 10, '#a8abbb'); PA.rect(60, 90, 840, 3, '#e2e4ec'); // rail
    PA.rect(cx - 4, 100, 8, cy - 100, '#1a1222'); PA.rect(cx - 2, 100, 4, cy - 100, '#c9ccd8'); // câble
    // pince en pixels
    const ouv = s.prise ? 6 : 24;
    PA.forme((x) => { x.rect(cx - 33, cy - 21, 66, 24); }, '#ffd166');
    PA.forme((x) => { x.moveTo(cx - 30, cy); x.lineTo(cx - 30 - ouv, cy + 45); x.lineTo(cx - 15 - ouv, cy + 51); x.lineTo(cx - 12, cy + 6); x.closePath(); }, '#ef476f');
    PA.forme((x) => { x.moveTo(cx + 30, cy); x.lineTo(cx + 30 + ouv, cy + 45); x.lineTo(cx + 15 + ouv, cy + 51); x.lineTo(cx + 12, cy + 6); x.closePath(); }, '#ef476f');
    PA.spr(this.IM.peluche, s.prise ? cx : s.tx, s.prise ? cy + 60 : s.ty + 30, { ay: 1 });
    const A = s.A || { x: 480, y: 120 }, B = s.B || { x: 700, y: 120 };
    Duo.mains(c, A, B);
    PA.texte(c.duo.role === 0 ? '← → TOI : GAUCHE / DROITE' : '↑ ↓ TOI : MONTER / DESCENDRE + CLIC', W / 2, 40, 22, '#ffd400');
    PA.fin(g);
  },
});
