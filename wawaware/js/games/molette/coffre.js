// MOLETTE (haut/bas) : ouvrir le coffre-fort en tournant le cadran sur chaque chiffre du code
Engine.register({
  id: 'coffre', name: 'Coffre-fort', icon: '🔐', instruction: 'CRACKE LE CODE !', input: 'molette',
  hint: 'TOURNE JUSQU\'AU CHIFFRE, ATTENDS LE CLIC', duration: 6, N: 40,

  start(c) {
    const len = c.diff >= 3 ? 3 : 2, code = [];
    let v = 0;
    for (let i = 0; i < len; i++) { v = (v + (c.rng() < 0.5 ? -1 : 1) * (4 + Math.floor(c.rng() * 7)) + this.N) % this.N; code.push(v); }
    return { t: 0, dial: 0, shown: 0, code, i: 0, hold: 0, open: 0 };
  },

  update(s, dt, c) {
    s.t += dt;
    if (s.won) { s.open = Math.min(1, s.open + dt * 2); return; }
    if (!c.over && c.input.wheelDelta) { s.dial -= c.input.wheelDelta; c.sfx.tone(1500, 0.015, 'square', 0.04); }
    s.shown += (s.dial - s.shown) * Math.min(1, dt * 15);
    const cur = ((Math.round(s.dial) % this.N) + this.N) % this.N;
    if (cur === s.code[s.i]) s.hold += dt; else s.hold = 0;
    if (s.hold > 0.35 && !c.over) {
      s.i++; s.hold = 0; c.sfx.thump(); c.sfx.tone(300, 0.08, 'square', 0.1);
      if (s.i >= s.code.length) s.won = true;
    }
  },

  draw(s, g) {
    g.fillStyle = '#212529'; g.fillRect(0, 0, W, H);
    Draw.rrect(g, 230, 40, 500, 460, 20); Draw.fillStroke(g, '#6c757d');
    if (s.won) {
      g.save(); g.translate(250, 0); g.scale(1 - s.open * 0.8, 1);
      Draw.rrect(g, 0, 60, 460, 420, 14); Draw.fillStroke(g, '#495057');
      g.restore();
      Draw.text(g, '💰', 520, 280, 120, '#000', null);
      return;
    }
    Draw.rrect(g, 250, 60, 460, 420, 14); Draw.fillStroke(g, '#495057');
    const cx = 480, cy = 270;
    Draw.circle(g, cx, cy, 150); Draw.fillStroke(g, '#ced4da');
    g.save(); g.translate(cx, cy); g.rotate(-s.shown * (Math.PI * 2 / this.N));
    for (let i = 0; i < this.N; i++) {
      const a = i * Math.PI * 2 / this.N - Math.PI / 2;
      g.save(); g.rotate(a + Math.PI / 2);
      g.fillStyle = '#1a1a1a'; g.fillRect(-1.5, -145, 3, i % 5 ? 10 : 20);
      if (i % 5 === 0) Draw.text(g, String(i), 0, -112, 20, '#1a1a1a', null);
      g.restore();
    }
    Draw.circle(g, 0, 0, 60); Draw.fillStroke(g, '#adb5bd');
    g.fillStyle = '#495057'; g.fillRect(-8, -55, 16, 110);
    g.restore();
    g.beginPath(); g.moveTo(cx, cy - 160); g.lineTo(cx - 14, cy - 185); g.lineTo(cx + 14, cy - 185); g.closePath(); Draw.fillStroke(g, '#ef233c');
    const cur = ((Math.round(s.dial) % this.N) + this.N) % this.N;
    Draw.text(g, String(cur), 150, 270, 60, '#fff');
    s.code.forEach((v, j) => Draw.btn(g, 820, 140 + j * 80, 110, 60, String(v), j < s.i ? '#06d6a0' : j === s.i ? '#ffd400' : '#fff', 34));
  },
});
