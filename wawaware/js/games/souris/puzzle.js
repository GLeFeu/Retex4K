// SOURIS (glisser) : mettre la bonne pièce dans le trou
Engine.register({
  id: 'puzzle', name: 'La bonne pièce', icon: '🧩', instruction: 'COMPLÈTE !', input: 'souris',
  hint: 'GLISSE LA BONNE FORME DANS LE TROU', duration: 5, cursor: 'grab', SHAPES: ['rond', 'carre', 'triangle', 'etoile', 'coeur'],

  start(c) {
    const ids = shuffle(this.SHAPES.map((_, i) => i), c.rng).slice(0, 3);
    const pieces = ids.map((k, i) => ({ k, x: 240 + i * 240, y: 430, hx: 240 + i * 240, hy: 430 }));
    return { t: 0, pieces, good: ids[Math.floor(c.rng() * 3)], drag: null, slot: { x: 480, y: 190 } };
  },

  shape(g, k, x, y, r) {
    g.beginPath();
    if (k === 0) g.arc(x, y, r, 0, Math.PI * 2);
    else if (k === 1) g.rect(x - r, y - r, r * 2, r * 2);
    else if (k === 2) { g.moveTo(x, y - r); g.lineTo(x + r, y + r * 0.8); g.lineTo(x - r, y + r * 0.8); g.closePath(); }
    else if (k === 3) { for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * 0.45 : r; g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); } g.closePath(); }
    else Draw.heart(g, x, y, r * 2);
  },

  update(s, dt, c) {
    s.t += dt;
    if (s.won || c.over) { s.drag = null; return; }
    const inp = c.input;
    if (!s.drag && inp.clicked) s.drag = s.pieces.find(p => Math.hypot(inp.x - p.x, inp.y - p.y) < 55) || null;
    if (!s.drag) return;
    s.drag.x = inp.x; s.drag.y = inp.y;
    if (inp.down) return;
    if (Math.hypot(s.drag.x - s.slot.x, s.drag.y - s.slot.y) < 60 && s.drag.k === s.good) { s.drag.x = s.slot.x; s.drag.y = s.slot.y; s.won = true; c.sfx.tone(900, 0.12, 'square', 0.1); }
    else { if (Math.hypot(s.drag.x - s.slot.x, s.drag.y - s.slot.y) < 60) c.sfx.tone(150, 0.1, 'sawtooth', 0.08); s.drag.x = s.drag.hx; s.drag.y = s.drag.hy; }
    s.drag = null;
  },

  draw(s, g) {
    g.fillStyle = '#caf0f8'; g.fillRect(0, 0, W, H);
    Draw.rrect(g, 330, 60, 300, 260, 20); Draw.fillStroke(g, '#90e0ef');
    this.shape(g, s.good, s.slot.x, s.slot.y, 62); g.fillStyle = '#023e8a'; g.fill();
    g.fillStyle = '#ade8f4'; g.fillRect(0, 360, W, H - 360);
    for (const p of s.pieces) { this.shape(g, p.k, p.x, p.y, 56); Draw.fillStroke(g, ['#ef233c', '#ffd400', '#06d6a0', '#ff6b9d', '#9d4edd'][p.k]); }
  },
});
