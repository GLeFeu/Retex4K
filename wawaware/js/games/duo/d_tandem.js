// DUO (clavier) : le tandem n'avance que si les deux pédalent CHACUN SON TOUR (ESPACE)
Engine.register({
  id: 'd_tandem', name: 'Le tandem', icon: '🚲', instruction: 'PÉDALEZ !', input: 'clavier',
  hint: 'ESPACE CHACUN SON TOUR (TOI, LUI, TOI…)', duration: 7, duo: true, NEED: 22,
  IM: PA.images('d_tandem', ['fond', 'tandem']),

  start(c) { return { t: 0, n: 0, dist: 0, dernier: -1, vit: 0, faux: 0 }; },
  ghost(s, c) { return { x: 0, y: 0, f: { n: s.n } }; },
  bot(s, c) { // robot : appuie juste après toi
    const b = s.bot || (s.bot = { n: 0, at: -1 });
    if (s.dernier === c.duo.role && b.at < 0) b.at = s.t + 0.12;
    if (b.at > 0 && s.t >= b.at) { b.n++; b.at = -1; }
    return { x: 0, y: 0, f: { n: b.n } };
  },
  coup(s, c, qui) { // qui = rôle qui vient d'appuyer
    if (s.dernier !== qui) { s.dist++; s.vit = Math.min(1, s.vit + 0.25); c.sfx.tone(qui ? 520 : 440, 0.04, 'square', 0.08); }
    else s.faux = 0.3; // deux fois de suite le même : ça ne compte pas
    s.dernier = qui;
    if (s.dist >= this.NEED) s.won = true;
  },

  update(s, dt, c) {
    s.t += dt;
    s.vit = Math.max(0, s.vit - dt * 0.8); s.faux = Math.max(0, s.faux - dt);
    if (s.won || c.over) return;
    if (c.input.wasPressed('Space')) { s.n++; this.coup(s, c, c.duo.role); }
    if (Duo.nouveauxClics(s, c)) this.coup(s, c, 1 - c.duo.role);
  },

  draw(s, g, c) {
    const l = PA.debut(g, this.IM, '#bde0fe');
    if (!l) return;
    PA.fond(this.IM.fond);
    // la route vue de côté (le décor reste fixe, seuls les traits défilent)
    PA.rect(0, 432, W, 108, '#4a4458'); PA.rect(0, 432, W, 6, '#8a8296'); PA.rect(0, 528, W, 12, '#3a8a3a');
    const off = (s.dist * 24) % 120;
    for (let x = -off; x < W; x += 120) PA.rect(x, 486, 60, 6, '#f8f4ea');
    const x = 140 + (s.dist / this.NEED) * 640;
    PA.ombre(x, 476, 90, 8, 0.3);
    PA.spr(this.IM.tandem, x, 474, { ay: 1, rot: Math.sin(s.t * 20) * 0.02 * s.vit });
    PA.rect(880, 316, 6, 160, '#f8f4ea'); for (let y = 316; y < 476; y += 20) PA.rect(886, y, 14, 10, (y / 20) % 2 ? '#1a1222' : '#f8f4ea');
    const [moiCoul, amiCoul] = Duo.couleurs(c), aQui = s.dernier === c.duo.role ? 'LUI' : 'TOI';
    PA.texte(`À ${aQui} !`, W / 2, 80, 50, aQui === 'TOI' ? moiCoul : amiCoul);
    if (s.faux > 0) PA.texte('CHACUN SON TOUR !', W / 2, 140, 30, '#ef233c');
    PA.fin(g);
  },
});
