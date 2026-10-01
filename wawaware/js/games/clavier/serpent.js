// CLAVIER (flèches) : le serpent doit manger 3 pommes sans se cogner
Engine.register({
  id: 'serpent', name: 'Le serpent', icon: '🐍', instruction: 'MANGE !', input: 'clavier',
  hint: 'FLÈCHES OU Z Q S D · 3 POMMES', duration: 7, COLS: 16, ROWS: 9, S: 50,

  start(c) {
    const s = { t: 0, body: [{ x: 3, y: 4 }, { x: 2, y: 4 }, { x: 1, y: 4 }], dir: { x: 1, y: 0 }, next: { x: 1, y: 0 }, step: 0, rate: Math.max(0.09, 0.15 - 0.008 * c.diff), got: 0, need: 3 };
    this.place(s, c);
    return s;
  },

  place(s, c) {
    do { s.apple = { x: Math.floor(c.rng() * this.COLS), y: Math.floor(c.rng() * this.ROWS) }; }
    while (s.body.some(b => b.x === s.apple.x && b.y === s.apple.y) || Math.abs(s.apple.x - s.body[0].x) + Math.abs(s.apple.y - s.body[0].y) < 3);
  },

  update(s, dt, c) {
    s.t += dt;
    if (s.won || s.lost || c.over) return;
    const inp = c.input, d = s.dir;
    if (inp.wasPressed('ArrowUp', 'KeyW') && d.y === 0) s.next = { x: 0, y: -1 };
    if (inp.wasPressed('ArrowDown', 'KeyS') && d.y === 0) s.next = { x: 0, y: 1 };
    if (inp.wasPressed('ArrowLeft', 'KeyA') && d.x === 0) s.next = { x: -1, y: 0 };
    if (inp.wasPressed('ArrowRight', 'KeyD') && d.x === 0) s.next = { x: 1, y: 0 };
    s.step += dt;
    if (s.step < s.rate) return;
    s.step -= s.rate;
    s.dir = s.next;
    const h = { x: s.body[0].x + s.dir.x, y: s.body[0].y + s.dir.y };
    if (h.x < 0 || h.y < 0 || h.x >= this.COLS || h.y >= this.ROWS || s.body.some(b => b.x === h.x && b.y === h.y)) { s.lost = true; c.sfx.hit(); return; }
    s.body.unshift(h);
    if (h.x === s.apple.x && h.y === s.apple.y) { s.got++; c.sfx.tone(800, 0.06, 'square', 0.1); if (s.got >= s.need) s.won = true; else this.place(s, c); }
    else s.body.pop();
  },

  draw(s, g) {
    const ox = (W - this.COLS * this.S) / 2, oy = 50, S = this.S;
    g.fillStyle = '#1b4332'; g.fillRect(0, 0, W, H);
    for (let y = 0; y < this.ROWS; y++) for (let x = 0; x < this.COLS; x++) { g.fillStyle = (x + y) % 2 ? '#95d5b2' : '#b7e4c7'; g.fillRect(ox + x * S, oy + y * S, S, S); }
    if (!s.won) { Draw.circle(g, ox + (s.apple.x + 0.5) * S, oy + (s.apple.y + 0.5) * S, S * 0.36); Draw.fillStroke(g, '#ef233c', '#1a1a1a', 3); }
    s.body.forEach((b, i) => {
      Draw.rrect(g, ox + b.x * S + 3, oy + b.y * S + 3, S - 6, S - 6, 12); Draw.fillStroke(g, i ? '#ffb703' : '#fb8500', '#1a1a1a', 3);
      if (!i) { Draw.circle(g, ox + (b.x + 0.5 + s.dir.x * 0.15) * S, oy + (b.y + 0.5 + s.dir.y * 0.15) * S, 5); g.fillStyle = '#1a1a1a'; g.fill(); }
    });
    Draw.text(g, `${s.got} / ${s.need}`, W / 2, 25, 30);
  },
});
