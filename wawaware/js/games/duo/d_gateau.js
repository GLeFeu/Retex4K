// DUO (curseur) : porter le gâteau sur une planche tenue à deux jusqu'à la table
Engine.register({
  id: 'd_gateau', name: 'Le gâteau à deux', icon: '🎂', instruction: 'PORTEZ-LE !', input: 'curseur',
  hint: 'CHACUN TIENT UN BOUT DE LA PLANCHE', duration: 7, cursor: 'none', duo: true,
  TABLE: { x: 770, y: 330, w: 160 },
  IM: PA.images('d_gateau', ['fond', 'gateau', 'table']),

  start(c) { return { t: 0, u: 0, v: 0, hold: 0, fell: false, cx: 0, cy: 0 }; },

  ghost(s, c) { return { x: c.input.x, y: c.input.y }; },
  bot(s, c) { // le robot tient l'autre bout, 230 px à droite, au même niveau (avec un peu de retard)
    const b = s.bot || (s.bot = { x: 420, y: 300 });
    return Duo.suivre(b, c.input.x + 230, c.input.y + Math.sin(s.t * 2) * 8, 700, Duo.dtRobot(s));
  },

  update(s, dt, c) {
    s.t += dt;
    const [A, B] = Duo.paire(c, { x: 200, y: 300 }, { x: 430, y: 300 });
    s.A = A; s.B = B;
    if (s.fell || s.won) { if (s.fell) s.cy += 600 * dt; return; }
    const a = Math.atan2(B.y - A.y, B.x - A.x), len = Math.hypot(B.x - A.x, B.y - A.y);
    // le gâteau glisse le long de la planche si elle penche
    const grace = s.t < 1; // la première seconde : le temps de placer les deux souris
    if (!grace) { s.v += Math.sin(a) * 900 * dt; s.v *= 0.96; s.u += s.v * dt / Math.max(60, len); }
    s.cx = A.x + (B.x - A.x) * (0.5 + s.u); s.cy = A.y + (B.y - A.y) * (0.5 + s.u) - 18;
    if (!grace && (Math.abs(s.u) > 0.5 || len < 70 || len > 520)) { s.fell = true; s.lost = true; c.sfx.hit(); return; }
    const T = this.TABLE;
    const surTable = s.cx > T.x - T.w / 2 && s.cx < T.x + T.w / 2 && Math.abs(s.cy + 18 - T.y) < 40 && Math.abs(a) < 0.3;
    s.hold = surTable ? s.hold + dt : 0;
    if (s.hold > 0.4) { s.won = true; c.sfx.tone(800, 0.15, 'square', 0.1); }
  },

  draw(s, g, c) {
    const l = PA.debut(g, this.IM, '#f6d6c3');
    if (!l) return;
    PA.fond(this.IM.fond);
    const T = this.TABLE;
    PA.spr(this.IM.table, T.x, T.y - 2, { ay: 0.12 });
    const A = s.A || { x: 200, y: 300 }, B = s.B || { x: 430, y: 300 };
    if (!s.won) {
      PA.forme((x) => { x.moveTo(A.x, A.y); x.lineTo(B.x, B.y); }, '#4d2a1c', 16);
      PA.forme((x) => { x.moveTo(A.x, A.y); x.lineTo(B.x, B.y); }, '#c08a4a', 10);
    }
    PA.spr(this.IM.gateau, s.won ? T.x : s.cx, (s.won ? T.y - 18 : s.cy) + 18, { ay: 1, rot: s.fell ? s.t * 4 : Math.atan2(B.y - A.y, B.x - A.x) });
    if (s.fell) PA.texte('PATATRAS !', W / 2, 120, 60, '#ef233c');
    Duo.mains(c, A, B);
    PA.fin(g);
  },
});
