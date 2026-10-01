// SOURIS (tracer) : dessiner un cercle bien rond d'un seul trait
Engine.register({
  id: 'dessine', name: 'Cercle parfait', icon: '⭕', instruction: 'DESSINE UN ROND !', input: 'souris',
  hint: 'MAINTIENS LE CLIC ET TRACE UN CERCLE', duration: 6, cursor: 'crosshair',

  start(c) { return { t: 0, pts: [], drawing: false, score: -1, need: Math.min(0.85, 0.7 + 0.03 * c.diff), msg: '' }; },

  grade(pts) {
    if (pts.length < 12) return 0;
    const cx = pts.reduce((a, p) => a + p.x, 0) / pts.length, cy = pts.reduce((a, p) => a + p.y, 0) / pts.length;
    const rs = pts.map(p => Math.hypot(p.x - cx, p.y - cy));
    const r = rs.reduce((a, b) => a + b, 0) / rs.length;
    if (r < 50) return 0;
    const dev = Math.sqrt(rs.reduce((a, b) => a + (b - r) ** 2, 0) / rs.length) / r;
    // le tracé doit faire (presque) le tour complet
    let turn = 0;
    for (let i = 1; i < pts.length; i++) {
      let d = Math.atan2(pts[i].y - cy, pts[i].x - cx) - Math.atan2(pts[i - 1].y - cy, pts[i - 1].x - cx);
      if (d > Math.PI) d -= Math.PI * 2; if (d < -Math.PI) d += Math.PI * 2;
      turn += d;
    }
    const cover = Math.min(1, Math.abs(turn) / (Math.PI * 2 * 0.9));
    return clamp((1 - dev * 3) * cover, 0, 1);
  },

  update(s, dt, c) {
    s.t += dt;
    if (s.won || c.over) return;
    const inp = c.input;
    if (inp.clicked) { s.pts = []; s.drawing = true; s.msg = ''; }
    if (s.drawing && inp.down) {
      const last = s.pts[s.pts.length - 1];
      if (!last || Math.hypot(last.x - inp.x, last.y - inp.y) > 6) s.pts.push({ x: inp.x, y: inp.y });
    }
    if (s.drawing && !inp.down) {
      s.drawing = false;
      s.score = this.grade(s.pts);
      if (s.score >= s.need) s.won = true; else { s.msg = 'PAS ASSEZ ROND, RECOMMENCE !'; c.sfx.tone(150, 0.12, 'sawtooth', 0.08); }
    }
  },

  draw(s, g) {
    g.fillStyle = '#fefae0'; g.fillRect(0, 0, W, H);
    g.strokeStyle = '#a2d2ff'; g.lineWidth = 2;
    for (let y = 40; y < H; y += 40) { g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke(); }
    g.strokeStyle = '#ffafcc'; g.beginPath(); g.moveTo(90, 0); g.lineTo(90, H); g.stroke();
    if (s.pts.length > 1) {
      g.lineWidth = 8; g.lineCap = 'round'; g.lineJoin = 'round'; g.strokeStyle = s.won ? '#06d6a0' : '#1a1a1a';
      g.beginPath(); s.pts.forEach((p, i) => (i ? g.lineTo(p.x, p.y) : g.moveTo(p.x, p.y))); g.stroke();
    }
    if (s.score >= 0) Draw.text(g, `${Math.round(s.score * 100)}% ROND (${Math.round(s.need * 100)}% REQUIS)`, W / 2, 40, 32, s.won ? '#06d6a0' : '#ef233c');
    if (s.msg) Draw.text(g, s.msg, W / 2, 500, 30, '#ef233c');
  },
});
