// CLAVIER (Espace, timing) : renvoyer la balle au bon moment, plusieurs échanges
Engine.register({
  id: 'tennis', name: 'Tennis', icon: '🎾', instruction: 'RENVOIE !', input: 'clavier',
  hint: 'ESPACE QUAND LA BALLE ARRIVE SUR TOI', duration: 7, PX: 170, OX: 790,

  start(c) { return { t: 0, x: this.OX, dir: -1, p: 0, sp: 1.1 + 0.12 * Math.min(c.diff, 6), need: 3, got: 0, swing: 0, swung: false }; },

  update(s, dt, c) {
    s.t += dt;
    s.swing = Math.max(0, s.swing - dt);
    if (s.won || s.lost) return;
    s.p += s.sp * dt;
    s.x = s.dir < 0 ? this.OX + (this.PX - this.OX) * s.p : this.PX + (this.OX - this.PX) * s.p;
    if (s.dir < 0) {
      if (!c.over && c.input.wasPressed('Space') && !s.swung) {
        s.swung = true; s.swing = 0.2;
        if (s.p > 0.78 && s.p < 1.08) { s.got++; c.sfx.tone(700, 0.05, 'square', 0.1); if (s.got >= s.need) { s.won = true; return; } s.dir = 1; s.p = 0; s.swung = false; }
        else { s.lost = true; c.sfx.lose(); }
      }
      if (s.p > 1.15 && !c.over) { s.lost = true; c.sfx.lose(); }
    } else if (s.p >= 1) { s.dir = -1; s.p = 0; s.sp *= 1.08; c.sfx.tone(500, 0.05, 'square', 0.08); }
  },

  draw(s, g) {
    g.fillStyle = '#2a9d8f'; g.fillRect(0, 0, W, H);
    g.fillStyle = '#e76f51'; g.fillRect(60, 300, W - 120, 200);
    g.strokeStyle = '#fff'; g.lineWidth = 4; g.strokeRect(60, 300, W - 120, 200);
    g.fillStyle = '#fff'; g.fillRect(W / 2 - 3, 230, 6, 120);
    g.fillStyle = 'rgba(255,255,255,0.4)'; g.fillRect(W / 2 - 3, 240, 6, 100);
    const arc = Math.sin(clamp(s.p, 0, 1) * Math.PI) * 160;
    const by = 380 - arc;
    Draw.ellipse(g, s.x, 470, 12, 4); g.fillStyle = 'rgba(0,0,0,0.3)'; g.fill();
    Draw.circle(g, s.x, by, 13); Draw.fillStroke(g, '#ccff33');
    Draw.hero(g, this.PX - 40, 480, { rot: s.swing > 0 ? 0.3 : 0 });
    g.save(); g.translate(this.PX - 10, 420); g.rotate(s.swing > 0 ? -1.2 : 0.4);
    g.fillStyle = '#1a1a1a'; g.fillRect(-4, -10, 8, 50); Draw.ellipse(g, 0, -40, 22, 30); g.lineWidth = 5; g.strokeStyle = '#1a1a1a'; g.stroke();
    g.restore();
    Draw.hero(g, this.OX + 40, 480, { face: -1, shirt: '#3a86ff' });
    // zone de frappe
    g.strokeStyle = 'rgba(255,255,255,0.6)'; g.setLineDash([8, 6]); g.strokeRect(this.PX - 10, 250, 140, 230); g.setLineDash([]);
    Draw.text(g, `${s.got} / ${s.need}`, W / 2, 60, 44);
  },
});
