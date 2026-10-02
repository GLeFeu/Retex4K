// ===== PA : outils communs des mini-jeux en pixel art (images IA nettoyées, WebP sans perte) =====
// Chaque mini-jeu dessine sur une petite toile 320×180 ("gros pixels"), agrandie ×3 sans lissage.
// Les coordonnées du jeu restent en 960×540 : on divise par PA.K pour dessiner.
//   const IM = PA.images('taupe', ['fond', 'taupe', 'marteau']);   // assets/ia/taupe/*.webp
//   draw(s, g, c) { const l = PA.debut(g); if (!l) return; ...; PA.fin(g); }
const PA = (() => {
  const K = 3, LW = W / K, LH = H / K;
  const FONT_PIX = '"Pixelify Sans", ' + FONT;
  const cache = {};
  let low, l, textes = [], effet = {};

  function images(dossier, noms) {
    const o = {};
    for (const n of noms) {
      const cle = dossier + '/' + n;
      if (!cache[cle]) { const i = new Image(); i.src = `assets/ia/${cle}.webp?v=${WAWAWARE_VERSION}`; cache[cle] = i; }
      o[n] = cache[cle];
    }
    return o;
  }
  const pret = (im) => im && (im instanceof HTMLCanvasElement || (im.complete && im.naturalWidth > 0));

  // commence l'image : renvoie la petite toile (ou null si les images ne sont pas encore chargées)
  function debut(g, imgs, fond = '#2e222f') {
    if (imgs && !Object.values(imgs).every(pret)) { g.fillStyle = fond; g.fillRect(0, 0, W, H); return null; }
    if (!low) { low = document.createElement('canvas'); low.width = LW; low.height = LH; l = low.getContext('2d'); }
    l.setTransform(1, 0, 0, 1, 0, 0);
    l.globalAlpha = 1; l.globalCompositeOperation = 'source-over'; l.filter = 'none';
    l.imageSmoothingEnabled = false;
    l.fillStyle = fond; l.fillRect(0, 0, LW, LH);
    textes = []; effet = {};
    return l;
  }

  // fond plein écran (image 336×192 nettoyée : on prend le centre 320×180)
  function fond(im, dx = 0, dy = 0) {
    const ox = Math.max(0, (im.width - LW) / 2) | 0, oy = Math.max(0, (im.height - LH) / 2) | 0;
    l.drawImage(im, ox + dx, oy + dy, LW, LH, 0, 0, LW, LH);
  }

  // sprite : (x, y) en coordonnées du jeu (960×540) ; ax/ay = point d'ancrage (0.5 = centre)
  function spr(im, x, y, o = {}) {
    if (!pret(im)) return;
    const { ax = 0.5, ay = 0.5, flip = false, rot = 0, sx = 1, sy = 1, alpha = 1, low: enBas = false, filtre = null } = o;
    const X = enBas ? x : x / K, Y = enBas ? y : y / K;
    const w = im.width, h = im.height;
    l.save();
    l.globalAlpha *= alpha;
    if (filtre) l.filter = filtre; // ex. 'hue-rotate(120deg)' : même sprite, autre couleur
    if (!rot && sx === 1 && sy === 1 && !flip) { l.drawImage(im, Math.round(X - w * ax), Math.round(Y - h * ay)); l.restore(); return; }
    l.translate(Math.round(X), Math.round(Y));
    if (rot) l.rotate(rot);
    l.scale((flip ? -1 : 1) * sx, sy);
    l.drawImage(im, -Math.round(w * ax), -Math.round(h * ay));
    l.restore();
  }

  const px = (x, y, c) => { l.fillStyle = c; l.fillRect(Math.round(x), Math.round(y), 1, 1); };
  const rect = (x, y, w, h, c) => { l.fillStyle = c; l.fillRect(Math.round(x / K), Math.round(y / K), Math.max(1, Math.round(w / K)), Math.max(1, Math.round(h / K))); };
  // disque plein en gros pixels (x, y, r en coordonnées du jeu)
  function disque(x, y, r, c) {
    const X = x / K, Y = y / K, R = r / K;
    l.fillStyle = c;
    for (let j = -Math.ceil(R); j <= Math.ceil(R); j++) {
      const w = Math.floor(Math.sqrt(Math.max(0, R * R - j * j)));
      if (R * R - j * j >= 0) l.fillRect(Math.round(X - w), Math.round(Y + j), w * 2 + 1, 1);
    }
  }
  // cercle (contour) en gros pixels, épaisseur ep (en gros pixels)
  function cercle(x, y, r, c, ep = 1) {
    const X = x / K, Y = y / K, R = r / K;
    l.fillStyle = c;
    for (let j = -Math.ceil(R); j <= Math.ceil(R); j++) for (let i = -Math.ceil(R); i <= Math.ceil(R); i++) {
      const d = Math.sqrt(i * i + j * j);
      if (d <= R && d > R - ep) l.fillRect(Math.round(X + i), Math.round(Y + j), 1, 1);
    }
  }
  // planche / poutre en bois (x, y, w, h en coordonnées du jeu) : dessus clair, dessous sombre, veinage
  function bois(x, y, w, h, teintes = ['#4d2a35', '#7a3f3a', '#a65f46', '#cc8a5a']) {
    const X = Math.round(x / K), Y = Math.round(y / K), Wd = Math.max(1, Math.round(w / K)), Hd = Math.max(2, Math.round(h / K));
    l.fillStyle = teintes[2]; l.fillRect(X, Y, Wd, Hd);
    l.fillStyle = teintes[3]; l.fillRect(X, Y, Wd, 1);
    l.fillStyle = teintes[0]; l.fillRect(X, Y + Hd - 1, Wd, 1);
    l.fillStyle = teintes[1];
    for (let i = 0; i < Wd; i += 7) if (Hd > 3) l.fillRect(X + i + ((i * 13) % 5), Y + 1 + ((i * 7) % (Hd - 2)), 3, 1);
  }
  // couleurs : mélange de deux teintes '#rrggbb'
  const hex = (c) => [1, 3, 5].map(i => parseInt(c.slice(i, i + 2), 16));
  const mix = (a, b, k) => { const A = hex(a), B = hex(b); return '#' + A.map((v, i) => Math.round(v + (B[i] - v) * k).toString(16).padStart(2, '0')).join(''); };
  // boule ombrée en pixel art (lumière en haut à droite, ombre violette, contour coloré)
  const BAY = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
  function boule(x, y, r, c) {
    const X = x / K, Y = y / K, R = r / K;
    const t = [mix(c, '#1a0f2a', 0.65), mix(c, '#3b2266', 0.45), c, mix(c, '#fff2c8', 0.4), '#fffbea'];
    for (let j = -Math.ceil(R); j <= Math.ceil(R); j++) for (let i = -Math.ceil(R); i <= Math.ceil(R); i++) {
      const nx = i / R, ny = j / R, d = nx * nx + ny * ny;
      if (d > 1) continue;
      const nz = Math.sqrt(1 - d);
      let v = (nx * 0.5 - ny * 0.55 + nz * 0.67 + 0.25) / 1.25 * 3.2 + (BAY[((Math.round(Y + j) & 3) << 2) | (Math.round(X + i) & 3)] / 16 - 0.5) * 0.6;
      let k = d > (1 - 1.6 / R) ? 0 : v < 0.9 ? 1 : v < 2.2 ? 2 : v < 3.0 ? 3 : 4;
      if (k === 4 && (nx < 0.15 || ny > -0.15)) k = 3;
      px(X + i, Y + j, t[k]);
    }
  }
  // fenêtre d'ordinateur rétro (barre de titre colorée, bouton de fermeture)
  function fenetre(x, y, w, h, coul) {
    const X = Math.round(x / K), Y = Math.round(y / K), Wd = Math.round(w / K), Hd = Math.round(h / K);
    l.fillStyle = '#1a1222'; l.fillRect(X - 1, Y - 1, Wd + 2, Hd + 2);
    l.fillStyle = '#f2eee8'; l.fillRect(X, Y, Wd, Hd);
    l.fillStyle = '#c9c2d6'; l.fillRect(X, Y + Hd - 1, Wd, 1); l.fillRect(X + Wd - 1, Y, 1, Hd);
    l.fillStyle = coul; l.fillRect(X, Y, Wd, 12);
    l.fillStyle = mix(coul, '#ffffff', 0.35); l.fillRect(X, Y, Wd, 1);
    l.fillStyle = mix(coul, '#1a0f2a', 0.35); l.fillRect(X, Y + 11, Wd, 1);
    const bx = X + Wd - 12;
    l.fillStyle = '#1a1222'; l.fillRect(bx - 1, Y + 1, 11, 10);
    l.fillStyle = '#e83b3b'; l.fillRect(bx, Y + 2, 9, 8);
    l.fillStyle = '#ff8a7a'; l.fillRect(bx, Y + 2, 9, 1);
    l.fillStyle = '#fff';
    for (let k = 0; k < 5; k++) { l.fillRect(bx + 2 + k, Y + 4 + k, 1, 1); l.fillRect(bx + 6 - k, Y + 4 + k, 1, 1); }
  }
  // bouton en relief (x, y = centre, en coordonnées du jeu)
  function bouton(x, y, w, h, label, coul = '#f2eee8', taille = 40, coulTexte = '#1a1222') {
    const X = Math.round((x - w / 2) / K), Y = Math.round((y - h / 2) / K), Wd = Math.round(w / K), Hd = Math.round(h / K);
    l.fillStyle = '#1a1222'; l.fillRect(X - 1, Y - 1, Wd + 2, Hd + 3);
    l.fillStyle = mix(coul, '#2e1a47', 0.45); l.fillRect(X, Y + 2, Wd, Hd);
    l.fillStyle = coul; l.fillRect(X, Y, Wd, Hd - 1);
    l.fillStyle = mix(coul, '#ffffff', 0.5); l.fillRect(X + 1, Y, Wd - 2, 1); l.fillRect(X, Y + 1, 1, Hd - 3);
    if (label !== '' && label != null) texte(label, x, y - 2, taille, coulTexte, null);
  }
  // forme vectorielle (chemin dessiné par trace(ctx), en coordonnées du jeu) rendue en vrais pixels :
  // bord net, contour coloré sombre, liseré clair en haut à gauche
  let fc, fx;
  function forme(trace, coul, epaisseur = 0) { // epaisseur > 0 : trait épais au lieu d'une forme pleine
    if (!fc) { fc = document.createElement('canvas'); fc.width = LW; fc.height = LH; fx = fc.getContext('2d', { willReadFrequently: true }); }
    fx.setTransform(1, 0, 0, 1, 0, 0); fx.clearRect(0, 0, LW, LH);
    fx.setTransform(1 / K, 0, 0, 1 / K, 0, 0);
    fx.fillStyle = fx.strokeStyle = '#fff'; fx.beginPath(); trace(fx);
    if (epaisseur) { fx.lineWidth = epaisseur; fx.lineCap = fx.lineJoin = 'round'; fx.stroke(); } else fx.fill();
    const im = fx.getImageData(0, 0, LW, LH), d = im.data, plein = (x, y) => x >= 0 && y >= 0 && x < LW && y < LH && d[(y * LW + x) * 4 + 3] >= 128;
    const fonce = mix(coul, '#1a0f2a', 0.6), clair = mix(coul, '#fff4d0', 0.45);
    let x0 = LW, y0 = LH, x1 = 0, y1 = 0;
    for (let y = 0; y < LH; y++) for (let x = 0; x < LW; x++) if (d[(y * LW + x) * 4 + 3] >= 128) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      if (!plein(x, y)) continue;
      const bord = !plein(x - 1, y) || !plein(x + 1, y) || !plein(x, y - 1) || !plein(x, y + 1);
      l.fillStyle = bord ? fonce : (!plein(x, y - 2) || !plein(x - 2, y)) ? clair : coul;
      l.fillRect(x, y, 1, 1);
    }
  }
  // ---- variantes d'images (gardées en cache) ----
  const variantes = {};
  const toile = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
  const teinteDe = (r, g, b) => {
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn;
    let h = 0;
    if (d) h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
    return [(h * 60 + 360) % 360, mx ? d / mx : 0, (0.3 * r + 0.59 * g + 0.11 * b) / 255];
  };
  // recolore les pixels d'une teinte : regles = [[teinte source (degrés), tolérance, '#nouvelle couleur'], ...]
  function recolore(im, regles, cle) {
    const k = (im.src || im.cle || '') + cle;
    if (variantes[k]) return variantes[k];
    if (!pret(im)) return im;
    const c = toile(im.width, im.height), x = c.getContext('2d');
    x.drawImage(im, 0, 0);
    const d = x.getImageData(0, 0, c.width, c.height), p = d.data;
    const rampes = regles.map(([h, tol, coul]) => [h, tol, hex(mix(coul, '#1a0f2a', 0.62)), hex(coul), hex(mix(coul, '#fff4d0', 0.5))]);
    for (let i = 0; i < p.length; i += 4) {
      if (p[i + 3] < 10) continue;
      const [h, sat, lum] = teinteDe(p[i], p[i + 1], p[i + 2]);
      if (sat < 0.22) continue;
      for (const [h0, tol, f, m, cl] of rampes) {
        const dh = Math.min(Math.abs(h - h0), 360 - Math.abs(h - h0));
        if (dh > tol) continue;
        const t = Math.min(1, lum * 1.6), [A, B, q] = t < 0.5 ? [f, m, t / 0.5] : [m, cl, (t - 0.5) / 0.5];
        for (let j = 0; j < 3; j++) p[i + j] = Math.round(A[j] + (B[j] - A[j]) * q);
        break;
      }
    }
    x.putImageData(d, 0, 0);
    c.cle = k; return (variantes[k] = c);
  }
  // réduction nette (plus proche voisin) : pour une version plus petite d'un sprite
  function reduit(im, f) {
    const k = (im.src || im.cle || '') + '@' + f;
    if (variantes[k]) return variantes[k];
    if (!pret(im)) return im;
    const c = toile(Math.max(1, Math.round(im.width * f)), Math.max(1, Math.round(im.height * f))), x = c.getContext('2d');
    x.imageSmoothingEnabled = false;
    x.drawImage(im, 0, 0, c.width, c.height);
    c.cle = k; return (variantes[k] = c);
  }
  // motif (rayures / pois) peint sur les pixels d'une image, en gardant ses ombres
  function motif(im, coul, sorte, cle) {
    const k = (im.src || im.cle || '') + '#' + cle;
    if (variantes[k]) return variantes[k];
    if (!pret(im)) return im;
    const base = recolore(im, [[0, 180, coul]], 'tout' + coul);
    const c = toile(im.width, im.height), x = c.getContext('2d');
    x.drawImage(im, 0, 0);
    const d = x.getImageData(0, 0, c.width, c.height), p = d.data, cc = hex(coul), fo = hex(mix(coul, '#1a0f2a', 0.5)), cl = hex(mix(coul, '#ffffff', 0.7));
    for (let y = 0; y < c.height; y++) for (let xx = 0; xx < c.width; xx++) {
      const i = (y * c.width + xx) * 4;
      if (p[i + 3] < 10) continue;
      const lum = (0.3 * p[i] + 0.59 * p[i + 1] + 0.11 * p[i + 2]) / 255;
      let col = lum < 0.35 ? fo : cc;
      if (lum >= 0.35 && sorte === 'rayures' && (y >> 1) % 3 === 0) col = cl;
      if (lum >= 0.35 && sorte === 'pois' && (xx % 5 === 2) && (y % 5 === 2)) col = cl;
      if (lum > 0.85 && sorte === 'uni') col = hex(mix(coul, '#ffffff', 0.35));
      p[i] = col[0]; p[i + 1] = col[1]; p[i + 2] = col[2];
    }
    x.putImageData(d, 0, 0);
    void base;
    c.cle = k; return (variantes[k] = c);
  }
  // silhouette d'une couleur (pour un contour de sélection)
  function silhouette(im, coul) {
    const k = (im.src || im.cle || '') + '!' + coul;
    if (variantes[k]) return variantes[k];
    if (!pret(im)) return im;
    const c = toile(im.width, im.height), x = c.getContext('2d');
    x.drawImage(im, 0, 0); x.globalCompositeOperation = 'source-in'; x.fillStyle = coul; x.fillRect(0, 0, c.width, c.height);
    c.cle = k; return (variantes[k] = c);
  }
  // sprite entouré d'un contour coloré (objet sélectionné)
  function sprContour(im, x, y, coul, o = {}) {
    const sil = silhouette(im, coul);
    for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1], [-1, -1], [1, 1], [1, -1], [-1, 1]]) spr(sil, x + dx * K, y + dy * K, o);
    spr(im, x, y, o);
  }
  // ombre tramée au sol
  function ombre(x, y, rx, ry, a = 0.35) {
    const X = x / K, Y = y / K, RX = rx / K, RY = ry / K;
    for (let j = -Math.ceil(RY); j <= Math.ceil(RY); j++) for (let i = -Math.ceil(RX); i <= Math.ceil(RX); i++)
      if ((i * i) / (RX * RX) + (j * j) / (RY * RY) < 1 && ((i + j) & 1) === 0) px(X + i, Y + j, `rgba(30,12,40,${a})`);
  }
  // trait en gros pixels (Bresenham)
  function trait(x0, y0, x1, y1, c) {
    x0 = Math.round(x0 / K); y0 = Math.round(y0 / K); x1 = Math.round(x1 / K); y1 = Math.round(y1 / K);
    const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
    let e = dx + dy;
    l.fillStyle = c;
    for (let n = 0; n < 2000; n++) {
      l.fillRect(x0, y0, 1, 1);
      if (x0 === x1 && y0 === y1) break;
      const e2 = 2 * e;
      if (e2 >= dy) { e += dy; x0 += sx; }
      if (e2 <= dx) { e += dx; y0 += sy; }
    }
  }

  // texte : dessiné APRÈS l'agrandissement, en police pixel, net (coordonnées du jeu)
  function texte(str, x, y, taille = 32, coul = '#fff', contour = '#1a1222', align = 'center') {
    textes.push({ str: String(str), x, y, taille, coul, contour, align });
  }
  const secousse = (force) => { effet.secousse = force; };
  const flash = (a, c = '255,255,230') => { effet.flash = [a, c]; };

  // termine l'image : agrandit, ajoute la lumière douce, les textes et les effets
  function fin(g, { lumiere = true } = {}) {
    const sh = effet.secousse ? Math.round((Math.random() * 2 - 1) * effet.secousse) * K : 0;
    g.save();
    g.imageSmoothingEnabled = false;
    g.drawImage(low, sh, 0, W, H);
    if (lumiere) {
      g.globalCompositeOperation = 'multiply';
      const v = cacheLumiere(g);
      g.drawImage(v.mul, 0, 0);
      g.globalCompositeOperation = 'lighter';
      g.drawImage(v.add, 0, 0);
      g.globalCompositeOperation = 'source-over';
    }
    if (effet.flash) { g.fillStyle = `rgba(${effet.flash[1]},${effet.flash[0]})`; g.fillRect(0, 0, W, H); }
    for (const t of textes) {
      g.font = `700 ${t.taille}px ${FONT_PIX}`;
      g.textAlign = t.align; g.textBaseline = 'middle'; g.lineJoin = 'round';
      if (t.contour) { g.lineWidth = Math.max(4, t.taille / 5); g.strokeStyle = t.contour; g.strokeText(t.str, t.x, t.y); }
      g.fillStyle = t.coul; g.fillText(t.str, t.x, t.y);
    }
    g.restore();
  }
  let lum = null;
  function cacheLumiere() {
    if (lum) return lum;
    const mk = () => { const c = document.createElement('canvas'); c.width = W; c.height = H; return c; };
    const mul = mk(), add = mk();
    let x = mul.getContext('2d');
    const v = x.createRadialGradient(W / 2, H * 0.35, 220, W / 2, H * 0.4, 720);
    v.addColorStop(0, '#ffffff'); v.addColorStop(1, '#dccde8');
    x.fillStyle = v; x.fillRect(0, 0, W, H);
    x = add.getContext('2d');
    const a = x.createRadialGradient(W * 0.72, H * 0.18, 10, W * 0.72, H * 0.18, 400);
    a.addColorStop(0, 'rgba(255,222,165,0.12)'); a.addColorStop(1, 'rgba(255,222,165,0)');
    x.fillStyle = a; x.fillRect(0, 0, W, H);
    lum = { mul, add };
    return lum;
  }

  return { K, LW, LH, images, pret, debut, fond, spr, px, rect, disque, cercle, bois, boule, fenetre, bouton, forme, mix, recolore, reduit, motif, silhouette, sprContour, ombre, trait, texte, secousse, flash, fin, get l() { return l; } };
})();
