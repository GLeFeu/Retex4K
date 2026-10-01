// CURSEUR (geste rapide) : trancher les fruits en passant vite dessus, éviter les bombes
Engine.register({
  id: 'tranche', name: 'Fruit ninja', icon: '🍉', instruction: 'TRANCHE !', input: 'curseur',
  hint: 'PASSE VITE LA SOURIS SUR LES FRUITS', duration: 5, cursor: 'none',

  start(c) { return { t: 0, items: [], spawnT: 0.1, got: 0, need: 3 + Math.min(2, Math.floor(c.diff / 2)), bombs: c.diff >= 2, trail: [], px: c.input.x, py: c.input.y, halves: [] }; },

  update(s, dt, c) {
    s.t += dt;
    const x = c.input.x, y = c.input.y;
    const speed = Math.hypot(x - s.px, y - s.py) / Math.max(dt, 0.001);
    s.trail.push({ x, y, life: 0.15 }); for (const p of s.trail) p.life -= dt; s.trail = s.trail.filter(p => p.life > 0);
    s.spawnT -= dt;
    if (s.spawnT <= 0 && !s.won && !s.lost) {
      const bomb = s.bombs && c.rng() < 0.3;
      s.items.push({ x: 150 + c.rng() * 660, y: H + 40, vx: (c.rng() - 0.5) * 200, vy: -780 - c.rng() * 150, bomb, col: ['#ef233c', '#80b918', '#fb8500', '#ffd400'][Math.floor(c.rng() * 4)], cut: false });
      s.spawnT = 0.45 + c.rng() * 0.3;
    }
    for (const it of s.items) { it.vy += 900 * dt; it.x += it.vx * dt; it.y += it.vy * dt; }
    for (const h of s.halves) { h.vy += 900 * dt; h.x += h.vx * dt; h.y += h.vy * dt; h.rot += h.vr * dt; }
    if (!c.over && !s.won && !s.lost && speed > 700) {
      for (const it of s.items) {
        if (it.cut) continue;
        // distance du fruit au segment parcouru par la souris pendant cette frame
        const dx = x - s.px, dy = y - s.py, L = dx * dx + dy * dy || 1;
        const k = clamp(((it.x - s.px) * dx + (it.y - s.py) * dy) / L, 0, 1);
        if (Math.hypot(it.x - (s.px + dx * k), it.y - (s.py + dy * k)) < 38) {
          it.cut = true;
          if (it.bomb) { s.lost = true; c.sfx.hit(); break; }
          s.got++; c.sfx.noise(0.1, 0.25, 0, 3000);
          for (const sgn of [-1, 1]) s.halves.push({ x: it.x, y: it.y, vx: sgn * 150, vy: it.vy, rot: 0, vr: sgn * 6, col: it.col, sgn });
          if (s.got >= s.need) s.won = true;
        }
      }
    }
    s.items = s.items.filter(it => !it.cut && it.y < H + 80);
    s.px = x; s.py = y;
  },

  draw(s, g) {
    g.fillStyle = '#6f4518'; g.fillRect(0, 0, W, H);
    g.strokeStyle = '#583101'; g.lineWidth = 6;
    for (let x = 0; x < W; x += 120) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, H); g.stroke(); }
    for (const it of s.items) {
      if (it.bomb) { Draw.circle(g, it.x, it.y, 30); Draw.fillStroke(g, '#1a1a1a', '#000'); Draw.circle(g, it.x + 22, it.y - 26, 7); g.fillStyle = '#ff7b00'; g.fill(); }
      else { Draw.circle(g, it.x, it.y, 34); Draw.fillStroke(g, it.col); Draw.ellipse(g, it.x + 8, it.y - 34, 9, 4, -0.4); g.fillStyle = '#2d6a4f'; g.fill(); }
    }
    for (const h of s.halves) {
      g.save(); g.translate(h.x, h.y); g.rotate(h.rot);
      g.beginPath(); g.arc(0, 0, 34, h.sgn > 0 ? -Math.PI / 2 : Math.PI / 2, h.sgn > 0 ? Math.PI / 2 : Math.PI * 1.5); g.closePath();
      Draw.fillStroke(g, h.col); g.restore();
    }
    if (s.trail.length > 1) {
      g.strokeStyle = '#fff'; g.lineCap = 'round';
      for (let i = 1; i < s.trail.length; i++) { g.lineWidth = 2 + i * 1.5; g.beginPath(); g.moveTo(s.trail[i - 1].x, s.trail[i - 1].y); g.lineTo(s.trail[i].x, s.trail[i].y); g.stroke(); }
    }
    Draw.text(g, `${s.got} / ${s.need}`, W - 90, 50, 44);
  },
});
