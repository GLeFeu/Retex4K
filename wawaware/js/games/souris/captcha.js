// SOURIS : le captcha "je ne suis pas un robot" (sélectionner toutes les bonnes images)
Engine.register({
  id: 'captcha', name: 'Pas un robot', icon: '🤖', instruction: 'PROUVE-LE !', input: 'souris',
  hint: 'COCHE LES BONNES IMAGES PUIS « VÉRIFIER »', duration: 7, cursor: 'pointer',
  KINDS: ['VOITURES', 'ARBRES', 'CHATS', 'SOLEILS'], X0: 300, Y0: 110, S: 116,

  start(c) {
    const want = Math.floor(c.rng() * 4), cells = [];
    const nGood = 2 + Math.floor(c.rng() * 3);
    for (let i = 0; i < 9; i++) cells.push({ k: i < nGood ? want : (want + 1 + Math.floor(c.rng() * 3)) % 4, on: false });
    shuffle(cells, c.rng);
    return { t: 0, want, cells };
  },

  update(s, dt, c) {
    s.t += dt;
    if (s.won || s.lost || c.over || !c.input.clicked) return;
    const { x, y } = c.input;
    const cx = Math.floor((x - this.X0) / this.S), cy = Math.floor((y - this.Y0) / this.S);
    if (cx >= 0 && cx < 3 && cy >= 0 && cy < 3) { const cell = s.cells[cy * 3 + cx]; cell.on = !cell.on; c.sfx.tone(600, 0.04, 'square', 0.06); }
    if (x > 520 && x < 650 && y > 465 && y < 515) {
      if (s.cells.every(cell => cell.on === (cell.k === s.want))) s.won = true; else { s.lost = true; c.sfx.hit(); }
    }
  },

  drawIcon(g, k, x, y) {
    if (k === 0) { Draw.rrect(g, x - 40, y - 5, 80, 28, 8); Draw.fillStroke(g, '#ef233c', '#1a1a1a', 3); Draw.rrect(g, x - 22, y - 24, 44, 22, 8); Draw.fillStroke(g, '#ef233c', '#1a1a1a', 3); for (const wx of [-22, 22]) { Draw.circle(g, x + wx, y + 24, 10); Draw.fillStroke(g, '#1a1a1a'); } }
    else if (k === 1) { g.fillStyle = '#7f5539'; g.fillRect(x - 6, y, 12, 40); Draw.circle(g, x, y - 10, 32); Draw.fillStroke(g, '#2d6a4f', '#1a1a1a', 3); }
    else if (k === 2) Draw.cat(g, x, y + 40, { scale: 0.5 });
    else { Draw.circle(g, x, y, 24); Draw.fillStroke(g, '#ffd60a', '#1a1a1a', 3); g.strokeStyle = '#ffd60a'; g.lineWidth = 5; for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4; g.beginPath(); g.moveTo(x + Math.cos(a) * 32, y + Math.sin(a) * 32); g.lineTo(x + Math.cos(a) * 44, y + Math.sin(a) * 44); g.stroke(); } }
  },

  draw(s, g) {
    g.fillStyle = '#dee2e6'; g.fillRect(0, 0, W, H);
    Draw.rrect(g, 280, 20, 400, 510, 6); Draw.fillStroke(g, '#fff', '#adb5bd', 3);
    g.fillStyle = '#3a86ff'; g.fillRect(290, 30, 380, 70);
    Draw.text(g, 'Sélectionne toutes les images', 480, 52, 20, '#fff', null);
    Draw.text(g, `avec des ${this.KINDS[s.want]}`, 480, 80, 28, '#fff', null);
    s.cells.forEach((cell, i) => {
      const x = this.X0 + (i % 3) * this.S, y = this.Y0 + Math.floor(i / 3) * this.S;
      g.fillStyle = '#e9f5db'; g.fillRect(x + 3, y + 3, this.S - 6, this.S - 6);
      this.drawIcon(g, cell.k, x + this.S / 2, y + this.S / 2);
      if (cell.on) { g.strokeStyle = '#3a86ff'; g.lineWidth = 8; g.strokeRect(x + 6, y + 6, this.S - 12, this.S - 12); Draw.circle(g, x + 20, y + 20, 13); Draw.fillStroke(g, '#3a86ff', '#fff', 3); Draw.text(g, '✓', x + 20, y + 21, 18, '#fff', null); }
    });
    Draw.btn(g, 585, 490, 130, 46, 'VÉRIFIER', '#3a86ff', 22, '#fff');
  },
});
