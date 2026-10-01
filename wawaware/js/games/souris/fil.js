// SOURIS : couper le bon fil de la bombe (un seul essai !)
Engine.register({
  id: 'fil', name: 'Désamorçage', icon: '💣', instruction: 'COUPE LE FIL !', input: 'souris',
  hint: 'CLIQUE SUR LE FIL DE LA BONNE COULEUR', duration: 5, cursor: 'crosshair',
  COLS: [['ROUGE', '#ef233c'], ['BLEU', '#3a86ff'], ['VERT', '#2b9348'], ['JAUNE', '#ffd400'], ['ROSE', '#ff6b9d']],

  start(c) {
    const n = Math.min(5, 3 + Math.floor(c.diff / 2));
    const order = shuffle(this.COLS.map((_, i) => i), c.rng).slice(0, n);
    return { t: 0, order, good: order[Math.floor(c.rng() * n)], cut: -1 };
  },

  wireY(s, i) { return 170 + i * (260 / (s.order.length - 1)); },

  update(s, dt, c) {
    s.t += dt;
    if (s.cut >= 0 || c.over || !c.input.clicked) return;
    if (c.input.x < 260 || c.input.x > 700) return;
    for (let i = 0; i < s.order.length; i++) {
      const y = this.wireY(s, i) + Math.sin((c.input.x - 260) / 50 + i) * 14;
      if (Math.abs(c.input.y - y) < 18) {
        s.cut = i;
        if (s.order[i] === s.good) { s.won = true; c.sfx.tone(1000, 0.1, 'square', 0.1); } else { s.lost = true; c.sfx.hit(); }
        return;
      }
    }
  },

  draw(s, g) {
    g.fillStyle = '#343a40'; g.fillRect(0, 0, W, H);
    Draw.rrect(g, 180, 110, 600, 380, 20); Draw.fillStroke(g, '#6c757d');
    Draw.rrect(g, 220, 50, 520, 70, 14); Draw.fillStroke(g, '#1a1a1a', '#000');
    const [name, hex] = this.COLS[s.good];
    Draw.text(g, `COUPE LE ${name}`, W / 2, 86, 40, hex, '#fff');
    s.order.forEach((k, i) => {
      g.lineWidth = 12; g.strokeStyle = this.COLS[k][1]; g.lineCap = 'round';
      g.beginPath();
      for (let x = 230; x <= 730; x += 10) {
        if (s.cut === i && Math.abs(x - 480) < 20) { g.stroke(); g.beginPath(); continue; }
        g.lineTo(x, this.wireY(s, i) + Math.sin((x - 260) / 50 + i) * 14);
      }
      g.stroke();
    });
    for (const x of [230, 730]) { Draw.rrect(g, x - 20, 150, 40, 300, 8); Draw.fillStroke(g, '#adb5bd'); }
    if (s.lost) { Draw.burst(g, W / 2, H / 2, 260); Draw.text(g, 'BOUM !', W / 2, H / 2, 90, '#fff'); }
  },
});
