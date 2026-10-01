// MOLETTE (haut/bas) : changer de voie pour éviter les plots
Engine.register({
  id: 'route',
  name: 'Autoroute',
  icon: '🚗',
  instruction: 'CONDUIS !',
  input: 'molette',
  hint: 'MOLETTE ↑ ↓ POUR CHANGER DE VOIE',
  duration: 5,
  survival: true,
  LANES: [250, 340, 430],
  CX: 170,

  start(c) {
    const speed = 520 + 40 * Math.min(c.diff, 6);
    const gap = Math.max(230, 340 - 20 * c.diff);
    const obs = [];
    for (let x = 800; x < this.CX + speed * 5 - 60; x += gap * (0.8 + c.rng() * 0.4)) {
      let lane = Math.floor(c.rng() * 3);
      if (obs.length === 0 && lane === 1) lane = c.rng() < 0.5 ? 0 : 2; // laisser le temps de réagir
      obs.push({ x, lane, kind: c.rng() < 0.7 ? 'plot' : 'flaque' });
      if (c.diff >= 3 && c.rng() < 0.35) obs.push({ x, lane: (lane + 1 + Math.floor(c.rng() * 2)) % 3, kind: 'plot' });
    }
    return { t: 0, speed, obs, lane: 1, cy: this.LANES[1], acc: 0, dist: 0, rot: 0 };
  },

  update(s, dt, c) {
    s.t += dt;
    if (!s.lost) {
      s.dist += s.speed * dt;
      for (const o of s.obs) o.x -= s.speed * dt;
      if (!c.over) s.acc += c.input.wheelDelta;
      if (s.acc >= 1 || s.acc <= -1) {
        const nl = clamp(s.lane + Math.sign(s.acc), 0, 2);
        if (nl !== s.lane) c.sfx.tone(500, 0.05, 'square', 0.06);
        s.lane = nl;
        s.acc = 0;
      }
      s.cy += (this.LANES[s.lane] - s.cy) * Math.min(1, dt * 18);
      if (!c.over) {
        for (const o of s.obs) {
          if (Math.abs(o.x - this.CX) < 55 && Math.abs(this.LANES[o.lane] - s.cy) < 40) { s.lost = true; c.sfx.hit(); }
        }
      }
    } else s.rot += dt * 8;
  },

  draw(s, g) {
    g.fillStyle = '#52b788'; g.fillRect(0, 0, W, H);
    g.fillStyle = '#40916c';
    for (let i = 0; i < 14; i++) {
      const x = (((i * 173 - s.dist * 0.9) % (W + 80)) + W + 80) % (W + 80) - 40;
      Draw.circle(g, x, i % 2 ? 120 : 510, 26); g.fill();
    }
    g.fillStyle = '#495057'; g.fillRect(0, 205, W, 270);
    g.fillStyle = '#f8f9fa'; g.fillRect(0, 205, W, 6); g.fillRect(0, 469, W, 6);
    g.fillStyle = '#ffd400';
    for (const y of [295, 385]) {
      for (let x = -(s.dist % 80); x < W; x += 80) g.fillRect(x, y - 3, 44, 6);
    }

    for (const o of s.obs) {
      if (o.x < -60 || o.x > W + 60) continue;
      const y = this.LANES[o.lane];
      if (o.kind === 'plot') {
        g.beginPath(); g.moveTo(o.x, y - 34); g.lineTo(o.x + 22, y + 22); g.lineTo(o.x - 22, y + 22); g.closePath();
        Draw.fillStroke(g, '#fb8500');
        g.fillStyle = '#fff'; g.fillRect(o.x - 12, y - 4, 24, 8);
      } else {
        Draw.ellipse(g, o.x, y, 46, 26); Draw.fillStroke(g, '#1a1a1a', '#000', 2);
        Draw.ellipse(g, o.x - 12, y - 8, 12, 5); g.fillStyle = 'rgba(160,100,255,0.6)'; g.fill();
      }
    }

    g.save();
    g.translate(this.CX, s.cy);
    g.rotate(s.rot);
    for (const [wx, wy] of [[-28, -26], [28, -26], [-28, 26], [28, 26]]) { g.fillStyle = '#1a1a1a'; g.fillRect(wx - 12, wy - 6, 24, 12); }
    Draw.rrect(g, -50, -26, 100, 52, 16); Draw.fillStroke(g, '#ef233c');
    Draw.rrect(g, 4, -20, 24, 40, 8); Draw.fillStroke(g, '#90e0ef', '#1a1a1a', 3);
    Draw.rrect(g, -36, -20, 18, 40, 6); Draw.fillStroke(g, '#90e0ef', '#1a1a1a', 3);
    g.restore();
  },
});
