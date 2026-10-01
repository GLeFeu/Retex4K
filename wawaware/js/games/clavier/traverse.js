// CLAVIER (↑) : traverser la route sans se faire écraser, pas à pas
Engine.register({
  id: 'traverse', name: 'Traverse la route', icon: '🐸', instruction: 'TRAVERSE !', input: 'clavier',
  hint: '↑ (OU Z) POUR AVANCER, ↓ POUR RECULER', duration: 6, LANE_H: 70, TOP: 70,

  start(c) {
    const lanes = 5, cars = [];
    for (let i = 0; i < lanes; i++) {
      const dir = i % 2 ? -1 : 1, sp = (140 + c.rng() * 120 + 25 * Math.min(c.diff, 6)) * dir;
      const n = 2 + Math.floor(c.rng() * 2);
      for (let k = 0; k < n; k++) cars.push({ lane: i, x: k * (W / n) + c.rng() * 100, sp, w: 90 + c.rng() * 40, col: ['#ef233c', '#3a86ff', '#ffd400', '#9d4edd'][Math.floor(c.rng() * 4)] });
    }
    return { t: 0, row: lanes + 1, lanes, cars, x: W / 2, hop: 0 };
  },

  rowY(s, r) { return this.TOP + r * this.LANE_H - this.LANE_H / 2; },

  update(s, dt, c) {
    s.t += dt;
    s.hop = Math.max(0, s.hop - dt);
    for (const car of s.cars) { car.x += car.sp * dt; if (car.x > W + 80) car.x = -80 - car.w; if (car.x < -80 - car.w) car.x = W + 80; }
    if (s.won || s.lost || c.over) return;
    if (c.input.wasPressed('ArrowUp', 'KeyW')) { s.row--; s.hop = 0.12; c.sfx.tone(600, 0.04, 'square', 0.06); }
    if (c.input.wasPressed('ArrowDown', 'KeyS') && s.row < s.lanes + 1) { s.row++; s.hop = 0.12; }
    if (s.row <= 0) { s.won = true; return; }
    const lane = s.row - 1;
    if (lane < s.lanes && s.cars.some(car => car.lane === lane && s.x > car.x - 22 && s.x < car.x + car.w + 22)) { s.lost = true; c.sfx.hit(); }
  },

  draw(s, g) {
    g.fillStyle = '#52b788'; g.fillRect(0, 0, W, H);
    g.fillStyle = '#495057'; g.fillRect(0, this.TOP, W, s.lanes * this.LANE_H);
    g.fillStyle = '#fff';
    for (let i = 1; i < s.lanes; i++) for (let x = 0; x < W; x += 60) g.fillRect(x, this.TOP + i * this.LANE_H - 2, 30, 4);
    for (const car of s.cars) {
      const y = this.TOP + car.lane * this.LANE_H + 12;
      Draw.rrect(g, car.x, y, car.w, this.LANE_H - 24, 12); Draw.fillStroke(g, car.col);
      g.fillStyle = '#90e0ef'; g.fillRect(car.sp > 0 ? car.x + car.w - 30 : car.x + 10, y + 8, 20, this.LANE_H - 40);
    }
    Draw.text(g, '★ ARRIVÉE ★', W / 2, 32, 30, '#ffd400');
    const y = this.rowY(s, s.row) + 30 - s.hop * 120;
    // grenouille
    g.save(); g.translate(s.x, y - 20);
    if (s.lost) g.scale(1.4, 0.3);
    Draw.ellipse(g, 0, 0, 24, 20); Draw.fillStroke(g, '#70e000');
    for (const sx of [-1, 1]) { Draw.circle(g, sx * 12, -16, 9); Draw.fillStroke(g, '#fff', '#1a1a1a', 3); Draw.circle(g, sx * 12, -16, 4); g.fillStyle = '#1a1a1a'; g.fill(); }
    g.restore();
  },
});
