// DUO (clavier) : soulever le piano à deux en martelant ESPACE (il faut que les deux tapent)
Engine.register({
  id: 'd_soulever', name: 'Le piano à soulever', icon: '🎹', instruction: 'SOULEVEZ !', input: 'clavier',
  hint: 'MARTELEZ ESPACE TOUS LES DEUX', duration: 6, duo: true,
  IM: PA.images('d_soulever', ['fond', 'piano']),

  start(c) { return { t: 0, n: 0, h: 0, moi: 0, ami: 0 }; },
  ghost(s, c) { return { x: 0, y: 0, f: { n: s.n } }; },
  bot(s, c) { const b = s.bot || (s.bot = { n: 0 }); b.n = Math.floor(s.t * 6.5); return { x: 0, y: 0, f: { n: b.n } }; },

  update(s, dt, c) {
    s.t += dt;
    s.moi = Math.max(0, s.moi - dt * 2); s.ami = Math.max(0, s.ami - dt * 2);
    if (!s.won && !c.over && c.input.wasPressed('Space')) { s.n++; s.moi = Math.min(1, s.moi + 0.25); }
    const k = Duo.nouveauxClics(s, c);
    if (k) s.ami = Math.min(1, s.ami + 0.25 * k);
    if (s.won) return;
    // il ne monte que si LES DEUX tapent : c'est le plus lent qui compte
    s.h = clamp(s.h + (Math.min(s.moi, s.ami) * 0.9 - 0.12) * dt, 0, 1);
    if (s.h >= 1) { s.won = true; c.sfx.tone(800, 0.2, 'square', 0.1); }
  },

  draw(s, g, c) {
    const l = PA.debut(g, { ...this.IM, ...PA.HEROS }, '#ffd6a5');
    if (!l) return;
    PA.fond(this.IM.fond);
    const y = 440 - s.h * 200, [moiCoul, amiCoul] = Duo.couleurs(c);
    PA.ombre(480, 446, 120, 10, 0.3);
    PA.spr(this.IM.piano, 480, y, { ay: 1, rot: (s.moi - s.ami) * 0.08 });
    PA.heros(330, 446, { rot: -0.2 + s.moi * 0.1, shirt: moiCoul.length === 7 ? moiCoul : '#ffd400' });
    PA.heros(630, 446, { face: -1, rot: 0.2 - s.ami * 0.1, shirt: amiCoul });
    for (const [x, v, col] of [[330, s.moi, moiCoul], [630, s.ami, amiCoul]]) { PA.rect(x - 40, 480, 80, 12, '#1a1222'); if (v > 0.02) PA.rect(x - 38, 482, 76 * v, 8, col.length === 7 ? col : '#ffd400'); }
    PA.rect(60, 80, 30, 320, '#1a1222'); PA.rect(63, 83, 24, 314, '#f2eee8'); if (s.h > 0.01) PA.rect(64, 396 - 312 * s.h, 22, 312 * s.h, '#06d6a0');
    if (s.won) PA.texte('HOP !', W / 2, 120, 70, '#fff');
    PA.fin(g);
  },
});
