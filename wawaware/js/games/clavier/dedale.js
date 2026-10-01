// CLAVIER (flèches) : sortir du labyrinthe
Engine.register({
  id: 'dedale', name: 'Le dédale', icon: '🧭', instruction: 'SORS DE LÀ !', input: 'clavier',
  hint: 'FLÈCHES OU Z Q S D JUSQU\'AU DRAPEAU', duration: 7,

  start(c) {
    const cols = Math.min(11, 6 + Math.floor(c.diff / 2)), rows = Math.min(7, 4 + Math.floor(c.diff / 3));
    // murs : chaque case a 4 côtés fermés, on creuse avec un parcours en profondeur
    const cells = Array.from({ length: cols * rows }, () => ({ n: true, s: true, e: true, w: true, v: false }));
    const stack = [0]; cells[0].v = true;
    while (stack.length) {
      const i = stack[stack.length - 1], x = i % cols, y = Math.floor(i / cols);
      const nb = [];
      if (y > 0 && !cells[i - cols].v) nb.push(['n', i - cols, 's']);
      if (y < rows - 1 && !cells[i + cols].v) nb.push(['s', i + cols, 'n']);
      if (x > 0 && !cells[i - 1].v) nb.push(['w', i - 1, 'e']);
      if (x < cols - 1 && !cells[i + 1].v) nb.push(['e', i + 1, 'w']);
      if (!nb.length) { stack.pop(); continue; }
      const [d, j, back] = nb[Math.floor(c.rng() * nb.length)];
      cells[i][d] = false; cells[j][back] = false; cells[j].v = true; stack.push(j);
    }
    return { t: 0, cols, rows, cells, p: 0, size: Math.min(80, 760 / cols, 440 / rows) };
  },

  update(s, dt, c) {
    s.t += dt;
    if (s.won || c.over) return;
    const cell = s.cells[s.p], inp = c.input;
    let np = -1;
    if (inp.wasPressed('ArrowUp', 'KeyW') && !cell.n) np = s.p - s.cols;
    if (inp.wasPressed('ArrowDown', 'KeyS') && !cell.s) np = s.p + s.cols;
    if (inp.wasPressed('ArrowLeft', 'KeyA') && !cell.w) np = s.p - 1;
    if (inp.wasPressed('ArrowRight', 'KeyD') && !cell.e) np = s.p + 1;
    if (np >= 0) { s.p = np; c.sfx.tone(500, 0.03, 'square', 0.05); }
    if (s.p === s.cells.length - 1) s.won = true;
  },

  draw(s, g) {
    g.fillStyle = '#2d6a4f'; g.fillRect(0, 0, W, H);
    const S = s.size, ox = (W - s.cols * S) / 2, oy = (H - s.rows * S) / 2 - 10;
    g.fillStyle = '#d8f3dc'; g.fillRect(ox, oy, s.cols * S, s.rows * S);
    g.strokeStyle = '#1b4332'; g.lineWidth = 6; g.lineCap = 'round';
    s.cells.forEach((cell, i) => {
      const x = ox + (i % s.cols) * S, y = oy + Math.floor(i / s.cols) * S;
      g.beginPath();
      if (cell.n) { g.moveTo(x, y); g.lineTo(x + S, y); }
      if (cell.s) { g.moveTo(x, y + S); g.lineTo(x + S, y + S); }
      if (cell.w) { g.moveTo(x, y); g.lineTo(x, y + S); }
      if (cell.e) { g.moveTo(x + S, y); g.lineTo(x + S, y + S); }
      g.stroke();
    });
    const ex = ox + (s.cols - 0.5) * S, ey = oy + (s.rows - 0.5) * S;
    g.fillStyle = '#1a1a1a'; g.fillRect(ex - 2, ey - S * 0.35, 4, S * 0.6);
    g.beginPath(); g.moveTo(ex + 2, ey - S * 0.35); g.lineTo(ex + S * 0.35, ey - S * 0.25); g.lineTo(ex + 2, ey - S * 0.15); g.closePath(); g.fillStyle = '#ef233c'; g.fill();
    const px = ox + (s.p % s.cols + 0.5) * S, py = oy + (Math.floor(s.p / s.cols) + 0.5) * S;
    Draw.circle(g, px, py, S * 0.3); Draw.fillStroke(g, '#ffd400', '#1a1a1a', 3);
  },
});
