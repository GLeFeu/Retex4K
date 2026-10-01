// MOLETTE : mouliner pour remonter le poisson (qui tire de temps en temps)
Engine.register({
  id: 'peche',
  name: 'Partie de pêche',
  icon: '🎣',
  instruction: 'MOULINE !',
  input: 'molette',
  hint: 'TOURNE LA MOLETTE POUR REMONTER',
  duration: 5,
  WATER: 230,

  start(c) {
    return { t: 0, dist: 1, need: 14 + 3 * Math.min(c.diff, 6), tugT: 0.6 + c.rng() * 0.5, tug: 0, crank: 0, caughtT: 0, pull: 0.3 + 0.05 * c.diff };
  },

  update(s, dt, c) {
    s.t += dt;
    if (s.won) { s.caughtT += dt; return; }
    const n = c.over ? 0 : c.input.wheelNotches;
    if (n > 0) { s.dist -= n / s.need; s.crank += n * 0.8; c.sfx.tone(600, 0.03, 'triangle', 0.05); }
    s.tugT -= dt;
    if (s.tugT <= 0) { s.tug = 0.35; s.tugT = 0.8 + c.rng() * 0.6; c.sfx.tone(200, 0.15, 'sawtooth', 0.06); }
    if (s.tug > 0) { s.tug -= dt; s.dist += s.pull * dt * 1.5; }
    s.dist = Math.min(1, s.dist);
    if (s.dist <= 0) { s.won = true; c.sfx.splat(); }
  },

  draw(s, g) {
    const sky = g.createLinearGradient(0, 0, 0, this.WATER);
    sky.addColorStop(0, '#ffb4a2'); sky.addColorStop(1, '#ffe5d9');
    g.fillStyle = sky; g.fillRect(0, 0, W, this.WATER);
    const sea = g.createLinearGradient(0, this.WATER, 0, H);
    sea.addColorStop(0, '#0096c7'); sea.addColorStop(1, '#023e8a');
    g.fillStyle = sea; g.fillRect(0, this.WATER, W, H - this.WATER);
    g.strokeStyle = 'rgba(255,255,255,0.5)'; g.lineWidth = 3;
    g.beginPath();
    for (let x = 0; x <= W; x += 20) g.lineTo(x, this.WATER + Math.sin(x / 30 + s.t * 3) * 4);
    g.stroke();

    // ponton + pêcheur
    g.fillStyle = '#7f5539'; g.fillRect(0, 200, 260, 26);
    g.fillRect(40, 226, 16, 200); g.fillRect(200, 226, 16, 200);
    Draw.hero(g, 150, 200, {});
    const tipX = 470, tipY = 70;
    g.strokeStyle = '#1a1a1a'; g.lineWidth = 7; g.lineCap = 'round';
    g.beginPath(); g.moveTo(170, 160); g.lineTo(tipX, tipY); g.stroke();
    g.strokeStyle = '#bc6c25'; g.lineWidth = 4; g.stroke();
    Draw.circle(g, 195, 150, 14); Draw.fillStroke(g, '#adb5bd', '#1a1a1a', 3);
    g.strokeStyle = '#1a1a1a'; g.lineWidth = 3;
    g.beginPath(); g.moveTo(195, 150); g.lineTo(195 + Math.cos(s.crank) * 14, 150 + Math.sin(s.crank) * 14); g.stroke();

    // poisson
    let fx = 480 + (s.tug > 0 ? Math.sin(s.t * 60) * 10 : Math.sin(s.t * 3) * 15);
    let fy = this.WATER + 50 + Math.max(0, s.dist) * 240;
    if (s.won) { fx = tipX; fy = tipY + 40 - Math.sin(Math.min(1, s.caughtT * 3) * Math.PI) * 30; }
    g.strokeStyle = '#fff'; g.lineWidth = 2;
    g.beginPath(); g.moveTo(tipX, tipY); g.lineTo(fx, fy - 10); g.stroke();
    g.save();
    g.translate(fx, fy);
    g.rotate(s.won ? Math.sin(s.caughtT * 20) * 0.4 : Math.PI / 2 * 0.7);
    g.beginPath(); g.moveTo(-34, 0); g.lineTo(-58, -18); g.lineTo(-58, 18); g.closePath(); Draw.fillStroke(g, '#fb8500');
    Draw.ellipse(g, 0, 0, 38, 22); Draw.fillStroke(g, '#ffb703');
    Draw.circle(g, 20, -5, 5); g.fillStyle = '#1a1a1a'; g.fill();
    g.restore();
    if (s.tug > 0 && !s.won) Draw.text(g, 'IL TIRE !', 640, 300, 40, '#ef233c');

    // jauge de distance
    Draw.rrect(g, W - 70, 260, 30, 240, 12); Draw.fillStroke(g, 'rgba(255,255,255,0.4)');
    const h = 232 * (1 - Math.max(0, s.dist));
    if (h > 1) { Draw.rrect(g, W - 66, 496 - h, 22, h, 8); g.fillStyle = '#06d6a0'; g.fill(); }
  },
});
