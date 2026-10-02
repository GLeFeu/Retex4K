// DUO (curseur) : un filet tendu entre les deux souris pour rattraper les œufs
Engine.register({
  id: 'd_filet', name: 'Le filet', icon: '🥚', instruction: 'RATTRAPEZ !', input: 'curseur',
  hint: 'LE FILET VA DE TA SOURIS À CELLE DE TON AMI', duration: 7, cursor: 'none', duo: true, NEED: 5,
  IM: PA.images('d_filet', ['fond', 'poule']),

  start(c) {
    const eggs = [];
    for (let i = 0; i < 9; i++) eggs.push({ x: 120 + c.rng() * 720, t: 0.4 + i * 0.62 + c.rng() * 0.2, y: 160, vy: 0, etat: 0 });
    return { t: 0, eggs, got: 0, broken: 0 };
  },
  ghost(s, c) { return { x: c.input.x, y: c.input.y }; },
  bot(s, c) { // le robot se met à côté du prochain œuf
    const b = s.bot || (s.bot = { x: 700, y: 420 });
    const next = s.eggs.find(e => e.etat === 0 && s.t > e.t - 0.6);
    const cx = next ? next.x + (c.input.x < next.x ? 70 : -70) : 700;
    return Duo.suivre(b, cx, 420, 650, Duo.dtRobot(s));
  },

  update(s, dt, c) {
    s.t += dt;
    const [A, B] = Duo.paire(c, { x: 300, y: 420 }, { x: 600, y: 420 });
    s.A = A; s.B = B;
    for (const e of s.eggs) {
      if (e.etat !== 0 || s.t < e.t) continue;
      const py = e.y;
      e.vy += 500 * dt; e.y += e.vy * dt;
      // a-t-il traversé le filet ?
      const lo = Math.min(A.x, B.x), hi = Math.max(A.x, B.x);
      if (e.x > lo && e.x < hi && !s.won && !s.lost) {
        const k = (e.x - A.x) / ((B.x - A.x) || 1), ny = A.y + (B.y - A.y) * k;
        if (py <= ny && e.y >= ny) { e.etat = 1; s.got++; c.sfx.tone(700, 0.06, 'square', 0.1); if (s.got >= this.NEED) s.won = true; continue; }
      }
      if (e.y > 500) { e.etat = 2; s.broken++; c.sfx.splat(); if (s.broken >= 2 && !s.won) s.lost = true; }
    }
  },

  draw(s, g, c) {
    const l = PA.debut(g, this.IM, '#ffe8d6');
    if (!l) return;
    PA.fond(this.IM.fond);
    for (let i = 0; i < 4; i++) PA.spr(this.IM.poule, 150 + i * 220, 166, { ay: 1 });
    PA.bois(0, 164, W, 12);
    const A = s.A || { x: 300, y: 420 }, B = s.B || { x: 600, y: 420 };
    // filet : maille en pixels entre les deux mains
    const n = Math.max(2, Math.round(Math.hypot(B.x - A.x, B.y - A.y) / 24));
    for (let i = 0; i <= n; i++) { const k = i / n, x = A.x + (B.x - A.x) * k, y = A.y + (B.y - A.y) * k + Math.sin(k * Math.PI) * 18; PA.disque(x, y, 3, '#f2eee8'); if (i < n) PA.trait(x, y, A.x + (B.x - A.x) * (i + 1) / n, A.y + (B.y - A.y) * (i + 1) / n + Math.sin((i + 1) / n * Math.PI) * 18, '#d8d2c4'); }
    for (const e of s.eggs) {
      if (e.etat === 1 || s.t < e.t) continue;
      if (e.etat === 2) { PA.forme((x) => x.ellipse(e.x, 505, 34, 8, 0, 0, Math.PI * 2), '#f6efd9'); PA.disque(e.x, 503, 9, '#ffb703'); continue; }
      PA.forme((x) => x.ellipse(e.x, e.y, 14, 18, 0, 0, Math.PI * 2), '#f6efd9');
    }
    PA.texte(`${s.got} / ${this.NEED}`, W - 90, 215, 40);
    if (s.broken) PA.texte('✕'.repeat(s.broken), 90, 215, 40, '#ef233c');
    Duo.mains(c, A, B);
    PA.fin(g);
  },
});
