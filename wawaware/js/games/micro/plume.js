// MICRO (dosage) : souffler pour garder la plume en l'air, loin des piques
Engine.register({
  id: 'plume',
  name: 'Plume flottante',
  icon: '🪶',
  instruction: 'FAIS-LA FLOTTER !',
  input: 'micro',
  hint: 'SOUFFLE POUR QU\'ELLE NE TOMBE PAS',
  duration: 5,
  survival: true,
  needsMic: true,
  micThreshold: 0.15,
  SPIKES: 430,

  start(c) {
    return { t: 0, y: 180, vy: 0, grav: 160 + 25 * Math.min(c.diff, 6), lvl: 0 };
  },

  update(s, dt, c) {
    s.t += dt;
    s.lvl = c.input.mic.level;
    if (s.lost) { return; }
    const up = !c.over && s.lvl > this.micThreshold ? s.lvl * 900 : 0;
    s.vy += (s.grav - up) * dt;
    s.vy *= 1 - 1.5 * dt;
    s.vy = clamp(s.vy, -400, 250);
    s.y += s.vy * dt;
    if (s.y < 50) { s.y = 50; s.vy = 0; }
    if (s.y > this.SPIKES - 20 && !c.over) { s.lost = true; c.sfx.hit(); }
  },

  draw(s, g) {
    const sky = g.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, '#cdb4db'); sky.addColorStop(1, '#ffc8dd');
    g.fillStyle = sky; g.fillRect(0, 0, W, H);
    // vent
    if (s.lvl > this.micThreshold) {
      g.strokeStyle = 'rgba(255,255,255,0.7)'; g.lineWidth = 4;
      for (let i = 0; i < 6; i++) {
        const y = 520 - ((s.t * 400 + i * 90) % 450);
        g.beginPath(); g.moveTo(380 + i * 35, y); g.lineTo(380 + i * 35, y - 40 * s.lvl); g.stroke();
      }
    }
    // piques
    g.fillStyle = '#495057';
    g.fillRect(0, this.SPIKES + 30, W, H);
    g.beginPath();
    for (let x = 0; x < W; x += 40) { g.moveTo(x, this.SPIKES + 30); g.lineTo(x + 20, this.SPIKES); g.lineTo(x + 40, this.SPIKES + 30); }
    Draw.fillStroke(g, '#adb5bd', '#1a1a1a', 3);

    const x = W / 2 + Math.sin(s.t * 2) * 80;
    g.save();
    g.translate(x, s.y);
    g.rotate(Math.sin(s.t * 2 + 1) * 0.5 + (s.lost ? 1.2 : 0));
    g.beginPath(); g.moveTo(0, 45); g.quadraticCurveTo(-30, 0, 0, -50); g.quadraticCurveTo(30, 0, 0, 45); g.closePath();
    Draw.fillStroke(g, '#fff', '#1a1a1a', 3);
    g.strokeStyle = '#1a1a1a'; g.lineWidth = 3;
    g.beginPath(); g.moveTo(0, 60); g.quadraticCurveTo(3, 0, 0, -45); g.stroke();
    g.lineWidth = 1.5;
    for (let k = -30; k < 35; k += 10) { g.beginPath(); g.moveTo(1, k); g.lineTo(-14, k - 10); g.moveTo(1, k); g.lineTo(14, k - 10); g.stroke(); }
    g.restore();
  },
});
