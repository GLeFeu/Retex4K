// MOLETTE (rythme) : touiller la soupe à vitesse régulière, ni trop lent ni trop vite
Engine.register({
  id: 'melange', name: 'Touille la soupe', icon: '🍲', instruction: 'MÉLANGE !', input: 'molette',
  hint: 'TOURNE RÉGULIÈREMENT (PAS TROP VITE)', duration: 5,

  start(c) { return { t: 0, hist: [], rate: 0, good: 0, need: 1.6 + 0.1 * Math.min(c.diff, 6), spill: 0, a: 0, splash: [] }; },

  update(s, dt, c) {
    s.t += dt;
    if (!c.over && c.input.wheelNotches) s.hist.push({ t: s.t, n: c.input.wheelNotches });
    s.hist = s.hist.filter(h => s.t - h.t < 0.6);
    const raw = s.hist.reduce((a, h) => a + h.n, 0) / 0.6;
    s.rate += (raw - s.rate) * Math.min(1, dt * 6);
    s.a += s.rate * 0.6 * dt;
    for (const p of s.splash) { p.vy += 900 * dt; p.x += p.vx * dt; p.y += p.vy * dt; }
    if (s.won || s.lost || c.over) return;
    if (s.rate > 4 && s.rate < 16) s.good += dt;
    if (s.rate >= 16) {
      s.spill += dt;
      if (Math.random() < dt * 20) s.splash.push({ x: 480 + (Math.random() - 0.5) * 300, y: 250, vx: (Math.random() - 0.5) * 300, vy: -300 - Math.random() * 200 });
      if (s.spill > 0.5) { s.lost = true; c.sfx.splat(); }
    } else s.spill = Math.max(0, s.spill - dt);
    if (s.good >= s.need) s.won = true;
  },

  draw(s, g) {
    g.fillStyle = '#ffe8d6'; g.fillRect(0, 0, W, H);
    g.fillStyle = '#ddbea9'; for (let x = 0; x < W; x += 80) for (let y = 0; y < 300; y += 80) g.fillRect(x + ((y / 80) % 2) * 40, y, 38, 38);
    g.fillStyle = '#6c757d'; g.fillRect(0, 420, W, 120);
    // marmite
    Draw.ellipse(g, 480, 260, 200, 50); Draw.fillStroke(g, '#2b2d42');
    g.beginPath(); g.moveTo(280, 260); g.lineTo(300, 430); g.quadraticCurveTo(480, 470, 660, 430); g.lineTo(680, 260); Draw.fillStroke(g, '#2b2d42');
    Draw.ellipse(g, 480, 262, 182, 40); g.fillStyle = s.lost ? '#9d0208' : '#e76f51'; g.fill();
    for (let i = 0; i < 6; i++) { const a = s.a + i; Draw.circle(g, 480 + Math.cos(a) * 120, 262 + Math.sin(a) * 26, 10); g.fillStyle = ['#ffd166', '#80b918'][i % 2]; g.fill(); }
    // cuillère
    const sx = 480 + Math.cos(s.a * 1.3) * 110, sy = 262 + Math.sin(s.a * 1.3) * 22;
    g.lineCap = 'round'; g.lineWidth = 16; g.strokeStyle = '#1a1a1a'; g.beginPath(); g.moveTo(sx, sy); g.lineTo(sx + 60, sy - 200); g.stroke();
    g.lineWidth = 10; g.strokeStyle = '#bc6c25'; g.stroke();
    for (const p of s.splash) { Draw.circle(g, p.x, p.y, 8); g.fillStyle = '#e76f51'; g.fill(); }
    // jauge de vitesse
    const zx = 260, zw = 440, k = clamp(s.rate / 22, 0, 1);
    Draw.rrect(g, zx, 480, zw, 30, 15); Draw.fillStroke(g, '#fff');
    g.fillStyle = 'rgba(6,214,160,0.5)'; g.fillRect(zx + zw * 4 / 22, 483, zw * 12 / 22, 24);
    g.fillStyle = '#1a1a1a'; g.fillRect(zx + zw * k - 3, 474, 6, 42);
    const p = clamp(s.good / s.need, 0, 1);
    Draw.text(g, `${Math.floor(p * 100)}%`, 800, 60, 44);
    if (s.rate >= 16) Draw.text(g, 'TROP VITE !', 480, 120, 50, '#ef233c');
  },
});
