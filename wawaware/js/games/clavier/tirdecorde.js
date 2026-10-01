// CLAVIER (Espace en rafale) : tir à la corde contre le costaud
Engine.register({
  id: 'tirdecorde', name: 'Tir à la corde', icon: '🪢', instruction: 'TIRE !', input: 'clavier',
  hint: 'MARTÈLE ESPACE !', duration: 5,

  start(c) { return { t: 0, pos: 0, pull: 0.12 + 0.025 * Math.min(c.diff, 6), shake: 0 }; },

  update(s, dt, c) {
    s.t += dt;
    s.shake = Math.max(0, s.shake - dt);
    if (s.won || s.lost || c.over) return;
    if (c.input.wasPressed('Space')) { s.pos -= 0.045; s.shake = 0.06; c.sfx.tone(200, 0.03, 'square', 0.05); }
    s.pos += s.pull * dt;
    if (s.pos <= -1) s.won = true;
    if (s.pos >= 1) { s.lost = true; c.sfx.lose(); }
  },

  draw(s, g) {
    Draw.sky(g, '#bde0fe', '#fefae0', 400);
    Draw.ground(g, 400, '#90be6d', '#43aa8b');
    g.fillStyle = '#4361ee'; g.fillRect(W / 2 - 300, 400, 8, 140);
    g.fillStyle = '#ef233c'; g.fillRect(W / 2 + 292, 400, 8, 140);
    const off = s.pos * 300, sh = s.shake > 0 ? (Math.random() - 0.5) * 6 : 0;
    g.strokeStyle = '#bc6c25'; g.lineWidth = 10; g.beginPath(); g.moveTo(80, 380); g.lineTo(880, 380); g.stroke();
    Draw.rrect(g, W / 2 + off - 10, 360, 20, 40, 4); Draw.fillStroke(g, '#ffd400');
    Draw.hero(g, 200 + off + sh, 470, { rot: -0.4 });
    g.save(); g.translate(760 + off, 470); g.scale(-1.35, 1.35);
    Draw.hero(g, 0, 0, { rot: -0.3, shirt: '#ef233c', pants: '#1a1a1a' });
    g.restore();
    Draw.text(g, 'TOI', 200 + off, 330, 30, '#4361ee');
    Draw.text(g, 'MASTOC', 760 + off, 270, 30, '#ef233c');
  },
});
