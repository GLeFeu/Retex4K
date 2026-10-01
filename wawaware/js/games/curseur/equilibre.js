// CURSEUR : garder le balai en équilibre sur le doigt (bouger sous le côté où il penche)
Engine.register({
  id: 'equilibre', name: 'Équilibriste', icon: '🧹', instruction: 'ÉQUILIBRE !', input: 'curseur',
  hint: 'BOUGE SOUS LE CÔTÉ OÙ IL PENCHE', duration: 5, survival: true, cursor: 'none', BY: 440, L: 200,

  start(c) {
    return { t: 0, a: (c.rng() < 0.5 ? -1 : 1) * 0.06, w: 0, px: c.input.x, vx: 0, g: 5 + 0.6 * Math.min(c.diff, 6) };
  },

  update(s, dt, c) {
    s.t += dt;
    if (s.lost) { s.a += s.w * dt; s.w += Math.sign(s.a) * 8 * dt; s.a = clamp(s.a, -1.6, 1.6); return; }
    const x = clamp(c.input.x, 60, W - 60);
    const vx = (x - s.px) / Math.max(dt, 0.001);
    const ax = clamp((vx - s.vx) / Math.max(dt, 0.001), -40000, 40000);
    s.px = x; s.vx += (vx - s.vx) * 0.5;
    // pendule inversé : la gravité fait tomber, accélérer la base dans le sens de la chute redresse
    s.w += (s.g * Math.sin(s.a) - (ax / 700) * Math.cos(s.a)) * dt;
    s.w *= 1 - 0.6 * dt;
    s.a += s.w * dt;
    if (Math.abs(s.a) > 1.1 && !c.over) { s.lost = true; c.sfx.thump(); }
  },

  draw(s, g) {
    g.fillStyle = '#fec89a'; g.fillRect(0, 0, W, H);
    Draw.ground(g, 490, '#d8e2dc', '#adb5bd');
    const x = s.px;
    // bras
    Draw.rrect(g, x - 14, this.BY, 28, 80, 12); Draw.fillStroke(g, '#ffcf9e');
    g.save(); g.translate(x, this.BY); g.rotate(s.a);
    Draw.rrect(g, -5, -this.L, 10, this.L, 4); Draw.fillStroke(g, '#bc6c25');
    g.beginPath(); g.moveTo(-40, -this.L - 50); g.lineTo(40, -this.L - 50); g.lineTo(18, -this.L + 4); g.lineTo(-18, -this.L + 4); g.closePath();
    Draw.fillStroke(g, '#ffd166');
    g.restore();
    const k = Math.abs(s.a) / 1.1;
    Draw.text(g, k > 0.6 ? (s.a > 0 ? 'ÇA PENCHE →' : '← ÇA PENCHE') : '', W / 2, 50, 40, '#ef233c');
  },
});
