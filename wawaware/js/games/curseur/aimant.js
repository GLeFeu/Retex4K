// CURSEUR : ramasser tous les trombones avec l'aimant
Engine.register({
  id: 'aimant', name: 'L\'aimant', icon: '🧲', instruction: 'RAMASSE TOUT !', input: 'curseur',
  hint: 'PASSE L\'AIMANT PRÈS DES TROMBONES', duration: 5, cursor: 'none',

  start(c) {
    const n = 6 + Math.min(c.diff, 6) * 2;
    return { t: 0, clips: Array.from({ length: n }, () => ({ x: 60 + c.rng() * 840, y: 60 + c.rng() * 420, rot: c.rng() * 6, stuck: false, ox: 0, oy: 0 })) };
  },

  update(s, dt, c) {
    s.t += dt;
    const { x, y } = c.input;
    for (const p of s.clips) {
      if (p.stuck) continue;
      const d = Math.hypot(x - p.x, y - p.y);
      if (d < 120 && !c.over) { const k = Math.min(1, dt * (900 / Math.max(d, 20))); p.x += (x - p.x) * k * 0.3; p.y += (y - p.y) * k * 0.3; }
      if (d < 40 && !c.over) { p.stuck = true; p.ox = (Math.random() - 0.5) * 70; p.oy = 34 + Math.random() * 20; c.sfx.tone(1200, 0.03, 'square', 0.05); }
    }
    if (!s.won && s.clips.every(p => p.stuck)) s.won = true;
  },

  draw(s, g, c) {
    g.fillStyle = '#e9ecef'; g.fillRect(0, 0, W, H);
    g.fillStyle = '#ced4da';
    for (let x = 0; x < W; x += 30) for (let y = 0; y < H; y += 30) g.fillRect(x, y, 2, 2);
    const clip = (x, y, rot) => {
      g.save(); g.translate(x, y); g.rotate(rot);
      g.strokeStyle = '#495057'; g.lineWidth = 4;
      Draw.rrect(g, -8, -18, 16, 36, 8); g.stroke(); Draw.rrect(g, -4, -12, 8, 24, 4); g.stroke();
      g.restore();
    };
    for (const p of s.clips) if (!p.stuck) clip(p.x, p.y, p.rot);
    const { x, y } = c.input;
    for (const p of s.clips) if (p.stuck) clip(x + p.ox, y + p.oy, p.rot);
    // aimant en U
    g.save(); g.translate(x, y);
    g.lineWidth = 26; g.strokeStyle = '#1a1a1a'; g.beginPath(); g.arc(0, -10, 34, Math.PI, 0); g.lineTo(34, 30); g.moveTo(-34, -10); g.lineTo(-34, 30); g.stroke();
    g.lineWidth = 18; g.strokeStyle = '#ef233c'; g.stroke();
    g.fillStyle = '#ced4da'; g.fillRect(-43, 16, 18, 16); g.fillRect(25, 16, 18, 16);
    g.restore();
    Draw.text(g, `${s.clips.filter(p => !p.stuck).length}`, W - 60, 50, 44);
  },
});
