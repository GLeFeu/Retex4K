// CLAVIER (maintenir Espace) : poser la fusée en douceur sur la plateforme
Engine.register({
  id: 'atterris', name: 'Alunissage', icon: '🛸', instruction: 'ATTERRIS !', input: 'clavier',
  hint: 'MAINTIENS ESPACE POUR FREINER', duration: 6, PAD: 470,

  start(c) { return { t: 0, y: 60, vy: 40, grav: 260 + 20 * Math.min(c.diff, 6), fuel: 1, thrust: false, landed: false, safe: 110 }; },

  update(s, dt, c) {
    s.t += dt;
    if (s.won || s.lost) return;
    s.thrust = !c.over && s.fuel > 0 && c.input.isDown('Space', 'ArrowUp', 'KeyW');
    if (s.thrust) { s.vy -= 620 * dt; s.fuel = Math.max(0, s.fuel - dt * 0.35); }
    s.vy += s.grav * dt;
    s.y += s.vy * dt;
    if (s.y < 30) { s.y = 30; s.vy = 0; }
    if (s.y >= this.PAD - 40) {
      s.y = this.PAD - 40;
      if (s.vy < s.safe) { s.won = true; c.sfx.tone(700, 0.2, 'sine', 0.1); } else { s.lost = true; c.sfx.hit(); }
    }
  },

  draw(s, g) {
    g.fillStyle = '#03071e'; g.fillRect(0, 0, W, H);
    for (let i = 0; i < 60; i++) { Draw.circle(g, (i * 157) % W, (i * 83) % 420, 1 + (i % 3) * 0.6); g.fillStyle = '#fff'; g.fill(); }
    g.fillStyle = '#6c757d'; g.beginPath(); g.moveTo(0, H); for (let x = 0; x <= W; x += 40) g.lineTo(x, 480 + Math.sin(x / 50) * 20); g.lineTo(W, H); g.fill();
    Draw.rrect(g, 400, this.PAD, 160, 18, 4); Draw.fillStroke(g, '#ffd400');
    g.save(); g.translate(480, s.y);
    if (s.lost) Draw.burst(g, 0, 0, 80);
    else {
      if (s.thrust) { g.beginPath(); g.moveTo(-14, 30); g.lineTo(0, 70 + Math.random() * 20); g.lineTo(14, 30); g.fillStyle = '#ff7b00'; g.fill(); }
      g.strokeStyle = '#adb5bd'; g.lineWidth = 5; g.beginPath(); g.moveTo(-20, 20); g.lineTo(-38, 42); g.moveTo(20, 20); g.lineTo(38, 42); g.stroke();
      Draw.ellipse(g, 0, 0, 44, 28); Draw.fillStroke(g, '#e9ecef');
      Draw.ellipse(g, 0, -14, 22, 18); Draw.fillStroke(g, '#4cc9f0', '#1a1a1a', 3);
    }
    g.restore();
    // vitesse
    const danger = s.vy > s.safe;
    Draw.text(g, `VITESSE ${Math.max(0, Math.round(s.vy))}`, 160, 50, 30, danger ? '#ef233c' : '#06d6a0');
    Draw.rrect(g, 780, 30, 140, 24, 12); Draw.fillStroke(g, '#fff');
    if (s.fuel > 0.02) { Draw.rrect(g, 783, 33, 134 * s.fuel, 18, 9); g.fillStyle = '#ffd400'; g.fill(); }
    Draw.text(g, 'CARBURANT', 850, 72, 18, '#fff', null);
  },
});
