// SOURIS : cueillir les bonnes pommes, pas les pourries
Engine.register({
  id: 'pommes', name: 'La cueillette', icon: '🍏', instruction: 'CUEILLE !', input: 'souris',
  hint: 'CLIQUE 4 POMMES (PAS LES POURRIES)', duration: 5, cursor: 'pointer',

  start(c) {
    const apples = [];
    const rotten = c.diff >= 2 ? 2 + Math.min(3, c.diff - 2) : 0;
    for (let i = 0; i < 6 + rotten; i++) {
      const a = c.rng() * Math.PI * 2, r = c.rng() * 170;
      apples.push({ x: 480 + Math.cos(a) * r * 1.3, y: 200 + Math.sin(a) * r * 0.8, bad: i < rotten, fall: false, vy: 0 });
    }
    return { t: 0, apples, got: 0, need: 4 };
  },

  update(s, dt, c) {
    s.t += dt;
    for (const a of s.apples) if (a.fall && a.y < 470) { a.vy += 1500 * dt; a.y += a.vy * dt; }
    if (s.won || s.lost || c.over || !c.input.clicked) return;
    const a = s.apples.find(o => !o.fall && Math.hypot(c.input.x - o.x, c.input.y - o.y) < 30);
    if (!a) return;
    a.fall = true;
    if (a.bad) { s.lost = true; c.sfx.hit(); return; }
    s.got++;
    c.sfx.tone(700, 0.06, 'square', 0.1);
    if (s.got >= s.need) s.won = true;
  },

  draw(s, g) {
    Draw.sky(g, '#bde0fe', '#e2eafc');
    Draw.ground(g, 450, '#80b918', '#55a630');
    Draw.rrect(g, 450, 280, 60, 190, 10); Draw.fillStroke(g, '#7f5539');
    for (const [x, y, r] of [[480, 200, 200], [340, 230, 110], [620, 230, 110]]) { Draw.ellipse(g, x, y, r * 1.2, r * 0.8); Draw.fillStroke(g, '#2d6a4f'); }
    for (const a of s.apples) {
      Draw.circle(g, a.x, a.y, 20); Draw.fillStroke(g, a.bad ? '#7f5539' : '#ef233c');
      if (a.bad) { Draw.circle(g, a.x - 6, a.y + 4, 5); g.fillStyle = '#3d2817'; g.fill(); }
      Draw.ellipse(g, a.x + 6, a.y - 20, 7, 3, -0.5); Draw.fillStroke(g, '#52b788', '#1a1a1a', 2);
    }
    Draw.text(g, `${s.got} / ${s.need}`, W - 90, 60, 44);
  },
});
