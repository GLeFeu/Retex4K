// SOURIS (glisser) : fermer la fermeture éclair en suivant la ligne jusqu'en bas
Engine.register({
  id: 'zip', name: 'Fermeture éclair', icon: '🧥', instruction: 'FERME-LA !', input: 'souris',
  hint: 'TIRE LE ZIP JUSQU\'EN BAS', duration: 5, cursor: 'grab', TOP: 110, BOT: 470,

  start(c) { return { t: 0, y: this.TOP, drag: false, wav: c.diff >= 2 ? 30 + 5 * c.diff : 0 }; },

  lineX(s, y) { return W / 2 + Math.sin((y - this.TOP) / 50) * s.wav; },

  update(s, dt, c) {
    s.t += dt;
    if (s.won || c.over) { s.drag = false; return; }
    const inp = c.input;
    if (!s.drag && inp.clicked && Math.hypot(inp.x - this.lineX(s, s.y), inp.y - s.y) < 50) s.drag = true;
    if (!s.drag) return;
    if (!inp.down || Math.abs(inp.x - this.lineX(s, inp.y)) > 60) { s.drag = false; return; } // on a lâché ou dérapé
    if (inp.y > s.y) s.y = Math.min(this.BOT, inp.y);
    if (s.y >= this.BOT) { s.won = true; c.sfx.tone(900, 0.2, 'square', 0.1); }
  },

  draw(s, g) {
    g.fillStyle = '#90e0ef'; g.fillRect(0, 0, W, H);
    // veste
    Draw.rrect(g, 280, 70, 400, 470, 40); Draw.fillStroke(g, '#ef233c');
    Draw.rrect(g, 180, 110, 120, 380, 40); Draw.fillStroke(g, '#d90429');
    Draw.rrect(g, 660, 110, 120, 380, 40); Draw.fillStroke(g, '#d90429');
    // ouverture au-dessous du zip
    g.fillStyle = '#ffd166';
    g.beginPath();
    for (let y = s.y; y <= this.BOT; y += 10) g.lineTo(this.lineX(s, y) - 6 - (y - s.y) * 0.15, y);
    for (let y = this.BOT; y >= s.y; y -= 10) g.lineTo(this.lineX(s, y) + 6 + (y - s.y) * 0.15, y);
    g.closePath(); g.fill();
    // dents fermées
    g.strokeStyle = '#adb5bd'; g.lineWidth = 6; g.setLineDash([6, 4]);
    g.beginPath(); for (let y = this.TOP; y <= s.y; y += 5) g.lineTo(this.lineX(s, y), y); g.stroke(); g.setLineDash([]);
    g.strokeStyle = 'rgba(0,0,0,0.25)'; g.lineWidth = 2;
    g.beginPath(); for (let y = s.y; y <= this.BOT; y += 5) g.lineTo(this.lineX(s, y), y); g.stroke();
    // tirette
    const x = this.lineX(s, s.y);
    Draw.rrect(g, x - 14, s.y - 10, 28, 20, 5); Draw.fillStroke(g, '#ced4da');
    Draw.rrect(g, x - 9, s.y + 6, 18, 40, 6); Draw.fillStroke(g, s.drag ? '#ffd400' : '#adb5bd');
    if (!s.drag && !s.won) Draw.text(g, '↓', x + 60, s.y + 30 + Math.sin(s.t * 8) * 8, 50, '#fff');
  },
});
