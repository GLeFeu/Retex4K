// DUO (clavier) : piano à quatre mains. Les notes de gauche (D F) sont pour l'un, celles de droite (J K) pour l'autre.
Engine.register({
  id: 'd_piano', name: 'Piano à quatre mains', icon: '🎹', instruction: 'JOUEZ ENSEMBLE !', input: 'clavier',
  hint: 'L\'UN JOUE D F, L\'AUTRE J K', duration: 7, duo: true, HIT: 430, MAX_RATE: 3,
  LANES: [{ code: 'KeyD', key: 'D' }, { code: 'KeyF', key: 'F' }, { code: 'KeyJ', key: 'J' }, { code: 'KeyK', key: 'K' }],
  IM: PA.images('d_piano', ['fond']),

  start(c) {
    const notes = [];
    for (let i = 0; i < 12; i++) notes.push({ lane: Math.floor(c.rng() * 4), y: -60 - i * 140, hit: false, miss: false });
    return { t: 0, notes, sp: 330, h: 0, m: 0, flash: [0, 0, 0, 0] };
  },
  laneX(i) { return 300 + i * 120; },
  mienne(c, lane) { return (lane < 2 ? 0 : 1) === c.duo.role; },
  ghost(s, c) { return { x: 0, y: 0, f: { h: s.h, m: s.m } }; },
  bot(s, c) { // robot : joue ses notes (avec une petite erreur de temps en temps)
    const b = s.bot || (s.bot = { h: 0, m: 0, vu: new Set() });
    s.notes.forEach((n, i) => {
      if (this.mienne(c, n.lane) || b.vu.has(i)) return;
      if (n.y > this.HIT - 10) { b.vu.add(i); if ((i * 7) % 10 < 9) b.h++; else b.m++; }
    });
    return { x: 0, y: 0, f: { h: b.h, m: b.m } };
  },

  update(s, dt, c) {
    s.t += dt;
    for (let i = 0; i < 4; i++) s.flash[i] = Math.max(0, s.flash[i] - dt);
    for (const n of s.notes) n.y += s.sp * dt;
    if (s.won || s.lost) return;
    this.LANES.forEach((ln, i) => {
      if (!this.mienne(c, i) || !c.input.wasPressed(ln.code)) return;
      s.flash[i] = 0.12;
      const n = s.notes.find(o => o.lane === i && !o.hit && !o.miss && Math.abs(o.y - this.HIT) < 45);
      if (n) { n.hit = true; s.h++; c.sfx.tone(300 + i * 90, 0.08, 'triangle', 0.1); } else { s.m++; c.sfx.hit(); }
    });
    for (const n of s.notes) if (this.mienne(c, n.lane) && !n.hit && !n.miss && n.y > this.HIT + 50) { n.miss = true; s.m++; }
    const a = c.duo.ami(), am = a && a.f ? a.f.m || 0 : 0;
    // les notes de l'autre : on les marque jouées quand elles passent (son score arrive par le réseau)
    for (const n of s.notes) if (!this.mienne(c, n.lane) && !n.hit && n.y > this.HIT) n.hit = true;
    if (s.m + am >= this.MAX_RATE) { s.lost = true; return; }
    if (s.notes.every(n => n.y > this.HIT + 60)) s.won = true;
  },

  draw(s, g, c) {
    const l = PA.debut(g, this.IM, '#10002b');
    if (!l) return;
    PA.fond(this.IM.fond);
    const [moiCoul, amiCoul] = Duo.couleurs(c);
    this.LANES.forEach((ln, i) => {
      const x = this.laneX(i), mienne = this.mienne(c, i);
      PA.rect(x - 55, 0, 110, H, mienne ? 'rgba(60,9,108,0.8)' : 'rgba(36,0,70,0.55)');
      PA.bouton(x, this.HIT, 100, 50, ln.key, s.flash[i] > 0 ? '#ffd400' : mienne ? moiCoul : amiCoul, 30, '#1a1222');
    });
    const cols = ['#ef233c', '#ffd400', '#06d6a0', '#4cc9f0'];
    for (const n of s.notes) { if (n.hit || n.y < -40 || n.y > H + 40) continue; PA.forme((x) => x.roundRect(this.laneX(n.lane) - 44, n.y - 18, 88, 36, 12), n.miss ? '#6c757d' : cols[n.lane]); }
    const a = c.duo.ami(), am = a && a.f ? a.f.m || 0 : 0;
    PA.texte(`RATÉES : ${s.m + am}/${this.MAX_RATE}`, 140, 40, 24, '#ff8fa3');
    PA.texte(c.duo.role === 0 ? 'TOI : D F' : 'TOI : J K', W - 120, 40, 24, moiCoul);
    PA.fin(g);
  },
});
