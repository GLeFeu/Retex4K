// DUO (souris) : le déménagement. Le COSTAUD soulève le piano en cliquant très vite,
// le MALIN glisse le chariot dessous (souris) et clique pour le caler quand le piano est assez haut.
Engine.register({
  id: 'd_soulever', name: 'Le déménagement', icon: '🎹', instruction: 'SOULEVEZ, GLISSEZ !', input: 'souris',
  hint: 'L\'UN SOULÈVE (CLICS RAPIDES), L\'AUTRE GLISSE LE CHARIOT', duration: 8, cursor: 'none', duo: true, HAUT: 0.6,
  IM: PA.images('d_soulever', ['fond', 'piano']),

  start(c) { return { t: 0, h: 0, force: 0, rate: 0, chx: 150 }; },
  ghost(s, c) { return Duo.fantome(s, c); },
  bot(s, c) {
    const b = s.bot || (s.bot = { x: 150, y: 470, n: 0, tc: 0 }), dt = Duo.dtRobot(s);
    if (c.duo.role === 1) { if (s.t - b.tc > 0.11) { b.n++; b.tc = s.t; } return { x: 480, y: 300, f: { n: b.n } }; } // le robot soulève
    Duo.suivre(b, 480, 470, 300, dt); // le robot glisse le chariot et le cale au bon moment
    if (s.h > this.HAUT + 0.05 && Math.abs(b.x - 480) < 20 && s.t - b.tc > 0.4) { b.n++; b.tc = s.t; }
    return { x: b.x, y: b.y, f: { n: b.n } };
  },

  update(s, dt, c) {
    s.t += dt; s.rate = Math.max(0, s.rate - dt);
    const [A, B] = Duo.paire(c, { x: 480, y: 300 }, { x: 150, y: 470 });
    s.A = A; s.B = B; s.chx = clamp(B.x, 90, 870);
    if (s.won) return;
    const coups = c.over ? 0 : Duo.clicDe(s, c, 0, null);
    s.force = Math.max(0, s.force - dt * 1.6) + coups * 0.22;
    s.h = clamp(s.h + (Math.min(1.4, s.force) * 0.9 - 0.45) * dt, 0, 1);
    if (!c.over && Duo.clicDe(s, c, 1)) {
      if (s.h >= this.HAUT && Math.abs(s.chx - 480) < 50) { s.won = true; c.sfx.tone(800, 0.2, 'square', 0.1); }
      else { s.rate = 0.5; c.sfx.hit(); }
    }
  },

  draw(s, g, c) {
    const l = PA.debut(g, { ...this.IM, ...PA.HEROS }, '#ffd6a5');
    if (!l) return;
    PA.fond(this.IM.fond);
    const [moiCoul, amiCoul] = Duo.couleurs(c), costaud = c.duo.role === 0 ? moiCoul : amiCoul;
    const y = s.won ? 422 : 446 - s.h * 160;
    // le chariot
    const cx = s.won ? 480 : s.chx ?? 150;
    PA.rect(cx - 90, 432, 180, 14, '#7a5230'); PA.disque(cx - 66, 452, 10, '#1a1222'); PA.disque(cx + 66, 452, 10, '#1a1222');
    PA.ombre(480, 446, 120, 10, 0.3);
    PA.spr(this.IM.piano, 480, y, { ay: 1, rot: s.won ? 0 : Math.sin(s.t * 20) * s.force * 0.01 });
    PA.heros(330, 446, { rot: -0.2 - s.force * 0.1, shirt: costaud.length === 7 ? costaud : '#ffd400' });
    // la jauge de hauteur avec le repère « assez haut »
    PA.rect(60, 80, 30, 320, '#1a1222'); PA.rect(63, 83, 24, 314, '#f2eee8');
    if (s.h > 0.01) PA.rect(64, 396 - 312 * s.h, 22, 312 * s.h, s.h >= this.HAUT ? '#06d6a0' : '#ffb703');
    PA.rect(54, 396 - 312 * this.HAUT, 42, 4, '#ef233c');
    if (s.rate) PA.texte(s.h < this.HAUT ? 'PAS ASSEZ HAUT !' : 'PAS EN DESSOUS !', W / 2, 160, 36, '#ef233c');
    if (s.won) PA.texte('CALÉ !', W / 2, 120, 70, '#fff');
    PA.texte(c.duo.role === 0 ? 'TOI : CLIQUE VITE POUR SOULEVER' : 'TOI : GLISSE LE CHARIOT, CLIQUE', W / 2, 40, 24, '#ffd400');
    Duo.mains(c, s.A || { x: 480, y: 300 }, s.B || { x: 150, y: 470 });
    PA.fin(g);
  },
});
