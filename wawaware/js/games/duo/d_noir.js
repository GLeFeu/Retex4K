// DUO (curseur) : dans le noir. L'un guide le héros à la souris mais ne voit presque rien ;
// l'autre voit tout le chemin et lui montre la route avec sa lanterne.
Engine.register({
  id: 'd_noir', name: 'Dans le noir', icon: '🕯️', instruction: 'GUIDEZ-LE !', input: 'curseur',
  hint: 'L\'UN VOIT LE CHEMIN, L\'AUTRE MARCHE DESSUS', duration: 8, cursor: 'none', duo: true, roleSolo: 1, LARG: 70,
  IM: PA.images('d_noir', ['fond']),

  start(c) {
    const pts = [];
    for (let i = 0; i < 6; i++) pts.push({ x: 90 + i * 156, y: i === 0 ? 270 : 110 + c.rng() * 320 });
    return { t: 0, pts, parti: false, prog: 0 };
  },
  ghost(s, c) { return { x: c.input.x, y: c.input.y }; },
  dist(s, x, y) { let d = Infinity; for (let i = 0; i < s.pts.length - 1; i++) { const a = s.pts[i], b = s.pts[i + 1]; d = Math.min(d, Duo.distSeg(x, y, a.x, a.y, b.x, b.y)); } return d; },
  bot(s, c) { // robot guide : avance sur le chemin un peu devant le héros
    const b = s.bot || (s.bot = { x: 90, y: 270 });
    let k = 0, best = Infinity;
    for (let i = 0; i < 60; i++) { const p = this.surChemin(s, i / 59), d = Math.hypot(p.x - c.input.x, p.y - c.input.y); if (d < best) { best = d; k = i / 59; } }
    const p = this.surChemin(s, Math.min(1, k + 0.12));
    return Duo.suivre(b, p.x, p.y, 420, Duo.dtRobot(s));
  },
  surChemin(s, k) { const n = s.pts.length - 1, i = Math.min(n - 1, Math.floor(k * n)), q = k * n - i, a = s.pts[i], b = s.pts[i + 1]; return { x: a.x + (b.x - a.x) * q, y: a.y + (b.y - a.y) * q }; },

  update(s, dt, c) {
    s.t += dt;
    const [A, B] = Duo.paire(c, { x: 200, y: 270 }, { x: 90, y: 270 });
    s.A = A; s.B = B; // A = le guide (lanterne), B = le héros
    if (s.won || s.lost) return;
    const z = s.pts[s.pts.length - 1], a0 = s.pts[0];
    if (!s.parti) { if (Math.hypot(B.x - a0.x, B.y - a0.y) < this.LARG / 2) s.parti = true; return; }
    if (this.dist(s, B.x, B.y) > this.LARG / 2) { s.lost = true; c.sfx.hit(); return; }
    if (Math.hypot(B.x - z.x, B.y - z.y) < this.LARG / 2) s.won = true;
  },

  draw(s, g, c) {
    const l = PA.debut(g, { ...this.IM, ...PA.HEROS }, '#0a0a14');
    if (!l) return;
    PA.fond(this.IM.fond);
    const chemin = (x) => s.pts.forEach((p, i) => (i ? x.lineTo(p.x, p.y) : x.moveTo(p.x, p.y)));
    PA.forme(chemin, '#c9a46a', this.LARG);
    const z = s.pts[s.pts.length - 1];
    PA.rect(z.x - 2, z.y - 40, 4, 44, '#1a1222'); PA.forme((x) => { x.moveTo(z.x + 2, z.y - 40); x.lineTo(z.x + 32, z.y - 30); x.lineTo(z.x + 2, z.y - 20); x.closePath(); }, '#ef233c');
    const A = s.A || { x: 200, y: 270 }, B = s.B || { x: 90, y: 270 };
    PA.heros(B.x, B.y + 20, { k: 0.7 });
    // le marcheur ne voit que le halo du héros et la lanterne du guide
    if (c.duo.role === 1 && !s.won && !s.lost) {
      const trous = [[B.x, B.y, 66], [A.x, A.y, 36]];
      const nuit = this.nuit || (this.nuit = document.createElement('canvas'));
      nuit.width = PA.LW; nuit.height = PA.LH;
      const nx = nuit.getContext('2d'), im = nx.createImageData(PA.LW, PA.LH), d = im.data;
      for (let y = 0; y < PA.LH; y++) for (let x = 0; x < PA.LW; x++) {
        let lum = 0;
        for (const [hx, hy, r] of trous) lum = Math.max(lum, 1 - Math.hypot(x - hx / 3, y - hy / 3) / (r / 3));
        if (lum <= 0 || (lum < 0.35 && ((x + y) & 1))) { const k = (y * PA.LW + x) * 4; d[k] = 4; d[k + 1] = 4; d[k + 2] = 10; d[k + 3] = 247; }
      }
      nx.putImageData(im, 0, 0);
      l.drawImage(nuit, 0, 0);
    }
    PA.disque(A.x, A.y, 10, '#ffd166'); PA.disque(A.x, A.y, 5, '#fff8d0'); // la lanterne
    if (!s.parti) PA.texte('DÉPART', s.pts[0].x, s.pts[0].y - 50, 22, '#06d6a0');
    PA.texte(c.duo.role === 0 ? 'TOI : MONTRE LE CHEMIN' : 'TOI : SUIS LA LANTERNE', W / 2, 30, 24, '#ffd400');
    if (s.lost) PA.texte('PERDU DANS LE NOIR !', W / 2, 270, 50, '#ef233c');
    PA.fin(g, { lumiere: false });
  },
});
