// SOURIS : cliquer sur le ballon pour le garder en l'air
Engine.register({
  id: 'jongle', name: 'Jongles', icon: '⚽', instruction: 'JONGLE !', input: 'souris',
  hint: 'CLIQUE SUR LE BALLON POUR LE RENVOYER', duration: 5, survival: true, cursor: 'pointer',

  start(c) { return { t: 0, x: W / 2, y: 150, vx: 0, vy: 0, grav: 900 + 80 * Math.min(c.diff, 6), rot: 0, kicks: 0 }; },

  update(s, dt, c) {
    s.t += dt;
    if (s.lost) return;
    s.vy += s.grav * dt;
    s.x += s.vx * dt; s.y += s.vy * dt; s.rot += s.vx * dt * 0.02;
    if (s.x < 40) { s.x = 40; s.vx = Math.abs(s.vx); } if (s.x > W - 40) { s.x = W - 40; s.vx = -Math.abs(s.vx); }
    if (!c.over && c.input.clicked && Math.hypot(c.input.x - s.x, c.input.y - s.y) < 55) {
      s.vy = -650; s.vx = (s.x - c.input.x) * 8 + (c.rng() - 0.5) * 200; s.kicks++;
      c.sfx.tone(300, 0.06, 'square', 0.1);
    }
    if (s.y > 440 && !c.over) { s.lost = true; s.y = 440; c.sfx.thump(); }
  },

  draw(s, g) {
    Draw.sky(g, '#48cae4', '#ade8f4', 440);
    Draw.ground(g, 440, '#52b788', '#40916c');
    g.fillStyle = '#fff'; g.fillRect(0, 480, W, 6);
    g.save(); g.translate(s.x, s.y); g.rotate(s.rot);
    Draw.circle(g, 0, 0, 34); Draw.fillStroke(g, '#fff');
    g.beginPath(); for (let i = 0; i < 5; i++) { const a = -Math.PI / 2 + i * Math.PI * 0.4; g.lineTo(Math.cos(a) * 13, Math.sin(a) * 13); } g.closePath(); g.fillStyle = '#1a1a1a'; g.fill();
    g.restore();
    Draw.ellipse(g, s.x, 448, 30 * (s.y / 440), 6); g.fillStyle = 'rgba(0,0,0,0.25)'; g.fill();
    Draw.text(g, String(s.kicks), W - 70, 60, 50);
  },
});
