// DUO (souris) : les ponts-levis. Le MARCHEUR fait avancer le héros (clic maintenu = il marche),
// le PONTONNIER lève ou baisse les ponts en cliquant dessus : levés pour les bateaux, baissés pour le héros.
Engine.register({
  id: 'd_pont', name: 'Les ponts-levis', icon: '🌉', instruction: 'TRAVERSEZ !', input: 'souris',
  hint: 'L\'UN FAIT MARCHER LE HÉROS, L\'AUTRE MANŒUVRE LES PONTS', duration: 10, cursor: 'none', duo: true,
  PONTS: [330, 630], SOL: 380,
  IM: PA.images('d_pont', ['fond', 'bateau']),

  start(c) {
    const bateaux = [];
    for (const p of [0, 1]) bateaux.push({ pont: p, t: 1.4 + c.rng() * 1.2 + p * 1.8 });
    return { t: 0, hx: 60, bateaux, tombe: 0, P: [false, false], marche: false };
  },
  bateauX(s, b) { return W + 80 - (s.t - b.t + 1.4) * 230; },
  ghost(s, c) { return Duo.fantome(s, c); },
  bot(s, c) {
    const b = s.bot || (s.bot = { x: 480, y: 300, n: 0, tc: 0 }), dt = Duo.dtRobot(s);
    if (c.duo.role === 1) { // le robot marcheur : avance, sauf si le prochain pont est levé
      const devant = this.PONTS.findIndex(px => px > s.hx - 20);
      const stop = devant >= 0 && !s.P[devant] && this.PONTS[devant] - s.hx < 70;
      return { x: 100, y: 450, f: { d: !stop } };
    }
    // le robot pontonnier : lève un pont quand un bateau approche et que le héros n'est pas dessus
    for (let i = 0; i < 2; i++) {
      const px = this.PONTS[i], bateau = s.bateaux.some(o => o.pont === i && Math.abs(this.bateauX(s, o) - px) < 160);
      const voulu = !(bateau && Math.abs(s.hx - px) > 60);
      if (s.P[i] !== voulu) {
        Duo.suivre(b, px, this.SOL, 900, dt);
        if (Math.abs(b.x - px) < 10 && s.t - b.tc > 0.3) { b.n++; b.tc = s.t; }
        return { x: b.x, y: b.y, f: { n: b.n } };
      }
    }
    return { x: b.x, y: b.y, f: { n: b.n } };
  },

  update(s, dt, c) {
    s.t += dt;
    const [A, B] = Duo.paire(c, { x: 100, y: 450 }, { x: 480, y: 300 });
    s.A = A; s.B = B;
    if (s.lost) { s.tombe += dt; return; }
    if (s.won) return;
    if (!c.over && Duo.clicDe(s, c, 1)) { // le pontonnier clique sur un pont : il bascule
      for (let i = 0; i < 2; i++) if (Math.abs(B.x - this.PONTS[i]) < 70) { s.P[i] = !s.P[i]; c.sfx.tone(260, 0.08, 'square', 0.08); }
    }
    s.marche = !c.over && Duo.tenuDe(c, 0);
    if (s.marche) s.hx += 120 * dt;
    for (let i = 0; i < 2; i++) {
      const px = this.PONTS[i];
      if (Math.abs(s.hx - px) < 30 && !s.P[i]) { s.lost = true; s.raison = 'TOMBÉ À L\'EAU !'; c.sfx.splat(); return; }
      for (const b of s.bateaux) if (b.pont === i && Math.abs(this.bateauX(s, b) - px) < 40 && s.P[i]) { s.lost = true; s.raison = 'BATEAU COINCÉ !'; c.sfx.hit(); return; }
    }
    if (s.hx > 900) s.won = true;
  },

  // P[i] = true : pont baissé (on peut passer)
  draw(s, g, c) {
    const l = PA.debut(g, { ...this.IM, ...PA.HEROS }, '#7cc8f0');
    if (!l) return;
    PA.fond(this.IM.fond);
    PA.rect(0, this.SOL + 30, W, H, 'rgba(30,100,180,0.55)');
    for (let x = 0; x < W; x += 9) PA.px(x / 3, (this.SOL + 32 + Math.sin(x / 30 + s.t * 3) * 3) / 3, 'rgba(255,255,255,0.6)');
    for (const [x0, x1] of [[0, 295], [365, 595], [665, W]]) PA.bois(x0, this.SOL, x1 - x0, 30, ['#3a2410', '#5a3a1c', '#7a5230', '#9c7040']);
    const bateau = PA.reduit(this.IM.bateau, 0.6); // le mât dépasse le tablier : il faut lever le pont
    for (const b of s.bateaux) { const bx = this.bateauX(s, b); if (bx > -100 && bx < W + 100) PA.spr(bateau, bx, this.SOL + 52, { ay: 1, flip: true }); }
    this.PONTS.forEach((px, i) => {
      if (s.P[i]) PA.bois(px - 35, this.SOL, 70, 14);
      else PA.forme((x) => { x.save(); x.translate(px - 35, this.SOL); x.rotate(-1.2); x.rect(0, -7, 70, 14); x.restore(); }, '#9c7040');
    });
    PA.heros(s.hx, this.SOL + 2 + (s.lost && s.raison === 'TOMBÉ À L\'EAU !' ? s.tombe * 300 : 0), { run: s.marche ? s.hx * 0.1 : null });
    if (s.lost) PA.texte(s.raison, W / 2, 100, 50, '#ef233c');
    PA.texte(c.duo.role === 0 ? 'TOI : CLIC MAINTENU = IL MARCHE' : 'TOI : CLIQUE SUR LES PONTS', W / 2, 40, 24, '#ffd400');
    Duo.mains(c, s.A || { x: 100, y: 450 }, s.B || { x: 480, y: 300 });
    PA.fin(g);
  },
});
