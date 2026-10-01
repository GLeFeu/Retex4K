// CLAVIER (Espace en rafale) : soulever l'haltère au-dessus de la tête
Engine.register({
  id: 'muscle', name: 'Haltérophilie', icon: '🏋️', instruction: 'SOULÈVE !', input: 'clavier',
  hint: 'MARTÈLE ESPACE !', duration: 5,

  start(c) { return { t: 0, lift: 0, decay: 0.3 + 0.04 * Math.min(c.diff, 6), shake: 0 }; },

  update(s, dt, c) {
    s.t += dt;
    s.shake = Math.max(0, s.shake - dt);
    if (s.won || c.over) return;
    if (c.input.wasPressed('Space')) { s.lift += 0.06; s.shake = 0.05; c.sfx.tone(150 + s.lift * 300, 0.03, 'square', 0.05); }
    s.lift = Math.max(0, s.lift - s.decay * dt);
    if (s.lift >= 1) { s.won = true; c.sfx.tone(800, 0.3, 'square', 0.1); }
  },

  draw(s, g) {
    Draw.stripes(g, s.t * 0.3, '#ffd6a5', '#ffc078');
    Draw.ground(g, 460, '#6c757d', '#495057');
    const k = Math.min(1, s.lift), sh = s.shake > 0 ? (Math.random() - 0.5) * 6 : 0;
    const by = 400 - k * 230;
    // haltérophile
    Draw.hero(g, 480 + sh, 470, { shirt: '#ef233c', pants: '#1a1a1a' });
    g.strokeStyle = '#ffcf9e'; g.lineWidth = 14; g.lineCap = 'round';
    for (const sx of [-1, 1]) { g.beginPath(); g.moveTo(480 + sx * 20, 430); g.lineTo(480 + sx * 60 + sh, by + 4); g.stroke(); }
    g.fillStyle = '#495057'; g.fillRect(300 + sh, by - 5, 360, 10);
    for (const sx of [-1, 1]) { Draw.rrect(g, 480 + sx * 160 - 18 + sh, by - 55, 36, 110, 8); Draw.fillStroke(g, '#1a1a1a'); }
    if (s.won) Draw.text(g, 'HÉRAKLÈS !', W / 2, 80, 60, '#fff');
    Draw.rrect(g, 60, 80, 40, 320, 16); Draw.fillStroke(g, '#fff');
    const h = 312 * k; if (h > 1) { Draw.rrect(g, 64, 396 - h, 32, h, 12); g.fillStyle = '#ef233c'; g.fill(); }
  },
});
