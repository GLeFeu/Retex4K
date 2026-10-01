// MOLETTE (haut/bas) : faire la mise au point de l'appareil photo
Engine.register({
  id: 'focus', name: 'Mise au point', icon: '📷', instruction: 'FAIS LE POINT !', input: 'molette',
  hint: 'MOLETTE ↑↓ JUSQU\'À CE QUE CE SOIT NET', duration: 5,

  start(c) {
    const target = 0.2 + c.rng() * 0.6;
    let f = c.rng() < 0.5 ? target - 0.35 : target + 0.35;
    f = clamp(f, 0, 1);
    return { t: 0, f, target, hold: 0, zone: Math.max(0.03, 0.06 - 0.004 * c.diff), shot: 0, subject: Math.floor(c.rng() * 2) };
  },

  update(s, dt, c) {
    s.t += dt;
    if (s.won) { s.shot += dt; return; }
    if (!c.over && c.input.wheelDelta) s.f = clamp(s.f - c.input.wheelDelta * 0.035, 0, 1);
    if (Math.abs(s.f - s.target) < s.zone) s.hold += dt; else s.hold = 0;
    if (s.hold > 0.4 && !c.over) { s.won = true; c.sfx.noise(0.12, 0.3, 0, 5000); }
  },

  draw(s, g) {
    const blur = Math.min(14, Math.abs(s.f - s.target) * 40);
    g.save();
    g.filter = blur > 0.5 ? `blur(${blur.toFixed(1)}px)` : 'none';
    Draw.sky(g, '#90e0ef', '#caf0f8');
    Draw.ground(g, 400, '#80b918');
    if (s.subject === 0) Draw.dog(g, 480, 430, { pose: 'assis', t: s.t, scale: 1.5 });
    else Draw.cat(g, 480, 430, { t: s.t, scale: 1.6 });
    Draw.cloud(g, 200, 90); Draw.cloud(g, 760, 120, 0.8);
    g.restore();
    // viseur
    g.strokeStyle = '#fff'; g.lineWidth = 4;
    g.strokeRect(80, 50, W - 160, H - 100);
    Draw.circle(g, W / 2, H / 2, 40); g.stroke();
    const sharp = clamp(1 - Math.abs(s.f - s.target) * 6, 0, 1);
    Draw.rrect(g, 100, 470, 300, 26, 13); Draw.fillStroke(g, 'rgba(0,0,0,0.5)', '#fff', 3);
    if (sharp > 0.02) { Draw.rrect(g, 103, 473, 294 * sharp, 20, 10); g.fillStyle = sharp > 0.85 ? '#06d6a0' : '#ffd400'; g.fill(); }
    Draw.text(g, 'NETTETÉ', 470, 483, 26, '#fff');
    if (s.won) { g.fillStyle = `rgba(255,255,255,${Math.max(0, 1 - s.shot * 3)})`; g.fillRect(0, 0, W, H); }
  },
});
