// MICRO : crier très fort pour réveiller le gros dormeur
Engine.register({
  id: 'reveil', name: 'Debout là-dedans !', icon: '⏰', instruction: 'RÉVEILLE-LE !', input: 'micro',
  hint: 'CRIE TRÈS FORT !', duration: 5, needsMic: true, micThreshold: 0.55,

  start(c) { return { t: 0, wake: 0, need: 0.8 + 0.1 * Math.min(c.diff, 6), lvl: 0 }; },

  update(s, dt, c) {
    s.t += dt;
    s.lvl = c.input.mic.level;
    if (s.won || c.over) return;
    if (s.lvl > this.micThreshold) s.wake += dt; else s.wake = Math.max(0, s.wake - dt * 0.3);
    if (s.wake >= s.need) { s.won = true; c.sfx.tone(880, 0.3, 'square', 0.1); }
  },

  draw(s, g) {
    g.fillStyle = '#3d405b'; g.fillRect(0, 0, W, H);
    g.fillStyle = '#81b29a'; g.fillRect(0, 0, W, 300);
    Draw.ground(g, 430, '#e07a5f', '#c8553d');
    // lit
    Draw.rrect(g, 180, 320, 600, 90, 16); Draw.fillStroke(g, '#f2cc8f');
    Draw.rrect(g, 160, 230, 40, 200, 10); Draw.fillStroke(g, '#9c6644');
    Draw.rrect(g, 760, 280, 40, 150, 10); Draw.fillStroke(g, '#9c6644');
    const k = clamp(s.wake / s.need, 0, 1);
    if (s.won) {
      g.save(); g.translate(480, 330); g.rotate(-0.1);
      Draw.hero(g, 0, 0, { shirt: '#fff', pants: '#3a86ff' });
      g.restore();
      Draw.text(g, 'HEIN ?! QUOI ?!', 480, 150, 50, '#ffd400');
    } else {
      Draw.rrect(g, 260, 290, 420, 70, 30); Draw.fillStroke(g, '#3a86ff');
      Draw.circle(g, 240, 300, 34); Draw.fillStroke(g, '#ffcf9e');
      g.strokeStyle = '#1a1a1a'; g.lineWidth = 3; g.beginPath(); g.arc(250, 296, 7, 0.2, Math.PI - 0.2); g.stroke();
      Draw.ellipse(g, 236, 318, 6 + Math.sin(s.t * 3) * 3, 5); g.fillStyle = '#1a1a1a'; g.fill();
      Draw.text(g, 'Z', 300 + Math.sin(s.t * 2) * 10, 230 - (s.t * 30) % 60, 40, '#fff');
      Draw.text(g, 'RONFL…', 600, 200, 36, '#fff');
    }
    // jauge de réveil
    Draw.rrect(g, 300, 470, 360, 34, 17); Draw.fillStroke(g, '#fff');
    if (k > 0.02) { Draw.rrect(g, 304, 474, 352 * k, 26, 13); g.fillStyle = '#ef233c'; g.fill(); }
    // réveil qui tremble
    const sh = s.lvl > this.micThreshold ? (Math.random() - 0.5) * 10 : 0;
    Draw.circle(g, 850 + sh, 120, 50); Draw.fillStroke(g, '#ef233c');
    Draw.circle(g, 850 + sh, 120, 38); Draw.fillStroke(g, '#fff', '#1a1a1a', 3);
  },
});
