// CURSEUR : éviter les rayons laser (une ligne pointillée prévient avant qu'il ne s'allume)
Engine.register({
  id: 'laser', name: 'Salle des lasers', icon: '🔴', instruction: 'ÉVITE LES LASERS !', input: 'curseur',
  hint: 'NE TOUCHE PAS LES RAYONS ROUGES', duration: 5, survival: true, cursor: 'none',

  start(c) { return { t: 0, beams: [], spawnT: 0.3, rate: Math.max(0.35, 0.75 - 0.06 * c.diff), warn: Math.max(0.45, 0.7 - 0.03 * c.diff) }; },

  update(s, dt, c) {
    s.t += dt;
    s.spawnT -= dt;
    if (s.spawnT <= 0 && s.t < c.duration - 0.6) {
      const vert = c.rng() < 0.5;
      s.beams.push({ vert, p: vert ? 40 + c.rng() * (W - 80) : 40 + c.rng() * (H - 80), age: 0 });
      s.spawnT = s.rate * (0.8 + c.rng() * 0.4);
    }
    for (const b of s.beams) b.age += dt;
    s.beams = s.beams.filter(b => b.age < s.warn + 0.45);
    if (s.lost || c.over || s.t < 0.3) return;
    for (const b of s.beams) {
      if (b.age < s.warn) continue;
      const d = b.vert ? Math.abs(c.input.x - b.p) : Math.abs(c.input.y - b.p);
      if (d < 18) { s.lost = true; s.zap = { x: c.input.x, y: c.input.y }; c.sfx.hit(); }
    }
  },

  draw(s, g, c) {
    g.fillStyle = '#0b090a'; g.fillRect(0, 0, W, H);
    g.strokeStyle = '#161a1d'; g.lineWidth = 2;
    for (let x = 0; x < W; x += 48) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, H); g.stroke(); }
    for (let y = 0; y < H; y += 48) { g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke(); }
    for (const b of s.beams) {
      const on = b.age >= s.warn;
      g.beginPath();
      if (b.vert) { g.moveTo(b.p, 0); g.lineTo(b.p, H); } else { g.moveTo(0, b.p); g.lineTo(W, b.p); }
      if (on) { g.lineWidth = 20; g.strokeStyle = 'rgba(255,0,60,0.35)'; g.stroke(); g.lineWidth = 8; g.strokeStyle = '#ff006e'; g.stroke(); }
      else { g.setLineDash([10, 10]); g.lineWidth = 2; g.strokeStyle = Math.floor(b.age * 12) % 2 ? '#ff006e' : '#660708'; g.stroke(); g.setLineDash([]); }
    }
    const p = s.zap || c.input;
    if (s.zap) Draw.burst(g, p.x, p.y, 40);
    else { Draw.circle(g, p.x, p.y, 10); Draw.fillStroke(g, '#4cc9f0', '#fff', 3); }
  },
});
