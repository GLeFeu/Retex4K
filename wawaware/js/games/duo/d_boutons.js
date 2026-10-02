// DUO (souris) : chacun a son gros bouton, il faut appuyer EN MÊME TEMPS (3 fois)
Engine.register({
  id: 'd_boutons', name: 'En même temps', icon: '🔴', instruction: 'ENSEMBLE !', input: 'souris',
  hint: 'CLIQUEZ VOS BOUTONS AU MÊME MOMENT', duration: 7, cursor: 'none', duo: true, NEED: 3, FENETRE: 0.35,
  IM: PA.images('d_boutons', ['fond', 'bouton']),

  start(c) { return { t: 0, clics: 0, moiT: -9, amiT: -9, ok: 0, flash: 0, rate: 0 }; },
  ghost(s, c) { return { x: c.input.x, y: c.input.y, f: { n: s.clics } }; },
  bot(s, c) { // robot : appuie en rythme, toutes les 1,2 s
    const b = s.bot || (s.bot = { x: 700, y: 330, n: 0, prochain: 1 });
    if (s.t >= b.prochain) { b.n++; b.prochain += 1.2; }
    return { x: 700, y: 330 + (s.t - b.prochain + 1.2 < 0.15 ? 10 : 0), f: { n: b.n } };
  },
  btnX(role) { return role === 0 ? 280 : 680; },

  update(s, dt, c) {
    s.t += dt;
    s.flash = Math.max(0, s.flash - dt); s.rate = Math.max(0, s.rate - dt);
    const [A, B] = Duo.paire(c, { x: 280, y: 330 }, { x: 680, y: 330 });
    s.A = A; s.B = B;
    if (s.won || c.over) return;
    const mx = this.btnX(c.duo.role);
    if (c.input.clicked && Math.abs(c.input.x - mx) < 110 && Math.abs(c.input.y - 330) < 100) { s.clics++; s.moiT = s.t; c.sfx.tone(300, 0.05, 'square', 0.08); }
    if (Duo.nouveauxClics(s, c)) s.amiT = s.t - (c.duo.robot ? 0 : Net.DELAY / 1000);
    if (s.moiT > -9 && s.amiT > -9) {
      if (Math.abs(s.moiT - s.amiT) <= this.FENETRE) { s.ok++; s.flash = 0.4; s.moiT = s.amiT = -9; c.sfx.tone(800, 0.1, 'square', 0.1); if (s.ok >= this.NEED) s.won = true; }
      else if (s.t - Math.min(s.moiT, s.amiT) > this.FENETRE + 0.15) { s.rate = 0.4; if (s.moiT < s.amiT) s.moiT = -9; else s.amiT = -9; }
    }
  },

  draw(s, g, c) {
    const l = PA.debut(g, this.IM, '#1a1a2e');
    if (!l) return;
    PA.fond(this.IM.fond);
    const [moiCoul, amiCoul] = Duo.couleurs(c);
    for (const role of [0, 1]) {
      const x = this.btnX(role), moi = role === c.duo.role, appui = moi ? s.t - s.moiT < 0.15 : s.t - s.amiT < 0.15;
      PA.spr(this.IM.bouton, x, 430, { ay: 1, sy: appui ? 0.85 : 1 });
      PA.texte(moi ? 'TOI' : c.duo.nom, x, 470, 26, moi ? moiCoul : amiCoul);
    }
    for (let i = 0; i < this.NEED; i++) { PA.disque(W / 2 - 40 + i * 40, 70, 14, '#1a1222'); PA.disque(W / 2 - 40 + i * 40, 70, 11, i < s.ok ? '#06d6a0' : '#5a5d6e'); }
    if (s.flash > 0) PA.texte('PILE ENSEMBLE !', W / 2, 150, 44, '#06d6a0');
    if (s.rate > 0) PA.texte('PAS EN MÊME TEMPS…', W / 2, 150, 36, '#ef233c');
    Duo.mains(c, s.A || { x: 280, y: 330 }, s.B || { x: 680, y: 330 });
    PA.fin(g);
  },
});
