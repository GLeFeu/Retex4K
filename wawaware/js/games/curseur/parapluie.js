// CURSEUR : tenir le parapluie au-dessus du promeneur pour qu'il ne soit pas mouillé
Engine.register({
  id: 'parapluie', name: 'Le parapluie', icon: '☂️', instruction: 'PROTÈGE-LE !', input: 'curseur',
  hint: 'LE PARAPLUIE SUIT TA SOURIS', duration: 5, survival: true, cursor: 'none',

  start(c) { return { t: 0, hx: 200, dir: 1, drops: [], spawnT: 0, rate: Math.max(0.06, 0.14 - 0.01 * c.diff), walk: 120 + 20 * Math.min(c.diff, 6) }; },

  update(s, dt, c) {
    s.t += dt;
    if (!s.lost) { s.hx += s.dir * s.walk * dt; if (s.hx > 820 || s.hx < 140) s.dir = -s.dir; }
    s.spawnT -= dt;
    while (s.spawnT <= 0) { s.drops.push({ x: s.hx + (c.rng() - 0.5) * 420, y: -20, vy: 500 + c.rng() * 150 }); s.spawnT += s.rate; }
    const ux = c.input.x, uy = c.input.y;
    for (const d of s.drops) {
      d.y += d.vy * dt;
      if (Math.abs(d.x - ux) < 85 && d.y > uy - 30 && d.y < uy + 5) d.dead = true;
      else if (!d.dead && !s.lost && !c.over && Math.abs(d.x - s.hx) < 26 && d.y > GROUND - 90 && d.y < GROUND) { d.dead = true; s.lost = true; c.sfx.splat(); }
    }
    s.drops = s.drops.filter(d => !d.dead && d.y < GROUND);
  },

  draw(s, g, c) {
    g.fillStyle = '#6c757d'; g.fillRect(0, 0, W, H);
    g.fillStyle = '#495057'; for (let x = 0; x < W; x += 140) g.fillRect(x, 150, 90, GROUND - 150);
    Draw.ground(g, GROUND, '#343a40', '#adb5bd');
    g.strokeStyle = '#90e0ef'; g.lineWidth = 3;
    for (const d of s.drops) { g.beginPath(); g.moveTo(d.x, d.y - 14); g.lineTo(d.x, d.y); g.stroke(); }
    Draw.hero(g, s.hx, GROUND, { face: s.dir, run: s.t * 12, shirt: s.lost ? '#4cc9f0' : '#ffd400' });
    if (s.lost) Draw.text(g, 'TOUT MOUILLÉ !', s.hx, 250, 40, '#4cc9f0');
    const ux = c.input.x, uy = c.input.y;
    g.strokeStyle = '#1a1a1a'; g.lineWidth = 6; g.beginPath(); g.moveTo(ux, uy); g.lineTo(ux, uy + 90); g.arc(ux - 10, uy + 90, 10, 0, Math.PI); g.stroke();
    g.beginPath(); g.moveTo(ux - 90, uy); g.quadraticCurveTo(ux, uy - 90, ux + 90, uy); g.closePath(); Draw.fillStroke(g, '#ef233c');
  },
});
