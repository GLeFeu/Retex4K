// DUO (souris) : le démarrage de la machine. L'un TIENT LA CLÉ (clic maintenu) : l'aiguille du compteur
// ne bouge que tant qu'il la tient ; l'autre appuie sur START quand l'aiguille est dans la zone verte. 3 fois.
Engine.register({
  id: 'd_boutons', name: 'Le démarrage', icon: '🔴', instruction: 'DÉMARREZ !', input: 'souris',
  hint: 'L\'UN TIENT LA CLÉ, L\'AUTRE APPUIE DANS LE VERT', duration: 8, cursor: 'none', duo: true, NEED: 3,
  IM: PA.images('d_boutons', ['fond', 'bouton']),

  start(c) { return { t: 0, aig: 0, tenu: 0, ok: 0, flash: 0, rate: 0, zone: 0.55 + c.rng() * 0.3 }; },
  ghost(s, c) { return Duo.fantome(s, c); },
  bot(s, c) {
    if (c.duo.role === 1) return { x: 280, y: 330, f: { d: true } }; // le robot tient la clé
    const b = s.bot || (s.bot = { n: 0, tc: 0 }); // le robot appuie quand l'aiguille est dans le vert
    if (Math.abs(s.aig - s.zone) < 0.05 && s.t - b.tc > 0.5) { b.n++; b.tc = s.t; }
    return { x: 680, y: 330, f: { n: b.n } };
  },

  update(s, dt, c) {
    s.t += dt;
    s.flash = Math.max(0, s.flash - dt); s.rate = Math.max(0, s.rate - dt);
    if (s.won || c.over) return;
    s.cle = Duo.tenuDe(c, 0);
    if (s.cle) { s.tenu += dt; s.aig = 0.5 - 0.5 * Math.cos(s.tenu * 2.6); } // l'aiguille balance de 0 à 1
    else { s.tenu = 0; s.aig = Math.max(0, s.aig - dt * 2); }
    if (Duo.clicDe(s, c, 1)) {
      if (Math.abs(s.aig - s.zone) < 0.09) {
        s.ok++; s.flash = 0.4; c.sfx.tone(500 + s.ok * 150, 0.12, 'square', 0.1);
        s.zone = 0.25 + ((s.ok * 0.37 + s.zone) % 0.6); // la zone change de place
        if (s.ok >= this.NEED) s.won = true;
      } else { s.rate = 0.4; c.sfx.hit(); }
    }
  },

  draw(s, g, c) {
    const l = PA.debut(g, this.IM, '#2a2440');
    if (!l) return;
    PA.fond(this.IM.fond);
    // le compteur
    const cx = W / 2, cy = 250, R = 130;
    PA.forme((x) => { x.arc(cx, cy, R, Math.PI, 0); x.closePath(); }, '#f8f4ea');
    const a0 = Math.PI + (s.zone - 0.09) * Math.PI, a1 = Math.PI + (s.zone + 0.09) * Math.PI;
    PA.forme((x) => { x.moveTo(cx, cy); x.arc(cx, cy, R - 8, a0, a1); x.closePath(); }, '#06d6a0');
    const aa = Math.PI + (s.aig || 0) * Math.PI;
    PA.forme((x) => { x.moveTo(cx, cy); x.lineTo(cx + Math.cos(aa) * (R - 14), cy + Math.sin(aa) * (R - 14)); }, '#1a1222', 12);
    PA.forme((x) => { x.moveTo(cx, cy); x.lineTo(cx + Math.cos(aa) * (R - 14), cy + Math.sin(aa) * (R - 14)); }, '#ef233c', 6);
    PA.rect(cx - R, cy, 2 * R, 6, '#1a1222'); // le bas du cadran
    PA.disque(cx, cy, 10, '#1a1222');
    // la clé (rôle 0) et le bouton START (rôle 1)
    PA.rect(230, 320, 100, 70, '#5a5d6c'); PA.rect(240, 330, 80, 50, '#3a3b48');
    PA.forme((x) => { x.save(); x.translate(280, 355); x.rotate(s.cle ? 1.2 : 0); x.rect(-8, -34, 16, 40); x.restore(); }, '#ffd166');
    PA.texte('CLÉ', 280, 420, 22, '#f8f4ea');
    PA.spr(this.IM.bouton, 680, 345 + (s.flash > 0.3 ? 6 : 0));
    PA.texte('START', 680, 420, 22, '#f8f4ea');
    for (let i = 0; i < this.NEED; i++) PA.disque(W / 2 - 40 + i * 40, 60, 14, i < s.ok ? '#06d6a0' : '#3a3b48');
    if (s.rate) PA.texte('PAS DANS LE VERT !', W / 2, 470, 34, '#ef233c');
    PA.texte(c.duo.role === 0 ? 'TOI : TIENS LA CLÉ (CLIC MAINTENU)' : 'TOI : CLIQUE QUAND C\'EST VERT', W / 2, 510, 24, '#ffd400');
    PA.fin(g, { lumiere: s.flash > 0 });
  },
});
