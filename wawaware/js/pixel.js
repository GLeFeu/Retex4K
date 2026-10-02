// ===== Rendu PIXEL ART HD (façon Owlboy / Eastward), appliqué à tous les mini-jeux =====
// Chaque image d'un mini-jeu est dessinée normalement (960×540), puis :
//  1. réduite à 480×270 (un "gros pixel" = 2×2 pixels de l'écran) ;
//  2. ramenée à une palette limitée dont les teintes glissent (ombres violettes, lumières chaudes),
//     avec un léger tramage ordonné pour les dégradés ;
//  3. contours colorés : les traits noirs qui bordent une couleur vive prennent une version sombre
//     de cette couleur (comme dans Owlboy, pas de contour noir partout) ;
//  4. textes redessinés en police pixel, nets (pas de flou) ;
//  5. agrandie ×2 sans lissage, puis éclairage doux par-dessus (lumière chaude en haut à droite,
//     ombre violette dans les coins), comme dans Eastward.
// Un jeu peut refuser ce rendu avec `pixel: false` (ex. s'il est déjà dessiné en pixel art).
const Pixel = (() => {
  const LW = W / 2, LH = H / 2;
  const FONT_PIX = '"Pixelify Sans", ' + FONT;

  // palette "Resurrect 64" (Kerrie Lake), très utilisée en pixel art pour ses rampes à teinte glissante,
  // légèrement éclaircie et saturée (comme validé sur « Écrase la mouche »)
  const HEX = ('2e222f 3e3546 625565 966c6c ab947a 694f62 7f708a 9babb2 c7dcd0 ffffff 6e2727 b33831 ea4f36 f57d4a ae2334 e83b3b '
    + 'fb6b1d f79617 f9c22b 7a3045 9e4539 cd683d e6904e fbb954 4c3e24 676633 a2a947 d5e04b fbff86 165a4c 239063 1ebc73 '
    + '91db69 cddf6c 313638 374e4a 547e64 92a984 b2ba90 0b5e65 0b8a8f 0eaf9b 30e1b9 8ff8e2 323353 484a77 4d65b4 4d9be6 '
    + '8fd3ff 45293f 6b3e75 905ea9 a884f3 eaaded 753c54 a24b6f cf657f ed8099 831c5d c32454 f04f78 f68181 fca790 fdcbb0').split(' ');
  const PAL = HEX.map(h => {
    let r = parseInt(h.slice(0, 2), 16), gg = parseInt(h.slice(2, 4), 16), b = parseInt(h.slice(4, 6), 16);
    const l = 0.3 * r + 0.59 * gg + 0.11 * b, sat = 1.1, br = 1.06;
    [r, gg, b] = [r, gg, b].map(v => Math.max(0, Math.min(255, (l + (v - l) * sat) * br)));
    return [Math.round(r), Math.round(gg), Math.round(b)];
  });
  const N = PAL.length;
  const lum = PAL.map(([r, g, b]) => (0.3 * r + 0.59 * g + 0.11 * b) / 255);
  const satOf = PAL.map(([r, g, b]) => { const mx = Math.max(r, g, b), mn = Math.min(r, g, b); return mx ? (mx - mn) / mx : 0; });

  // distance de couleur "redmean" (plus proche de l'œil qu'une distance RVB simple)
  const dist = (r1, g1, b1, [r2, g2, b2]) => {
    const rm = (r1 + r2) / 2, dr = r1 - r2, dg = g1 - g2, db = b1 - b2;
    return (2 + rm / 256) * dr * dr + 4 * dg * dg + (2 + (255 - rm) / 256) * db * db;
  };
  const nearest = (r, g, b) => {
    let best = 0, bd = Infinity;
    for (let i = 0; i < N; i++) { const d = dist(r, g, b, PAL[i]); if (d < bd) { bd = d; best = i; } }
    return best;
  };
  // table de correspondance : couleur sur 15 bits -> numéro de couleur de la palette
  const LUT = new Uint8Array(32768);
  for (let r = 0; r < 32; r++) for (let g = 0; g < 32; g++) for (let b = 0; b < 32; b++)
    LUT[(r << 10) | (g << 5) | b] = nearest(r * 8.23, g * 8.23, b * 8.23);
  // version sombre (teinte glissée vers le violet) de chaque couleur, pour les contours colorés
  const DARK = PAL.map(([r, g, b]) => nearest(r * 0.38 + 18, g * 0.3 + 12, b * 0.42 + 34));
  const isLine = lum.map(l => l < 0.2);
  // une teinte plus claire (vers le jaune chaud) et une plus sombre (vers le violet) de chaque couleur :
  // le relief automatique des formes, côté lumière et côté ombre
  const step = (i, f) => { for (let k = 1; k < 4; k++) { const j = f(k); if (j !== i) return j; } return i; };
  const LIGHTER = PAL.map(([r, g, b], i) => step(i, k => nearest(r + (255 - r) * 0.22 * k + 14, g + (255 - g) * 0.2 * k + 8, b + (255 - b) * 0.14 * k - 6)));
  const SHADE = PAL.map(([r, g, b], i) => step(i, k => nearest(r * (1 - 0.16 * k) + 6 * k, g * (1 - 0.2 * k), b * (1 - 0.1 * k) + 10 * k)));
  const RGB = new Uint32Array(N); // couleurs prêtes à écrire (ABGR, petit-boutiste)
  PAL.forEach(([r, g, b], i) => { RGB[i] = (255 << 24) | (b << 16) | (g << 8) | r; });

  const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map(v => (v / 16 - 0.47) * 22);

  const mk = (w, h, read) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return [c, c.getContext('2d', read ? { willReadFrequently: true } : undefined)]; };
  let full, fg, low, lg, txt, tg, out, og, idx, flat, lab, stack, okReg, bx0, bx1, by0, by1, light, glow;
  function init() {
    if (full) return;
    [full, fg] = mk(W, H);
    [low, lg] = mk(LW, LH, true);
    [txt, tg] = mk(LW, LH, true);
    [out, og] = mk(W, H);
    idx = new Uint8Array(LW * LH); flat = new Uint8Array(LW * LH); lab = new Int32Array(LW * LH); stack = new Int32Array(LW * LH); okReg = new Uint8Array(LW * LH + 1); bx0 = new Int16Array(LW * LH + 1); bx1 = new Int16Array(LW * LH + 1); by0 = new Int16Array(LW * LH + 1); by1 = new Int16Array(LW * LH + 1);
    // éclairage, calculé une fois
    let lc; [light, lc] = mk(W, H);
    const amb = lc.createRadialGradient(W * 0.8, H * 0.2, 60, W * 0.8, H * 0.2, 950);
    amb.addColorStop(0, '#ffffff'); amb.addColorStop(0.5, '#faf5fa'); amb.addColorStop(1, '#d3c7e2');
    lc.fillStyle = amb; lc.fillRect(0, 0, W, H);
    let gc; [glow, gc] = mk(W, H);
    const gl = gc.createRadialGradient(W * 0.8, H * 0.15, 20, W * 0.8, H * 0.15, 420);
    gl.addColorStop(0, 'rgba(255,226,170,0.13)'); gl.addColorStop(1, 'rgba(255,226,170,0)');
    gc.fillStyle = gl; gc.fillRect(0, 0, W, H);
    if (document.fonts && document.fonts.load) document.fonts.load('700 20px "Pixelify Sans"').catch(() => {});
  }

  // ----- les textes sont mis de côté pendant le dessin du jeu, puis redessinés en police pixel -----
  let queue = null;
  const baseText = Draw.text;
  Draw.text = function (g, str, x, y, size, fill = '#fff', stroke = '#1a1a1a', align = 'center') {
    if (queue && g === fg && /[0-9A-Za-zÀ-ÿ]/.test(String(str))) {
      queue.push({ m: g.getTransform(), alpha: g.globalAlpha, str, x, y, size, fill, stroke, align });
      return;
    }
    baseText(g, str, x, y, size, fill, stroke, align);
  };
  function drawTexts() {
    tg.setTransform(1, 0, 0, 1, 0, 0);
    tg.clearRect(0, 0, LW, LH);
    if (!queue.length) return false;
    for (const q of queue) {
      const { m } = q, sc = Math.hypot(m.a, m.b) || 1;
      const size = Math.max(q.size, 18 / sc); // jamais plus petit que ~7 gros pixels de haut
      tg.setTransform(m.a / 2, m.b / 2, m.c / 2, m.d / 2, m.e / 2, m.f / 2);
      tg.globalAlpha = q.alpha;
      tg.font = `700 ${size}px ${FONT_PIX}`;
      tg.textAlign = q.align; tg.textBaseline = 'middle'; tg.lineJoin = 'miter'; tg.miterLimit = 2;
      if (q.stroke) { tg.lineWidth = size * sc / 2 < 14 ? 5 / sc : Math.max(4, size / 5); /* petit texte : contour fin */ tg.strokeStyle = q.stroke; tg.strokeText(q.str, q.x, q.y); }
      tg.fillStyle = q.fill; tg.fillText(q.str, q.x, q.y);
    }
    tg.setTransform(1, 0, 0, 1, 0, 0); tg.globalAlpha = 1;
    // pixels nets : soit pleins, soit vides, et dans la palette
    const im = tg.getImageData(0, 0, LW, LH), d = im.data, d32 = new Uint32Array(d.buffer);
    for (let p = 0, i = 0; p < d32.length; p++, i += 4) {
      const a = d[i + 3];
      if (a < 120) { d32[p] = 0; continue; }
      d32[p] = RGB[LUT[((d[i] >> 3) << 10) | ((d[i + 1] >> 3) << 5) | (d[i + 2] >> 3)]];
    }
    tg.putImageData(im, 0, 0);
    return true;
  }

  function render(game, s, c) {
    init();
    fg.setTransform(1, 0, 0, 1, 0, 0);
    fg.globalAlpha = 1; fg.globalCompositeOperation = 'source-over'; fg.filter = 'none';
    fg.fillStyle = '#2e222f'; fg.fillRect(0, 0, W, H);
    queue = [];
    try {
      fg.save(); game.draw(s, fg, c); fg.restore();
    } catch (err) { queue = null; throw err; }
    const hasText = drawTexts();
    queue = null;

    // 1. réduction
    lg.imageSmoothingEnabled = true; lg.imageSmoothingQuality = 'high';
    lg.drawImage(full, 0, 0, LW, LH);
    const im = lg.getImageData(0, 0, LW, LH), d = im.data, d32 = new Uint32Array(d.buffer);
    // 2. palette ; le tramage n'est appliqué que dans les vrais dégradés (pas sur les aplats)
    for (let y = 0, p = 0; y < LH; y++) {
      const row = (y & 3) << 2;
      for (let x = 0; x < LW; x++, p++) {
        const i = p << 2;
        let r = d[i], g = d[i + 1], b = d[i + 2];
        flat[p] = LUT[((r >> 3) << 10) | ((g >> 3) << 5) | (b >> 3)];
        const j = x < LW - 1 ? i + 4 : i - 4, jy = y < LH - 1 ? i + LW * 4 : i - LW * 4;
        const vari = Math.abs(d[j] - r) + Math.abs(d[j + 1] - g) + Math.abs(d[j + 2] - b) + Math.abs(d[jy] - r) + Math.abs(d[jy + 1] - g) + Math.abs(d[jy + 2] - b);
        if (vari > 0 && vari < 24) { // dégradé doux : tramage
          const o = BAYER[row | (x & 3)];
          r += o; g += o; b += o;
          r = r < 0 ? 0 : r > 255 ? 255 : r; g = g < 0 ? 0 : g > 255 ? 255 : g; b = b < 0 ? 0 : b > 255 ? 255 : b;
          idx[p] = LUT[((r >> 3) << 10) | ((g >> 3) << 5) | (b >> 3)];
        } else idx[p] = flat[p];
      }
    }
    // zones de même couleur (séparées par les traits) : seules les petites zones à l'intérieur de
    // l'écran sont des objets à mettre en relief, pas le fond
    lab.fill(0);
    let nReg = 0;
    const MAXA = LW * LH * 0.18;
    for (let p0 = 0; p0 < LW * LH; p0++) {
      if (lab[p0] || isLine[flat[p0]]) continue;
      const col = flat[p0], id = ++nReg, lc = lum[col];
      let sp = 0, area = 0, border = false, eLine = 0, eOther = 0, x0 = LW, x1 = 0, y0 = LH, y1 = 0;
      stack[sp++] = p0; lab[p0] = id;
      while (sp) {
        const p = stack[--sp], x = p % LW, y = (p - x) / LW;
        area++;
        if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
        if (x === 0 || y === 0 || x === LW - 1 || y === LH - 1) border = true;
        if (x > 0) { const q = p - 1; if (flat[q] === col) { if (!lab[q]) { lab[q] = id; stack[sp++] = q; } } else if (lum[flat[q]] < lc - 0.12) eLine++; else eOther++; }
        if (x < LW - 1) { const q = p + 1; if (flat[q] === col) { if (!lab[q]) { lab[q] = id; stack[sp++] = q; } } else if (lum[flat[q]] < lc - 0.12) eLine++; else eOther++; }
        if (y > 0) { const q = p - LW; if (flat[q] === col) { if (!lab[q]) { lab[q] = id; stack[sp++] = q; } } else if (lum[flat[q]] < lc - 0.12) eLine++; else eOther++; }
        if (y < LH - 1) { const q = p + LW; if (flat[q] === col) { if (!lab[q]) { lab[q] = id; stack[sp++] = q; } } else if (lum[flat[q]] < lc - 0.12) eLine++; else eOther++; }
      }
      okReg[id] = !border && area < MAXA && area > 6 && eLine >= eOther * 0.6 ? (area > 60 ? 2 : 1) : 0;
      bx0[id] = x0; bx1[id] = x1; by0[id] = y0; by1[id] = y1;
    }
    // 3. relief automatique des formes cernées d'un trait (lumière en haut à droite) + contours colorés
    const lineAt = (x, y) => x >= 0 && y >= 0 && x < LW && y < LH && isLine[flat[y * LW + x]];
    for (let y = 0, p = 0; y < LH; y++) for (let x = 0; x < LW; x++, p++) {
      let k = idx[p];
      if (isLine[k]) {
        let best = -1, bs = 0.3;
        if (x > 0) { const n = idx[p - 1]; if (!isLine[n] && satOf[n] > bs) { bs = satOf[n]; best = n; } }
        if (x < LW - 1) { const n = idx[p + 1]; if (!isLine[n] && satOf[n] > bs) { bs = satOf[n]; best = n; } }
        if (y > 0) { const n = idx[p - LW]; if (!isLine[n] && satOf[n] > bs) { bs = satOf[n]; best = n; } }
        if (y < LH - 1) { const n = idx[p + LW]; if (!isLine[n] && satOf[n] > bs) { bs = satOf[n]; best = n; } }
        if (best >= 0) k = DARK[best];
      } else if (okReg[lab[p]]) {
        const id = lab[p];
        if (okReg[id] === 2) { // volume : la forme est éclairée comme une boule (2 ombres, 1 lumière)
          const nx = ((x - bx0[id] + 0.5) / (bx1[id] - bx0[id] + 1)) * 2 - 1, ny = ((y - by0[id] + 0.5) / (by1[id] - by0[id] + 1)) * 2 - 1;
          const dd = nx * nx + ny * ny, nz = dd < 1 ? Math.sqrt(1 - dd) : 0;
          const v = (nx * 0.55 - ny * 0.55 + nz * 0.63 + 0.35) / 1.5 + BAYER[((y & 3) << 2) | (x & 3)] / 22 * 0.12;
          if (v < 0.2) k = SHADE[SHADE[k]]; else if (v < 0.4) k = SHADE[k]; else if (v > 0.8) k = LIGHTER[k];
        }
        if (lineAt(x + 1, y - 1) || lineAt(x, y - 1)) k = LIGHTER[k]; // bord éclairé
        else if (lineAt(x - 1, y + 1) || lineAt(x, y + 1) || lineAt(x - 1, y)) k = SHADE[k]; // ombre propre
        else if (lineAt(x - 2, y + 2) || lineAt(x - 3, y + 2) || lineAt(x - 2, y + 3)) { if ((x + y) & 1) k = SHADE[k]; } // transition tramée
        else if (lineAt(x + 2, y - 2) && ((x + y) & 1)) k = LIGHTER[k];
      }
      d32[p] = RGB[k];
    }
    lg.putImageData(im, 0, 0);
    if (hasText) lg.drawImage(txt, 0, 0);

    // 5. agrandissement + éclairage
    og.globalCompositeOperation = 'source-over';
    og.imageSmoothingEnabled = false;
    og.drawImage(low, 0, 0, W, H);
    og.globalCompositeOperation = 'multiply'; og.drawImage(light, 0, 0);
    og.globalCompositeOperation = 'lighter'; og.drawImage(glow, 0, 0);
    og.globalCompositeOperation = 'source-over';
    return out;
  }

  const KEY = 'wawaware.pixel';
  let enabled = false;
  try { enabled = localStorage.getItem(KEY) === '1'; } catch (e) { enabled = false; } // en pause : désactivé par défaut

  return {
    get enabled() { return enabled; },
    set enabled(v) { enabled = !!v; try { localStorage.setItem(KEY, v ? '1' : '0'); } catch (e) {} },
    // dessine le mini-jeu, en pixel art si possible ; g peut être transformé (miniature, aperçu…)
    draw(game, s, g, c) {
      if (!enabled || game.pixel === false) return game.draw(s, g, c);
      const img = render(game, s, c);
      const sm = g.imageSmoothingEnabled;
      g.imageSmoothingEnabled = g.getTransform().a < 0.99; // en petit (miniature), on lisse un peu
      g.drawImage(img, 0, 0, W, H);
      g.imageSmoothingEnabled = sm;
    },
  };
})();
