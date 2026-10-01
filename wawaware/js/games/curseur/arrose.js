// CURSEUR : déplacer le nuage au-dessus de chaque plante pour la faire pousser
Engine.register({
  id: 'arrose', name: 'Petit nuage', icon: '🌧️', instruction: 'ARROSE !', input: 'curseur',
  hint: 'GARDE LE NUAGE AU-DESSUS DES PLANTES', duration: 5, cursor: 'none',

  start(c) {
    const n = c.diff >= 3 ? 4 : 3;
    return { t: 0, plants: Array.from({ length: n }, (_, i) => ({ x: 150 + i * (660 / (n - 1)), g: 0 })), rate: Math.max(0.9, 1.4 - 0.08 * c.diff), drops: [] };
  },

  update(s, dt, c) {
    s.t += dt;
    const x = c.input.x;
    if (!c.over) for (const p of s.plants) if (Math.abs(p.x - x) < 70 && p.g < 1) p.g = Math.min(1, p.g + s.rate * dt);
    if (Math.random() < dt * 40) s.drops.push({ x: x + (Math.random() - 0.5) * 120, y: 110 });
    for (const d of s.drops) d.y += 600 * dt;
    s.drops = s.drops.filter(d => d.y < 430);
    if (!s.won && s.plants.every(p => p.g >= 1)) s.won = true;
  },

  draw(s, g, c) {
    Draw.sky(g, '#ffd6a5', '#fdffb6', 430);
    Draw.ground(g, 430, '#9c6644', '#7f5539');
    g.strokeStyle = '#4cc9f0'; g.lineWidth = 3;
    for (const d of s.drops) { g.beginPath(); g.moveTo(d.x, d.y); g.lineTo(d.x, d.y + 12); g.stroke(); }
    for (const p of s.plants) {
      const h = 20 + p.g * 140;
      g.strokeStyle = '#2d6a4f'; g.lineWidth = 8; g.beginPath(); g.moveTo(p.x, 430); g.lineTo(p.x, 430 - h); g.stroke();
      Draw.ellipse(g, p.x - 20, 430 - h * 0.5, 18, 8, -0.5); Draw.fillStroke(g, '#52b788', '#1a1a1a', 2);
      Draw.ellipse(g, p.x + 20, 430 - h * 0.7, 18, 8, 0.5); Draw.fillStroke(g, '#52b788', '#1a1a1a', 2);
      if (p.g >= 1) for (let i = 0; i < 5; i++) { const a = i * 1.256 + s.t; Draw.circle(g, p.x + Math.cos(a) * 20, 430 - h + Math.sin(a) * 20, 13); Draw.fillStroke(g, '#ff6b9d', '#1a1a1a', 2); }
      Draw.rrect(g, p.x - 30, 440, 60, 10, 5); g.fillStyle = '#1a1a1a'; g.fill();
      Draw.rrect(g, p.x - 30, 440, 60 * p.g, 10, 5); g.fillStyle = '#06d6a0'; g.fill();
    }
    const x = c.input.x;
    Draw.cloud(g, x, 80, 1.4);
    Draw.circle(g, x - 14, 84, 4); Draw.circle(g, x + 14, 84, 4); g.fillStyle = '#1a1a1a'; g.fill();
  },
});
