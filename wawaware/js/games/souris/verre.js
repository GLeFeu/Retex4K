// SOURIS (maintenir) : remplir le verre jusqu'au trait sans déborder
Engine.register({
  id: 'verre', name: 'Remplis le verre', icon: '🥛', instruction: 'REMPLIS !', input: 'souris',
  hint: 'MAINTIENS LE CLIC, LÂCHE DANS LA ZONE', duration: 5, cursor: 'pointer',

  start(c) {
    const lo = 0.6 + c.rng() * 0.15;
    return { t: 0, level: 0, pour: false, poured: false, lo, hi: lo + Math.max(0.08, 0.16 - 0.012 * c.diff), rate: 0.45 + 0.05 * Math.min(c.diff, 6) };
  },

  update(s, dt, c) {
    s.t += dt;
    if (s.won || s.lost || c.over) { s.pour = false; return; }
    s.pour = c.input.down;
    if (s.pour) { s.level += s.rate * dt; s.poured = true; }
    if (s.level > 1) { s.lost = true; c.sfx.splat(); }
    else if (!s.pour && s.poured) {
      if (s.level >= s.lo && s.level <= s.hi) s.won = true; else { s.lost = true; c.sfx.hit(); }
    }
  },

  draw(s, g) {
    g.fillStyle = '#ffe5ec'; g.fillRect(0, 0, W, H);
    Draw.ground(g, 450, '#bc6c25', '#99582a');
    const gx = 400, gy = 170, gw = 160, gh = 270;
    // bouteille
    g.save(); g.translate(560, 120); g.rotate(s.pour ? 2.2 : 1.2);
    Draw.rrect(g, -30, -140, 60, 150, 14); Draw.fillStroke(g, '#ff9f1c');
    Draw.rrect(g, -12, -180, 24, 44, 6); Draw.fillStroke(g, '#ff9f1c');
    g.restore();
    if (s.pour) { g.fillStyle = '#ff9f1c'; g.fillRect(gx + gw / 2 - 6, 90, 12, gy + gh - 90 - s.level * gh); }
    // liquide
    const lh = Math.min(1, s.level) * (gh - 10);
    g.fillStyle = '#ffbf69'; g.fillRect(gx + 6, gy + gh - 5 - lh, gw - 12, lh);
    if (s.level > 1) { g.fillStyle = '#ffbf69'; g.fillRect(gx - 20, gy + gh - 10, gw + 40, 20); }
    // zone cible
    const zy1 = gy + gh - 5 - s.hi * (gh - 10), zy2 = gy + gh - 5 - s.lo * (gh - 10);
    g.fillStyle = 'rgba(6,214,160,0.35)'; g.fillRect(gx - 30, zy1, gw + 60, zy2 - zy1);
    g.strokeStyle = '#06d6a0'; g.lineWidth = 3; g.strokeRect(gx - 30, zy1, gw + 60, zy2 - zy1);
    // verre
    g.lineWidth = 6; g.strokeStyle = '#1a1a1a';
    g.beginPath(); g.moveTo(gx, gy); g.lineTo(gx, gy + gh); g.lineTo(gx + gw, gy + gh); g.lineTo(gx + gw, gy); g.stroke();
    g.fillStyle = 'rgba(255,255,255,0.3)'; g.fillRect(gx + 14, gy + 10, 12, gh - 20);
  },
});
