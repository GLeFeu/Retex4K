// MOLETTE (haut/bas) : régler l'aiguille de l'horloge sur l'heure demandée
Engine.register({
  id: 'horloge', name: 'Quelle heure ?', icon: '🕒', instruction: 'METS À L\'HEURE !', input: 'molette',
  hint: 'TOURNE L\'AIGUILLE SUR L\'HEURE AFFICHÉE', duration: 5, CX: 380, CY: 270,

  start(c) {
    const target = 1 + Math.floor(c.rng() * 12);
    return { t: 0, h: ((target + 5 + Math.floor(c.rng() * 3)) % 12), shown: 0, target, hold: 0 };
  },

  update(s, dt, c) {
    s.t += dt;
    if (s.won) return;
    if (!c.over && c.input.wheelDelta) { s.h += c.input.wheelDelta; c.sfx.tone(1400, 0.02, 'square', 0.04); }
    s.shown += (s.h - s.shown) * Math.min(1, dt * 14);
    const cur = ((Math.round(s.h) % 12) + 12) % 12 || 12;
    if (cur === s.target) s.hold += dt; else s.hold = 0;
    if (s.hold > 0.4 && !c.over) { s.won = true; c.sfx.tone(800, 0.1, 'sine', 0.12); c.sfx.tone(800, 0.1, 'sine', 0.12, 0.2); }
  },

  draw(s, g) {
    g.fillStyle = '#cdb4db'; g.fillRect(0, 0, W, H);
    Draw.circle(g, this.CX, this.CY, 210); Draw.fillStroke(g, '#ffc8dd', '#1a1a1a', 10);
    Draw.circle(g, this.CX, this.CY, 185); Draw.fillStroke(g, '#fff', '#1a1a1a', 4);
    for (let i = 1; i <= 12; i++) {
      const a = i * Math.PI / 6 - Math.PI / 2;
      Draw.text(g, String(i), this.CX + Math.cos(a) * 150, this.CY + Math.sin(a) * 150, 36, i === s.target ? '#ef233c' : '#1a1a1a', null);
    }
    const a = s.shown * Math.PI / 6 - Math.PI / 2;
    g.lineCap = 'round'; g.lineWidth = 16; g.strokeStyle = '#1a1a1a';
    g.beginPath(); g.moveTo(this.CX, this.CY); g.lineTo(this.CX + Math.cos(a) * 110, this.CY + Math.sin(a) * 110); g.stroke();
    g.lineWidth = 6; g.beginPath(); g.moveTo(this.CX, this.CY); g.lineTo(this.CX, this.CY - 160); g.stroke();
    Draw.circle(g, this.CX, this.CY, 14); Draw.fillStroke(g, '#ef233c');
    // réveil numérique
    Draw.rrect(g, 650, 190, 250, 140, 20); Draw.fillStroke(g, '#1a1a1a', '#000');
    Draw.text(g, `${s.target}:00`, 775, 260, 70, '#06d6a0', null);
  },
});
