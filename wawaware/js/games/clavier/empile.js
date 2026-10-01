// CLAVIER (Espace, timing) : lâcher les blocs bien alignés pour monter une tour
Engine.register({
  id: 'empile', name: 'La tour', icon: '🧱', instruction: 'EMPILE !', input: 'clavier',
  hint: 'ESPACE POUR LÂCHER LE BLOC', duration: 6, BH: 50, BASE: 470,

  start(c) {
    return { t: 0, stack: [{ x: W / 2, w: 240 }], cur: { x: 150, w: 240, dir: 1 }, sp: 420 + 50 * Math.min(c.diff, 6), need: 4, cut: null };
  },

  update(s, dt, c) {
    s.t += dt;
    if (s.cut) { s.cut.vy += 1500 * dt; s.cut.y += s.cut.vy * dt; }
    if (s.won || s.lost) return;
    const b = s.cur;
    b.x += b.dir * s.sp * dt;
    if (b.x > W - b.w / 2) { b.x = W - b.w / 2; b.dir = -1; }
    if (b.x < b.w / 2) { b.x = b.w / 2; b.dir = 1; }
    if (c.over || !c.input.wasPressed('Space')) return;
    const top = s.stack[s.stack.length - 1];
    const l = Math.max(b.x - b.w / 2, top.x - top.w / 2), r = Math.min(b.x + b.w / 2, top.x + top.w / 2);
    const y = this.BASE - s.stack.length * this.BH;
    if (r - l < 12) { s.lost = true; s.cut = { x: b.x, w: b.w, y, vy: 0 }; c.sfx.thump(); return; }
    // le morceau qui dépasse tombe
    const offL = b.x - b.w / 2 < l, offW = b.w - (r - l);
    if (offW > 2) s.cut = { x: offL ? l - offW / 2 : r + offW / 2, w: offW, y, vy: 0 };
    s.stack.push({ x: (l + r) / 2, w: r - l });
    c.sfx.tone(300 + s.stack.length * 80, 0.08, 'square', 0.1);
    if (s.stack.length - 1 >= s.need) { s.won = true; return; }
    s.cur = { x: b.dir > 0 ? 100 : W - 100, w: r - l, dir: b.dir > 0 ? 1 : -1 };
  },

  draw(s, g) {
    Draw.sky(g, '#ffafcc', '#bde0fe');
    Draw.ground(g, this.BASE + this.BH / 2, '#6c757d');
    const cols = ['#ef233c', '#fb8500', '#ffd400', '#06d6a0', '#3a86ff', '#9d4edd'];
    s.stack.forEach((b, i) => { Draw.rrect(g, b.x - b.w / 2, this.BASE - i * this.BH - this.BH / 2, b.w, this.BH, 6); Draw.fillStroke(g, cols[i % cols.length]); });
    if (!s.won && !s.lost) {
      const y = this.BASE - s.stack.length * this.BH - this.BH / 2;
      Draw.rrect(g, s.cur.x - s.cur.w / 2, y, s.cur.w, this.BH, 6); Draw.fillStroke(g, cols[s.stack.length % cols.length]);
    }
    if (s.cut) { Draw.rrect(g, s.cut.x - s.cut.w / 2, s.cut.y - this.BH / 2, s.cut.w, this.BH, 6); Draw.fillStroke(g, '#adb5bd'); }
    Draw.text(g, `${s.stack.length - 1} / ${s.need}`, W - 90, 50, 44);
  },
});
