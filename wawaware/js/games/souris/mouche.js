// SOURIS (clic) : écraser la mouche avec la tapette
// Premier mini-jeu dans la nouvelle direction artistique : toujours le ton WarioWare, mais plus
// détaillé (dégradés, ombres douces, contours fins teintés, décor avec de la profondeur).
Engine.register({
  id: 'mouche',
  name: 'Écrase la mouche',
  icon: '🪰',
  instruction: 'ÉCRASE !',
  input: 'souris',
  hint: 'CLIQUE SUR LA MOUCHE',
  duration: 5,
  cursor: 'none',
  TABLE: 400, // haut de la table

  start(c) {
    const d = Math.min(c.diff, 8);
    return {
      t: 0, swat: 0, splat: null, splatT: 0, whoosh: [],
      x: 220 + c.rng() * 520, y: 120 + c.rng() * 220,
      vx: 0, vy: 0, dirT: 0,
      sp: 230 + 40 * d,          // vitesse de vol
      flee: 250 + 110 * d,       // réflexe de fuite face à la tapette
    };
  },

  update(s, dt, c) {
    const inp = c.input;
    s.t += dt;
    s.swat = Math.max(0, s.swat - dt);
    for (const w of s.whoosh) w.t += dt;
    s.whoosh = s.whoosh.filter(w => w.t < 0.25);
    if (s.won) { s.splatT += dt; return; }

    s.dirT -= dt;
    if (s.dirT <= 0) {
      const a = c.rng() * Math.PI * 2;
      s.vx = Math.cos(a) * s.sp;
      s.vy = Math.sin(a) * s.sp;
      s.dirT = 0.15 + c.rng() * 0.4;
    }
    const dx = s.x - inp.x, dy = s.y - inp.y, d = Math.hypot(dx, dy) || 1;
    if (d < 150) { s.vx += (dx / d) * s.flee * 4 * dt; s.vy += (dy / d) * s.flee * 4 * dt; }
    const v = Math.hypot(s.vx, s.vy), max = s.sp * 1.5;
    if (v > max) { s.vx *= max / v; s.vy *= max / v; }
    s.x += s.vx * dt;
    s.y += s.vy * dt;
    if (s.x < 50) { s.x = 50; s.vx = Math.abs(s.vx); }
    if (s.x > W - 50) { s.x = W - 50; s.vx = -Math.abs(s.vx); }
    if (s.y < 50) { s.y = 50; s.vy = Math.abs(s.vy); }
    if (s.y > H - 140) { s.y = H - 140; s.vy = -Math.abs(s.vy); }

    if (inp.clicked && !c.over) {
      s.swat = 0.15;
      if (Math.hypot(inp.x - s.x, inp.y - s.y) < 55) {
        s.won = true;
        c.sfx.splat();
        // forme de la tache : un contour irrégulier + quelques gouttes
        s.splat = {
          edge: Array.from({ length: 14 }, () => 0.7 + c.rng() * 0.6),
          drops: Array.from({ length: 7 }, () => ({ a: c.rng() * Math.PI * 2, d: 38 + c.rng() * 26, r: 3 + c.rng() * 6 })),
          rot: c.rng() * Math.PI * 2,
        };
      } else {
        c.sfx.swat();
        s.whoosh.push({ x: inp.x, y: inp.y, t: 0 });
      }
    }
  },

  // ---------- décor (dessiné une fois, puis réutilisé) ----------
  background() {
    if (this._bg) return this._bg;
    const cv = document.createElement('canvas');
    cv.width = W; cv.height = H;
    const g = cv.getContext('2d');
    const T = this.TABLE;

    // mur crème + petit papier peint à fleurs
    g.fillStyle = Draw.vgrad(g, 0, T, ['#fcecc9', '#f1d29d']);
    g.fillRect(0, 0, W, T);
    g.fillStyle = 'rgba(190,120,60,0.13)';
    for (let y = 22, row = 0; y < T; y += 46, row++) {
      for (let x = row % 2 ? 23 : 0; x < W + 20; x += 46) {
        for (let k = 0; k < 4; k++) { const a = k * Math.PI / 2; Draw.circle(g, x + Math.cos(a) * 4, y + Math.sin(a) * 4, 3); g.fill(); }
      }
    }

    // fenêtre avec rideaux
    const wx = 650, wy = 46, ww = 220, wh = 200;
    g.fillStyle = Draw.vgrad(g, wy, wy + wh, ['#8fcff2', '#d9f1ff']);
    g.fillRect(wx, wy, ww, wh);
    g.fillStyle = '#9ccf7a';
    g.beginPath(); g.moveTo(wx, wy + wh); g.quadraticCurveTo(wx + 70, wy + 120, wx + 130, wy + 160); g.quadraticCurveTo(wx + 180, wy + 130, wx + ww, wy + 150); g.lineTo(wx + ww, wy + wh); g.fill();
    g.fillStyle = 'rgba(255,255,255,0.9)';
    for (const [cx, cy, k] of [[wx + 60, wy + 50, 1], [wx + 160, wy + 80, 0.7]]) {
      Draw.circle(g, cx, cy, 16 * k); g.fill(); Draw.circle(g, cx + 18 * k, cy + 4, 12 * k); g.fill(); Draw.circle(g, cx - 16 * k, cy + 5, 10 * k); g.fill();
    }
    g.lineWidth = 12; g.strokeStyle = '#c08552';
    g.strokeRect(wx, wy, ww, wh);
    g.lineWidth = 7;
    g.beginPath(); g.moveTo(wx + ww / 2, wy); g.lineTo(wx + ww / 2, wy + wh); g.moveTo(wx, wy + wh / 2); g.lineTo(wx + ww, wy + wh / 2); g.stroke();
    g.lineWidth = 2; g.strokeStyle = '#7a4a26'; g.strokeRect(wx - 6, wy - 6, ww + 12, wh + 12);
    Draw.rrect(g, wx - 18, wy + wh + 4, ww + 36, 14, 4); Draw.fillLine(g, Draw.vgrad(g, wy + wh, wy + wh + 18, ['#d39a64', '#a8703f']), '#7a4a26', 2);
    for (const side of [-1, 1]) { // rideaux
      const cx = side < 0 ? wx - 8 : wx + ww + 8;
      g.beginPath();
      g.moveTo(cx - side * 4, wy - 20);
      g.quadraticCurveTo(cx + side * 40, wy + 80, cx + side * 10, wy + 130);
      g.quadraticCurveTo(cx + side * 30, wy + 190, cx + side * 14, wy + wh + 20);
      g.lineTo(cx + side * 46, wy + wh + 20);
      g.quadraticCurveTo(cx + side * 60, wy + 120, cx + side * 48, wy - 20);
      g.closePath();
      const cg = g.createLinearGradient(cx, 0, cx + side * 50, 0);
      cg.addColorStop(0, '#e86a74'); cg.addColorStop(0.5, '#f48c94'); cg.addColorStop(1, '#c94c58');
      Draw.fillLine(g, cg, '#9e2f3c', 2);
    }
    g.fillStyle = '#8a5a35'; g.fillRect(wx - 70, wy - 26, ww + 140, 8);

    // rayon de lumière qui tombe sur la table
    const beam = g.createLinearGradient(0, wy + wh, 0, T + 40);
    beam.addColorStop(0, 'rgba(255,250,225,0.45)'); beam.addColorStop(1, 'rgba(255,250,225,0)');
    g.fillStyle = beam;
    g.beginPath(); g.moveTo(wx + 10, wy + wh); g.lineTo(wx + ww - 10, wy + wh); g.lineTo(wx + 120, T + 40); g.lineTo(wx - 170, T + 40); g.closePath(); g.fill();

    // étagère avec bocaux et petite plante
    g.fillStyle = 'rgba(80,40,10,0.15)'; g.fillRect(64, 158, 280, 10);
    Draw.rrect(g, 56, 146, 290, 14, 3); Draw.fillLine(g, Draw.vgrad(g, 146, 160, ['#c58b55', '#94602f']), '#6e4220', 2);
    for (const bx of [86, 316]) { g.beginPath(); g.moveTo(bx, 160); g.lineTo(bx, 186); g.lineTo(bx + 14, 160); g.closePath(); Draw.fillLine(g, '#8a5a35', '#5e3a1c', 1.5); }
    const jars = [[96, 58, '#d1495b', 'CONFITURE'], [168, 66, '#edae49', 'MIEL'], [240, 54, '#c9a27e', 'BISCUITS']];
    for (const [x, h, col] of jars) {
      const y = 146 - h;
      Draw.rrect(g, x, y + 10, 52, h - 10, 8); Draw.fillLine(g, 'rgba(220,240,255,0.55)', 'rgba(90,110,130,0.7)', 2);
      Draw.rrect(g, x + 4, y + 22, 44, h - 26, 6); g.fillStyle = col; g.fill();
      Draw.rrect(g, x + 2, y, 48, 12, 4); Draw.fillLine(g, Draw.vgrad(g, y, y + 12, ['#f0f0f0', '#a8a8a8']), '#6c6c6c', 1.5);
      Draw.rrect(g, x + 9, y + h / 2, 34, 14, 3); Draw.fillLine(g, '#fff8e8', '#b89870', 1);
      g.fillStyle = 'rgba(255,255,255,0.45)'; g.fillRect(x + 6, y + 16, 5, h - 30);
    }
    Draw.rrect(g, 300, 116, 34, 30, 5); Draw.fillLine(g, Draw.vgrad(g, 116, 146, ['#d4744a', '#a9532f']), '#7a3a1f', 2);
    g.fillStyle = '#4f8a3a'; g.strokeStyle = '#2f5a22'; g.lineWidth = 1.5;
    for (const [a, l] of [[-0.9, 30], [-0.3, 38], [0.4, 34], [1.0, 26]]) {
      g.save(); g.translate(317, 116); g.rotate(a); Draw.ellipse(g, 0, -l / 2, 7, l / 2); g.fill(); g.stroke(); g.restore();
    }

    // table en bois (dessus + chant)
    g.fillStyle = Draw.vgrad(g, T, T + 46, ['#d29a5f', '#b97b42']);
    g.fillRect(0, T, W, 46);
    g.strokeStyle = 'rgba(110,60,25,0.25)'; g.lineWidth = 1.5;
    for (let i = 0; i < 7; i++) { g.beginPath(); const y = T + 6 + i * 6; g.moveTo(0, y); for (let x = 0; x <= W; x += 40) g.lineTo(x, y + Math.sin(x / 90 + i) * 2); g.stroke(); }
    g.fillStyle = 'rgba(255,255,255,0.25)'; g.fillRect(0, T, W, 3);
    g.fillStyle = Draw.vgrad(g, T + 46, H, ['#8d5326', '#5f3415']);
    g.fillRect(0, T + 46, W, H - T - 46);
    g.fillStyle = 'rgba(0,0,0,0.18)'; g.fillRect(0, T + 46, W, 6);

    // assiette avec une part de gâteau (c'est ce qui attire la mouche)
    const px = 220, py = T + 18;
    Draw.softShadow(g, px + 6, py + 12, 110, 18, 0.3);
    Draw.ellipse(g, px, py, 105, 20); Draw.fillLine(g, Draw.vgrad(g, py - 20, py + 20, ['#ffffff', '#d9dde3']), '#9aa3ad', 2);
    Draw.ellipse(g, px, py - 2, 76, 13); g.strokeStyle = 'rgba(150,160,175,0.6)'; g.lineWidth = 1.5; g.stroke();
    // part de gâteau vue de côté
    const cx = px - 50, cy = py - 4;
    g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx + 110, cy); g.lineTo(cx + 110, cy - 62); g.lineTo(cx + 18, cy - 50); g.closePath();
    Draw.fillLine(g, Draw.vgrad(g, cy - 62, cy, ['#f7dca8', '#e9bd77']), '#b3803e', 2);
    g.fillStyle = '#fff6ea'; g.fillRect(cx + 10, cy - 34, 100, 8);
    g.fillStyle = '#e04f6a'; g.fillRect(cx + 10, cy - 20, 100, 5);
    g.beginPath(); g.moveTo(cx + 14, cy - 52); g.lineTo(cx + 112, cy - 66);
    for (let x = 112; x >= 14; x -= 14) g.quadraticCurveTo(cx + x - 7, cy - 52 + ((x / 14) % 2 ? 10 : 4) - (x / 112) * 12, cx + x - 14, cy - 50 - ((x - 14) / 112) * 12);
    g.closePath(); Draw.fillLine(g, Draw.vgrad(g, cy - 70, cy - 40, ['#ffb3c6', '#ff7a9c']), '#d24f73', 2);
    Draw.circle(g, cx + 70, cy - 70, 10); Draw.fillLine(g, Draw.rgrad(g, cx + 70, cy - 70, 1, 11, '#ff6b6b', '#c1121f', -3, -3), '#8a0f1a', 1.5);
    g.fillStyle = '#4f8a3a'; g.beginPath(); g.ellipse(cx + 70, cy - 80, 7, 3, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#d9a35c';
    for (const [dx, dy] of [[-30, 6], [-22, 9], [130, 7], [140, 4]]) { Draw.circle(g, cx + dx + 50, py + dy - 4, 2.5); g.fill(); }

    // tasse de thé à droite
    const mx = 790, my = T + 14;
    Draw.softShadow(g, mx + 4, my + 6, 46, 9, 0.3);
    Draw.ellipse(g, mx, my, 44, 9); Draw.fillLine(g, '#f4f6f8', '#9aa3ad', 1.5);
    g.beginPath(); g.moveTo(mx - 30, my - 52); g.lineTo(mx + 30, my - 52); g.quadraticCurveTo(mx + 28, my - 2, mx, my - 2); g.quadraticCurveTo(mx - 28, my - 2, mx - 30, my - 52); g.closePath();
    Draw.fillLine(g, Draw.vgrad(g, my - 52, my, ['#6ec1e4', '#3d8eb9']), '#24658a', 2);
    g.beginPath(); g.arc(mx + 32, my - 30, 12, -Math.PI / 2, Math.PI / 2); g.lineWidth = 6; g.strokeStyle = '#3d8eb9'; g.stroke();
    Draw.ellipse(g, mx, my - 52, 30, 6); Draw.fillLine(g, '#9b5d2e', '#24658a', 1.5);
    this._bg = cv;
    return cv;
  },

  // ---------- la mouche (vue de dessus, tournée dans le sens du vol) ----------
  drawFly(g, s) {
    const t = s.t;
    g.save();
    g.translate(s.x, s.y);
    g.rotate(Math.atan2(s.vy, s.vx));
    g.scale(1.6, 1.6);
    // pattes (3 paires, qui gigotent)
    g.strokeStyle = '#141414'; g.lineWidth = 1.4; g.lineCap = 'round';
    for (const side of [-1, 1]) {
      [[-4, 0.9], [1, 1.3], [5, 1.8]].forEach(([lx, a], i) => {
        const wig = Math.sin(t * 30 + i * 2 + side) * 0.15;
        const ang = side * (a + wig);
        const kx = lx + Math.cos(ang) * 9, ky = Math.sin(ang) * 9 * 1.1;
        g.beginPath(); g.moveTo(lx, side * 4); g.lineTo(kx, ky); g.lineTo(kx + (i - 1) * 5, ky + side * 6); g.stroke();
      });
    }
    // abdomen
    Draw.ellipse(g, -13, 0, 15, 10);
    Draw.fillLine(g, Draw.rgrad(g, -13, 0, 2, 16, '#55664f', '#0f1510', -4, -4), '#060806', 1.5);
    g.strokeStyle = 'rgba(0,0,0,0.45)'; g.lineWidth = 1.5;
    for (const x of [-20, -14, -8]) { g.beginPath(); g.ellipse(x, 0, 2.5, 9, 0, -Math.PI / 2, Math.PI / 2); g.stroke(); }
    Draw.ellipse(g, -15, -4, 7, 2.5, -0.1); g.fillStyle = 'rgba(150,220,200,0.35)'; g.fill();
    // ailes translucides (deux positions = effet de battement rapide)
    const flap = Math.sin(t * 70);
    for (const side of [-1, 1]) {
      for (const [k, alpha] of [[flap, 0.55], [-flap * 0.4, 0.25]]) {
        g.save();
        g.globalAlpha = alpha;
        g.rotate(side * (2.6 - 0.35 * k));
        Draw.ellipse(g, 15, 0, 17, 6.5);
        const wg = g.createLinearGradient(0, -6, 30, 6);
        wg.addColorStop(0, 'rgba(200,225,255,0.7)'); wg.addColorStop(0.5, 'rgba(240,210,255,0.55)'); wg.addColorStop(1, 'rgba(190,240,255,0.6)');
        Draw.fillLine(g, wg, 'rgba(70,80,100,0.8)', 1);
        g.strokeStyle = 'rgba(60,70,90,0.6)'; g.lineWidth = 0.8;
        g.beginPath(); g.moveTo(2, 0); g.lineTo(30, 0); g.moveTo(6, 0); g.lineTo(24, -4); g.moveTo(6, 0); g.lineTo(24, 4); g.stroke();
        g.restore();
      }
    }
    // thorax rayé
    Draw.ellipse(g, 2, 0, 9, 8.5);
    Draw.fillLine(g, Draw.rgrad(g, 2, 0, 1, 10, '#4a4f4a', '#121412', -3, -3), '#060806', 1.5);
    g.strokeStyle = 'rgba(190,190,180,0.45)'; g.lineWidth = 1.2;
    for (const y of [-3, 0, 3]) { g.beginPath(); g.moveTo(-4, y); g.lineTo(8, y * 0.8); g.stroke(); }
    // tête et gros yeux à facettes
    Draw.ellipse(g, 12, 0, 6, 7); Draw.fillLine(g, '#1b1d1b', '#060806', 1.2);
    for (const side of [-1, 1]) {
      Draw.ellipse(g, 13, side * 4.5, 5.2, 4.6);
      Draw.fillLine(g, Draw.rgrad(g, 13, side * 4.5, 0.5, 6, '#ff5a5f', '#7d0a14', -1.5, -side * 1.5), '#4a050c', 1);
      g.fillStyle = 'rgba(60,0,8,0.35)';
      for (let i = 0; i < 6; i++) { Draw.circle(g, 11 + (i % 3) * 2.2, side * 4.5 + (i < 3 ? -1.2 : 1.2), 0.6); g.fill(); }
      Draw.ellipse(g, 12, side * 4.5 - 1.6, 1.8, 1); g.fillStyle = 'rgba(255,255,255,0.85)'; g.fill();
    }
    g.restore();
  },

  // ---------- la tapette (curseur) ----------
  drawSwatter(g, x, y, swat) {
    const press = swat > 0;
    g.save();
    g.translate(x, y);
    g.rotate(press ? -0.28 : 0.1);
    const k = press ? 0.9 : 1;
    g.scale(k, k);
    // ombre portée
    g.save(); g.translate(12, 16); g.globalAlpha = 0.16;
    Draw.rrect(g, -52, -56, 104, 112, 22); g.fillStyle = '#000'; g.fill();
    g.lineWidth = 16; g.strokeStyle = '#000'; g.lineCap = 'round'; g.beginPath(); g.moveTo(26, 52); g.lineTo(96, 170); g.stroke();
    g.restore();
    // manche
    g.lineCap = 'round';
    g.lineWidth = 15; g.strokeStyle = '#2c3566'; g.beginPath(); g.moveTo(22, 50); g.lineTo(92, 168); g.stroke();
    g.lineWidth = 10; g.strokeStyle = '#5a68b8'; g.stroke();
    g.lineWidth = 3; g.strokeStyle = 'rgba(255,255,255,0.35)'; g.beginPath(); g.moveTo(24, 50); g.lineTo(90, 162); g.stroke();
    g.lineWidth = 12; g.strokeStyle = '#1f2547';
    for (let i = 0; i < 4; i++) { const k2 = 0.62 + i * 0.09; g.beginPath(); g.moveTo(22 + 70 * k2 - 1, 50 + 118 * k2); g.lineTo(22 + 70 * k2 + 1, 50 + 118 * k2 + 2); g.stroke(); }
    // tête de la tapette : plastique avec trous
    Draw.rrect(g, -52, -56, 104, 112, 22);
    Draw.fillLine(g, Draw.vgrad(g, -56, 56, ['#ff8796', '#e8455a', '#cf3149']), '#9b1f33', 3);
    g.save();
    Draw.rrect(g, -46, -50, 92, 100, 18); g.clip();
    for (let yy = -44; yy <= 44; yy += 12) {
      for (let xx = (Math.abs(yy / 12) % 2 ? -40 : -46); xx <= 46; xx += 12) {
        Draw.circle(g, xx, yy, 3.4); g.fillStyle = 'rgba(95,10,28,0.55)'; g.fill();
        Draw.circle(g, xx - 0.8, yy - 0.8, 1.2); g.fillStyle = 'rgba(255,255,255,0.25)'; g.fill();
      }
    }
    g.restore();
    Draw.rrect(g, -44, -50, 40, 22, 11); g.fillStyle = 'rgba(255,255,255,0.22)'; g.fill();
    g.restore();
    // traits de vitesse quand on frappe
    if (press) {
      g.save();
      g.strokeStyle = 'rgba(255,255,255,0.8)'; g.lineWidth = 3; g.lineCap = 'round';
      for (let i = 0; i < 3; i++) { g.beginPath(); g.arc(x - 10, y - 10, 70 + i * 10, -2.6 + i * 0.12, -1.7 + i * 0.12); g.stroke(); }
      g.restore();
    }
  },

  // ---------- tache quand la mouche est écrasée ----------
  drawSplat(g, s) {
    const sp = s.splat, pop = Math.min(1, s.splatT / 0.12);
    g.save();
    g.translate(s.x, s.y);
    g.rotate(sp.rot);
    g.scale(pop, pop);
    g.beginPath();
    sp.edge.forEach((k, i) => {
      const a = (i / sp.edge.length) * Math.PI * 2, r = 34 * k;
      const a2 = ((i + 0.5) / sp.edge.length) * Math.PI * 2;
      if (i === 0) g.moveTo(Math.cos(a) * r, Math.sin(a) * r);
      g.quadraticCurveTo(Math.cos(a2) * 40, Math.sin(a2) * 40, Math.cos(a + Math.PI * 2 / sp.edge.length) * 34 * sp.edge[(i + 1) % sp.edge.length], Math.sin(a + Math.PI * 2 / sp.edge.length) * 34 * sp.edge[(i + 1) % sp.edge.length]);
    });
    g.closePath();
    Draw.fillLine(g, Draw.rgrad(g, 0, 0, 2, 44, '#d8ec7a', '#86a51f', -8, -8), '#5d7a12', 2);
    for (const d of sp.drops) { Draw.circle(g, Math.cos(d.a) * d.d, Math.sin(d.a) * d.d, d.r); Draw.fillLine(g, '#a9c63a', '#5d7a12', 1.2); }
    // restes de la mouche
    Draw.ellipse(g, 0, 0, 14, 6); g.fillStyle = '#141814'; g.fill();
    g.save(); g.rotate(0.6); Draw.ellipse(g, 16, -2, 12, 4); Draw.fillLine(g, 'rgba(200,225,255,0.6)', 'rgba(70,80,100,0.7)', 1); g.restore();
    g.strokeStyle = '#141414'; g.lineWidth = 1.4;
    for (const a of [0.4, 1.4, 2.6, 3.8, 5.1]) { g.beginPath(); g.moveTo(Math.cos(a) * 6, Math.sin(a) * 4); g.lineTo(Math.cos(a) * 18, Math.sin(a) * 14); g.stroke(); }
    Draw.ellipse(g, -10, -10, 10, 5, -0.5); g.fillStyle = 'rgba(255,255,255,0.35)'; g.fill();
    g.restore();
    // "SPLAT !" façon BD, plus fin qu'avant
    const k = 1 + Math.max(0, 0.25 - s.splatT) * 2;
    g.save();
    g.translate(s.x, s.y - 74);
    g.rotate(-0.08);
    g.scale(k, k);
    Draw.text(g, 'SPLAT !', 0, 0, 42, '#d8ec7a', '#3d5a0a');
    g.restore();
  },

  draw(s, g, c) {
    g.drawImage(this.background(), 0, 0);
    // poussières qui flottent dans le rayon de lumière
    g.fillStyle = 'rgba(255,255,240,0.6)';
    for (let i = 0; i < 14; i++) {
      const px = 520 + ((i * 53 + Math.sin(s.t * 0.7 + i) * 30) % 240);
      const py = 260 + ((i * 37 + s.t * 12) % 150);
      Draw.circle(g, px, py, 1 + (i % 3) * 0.6); g.fill();
    }

    if (s.splat) this.drawSplat(g, s);
    else {
      // ombre de la mouche sur le mur, un peu décalée : donne de la profondeur
      Draw.softShadow(g, s.x + 12, s.y + 22, 26, 11, 0.18);
      this.drawFly(g, s);
    }

    // coups ratés : petit souffle d'air
    for (const w of s.whoosh) {
      g.save();
      g.globalAlpha = 1 - w.t / 0.25;
      g.strokeStyle = '#fff'; g.lineWidth = 2.5; g.lineCap = 'round';
      for (let i = 0; i < 3; i++) { g.beginPath(); g.arc(w.x, w.y, 30 + w.t * 160 + i * 8, -0.5 + i, 0.3 + i); g.stroke(); }
      g.restore();
    }

    Draw.vignette(g, 0.3);
    this.drawSwatter(g, c.input.x, c.input.y, s.swat);
  },
});
