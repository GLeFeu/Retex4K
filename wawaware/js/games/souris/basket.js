// SOURIS (glisser-lâcher) : tirer en arrière comme un lance-pierre pour marquer un panier
Engine.register({
  id: 'basket', name: 'Panier !', icon: '🏀', instruction: 'MARQUE !', input: 'souris',
  hint: 'TIRE LA BALLE EN ARRIÈRE PUIS LÂCHE', duration: 6, cursor: 'grab', BX: 200, BY: 400,

  start(c) { return { t: 0, x: this.BX, y: this.BY, vx: 0, vy: 0, flying: false, aiming: false, hy: 220, hmove: c.diff >= 2 ? 60 : 0, prevY: this.BY }; },

  hoopX() { return 740; },

  update(s, dt, c) {
    s.t += dt;
    const hy = s.hy + Math.sin(s.t * 2) * s.hmove;
    const inp = c.input;
    if (!s.flying && !s.won) {
      if (!s.aiming && inp.clicked && !c.over && Math.hypot(inp.x - s.x, inp.y - s.y) < 60) s.aiming = true;
      if (s.aiming && !inp.down) {
        s.aiming = false;
        const dx = this.BX - inp.x, dy = this.BY - inp.y;
        if (Math.hypot(dx, dy) > 20) { s.vx = dx * 5; s.vy = dy * 5; s.flying = true; c.sfx.jump(); }
      }
      return;
    }
    s.prevY = s.y;
    s.vy += 1200 * dt;
    s.x += s.vx * dt; s.y += s.vy * dt;
    const hx = this.hoopX();
    if (!s.won && s.vy > 0 && s.prevY < hy && s.y >= hy && Math.abs(s.x - hx) < 38) { s.won = true; c.sfx.tone(1000, 0.2, 'square', 0.1); }
    if (s.y > H + 60 || s.x > W + 60 || s.x < -60) { s.flying = false; s.x = this.BX; s.y = this.BY; if (s.won) s.flying = false; }
  },

  draw(s, g, c) {
    g.fillStyle = '#f4a261'; g.fillRect(0, 0, W, H);
    Draw.ground(g, 450, '#e76f51', '#c8553d');
    const hx = this.hoopX(), hy = s.hy + Math.sin(s.t * 2) * s.hmove;
    g.fillStyle = '#6c757d'; g.fillRect(hx + 60, hy - 100, 14, 560);
    Draw.rrect(g, hx + 20, hy - 110, 20, 120, 4); Draw.fillStroke(g, '#fff');
    g.strokeStyle = '#fff'; g.lineWidth = 3;
    for (let i = -3; i <= 3; i++) { g.beginPath(); g.moveTo(hx + i * 12, hy); g.lineTo(hx + i * 7, hy + 50); g.stroke(); }
    Draw.ellipse(g, hx, hy, 44, 10); g.lineWidth = 6; g.strokeStyle = '#ef233c'; g.stroke();
    if (s.aiming) {
      g.setLineDash([8, 8]); g.strokeStyle = '#fff'; g.lineWidth = 4;
      g.beginPath(); g.moveTo(this.BX, this.BY); g.lineTo(this.BX + (this.BX - c.input.x), this.BY + (this.BY - c.input.y)); g.stroke();
      g.setLineDash([]);
    }
    const bx = s.aiming ? c.input.x : s.x, by = s.aiming ? c.input.y : s.y;
    Draw.circle(g, bx, by, 26); Draw.fillStroke(g, '#fb8500');
    g.strokeStyle = '#1a1a1a'; g.lineWidth = 2;
    g.beginPath(); g.moveTo(bx - 26, by); g.lineTo(bx + 26, by); g.moveTo(bx, by - 26); g.lineTo(bx, by + 26); g.stroke();
  },
});
