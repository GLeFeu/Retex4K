// CLAVIER (← →) : attraper 3 fruits dans le panier (sans attraper de bombe)
Engine.register({
  id: 'panier',
  name: 'Panier de fruits',
  icon: '🍎',
  instruction: 'ATTRAPE !',
  input: 'clavier',
  hint: '← → OU Q / D — PAS LES BOMBES !',
  duration: 5,
  BY: 450,
  FRUITS: ['#ef233c', '#ffd400', '#fb8500', '#80b918'],

  start(c) {
    return {
      t: 0, bx: W / 2, got: 0, need: 3, items: [], spawnT: 0.1, boom: null,
      rate: Math.max(0.3, 0.55 - 0.03 * c.diff), fall: 200 + 30 * Math.min(c.diff, 6), bombs: c.diff >= 2,
    };
  },

  update(s, dt, c) {
    s.t += dt;
    if (!s.lost && !c.over) {
      let dir = 0;
      if (c.input.isDown('ArrowLeft', 'KeyA')) dir -= 1;
      if (c.input.isDown('ArrowRight', 'KeyD')) dir += 1;
      s.bx = clamp(s.bx + dir * 620 * dt, 70, W - 70);
    }
    s.spawnT -= dt;
    if (s.spawnT <= 0) {
      const bomb = s.bombs && c.rng() < 0.25;
      s.items.push({ x: clamp(s.bx + (c.rng() - 0.5) * 700, 50, W - 50), y: -30, vy: s.fall, bomb, col: this.FRUITS[Math.floor(c.rng() * 4)] });
      s.spawnT = s.rate * (0.7 + c.rng() * 0.6);
    }
    for (const it of s.items) {
      it.vy += 500 * dt;
      it.y += it.vy * dt;
      if (!it.done && !s.won && !s.lost && !c.over && it.y > this.BY - 30 && it.y < this.BY + 10 && Math.abs(it.x - s.bx) < 62) {
        it.done = true;
        if (it.bomb) { s.lost = true; s.boom = { x: it.x, y: it.y }; c.sfx.hit(); }
        else { s.got++; c.sfx.tone(700 + s.got * 100, 0.08, 'square', 0.1); if (s.got >= s.need) s.won = true; }
      }
    }
    s.items = s.items.filter(it => !it.done && it.y < H + 40);
  },

  draw(s, g) {
    g.fillStyle = '#caffbf'; g.fillRect(0, 0, W, H);
    for (const [x, r] of [[120, 110], [480, 140], [840, 120]]) {
      g.fillStyle = '#8d5524'; g.fillRect(x - 15, 60, 30, 150);
      Draw.circle(g, x, 50, r); Draw.fillStroke(g, '#52b788');
    }
    g.fillStyle = '#95d5b2'; g.fillRect(0, 480, W, 60);

    for (const it of s.items) {
      if (it.bomb) {
        Draw.circle(g, it.x, it.y, 20); Draw.fillStroke(g, '#2b2b2b', '#000', 3);
        g.strokeStyle = '#d4a373'; g.lineWidth = 4; g.beginPath(); g.moveTo(it.x + 10, it.y - 16); g.lineTo(it.x + 18, it.y - 28); g.stroke();
        Draw.circle(g, it.x + 19, it.y - 30, 5 + Math.random() * 3); g.fillStyle = '#ff7b00'; g.fill();
      } else {
        Draw.circle(g, it.x, it.y, 20); Draw.fillStroke(g, it.col, '#1a1a1a', 3);
        Draw.ellipse(g, it.x + 8, it.y - 22, 8, 4, -0.5); Draw.fillStroke(g, '#2d6a4f', '#1a1a1a', 2);
      }
    }

    // panier
    g.beginPath(); g.moveTo(s.bx - 65, this.BY - 20); g.lineTo(s.bx + 65, this.BY - 20); g.lineTo(s.bx + 50, this.BY + 30); g.lineTo(s.bx - 50, this.BY + 30); g.closePath();
    Draw.fillStroke(g, '#d4a373');
    g.strokeStyle = '#a47148'; g.lineWidth = 3;
    for (let k = -45; k <= 45; k += 15) { g.beginPath(); g.moveTo(s.bx + k, this.BY - 18); g.lineTo(s.bx + k * 0.8, this.BY + 28); g.stroke(); }

    if (s.boom) for (let k = 0; k < 10; k++) {
      const a = k * 0.63; Draw.circle(g, s.boom.x + Math.cos(a) * 40, s.boom.y + Math.sin(a) * 40, 22);
      g.fillStyle = k % 2 ? '#ff7b00' : '#ffd400'; g.fill();
    }
    Draw.text(g, `${s.got} / ${s.need}`, W - 90, 50, 44);
  },
});
