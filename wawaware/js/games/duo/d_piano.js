// DUO (clavier) : le pianiste et le pédalier. Le PIANISTE joue les notes (D F J K),
// le PÉDALIER tient ESPACE pendant toute la durée des notes longues (la colonne PÉDALE), et le lâche après.
Engine.register({
  id: 'd_piano', name: 'Piano et pédale', icon: '🎹', instruction: 'JOUEZ ENSEMBLE !', input: 'clavier',
  hint: 'L\'UN JOUE D F J K, L\'AUTRE TIENT LA PÉDALE (ESPACE)', duration: 8, duo: true, HIT: 430, MAX_RATE: 3, SP: 300,
  LANES: [{ code: 'KeyD', key: 'D' }, { code: 'KeyF', key: 'F' }, { code: 'KeyJ', key: 'J' }, { code: 'KeyK', key: 'K' }],
  IM: PA.images('d_piano', ['fond']),

  start(c) {
    const notes = [], longues = [];
    for (let i = 0; i < 12; i++) notes.push({ lane: Math.floor(c.rng() * 4), y: -60 - i * 130, hit: false, miss: false });
    for (let i = 0; i < 3; i++) longues.push({ y: -200 - i * 520, h: 160 + c.rng() * 120, rate: 0, faute: false }); // y = le bas de la barre
    return { t: 0, notes, longues, m: 0, flash: [0, 0, 0, 0], pedale: false, horsT: 0 };
  },
  laneX(i) { return 230 + i * 110; },
  PX: 760,
  ghost(s, c) { return { x: 0, y: 0, f: { m: s.m, d: c.input.keys.has('Space') } }; },
  bot(s, c) {
    const b = s.bot || (s.bot = { m: 0 });
    if (c.duo.role === 1) return { x: 0, y: 0, f: { m: 0 } }; // le robot pianiste ne rate rien
    const sous = s.longues.some(o => o.y >= this.HIT - 10 && o.y - o.h <= this.HIT + 10); // le robot pédalier
    return { x: 0, y: 0, f: { m: b.m, d: sous } };
  },

  update(s, dt, c) {
    s.t += dt;
    for (let i = 0; i < 4; i++) s.flash[i] = Math.max(0, s.flash[i] - dt);
    for (const n of s.notes) n.y += this.SP * dt;
    for (const o of s.longues) o.y += this.SP * dt;
    s.pedale = Duo.tenuDe(c, 1, 'Space');
    if (s.won || s.lost) return;
    if (c.duo.role === 0) { // je suis le pianiste : je juge mes notes
      this.LANES.forEach((ln, i) => {
        if (!c.input.wasPressed(ln.code)) return;
        s.flash[i] = 0.12;
        const n = s.notes.find(o => o.lane === i && !o.hit && !o.miss && Math.abs(o.y - this.HIT) < 45);
        if (n) { n.hit = true; c.sfx.tone(300 + i * 90, 0.08, 'triangle', 0.1); } else { s.m++; c.sfx.hit(); }
      });
      for (const n of s.notes) if (!n.hit && !n.miss && n.y > this.HIT + 50) { n.miss = true; s.m++; }
    } else { // je suis le pédalier : je juge la pédale
      const sous = s.longues.find(o => o.y >= this.HIT && o.y - o.h <= this.HIT);
      if (sous && !s.pedale) { sous.rate += dt; if (sous.rate > 0.25 && !sous.faute) { sous.faute = true; s.m++; c.sfx.hit(); } }
      if (!sous && s.pedale) { s.horsT += dt; if (s.horsT > 0.35) { s.horsT = 0; s.m++; c.sfx.hit(); } } else s.horsT = 0;
    }
    // les notes jouées par l'autre : on les fait disparaître en passant (son score arrive par le réseau)
    if (c.duo.role === 1) for (const n of s.notes) if (!n.hit && n.y > this.HIT) n.hit = true;
    const a = c.duo.ami(), am = a && a.f ? a.f.m || 0 : 0;
    if (s.m + am >= this.MAX_RATE) { s.lost = true; return; }
    if (s.notes.every(n => n.y > this.HIT + 60) && s.longues.every(o => o.y - o.h > this.HIT + 20)) s.won = true;
  },

  draw(s, g, c) {
    const l = PA.debut(g, this.IM, '#10002b');
    if (!l) return;
    PA.fond(this.IM.fond);
    const [moiCoul, amiCoul] = Duo.couleurs(c), pianiste = c.duo.role === 0 ? moiCoul : amiCoul, pedalier = c.duo.role === 1 ? moiCoul : amiCoul;
    const cols = ['#ef233c', '#ffd400', '#06d6a0', '#4cc9f0'];
    this.LANES.forEach((ln, i) => {
      const x = this.laneX(i);
      PA.rect(x - 50, 0, 100, H, 'rgba(36,0,70,0.6)');
      PA.bouton(x, this.HIT, 92, 50, ln.key, s.flash[i] > 0 ? '#ffd400' : pianiste, 30, '#1a1222');
    });
    for (const n of s.notes) { if (n.hit || n.y < -40 || n.y > H + 40) continue; PA.forme((x) => x.roundRect(this.laneX(n.lane) - 40, n.y - 18, 80, 36, 12), n.miss ? '#6c757d' : cols[n.lane]); }
    // la colonne de la pédale
    PA.rect(this.PX - 60, 0, 120, H, 'rgba(20,0,40,0.7)');
    for (const o of s.longues) if (o.y > -20 && o.y - o.h < H) PA.forme((x) => x.roundRect(this.PX - 40, o.y - o.h, 80, o.h, 14), o.faute ? '#6c757d' : '#c77dff');
    PA.bouton(this.PX, this.HIT, 110, 50, 'PÉDALE', s.pedale ? '#ffd400' : pedalier, 20, '#1a1222');
    const a = c.duo.ami(), am = a && a.f ? a.f.m || 0 : 0;
    PA.texte(`RATÉES : ${s.m + am}/${this.MAX_RATE}`, 140, 40, 24, '#ff8fa3');
    PA.texte(c.duo.role === 0 ? 'TOI : D F J K' : 'TOI : ESPACE PENDANT LES BARRES', W / 2 + 160, 40, 22, '#ffd400');
    PA.fin(g);
  },
});
