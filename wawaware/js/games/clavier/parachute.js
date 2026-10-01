// CLAVIER (← →) : diriger le parachutiste pour atterrir sur la cible
Engine.register({
  id: 'parachute', name: 'Parachute', icon: '🪂', instruction: 'ATTERRIS SUR LA CIBLE !', input: 'clavier',
  hint: '← → POUR TE DIRIGER', duration: 5, GROUND_Y: 460,

  start(c) {
    const tx = 120 + c.rng() * 720;
    return { t: 0, x: tx < W / 2 ? 800 : 160, y: 40, vx: 0, tx, tw: Math.max(70, 130 - 8 * c.diff), wind: (c.rng() - 0.5) * 40 * Math.min(c.diff, 5), fall: 80 };
  },

  update(s, dt, c) {
    s.t += dt;
    if (s.won || s.lost) return;
    let dir = 0;
    if (!c.over) { if (c.input.isDown('ArrowLeft', 'KeyA')) dir -= 1; if (c.input.isDown('ArrowRight', 'KeyD')) dir += 1; }
    s.vx += (dir * 300 - s.vx) * Math.min(1, dt * 3);
    s.x = clamp(s.x + (s.vx + s.wind) * dt, 30, W - 30);
    s.y += s.fall * dt;
    if (s.y >= this.GROUND_Y) {
      s.y = this.GROUND_Y;
      if (Math.abs(s.x - s.tx) < s.tw / 2) { s.won = true; c.sfx.tone(800, 0.2, 'square', 0.1); } else { s.lost = true; c.sfx.splat(); }
    }
  },

  draw(s, g) {
    Draw.sky(g, '#48cae4', '#caf0f8', this.GROUND_Y);
    Draw.cloud(g, 200, 140); Draw.cloud(g, 700, 220, 0.8);
    Draw.ground(g, this.GROUND_Y, '#74c69d', '#52b788');
    Draw.ellipse(g, s.tx, this.GROUND_Y + 10, s.tw / 2, 16); Draw.fillStroke(g, '#fff');
    Draw.ellipse(g, s.tx, this.GROUND_Y + 10, s.tw / 4, 8); g.fillStyle = '#ef233c'; g.fill();
    if (s.wind) Draw.text(g, s.wind > 0 ? 'VENT →' : '← VENT', W / 2, 40, 30, '#fff');
    const sway = s.won || s.lost ? 0 : Math.sin(s.t * 3) * 0.1 - s.vx * 0.0006;
    g.save(); g.translate(s.x, s.y); g.rotate(sway);
    if (!s.won && !s.lost) {
      g.strokeStyle = '#1a1a1a'; g.lineWidth = 2;
      g.beginPath(); g.moveTo(-60, -110); g.lineTo(0, -60); g.lineTo(60, -110); g.stroke();
      g.beginPath(); g.arc(0, -110, 62, Math.PI, 0); g.closePath(); Draw.fillStroke(g, '#ff006e');
      g.fillStyle = '#ffbe0b'; g.beginPath(); g.arc(0, -110, 62, Math.PI * 1.33, Math.PI * 1.66); g.lineTo(0, -110); g.fill();
    }
    Draw.hero(g, 0, 10, { rot: s.lost ? 1.4 : 0 });
    g.restore();
  },
});
