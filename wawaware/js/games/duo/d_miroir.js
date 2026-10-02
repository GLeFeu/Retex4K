// DUO (curseur) : le miroir. L'un garde sa main sur l'étoile qui bouge (à gauche), l'autre doit
// faire EXACTEMENT le même geste en miroir (à droite).
Engine.register({
  id: 'd_miroir', name: 'Le miroir', icon: '🪞', instruction: 'EN MIROIR !', input: 'curseur',
  hint: 'L\'UN SUIT L\'ÉTOILE, L\'AUTRE L\'IMITE EN MIROIR', duration: 7, cursor: 'none', duo: true, NEED: 2.5,
  IM: PA.images('d_miroir', ['fond']),

  start(c) { return { t: 0, ok: 0, p1: c.rng() * 6, p2: c.rng() * 6 }; },
  etoile(s) { return { x: 240 + Math.sin(s.t * 1.1 + s.p1) * 150, y: 270 + Math.sin(s.t * 1.6 + s.p2) * 160 }; },
  ghost(s, c) { return { x: c.input.x, y: c.input.y }; },
  bot(s, c) {
    const b = s.bot || (s.bot = { x: 700, y: 270 });
    const cible = c.duo.role === 0 ? { x: W - c.input.x, y: c.input.y } : this.etoile(s);
    return Duo.suivre(b, cible.x, cible.y, 420, Duo.dtRobot(s));
  },

  update(s, dt, c) {
    s.t += dt;
    const [A, B] = Duo.paire(c, { x: 240, y: 270 }, { x: 720, y: 270 });
    s.A = A; s.B = B;
    if (s.won || c.over) return;
    const e = this.etoile(s);
    s.surEtoile = Math.hypot(A.x - e.x, A.y - e.y) < 60;
    s.enMiroir = Math.hypot(B.x - (W - A.x), B.y - A.y) < 70;
    if (s.surEtoile && s.enMiroir) s.ok += dt;
    if (s.ok >= this.NEED) { s.won = true; c.sfx.tone(900, 0.15, 'square', 0.1); }
  },

  draw(s, g, c) {
    const l = PA.debut(g, this.IM, '#e0d4f0');
    if (!l) return;
    PA.fond(this.IM.fond);
    PA.rect(W / 2 - 3, 0, 6, H, 'rgba(255,255,255,0.8)'); // la ligne du miroir
    const e = this.etoile(s), A = s.A || { x: 240, y: 270 }, B = s.B || { x: 720, y: 270 };
    PA.forme((x) => { for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? 14 : 32; x.lineTo(e.x + Math.cos(a) * r, e.y + Math.sin(a) * r); } x.closePath(); }, '#ffd400');
    PA.cercle(W - A.x, A.y, 70, s.enMiroir ? '#06d6a0' : 'rgba(255,255,255,0.7)', 1); // là où l'autre doit être
    const k = clamp(s.ok / this.NEED, 0, 1);
    PA.rect(W / 2 - 180, 500, 360, 22, '#1a1222'); if (k > 0.01) PA.rect(W / 2 - 177, 503, 354 * k, 16, '#06d6a0');
    PA.texte(c.duo.role === 0 ? 'TOI : SUIS L\'ÉTOILE' : 'TOI : FAIS PAREIL EN MIROIR', W / 2, 40, 22, '#ffd400');
    Duo.mains(c, A, B);
    PA.fin(g);
  },
});
