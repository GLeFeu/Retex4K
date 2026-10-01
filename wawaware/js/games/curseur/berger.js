// CURSEUR : chien de berger, les moutons fuient la souris, les rentrer dans l'enclos
Engine.register({
  id: 'berger', name: 'Chien de berger', icon: '🐏', instruction: 'À L\'ENCLOS !', input: 'curseur',
  hint: 'LES MOUTONS FUIENT TA SOURIS', duration: 6, cursor: 'none', PEN: { x: 700, y: 140, w: 220, h: 260 },

  start(c) {
    const n = 2 + Math.min(3, Math.floor(c.diff / 2) + 1);
    return { t: 0, sheep: Array.from({ length: n }, () => ({ x: 120 + c.rng() * 380, y: 120 + c.rng() * 300, vx: 0, vy: 0, inside: false, ph: c.rng() * 6 })) };
  },

  inPen(o) { const p = this.PEN; return o.x > p.x + 20 && o.x < p.x + p.w - 20 && o.y > p.y + 20 && o.y < p.y + p.h - 20; },

  update(s, dt, c) {
    s.t += dt;
    for (const o of s.sheep) {
      if (o.inside) { o.x += Math.sin(s.t * 2 + o.ph) * 10 * dt; continue; }
      const dx = o.x - c.input.x, dy = o.y - c.input.y, d = Math.hypot(dx, dy) || 1;
      if (d < 150 && !c.over) { o.vx += dx / d * 1400 * dt; o.vy += dy / d * 1400 * dt; }
      o.vx += Math.sin(s.t * 1.3 + o.ph) * 30 * dt; o.vy += Math.cos(s.t * 1.1 + o.ph) * 30 * dt;
      const sp = Math.hypot(o.vx, o.vy); if (sp > 260) { o.vx *= 260 / sp; o.vy *= 260 / sp; }
      o.vx *= Math.pow(0.15, dt); o.vy *= Math.pow(0.15, dt);
      o.x = clamp(o.x + o.vx * dt, 40, W - 40); o.y = clamp(o.y + o.vy * dt, 60, H - 40);
      // la clôture de l'enclos (ouverte à gauche)
      const p = this.PEN;
      if (o.x > p.x - 10 && o.x < p.x + p.w + 10 && (Math.abs(o.y - p.y) < 14 || Math.abs(o.y - p.y - p.h) < 14)) { o.vy = -o.vy; o.y += Math.sign(o.vy) * 6; }
      if (this.inPen(o)) { o.inside = true; c.sfx.tone(500, 0.1, 'triangle', 0.08); }
    }
    if (!s.won && s.sheep.every(o => o.inside)) s.won = true;
  },

  draw(s, g, c) {
    g.fillStyle = '#95d5b2'; g.fillRect(0, 0, W, H);
    const p = this.PEN;
    g.fillStyle = '#b7e4c7'; g.fillRect(p.x, p.y, p.w, p.h);
    g.strokeStyle = '#7f5539'; g.lineWidth = 10;
    g.beginPath(); g.moveTo(p.x, p.y); g.lineTo(p.x + p.w, p.y); g.lineTo(p.x + p.w, p.y + p.h); g.lineTo(p.x, p.y + p.h); g.stroke();
    Draw.text(g, 'ENCLOS', p.x + p.w / 2, p.y - 24, 28);
    for (const o of s.sheep) {
      g.save(); g.translate(o.x, o.y); g.scale(o.vx < 0 ? -0.7 : 0.7, 0.7);
      for (const [cx, cy] of [[-20, -4], [0, -12], [20, -4], [-10, 8], [10, 8]]) { Draw.circle(g, cx, cy, 17); Draw.fillStroke(g, '#fff', '#1a1a1a', 3); }
      Draw.ellipse(g, 32, -8, 12, 15); Draw.fillStroke(g, '#343a40');
      g.restore();
    }
    Draw.dog(g, c.input.x, c.input.y + 50, { pose: 'debout', t: s.t, scale: 0.45, face: c.input.x > W / 2 ? 1 : -1 });
    Draw.text(g, `${s.sheep.filter(o => o.inside).length} / ${s.sheep.length}`, 90, 40, 36);
  },
});
