// CURSEUR : chercher le chat caché dans le noir avec la lampe torche
Engine.register({
  id: 'lampe', name: 'Lampe torche', icon: '🔦', instruction: 'TROUVE LE CHAT !', input: 'curseur',
  hint: 'ÉCLAIRE LE CHAT PENDANT UN INSTANT', duration: 5, cursor: 'none',

  start(c) {
    const props = Array.from({ length: 10 }, () => ({ x: 60 + c.rng() * 840, y: 120 + c.rng() * 360, k: Math.floor(c.rng() * 3) }));
    return { t: 0, cx: 100 + c.rng() * 760, cy: 200 + c.rng() * 260, seen: 0, props, light: Math.max(70, 110 - 6 * c.diff) };
  },

  update(s, dt, c) {
    s.t += dt;
    if (s.won || c.over) return;
    if (Math.hypot(c.input.x - s.cx, c.input.y - (s.cy - 50)) < s.light * 0.8) s.seen += dt; else s.seen = 0;
    if (s.seen > 0.35) { s.won = true; c.sfx.tone(800, 0.2, 'triangle', 0.1); }
  },

  draw(s, g, c) {
    g.fillStyle = '#7f5539'; g.fillRect(0, 0, W, H);
    g.fillStyle = '#9c6644'; for (let x = 0; x < W; x += 70) g.fillRect(x, 0, 35, H);
    for (const p of s.props) {
      if (p.k === 0) { Draw.rrect(g, p.x - 40, p.y - 30, 80, 60, 4); Draw.fillStroke(g, '#d4a373'); }
      else if (p.k === 1) { Draw.circle(g, p.x, p.y, 30); Draw.fillStroke(g, '#ef233c'); }
      else { Draw.rrect(g, p.x - 15, p.y - 50, 30, 60, 6); Draw.fillStroke(g, '#3a86ff'); }
    }
    Draw.cat(g, s.cx, s.cy, { t: s.t, col: '#adb5bd', scale: 0.8 });
    // obscurité avec un trou de lumière
    const { x, y } = c.input;
    g.save();
    g.beginPath(); g.rect(0, 0, W, H); g.arc(x, y, s.won ? 2000 : s.light, 0, Math.PI * 2, true);
    g.fillStyle = 'rgba(5,5,15,0.97)'; g.fill();
    g.restore();
    const gr = g.createRadialGradient(x, y, s.light * 0.5, x, y, s.light);
    gr.addColorStop(0, 'rgba(255,240,180,0)'); gr.addColorStop(1, 'rgba(5,5,15,0.6)');
    if (!s.won) { g.fillStyle = gr; Draw.circle(g, x, y, s.light); g.fill(); }
    if (s.won) Draw.text(g, 'MIAOU !', s.cx, s.cy - 150, 50, '#ffd400');
  },
});
