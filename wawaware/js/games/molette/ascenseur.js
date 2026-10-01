// MOLETTE (haut/bas) : arrêter l'ascenseur pile à l'étage où quelqu'un attend
Engine.register({
  id: 'ascenseur', name: 'L\'ascenseur', icon: '🛗', instruction: 'BON ÉTAGE !', input: 'molette',
  hint: 'MOLETTE ↑↓ ET ARRÊTE-TOI À L\'ÉTAGE', duration: 5, FLOORS: 8, FH: 60, BASE: 500,

  start(c) {
    const target = 2 + Math.floor(c.rng() * 6);
    return { t: 0, f: target > 4 ? 0 : 7, target, hold: 0 };
  },

  update(s, dt, c) {
    s.t += dt;
    if (s.won) return;
    if (!c.over && c.input.wheelDelta) s.f = clamp(s.f - c.input.wheelDelta * 0.5, 0, this.FLOORS - 1);
    // l'ascenseur se cale doucement sur l'étage le plus proche
    const near = Math.round(s.f);
    s.f += (near - s.f) * Math.min(1, dt * 4);
    if (Math.abs(s.f - s.target) < 0.12) s.hold += dt; else s.hold = 0;
    if (s.hold > 0.45 && !c.over) { s.won = true; c.sfx.tone(1200, 0.15, 'sine', 0.12); c.sfx.tone(900, 0.2, 'sine', 0.12, 0.15); }
  },

  draw(s, g) {
    g.fillStyle = '#e9ecef'; g.fillRect(0, 0, W, H);
    Draw.rrect(g, 300, this.BASE - this.FLOORS * this.FH - 10, 360, this.FLOORS * this.FH + 20, 6); Draw.fillStroke(g, '#adb5bd');
    for (let i = 0; i < this.FLOORS; i++) {
      const y = this.BASE - (i + 1) * this.FH;
      g.fillStyle = '#6c757d'; g.fillRect(300, y + this.FH - 4, 360, 4);
      Draw.text(g, String(i), 270, y + this.FH / 2, 28, '#1a1a1a', null);
      if (i === s.target && !s.won) {
        Draw.hero(g, 600, y + this.FH - 4, { face: -1 });
        Draw.text(g, '!', 640, y + 6, 30, '#ef233c');
      }
    }
    const cy = this.BASE - (s.f + 1) * this.FH;
    g.strokeStyle = '#1a1a1a'; g.lineWidth = 3; g.beginPath(); g.moveTo(420, 20); g.lineTo(420, cy); g.stroke();
    Draw.rrect(g, 360, cy + 2, 120, this.FH - 6, 6); Draw.fillStroke(g, '#ffd166');
    if (s.won) Draw.hero(g, 420, cy + this.FH - 6, {});
    // tableau de bord
    Draw.rrect(g, 720, 160, 180, 160, 16); Draw.fillStroke(g, '#1a1a1a', '#000');
    Draw.text(g, String(Math.round(s.f)), 810, 230, 80, '#06d6a0', null);
    Draw.text(g, `→ ${s.target}`, 810, 295, 30, '#ffd400', null);
  },
});
