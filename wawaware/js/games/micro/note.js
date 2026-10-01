// MICRO : tenir un son ("aaaaah") sans s'arrêter pendant un moment
Engine.register({
  id: 'note', name: 'Tiens la note', icon: '🎤', instruction: 'AAAAAAH !', input: 'micro',
  hint: 'FAIS « AAAAH » SANS T\'ARRÊTER', duration: 5, needsMic: true, micThreshold: 0.25,

  start(c) { return { t: 0, hold: 0, gap: 0, need: 1.5 + 0.15 * Math.min(c.diff, 6), lvl: 0, notes: [] }; },

  update(s, dt, c) {
    s.t += dt;
    s.lvl = c.input.mic.level;
    for (const n of s.notes) { n.y -= 90 * dt; n.x += Math.sin(n.y / 20) * 2; n.life -= dt; }
    s.notes = s.notes.filter(n => n.life > 0);
    if (s.won || c.over) return;
    if (s.lvl > this.micThreshold) {
      s.hold += dt; s.gap = 0;
      if (Math.random() < dt * 6) s.notes.push({ x: 420, y: 240, life: 1.5 });
    } else { s.gap += dt; if (s.gap > 0.15) s.hold = 0; }
    if (s.hold >= s.need) s.won = true;
  },

  draw(s, g) {
    Draw.stripes(g, s.t * 0.4, '#240046', '#3c096c');
    // projecteur
    const gr = g.createRadialGradient(360, 420, 10, 360, 420, 280);
    gr.addColorStop(0, 'rgba(255,240,180,0.6)'); gr.addColorStop(1, 'rgba(255,240,180,0)');
    g.fillStyle = gr; g.fillRect(0, 0, W, H);
    Draw.ground(g, 460, '#7f5539', '#582f0e');
    const singing = s.lvl > this.micThreshold;
    Draw.hero(g, 360, 470, { shirt: '#ff006e', pants: '#1a1a1a' });
    if (singing) { Draw.ellipse(g, 384, 418, 7, 9); g.fillStyle = '#1a1a1a'; g.fill(); }
    g.fillStyle = '#1a1a1a'; g.fillRect(420, 380, 6, 90);
    Draw.ellipse(g, 423, 375, 10, 14); Draw.fillStroke(g, '#adb5bd');
    for (const n of s.notes) { g.globalAlpha = Math.min(1, n.life); Draw.text(g, '♪', n.x, n.y, 44, '#ffd400'); }
    g.globalAlpha = 1;
    const k = clamp(s.hold / s.need, 0, 1);
    Draw.rrect(g, 560, 120, 330, 40, 20); Draw.fillStroke(g, '#fff');
    if (k > 0.02) { Draw.rrect(g, 564, 124, 322 * k, 32, 16); g.fillStyle = '#06d6a0'; g.fill(); }
    Draw.text(g, s.won ? 'BRAVISSIMO !' : 'TIENS… TIENS…', 725, 210, 36, '#fff');
  },
});
