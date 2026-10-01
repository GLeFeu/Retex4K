// MOLETTE : gonfler le ballon jusqu'à ce qu'il éclate
Engine.register({
  id: 'ballon',
  name: 'Gonfle le ballon',
  icon: '🎈',
  instruction: 'GONFLE !',
  input: 'molette',
  hint: 'TOURNE LA MOLETTE À FOND',
  duration: 5,

  start(c) {
    return { t: 0, air: 0, need: 14 + 3 * Math.min(c.diff, 6), pump: 0, popped: false, parts: [] };
  },

  update(s, dt, c) {
    s.t += dt;
    s.pump = Math.max(0, s.pump - dt * 6);
    if (!s.popped) {
      const n = c.over ? 0 : c.input.wheelNotches;
      if (n > 0) {
        s.air += n;
        s.pump = 1;
        c.sfx.pump(250 + 600 * Math.min(1, s.air / s.need));
      }
      s.air = Math.max(0, s.air - dt * 1.2); // petite fuite
      if (s.air >= s.need) {
        s.popped = true;
        s.won = true;
        c.sfx.pop();
        const cols = ['#ef233c', '#ffd400', '#3a86ff', '#06d6a0', '#ff6b9d'];
        for (let i = 0; i < 50; i++) {
          const a = c.rng() * Math.PI * 2, v = 200 + c.rng() * 500;
          s.parts.push({ x: 620, y: 226, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 200, col: cols[i % cols.length], rot: c.rng() * 6 });
        }
      }
    }
    for (const p of s.parts) { p.vy += 900 * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.rot += dt * 10; }
  },

  draw(s, g, c) {
    const sky = g.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, '#8ecae6'); sky.addColorStop(1, '#e0f4ff');
    g.fillStyle = sky;
    g.fillRect(0, 0, W, H);
    for (const [cx, cy, k] of [[150, 90, 1], [480, 60, 0.8], [820, 120, 1.2]]) {
      const x = ((cx + s.t * 20 * k) % (W + 200)) - 100;
      g.fillStyle = '#fff';
      Draw.circle(g, x, cy, 30 * k); g.fill();
      Draw.circle(g, x + 35 * k, cy + 5, 24 * k); g.fill();
      Draw.circle(g, x - 32 * k, cy + 8, 20 * k); g.fill();
    }
    const baseY = H - 70;
    g.fillStyle = '#80b918'; g.fillRect(0, baseY, W, 70);
    g.fillStyle = '#55a630'; g.fillRect(0, baseY, W, 8);

    const f = Math.min(1, s.air / s.need);
    const px = 260, bx = 620;

    // tuyau
    const r = 34 + 150 * f;
    const nozzleY = baseY - 50;
    g.lineCap = 'round';
    g.strokeStyle = '#1a1a1a'; g.lineWidth = 14;
    g.beginPath(); g.moveTo(px + 35, baseY - 30); g.bezierCurveTo(px + 160, baseY + 20, bx - 120, baseY + 10, bx, nozzleY + 10); g.stroke();
    g.strokeStyle = '#2b9348'; g.lineWidth = 8;
    g.stroke();

    // pompe
    const rodTop = baseY - 250 + s.pump * 55;
    g.fillStyle = '#adb5bd'; g.fillRect(px - 5, rodTop, 10, baseY - 170 - rodTop);
    Draw.rrect(g, px - 60, rodTop - 14, 120, 24, 12); Draw.fillStroke(g, '#f72585');
    Draw.rrect(g, px - 35, baseY - 170, 70, 165, 12); Draw.fillStroke(g, '#4361ee');
    Draw.rrect(g, px - 70, baseY - 16, 140, 24, 10); Draw.fillStroke(g, '#3a0ca3');
    g.fillStyle = 'rgba(255,255,255,0.25)'; g.fillRect(px - 22, baseY - 160, 10, 140);

    if (!s.popped) {
      const shake = f > 0.7 ? (f - 0.7) * 25 * Math.sin(s.t * 80) : 0;
      const cy = nozzleY - r;
      g.save();
      g.translate(bx + shake, cy);
      Draw.ellipse(g, 0, 0, r * 0.92, r); Draw.fillStroke(g, '#ef233c', '#1a1a1a', 5);
      Draw.ellipse(g, -r * 0.35, -r * 0.4, r * 0.18, r * 0.28, 0.5); g.fillStyle = 'rgba(255,255,255,0.5)'; g.fill();
      g.beginPath(); g.moveTo(-10, r + 12); g.lineTo(10, r + 12); g.lineTo(0, r - 2); g.closePath();
      Draw.fillStroke(g, '#c1121f', '#1a1a1a', 3);
      g.restore();
    } else {
      for (const p of s.parts) {
        g.save(); g.translate(p.x, p.y); g.rotate(p.rot);
        g.fillStyle = p.col; g.fillRect(-6, -4, 12, 8);
        g.restore();
      }
      Draw.text(g, 'POP !', bx, 200, 90, '#ffd400');
    }

    // jauge d'air
    const gx = W - 70, gy = 70, gh = 300;
    Draw.rrect(g, gx, gy, 34, gh, 14); Draw.fillStroke(g, 'rgba(255,255,255,0.6)');
    const fh = (gh - 8) * f;
    if (fh > 1) { Draw.rrect(g, gx + 4, gy + gh - 4 - fh, 26, fh, 10); g.fillStyle = f > 0.75 ? '#ef233c' : '#ffb703'; g.fill(); }

    // indice molette animé
    if (f < 0.3 && !s.popped) {
      const ay = 150 + Math.sin(s.t * 12) * 12;
      Draw.rrect(g, px - 28, ay - 40, 56, 80, 28); Draw.fillStroke(g, '#fff');
      Draw.rrect(g, px - 6, ay - 28, 12, 24, 6); Draw.fillStroke(g, '#ff3c6e', '#1a1a1a', 3);
      Draw.text(g, '↕', px + 50, ay - 16, 40, '#fff');
    }
  },
});
