// DUO (curseur, clic) : peindre le mur selon le modèle. L'un tient le ROULEAU (clic maintenu),
// l'autre choisit la COULEUR dans les pots ; chaque bande du mur doit avoir la couleur de son étiquette.
Engine.register({
  id: 'd_peinture', name: 'Peintres à deux', icon: '🖌️', instruction: 'SUIVEZ LE MODÈLE !', input: 'curseur',
  hint: 'L\'UN PEINT, L\'AUTRE CHOISIT LA COULEUR', duration: 9, cursor: 'none', duo: true,
  GX: 16, GY: 7, X0: 80, Y0: 80, C: 50, NEED: 0.75, POTY: 475,
  COULEURS: ['#ff6b9d', '#4cc9f0', '#80ed99', '#ffd166'],
  IM: PA.images('d_peinture', ['fond', 'rouleau']),

  start(c) { return { t: 0, cells: new Array(this.GX * this.GY).fill(-1), modele: shuffle([0, 1, 2, 3], c.rng), pot: 0 }; },
  potX(i) { return 300 + i * 120; },
  bande(i) { return Math.floor((i % this.GX) / (this.GX / 4)); },
  ghost(s, c) { return Duo.fantome(s, c); },
  bot(s, c) {
    const b = s.bot || (s.bot = { x: 300, y: 300, n: 0, tc: 0 }), dt = Duo.dtRobot(s);
    if (c.duo.role === 1) { // le robot peint, bande par bande, celle qui correspond au pot choisi
      const bd = s.modele.indexOf(s.pot), x0 = this.X0 + bd * 200, k = (s.t * 1.6) % 1, ligne = Math.floor(s.t * 1.6) % this.GY;
      return { x: x0 + 30 + (ligne % 2 ? 1 - k : k) * 140, y: this.Y0 + ligne * this.C + 25, f: { d: true } };
    }
    // le robot choisit le pot de la bande où peint son ami
    const bd = clamp(Math.floor((c.input.x - this.X0) / 200), 0, 3), voulu = s.modele[bd];
    Duo.suivre(b, this.potX(voulu), this.POTY, 900, dt);
    if (s.pot !== voulu && Math.abs(b.x - this.potX(voulu)) < 10 && s.t - b.tc > 0.3) { b.n++; b.tc = s.t; }
    return { x: b.x, y: b.y, f: { n: b.n } };
  },

  update(s, dt, c) {
    s.t += dt;
    const [A, B] = Duo.paire(c, { x: 300, y: 300 }, { x: 480, y: this.POTY });
    s.A = A; s.B = B;
    if (s.won || c.over) return;
    if (Duo.clicDe(s, c, 1)) { // le choix d'un pot
      for (let i = 0; i < 4; i++) if (Math.abs(B.x - this.potX(i)) < 50 && Math.abs(B.y - this.POTY) < 50) { s.pot = i; c.sfx.tone(400 + i * 100, 0.05, 'square', 0.08); }
    }
    if (Duo.tenuDe(c, 0)) {
      for (let i = 0; i < s.cells.length; i++) {
        const cx = this.X0 + (i % this.GX) * this.C + 25, cy = this.Y0 + Math.floor(i / this.GX) * this.C + 25;
        if (Math.abs(cx - A.x) < 55 && Math.abs(cy - A.y) < 38) s.cells[i] = s.pot;
      }
    }
    const bons = s.cells.filter((v, i) => v === s.modele[this.bande(i)]).length;
    s.k = bons / s.cells.length;
    if (s.k >= this.NEED) s.won = true;
  },

  draw(s, g, c) {
    const l = PA.debut(g, this.IM, '#6c757d');
    if (!l) return;
    PA.fond(this.IM.fond);
    const X0 = Math.round(this.X0 / 3), Y0 = Math.round(this.Y0 / 3), Wd = Math.round(this.GX * this.C / 3), Hd = Math.round(this.GY * this.C / 3);
    l.fillStyle = '#d6d2cc'; l.fillRect(X0, Y0, Wd, Hd);
    s.cells.forEach((v, i) => { // bords de case calculés sur le mur : la peinture ne déborde jamais
      if (v < 0) return;
      const gx = i % this.GX, gy = Math.floor(i / this.GX), col = this.COULEURS[v];
      const x0 = X0 + Math.floor(gx * Wd / this.GX), x1 = X0 + Math.floor((gx + 1) * Wd / this.GX);
      const y0 = Y0 + Math.floor(gy * Hd / this.GY), y1 = Y0 + Math.floor((gy + 1) * Hd / this.GY);
      l.fillStyle = col; l.fillRect(x0, y0, x1 - x0, y1 - y0);
      l.fillStyle = PA.mix(col, '#2e1a47', 0.15); l.fillRect(x0 + (i % 3) * 5, y0, 1, y1 - y0);
    });
    l.fillStyle = '#2e2440';
    for (let b = 1; b < 4; b++) l.fillRect(X0 + Math.floor(b * Wd / 4), Y0, 1, Hd); // séparation des bandes
    l.fillRect(X0 - 2, Y0 - 2, Wd + 4, 2); l.fillRect(X0 - 2, Y0 + Hd, Wd + 4, 2); l.fillRect(X0 - 2, Y0, 2, Hd); l.fillRect(X0 + Wd, Y0, 2, Hd);
    // le modèle : une étiquette de couleur au-dessus de chaque bande
    for (let b = 0; b < 4; b++) { PA.rect(this.X0 + b * 200 + 70, this.Y0 - 26, 60, 18, '#1a1222'); PA.rect(this.X0 + b * 200 + 73, this.Y0 - 23, 54, 12, this.COULEURS[s.modele[b]]); }
    // les pots de peinture
    for (let i = 0; i < 4; i++) {
      const x = this.potX(i), y = this.POTY;
      if (s.pot === i) PA.rect(x - 34, y - 34, 68, 68, '#ffd400');
      PA.rect(x - 26, y - 20, 52, 44, '#8a8d9c'); PA.rect(x - 26, y - 26, 52, 12, this.COULEURS[i]);
    }
    PA.texte(`${Math.floor((s.k || 0) * 100)}% / ${Math.round(this.NEED * 100)}%`, W - 90, 475, 28);
    PA.texte(c.duo.role === 0 ? 'TOI : LE ROULEAU (CLIC MAINTENU)' : 'TOI : CLIQUE LA BONNE COULEUR', W / 2, 30, 22, '#ffd400');
    const A = s.A || { x: 300, y: 300 }, B = s.B || { x: 480, y: this.POTY };
    PA.spr(this.IM.rouleau, A.x, A.y, { ax: 0.5, ay: 0.2 });
    PA.rect(A.x - 14, A.y - 4, 28, 8, this.COULEURS[s.pot]); // le rouleau prend la couleur du pot
    Duo.mains(c, A, B);
    PA.fin(g);
  },
});
