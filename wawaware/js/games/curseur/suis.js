// CURSEUR (mouvement seul) : garder la souris sur la luciole
Engine.register({
  id: 'suis',
  name: 'Luciole',
  icon: '✨',
  instruction: 'SUIS-LA !',
  input: 'curseur',
  hint: 'GARDE LA SOURIS SUR LA LUCIOLE',
  duration: 5,
  survival: true,
  cursor: 'none',

  start(c) {
    const d = Math.min(c.diff, 6);
    const s = {
      t: 0, out: 0, trail: [],
      p1: c.rng() * Math.PI * 2, p2: c.rng() * Math.PI * 2,
      w1: 1.0 + 0.15 * d + c.rng() * 0.3,
      w2: 1.4 + 0.2 * d + c.rng() * 0.3,
      R: Math.max(38, 64 - 4 * c.diff),
      stars: Array.from({ length: 60 }, () => ({ x: c.rng() * W, y: c.rng() * H, r: 0.5 + c.rng() * 2, p: c.rng() * 6 })),
    };
    this.place(s);
    return s;
  },

  place(s) {
    s.x = W / 2 + 300 * Math.sin(s.w1 * s.t + s.p1);
    s.y = 240 + 140 * Math.sin(s.w2 * s.t + s.p2);
  },

  update(s, dt, c) {
    s.t += dt;
    if (!s.lost) this.place(s);
    s.trail.push({ x: s.x, y: s.y });
    if (s.trail.length > 18) s.trail.shift();
    if (s.lost || c.over) return;
    const inside = Math.hypot(c.input.x - s.x, c.input.y - s.y) < s.R;
    // petite tolérance au début (le temps d'attraper la luciole) et en sortie de zone
    if (inside || s.t < 0.45) s.out = 0; else s.out += dt;
    if (s.out > 0.4) { s.lost = true; c.sfx.hit(); }
  },

  draw(s, g, c) {
    const bg = g.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, '#10002b'); bg.addColorStop(1, '#3c096c');
    g.fillStyle = bg;
    g.fillRect(0, 0, W, H);
    for (const st of s.stars) {
      g.globalAlpha = 0.4 + 0.4 * Math.sin(s.t * 3 + st.p);
      Draw.circle(g, st.x, st.y, st.r); g.fillStyle = '#fff'; g.fill();
    }
    g.globalAlpha = 1;
    // herbes
    g.fillStyle = '#1b4332';
    g.beginPath(); g.moveTo(0, H);
    for (let x = 0; x <= W; x += 30) g.lineTo(x, H - 70 - ((x * 7) % 40));
    g.lineTo(W, H); g.fill();

    // traînée
    s.trail.forEach((p, i) => {
      g.globalAlpha = (i / s.trail.length) * 0.5;
      Draw.circle(g, p.x, p.y, 4 + i * 0.5); g.fillStyle = '#ffe66d'; g.fill();
    });
    g.globalAlpha = 1;

    // zone + halo
    const inside = Math.hypot(c.input.x - s.x, c.input.y - s.y) < s.R;
    const halo = g.createRadialGradient(s.x, s.y, 0, s.x, s.y, s.R * 1.6);
    halo.addColorStop(0, 'rgba(255,240,150,0.55)'); halo.addColorStop(1, 'rgba(255,240,150,0)');
    g.fillStyle = halo;
    Draw.circle(g, s.x, s.y, s.R * 1.6); g.fill();
    g.setLineDash([10, 8]);
    Draw.circle(g, s.x, s.y, s.R);
    g.lineWidth = 4;
    g.strokeStyle = !s.lost && (inside || s.t < 0.45) ? '#7dff9a' : '#ff5c7a';
    g.stroke();
    g.setLineDash([]);

    // luciole
    const flap = Math.sin(s.t * 40) * 6;
    Draw.ellipse(g, s.x - 10, s.y - 10, 12, 6 + flap * 0.3, -0.6); Draw.fillStroke(g, 'rgba(220,240,255,0.8)', '#1a1a1a', 2);
    Draw.ellipse(g, s.x + 10, s.y - 10, 12, 6 - flap * 0.3, 0.6); Draw.fillStroke(g, 'rgba(220,240,255,0.8)', '#1a1a1a', 2);
    Draw.circle(g, s.x, s.y + 6, 12); Draw.fillStroke(g, '#ffe66d', '#1a1a1a', 3);
    Draw.circle(g, s.x, s.y - 8, 9); Draw.fillStroke(g, '#3a3a3a', '#1a1a1a', 3);
    Draw.circle(g, s.x - 3, s.y - 9, 2.5); g.fillStyle = '#fff'; g.fill();
    Draw.circle(g, s.x + 3, s.y - 9, 2.5); g.fill();

    // curseur + jauge de sortie
    const cx = c.input.x, cy = c.input.y;
    Draw.circle(g, cx, cy, 8); Draw.fillStroke(g, '#fff', '#1a1a1a', 3);
    if (s.out > 0) {
      g.beginPath();
      g.arc(cx, cy, 18, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * Math.min(1, s.out / 0.4));
      g.lineWidth = 5; g.strokeStyle = '#ff5c7a'; g.stroke();
    }
  },
});
