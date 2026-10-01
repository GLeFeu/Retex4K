// SOURIS (2 boutons) : clic gauche sur les bleus, clic droit sur les rouges
Engine.register({
  id: 'clicdroit', name: 'Gauche ou droit', icon: '🖱️', instruction: 'BON BOUTON !', input: 'souris',
  hint: 'BLEU = CLIC GAUCHE · ROUGE = CLIC DROIT', duration: 5, cursor: 'pointer',

  start(c) {
    const n = 4 + Math.min(3, Math.floor(c.diff / 2));
    return { t: 0, seq: Array.from({ length: n }, () => c.rng() < 0.5 ? 0 : 1), i: 0, bump: 0 };
  },

  update(s, dt, c) {
    s.t += dt;
    s.bump = Math.max(0, s.bump - dt);
    if (s.won || s.lost || c.over) return;
    const l = c.input.clicked, r = c.input.rightClicked;
    if (!l && !r) return;
    const want = s.seq[s.i];
    if ((want === 0 && l && !r) || (want === 1 && r && !l)) {
      s.i++; s.bump = 0.15; c.sfx.tone(want ? 500 : 700, 0.06, 'square', 0.1);
      if (s.i >= s.seq.length) s.won = true;
    } else { s.lost = true; c.sfx.hit(); }
  },

  draw(s, g) {
    g.fillStyle = '#1a1a2e'; g.fillRect(0, 0, W, H);
    // grosse souris
    const want = s.seq[Math.min(s.i, s.seq.length - 1)];
    Draw.rrect(g, 380, 140, 200, 300, 100); Draw.fillStroke(g, '#e9ecef', '#fff', 5);
    g.save(); Draw.rrect(g, 380, 140, 200, 300, 100); g.clip();
    g.fillStyle = want === 0 && !s.won ? '#3a86ff' : '#ced4da'; g.fillRect(380, 140, 98, 130);
    g.fillStyle = want === 1 && !s.won ? '#ef233c' : '#ced4da'; g.fillRect(482, 140, 98, 130);
    g.restore();
    g.fillStyle = '#1a1a1a'; g.fillRect(476, 140, 8, 130); g.fillRect(380, 268, 200, 6);
    // file d'objets
    s.seq.forEach((k, j) => {
      const x = W / 2 + (j - s.i) * 130, y = 60;
      if (j < s.i || x < -60 || x > W + 60) return;
      const sc = j === s.i ? 1.2 + s.bump : 0.8;
      Draw.circle(g, x, y, 36 * sc); Draw.fillStroke(g, k ? '#ef233c' : '#3a86ff', j === s.i ? '#fff' : '#1a1a1a', 5);
      Draw.text(g, k ? 'D' : 'G', x, y + 2, 34 * sc, '#fff', null);
    });
    Draw.text(g, 'GAUCHE', 230, 210, 34, '#3a86ff');
    Draw.text(g, 'DROIT', 730, 210, 34, '#ef233c');
    Draw.text(g, `${s.i} / ${s.seq.length}`, W / 2, 490, 36);
  },
});
