// DUO (curseur) : volley à deux. Chacun a sa raquette dans sa moitié, il ne faut pas laisser tomber la balle.
Engine.register({
  id: 'd_volley', name: 'Le volley', icon: '🏐', instruction: 'PAS PAR TERRE !', input: 'curseur',
  hint: 'CHACUN SA MOITIÉ, FAITES 6 PASSES', duration: 8, cursor: 'none', duo: true, NEED: 6, PY: 460,
  IM: PA.images('d_volley', ['fond', 'ballon']),

  start(c) { return { t: 0, x: 300 + c.rng() * 360, y: 80, vx: (c.rng() < 0.5 ? -1 : 1) * 150, vy: -260, passes: 0, rot: 0 }; },
  ghost(s, c) { return { x: c.input.x, y: c.input.y }; },
  bot(s, c) { // robot : suit la balle quand elle est dans sa moitié
    const b = s.bot || (s.bot = { x: 720, y: this.PY });
    const sienne = c.duo.role === 0 ? s.x > W / 2 : s.x < W / 2;
    return Duo.suivre(b, sienne ? s.x : (c.duo.role === 0 ? 720 : 240), this.PY, 900, Duo.dtRobot(s));
  },

  update(s, dt, c) {
    s.t += dt;
    const [A, B] = Duo.paire(c, { x: 240, y: this.PY }, { x: 720, y: this.PY });
    s.ax = clamp(A.x, 60, W / 2 - 50); s.bx = clamp(B.x, W / 2 + 50, W - 60); // chacun reste dans sa moitié
    if (s.lost) return;
    const py = s.y;
    s.vy += 520 * dt; s.x += s.vx * dt; s.y += s.vy * dt; s.rot += s.vx * dt * 0.02;
    if (s.x < 30 || s.x > W - 30) s.vx = -s.vx;
    if (Math.abs(s.x - W / 2) < 12 && s.y > 330) s.vx = -s.vx; // le filet
    for (const rx of [s.ax, s.bx]) {
      if (s.vy > 0 && py <= this.PY - 18 && s.y >= this.PY - 18 && Math.abs(s.x - rx) < 70) {
        s.y = this.PY - 18; s.vy = -580;
        s.vx = (rx < W / 2 ? 1 : -1) * (170 + Math.abs(s.x - rx) * 2.2); // renvoyée vers l'autre moitié
        s.passes++; c.sfx.tone(500, 0.05, 'square', 0.1);
        if (s.passes >= this.NEED) s.won = true;
      }
    }
    if (s.y > H + 20 && !s.won) { s.lost = true; c.sfx.hit(); }
  },

  draw(s, g, c) {
    const l = PA.debut(g, this.IM, '#ffd6a5');
    if (!l) return;
    PA.fond(this.IM.fond);
    PA.rect(W / 2 - 4, 326, 8, 164, '#1a1222'); PA.rect(W / 2 - 2, 326, 4, 164, '#8a5a3a'); // poteau du filet
    for (let y = 336; y < 420; y += 9) PA.rect(W / 2 - 12, y, 24, 3, 'rgba(26,18,34,0.55)');
    for (let x = -12; x <= 12; x += 9) PA.rect(W / 2 + x, 330, 3, 90, 'rgba(26,18,34,0.55)');
    PA.rect(W / 2 - 15, 324, 30, 8, '#f8f4ea');
    const [moiCoul, amiCoul] = Duo.couleurs(c);
    [[s.ax ?? 240, 0], [s.bx ?? 720, 1]].forEach(([x, role]) => {
      const col = role === c.duo.role ? moiCoul : amiCoul;
      PA.forme((xx) => xx.roundRect(x - 70, this.PY - 8, 140, 16, 8), col.length === 7 ? col : '#ffd400');
    });
    PA.ombre(s.x, 500, 20, 5, 0.3);
    PA.spr(this.IM.ballon, s.x, s.y, { rot: s.rot });
    PA.texte(`${s.passes} / ${this.NEED}`, W / 2, 50, 44);
    PA.texte(c.duo.role === 0 ? 'TOI : À GAUCHE' : 'TOI : À DROITE', W / 2, 95, 22, '#ffd400');
    PA.fin(g);
  },
});
