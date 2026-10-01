// MICRO (silence) : ne pas faire de bruit pour ne pas réveiller le bébé
Engine.register({
  id: 'chut',
  name: 'Chut, bébé dort',
  icon: '👶',
  instruction: 'CHUT !',
  input: 'micro',
  hint: 'PAS UN BRUIT...',
  duration: 4,
  survival: true,
  needsMic: true,
  micThreshold: 0.45,
  micInvert: true,

  start() {
    return { t: 0, noise: 0, zz: [], zzT: 0 };
  },

  update(s, dt, c) {
    s.t += dt;
    if (!s.lost && !c.over) {
      if (c.input.mic.level > this.micThreshold) s.noise += dt; else s.noise = Math.max(0, s.noise - dt * 0.5);
      if (s.noise > 0.12) { s.lost = true; c.sfx.lose(); }
    }
    s.zzT -= dt;
    if (!s.lost && s.zzT <= 0) { s.zz.push({ x: 560, y: 260, life: 1.5 }); s.zzT = 0.5; }
    for (const z of s.zz) { z.x += 30 * dt; z.y -= 50 * dt; z.life -= dt; }
    s.zz = s.zz.filter(z => z.life > 0);
  },

  draw(s, g) {
    g.fillStyle = '#22223b'; g.fillRect(0, 0, W, H);
    // fenêtre + lune
    Draw.rrect(g, 680, 60, 180, 160, 10); Draw.fillStroke(g, '#14213d', '#9a8c98', 10);
    Draw.circle(g, 770, 130, 40); g.fillStyle = '#fefae0'; g.fill();
    Draw.circle(g, 790, 115, 36); g.fillStyle = '#14213d'; g.fill();
    g.fillStyle = '#4a4e69'; g.fillRect(0, 440, W, H - 440);

    const shake = s.lost ? Math.sin(s.t * 60) * 4 : 0;
    // berceau
    Draw.rrect(g, 260, 300, 440, 150, 30); Draw.fillStroke(g, '#c9ada7');
    // bébé
    const bx = 480 + shake, by = 300;
    Draw.ellipse(g, bx + 70, by + 10, 120, 50); Draw.fillStroke(g, '#a2d2ff');
    Draw.circle(g, bx - 70, by - 10, 55); Draw.fillStroke(g, '#ffd6a5');
    g.strokeStyle = '#1a1a1a'; g.lineWidth = 4;
    if (s.lost) {
      Draw.circle(g, bx - 90, by - 22, 8); g.fillStyle = '#1a1a1a'; g.fill();
      Draw.circle(g, bx - 50, by - 22, 8); g.fill();
      Draw.ellipse(g, bx - 70, by + 18, 18, 14); Draw.fillStroke(g, '#6a040f');
      g.fillStyle = '#4cc9f0';
      Draw.circle(g, bx - 100, by + (s.t * 200) % 60, 6); g.fill();
      Draw.circle(g, bx - 40, by + (s.t * 200 + 30) % 60, 6); g.fill();
      Draw.text(g, 'OUIIIIN !', bx - 70, by - 110, 60, '#ef233c');
    } else {
      g.beginPath(); g.arc(bx - 90, by - 22, 8, 0.2, Math.PI - 0.2); g.stroke();
      g.beginPath(); g.arc(bx - 50, by - 22, 8, 0.2, Math.PI - 0.2); g.stroke();
      Draw.circle(g, bx - 70, by + 14, 10); Draw.fillStroke(g, '#ff8fa3', '#1a1a1a', 3);
    }
    Draw.circle(g, bx - 70, by - 64, 8); g.fillStyle = '#e09f3e'; g.fill();
    // barreaux
    g.fillStyle = '#9a8c98';
    for (let x = 270; x < 700; x += 40) g.fillRect(x, 250, 10, 120);
    g.fillRect(260, 245, 440, 12);
    for (const z of s.zz) { g.globalAlpha = Math.min(1, z.life); Draw.text(g, 'Z', z.x, z.y, 30 + (1.5 - z.life) * 20, '#fff'); }
    g.globalAlpha = 1;
  },
});
