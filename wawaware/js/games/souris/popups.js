// SOURIS : fermer toutes les fenêtres de pub (attention à ne pas cliquer à côté de la croix)
Engine.register({
  id: 'popups', name: 'Pop-ups', icon: '🪟', instruction: 'FERME-LES !', input: 'souris',
  hint: 'CLIQUE SUR LES CROIX ✕', duration: 5, cursor: 'default',
  ADS: ['GAGNEZ UN IPHONE !', 'VOUS ÊTES LE 1 000 000e !', 'CLIQUEZ ICI !!!', 'MAIGRIR EN 2 JOURS', 'VIRUS DÉTECTÉ !', 'PROMO -90% !'],

  start(c) {
    const n = 3 + Math.min(3, Math.floor(c.diff / 2));
    return { t: 0, wins: Array.from({ length: n }, () => this.make(c)), angry: c.diff >= 2 };
  },

  make(c) {
    return { x: 80 + c.rng() * 560, y: 60 + c.rng() * 260, w: 300, h: 170, ad: this.ADS[Math.floor(c.rng() * this.ADS.length)], col: ['#ff006e', '#3a86ff', '#ffbe0b', '#8338ec'][Math.floor(c.rng() * 4)] };
  },

  update(s, dt, c) {
    s.t += dt;
    if (s.won || c.over || !c.input.clicked) return;
    const { x, y } = c.input;
    for (let i = s.wins.length - 1; i >= 0; i--) {
      const w = s.wins[i];
      if (x < w.x || x > w.x + w.w || y < w.y || y > w.y + w.h) continue;
      if (x > w.x + w.w - 40 && y < w.y + 36) { s.wins.splice(i, 1); c.sfx.tone(500, 0.05, 'square', 0.08); }
      else if (s.angry && s.wins.length < 8) { s.wins.push(this.make(c)); c.sfx.tone(200, 0.1, 'sawtooth', 0.08); }
      break; // seule la fenêtre du dessus reçoit le clic
    }
    if (!s.wins.length) s.won = true;
  },

  draw(s, g) {
    g.fillStyle = '#0096c7'; g.fillRect(0, 0, W, H);
    for (let i = 0; i < 4; i++) { Draw.rrect(g, 30, 30 + i * 90, 60, 60, 8); Draw.fillStroke(g, ['#ffd166', '#fff', '#06d6a0', '#ef476f'][i], '#1a1a1a', 3); }
    g.fillStyle = '#1a1a1a'; g.fillRect(0, H - 40, W, 40);
    for (const w of s.wins) {
      Draw.rrect(g, w.x, w.y, w.w, w.h, 8); Draw.fillStroke(g, '#fff');
      Draw.rrect(g, w.x, w.y, w.w, 36, [8, 8, 0, 0]); Draw.fillStroke(g, w.col);
      Draw.rrect(g, w.x + w.w - 36, w.y + 5, 28, 26, 6); Draw.fillStroke(g, '#ef233c', '#1a1a1a', 2);
      Draw.text(g, '✕', w.x + w.w - 22, w.y + 19, 20, '#fff', null);
      Draw.text(g, w.ad, w.x + w.w / 2, w.y + 100, 22, w.col, '#1a1a1a');
    }
    if (s.won) Draw.text(g, 'PROPRE !', W / 2, H / 2, 80, '#fff');
  },
});
