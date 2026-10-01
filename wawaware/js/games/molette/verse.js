// MOLETTE : incliner la théière pour remplir la tasse jusqu'au trait, puis la redresser
Engine.register({
  id: 'verse', name: 'L\'heure du thé', icon: '🫖', instruction: 'SERS LE THÉ !', input: 'molette',
  hint: '↓ INCLINE · ↑ REDRESSE · ARRÊTE AU TRAIT', duration: 6,

  start(c) { const lo = 0.6 + c.rng() * 0.15; return { t: 0, tilt: 0, level: 0, lo, hi: lo + Math.max(0.1, 0.18 - 0.012 * c.diff), still: 0 }; },

  update(s, dt, c) {
    s.t += dt;
    if (s.won || s.lost) return;
    if (!c.over) s.tilt = clamp(s.tilt + c.input.wheelDelta * 0.08, 0, 1);
    const flow = Math.max(0, s.tilt - 0.35) * 0.9;
    s.level += flow * dt;
    if (s.level > 1) { s.lost = true; c.sfx.splat(); return; }
    if (flow === 0 && s.level >= s.lo && s.level <= s.hi) s.still += dt; else s.still = 0;
    if (s.still > 0.3 && !c.over) s.won = true;
  },

  draw(s, g) {
    g.fillStyle = '#e9edc9'; g.fillRect(0, 0, W, H);
    Draw.ground(g, 430, '#a98467', '#6c584c');
    // tasse
    const cx = 560, top = 280, ch = 140, cw = 150;
    const lh = Math.min(1, s.level) * (ch - 10);
    g.fillStyle = '#bc6c25'; g.fillRect(cx - cw / 2 + 6, top + ch - 6 - lh, cw - 12, lh);
    const z1 = top + ch - 6 - s.hi * (ch - 10), z2 = top + ch - 6 - s.lo * (ch - 10);
    g.fillStyle = 'rgba(6,214,160,0.35)'; g.fillRect(cx - cw / 2 - 20, z1, cw + 40, z2 - z1);
    g.lineWidth = 6; g.strokeStyle = '#1a1a1a';
    g.beginPath(); g.moveTo(cx - cw / 2, top); g.lineTo(cx - cw / 2 + 10, top + ch); g.lineTo(cx + cw / 2 - 10, top + ch); g.lineTo(cx + cw / 2, top); g.stroke();
    g.beginPath(); g.arc(cx + cw / 2 + 10, top + 60, 28, -Math.PI / 2, Math.PI / 2); g.stroke();
    if (s.level > 1) { g.fillStyle = '#bc6c25'; g.fillRect(cx - 120, 425, 240, 12); }
    // théière
    g.save(); g.translate(330, 200); g.rotate(s.tilt * 1.2);
    Draw.ellipse(g, 0, 0, 90, 70); Draw.fillStroke(g, '#ff8fab');
    g.beginPath(); g.moveTo(70, -10); g.quadraticCurveTo(130, -10, 150, -50); g.lineTo(160, -40); g.quadraticCurveTo(140, 20, 75, 25); g.closePath(); Draw.fillStroke(g, '#ff8fab');
    Draw.ellipse(g, 0, -70, 40, 12); Draw.fillStroke(g, '#fb6f92');
    g.beginPath(); g.arc(-95, 0, 30, Math.PI / 2, Math.PI * 1.5); g.lineWidth = 10; g.strokeStyle = '#1a1a1a'; g.stroke();
    g.restore();
    if (s.tilt > 0.35 && !s.lost) {
      const a = s.tilt * 1.2, sx = 330 + Math.cos(a) * 155 - Math.sin(a) * -45, sy = 200 + Math.sin(a) * 155 + Math.cos(a) * -45;
      g.strokeStyle = '#bc6c25'; g.lineWidth = 4 + (s.tilt - 0.35) * 14;
      g.beginPath(); g.moveTo(sx, sy); g.quadraticCurveTo(sx + 40, sy + 30, cx - 20, top + ch - 6 - lh); g.stroke();
    }
  },
});
