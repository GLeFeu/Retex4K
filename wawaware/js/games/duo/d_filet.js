// DUO (curseur + clic) : les œufs du poulailler. L'un tient le PANIER et rattrape les bons œufs,
// l'autre CLIQUE sur les œufs pourris (verts) pour les éclater avant qu'ils tombent dans le panier.
Engine.register({
  id: 'd_filet', name: 'Les œufs pourris', icon: '🥚', instruction: 'TRIEZ LES ŒUFS !', input: 'curseur',
  hint: 'L\'UN RATTRAPE LES BONS ŒUFS, L\'AUTRE ÉCLATE LES POURRIS', duration: 8, cursor: 'none', duo: true, NEED: 5, PY: 470,
  IM: PA.images('d_filet', ['fond', 'poule']),

  start(c) {
    const eggs = [];
    for (let i = 0; i < 11; i++) {
      const pourri = i % 3 === 1; // un œuf sur trois est pourri
      eggs.push({ x: 150 + Math.floor(c.rng() * 4) * 220, t: 0.6 + i * 0.6, y: 170, vy: 0, etat: 0, pourri });
    }
    return { t: 0, eggs, got: 0, broken: 0 };
  },
  ghost(s, c) { return Duo.fantome(s, c); },
  bot(s, c) {
    const b = s.bot || (s.bot = { x: 480, y: c.duo.role === 0 ? 300 : this.PY, n: 0, tc: 0 }), dt = Duo.dtRobot(s);
    const tombent = s.eggs.filter(e => e.etat === 0 && s.t >= e.t);
    if (c.duo.role === 1) { // le robot tient le panier : sous le bon œuf le plus bas
      const bon = tombent.filter(e => !e.pourri).sort((p, q) => q.y - p.y)[0];
      return Duo.suivre(b, bon ? bon.x : 480, this.PY, 700, dt);
    }
    // le robot éclate les pourris : il vise le plus bas et clique quand il est dessus
    const p = tombent.filter(e => e.pourri).sort((u, v) => v.y - u.y)[0];
    if (p) { Duo.suivre(b, p.x, p.y, 900, dt); if (Math.hypot(b.x - p.x, b.y - p.y) < 20 && s.t - b.tc > 0.25) { b.n++; b.tc = s.t; } }
    return { x: b.x, y: b.y, f: { n: b.n } };
  },

  update(s, dt, c) {
    s.t += dt;
    const [A, B] = Duo.paire(c, { x: 480, y: this.PY }, { x: 480, y: 300 });
    s.A = A; s.B = B; s.bx = clamp(A.x, 80, W - 80);
    if (s.won || s.lost) return;
    const clic = !c.over && Duo.clicDe(s, c, 1);
    if (clic) c.sfx.swat();
    for (const e of s.eggs) {
      if (e.etat !== 0 || s.t < e.t) continue;
      if (clic && e.pourri && Math.hypot(B.x - e.x, B.y - e.y) < 36) { e.etat = 3; c.sfx.splat(); continue; } // éclaté en l'air
      const py = e.y;
      e.vy += (e.pourri ? 260 : 420) * dt; e.y += e.vy * dt;
      if (py <= this.PY - 20 && e.y >= this.PY - 20 && Math.abs(e.x - s.bx) < 70) { // dans le panier
        if (e.pourri) { e.etat = 4; s.lost = true; s.raison = 'POUAH, UN ŒUF POURRI !'; c.sfx.hit(); return; }
        e.etat = 1; s.got++; c.sfx.tone(700, 0.06, 'square', 0.1);
        if (s.got >= this.NEED) s.won = true;
        continue;
      }
      if (e.y > 510) { e.etat = 2; if (!e.pourri) { s.broken++; c.sfx.hit(); if (s.broken >= 2) { s.lost = true; s.raison = 'DEUX ŒUFS CASSÉS !'; } } }
    }
  },

  draw(s, g, c) {
    const l = PA.debut(g, this.IM, '#ffe8d6');
    if (!l) return;
    PA.fond(this.IM.fond);
    for (let i = 0; i < 4; i++) PA.spr(this.IM.poule, 150 + i * 220, 166, { ay: 1 });
    PA.bois(0, 164, W, 12);
    for (const e of s.eggs) {
      if (e.etat === 1 || s.t < e.t) continue;
      const coq = e.pourri ? '#8ab34a' : '#f6efd9';
      if (e.etat === 3) { for (let i = 0; i < 6; i++) PA.disque(e.x + Math.cos(i) * 20, e.y + Math.sin(i) * 20, 4, '#6a8a2a'); continue; }
      if (e.etat === 2) { PA.forme((x) => x.ellipse(e.x, 512, 30, 7, 0, 0, Math.PI * 2), coq); PA.disque(e.x, 510, 8, e.pourri ? '#4a6a1a' : '#ffb703'); continue; }
      PA.forme((x) => x.ellipse(e.x, e.y, 14, 18, 0, 0, Math.PI * 2), coq);
      if (e.pourri) { PA.px((e.x - 4) / 3, (e.y - 5) / 3, '#4a6a1a'); PA.px((e.x + 5) / 3, (e.y + 3) / 3, '#4a6a1a'); PA.texte('~', e.x, e.y - 34, 22, '#8ab34a'); }
    }
    // le panier
    const bx = s.bx ?? 480, y = this.PY;
    PA.forme((x) => { x.moveTo(bx - 72, y - 22); x.lineTo(bx + 72, y - 22); x.lineTo(bx + 56, y + 26); x.lineTo(bx - 56, y + 26); x.closePath(); }, '#b07a3a');
    for (let k = -1; k <= 1; k++) PA.rect(bx - 62, y - 8 + k * 12, 124, 3, '#7a5228');
    PA.texte(`${s.got} / ${this.NEED}`, W - 90, 215, 40);
    if (s.broken) PA.texte('✕'.repeat(s.broken), 90, 215, 40, '#ef233c');
    if (s.lost) PA.texte(s.raison, W / 2, 300, 40, '#ef233c');
    PA.texte(c.duo.role === 0 ? 'TOI : LE PANIER (BONS ŒUFS)' : 'TOI : CLIQUE LES ŒUFS POURRIS', W / 2, 40, 24, '#ffd400');
    Duo.mains(c, s.A || { x: 480, y: this.PY }, s.B || { x: 480, y: 300 });
    PA.fin(g);
  },
});
