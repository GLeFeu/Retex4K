// SOURIS (glisser-déposer) : amener l'os jusqu'à la gueule du chien
Engine.register({
  id: 'nourris',
  name: 'Nourris le chien',
  icon: '🦴',
  instruction: 'NOURRIS !',
  input: 'souris',
  hint: 'GLISSE L\'OS DANS SA GUEULE',
  duration: 5,
  cursor: 'grab',

  start(c) {
    return {
      t: 0, fx: 150 + c.rng() * 120, fy: GROUND - 20, vy: 0, drag: false,
      dogY: 280, ph: c.rng() * 6, move: c.diff >= 1 ? Math.min(150, 50 + 20 * c.diff) : 0, eat: 0,
    };
  },

  mouth(s) { return { x: 640, y: s.dogY + 45 }; },

  update(s, dt, c) {
    const inp = c.input;
    s.t += dt;
    s.dogY = 280 + Math.sin(s.t * 2.5 + s.ph) * s.move;
    if (s.won) { s.eat += dt; return; }
    if (!s.drag && inp.clicked && !c.over && Math.hypot(inp.x - s.fx, inp.y - s.fy) < 70) s.drag = true;
    if (s.drag) {
      s.fx = inp.x; s.fy = inp.y; s.vy = 0;
      if (!inp.down || c.over) s.drag = false;
      const m = this.mouth(s);
      if (Math.hypot(s.fx - m.x, s.fy - m.y) < 55) { s.won = true; c.sfx.tone(500, 0.1, 'square', 0.1); c.sfx.tone(700, 0.15, 'square', 0.1, 0.1); }
    } else if (s.fy < GROUND - 20) {
      s.vy += 1600 * dt;
      s.fy = Math.min(GROUND - 20, s.fy + s.vy * dt);
    }
  },

  draw(s, g) {
    g.fillStyle = '#bde0fe'; g.fillRect(0, 0, W, GROUND);
    g.fillStyle = '#a2d2ff';
    for (let x = 0; x < W; x += 60) g.fillRect(x, 0, 30, GROUND);
    g.fillStyle = '#e9c46a'; g.fillRect(0, GROUND, W, H - GROUND);
    g.fillStyle = '#d4a944'; g.fillRect(0, GROUND, W, 8);

    // chien
    const y = s.dogY;
    Draw.ellipse(g, 820, y + 170, 110, 80); Draw.fillStroke(g, '#c68b59');
    Draw.ellipse(g, 790, y - 20, 30, 60, 0.3); Draw.fillStroke(g, '#8d5b3c');
    Draw.circle(g, 740, y + 20, 75); Draw.fillStroke(g, '#c68b59');
    Draw.ellipse(g, 680, y + 40, 55, 40); Draw.fillStroke(g, '#e6b58c');
    Draw.ellipse(g, 642, y + 20, 14, 11); Draw.fillStroke(g, '#1a1a1a');
    Draw.circle(g, 720, y - 10, 9); g.fillStyle = '#1a1a1a'; g.fill();
    Draw.circle(g, 723, y - 13, 3); g.fillStyle = '#fff'; g.fill();
    if (s.won) {
      Draw.ellipse(g, 650, y + 48, 26, 8); Draw.fillStroke(g, '#1a1a1a');
      const k = Math.floor(s.eat * 6) % 2;
      Draw.text(g, k ? 'MIAM !' : 'CROC !', 600, y - 60, 40, '#ffd400');
      Draw.text(g, '♥', 760, y - 80 - s.eat * 40, 50, '#ff3c6e');
    } else {
      Draw.ellipse(g, 645, y + 48, 26, 20); Draw.fillStroke(g, '#6a040f');
      Draw.ellipse(g, 648, y + 60, 14, 8); g.fillStyle = '#ff8fa3'; g.fill();
    }

    if (!s.won) {
      g.save();
      g.translate(s.fx, s.fy);
      g.rotate(s.drag ? -0.3 : 0);
      for (const sx of [-32, 32]) {
        Draw.circle(g, sx, -9, 12); Draw.fillStroke(g, '#fff');
        Draw.circle(g, sx, 9, 12); Draw.fillStroke(g, '#fff');
      }
      g.fillStyle = '#fff'; g.fillRect(-32, -9, 64, 18);
      g.strokeStyle = '#1a1a1a'; g.lineWidth = 4;
      g.beginPath(); g.moveTo(-30, -9); g.lineTo(30, -9); g.moveTo(-30, 9); g.lineTo(30, 9); g.stroke();
      g.restore();
    }
  },
});
