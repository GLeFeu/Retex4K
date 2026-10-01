// MICRO (claquements) : applaudir pour faire jongler l'otarie
Engine.register({
  id: 'applaudis', name: 'Bravo l\'otarie', icon: '👏', instruction: 'APPLAUDIS !', input: 'micro',
  hint: 'TAPE DANS TES MAINS', duration: 5, needsMic: true,

  start(c) { return { t: 0, need: 3 + Math.min(2, Math.floor(c.diff / 2)), claps: 0, hop: 0, pops: [] }; },

  update(s, dt, c) {
    s.t += dt;
    s.hop = Math.max(0, s.hop - dt);
    for (const p of s.pops) p.life -= dt;
    s.pops = s.pops.filter(p => p.life > 0);
    if (s.won || c.over || !c.input.mic.clap) return;
    s.claps++;
    s.hop = 0.4;
    s.pops.push({ x: 150 + Math.random() * 660, y: 420 + Math.random() * 60, life: 0.6 });
    c.sfx.tone(600 + s.claps * 80, 0.08, 'square', 0.08);
    if (s.claps >= s.need) s.won = true;
  },

  draw(s, g) {
    g.fillStyle = '#5a189a'; g.fillRect(0, 0, W, H);
    for (let i = 0; i < 10; i++) { g.fillStyle = i % 2 ? '#ef233c' : '#fff'; g.beginPath(); g.moveTo(W / 2, -40); g.lineTo(i * 100, 160); g.lineTo(i * 100 + 100, 160); g.closePath(); g.fill(); }
    Draw.rrect(g, 330, 330, 300, 70, 30); Draw.fillStroke(g, '#ffd400');
    const jump = Math.sin((s.hop / 0.4) * Math.PI) * 80;
    // otarie
    g.save(); g.translate(480, 330 - jump);
    Draw.ellipse(g, 0, -50, 50, 60); Draw.fillStroke(g, '#495057');
    Draw.circle(g, 10, -120, 32); Draw.fillStroke(g, '#495057');
    Draw.ellipse(g, 38, -112, 14, 9); Draw.fillStroke(g, '#343a40', '#1a1a1a', 2);
    Draw.circle(g, 18, -130, 5); g.fillStyle = '#fff'; g.fill();
    Draw.ellipse(g, -46, -40, 14, 30, 0.6); Draw.fillStroke(g, '#343a40', '#1a1a1a', 3);
    Draw.circle(g, 14, -175 - jump * 0.5, 22); Draw.fillStroke(g, ['#ef233c', '#3a86ff', '#ffd400'][s.claps % 3]);
    g.restore();
    // public
    for (let i = 0; i < 16; i++) { Draw.circle(g, 30 + i * 60, 500 + (i % 2) * 14, 26); g.fillStyle = '#240046'; g.fill(); }
    for (const p of s.pops) Draw.text(g, '👏', p.x, p.y - (0.6 - p.life) * 80, 40, '#fff', null);
    Draw.text(g, `${s.claps} / ${s.need}`, W - 90, 60, 44);
  },
});
