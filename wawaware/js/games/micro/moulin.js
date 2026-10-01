// MICRO : souffler pour faire tourner le moulin à vent N tours
Engine.register({
  id: 'moulin', name: 'Moulin à vent', icon: '🌬️', instruction: 'FAIS-LE TOURNER !', input: 'micro',
  hint: 'SOUFFLE SUR LES AILES', duration: 5, needsMic: true, micThreshold: 0.15,

  start(c) { return { t: 0, a: 0, w: 0, lvl: 0, need: 2 + Math.min(c.diff, 4) * 0.5 }; },

  update(s, dt, c) {
    s.t += dt;
    s.lvl = c.input.mic.level;
    if (!c.over && !s.won && s.lvl > this.micThreshold) s.w += s.lvl * 14 * dt;
    s.w *= 1 - 0.9 * dt;
    s.a += s.w * dt;
    if (!s.won && !c.over && s.a >= s.need * Math.PI * 2) s.won = true;
  },

  draw(s, g) {
    Draw.sky(g, '#ffcad4', '#fff1e6', 400);
    Draw.ground(g, 400, '#b5e48c', '#99d98c');
    for (let i = 0; i < 6; i++) { Draw.text(g, '✿', 80 + i * 160, 450 + (i % 2) * 30, 30, ['#ff3c6e', '#ffd400'][i % 2], null); }
    // tour
    g.beginPath(); g.moveTo(420, 410); g.lineTo(540, 410); g.lineTo(510, 170); g.lineTo(450, 170); g.closePath(); Draw.fillStroke(g, '#ddb892');
    Draw.rrect(g, 465, 340, 30, 70, [15, 15, 0, 0]); Draw.fillStroke(g, '#7f5539');
    g.beginPath(); g.moveTo(435, 175); g.lineTo(525, 175); g.lineTo(480, 120); g.closePath(); Draw.fillStroke(g, '#9c6644');
    // ailes
    g.save(); g.translate(480, 175); g.rotate(s.a);
    for (let k = 0; k < 4; k++) {
      g.rotate(Math.PI / 2);
      Draw.rrect(g, -6, -150, 12, 150, 4); Draw.fillStroke(g, '#7f5539', '#1a1a1a', 3);
      Draw.rrect(g, 6, -145, 38, 110, 4); Draw.fillStroke(g, '#fefae0', '#1a1a1a', 3);
    }
    g.restore();
    Draw.circle(g, 480, 175, 12); Draw.fillStroke(g, '#1a1a1a');
    const tours = Math.min(s.need, s.a / (Math.PI * 2));
    Draw.text(g, `${tours.toFixed(1)} / ${s.need} TOURS`, 760, 60, 34);
  },
});
