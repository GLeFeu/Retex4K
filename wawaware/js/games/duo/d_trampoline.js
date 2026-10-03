// DUO (curseur) : le trampoline. L'un DÉPLACE le trampoline pour que le héros retombe dessus,
// l'autre DIRIGE le héros en l'air (sa souris l'attire) pour attraper les étoiles.
Engine.register({
  id: 'd_trampoline', name: 'Le trampoline', icon: '🤸', instruction: 'LES ÉTOILES !', input: 'curseur',
  hint: 'L\'UN BOUGE LE TRAMPOLINE, L\'AUTRE GUIDE LE HÉROS', duration: 9, cursor: 'none', duo: true, NEED: 3, TY: 450,
  IM: PA.images('d_trampoline', ['fond']),

  start(c) {
    const etoiles = [];
    for (let i = 0; i < this.NEED; i++) etoiles.push({ x: 160 + c.rng() * 640, y: 150 + c.rng() * 110, pris: false });
    return { t: 0, x: 480, y: 60, vx: 0, vy: -300, rot: 0, etoiles, pris: 0 };
  },
  ghost(s, c) { return Duo.fantome(s, c); },
  bot(s, c) {
    const b = s.bot || (s.bot = { x: 480, y: c.duo.role === 1 ? this.TY : 200 }), dt = Duo.dtRobot(s);
    if (c.duo.role === 1) { // le robot porte le trampoline : sous le point où le héros va retomber
      const tps = s.vy > 0 ? Math.max(0, (this.TY - s.y) / Math.max(1, s.vy)) : 0.6;
      return Duo.suivre(b, s.x + s.vx * tps, this.TY, 650, dt);
    }
    const e = s.etoiles.find(o => !o.pris); // le robot guide le héros vers l'étoile suivante
    return Duo.suivre(b, e ? e.x : 480, e ? e.y : 200, 600, dt);
  },

  update(s, dt, c) {
    s.t += dt;
    const [A, B] = Duo.paire(c, { x: 480, y: this.TY }, { x: 480, y: 200 });
    s.A = A; s.B = B; s.tx = clamp(A.x, 90, W - 90);
    if (s.lost) { s.rot += dt * 6; s.y += 400 * dt; return; }
    if (s.won) return;
    const py = s.y;
    s.vx += clamp((B.x - s.x) * 3, -900, 900) * dt; s.vx = clamp(s.vx * 0.98, -300, 300); // le héros est attiré par la souris du guide
    s.vy += 700 * dt; s.x = clamp(s.x + s.vx * dt, 40, W - 40); s.y += s.vy * dt;
    if (s.vy > 0 && py <= this.TY && s.y >= this.TY && Math.abs(s.x - s.tx) < 85) { s.y = this.TY; s.vy = -680; c.sfx.jump(); }
    for (const e of s.etoiles) if (!e.pris && Math.hypot(e.x - s.x, e.y - (s.y - 40)) < 50) { e.pris = true; s.pris++; c.sfx.tone(900, 0.08, 'square', 0.1); }
    if (s.pris >= this.NEED) s.won = true;
    if (s.y > 540 && !s.won) { s.lost = true; c.sfx.hit(); }
  },

  draw(s, g, c) {
    const l = PA.debut(g, { ...this.IM, ...PA.HEROS }, '#bde0fe');
    if (!l) return;
    PA.fond(this.IM.fond);
    for (const e of s.etoiles) if (!e.pris) PA.texte('★', e.x, e.y + Math.sin(s.t * 4 + e.x) * 4, 48, '#ffd400');
    const tx = s.tx ?? 480, y = this.TY;
    PA.rect(tx - 80, y + 4, 8, 40, '#3a3b48'); PA.rect(tx + 72, y + 4, 8, 40, '#3a3b48'); // pieds
    PA.forme((x) => x.ellipse(tx, y + 4, 86, 12, 0, 0, Math.PI * 2), '#3a86ff');
    PA.forme((x) => x.ellipse(tx, y + 2, 70, 7, 0, 0, Math.PI * 2), '#1a1222');
    PA.heros(s.x, s.y + 4, { rot: s.lost ? s.rot : clamp(s.vx / 600, -0.4, 0.4), face: s.vx >= 0 ? 1 : -1 });
    PA.texte(`${s.pris} / ${this.NEED}`, W - 90, 50, 44);
    PA.texte(c.duo.role === 0 ? 'TOI : BOUGE LE TRAMPOLINE' : 'TOI : GUIDE LE HÉROS VERS LES ★', W / 2, 40, 24, '#ffd400');
    Duo.mains(c, s.A || { x: 480, y: this.TY }, s.B || { x: 480, y: 200 });
    PA.fin(g);
  },
});
