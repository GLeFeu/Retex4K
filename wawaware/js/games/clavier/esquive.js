// CLAVIER (flèches / Q-D) : déplacer le perso pour éviter les enclumes
Engine.register({
  id: 'esquive',
  name: 'Pluie d\'enclumes',
  icon: '🧱',
  instruction: 'ESQUIVE !',
  input: 'clavier',
  hint: '← →  OU  Q / D',
  duration: 5,
  survival: true,

  start(c) {
    return {
      t: 0, px: W / 2, face: 1, run: 0, rot: 0, hy: 0, hvy: 0,
      items: [], spawnT: 0.25,
      rate: Math.max(0.2, 0.48 - 0.04 * c.diff),
      fall: 160 + 30 * c.diff,
    };
  },

  update(s, dt, c) {
    s.t += dt;
    const inp = c.input;
    if (!s.lost) {
      let dir = 0;
      if (!c.over) {
        if (inp.isDown('ArrowLeft', 'KeyA')) dir -= 1;
        if (inp.isDown('ArrowRight', 'KeyD')) dir += 1;
      }
      if (dir) { s.face = dir; s.run += dt * 18; }
      s.px = clamp(s.px + dir * 540 * dt, 40, W - 40);
    } else {
      s.hvy += 1800 * dt;
      s.hy += s.hvy * dt;
      s.rot += dt * 12;
    }

    s.spawnT -= dt;
    if (s.spawnT <= 0 && s.t < c.duration - 0.6) {
      const aim = c.rng() < 0.55; // une bonne partie vise le joueur
      const x = aim ? clamp(s.px + (c.rng() - 0.5) * 140, 40, W - 40) : 50 + c.rng() * (W - 100);
      s.items.push({ x, y: -40, vy: s.fall, kind: c.rng() < 0.6 ? 'enclume' : 'pot', landed: false, life: 0.5 });
      s.spawnT = s.rate * (0.7 + c.rng() * 0.6);
    }

    for (const it of s.items) {
      if (it.landed) { it.life -= dt; continue; }
      it.vy += 1100 * dt;
      it.y += it.vy * dt;
      if (!s.lost && !c.over && Math.abs(it.x - s.px) < 44 && it.y + 22 > GROUND - 82 && it.y - 22 < GROUND) {
        s.lost = true;
        s.hvy = -600;
        c.sfx.hit();
      }
      if (it.y + 22 >= GROUND) { it.y = GROUND - 22; it.landed = true; c.sfx.thump(); }
    }
    s.items = s.items.filter(it => it.life > 0);
  },

  draw(s, g) {
    // mur de briques
    g.fillStyle = '#c8553d';
    g.fillRect(0, 0, W, GROUND);
    g.strokeStyle = '#9c3d2a';
    g.lineWidth = 3;
    g.beginPath();
    for (let y = 0, row = 0; y < GROUND; y += 40, row++) {
      g.moveTo(0, y); g.lineTo(W, y);
      for (let x = (row % 2) * 40; x < W; x += 80) { g.moveTo(x, y); g.lineTo(x, y + 40); }
    }
    g.stroke();
    // trottoir
    g.fillStyle = '#adb5bd'; g.fillRect(0, GROUND, W, H - GROUND);
    g.fillStyle = '#6c757d'; g.fillRect(0, GROUND, W, 8);

    // ombres
    for (const it of s.items) {
      if (it.landed) continue;
      const k = clamp((it.y + 40) / GROUND, 0.1, 1);
      Draw.ellipse(g, it.x, GROUND + 6, 40 * k, 8 * k);
      g.fillStyle = `rgba(0,0,0,${0.15 + 0.3 * k})`;
      g.fill();
    }

    for (const it of s.items) {
      g.save();
      g.globalAlpha = it.landed ? clamp(it.life / 0.5, 0, 1) : 1;
      g.translate(it.x, it.y);
      if (it.kind === 'enclume') {
        Draw.rrect(g, -36, -22, 72, 16, 4); Draw.fillStroke(g, '#495057');
        Draw.rrect(g, -14, -6, 28, 16, 2); Draw.fillStroke(g, '#495057');
        Draw.rrect(g, -28, 8, 56, 14, 4); Draw.fillStroke(g, '#495057');
        g.fillStyle = 'rgba(255,255,255,0.3)'; g.fillRect(-30, -19, 40, 4);
      } else {
        g.fillStyle = '#2b9348';
        Draw.ellipse(g, -8, -26, 10, 16, -0.4); Draw.fillStroke(g, '#2b9348', '#1a1a1a', 3);
        Draw.ellipse(g, 8, -26, 10, 16, 0.4); Draw.fillStroke(g, '#2b9348', '#1a1a1a', 3);
        g.beginPath(); g.moveTo(-26, -14); g.lineTo(26, -14); g.lineTo(18, 22); g.lineTo(-18, 22); g.closePath();
        Draw.fillStroke(g, '#e76f51');
        Draw.rrect(g, -30, -18, 60, 12, 4); Draw.fillStroke(g, '#f4a261');
      }
      g.restore();
    }

    Draw.hero(g, s.px, GROUND + s.hy, { face: s.face, rot: s.rot, run: s.run });
  },
});
