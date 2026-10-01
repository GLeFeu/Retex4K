// CLAVIER (piège) : NE PAS appuyer sur le gros bouton, ne touche à aucune touche !
Engine.register({
  id: 'nebouge', name: 'Le gros bouton', icon: '🔴', instruction: 'N\'APPUIE PAS !', input: 'clavier',
  hint: 'NE TOUCHE À AUCUNE TOUCHE…', duration: 4, survival: true,
  TEASE: ['APPUIE !', 'VAS-Y !', 'ESPACE !', 'ALLEZ…', 'JUSTE UNE FOIS !', 'MAINTENANT !'],

  start() { return { t: 0, boom: false }; },

  update(s, dt, c) {
    s.t += dt;
    if (s.lost || c.over) return;
    if (c.input.anyKeyPressed()) { s.lost = true; s.boom = true; c.sfx.hit(); }
  },

  draw(s, g) {
    g.fillStyle = s.boom ? '#ef233c' : '#212529'; g.fillRect(0, 0, W, H);
    Draw.rrect(g, 330, 330, 300, 120, 20); Draw.fillStroke(g, '#adb5bd');
    const press = s.boom ? 20 : 0;
    Draw.ellipse(g, 480, 340 + press, 110, 40); Draw.fillStroke(g, '#9d0208');
    Draw.ellipse(g, 480, 320 + press, 110, 40); Draw.fillStroke(g, '#ef233c');
    if (s.boom) { Draw.text(g, 'BOUM.', W / 2, 160, 100, '#fff'); return; }
    const k = Math.floor(s.t * 2.5) % this.TEASE.length;
    g.save(); g.translate(W / 2, 140); g.rotate(Math.sin(s.t * 9) * 0.08);
    Draw.text(g, this.TEASE[k], 0, 0, 60 + Math.sin(s.t * 12) * 6, '#ffd400');
    g.restore();
  },
});
