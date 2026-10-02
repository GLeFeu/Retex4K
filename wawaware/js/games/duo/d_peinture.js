// DUO (curseur, clic maintenu) : repeindre le mur à deux, chacun sa moitié
Engine.register({
  id: 'd_peinture', name: 'Peintres à deux', icon: '🖌️', instruction: 'REPEIGNEZ !', input: 'curseur',
  hint: 'CHACUN PEINT SA MOITIÉ (CLIC MAINTENU)', duration: 7, cursor: 'none', duo: true,
  GX: 16, GY: 8, X0: 80, Y0: 70, C: 50, NEED: 0.85,
  IM: PA.images('d_peinture', ['fond', 'rouleau']),

  start(c) { return { t: 0, cells: new Array(16 * 8).fill(0), col: ['#ff6b9d', '#4cc9f0', '#80ed99', '#ffd166'][Math.floor(c.rng() * 4)] }; },
  ghost(s, c) { return { x: c.input.x, y: c.input.y, f: { d: c.input.down ? 1 : 0 } }; },
  bot(s, c) { // robot : peint sa moitié en zigzag
    const half = c.duo.role === 0 ? 1 : 0, k = (s.t * 0.9) % 1, ligne = Math.floor(s.t * 0.9 * this.GY) % this.GY;
    const x0 = this.X0 + half * 400, x = x0 + (ligne % 2 ? 1 - ((s.t * 7.2) % 1) : (s.t * 7.2) % 1) * 400;
    void k;
    return { x, y: this.Y0 + ligne * this.C + 25, f: { d: 1 } };
  },
  peindre(s, x, y, half) {
    for (let i = 0; i < s.cells.length; i++) {
      const gx = i % this.GX; if ((gx < this.GX / 2 ? 0 : 1) !== half) continue;
      const cx = this.X0 + gx * this.C + 25, cy = this.Y0 + Math.floor(i / this.GX) * this.C + 25;
      if (Math.abs(cx - x) < 55 && Math.abs(cy - y) < 38) s.cells[i] = 1;
    }
  },

  update(s, dt, c) {
    s.t += dt;
    const [A, B] = Duo.paire(c);
    s.A = A; s.B = B;
    if (s.won || c.over) return;
    if (c.input.down) this.peindre(s, c.input.x, c.input.y, c.duo.role);
    const a = c.duo.ami();
    if (a && a.f && a.f.d) this.peindre(s, a.x, a.y, 1 - c.duo.role);
    if (s.cells.filter(Boolean).length / s.cells.length >= this.NEED) s.won = true;
  },

  draw(s, g, c) {
    const l = PA.debut(g, this.IM, '#6c757d');
    if (!l) return;
    PA.fond(this.IM.fond);
    const X0 = Math.round(this.X0 / 3), Y0 = Math.round(this.Y0 / 3), Wd = Math.round(this.GX * this.C / 3), Hd = Math.round(this.GY * this.C / 3);
    l.fillStyle = '#d6d2cc'; l.fillRect(X0, Y0, Wd, Hd);
    s.cells.forEach((on, i) => { // bords de case calculés sur le mur : la peinture ne déborde jamais
      if (!on) return;
      const gx = i % this.GX, gy = Math.floor(i / this.GX);
      const x0 = X0 + Math.floor(gx * Wd / this.GX), x1 = X0 + Math.floor((gx + 1) * Wd / this.GX);
      const y0 = Y0 + Math.floor(gy * Hd / this.GY), y1 = Y0 + Math.floor((gy + 1) * Hd / this.GY);
      l.fillStyle = s.col; l.fillRect(x0, y0, x1 - x0, y1 - y0);
      l.fillStyle = PA.mix(s.col, '#2e1a47', 0.15); l.fillRect(x0 + (i % 3) * 5, y0, 1, y1 - y0);
    });
    l.fillStyle = '#2e2440'; l.fillRect(X0 + Wd / 2 - 1, Y0, 2, Hd); // séparation des deux moitiés
    l.fillRect(X0 - 2, Y0 - 2, Wd + 4, 2); l.fillRect(X0 - 2, Y0 + Hd, Wd + 4, 2); l.fillRect(X0 - 2, Y0, 2, Hd); l.fillRect(X0 + Wd, Y0, 2, Hd);
    const k = s.cells.filter(Boolean).length / s.cells.length;
    PA.texte(`${Math.floor(k * 100)}% / ${Math.round(this.NEED * 100)}%`, W / 2, 500, 36);
    PA.texte(c.duo.role === 0 ? 'TOI : MOITIÉ GAUCHE' : 'TOI : MOITIÉ DROITE', W / 2, 40, 24, '#ffd400');
    const A = s.A || { x: 280, y: 270 }, B = s.B || { x: 680, y: 270 };
    for (const p of [A, B]) PA.spr(this.IM.rouleau, p.x, p.y, { ax: 0.5, ay: 0.2, alpha: p.moi ? 1 : 0.8 });
    Duo.mains(c, A, B);
    PA.fin(g);
  },
});
