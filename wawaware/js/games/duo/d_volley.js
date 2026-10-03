// DUO (curseur) : le panier volant. L'un tient la RAQUETTE en bas et fait rebondir la balle,
// l'autre déplace le CERCEAU pour que la balle passe dedans en retombant. 3 paniers.
Engine.register({
  id: 'd_volley', name: 'Le panier volant', icon: '🏐', instruction: 'MARQUEZ !', input: 'curseur',
  hint: 'L\'UN FAIT REBONDIR, L\'AUTRE PLACE LE CERCEAU', duration: 9, cursor: 'none', duo: true, NEED: 3, PY: 470,
  IM: PA.images('d_volley', ['fond', 'ballon']),

  start(c) { return { t: 0, x: 300 + c.rng() * 360, y: 80, vx: (c.rng() < 0.5 ? -1 : 1) * 120, vy: -260, paniers: 0, rot: 0, flash: 0 }; },
  ghost(s, c) { return Duo.fantome(s, c); },
  bot(s, c) {
    const b = s.bot || (s.bot = { x: 480, y: c.duo.role === 1 ? this.PY : 220 }), dt = Duo.dtRobot(s);
    if (c.duo.role === 1) return Duo.suivre(b, s.x + s.vx * 0.15, this.PY, 900, dt); // le robot tient la raquette
    // le robot place le cerceau sur le chemin de la balle quand elle retombe
    const tps = s.vy < 0 ? -s.vy / 520 + 0.25 : 0.25;
    return Duo.suivre(b, clamp(s.x + s.vx * tps, 80, W - 80), 230, 500, dt);
  },

  update(s, dt, c) {
    s.t += dt; s.flash = Math.max(0, s.flash - dt);
    const [A, B] = Duo.paire(c, { x: 480, y: this.PY }, { x: 480, y: 220 });
    s.A = A; s.B = B;
    s.rx = clamp(A.x, 70, W - 70); s.hx = clamp(B.x, 70, W - 70); s.hy = clamp(B.y, 90, 380);
    if (s.lost || s.won) return;
    const py = s.y;
    s.vy += 520 * dt; s.x += s.vx * dt; s.y += s.vy * dt; s.rot += s.vx * dt * 0.02;
    if (s.x < 30 || s.x > W - 30) { s.vx = -s.vx; s.x = clamp(s.x, 30, W - 30); }
    // la raquette renvoie la balle (l'endroit touché donne la direction)
    if (s.vy > 0 && py <= this.PY - 18 && s.y >= this.PY - 18 && Math.abs(s.x - s.rx) < 70) {
      s.y = this.PY - 18; s.vy = -600; s.vx = clamp((s.x - s.rx) * 5, -260, 260); c.sfx.tone(500, 0.05, 'square', 0.1);
    }
    // panier : la balle traverse le cerceau en descendant
    if (s.vy > 0 && py <= s.hy && s.y >= s.hy && Math.abs(s.x - s.hx) < 46) {
      s.paniers++; s.flash = 0.4; c.sfx.tone(900, 0.12, 'square', 0.1);
      if (s.paniers >= this.NEED) s.won = true;
    }
    if (s.y > H + 20 && !s.won) { s.lost = true; c.sfx.hit(); }
  },

  draw(s, g, c) {
    const l = PA.debut(g, this.IM, '#ffd6a5');
    if (!l) return;
    PA.fond(this.IM.fond);
    const [moiCoul, amiCoul] = Duo.couleurs(c);
    const hx = s.hx ?? 480, hy = s.hy ?? 220;
    // le cerceau (arrière, puis la balle, puis l'avant)
    PA.forme((x) => x.ellipse(hx, hy, 52, 14, 0, Math.PI, Math.PI * 2), '#ef476f', 6);
    PA.ombre(s.x, 500, 20, 5, 0.3);
    PA.spr(this.IM.ballon, s.x, s.y, { rot: s.rot });
    PA.forme((x) => x.ellipse(hx, hy, 52, 14, 0, 0, Math.PI), '#ef476f', 6);
    for (let k = -2; k <= 2; k++) PA.trait(hx + k * 18, hy + 10, hx + k * 10, hy + 46, 'rgba(255,255,255,0.8)'); // le filet
    const rx = s.rx ?? 480, col = c.duo.role === 0 ? moiCoul : amiCoul;
    PA.forme((xx) => xx.roundRect(rx - 70, this.PY - 8, 140, 16, 8), col.length === 7 ? col : '#ffd400');
    PA.texte(`${s.paniers} / ${this.NEED}`, W - 90, 50, 44, s.flash ? '#06d6a0' : '#f8f4ea');
    PA.texte(c.duo.role === 0 ? 'TOI : LA RAQUETTE' : 'TOI : LE CERCEAU', W / 2, 40, 24, '#ffd400');
    Duo.mains(c, s.A || { x: 480, y: this.PY }, s.B || { x: 480, y: 220 });
    PA.fin(g);
  },
});
