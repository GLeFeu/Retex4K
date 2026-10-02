// SOURIS : « Écrase la mouche », STYLE 2 (essai de direction artistique, galerie uniquement).
// Même cuisine et même composition que le style 1, mais rendue de façon plus réaliste :
// pas de contours, textures générées (bois, crépi, tissu), lumière de la fenêtre (rayons, halo,
// ombres floues, occlusion), matières (verre, porcelaine, métal, vernis), grain de film.
(() => {
  const A = Engine.games.find(g => g.id === 'mouche'); // même gameplay que le style 1
  const T = 400; // haut de la table (comme le style 1)

  // ---------- bruit pour les textures (déterministe) ----------
  const rnd = mulberry32(20261002);
  const LAT = new Float32Array(256 * 256).map(() => rnd());
  const lat = (x, y) => LAT[((y & 255) << 8) | (x & 255)];
  const smooth = (t) => t * t * (3 - 2 * t);
  function noise(x, y) {
    const xi = Math.floor(x), yi = Math.floor(y), xf = smooth(x - xi), yf = smooth(y - yi);
    const a = lat(xi, yi), b = lat(xi + 1, yi), c = lat(xi, yi + 1), d = lat(xi + 1, yi + 1);
    return a + (b - a) * xf + (c - a) * yf + (a - b - c + d) * xf * yf;
  }
  const fbm = (x, y) => noise(x, y) * 0.5 + noise(x * 2, y * 2) * 0.25 + noise(x * 4, y * 4) * 0.15 + noise(x * 8, y * 8) * 0.1;

  // crée une texture pixel par pixel : fn(x, y) -> [r, g, b, a]
  function texture(w, h, fn) {
    const cv = document.createElement('canvas');
    cv.width = w; cv.height = h;
    const g = cv.getContext('2d');
    if (!g.createImageData) return cv; // environnement de test sans vrai canvas
    const img = g.createImageData(w, h), d = img.data;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const [r, gg, b, a = 255] = fn(x, y), i = (y * w + x) * 4;
      d[i] = r; d[i + 1] = gg; d[i + 2] = b; d[i + 3] = a;
    }
    g.putImageData(img, 0, 0);
    return cv;
  }

  // bois (veinage) : teinte de base + veines ondulées
  const woodTex = (w, h, base, dark, scaleY = 1) => texture(w, h, (x, y) => {
    const n = fbm(x / 140, y / 9 * scaleY);
    const vein = Math.sin((y * 0.55 * scaleY + n * 22) * 1.0) * 0.5 + 0.5;
    const k = 0.55 + 0.45 * Math.pow(vein, 2.5) * 0.6 + (fbm(x / 6, y / 2) - 0.5) * 0.18;
    return [0, 1, 2].map(i => base[i] * k + dark[i] * (1 - k));
  });

  function shadowed(g, color, blur, ox, oy, draw) {
    g.save(); g.shadowColor = color; g.shadowBlur = blur; g.shadowOffsetX = ox; g.shadowOffsetY = oy; draw(); g.restore();
  }

  Engine.register({
    ...A,
    id: 'mouche2',
    name: 'Écrase la mouche (style 2)',
    apercu: true, // essai de style : galerie uniquement, jamais tiré au sort en partie
    _bg: null,

    background() {
      if (this._bg) return this._bg;
      const cv = document.createElement('canvas');
      cv.width = W; cv.height = H;
      const g = cv.getContext('2d');
      const wx = 650, wy = 46, ww = 220, wh = 200;

      // --- mur : crépi crème + motif de papier peint très discret ---
      const wall = texture(W, T, (x, y) => {
        const n = fbm(x / 60, y / 60), fine = noise(x / 1.6, y / 1.6);
        const k = 0.9 + n * 0.1 + (fine - 0.5) * 0.05;
        return [238 * k, 224 * k, 196 * k];
      });
      g.drawImage(wall, 0, 0);
      g.save(); g.globalAlpha = 0.07; g.fillStyle = '#7a5530';
      for (let y = 30, row = 0; y < T; y += 54, row++) for (let x = row % 2 ? 27 : 0; x < W + 30; x += 54) {
        g.beginPath(); g.moveTo(x, y - 12); g.quadraticCurveTo(x + 10, y, x, y + 12); g.quadraticCurveTo(x - 10, y, x, y - 12); g.fill();
      }
      g.restore();
      // lumière de la fenêtre sur le mur (chaude) et pénombre à gauche
      const lightG = g.createRadialGradient(wx + ww / 2, wy + wh / 2, 40, wx + ww / 2, wy + wh / 2, 720);
      lightG.addColorStop(0, 'rgba(255,236,190,0.55)'); lightG.addColorStop(0.5, 'rgba(255,225,170,0.12)'); lightG.addColorStop(1, 'rgba(255,225,170,0)');
      g.fillStyle = lightG; g.fillRect(0, 0, W, T);
      g.fillStyle = (() => { const lg = g.createLinearGradient(0, 0, W, 0); lg.addColorStop(0, 'rgba(60,35,15,0.28)'); lg.addColorStop(0.55, 'rgba(60,35,15,0)'); return lg; })();
      g.fillRect(0, 0, W, T);
      g.fillStyle = Draw.vgrad(g, 0, 70, ['rgba(60,35,15,0.25)', 'rgba(60,35,15,0)']); g.fillRect(0, 0, W, 70); // plafond
      g.fillStyle = Draw.vgrad(g, T - 50, T, ['rgba(40,22,8,0)', 'rgba(40,22,8,0.35)']); g.fillRect(0, T - 50, W, 50); // contact mur / table

      // --- fenêtre : paysage flou, vitre, cadre en bois ---
      const out = document.createElement('canvas'); out.width = ww; out.height = wh;
      const o = out.getContext('2d');
      o.fillStyle = Draw.vgrad(o, 0, wh, ['#7fb6dc', '#bfe0f2', '#f6f1dc']); o.fillRect(0, 0, ww, wh);
      for (const [cx, cy, r, col] of [[40, 150, 90, '#7d9e62'], [170, 160, 110, '#6b8f55'], [110, 175, 120, '#8aab6c']]) { o.fillStyle = col; o.beginPath(); o.arc(cx, cy, r, 0, Math.PI * 2); o.fill(); }
      o.fillStyle = 'rgba(255,255,255,0.85)'; for (const [cx, cy] of [[60, 50], [150, 70]]) { o.beginPath(); o.ellipse(cx, cy, 34, 12, 0, 0, Math.PI * 2); o.fill(); }
      g.save(); g.filter = 'blur(3px)'; g.drawImage(out, wx, wy); g.restore();
      g.save(); g.beginPath(); g.rect(wx, wy, ww, wh); g.clip(); // reflets sur la vitre
      g.fillStyle = 'rgba(255,255,255,0.12)';
      for (const off of [20, 70, 150]) { g.beginPath(); g.moveTo(wx + off, wy); g.lineTo(wx + off + 30, wy); g.lineTo(wx + off - 60, wy + wh); g.lineTo(wx + off - 90, wy + wh); g.fill(); }
      g.restore();
      const frameWood = g.createPattern(woodTex(64, 64, [186, 136, 92], [120, 78, 44], 0.6), 'repeat');
      const bar = (x, y, w, h) => {
        shadowed(g, 'rgba(40,20,5,0.35)', 6, 2, 3, () => { g.fillStyle = frameWood; g.fillRect(x, y, w, h); });
        g.fillStyle = 'rgba(255,240,215,0.28)'; g.fillRect(x, y, w, 2); g.fillRect(x, y, 2, h);
        g.fillStyle = 'rgba(50,25,8,0.3)'; g.fillRect(x, y + h - 2, w, 2); g.fillRect(x + w - 2, y, 2, h);
      };
      bar(wx - 10, wy - 10, ww + 20, 12); bar(wx - 10, wy + wh - 2, ww + 20, 12);
      bar(wx - 10, wy - 10, 12, wh + 20); bar(wx + ww - 2, wy - 10, 12, wh + 20);
      bar(wx + ww / 2 - 4, wy, 8, wh); bar(wx, wy + wh / 2 - 4, ww, 8);
      shadowed(g, 'rgba(40,20,5,0.4)', 10, 0, 6, () => { g.fillStyle = frameWood; g.fillRect(wx - 22, wy + wh + 8, ww + 44, 14); });
      g.fillStyle = 'rgba(255,240,215,0.35)'; g.fillRect(wx - 22, wy + wh + 8, ww + 44, 3);
      // halo de lumière autour de la fenêtre
      g.save(); g.globalCompositeOperation = 'lighter'; g.filter = 'blur(18px)';
      g.fillStyle = 'rgba(255,240,200,0.28)'; g.fillRect(wx - 10, wy - 10, ww + 20, wh + 20);
      g.restore();

      // --- rideaux en tissu (plis ombrés, pas de contour) ---
      const fabric = texture(70, 280, (x, y) => { const n = noise(x / 1.3, y / 1.3) * 0.08 + fbm(x / 10, y / 30) * 0.08; return [201 * (0.88 + n), 120 * (0.88 + n), 130 * (0.88 + n)]; });
      for (const side of [-1, 1]) {
        const cx = side < 0 ? wx - 8 : wx + ww + 8;
        const path = () => {
          g.beginPath(); g.moveTo(cx - side * 4, wy - 22);
          g.quadraticCurveTo(cx + side * 40, wy + 80, cx + side * 10, wy + 130);
          g.quadraticCurveTo(cx + side * 30, wy + 190, cx + side * 14, wy + wh + 24);
          g.lineTo(cx + side * 50, wy + wh + 24);
          g.quadraticCurveTo(cx + side * 64, wy + 120, cx + side * 52, wy - 22); g.closePath();
        };
        shadowed(g, 'rgba(50,20,10,0.35)', 16, side * 6, 6, () => { path(); g.fillStyle = '#c97884'; g.fill(); });
        g.save(); path(); g.clip();
        g.drawImage(fabric, Math.min(cx, cx + side * 64), wy - 24, 70, wh + 50);
        const folds = g.createLinearGradient(cx, 0, cx + side * 60, 0);
        for (let i = 0; i <= 6; i++) folds.addColorStop(i / 6, i % 2 ? 'rgba(255,230,230,0.22)' : 'rgba(70,15,25,0.28)');
        g.fillStyle = folds; g.fillRect(cx - 70, wy - 30, 140, wh + 60);
        g.restore();
      }
      shadowed(g, 'rgba(40,20,5,0.4)', 6, 0, 3, () => { g.fillStyle = Draw.vgrad(g, wy - 30, wy - 20, ['#9a9a9a', '#5c5c5c']); g.fillRect(wx - 74, wy - 30, ww + 148, 7); });

      // --- étagère, bocaux en verre, petite plante ---
      const shelfWood = woodTex(300, 18, [176, 124, 78], [110, 70, 38]);
      shadowed(g, 'rgba(40,20,5,0.45)', 14, 4, 10, () => { g.drawImage(shelfWood, 52, 144, 296, 16); });
      g.fillStyle = 'rgba(255,235,205,0.3)'; g.fillRect(52, 144, 296, 2);
      g.fillStyle = 'rgba(40,20,5,0.35)'; g.fillRect(52, 158, 296, 2);
      for (const bx of [84, 312]) { g.fillStyle = Draw.vgrad(g, 160, 186, ['#8a8a8a', '#4a4a4a']); g.beginPath(); g.moveTo(bx, 160); g.lineTo(bx + 4, 160); g.lineTo(bx + 4, 184); g.lineTo(bx + 18, 160); g.lineTo(bx + 22, 160); g.lineTo(bx + 4, 190); g.lineTo(bx, 190); g.fill(); }
      const jar = (x, h, content) => {
        const y = 144 - h, w = 52;
        g.save();
        g.shadowColor = 'rgba(40,20,5,0.3)'; g.shadowBlur = 8; g.shadowOffsetX = 3; g.shadowOffsetY = 2;
        Draw.rrect(g, x, y + 10, w, h - 10, 9); g.fillStyle = 'rgba(210,225,235,0.25)'; g.fill();
        g.restore();
        g.save(); Draw.rrect(g, x + 3, y + 12, w - 6, h - 14, 7); g.clip(); content(x + 3, y + 12, w - 6, h - 14); g.restore();
        const gl = g.createLinearGradient(x, 0, x + w, 0); // verre : bords plus lumineux, centre transparent
        gl.addColorStop(0, 'rgba(255,255,255,0.45)'); gl.addColorStop(0.18, 'rgba(255,255,255,0.08)'); gl.addColorStop(0.8, 'rgba(255,255,255,0.05)'); gl.addColorStop(1, 'rgba(255,255,255,0.35)');
        Draw.rrect(g, x, y + 10, w, h - 10, 9); g.fillStyle = gl; g.fill();
        g.fillStyle = 'rgba(255,255,255,0.7)'; Draw.rrect(g, x + 7, y + 16, 4, h - 26, 2); g.fill();
        const lid = g.createLinearGradient(x, 0, x + w, 0);
        ['#9a9a9a', '#e6e6e6', '#7c7c7c', '#cfcfcf', '#6e6e6e'].forEach((c, i) => lid.addColorStop(i / 4, c));
        Draw.rrect(g, x + 2, y, w - 4, 13, 4); g.fillStyle = lid; g.fill();
        g.fillStyle = 'rgba(0,0,0,0.18)'; for (let k = x + 5; k < x + w - 4; k += 3) g.fillRect(k, y + 2, 1, 9);
      };
      jar(96, 58, (x, y, w, h) => { // confiture
        g.fillStyle = Draw.rgrad(g, x + w * 0.4, y + h * 0.6, 4, w, '#b3122e', '#4f0612'); g.fillRect(x, y + 8, w, h);
        g.fillStyle = 'rgba(255,200,200,0.15)'; g.fillRect(x, y + 8, w, 3);
        g.fillStyle = '#f2e6cf'; g.fillRect(x + 4, y + h * 0.35, w - 8, 16);
        g.fillStyle = '#7a3b1b'; g.font = 'italic 9px Georgia, serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('Confiture', x + w / 2, y + h * 0.35 + 8);
      });
      jar(168, 66, (x, y, w, h) => { // miel
        g.fillStyle = Draw.rgrad(g, x + w * 0.5, y + h * 0.5, 2, w, '#ffcf5a', '#b06a0a'); g.fillRect(x, y + 6, w, h);
        g.fillStyle = '#f2e6cf'; g.fillRect(x + 4, y + h * 0.4, w - 8, 16);
        g.fillStyle = '#7a3b1b'; g.font = 'italic 10px Georgia, serif'; g.textAlign = 'center'; g.fillText('Miel', x + w / 2, y + h * 0.4 + 8);
      });
      jar(240, 54, (x, y, w, h) => { // biscuits
        g.fillStyle = '#efe4cc'; g.fillRect(x, y, w, h);
        for (let i = 0; i < 6; i++) { g.fillStyle = Draw.rgrad(g, x + 8 + (i % 3) * 14, y + 16 + Math.floor(i / 3) * 16, 1, 10, '#e2b06a', '#a86a2c'); Draw.circle(g, x + 8 + (i % 3) * 14, y + 16 + Math.floor(i / 3) * 16, 9); g.fill(); }
      });
      shadowed(g, 'rgba(40,20,5,0.35)', 8, 3, 3, () => { // pot de la plante
        g.beginPath(); g.moveTo(300, 118); g.lineTo(334, 118); g.lineTo(330, 144); g.lineTo(304, 144); g.closePath();
        g.fillStyle = Draw.vgrad(g, 118, 144, ['#c76f44', '#8e4627']); g.fill();
      });
      g.fillStyle = 'rgba(255,220,190,0.3)'; g.fillRect(300, 118, 34, 3);
      for (const [a, l, c] of [[-1.0, 30, '#3f7a36'], [-0.45, 40, '#4c8c41'], [0.1, 36, '#3a7032'], [0.6, 34, '#4f9445'], [1.1, 26, '#3f7a36']]) {
        g.save(); g.translate(317, 118); g.rotate(a);
        g.fillStyle = Draw.rgrad(g, 0, -l / 2, 2, l / 2, '#7cc06a', c); g.beginPath(); g.ellipse(0, -l / 2, 7, l / 2, 0, 0, Math.PI * 2); g.fill();
        g.strokeStyle = 'rgba(220,255,200,0.4)'; g.lineWidth = 1; g.beginPath(); g.moveTo(0, -2); g.lineTo(0, -l + 4); g.stroke();
        g.restore();
      }

      // --- rayons de lumière dans l'air ---
      g.save(); g.globalCompositeOperation = 'lighter'; g.filter = 'blur(10px)';
      for (const [x0, x1, alpha] of [[wx + 20, wx - 230, 0.16], [wx + 90, wx - 120, 0.12], [wx + 160, wx - 30, 0.1]]) {
        const bg = g.createLinearGradient(0, wy + wh, 0, T + 40);
        bg.addColorStop(0, `rgba(255,245,215,${alpha})`); bg.addColorStop(1, 'rgba(255,245,215,0)');
        g.fillStyle = bg; g.beginPath(); g.moveTo(x0, wy + wh); g.lineTo(x0 + 50, wy + wh); g.lineTo(x1 + 90, T + 40); g.lineTo(x1, T + 40); g.closePath(); g.fill();
      }
      g.restore();

      // --- table en bois verni ---
      g.drawImage(woodTex(W, 46, [196, 140, 88], [118, 72, 36]), 0, T);
      g.fillStyle = Draw.vgrad(g, T, T + 46, ['rgba(255,240,215,0.28)', 'rgba(255,240,215,0)']); g.fillRect(0, T, W, 46);
      const varnish = g.createRadialGradient(560, T + 20, 10, 560, T + 20, 320); // reflet de la fenêtre dans le vernis
      varnish.addColorStop(0, 'rgba(255,250,235,0.35)'); varnish.addColorStop(1, 'rgba(255,250,235,0)');
      g.save(); g.translate(560, T + 20); g.scale(1, 0.12); g.translate(-560, -(T + 20)); g.fillStyle = varnish; g.fillRect(0, T - 300, W, 600); g.restore();
      g.drawImage(woodTex(W, H - T - 46, [128, 80, 42], [70, 40, 18], 2), 0, T + 46);
      g.fillStyle = Draw.vgrad(g, T + 46, H, ['rgba(0,0,0,0.25)', 'rgba(0,0,0,0.05)']); g.fillRect(0, T + 46, W, H - T - 46);
      g.fillStyle = 'rgba(255,230,200,0.25)'; g.fillRect(0, T + 45, W, 1);

      // --- assiette en porcelaine et part de gâteau ---
      const px = 220, py = T + 18;
      g.save(); g.filter = 'blur(6px)'; g.fillStyle = 'rgba(40,20,5,0.45)'; g.beginPath(); g.ellipse(px + 8, py + 8, 100, 14, 0, 0, Math.PI * 2); g.fill(); g.restore();
      g.fillStyle = Draw.rgrad(g, px - 30, py - 8, 10, 120, '#ffffff', '#c9ccd2'); g.beginPath(); g.ellipse(px, py, 105, 20, 0, 0, Math.PI * 2); g.fill();
      g.fillStyle = 'rgba(150,155,165,0.25)'; g.beginPath(); g.ellipse(px, py - 1, 76, 13, 0, 0, Math.PI * 2); g.fill();
      g.strokeStyle = 'rgba(255,255,255,0.9)'; g.lineWidth = 1.5; g.beginPath(); g.ellipse(px, py - 2, 103, 18, 0, Math.PI * 1.05, Math.PI * 1.7); g.stroke();
      const cx = px - 50, cy = py - 4;
      const sponge = texture(110, 64, (x, y) => { const hole = noise(x / 2.2, y / 2.2) > 0.78 ? 0.78 : 1; const n = 0.9 + fbm(x / 6, y / 6) * 0.15; return [242 * n * hole, 206 * n * hole, 140 * n * hole]; });
      g.save(); g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx + 110, cy); g.lineTo(cx + 110, cy - 62); g.lineTo(cx + 18, cy - 50); g.closePath(); g.clip();
      g.drawImage(sponge, cx, cy - 64);
      g.fillStyle = Draw.vgrad(g, cy - 36, cy - 26, ['#fffaf0', '#efe4cf']); g.fillRect(cx, cy - 36, 112, 9);
      g.fillStyle = Draw.vgrad(g, cy - 21, cy - 15, ['#d6334f', '#8e1026']); g.fillRect(cx, cy - 21, 112, 6);
      g.fillStyle = Draw.vgrad(g, cy - 62, cy, ['rgba(0,0,0,0)', 'rgba(60,30,0,0.2)']); g.fillRect(cx, cy - 64, 112, 64);
      g.restore();
      g.beginPath(); g.moveTo(cx + 14, cy - 52); g.lineTo(cx + 112, cy - 66);
      for (let x = 112; x >= 14; x -= 14) g.quadraticCurveTo(cx + x - 7, cy - 52 + ((x / 14) % 2 ? 10 : 4) - (x / 112) * 12, cx + x - 14, cy - 50 - ((x - 14) / 112) * 12);
      g.closePath(); g.fillStyle = Draw.vgrad(g, cy - 70, cy - 40, ['#ffc2d1', '#f2799a']); g.fill();
      g.strokeStyle = 'rgba(255,255,255,0.6)'; g.lineWidth = 2; g.beginPath(); g.moveTo(cx + 30, cy - 56); g.lineTo(cx + 90, cy - 64); g.stroke();
      shadowed(g, 'rgba(60,0,10,0.35)', 5, 2, 3, () => { g.fillStyle = Draw.rgrad(g, cx + 68, cy - 72, 1, 12, '#ff6b6b', '#9e0f1e', -4, -4); g.beginPath(); g.ellipse(cx + 70, cy - 70, 11, 10, 0, 0, Math.PI * 2); g.fill(); });
      g.fillStyle = '#f7e27a'; for (let i = 0; i < 9; i++) { Draw.circle(g, cx + 63 + (i % 3) * 5, cy - 75 + Math.floor(i / 3) * 5, 0.9); g.fill(); }
      g.fillStyle = 'rgba(255,255,255,0.7)'; g.beginPath(); g.ellipse(cx + 66, cy - 74, 3, 2, -0.5, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#4f8a3a'; g.beginPath(); g.ellipse(cx + 70, cy - 80, 8, 3, 0.2, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#c99550'; for (const [dx, dy] of [[-30, 6], [-22, 9], [130, 7], [140, 4], [125, 10]]) { Draw.circle(g, cx + dx + 50, py + dy - 4, 2); g.fill(); }

      // --- tasse de thé en céramique ---
      const mx = 790, my = T + 14;
      g.save(); g.filter = 'blur(5px)'; g.fillStyle = 'rgba(40,20,5,0.45)'; g.beginPath(); g.ellipse(mx + 6, my + 6, 46, 9, 0, 0, Math.PI * 2); g.fill(); g.restore();
      g.fillStyle = Draw.rgrad(g, mx - 15, my - 3, 3, 50, '#ffffff', '#c4c9cf'); g.beginPath(); g.ellipse(mx, my, 44, 9, 0, 0, Math.PI * 2); g.fill();
      g.beginPath(); g.moveTo(mx - 30, my - 52); g.lineTo(mx + 30, my - 52); g.quadraticCurveTo(mx + 28, my - 2, mx, my - 2); g.quadraticCurveTo(mx - 28, my - 2, mx - 30, my - 52); g.closePath();
      const cup = g.createLinearGradient(mx - 30, 0, mx + 30, 0);
      cup.addColorStop(0, '#2c6f96'); cup.addColorStop(0.3, '#6cb6dd'); cup.addColorStop(0.45, '#cfeeff'); cup.addColorStop(0.6, '#5aa6cf'); cup.addColorStop(1, '#1f5576');
      g.fillStyle = cup; g.fill();
      g.beginPath(); g.arc(mx + 32, my - 30, 12, -Math.PI / 2, Math.PI / 2); g.lineWidth = 6; g.strokeStyle = '#3f8db8'; g.stroke();
      g.fillStyle = Draw.rgrad(g, mx - 8, my - 54, 2, 30, '#a8673a', '#4a2510'); g.beginPath(); g.ellipse(mx, my - 52, 29, 5.5, 0, 0, Math.PI * 2); g.fill();
      g.fillStyle = 'rgba(255,240,210,0.45)'; g.beginPath(); g.ellipse(mx + 8, my - 53, 9, 1.8, 0, 0, Math.PI * 2); g.fill();
      g.strokeStyle = 'rgba(255,255,255,0.8)'; g.lineWidth = 1.5; g.beginPath(); g.ellipse(mx, my - 52, 30, 6, 0, Math.PI, Math.PI * 1.6); g.stroke();

      // --- grain de film (réutilisé à chaque image avec un décalage) ---
      this._grain = texture(256, 256, () => { const v = rnd() * 255; return [v, v, v, 18]; });
      this._bg = cv;
      return cv;
    },

    // mouche réaliste : poils, reflets métalliques, ailes nervurées en mouvement, pas de contour
    drawFly(g, s) {
      const t = s.t;
      g.save();
      g.translate(s.x, s.y);
      g.rotate(Math.atan2(s.vy, s.vx));
      g.scale(1.6, 1.6);
      g.strokeStyle = '#151515'; g.lineCap = 'round';
      for (const side of [-1, 1]) {
        [[-4, 0.9], [1, 1.3], [5, 1.8]].forEach(([lx, a], i) => {
          const ang = side * (a + Math.sin(t * 30 + i * 2 + side) * 0.15);
          const kx = lx + Math.cos(ang) * 9, ky = Math.sin(ang) * 10;
          g.lineWidth = 1.3; g.beginPath(); g.moveTo(lx, side * 4); g.lineTo(kx, ky); g.stroke();
          g.lineWidth = 0.8; g.beginPath(); g.moveTo(kx, ky); g.lineTo(kx + (i - 1) * 5, ky + side * 6); g.stroke();
        });
      }
      // abdomen : reflets métalliques vert-bleu + bandes
      g.fillStyle = Draw.rgrad(g, -13, 0, 1, 16, '#5c6b58', '#0b0f0b', -4, -4); g.beginPath(); g.ellipse(-13, 0, 15, 10, 0, 0, Math.PI * 2); g.fill();
      g.save(); g.globalCompositeOperation = 'lighter';
      g.fillStyle = 'rgba(70,140,130,0.35)'; g.beginPath(); g.ellipse(-15, -3, 9, 3.5, -0.1, 0, Math.PI * 2); g.fill();
      g.fillStyle = 'rgba(110,80,160,0.2)'; g.beginPath(); g.ellipse(-10, 4, 7, 2.5, 0.1, 0, Math.PI * 2); g.fill();
      g.restore();
      g.strokeStyle = 'rgba(0,0,0,0.5)'; g.lineWidth = 1.2;
      for (const x of [-20, -14, -8]) { g.beginPath(); g.ellipse(x, 0, 2.5, 9, 0, -Math.PI / 2, Math.PI / 2); g.stroke(); }
      // poils
      g.strokeStyle = 'rgba(10,10,10,0.85)'; g.lineWidth = 0.6;
      for (let i = 0; i < 26; i++) {
        const a = (i / 26) * Math.PI * 2, rx = i < 14 ? 15 : 9, cxx = i < 14 ? -13 : 2;
        const bx = cxx + Math.cos(a) * rx, by = Math.sin(a) * (i < 14 ? 10 : 8.5);
        g.beginPath(); g.moveTo(bx, by); g.lineTo(bx + Math.cos(a) * 2.6, by + Math.sin(a) * 2.6); g.stroke();
      }
      // ailes : plusieurs positions superposées = flou de mouvement
      const flap = Math.sin(t * 70);
      for (const side of [-1, 1]) {
        for (const [k, alpha] of [[flap, 0.45], [flap * 0.3, 0.25], [-flap * 0.5, 0.15]]) {
          g.save();
          g.globalAlpha = alpha;
          g.rotate(side * (2.6 - 0.35 * k));
          const wg = g.createLinearGradient(0, -7, 32, 7);
          wg.addColorStop(0, 'rgba(210,225,240,0.7)'); wg.addColorStop(0.35, 'rgba(235,205,250,0.5)'); wg.addColorStop(0.7, 'rgba(190,240,230,0.5)'); wg.addColorStop(1, 'rgba(220,220,255,0.55)');
          g.fillStyle = wg; g.beginPath(); g.ellipse(15, 0, 17, 6.5, 0, 0, Math.PI * 2); g.fill();
          g.strokeStyle = 'rgba(40,45,55,0.7)'; g.lineWidth = 0.55;
          g.beginPath(); g.moveTo(1, 0); g.quadraticCurveTo(16, -2, 31, 0);
          g.moveTo(4, 0); g.quadraticCurveTo(14, -5, 26, -4.5); g.moveTo(4, 0); g.quadraticCurveTo(14, 4, 26, 4.5);
          g.moveTo(12, -4.6); g.lineTo(14, 0); g.moveTo(19, 4.6); g.lineTo(20, 0); g.stroke();
          g.restore();
        }
      }
      // thorax rayé gris
      g.fillStyle = Draw.rgrad(g, 2, 0, 1, 10, '#5a5f5a', '#101210', -3, -3); g.beginPath(); g.ellipse(2, 0, 9, 8.5, 0, 0, Math.PI * 2); g.fill();
      g.strokeStyle = 'rgba(200,200,190,0.4)'; g.lineWidth = 1.1;
      for (const y of [-3.2, 0, 3.2]) { g.beginPath(); g.moveTo(-4, y); g.lineTo(8, y * 0.8); g.stroke(); }
      // tête et yeux à facettes
      g.fillStyle = '#1b1d1b'; g.beginPath(); g.ellipse(12, 0, 6, 7, 0, 0, Math.PI * 2); g.fill();
      for (const side of [-1, 1]) {
        g.fillStyle = Draw.rgrad(g, 13, side * 4.5, 0.5, 6, '#e8333d', '#5c0710', -1.5, -side * 1.5);
        g.beginPath(); g.ellipse(13, side * 4.5, 5.2, 4.6, 0, 0, Math.PI * 2); g.fill();
        g.fillStyle = 'rgba(40,0,6,0.45)';
        for (let i = 0; i < 14; i++) { Draw.circle(g, 10 + (i % 5) * 1.6, side * 4.5 - 2.4 + Math.floor(i / 5) * 2, 0.45); g.fill(); }
        g.fillStyle = 'rgba(255,255,255,0.9)'; g.beginPath(); g.ellipse(12, side * 4.5 - 1.6, 1.6, 0.9, 0, 0, Math.PI * 2); g.fill();
      }
      g.restore();
    },

    // tapette réaliste : plastique ajouré (on voit à travers) et manche en fil de fer torsadé
    drawSwatter(g, x, y, swat) {
      const press = swat > 0;
      const head = () => {
        g.beginPath(); g.roundRect(-52, -56, 104, 112, 18);
        for (let yy = -45; yy <= 45; yy += 10) for (let xx = (Math.abs(yy / 10) % 2 ? -42 : -46); xx <= 46; xx += 9) { g.moveTo(xx + 2.8, yy); g.arc(xx, yy, 2.8, 0, Math.PI * 2); }
      };
      g.save();
      g.translate(x, y);
      g.rotate(press ? -0.28 : 0.1);
      const k = press ? 0.9 : 1;
      g.scale(k, k);
      g.save(); g.translate(14, 20); g.filter = 'blur(5px)'; g.fillStyle = 'rgba(30,15,5,0.25)'; head(); g.fill('evenodd');
      g.lineWidth = 6; g.strokeStyle = 'rgba(30,15,5,0.25)'; g.beginPath(); g.moveTo(24, 54); g.lineTo(92, 172); g.stroke();
      g.restore();
      // fil de fer torsadé
      g.lineCap = 'round';
      g.lineWidth = 5; g.strokeStyle = '#5d6165'; g.beginPath(); g.moveTo(16, 50); g.lineTo(84, 166); g.stroke();
      g.lineWidth = 2; g.strokeStyle = '#d7dadd'; g.beginPath(); g.moveTo(15, 48); g.lineTo(83, 164); g.stroke();
      g.strokeStyle = 'rgba(40,40,45,0.6)'; g.lineWidth = 1;
      for (let i = 0; i < 24; i++) { const q = i / 24, px = 16 + 68 * q, py = 50 + 116 * q; g.beginPath(); g.moveTo(px - 3, py + 1); g.lineTo(px + 3, py - 1.5); g.stroke(); }
      // poignée
      g.lineWidth = 12; g.strokeStyle = '#a0182b'; g.beginPath(); g.moveTo(16 + 68 * 0.72, 50 + 116 * 0.72); g.lineTo(16 + 68 * 1.04, 50 + 116 * 1.04); g.stroke();
      g.lineWidth = 3; g.strokeStyle = 'rgba(255,190,200,0.5)'; g.beginPath(); g.moveTo(14 + 68 * 0.74, 49 + 116 * 0.74); g.lineTo(14 + 68 * 1.0, 49 + 116 * 1.0); g.stroke();
      // tête en plastique translucide
      const hg = g.createLinearGradient(-52, -56, 52, 56);
      hg.addColorStop(0, 'rgba(232,70,92,0.93)'); hg.addColorStop(0.5, 'rgba(206,38,62,0.93)'); hg.addColorStop(1, 'rgba(150,18,40,0.93)');
      g.fillStyle = hg; head(); g.fill('evenodd');
      g.beginPath(); g.roundRect(-52, -56, 104, 112, 18); g.lineWidth = 5; g.strokeStyle = 'rgba(170,20,42,0.95)'; g.stroke();
      g.beginPath(); g.roundRect(-49, -53, 98, 106, 15); g.lineWidth = 1.2; g.strokeStyle = 'rgba(255,190,200,0.6)'; g.stroke();
      const spec = g.createLinearGradient(-52, -56, 0, 0);
      spec.addColorStop(0, 'rgba(255,255,255,0.35)'); spec.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = spec; g.beginPath(); g.roundRect(-50, -54, 60, 50, 14); g.fill();
      g.restore();
      if (press) {
        g.save(); g.strokeStyle = 'rgba(255,255,255,0.55)'; g.lineWidth = 2; g.lineCap = 'round';
        for (let i = 0; i < 3; i++) { g.beginPath(); g.arc(x - 10, y - 10, 70 + i * 9, -2.6 + i * 0.12, -1.7 + i * 0.12); g.stroke(); }
        g.restore();
      }
    },

    // tache réaliste : liquide brillant qui coule un peu, mouche écrasée
    drawSplat(g, s) {
      const sp = s.splat, pop = Math.min(1, s.splatT / 0.1), drip = Math.min(1, s.splatT / 1.2);
      g.save();
      g.translate(s.x, s.y);
      g.scale(pop, pop);
      g.save();
      g.shadowColor = 'rgba(40,30,0,0.35)'; g.shadowBlur = 6; g.shadowOffsetY = 2;
      g.beginPath();
      sp.edge.forEach((k, i) => {
        const n = sp.edge.length, a = (i / n) * Math.PI * 2 + sp.rot, r = 30 * k;
        const a2 = ((i + 0.5) / n) * Math.PI * 2 + sp.rot, kk = sp.edge[(i + 1) % n];
        if (i === 0) g.moveTo(Math.cos(a) * r, Math.sin(a) * r);
        g.quadraticCurveTo(Math.cos(a2) * 34, Math.sin(a2) * 34, Math.cos(a + Math.PI * 2 / n) * 30 * kk, Math.sin(a + Math.PI * 2 / n) * 30 * kk);
      });
      g.closePath();
      g.fillStyle = Draw.rgrad(g, 0, 0, 2, 40, '#b5c94a', '#5f7414', -6, -6); g.fill();
      for (const d of sp.drops) { // coulures vers le bas
        const dx = Math.cos(d.a) * d.d * 0.7, dy = Math.sin(d.a) * d.d * 0.7;
        g.beginPath(); g.ellipse(dx, dy + drip * d.r * 3, d.r * 0.7, d.r * (0.9 + drip * 1.5), 0, 0, Math.PI * 2); g.fill();
      }
      g.restore();
      g.fillStyle = 'rgba(255,255,230,0.55)'; g.beginPath(); g.ellipse(-9, -10, 8, 4, -0.5, 0, Math.PI * 2); g.fill();
      g.fillStyle = 'rgba(20,24,18,0.9)'; g.beginPath(); g.ellipse(0, 0, 13, 5, 0.3, 0, Math.PI * 2); g.fill();
      g.fillStyle = 'rgba(210,225,240,0.45)'; g.beginPath(); g.ellipse(12, -6, 11, 3.5, 0.9, 0, Math.PI * 2); g.fill();
      g.strokeStyle = 'rgba(15,15,15,0.8)'; g.lineWidth = 1;
      for (const a of [0.4, 1.4, 2.6, 3.8, 5.1]) { g.beginPath(); g.moveTo(Math.cos(a) * 6, Math.sin(a) * 3); g.lineTo(Math.cos(a) * 16, Math.sin(a) * 12); g.stroke(); }
      g.restore();
      if (s.splatT < 0.25) { // éclair d'impact
        g.save(); g.globalCompositeOperation = 'lighter';
        const fl = g.createRadialGradient(s.x, s.y, 0, s.x, s.y, 90);
        fl.addColorStop(0, `rgba(255,255,220,${0.5 * (1 - s.splatT / 0.25)})`); fl.addColorStop(1, 'rgba(255,255,220,0)');
        g.fillStyle = fl; Draw.circle(g, s.x, s.y, 90); g.fill(); g.restore();
      }
    },

    draw(s, g, c) {
      g.drawImage(this.background(), 0, 0);
      // vapeur du thé
      g.save(); g.lineCap = 'round';
      for (let i = 0; i < 3; i++) {
        const ph = s.t * 0.8 + i * 2.1, x0 = 782 + i * 9;
        g.strokeStyle = `rgba(255,255,255,${0.1 - i * 0.02})`; g.lineWidth = 7 - i;
        g.beginPath(); g.moveTo(x0, T - 40);
        g.bezierCurveTo(x0 + Math.sin(ph) * 14, T - 75, x0 - Math.sin(ph * 1.3) * 16, T - 105, x0 + Math.sin(ph * 0.7) * 10, T - 140);
        g.stroke();
      }
      g.restore();
      // poussières dans les rayons
      g.fillStyle = 'rgba(255,250,230,0.55)';
      for (let i = 0; i < 18; i++) {
        const px = 470 + ((i * 53 + Math.sin(s.t * 0.6 + i) * 30) % 280), py = 250 + ((i * 37 + s.t * 10) % 150);
        Draw.circle(g, px, py, 0.8 + (i % 3) * 0.5); g.fill();
      }
      if (s.splat) this.drawSplat(g, s);
      else {
        g.save(); g.filter = 'blur(4px)'; g.fillStyle = 'rgba(40,25,10,0.22)';
        g.beginPath(); g.ellipse(s.x + 14, s.y + 24, 22, 10, 0, 0, Math.PI * 2); g.fill(); g.restore();
        this.drawFly(g, s);
      }
      for (const w of s.whoosh) {
        g.save(); g.globalAlpha = (1 - w.t / 0.25) * 0.7; g.strokeStyle = '#fffbe8'; g.lineWidth = 1.8; g.lineCap = 'round';
        for (let i = 0; i < 3; i++) { g.beginPath(); g.arc(w.x, w.y, 30 + w.t * 160 + i * 8, -0.5 + i, 0.3 + i); g.stroke(); }
        g.restore();
      }
      Draw.vignette(g, 0.42);
      if (this._grain) { const ox = (s.t * 997) % 256, oy = (s.t * 613) % 256; g.save(); g.fillStyle = g.createPattern(this._grain, 'repeat'); g.translate(-ox, -oy); g.fillRect(ox, oy, W, H); g.restore(); }
      this.drawSwatter(g, c.input.x, c.input.y, s.swat);
    },
  });
})();
