// DUO (souris) : le code secret. L'un voit le code et montre les chiffres avec sa souris,
// l'autre ne le voit pas et doit cliquer les touches dans l'ordre.
Engine.register({
  id: 'd_code', name: 'Le code secret', icon: '🔑', instruction: 'OUVREZ LE COFFRE !', input: 'souris',
  hint: 'L\'UN VOIT LE CODE ET LE MONTRE, L\'AUTRE TAPE', duration: 8, cursor: 'none', duo: true, roleSolo: 1,
  IM: PA.images('d_code', ['fond']),

  start(c) { return { t: 0, code: Array.from({ length: 4 }, () => Math.floor(c.rng() * 10)), tape: [], clics: 0 }; },
  touche(d) { const i = d === 0 ? 10 : d - 1; return { x: 380 + (i % 3) * 100, y: 170 + Math.floor(i / 3) * 80 }; },
  ghost(s, c) { return { x: c.input.x, y: c.input.y, f: { n: s.clics, t: s.tape.join('') } }; },
  bot(s, c) { // robot souffleur : se met sur le prochain chiffre
    const b = s.bot || (s.bot = { x: 480, y: 300 });
    const d = s.code[Math.min(s.tape.length, 3)], p = this.touche(d);
    return Duo.suivre(b, p.x + 12, p.y + 10, 600, Duo.dtRobot(s));
  },
  sous(x, y) { for (let d = 0; d < 10; d++) { const p = this.touche(d); if (Math.abs(x - p.x) < 42 && Math.abs(y - p.y) < 34) return d; } return -1; },

  update(s, dt, c) {
    s.t += dt;
    const [A, B] = Duo.paire(c);
    s.A = A; s.B = B;
    if (s.won || s.lost || c.over) return;
    let tape = s.tape;
    if (c.duo.role === 1 && c.input.clicked) { const d = this.sous(c.input.x, c.input.y); if (d >= 0) { s.clics++; tape = [...s.tape, d]; c.sfx.tone(600, 0.04, 'square', 0.08); } }
    if (c.duo.role === 0) { const a = c.duo.ami(); if (a && a.f && typeof a.f.t === 'string' && a.f.t.length > s.tape.length) tape = a.f.t.split('').map(Number); }
    s.tape = tape;
    for (let i = 0; i < s.tape.length; i++) if (s.tape[i] !== s.code[i]) { s.lost = true; c.sfx.hit(); return; }
    if (s.tape.length >= 4) s.won = true;
  },

  draw(s, g, c) {
    const l = PA.debut(g, this.IM, '#212529');
    if (!l) return;
    PA.fond(this.IM.fond);
    PA.rect(330, 110, 300, 400, '#0d0d12'); PA.rect(334, 114, 292, 392, '#3a3b48');
    for (let d = 0; d < 10; d++) { const p = this.touche(d); PA.bouton(p.x, p.y, 84, 64, String(d), '#e9ecef', 34); }
    // écran du code : le souffleur le voit, l'autre voit des étoiles
    PA.rect(200, 30, 560, 60, '#0d1a14');
    const voit = c.duo.role === 0 || s.won || s.lost;
    s.code.forEach((d, i) => PA.texte(i < s.tape.length ? String(s.tape[i]) : voit ? String(d) : '*', W / 2 - 90 + i * 60, 62, 44, i < s.tape.length ? (s.tape[i] === d ? '#06d6a0' : '#ef233c') : voit ? '#ffd400' : '#06d6a0', null));
    PA.texte(c.duo.role === 0 ? 'TOI : MONTRE LES CHIFFRES' : 'TOI : CLIQUE LES CHIFFRES', W / 2, 525, 22, '#ffd400');
    Duo.mains(c, s.A || { x: 300, y: 270 }, s.B || { x: 660, y: 270 });
    PA.fin(g);
  },
});
