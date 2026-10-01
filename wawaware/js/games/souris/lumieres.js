// SOURIS : éteindre toutes les fenêtres allumées de l'immeuble
Engine.register({
  id: 'lumieres', name: 'Extinction des feux', icon: '💡', instruction: 'ÉTEINS TOUT !', input: 'souris',
  hint: 'CLIQUE SUR LES FENÊTRES ALLUMÉES', duration: 5, cursor: 'pointer', COLS: 6, ROWS: 4,

  start(c) {
    const lit = new Array(24).fill(false), n = Math.min(12, 5 + c.diff);
    while (lit.filter(Boolean).length < n) lit[Math.floor(c.rng() * 24)] = true;
    return { t: 0, lit, relight: c.diff >= 3 ? 1.2 : 0, rt: 1.2 };
  },

  cell(i) { return { x: 270 + (i % this.COLS) * 72, y: 110 + Math.floor(i / this.COLS) * 82 }; },

  update(s, dt, c) {
    s.t += dt;
    if (s.won || c.over) return;
    if (s.relight) { s.rt -= dt; if (s.rt <= 0) { s.rt = s.relight; const off = s.lit.map((v, i) => v ? -1 : i).filter(i => i >= 0); s.lit[off[Math.floor(c.rng() * off.length)]] = true; } }
    if (c.input.clicked) {
      for (let i = 0; i < s.lit.length; i++) {
        const p = this.cell(i);
        if (s.lit[i] && Math.abs(c.input.x - p.x - 25) < 32 && Math.abs(c.input.y - p.y - 30) < 38) { s.lit[i] = false; c.sfx.tone(300, 0.05, 'square', 0.08); }
      }
    }
    if (!s.lit.some(Boolean)) s.won = true;
  },

  draw(s, g) {
    g.fillStyle = '#03045e'; g.fillRect(0, 0, W, H);
    for (let i = 0; i < 40; i++) { Draw.circle(g, (i * 137) % W, (i * 71) % 300, 1.5); g.fillStyle = '#fff'; g.fill(); }
    Draw.rrect(g, 240, 80, 480, 380, 0); Draw.fillStroke(g, '#495057');
    s.lit.forEach((on, i) => {
      const p = this.cell(i);
      Draw.rrect(g, p.x, p.y, 50, 60, 4); Draw.fillStroke(g, on ? '#ffd60a' : '#212529', '#1a1a1a', 3);
      if (on) { g.fillStyle = 'rgba(255,214,10,0.25)'; g.fillRect(p.x - 8, p.y - 8, 66, 76); }
    });
    Draw.ground(g, 460, '#343a40');
    Draw.text(g, s.won ? 'BONNE NUIT !' : `${s.lit.filter(Boolean).length}`, W / 2, 40, 40, '#ffd60a');
  },
});
