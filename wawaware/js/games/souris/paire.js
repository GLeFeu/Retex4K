// SOURIS : trouver les deux chaussettes identiques
Engine.register({
  id: 'paire', name: 'La paire', icon: '🧦', instruction: 'TROUVE LA PAIRE !', input: 'souris',
  hint: 'CLIQUE LES 2 CHAUSSETTES IDENTIQUES', duration: 6, cursor: 'pointer',
  COLS: ['#ef233c', '#3a86ff', '#ffd400', '#06d6a0', '#ff6b9d', '#9d4edd'], PATS: ['rayures', 'pois', 'uni'],

  start(c) {
    const n = Math.min(10, 6 + c.diff), all = [];
    for (const col of this.COLS) for (const pat of this.PATS) all.push({ col, pat });
    shuffle(all, c.rng);
    const socks = all.slice(0, n - 1).map(o => ({ ...o }));
    socks.push({ ...socks[0] });
    shuffle(socks, c.rng);
    socks.forEach((o, i) => { o.x = 110 + (i % 5) * 185; o.y = 150 + Math.floor(i / 5) * 210; o.rot = (c.rng() - 0.5) * 0.5; });
    return { t: 0, socks, sel: -1 };
  },

  update(s, dt, c) {
    s.t += dt;
    if (s.won || s.lost || c.over || !c.input.clicked) return;
    const i = s.socks.findIndex(o => Math.abs(c.input.x - o.x) < 50 && Math.abs(c.input.y - o.y) < 80);
    if (i < 0 || i === s.sel) return;
    if (s.sel < 0) { s.sel = i; c.sfx.tone(600, 0.05, 'square', 0.08); return; }
    const a = s.socks[s.sel], b = s.socks[i];
    s.sel2 = i;
    if (a.col === b.col && a.pat === b.pat) s.won = true; else { s.lost = true; c.sfx.hit(); }
  },

  sock(g, o, hl) {
    g.save(); g.translate(o.x, o.y); g.rotate(o.rot);
    g.beginPath(); g.moveTo(-26, -80); g.lineTo(26, -80); g.lineTo(26, 30); g.quadraticCurveTo(26, 70, -10, 70); g.lineTo(-50, 70); g.quadraticCurveTo(-70, 70, -70, 50); g.quadraticCurveTo(-70, 30, -26, 20); g.closePath();
    Draw.fillStroke(g, o.col, hl ? '#ffd400' : '#1a1a1a', hl ? 8 : 4);
    g.save(); g.clip();
    g.fillStyle = 'rgba(255,255,255,0.6)';
    if (o.pat === 'rayures') for (let y = -70; y < 70; y += 24) g.fillRect(-80, y, 120, 10);
    if (o.pat === 'pois') for (let y = -65; y < 70; y += 24) for (let x = -60; x < 30; x += 24) { Draw.circle(g, x, y, 5); g.fill(); }
    g.restore();
    g.fillStyle = '#fff'; g.fillRect(-26, -80, 52, 16);
    g.restore();
  },

  draw(s, g) {
    g.fillStyle = '#e9ecef'; g.fillRect(0, 0, W, H);
    g.strokeStyle = '#6c757d'; g.lineWidth = 4;
    for (const y of [60, 270]) { g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke(); }
    s.socks.forEach((o, i) => this.sock(g, o, i === s.sel || i === s.sel2));
  },
});
