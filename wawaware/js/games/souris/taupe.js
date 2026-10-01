// SOURIS (clic) : taper 3 taupes avant qu'elles ne se cachent
Engine.register({
  id: 'taupe',
  name: 'Tape-taupe',
  icon: '🔨',
  instruction: 'TAPE-LES !',
  input: 'souris',
  hint: 'CLIQUE SUR 3 TAUPES',
  duration: 5,
  cursor: 'none',
  HOLES: [[240, 260], [480, 260], [720, 260], [240, 420], [480, 420], [720, 420]],

  start(c) {
    return { t: 0, hits: 0, need: 3, moles: [], spawnT: 0.1, up: Math.max(0.55, 1.0 - 0.07 * c.diff), swing: 0 };
  },

  height(m) { return clamp(Math.min(m.t, m.life - m.t) / 0.15, 0, 1); },

  update(s, dt, c) {
    s.t += dt;
    s.swing = Math.max(0, s.swing - dt);
    s.spawnT -= dt;
    const maxMoles = c.diff >= 3 ? 2 : 1;
    if (s.spawnT <= 0 && s.moles.filter(m => !m.hit).length < maxMoles) {
      const free = this.HOLES.map((_, i) => i).filter(i => !s.moles.some(m => m.hole === i));
      if (free.length) {
        s.moles.push({ hole: free[Math.floor(c.rng() * free.length)], t: 0, life: s.up, hit: false });
        s.spawnT = 0.15 + c.rng() * 0.25;
      }
    }
    for (const m of s.moles) m.t += dt;
    s.moles = s.moles.filter(m => m.t < m.life);

    if (c.input.clicked && !c.over && !s.won) {
      s.swing = 0.12;
      const target = s.moles.find(m => {
        const [hx, hy] = this.HOLES[m.hole];
        return !m.hit && this.height(m) > 0.4 && Math.abs(c.input.x - hx) < 55 && c.input.y > hy - 110 && c.input.y < hy + 15;
      });
      if (target) {
        target.hit = true;
        target.life = target.t + 0.3;
        s.hits++;
        c.sfx.thump();
        c.sfx.tone(700, 0.08, 'square', 0.1);
        if (s.hits >= s.need) s.won = true;
      } else c.sfx.swat();
    }
  },

  draw(s, g, c) {
    g.fillStyle = '#7cb518'; g.fillRect(0, 0, W, H);
    g.fillStyle = '#5c8001';
    for (let i = 0; i < 40; i++) g.fillRect((i * 97) % W, (i * 53) % H, 6, 14);

    this.HOLES.forEach(([hx, hy], i) => {
      Draw.ellipse(g, hx, hy, 70, 24); Draw.fillStroke(g, '#3d2817');
      const m = s.moles.find(mm => mm.hole === i);
      if (m) {
        const h = this.height(m);
        g.save();
        g.beginPath(); g.rect(hx - 80, hy - 160, 160, 160); g.clip();
        const top = hy - 95 * h + 10;
        Draw.rrect(g, hx - 36, top, 72, 120, 34); Draw.fillStroke(g, '#8d6346');
        Draw.ellipse(g, hx, top + 48, 22, 16); g.fillStyle = '#c9a27e'; g.fill();
        Draw.circle(g, hx, top + 40, 8); g.fillStyle = '#ff8fa3'; g.fill();
        if (m.hit) {
          Draw.text(g, '× ×', hx, top + 22, 24, '#1a1a1a', null);
          Draw.text(g, '★', hx + 30, top - 10, 26, '#ffd400');
        } else {
          Draw.circle(g, hx - 14, top + 24, 5); g.fillStyle = '#1a1a1a'; g.fill();
          Draw.circle(g, hx + 14, top + 24, 5); g.fill();
          g.fillStyle = '#fff'; g.fillRect(hx - 6, top + 54, 12, 9);
        }
        g.restore();
      }
      g.beginPath(); g.ellipse(hx, hy, 74, 26, 0, 0, Math.PI); Draw.fillStroke(g, '#6b4423');
    });

    Draw.text(g, `${s.hits} / ${s.need}`, W - 90, 50, 44);

    // marteau
    g.save();
    g.translate(c.input.x, c.input.y);
    g.rotate(s.swing > 0 ? -0.9 : -0.2);
    Draw.rrect(g, 10, -8, 110, 16, 6); Draw.fillStroke(g, '#c68b59');
    Draw.rrect(g, -30, -28, 50, 56, 10); Draw.fillStroke(g, '#ef233c');
    g.restore();
  },
});
