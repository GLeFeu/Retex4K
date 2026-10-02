// DUO (curseur) : deux ponts-levis. Chacun manœuvre le sien (souris en haut / en bas) :
// en bas quand le héros passe, en haut quand un bateau arrive.
Engine.register({
  id: 'd_pont', name: 'Les ponts-levis', icon: '🌉', instruction: 'BAISSEZ, LEVEZ !', input: 'curseur',
  hint: 'EN BAS POUR LE HÉROS, EN HAUT POUR LES BATEAUX', duration: 8, cursor: 'none', duo: true,
  PONTS: [330, 630], SOL: 380,
  IM: PA.images('d_pont', ['fond', 'bateau']),

  start(c) {
    const bateaux = [];
    for (const p of [0, 1]) bateaux.push({ pont: p, t: 1.2 + c.rng() * 1.5 + p * 1.6 });
    return { t: 0, hx: 60, bateaux, tombe: 0 };
  },
  ghost(s, c) { return { x: c.input.x, y: c.input.y }; },
  bot(s, c) { // robot : gère son pont (rôle de l'autre) au bon moment
    const r = 1 - c.duo.role, px = this.PONTS[r];
    const bateau = s.bateaux.find(b => b.pont === r && Math.abs(this.bateauX(s, b) - px) < 140);
    const heros = Math.abs(s.hx - px) < 120;
    return { x: px, y: bateau && !heros ? 150 : this.SOL + 20 };
  },
  bateauX(s, b) { return W + 80 - (s.t - b.t + 1.4) * 260; },
  baisse(p) { return p.y > 300; }, // souris en bas = pont baissé

  update(s, dt, c) {
    s.t += dt;
    const [A, B] = Duo.paire(c, { x: 330, y: 400 }, { x: 630, y: 400 });
    s.P = [this.baisse(A), this.baisse(B)]; s.A = A; s.B = B;
    if (s.lost) { s.tombe += dt; return; }
    if (s.won) return;
    s.hx += 105 * dt;
    for (let i = 0; i < 2; i++) {
      const px = this.PONTS[i];
      if (Math.abs(s.hx - px) < 30 && !s.P[i]) { s.lost = true; s.raison = 'TOMBÉ À L\'EAU !'; c.sfx.splat(); return; }
      for (const b of s.bateaux) if (b.pont === i && Math.abs(this.bateauX(s, b) - px) < 40 && s.P[i]) { s.lost = true; s.raison = 'BATEAU COINCÉ !'; c.sfx.hit(); return; }
    }
    if (s.hx > 900) s.won = true;
  },

  draw(s, g, c) {
    const l = PA.debut(g, { ...this.IM, ...PA.HEROS }, '#7cc8f0');
    if (!l) return;
    PA.fond(this.IM.fond);
    PA.rect(0, this.SOL + 30, W, H, 'rgba(30,100,180,0.55)');
    for (let x = 0; x < W; x += 9) PA.px(x / 3, (this.SOL + 32 + Math.sin(x / 30 + s.t * 3) * 3) / 3, 'rgba(255,255,255,0.6)');
    // berges entre les ponts
    for (const [x0, x1] of [[0, 295], [365, 595], [665, W]]) PA.bois(x0, this.SOL, x1 - x0, 30, ['#3a2410', '#5a3a1c', '#7a5230', '#9c7040']);
    const bateau = PA.reduit(this.IM.bateau, 0.6); // le mât dépasse le tablier : il faut lever le pont
    for (const b of s.bateaux) { const bx = this.bateauX(s, b); if (bx > -100 && bx < W + 100) PA.spr(bateau, bx, this.SOL + 52, { ay: 1, flip: true }); }
    const [moiCoul, amiCoul] = Duo.couleurs(c);
    this.PONTS.forEach((px, i) => {
      const bas = s.P ? s.P[i] : true, col = i === c.duo.role ? moiCoul : amiCoul;
      if (bas) PA.bois(px - 35, this.SOL, 70, 14);
      else PA.forme((x) => { x.save(); x.translate(px - 35, this.SOL); x.rotate(-1.2); x.rect(0, -7, 70, 14); x.restore(); }, '#9c7040');
      PA.texte(i === c.duo.role ? 'TOI' : c.duo.nom, px, this.SOL + 70, 20, col);
    });
    PA.heros(s.hx, this.SOL + 2 + (s.lost && s.raison === 'TOMBÉ À L\'EAU !' ? s.tombe * 300 : 0), { run: s.hx * 0.1 });
    if (s.lost) PA.texte(s.raison, W / 2, 100, 50, '#ef233c');
    PA.texte(c.duo.role === 0 ? 'TOI : PONT DE GAUCHE' : 'TOI : PONT DE DROITE', W / 2, 40, 24, '#ffd400');
    PA.fin(g);
  },
});
