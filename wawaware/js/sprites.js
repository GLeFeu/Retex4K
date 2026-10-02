// Dessins réutilisés par plusieurs mini-jeux (complète l'objet Draw du moteur)
Object.assign(Draw, {
  // ----- outils de la nouvelle direction artistique (plus détaillée) -----
  // dégradé linéaire vertical rapide
  vgrad(g, y0, y1, stops) {
    const gr = g.createLinearGradient(0, y0, 0, y1);
    stops.forEach((c, i) => gr.addColorStop(i / (stops.length - 1), c));
    return gr;
  },

  // dégradé radial (reflets, volumes)
  rgrad(g, x, y, r0, r1, inner, outer, ox = 0, oy = 0) {
    const gr = g.createRadialGradient(x + ox, y + oy, r0, x, y, r1);
    gr.addColorStop(0, inner); gr.addColorStop(1, outer);
    return gr;
  },

  // ombre douce posée au sol
  softShadow(g, x, y, rx, ry, alpha = 0.25) {
    const gr = g.createRadialGradient(x, y, 0, x, y, rx);
    gr.addColorStop(0, `rgba(30,20,10,${alpha})`); gr.addColorStop(1, 'rgba(30,20,10,0)');
    g.save(); g.translate(x, y); g.scale(1, ry / rx); g.translate(-x, -y);
    g.fillStyle = gr; g.beginPath(); g.arc(x, y, rx, 0, Math.PI * 2); g.fill();
    g.restore();
  },

  // assombrit doucement les bords de l'écran
  vignette(g, strength = 0.35) {
    const gr = g.createRadialGradient(W / 2, H / 2, H * 0.35, W / 2, H / 2, W * 0.7);
    gr.addColorStop(0, 'rgba(20,10,0,0)'); gr.addColorStop(1, `rgba(20,10,0,${strength})`);
    g.fillStyle = gr; g.fillRect(0, 0, W, H);
  },

  // remplissage + contour fin et teinté (au lieu du gros trait noir)
  fillLine(g, fill, line, lw = 2.5) {
    g.fillStyle = fill; g.fill();
    if (line) { g.lineWidth = lw; g.strokeStyle = line; g.lineJoin = 'round'; g.stroke(); }
  },

  sky(g, top, bottom, h = H) {
    const gr = g.createLinearGradient(0, 0, 0, h);
    gr.addColorStop(0, top); gr.addColorStop(1, bottom);
    g.fillStyle = gr;
    g.fillRect(0, 0, W, h);
  },

  ground(g, y, col, line) {
    g.fillStyle = col; g.fillRect(0, y, W, H - y);
    if (line) { g.fillStyle = line; g.fillRect(0, y, W, 8); }
  },

  cloud(g, x, y, k = 1) {
    g.fillStyle = '#fff';
    Draw.circle(g, x, y, 30 * k); g.fill();
    Draw.circle(g, x + 34 * k, y + 6 * k, 24 * k); g.fill();
    Draw.circle(g, x - 32 * k, y + 8 * k, 20 * k); g.fill();
  },

  burst(g, x, y, r, cols = ['#ff7b00', '#ffd400']) {
    g.beginPath();
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2, rr = i % 2 ? r * 0.55 : r;
      g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
    }
    g.closePath();
    Draw.fillStroke(g, cols[0]);
    Draw.circle(g, x, y, r * 0.4); g.fillStyle = cols[1]; g.fill();
  },

  btn(g, x, y, w, h, label, col = '#fff', size = 32, txt = '#1a1a1a') {
    Draw.rrect(g, x - w / 2, y - h / 2, w, h, Math.min(18, h / 2)); Draw.fillStroke(g, col);
    Draw.text(g, label, x, y + 2, size, txt, null);
  },

  bubble(g, x, y, w, h, tailX, tailY) {
    Draw.rrect(g, x - w / 2, y - h / 2, w, h, 22); Draw.fillStroke(g, '#fff');
    g.beginPath(); g.moveTo(x - 14, y + h / 2 - 3); g.lineTo(tailX, tailY); g.lineTo(x + 14, y + h / 2 - 3);
    g.fillStyle = '#fff'; g.fill();
    g.lineWidth = 4; g.strokeStyle = '#1a1a1a'; g.stroke();
  },

  // Chien vu de profil. (x, y) = sol. Poses : debout, court, assis, couche, saute, patte
  dog(g, x, y, { pose = 'debout', face = 1, t = 0, scale = 1, col = '#d4a373' } = {}) {
    const C = col, D = '#8d5b3c', L = '#fefae0';
    const wag = Math.sin(t * 14) * 0.4;
    g.save();
    g.translate(x, y);
    g.scale(face * scale, scale);
    const leg = (lx, ly, len, a = 0) => {
      g.save(); g.translate(lx, ly); g.rotate(a);
      Draw.rrect(g, -8, 0, 16, len, 7); Draw.fillStroke(g, C, '#1a1a1a', 3);
      g.restore();
    };
    const tail = (tx, ty, a) => {
      g.save(); g.translate(tx, ty); g.rotate(a);
      Draw.rrect(g, -5, -40, 10, 42, 5); Draw.fillStroke(g, C, '#1a1a1a', 3);
      g.restore();
    };
    const head = (hx, hy, tilt = 0, mouth = false) => {
      g.save(); g.translate(hx, hy); g.rotate(tilt);
      Draw.ellipse(g, -12, -10, 12, 24, 0.4); Draw.fillStroke(g, D, '#1a1a1a', 3);
      Draw.circle(g, 0, 0, 30); Draw.fillStroke(g, C);
      Draw.ellipse(g, 28, 10, 22, 15); Draw.fillStroke(g, L, '#1a1a1a', 3);
      Draw.ellipse(g, 47, 3, 8, 6); g.fillStyle = '#1a1a1a'; g.fill();
      Draw.circle(g, 10, -8, 5); g.fill();
      Draw.circle(g, 11.5, -9.5, 1.8); g.fillStyle = '#fff'; g.fill();
      if (mouth) { Draw.ellipse(g, 32, 27, 7, 10); Draw.fillStroke(g, '#ff8fa3', '#1a1a1a', 2); }
      Draw.ellipse(g, -16, 6, 11, 24, 0.15); Draw.fillStroke(g, D, '#1a1a1a', 3);
      g.restore();
    };
    switch (pose) {
      case 'assis':
      case 'patte':
        tail(-42, -18, 1.4 + wag * 0.4);
        Draw.ellipse(g, -15, -30, 38, 30); Draw.fillStroke(g, C);
        Draw.ellipse(g, 8, -68, 30, 48, 0.25); Draw.fillStroke(g, C);
        Draw.ellipse(g, 14, -60, 14, 26, 0.25); g.fillStyle = L; g.fill();
        leg(20, -60, 60);
        if (pose === 'patte') leg(38, -70, 52, -1.6 + Math.sin(t * 10) * 0.15); else leg(36, -60, 60);
        head(32, -122, 0, pose === 'patte');
        break;
      case 'couche':
        tail(-70, -18, 1.5 + wag * 0.3);
        Draw.ellipse(g, 0, -26, 72, 26); Draw.fillStroke(g, C);
        leg(40, -12, 62, -Math.PI / 2);
        leg(-45, -10, 40, -Math.PI / 2);
        head(78, -48);
        break;
      case 'saute':
        g.translate(0, -90);
        g.rotate(-0.25);
        tail(-58, -70, 0.9 + wag);
        leg(-42, -52, 46, 0.9); leg(-26, -52, 46, 0.9);
        leg(30, -52, 46, -0.9); leg(46, -52, 46, -0.9);
        Draw.ellipse(g, 0, -65, 62, 30); Draw.fillStroke(g, C);
        head(64, -98, -0.1, true);
        break;
      default: { // debout / court
        const run = pose === 'court' ? Math.sin(t * 22) * 0.6 : 0;
        tail(-58, -72, 0.6 + wag);
        leg(-42, -50, 50, run); leg(-26, -50, 50, -run);
        leg(30, -50, 50, -run); leg(46, -50, 50, run);
        Draw.ellipse(g, 0, -65, 62, 30); Draw.fillStroke(g, C);
        head(62, -100, 0, pose === 'court');
      }
    }
    g.restore();
  },

  // Chat assis (ou debout qui marche). (x, y) = sol.
  cat(g, x, y, { pose = 'assis', face = 1, t = 0, col = '#f4a261', scale = 1, eyes = 'ouverts' } = {}) {
    g.save();
    g.translate(x, y);
    g.scale(face * scale, scale);
    const sw = Math.sin(t * 4) * 12;
    g.lineCap = 'round';
    g.beginPath(); g.moveTo(-28, -12); g.quadraticCurveTo(-75, -20 + sw, -60, -75 + sw);
    g.lineWidth = 16; g.strokeStyle = '#1a1a1a'; g.stroke();
    g.lineWidth = 10; g.strokeStyle = col; g.stroke();
    let hx, hy;
    if (pose === 'debout') {
      const run = Math.sin(t * 20) * 0.5;
      for (const [lx, a] of [[-30, run], [-18, -run], [24, -run], [36, run]]) {
        g.save(); g.translate(lx, -30); g.rotate(a); Draw.rrect(g, -6, 0, 12, 32, 6); Draw.fillStroke(g, col, '#1a1a1a', 3); g.restore();
      }
      Draw.ellipse(g, 0, -40, 50, 24); Draw.fillStroke(g, col);
      hx = 50; hy = -66;
    } else {
      Draw.ellipse(g, 0, -42, 34, 44); Draw.fillStroke(g, col);
      Draw.ellipse(g, 6, -34, 16, 26); g.fillStyle = '#fff3e0'; g.fill();
      hx = 8; hy = -100;
    }
    for (const s of [-1, 1]) {
      g.beginPath(); g.moveTo(hx + s * 26, hy - 8); g.lineTo(hx + s * 22, hy - 42); g.lineTo(hx + s * 4, hy - 24); g.closePath();
      Draw.fillStroke(g, col, '#1a1a1a', 3);
    }
    Draw.circle(g, hx, hy, 28); Draw.fillStroke(g, col);
    g.fillStyle = '#1a1a1a';
    if (eyes === 'fermes') {
      g.lineWidth = 3; g.strokeStyle = '#1a1a1a';
      for (const s of [-1, 1]) { g.beginPath(); g.arc(hx + s * 11, hy - 4, 6, 0.2, Math.PI - 0.2); g.stroke(); }
    } else {
      for (const s of [-1, 1]) { Draw.ellipse(g, hx + s * 11, hy - 4, 4, 7); g.fill(); }
    }
    g.beginPath(); g.moveTo(hx - 5, hy + 6); g.lineTo(hx + 5, hy + 6); g.lineTo(hx, hy + 11); g.closePath();
    g.fillStyle = '#ff8fa3'; g.fill();
    g.strokeStyle = '#1a1a1a'; g.lineWidth = 2;
    for (const s of [-1, 1]) for (const k of [-4, 4]) {
      g.beginPath(); g.moveTo(hx + s * 12, hy + 10 + k * 0.5); g.lineTo(hx + s * 38, hy + 6 + k * 1.5); g.stroke();
    }
    g.restore();
  },
});
