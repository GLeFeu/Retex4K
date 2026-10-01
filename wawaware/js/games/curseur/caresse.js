// CURSEUR : caresser le chat (frotter la souris sur son dos), mais pas trop vite !
Engine.register({
  id: 'caresse', name: 'Câlin de chat', icon: '😺', instruction: 'CARESSE-LE !', input: 'curseur',
  hint: 'FROTTE DOUCEMENT SON DOS', duration: 5, cursor: 'none',

  start(c) { return { t: 0, love: 0, need: 2200 + 300 * Math.min(c.diff, 6), px: c.input.x, py: c.input.y, angry: 0, hearts: [] }; },

  update(s, dt, c) {
    s.t += dt;
    s.angry = Math.max(0, s.angry - dt);
    const d = Math.min(200, Math.hypot(c.input.x - s.px, c.input.y - s.py));
    const sp = d / Math.max(dt, 0.001);
    s.px = c.input.x; s.py = c.input.y;
    for (const h of s.hearts) { h.y -= 60 * dt; h.life -= dt; }
    s.hearts = s.hearts.filter(h => h.life > 0);
    if (s.won || c.over) return;
    const onCat = Math.abs(c.input.x - 470) < 170 && Math.abs(c.input.y - 330) < 90;
    if (!onCat) return;
    if (sp > 3000) { s.angry = 0.5; s.love = Math.max(0, s.love - d * 2); c.sfx.tone(200, 0.05, 'sawtooth', 0.05); return; }
    s.love += d;
    if (Math.random() < d / 300) s.hearts.push({ x: c.input.x, y: c.input.y - 20, life: 1 });
    if (s.love >= s.need) { s.won = true; c.sfx.tone(600, 0.3, 'sine', 0.1); }
  },

  draw(s, g, c) {
    g.fillStyle = '#ffe5ec'; g.fillRect(0, 0, W, H);
    Draw.rrect(g, 220, 380, 520, 80, 30); Draw.fillStroke(g, '#ffafcc');
    // chat allongé
    g.save(); g.translate(470, 380);
    Draw.ellipse(g, 0, -55, 180, 60); Draw.fillStroke(g, '#f4a261');
    g.fillStyle = '#e76f51'; for (let i = -2; i <= 2; i++) g.fillRect(i * 50 - 8, -112, 16, 34);
    g.lineCap = 'round'; g.lineWidth = 18; g.strokeStyle = '#1a1a1a';
    g.beginPath(); g.moveTo(-170, -40); g.quadraticCurveTo(-240, -40 + Math.sin(s.t * 3) * 20, -230, -110); g.stroke();
    g.lineWidth = 12; g.strokeStyle = '#f4a261'; g.stroke();
    g.restore();
    Draw.cat(g, 690, 380, { t: s.t, eyes: s.angry > 0 ? 'ouverts' : 'fermes', scale: 0.9 });
    if (s.angry > 0) Draw.text(g, 'GRRR !', 700, 180, 44, '#ef233c');
    else if (s.love > 300) Draw.text(g, 'RRRR…', 730, 200, 32, '#7b2cbf');
    for (const h of s.hearts) { g.globalAlpha = h.life; Draw.text(g, '♥', h.x, h.y, 34, '#ff3c6e'); }
    g.globalAlpha = 1;
    const k = clamp(s.love / s.need, 0, 1);
    Draw.rrect(g, 300, 480, 360, 30, 15); Draw.fillStroke(g, '#fff');
    if (k > 0.02) { Draw.rrect(g, 304, 484, 352 * k, 22, 11); g.fillStyle = '#ff3c6e'; g.fill(); }
    // main
    Draw.circle(g, c.input.x, c.input.y, 22); Draw.fillStroke(g, '#ffcf9e');
  },
});
