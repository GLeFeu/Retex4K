// DUO (curseur) : le gâteau sur le plateau. Le PORTEUR déplace le plateau jusqu'à la table,
// l'ÉQUILIBRISTE règle l'inclinaison (souris à gauche / à droite) pour que le gâteau ne glisse pas.
Engine.register({
  id: 'd_gateau', name: 'Le gâteau à deux', icon: '🎂', instruction: 'LIVREZ LE GÂTEAU !', input: 'curseur',
  hint: 'L\'UN PORTE LE PLATEAU, L\'AUTRE LE GARDE DROIT', duration: 8, cursor: 'none', duo: true,
  TABLE: { x: 770, y: 330, w: 160 }, LONG: 220,
  IM: PA.images('d_gateau', ['fond', 'gateau', 'table']),

  start(c) { return { t: 0, u: 0, v: 0, hold: 0, fell: false, cx: 0, cy: 0, ph: c.rng() * 6 }; },
  // le plateau penche tout seul (secousses du porteur) : ne dépend que du temps, pareil chez les deux
  secousse(s) { return Math.sin(s.t * 1.7 + s.ph) * 0.35 + Math.sin(s.t * 3.9 + s.ph * 2) * 0.15; },
  inclinaison(s, B) { return clamp((B.x - W / 2) / (W / 2), -1, 1) * 0.7; },

  ghost(s, c) { return Duo.fantome(s, c); },
  bot(s, c) {
    const b = s.bot || (s.bot = { x: 480, y: 300 }), dt = Duo.dtRobot(s);
    if (c.duo.role === 1) return Duo.suivre(b, this.TABLE.x, this.TABLE.y - 20, 160, dt); // le robot porte
    // le robot équilibre : compense la secousse et le glissement
    const cible = W / 2 - (this.secousse(s) + s.v * 0.002 + s.u * 0.6) / 0.7 * (W / 2);
    return Duo.suivre(b, cible, 470, 1400, dt);
  },

  update(s, dt, c) {
    s.t += dt;
    const [A, B] = Duo.paire(c, { x: 220, y: 300 }, { x: 480, y: 470 });
    s.A = A; s.B = B;
    s.px = clamp(A.x, 140, 820); s.py = clamp(A.y, 140, 470);
    s.a = this.secousse(s) + this.inclinaison(s, B);
    if (s.fell || s.won) { if (s.fell) s.cy += 600 * dt; return; }
    const grace = s.t < 1; // la première seconde : le temps de se placer
    if (!grace) { s.v += Math.sin(s.a) * 900 * dt; s.v *= 0.96; s.u += s.v * dt / this.LONG; }
    s.cx = s.px + Math.cos(s.a) * s.u * this.LONG; s.cy = s.py + Math.sin(s.a) * s.u * this.LONG - 18;
    if (!grace && Math.abs(s.u) > 0.5) { s.fell = true; s.lost = true; c.sfx.hit(); return; }
    const T = this.TABLE;
    const surTable = Math.abs(s.cx - T.x) < T.w / 2 && Math.abs(s.cy + 18 - T.y) < 40 && Math.abs(s.a) < 0.3;
    s.hold = surTable ? s.hold + dt : 0;
    if (s.hold > 0.4) { s.won = true; c.sfx.tone(800, 0.15, 'square', 0.1); }
  },

  draw(s, g, c) {
    const l = PA.debut(g, this.IM, '#f6d6c3');
    if (!l) return;
    PA.fond(this.IM.fond);
    const T = this.TABLE;
    PA.spr(this.IM.table, T.x, T.y - 2, { ay: 0.12 });
    const px = s.px ?? 220, py = s.py ?? 300, a = s.a || 0, L = this.LONG / 2;
    if (!s.won) {
      const dx = Math.cos(a) * L, dy = Math.sin(a) * L;
      PA.forme((x) => { x.moveTo(px - dx, py - dy); x.lineTo(px + dx, py + dy); }, '#1a1222', 14);
      PA.forme((x) => { x.moveTo(px - dx, py - dy); x.lineTo(px + dx, py + dy); }, '#c9ccd8', 9); // le plateau
    }
    PA.spr(this.IM.gateau, s.won ? T.x : s.cx, (s.won ? T.y - 18 : s.cy) + 18, { ay: 1, rot: s.fell ? s.t * 4 : a });
    // la jauge de l'équilibriste
    PA.rect(W / 2 - 200, 500, 400, 10, '#1a1222'); PA.rect(W / 2 - 2, 494, 4, 22, '#06d6a0');
    const B = s.B || { x: W / 2 }, k = clamp((B.x - W / 2) / (W / 2), -1, 1);
    PA.rect(W / 2 + k * 196 - 6, 492, 12, 26, '#ffd400');
    if (s.fell) PA.texte('PATATRAS !', W / 2, 120, 60, '#ef233c');
    PA.texte(c.duo.role === 0 ? 'TOI : PORTE LE PLATEAU' : 'TOI : GARDE-LE DROIT (← →)', W / 2, 40, 24, '#ffd400');
    Duo.mains(c, s.A || { x: 220, y: 300 }, s.B || { x: 480, y: 470 });
    PA.fin(g);
  },
});
