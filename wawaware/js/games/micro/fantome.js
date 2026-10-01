// MICRO (réflexe) : crier quand le fantôme apparaît, mais pas avant !
Engine.register({
  id: 'fantome', name: 'Bouh !', icon: '👻', instruction: 'FAIS-LUI PEUR !', input: 'micro',
  hint: 'CRIE QUAND IL SORT… PAS AVANT !', duration: 5, needsMic: true, micThreshold: 0.5,
  WINDOWS: [[200, 180], [480, 180], [760, 180], [340, 350], [620, 350]],

  start(c) {
    return { t: 0, appear: 1 + c.rng() * 2, where: Math.floor(c.rng() * 5), early: false, flee: 0, window: Math.max(1, 2 - 0.15 * c.diff) };
  },

  update(s, dt, c) {
    s.t += dt;
    if (s.won) { s.flee += dt; return; }
    if (s.lost || c.over) return;
    const loud = c.input.mic.level > this.micThreshold;
    if (s.t < s.appear) { if (loud && s.t > 0.3) { s.early = true; s.lost = true; c.sfx.hit(); } return; }
    if (loud) { s.won = true; c.sfx.tone(300, 0.3, 'sawtooth', 0.1, 0, 3); }
    else if (s.t > s.appear + s.window) { s.lost = true; c.sfx.lose(); }
  },

  draw(s, g) {
    g.fillStyle = '#10002b'; g.fillRect(0, 0, W, H);
    Draw.circle(g, 860, 70, 40); g.fillStyle = '#fefae0'; g.fill();
    // maison hantée
    g.beginPath(); g.moveTo(80, 120); g.lineTo(480, 20); g.lineTo(880, 120); g.closePath(); Draw.fillStroke(g, '#3c096c');
    Draw.rrect(g, 100, 110, 760, 360, 0); Draw.fillStroke(g, '#5a189a');
    this.WINDOWS.forEach(([x, y], i) => {
      Draw.rrect(g, x - 60, y - 55, 120, 110, 8); Draw.fillStroke(g, '#ffd166');
      if (i === s.where && s.t >= s.appear) {
        const k = s.won ? Math.max(0, 1 - s.flee * 2) : Math.min(1, (s.t - s.appear) * 6);
        g.save(); g.translate(x + (s.won ? s.flee * 300 : 0), y + 10); g.scale(k, k);
        g.beginPath(); g.arc(0, -10, 40, Math.PI, 0); g.lineTo(40, 40);
        for (let j = 0; j < 4; j++) g.lineTo(30 - j * 20, j % 2 ? 40 : 28);
        g.lineTo(-40, 40); g.closePath(); Draw.fillStroke(g, '#fff');
        if (s.won) { Draw.circle(g, -14, -12, 9); Draw.circle(g, 14, -12, 9); g.fillStyle = '#1a1a1a'; g.fill(); Draw.ellipse(g, 0, 14, 10, 14); g.fill(); }
        else { Draw.ellipse(g, -14, -12, 6, 10); Draw.ellipse(g, 14, -12, 6, 10); g.fillStyle = '#1a1a1a'; g.fill(); g.beginPath(); g.arc(0, 8, 14, 0, Math.PI); g.fill(); }
        g.restore();
      }
      g.strokeStyle = '#1a1a1a'; g.lineWidth = 4; g.beginPath(); g.moveTo(x, y - 55); g.lineTo(x, y + 55); g.moveTo(x - 60, y); g.lineTo(x + 60, y); g.stroke();
    });
    if (s.early) Draw.text(g, 'TROP TÔT !', W / 2, 500, 56, '#ef233c');
    if (s.won) Draw.text(g, 'AAAAAH !', W / 2, 500, 56, '#fff');
  },
});
