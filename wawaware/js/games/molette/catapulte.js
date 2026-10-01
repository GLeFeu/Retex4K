// MOLETTE : tendre la catapulte juste ce qu'il faut, elle tire quand on arrête de tourner
Engine.register({
  id: 'catapulte', name: 'Catapulte', icon: '🏰', instruction: 'VISE LE CHÂTEAU !', input: 'molette',
  hint: 'TENDS AVEC LA MOLETTE, ARRÊTE POUR TIRER', duration: 6, CX: 140,

  start(c) {
    const tx = 520 + c.rng() * 340;
    return { t: 0, ten: 0, idle: 0, fired: false, bx: 0, by: 0, vx: 0, vy: 0, tx, tw: Math.max(50, 90 - 6 * c.diff), boom: false };
  },

  update(s, dt, c) {
    s.t += dt;
    if (!s.fired) {
      if (!c.over && c.input.wheelNotches) { s.ten = Math.min(1, s.ten + c.input.wheelNotches * 0.04); s.idle = 0; c.sfx.tone(200 + s.ten * 400, 0.03, 'square', 0.05); }
      else if (s.ten > 0.05) s.idle += dt;
      if (s.idle > 0.6) {
        s.fired = true; s.bx = this.CX + 40; s.by = 330;
        const v = 250 + s.ten * 650; s.vx = v * 0.7; s.vy = -v * 0.7;
        c.sfx.jump();
      }
      return;
    }
    if (s.won || s.lost) return;
    s.vy += 900 * dt; s.bx += s.vx * dt; s.by += s.vy * dt;
    if (s.by >= 430) {
      s.by = 430;
      if (Math.abs(s.bx - s.tx) < s.tw / 2 + 10) { s.won = true; s.boom = true; c.sfx.hit(); } else { s.lost = true; c.sfx.thump(); }
    }
  },

  draw(s, g) {
    Draw.sky(g, '#a9def9', '#e4c1f9', 430);
    Draw.ground(g, 430, '#80b918', '#55a630');
    // château cible
    g.save(); g.translate(s.tx, 430);
    if (!s.boom) {
      Draw.rrect(g, -s.tw / 2, -110, s.tw, 110, 0); Draw.fillStroke(g, '#adb5bd');
      for (let i = 0; i < 3; i++) { g.fillStyle = '#adb5bd'; g.fillRect(-s.tw / 2 + i * (s.tw / 2.5), -130, s.tw / 5, 22); }
      g.fillStyle = '#1a1a1a'; g.fillRect(-10, -50, 20, 50);
      g.fillStyle = '#ef233c'; g.fillRect(0, -175, 4, 45); g.fillRect(4, -175, 26, 16);
    } else Draw.burst(g, 0, -60, 90);
    g.restore();
    // catapulte
    g.fillStyle = '#7f5539'; g.fillRect(this.CX - 60, 400, 140, 30);
    for (const wx of [this.CX - 40, this.CX + 60]) { Draw.circle(g, wx, 430, 16); Draw.fillStroke(g, '#582f0e'); }
    g.save(); g.translate(this.CX + 10, 400); g.rotate(s.fired ? 0.9 : -0.3 - s.ten); // le bras recule avec la tension, bascule au tir
    Draw.rrect(g, -6, -120, 12, 120, 4); Draw.fillStroke(g, '#9c6644');
    if (!s.fired) { Draw.circle(g, 0, -126, 16); Draw.fillStroke(g, '#495057'); }
    g.restore();
    if (s.fired && !s.boom) { Draw.circle(g, s.bx, s.by, 16); Draw.fillStroke(g, '#495057'); }
    // jauge de tension
    Draw.rrect(g, 40, 60, 30, 260, 14); Draw.fillStroke(g, '#fff');
    const h = 252 * s.ten; if (h > 1) { Draw.rrect(g, 44, 316 - h, 22, h, 10); g.fillStyle = '#fb8500'; g.fill(); }
    if (!s.fired && s.ten > 0.05) Draw.text(g, s.idle > 0.2 ? 'FEU !' : 'TENSION…', 200, 80, 34, '#1a1a1a', '#fff');
  },
});
