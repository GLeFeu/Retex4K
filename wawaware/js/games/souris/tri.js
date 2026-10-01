// SOURIS (glisser) : trier les déchets dans la bonne poubelle
Engine.register({
  id: 'tri', name: 'Tri sélectif', icon: '♻️', instruction: 'TRIE !', input: 'souris',
  hint: 'GLISSE CHAQUE DÉCHET DANS SA POUBELLE', duration: 6, cursor: 'grab',
  BINS: [{ name: 'VERRE', col: '#2b9348', x: 200 }, { name: 'PAPIER', col: '#3a86ff', x: 480 }, { name: 'COMPOST', col: '#7f5539', x: 760 }],

  start(c) {
    const n = c.diff >= 2 ? 4 : 3, items = [];
    for (let i = 0; i < n; i++) {
      const bin = i < 3 ? i : Math.floor(c.rng() * 3);
      items.push({ bin, x: 180 + i * (600 / (n - 1)), y: 130, hx: 180 + i * (600 / (n - 1)), hy: 130, done: false });
    }
    return { t: 0, items, drag: null };
  },

  update(s, dt, c) {
    s.t += dt;
    if (s.won || s.lost || c.over) { s.drag = null; return; }
    const inp = c.input;
    if (!s.drag && inp.clicked) s.drag = s.items.find(it => !it.done && Math.hypot(inp.x - it.x, inp.y - it.y) < 50) || null;
    if (!s.drag) return;
    s.drag.x = inp.x; s.drag.y = inp.y;
    if (inp.down) return;
    const it = s.drag; s.drag = null;
    const bin = this.BINS.findIndex(b => Math.abs(it.x - b.x) < 90 && it.y > 300);
    if (bin < 0) { it.x = it.hx; it.y = it.hy; return; }
    if (bin !== it.bin) { s.lost = true; c.sfx.hit(); return; }
    it.done = true; it.x = this.BINS[bin].x; it.y = 330;
    c.sfx.tone(800, 0.06, 'square', 0.1);
    if (s.items.every(o => o.done)) s.won = true;
  },

  item(g, it) {
    g.save(); g.translate(it.x, it.y);
    if (it.bin === 0) { Draw.rrect(g, -16, -40, 32, 70, 10); Draw.fillStroke(g, '#80ed99'); Draw.rrect(g, -7, -58, 14, 22, 4); Draw.fillStroke(g, '#80ed99'); }
    else if (it.bin === 1) { g.rotate(0.15); Draw.rrect(g, -32, -36, 64, 72, 4); Draw.fillStroke(g, '#fff'); g.strokeStyle = '#adb5bd'; g.lineWidth = 3; for (let y = -20; y < 30; y += 12) { g.beginPath(); g.moveTo(-22, y); g.lineTo(22, y); g.stroke(); } }
    else { g.rotate(-0.4); g.beginPath(); g.moveTo(-40, 0); g.quadraticCurveTo(0, -50, 40, 0); g.quadraticCurveTo(0, -20, -40, 0); Draw.fillStroke(g, '#ffd60a'); }
    g.restore();
  },

  draw(s, g) {
    g.fillStyle = '#d8f3dc'; g.fillRect(0, 0, W, H);
    Draw.ground(g, 470, '#95d5b2', '#74c69d');
    for (const b of this.BINS) {
      Draw.rrect(g, b.x - 80, 330, 160, 150, 12); Draw.fillStroke(g, b.col);
      Draw.rrect(g, b.x - 90, 312, 180, 26, 8); Draw.fillStroke(g, b.col);
      Draw.text(g, b.name, b.x, 410, 28, '#fff');
    }
    for (const it of s.items) if (!it.done && it !== s.drag) this.item(g, it);
    if (s.drag) this.item(g, s.drag);
  },
});
