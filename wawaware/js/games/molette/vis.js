// MOLETTE (vers le bas uniquement) : visser la vis à fond (vers le haut, ça dévisse !)
Engine.register({
  id: 'vis', name: 'Tournevis', icon: '🔩', instruction: 'VISSE !', input: 'molette',
  hint: 'MOLETTE VERS LE BAS POUR VISSER', duration: 5, PLANK: 330,

  start(c) { return { t: 0, d: 0, need: 14 + 3 * Math.min(c.diff, 6), rot: 0 }; },

  update(s, dt, c) {
    s.t += dt;
    if (s.won || c.over || !c.input.wheelDelta) return;
    s.d = clamp(s.d + c.input.wheelDelta, 0, s.need);
    s.rot += c.input.wheelDelta * 0.5;
    c.sfx.tone(c.input.wheelDelta > 0 ? 400 : 250, 0.03, 'square', 0.05);
    if (s.d >= s.need) { s.won = true; c.sfx.tone(900, 0.15, 'square', 0.1); }
  },

  draw(s, g) {
    g.fillStyle = '#577590'; g.fillRect(0, 0, W, H);
    Draw.rrect(g, 200, this.PLANK, 560, 140, 10); Draw.fillStroke(g, '#ddb892');
    const k = s.d / s.need, headY = this.PLANK - 120 * (1 - k);
    // vis (filetage)
    g.save(); g.beginPath(); g.rect(440, headY, 80, this.PLANK - headY + 2); g.clip();
    g.fillStyle = '#adb5bd'; g.fillRect(468, headY, 24, this.PLANK - headY);
    g.strokeStyle = '#495057'; g.lineWidth = 3;
    for (let y = headY + ((s.rot * 8) % 12 + 12) % 12; y < this.PLANK; y += 12) { g.beginPath(); g.moveTo(462, y); g.lineTo(498, y + 6); g.stroke(); }
    g.restore();
    Draw.ellipse(g, 480, headY, 44, 12); Draw.fillStroke(g, '#ced4da');
    g.save(); g.translate(480, headY); g.scale(1, 0.27); g.rotate(s.rot);
    g.fillStyle = '#495057'; g.fillRect(-30, -5, 60, 10); g.fillRect(-5, -30, 10, 60);
    g.restore();
    // tournevis
    g.fillStyle = '#adb5bd'; g.fillRect(474, headY - 140, 12, 136);
    g.save(); g.translate(480, headY - 200);
    Draw.rrect(g, -26, -60, 52, 130, 20); Draw.fillStroke(g, '#ef233c');
    g.fillStyle = '#ffd400'; for (let i = -1; i <= 1; i++) g.fillRect(i * 14 - 3 + Math.sin(s.rot + i) * 3, -50, 6, 110);
    g.restore();
    Draw.text(g, '↓ VISSE   ↑ DÉVISSE', W / 2, 510, 30, '#fff');
    Draw.rrect(g, 780, 120, 40, 260, 14); Draw.fillStroke(g, '#fff');
    const h = 252 * k; if (h > 1) { Draw.rrect(g, 784, 376 - h, 32, h, 10); g.fillStyle = '#06d6a0'; g.fill(); }
  },
});
