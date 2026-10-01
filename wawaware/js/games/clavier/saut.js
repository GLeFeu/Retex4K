// CLAVIER (Espace) : sauter par-dessus les cactus
Engine.register({
  id: 'saut',
  name: 'Course du désert',
  icon: '🌵',
  instruction: 'SAUTE !',
  input: 'clavier',
  hint: 'ESPACE POUR SAUTER',
  duration: 5,
  survival: true,

  PX: 200,

  start(c) {
    const count = 3 + (c.diff >= 3 ? 1 : 0);
    const first = 900, last = 2150;
    const obs = [];
    for (let i = 0; i < count; i++) {
      obs.push({
        x: first + ((last - first) * i) / (count - 1) + (c.rng() - 0.5) * 90,
        w: 38 + c.rng() * 14,
        h: 50 + c.rng() * 35,
      });
    }
    return { t: 0, py: GROUND, vy: 0, ground: true, dist: 0, speed: 430, obs, rot: 0 };
  },

  update(s, dt, c) {
    s.t += dt;
    if (!s.lost) {
      s.dist += s.speed * dt;
      for (const o of s.obs) o.x -= s.speed * dt;
      if (s.ground && !c.over && c.input.wasPressed('Space', 'ArrowUp', 'KeyW')) {
        s.vy = -800;
        s.ground = false;
        c.sfx.jump();
      }
    } else s.rot += dt * 10;

    s.vy += 2400 * dt;
    s.py += s.vy * dt;
    if (!s.lost && s.py >= GROUND) { s.py = GROUND; s.vy = 0; s.ground = true; }
    if (s.py > H + 200) s.py = H + 200;

    if (!s.lost && !c.over) {
      for (const o of s.obs) {
        if (Math.abs(o.x - this.PX) < o.w / 2 + 16 && s.py > GROUND - o.h + 6) {
          s.lost = true;
          s.vy = -650;
          c.sfx.hit();
        }
      }
    }
  },

  draw(s, g) {
    const sky = g.createLinearGradient(0, 0, 0, GROUND);
    sky.addColorStop(0, '#ff9e5e'); sky.addColorStop(1, '#ffe8c2');
    g.fillStyle = sky;
    g.fillRect(0, 0, W, H);
    Draw.circle(g, 780, 110, 60); g.fillStyle = '#ffd32a'; g.fill();

    // dunes au loin (parallaxe)
    g.fillStyle = '#f6c177';
    g.beginPath(); g.moveTo(0, GROUND);
    for (let x = 0; x <= W; x += 10) g.lineTo(x, GROUND - 60 - 30 * Math.sin((x + s.dist * 0.2) / 120));
    g.lineTo(W, GROUND); g.fill();

    // sol
    g.fillStyle = '#e1a95f'; g.fillRect(0, GROUND, W, H - GROUND);
    g.fillStyle = '#b5793a'; g.fillRect(0, GROUND, W, 6);
    g.fillStyle = '#c98d4b';
    for (let i = 0; i < 12; i++) {
      const x = (((i * 137 - s.dist) % (W + 100)) + W + 100) % (W + 100) - 50;
      g.fillRect(x, GROUND + 20 + (i % 3) * 25, 30, 6);
    }

    // cactus
    for (const o of s.obs) {
      if (o.x < -80 || o.x > W + 80) continue;
      const top = GROUND - o.h;
      Draw.rrect(g, o.x - o.w / 2 - 18, top + o.h * 0.3, 18, 26, 8); Draw.fillStroke(g, '#2a9d8f');
      Draw.rrect(g, o.x + o.w / 2, top + o.h * 0.2, 18, 22, 8); Draw.fillStroke(g, '#2a9d8f');
      Draw.rrect(g, o.x - o.w / 2, top, o.w, o.h + 4, [o.w / 2, o.w / 2, 0, 0]); Draw.fillStroke(g, '#2a9d8f');
      g.strokeStyle = '#21867a'; g.lineWidth = 3;
      g.beginPath(); g.moveTo(o.x - o.w / 5, top + 12); g.lineTo(o.x - o.w / 5, GROUND - 4);
      g.moveTo(o.x + o.w / 5, top + 12); g.lineTo(o.x + o.w / 5, GROUND - 4); g.stroke();
    }

    Draw.hero(g, this.PX, s.py, { rot: s.rot, run: s.ground && !s.lost ? s.dist * 0.06 : 1 });
  },
});
