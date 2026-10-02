// SOURIS : « Écrase la mouche », STYLE 5 = PIXEL ART HD (inspiré d'Owlboy et d'Eastward).
// - Owlboy : "pixel art moderne", plus de pixels (480×270, agrandi ×2), pas de dégradé ni de flou
//   dans les dessins, une gamme de couleurs par matière avec glissement de teinte (ombres vers le
//   violet, lumières vers le jaune), pas de contour noir.
// - Eastward : pixel art + éclairage "3D" lisse posé par-dessus (ombres violettes, halo chaud de la
//   fenêtre, rayons), décor chargé et vivant.
// C'est le rendu officiel du jeu : il remplace le dessin de souris/mouche.js.
(() => {
  const A = Engine.games.find(g => g.id === 'mouche'); // même gameplay que le style 1
  const LW = 480, LH = 270, K = 2, T = 200; // T : haut de la table (pixels basse résolution)

  // gammes de couleurs (du plus sombre au plus clair), teinte qui glisse
  const R = {
    wall: ['#5b3f57', '#8a5f6a', '#b98a7f', '#dfb895', '#f2d9b0', '#fff0cf'],
    wood: ['#2b1a2c', '#4d2a35', '#7a3f3a', '#a65f46', '#cc8a5a', '#ebb878'],
    curtain: ['#3a1730', '#6a2342', '#a3324f', '#d55a62', '#f08f80', '#ffc6a8'],
    green: ['#18283a', '#1f4d3f', '#2e7745', '#58a34e', '#98cf6a', '#d6f08f'],
    farGreen: ['#3c5b74', '#4f7d82', '#6fa08d', '#9cc49c'],
    sky: ['#4a74b8', '#5f97d6', '#86c3ea', '#bfe5f6', '#eef9fb'],
    glass: ['#3b4a68', '#6c8aa6', '#a8c6d6', '#def0f5'],
    metal: ['#2c2838', '#57526a', '#8c88a0', '#c6c4d3', '#f3f2f8'],
    cream: ['#7d7193', '#ab9fbd', '#d8d0e6', '#f3eef8', '#ffffff'],
    tile: ['#8f8097', '#bdb0c2', '#e0d6dc', '#f4eee9', '#ffffff'],
    jam: ['#2e0a1c', '#5c1029', '#93183a', '#c8294a', '#f0607a'],
    honey: ['#5a2412', '#9c4a14', '#d9801f', '#f7b437', '#ffe27a'],
    sponge: ['#6e3f2c', '#a8703e', '#d6a05e', '#efcb88', '#fff0c2'],
    icing: ['#6e2850', '#b04377', '#e273a2', '#ffb0cb', '#ffe0ec'],
    red: ['#3b0716', '#7a0f22', '#c0263b', '#ef5a5f', '#ffb3a8'],
    blue: ['#1a2046', '#2b3c7c', '#3f62b6', '#6f97e4', '#b9d5ff'],
    tea: ['#2a1309', '#552812', '#8a4a1f', '#c27f43'],
    terra: ['#4a1f24', '#7a3329', '#b0503a', '#d9784e', '#f2a87a'],
    gold: ['#5a3412', '#a06a1c', '#e0a838', '#ffe28a'],
    body: ['#0d0a12', '#1d1826', '#332c3d', '#4f465b', '#6e6380'],
    eye: ['#3a0712', '#7a0f1f', '#c4243a', '#ff6b6b', '#ffd6cc'],
    goo: ['#1d3a14', '#3a6a1d', '#6aa12a', '#a6d63b', '#e4f88c'],
  };
  const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map(v => v / 16 - 0.47);
  const bay = (x, y) => BAYER[((y & 3) << 2) | (x & 3)];
  const LIGHT = (() => { const v = [0.55, -0.55, 0.63], n = Math.hypot(...v); return v.map(c => c / n); })(); // lumière : la fenêtre, en haut à droite

  const px = (l, x, y, c) => { l.fillStyle = c; l.fillRect(Math.round(x), Math.round(y), 1, 1); };
  const rect = (l, x, y, w, h, c) => { l.fillStyle = c; l.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); };
  const ramp = (r, v) => r[Math.max(0, Math.min(r.length - 1, Math.floor(v)))];

  // ellipse ombrée pixel par pixel (volume éclairé par la fenêtre, bord assombri au lieu d'un contour)
  function shade(l, cx, cy, rx, ry, r, bias = 0) {
    for (let y = -Math.ceil(ry); y <= Math.ceil(ry); y++) for (let x = -Math.ceil(rx); x <= Math.ceil(rx); x++) {
      const nx = x / (rx + 0.5), ny = y / (ry + 0.5), d = nx * nx + ny * ny;
      if (d > 1) continue;
      const nz = Math.sqrt(1 - d);
      let v = (nx * LIGHT[0] + ny * LIGHT[1] + nz * LIGHT[2] + 0.35) / 1.35;
      let idx = v * (r.length - 0.01) + bay(x + cx, y + cy) * 0.9 + bias;
      if (d > 0.82) idx -= 1; // bord : une teinte plus sombre (contour "coloré")
      px(l, cx + x, cy + y, ramp(r, idx));
    }
  }
  // plage horizontale tramée entre deux teintes (dégradé façon pixel art)
  function dband(l, x, y, w, h, r, from, to) {
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
      const v = from + (to - from) * (j / Math.max(1, h - 1)) + bay(x + i, y + j);
      px(l, x + i, y + j, ramp(r, v));
    }
  }
  const canvas = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };

  // police pixel 5×7 pour "SPLAT!"
  const FONT5 = {
    S: ['01111', '10000', '10000', '01110', '00001', '00001', '11110'], P: ['11110', '10001', '10001', '11110', '10000', '10000', '10000'],
    L: ['10000', '10000', '10000', '10000', '10000', '10000', '11111'], A: ['01110', '10001', '10001', '11111', '10001', '10001', '10001'],
    T: ['11111', '00100', '00100', '00100', '00100', '00100', '00100'], '!': ['1', '1', '1', '1', '1', '0', '1'],
  };

  const baseUpdate = A.update;
  A.baseUpdate = baseUpdate; // le gameplay seul (réutilisé par l'essai moucheia.js)
  Object.assign(A, { // remplace le dessin du jeu « Écrase la mouche » (le gameplay ne change pas)
    pixel: false, // déjà dessiné en pixel art à la main : pas de filtre pixel par-dessus
    _bg: null,
    WX: 325, WY: 23, WW: 110, WH: 100,

    // ---------- décor fixe (calculé une fois) ----------
    background() {
      if (this._bg) return this._bg;
      const cv = canvas(LW, LH), l = cv.getContext('2d');
      const { WX, WY, WW, WH } = this;
      // papier peint rayé + petites fleurs, plafond dans l'ombre
      for (let y = 0; y < 140; y++) for (let x = 0; x < LW; x++) {
        const stripe = (x >> 3) % 2 ? 4 : 3.6;
        const shadeTop = y < 16 ? (16 - y) / 16 * 1 : 0;
        px(l, x, y, ramp(R.wall, stripe - shadeTop + bay(x, y) * 0.6));
      }
      for (let y = 30, row = 0; y < 132; y += 18, row++) for (let x = row % 2 ? 4 : 12; x < LW; x += 16) {
        px(l, x, y - 1, R.icing[3]); px(l, x - 1, y, R.icing[2]); px(l, x + 1, y, R.icing[2]); px(l, x, y + 1, R.icing[2]); px(l, x, y, R.gold[3]);
      }
      // moulure + crédence en carrelage
      rect(l, 0, 138, LW, 1, R.wood[4]); rect(l, 0, 139, LW, 2, R.wood[3]); rect(l, 0, 141, LW, 1, R.wood[1]);
      for (let ty = 142, row = 0; ty < T; ty += 11, row++) for (let tx = row % 2 ? -8 : 0; tx < LW; tx += 16) {
        const v = 3 + (((tx * 7 + ty * 13) % 5) - 2) * 0.12;
        for (let y = 0; y < 10; y++) for (let x = 0; x < 15; x++) px(l, tx + x, ty + y, ramp(R.tile, v - (y > 7 ? 0.8 : 0) + bay(tx + x, ty + y) * 0.4));
        px(l, tx + 1, ty + 1, R.tile[4]); px(l, tx + 2, ty + 1, R.tile[4]); px(l, tx + 1, ty + 2, R.tile[4]);
      }
      for (let ty = 141; ty < T; ty += 11) rect(l, 0, ty, LW, 1, R.tile[1]);
      for (let ty = 142, row = 0; ty < T; ty += 11, row++) for (let tx = row % 2 ? 7 : 15; tx < LW; tx += 16) rect(l, tx, ty, 1, 10, R.tile[1]);
      dband(l, 0, T - 6, LW, 6, R.wall, 3.2, 2); // ombre au contact de la table

      // fenêtre : ciel, nuages, collines (lointaines bleutées, proches vertes)
      dband(l, WX, WY, WW, WH, R.sky, 0.6, 4.4);
      const cloud = (cx, cy, w) => { for (const [dx, dy, r] of [[0, 0, w * 0.35], [w * 0.3, 2, w * 0.3], [-w * 0.3, 3, w * 0.25]]) shade(l, Math.round(cx + dx), Math.round(cy + dy), r, r * 0.55, R.cream, 1.3); };
      cloud(WX + 30, WY + 22, 26); cloud(WX + 80, WY + 34, 20);
      for (let x = WX; x < WX + WW; x++) {
        const h1 = WY + 70 + Math.round(Math.sin(x / 13) * 4 + Math.sin(x / 5) * 1.5), h2 = WY + 80 + Math.round(Math.sin(x / 19 + 2) * 5);
        for (let y = h1; y < WY + WH; y++) px(l, x, y, ramp(R.farGreen, 2.5 - (y - h1) / 10 + bay(x, y)));
        for (let y = h2; y < WY + WH; y++) px(l, x, y, ramp(R.green, 3.6 - (y - h2) / 8 + bay(x, y)));
      }
      for (const tx of [WX + 18, WX + 72, WX + 94]) { rect(l, tx, WY + 72, 2, 8, R.wood[1]); shade(l, tx + 1, WY + 68, 5, 6, R.green, 0.3); }
      for (let i = 0; i < 26; i++) { const x = WX + 6 + (i * 19) % (WW - 12), y = WY + 6 + (i * 31) % (WH - 30); if ((x + y) % 3 === 0) px(l, x - y * 0.5 + 40, y, 'rgba(255,255,255,0.35)'); } // reflets sur la vitre
      // cadre en bois avec biseau (clair en haut à gauche, sombre en bas à droite)
      const frame = (x, y, w, h) => { rect(l, x, y, w, h, R.wood[3]); rect(l, x, y, w, 1, R.wood[5]); rect(l, x, y, 1, h, R.wood[4]); rect(l, x, y + h - 1, w, 1, R.wood[1]); rect(l, x + w - 1, y, 1, h, R.wood[2]); };
      frame(WX - 6, WY - 6, WW + 12, 6); frame(WX - 6, WY + WH, WW + 12, 6); frame(WX - 6, WY - 6, 6, WH + 12); frame(WX + WW, WY - 6, 6, WH + 12);
      frame(WX + WW / 2 - 2, WY, 4, WH); frame(WX, WY + WH / 2 - 2, WW, 4);
      frame(WX - 12, WY + WH + 5, WW + 24, 5); dband(l, WX - 10, WY + WH + 10, WW + 20, 3, R.wall, 1.5, 2.8);
      // petit cactus sur le rebord
      rect(l, WX + 82, WY + WH - 2, 10, 7, R.terra[2]); rect(l, WX + 82, WY + WH - 2, 10, 1, R.terra[4]); rect(l, WX + 82, WY + WH + 4, 10, 1, R.terra[0]);
      shade(l, WX + 87, WY + WH - 9, 3, 7, R.green, 0.4); shade(l, WX + 84, WY + WH - 10, 1.6, 3, R.green, 0.4);

      // horloge murale (aiguilles dessinées à chaque image)
      shade(l, 240, 52, 19, 19, R.wood, 0.2); shade(l, 240, 52, 15, 15, R.cream, 1.4);
      for (let i = 0; i < 12; i++) { const a = i * Math.PI / 6; px(l, 240 + Math.cos(a) * 12, 52 + Math.sin(a) * 12, R.metal[1]); }

      // étagère + bocaux + pot (plante dessinée à chaque image)
      for (let x = 28; x < 175; x++) for (let y = 72; y < 79; y++) px(l, x, y, ramp(R.wood, (y === 72 ? 5 : y === 78 ? 1 : 3.2) + ((x * 7) % 11 === 0 ? -1 : 0) + bay(x, y) * 0.3));
      dband(l, 30, 79, 143, 5, R.wall, 1.4, 3.2);
      for (const bx of [40, 156]) { rect(l, bx, 79, 2, 12, R.metal[2]); for (let i = 0; i < 9; i++) px(l, bx + 2 + i, 88 - i, R.metal[1]); }
      const jar = (x, h, content, label) => {
        const y = 72 - h;
        for (let j = 5; j < h; j++) for (let i = 0; i < 26; i++) {
          const edge = i === 0 || i === 25 || j === h - 1;
          px(l, x + i, y + j, edge ? R.glass[1] : 'rgba(0,0,0,0)');
        }
        content(x + 1, y + 7, 24, h - 8);
        for (let j = 7; j < h - 2; j++) { px(l, x + 3, y + j, 'rgba(255,255,255,0.75)'); if (j % 3) px(l, x + 22, y + j, 'rgba(255,255,255,0.35)'); }
        for (let i = 0; i < 24; i++) for (let j = 0; j < 5; j++) px(l, x + 1 + i, y + j, ramp(R.metal, 3.3 - j * 0.5 + (i % 3 === 0 ? -0.8 : 0)));
        rect(l, x + 5, y + Math.round(h / 2), 16, 7, R.cream[3]); rect(l, x + 5, y + Math.round(h / 2) + 6, 16, 1, R.cream[1]);
        for (let i = 0; i < label; i++) px(l, x + 7 + i * 2, y + Math.round(h / 2) + 3, R.wood[1]);
      };
      jar(48, 29, (x, y, w, h) => { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) px(l, x + i, y + j, ramp(R.jam, 3 - j / h * 2 + (i < 3 ? 1 : 0) + bay(x + i, y + j) * 0.5)); }, 5);
      jar(84, 33, (x, y, w, h) => { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) px(l, x + i, y + j, ramp(R.honey, 3.6 - j / h * 2 + bay(x + i, y + j) * 0.5)); }, 3);
      jar(120, 27, (x, y, w, h) => { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) px(l, x + i, y + j, R.cream[2]); for (const [cx, cy] of [[5, 5], [13, 5], [20, 6], [9, 12], [17, 13]]) shade(l, x + cx, y + cy, 4, 3.4, R.sponge, 0.2); }, 6);
      for (let j = 0; j < 14; j++) for (let i = 0; i < 18 - Math.floor(j / 5); i++) px(l, 150 + i + Math.floor(j / 10), 58 + j, ramp(R.terra, (j < 2 ? 4 : 2.5) + (i < 3 ? 1 : 0) + bay(i, j) * 0.5));

      // table : planches, veinage, reflet de la fenêtre, chant plus sombre
      for (let y = T; y < LH; y++) for (let x = 0; x < LW; x++) {
        const top = y < T + 23;
        let v = top ? 3.5 - (y - T) / 23 * 0.7 : 2.3 - (y - T - 23) / 60;
        v += Math.sin((x + Math.sin(y * 0.7) * 6) * 0.08 + y * 1.3) * 0.25;
        if (top && (x % 118 === 0)) v -= 1.5;
        if (y === T) v = 5; if (y === T + 23) v = 4.2;
        px(l, x, y, ramp(R.wood, v + bay(x, y) * 0.5));
      }
      for (let y = T + 2; y < T + 20; y++) for (let x = 250 + (y - T) * 3; x < 360 + (y - T) * 3; x += 2) px(l, x + (y % 2), y, 'rgba(255,240,200,0.18)');

      // assiette + part de gâteau
      for (let x = -52; x <= 52; x++) for (let y = -9; y <= 9; y++) { const d = (x * x) / 2809 + (y * y) / 100; if (d < 1) px(l, 110 + x + 3, 209 + y + 3, 'rgba(60,20,40,0.35)'); }
      shade(l, 110, 207, 52, 9, R.cream, 0.6); shade(l, 110, 206, 36, 5, R.cream, 0.1);
      const cx = 86, cb = 205;
      for (let i = 0; i < 54; i++) {
        const top = Math.round(cb - 25 - (i / 54) * 6);
        for (let y = top; y < cb; y++) {
          let c = ramp(R.sponge, 3 - (i > 50 ? 1 : 0) + bay(cx + i, y) * 0.8);
          if ((i * 13 + y * 7) % 17 === 0) c = R.sponge[1];
          const h = cb - y;
          if (h >= 13 && h < 16) c = ramp(R.cream, 3.4 + bay(i, y) * 0.5);
          if (h >= 7 && h < 9) c = ramp(R.jam, 2.6 + bay(i, y));
          px(l, cx + i, y, c);
        }
        for (let k = 0; k < 4; k++) px(l, cx + i, top - 3 + k, ramp(R.icing, 3.6 - k * 0.5 + bay(i, k)));
        if (i % 7 === 2) { px(l, cx + i, top + 1, R.icing[2]); px(l, cx + i, top + 2, R.icing[1]); }
      }
      shade(l, cx + 36, cb - 36, 6, 6, R.red, 0.3);
      for (const [dx, dy] of [[-2, -2], [2, -1], [0, 2], [3, 2], [-3, 1]]) px(l, cx + 36 + dx, cb - 36 + dy, R.honey[4]);
      for (let i = -4; i <= 4; i++) px(l, cx + 36 + i, cb - 42 - Math.abs(i) / 2, R.green[3]);
      for (const [x, y] of [[70, 210], [74, 212], [146, 211], [150, 209], [143, 213]]) { px(l, x, y, R.sponge[3]); px(l, x + 1, y, R.sponge[2]); }

      // tasse + soucoupe + cuillère
      shade(l, 395, 208, 24, 4.5, R.cream, 0.5);
      for (let y = 182; y < 206; y++) for (let x = 381; x < 410; x++) {
        const t = (x - 381) / 29, v = 1 + Math.sin(t * Math.PI) * 2.6 + (t > 0.55 && t < 0.7 ? 1 : 0) - (y > 202 ? 0.8 : 0);
        px(l, x, y, ramp(R.blue, v + bay(x, y) * 0.6));
      }
      shade(l, 395, 182, 14.5, 3, R.blue, 1); shade(l, 395, 182, 12.5, 2.2, R.tea, 0.4); px(l, 400, 181, R.tea[3]); px(l, 401, 181, R.tea[3]);
      for (let a = -1.4; a <= 1.4; a += 0.12) px(l, 410 + Math.cos(a) * 6, 193 + Math.sin(a) * 6, R.blue[2]);
      for (let i = 0; i < 16; i++) px(l, 370 + i, 210 - Math.floor(i / 4), ramp(R.metal, 3.5 - (i % 3) * 0.5));
      this._bg = cv;
      return cv;
    },

    // ---------- éléments animés du décor ----------
    drawLiving(l, t) {
      const { WX, WY, WW, WH } = this;
      // rideaux qui ondulent
      for (const side of [-1, 1]) {
        for (let y = WY - 10; y < WY + WH + 16; y++) {
          const k = (y - WY + 10) / (WH + 26);
          const width = Math.round(16 + Math.sin(k * 3.2) * 6 + (y > WY + 62 ? 4 : 0));
          const sway = Math.round(Math.sin(t * 1.4 + k * 4) * 1.2 * k);
          for (let i = 0; i < width; i++) {
            const x = side < 0 ? WX - 4 - i + sway : WX + WW + 4 + i - sway;
            const fold = Math.sin((i + y * 0.08 + t * 0.6) * 1.1) * 1.1;
            const v = 3 + fold - (i === width - 1 ? 1.6 : 0) - (y > WY + WH + 10 ? 0.6 : 0);
            px(l, x, y, ramp(R.curtain, v + bay(x, y) * 0.6));
          }
        }
        const tbx = side < 0 ? WX - 22 : WX + WW + 6;
        for (let i = 0; i < 16; i++) { px(l, tbx + i, WY + 62, R.gold[2]); px(l, tbx + i, WY + 63, R.gold[1]); }
      }
      for (let x = WX - 34; x < WX + WW + 34; x++) { px(l, x, WY - 13, R.metal[3]); px(l, x, WY - 12, R.metal[1]); }
      shade(l, WX - 35, WY - 12, 3, 3, R.gold); shade(l, WX + WW + 35, WY - 12, 3, 3, R.gold);
      // aiguilles de l'horloge
      const hand = (a, len, c) => { for (let r = 0; r < len; r++) px(l, 240 + Math.cos(a) * r, 52 + Math.sin(a) * r, c); };
      hand(-Math.PI / 2 + t * 0.02, 7, R.body[1]); hand(-Math.PI / 2 + 0.9 + t * 0.2, 11, R.body[1]); hand(-Math.PI / 2 + Math.floor(t) * Math.PI / 30, 12, R.red[2]);
      px(l, 240, 52, R.gold[2]);
      // plante (feuilles qui bougent un peu)
      for (const [a, len] of [[-2.3, 13], [-1.9, 17], [-1.4, 15], [-1.1, 18], [-0.7, 13]]) {
        const aa = a + Math.sin(t * 1.8 + len) * 0.05;
        for (let r = 2; r < len; r++) {
          const w = Math.sin((r / len) * Math.PI) * 2.2;
          for (let s = -w; s <= w; s += 1) px(l, 159 + Math.cos(aa) * r - Math.sin(aa) * s, 58 + Math.sin(aa) * r + Math.cos(aa) * s, ramp(R.green, 2.4 + s * 0.5 + r / len));
        }
      }
      // vapeur du thé (petits nuages de pixels qui montent)
      for (let i = 0; i < 5; i++) {
        const p = (t * 0.45 + i / 5) % 1, x = 395 + Math.sin(t * 1.5 + i * 2) * 3 + Math.sin(p * 6 + i) * 2, y = 176 - p * 40;
        l.globalAlpha = (1 - p) * 0.5;
        shade(l, Math.round(x), Math.round(y), 1.5 + p * 3, 1.2 + p * 2.4, R.cream, 1.5);
        l.globalAlpha = 1;
      }
      // poussières dans la lumière
      for (let i = 0; i < 16; i++) {
        const x = 250 + (i * 37 + Math.sin(t * 0.5 + i) * 12) % 120, y = 110 + (i * 23 + t * 6) % 90;
        if ((Math.floor(t * 3) + i) % 4) px(l, x, y, 'rgba(255,248,215,0.9)');
      }
    },

    // ---------- la mouche (sprite dessiné dans une petite image, puis tourné) ----------
    flySprite(t) {
      const S = 1.7, C = 34; // échelle (dessinée nativement, pas étirée)
      const c = this._flyC || (this._flyC = canvas(68, 68)), l = c.getContext('2d');
      l.clearRect(0, 0, 68, 68);
      const X = (x) => C + (x - 22) * S, bob = Math.round(Math.sin(t * 22)), cy = C + bob;
      const Y = (y) => cy + y * S;
      // pattes qui gigotent
      for (const side of [-1, 1]) [[16, 0.9], [20, 1.25], [24, 1.7]].forEach(([lx, a], i) => {
        const ang = side * (a + Math.sin(t * 28 + i * 2 + side) * 0.18);
        for (let r = 0; r < 9 * S; r++) px(l, X(lx) + Math.cos(ang) * r, cy + Math.sin(ang) * r * 1.1, R.body[r > 6 * S ? 2 : 1]);
      });
      // abdomen + reflets métalliques
      shade(l, X(14), cy, 8 * S, 5.5 * S, R.body, 0.4);
      for (const bx of [10, 13, 16]) for (let y = -4 * S; y <= 4 * S; y++) if (Math.abs(y) < (5 - Math.abs(bx - 13) * 0.3) * S) px(l, X(bx), cy + y, R.body[0]);
      for (const [x, y] of [[11, -3], [12, -3], [14, -4], [15, -3], [17, -3]]) { px(l, X(x), Y(y), '#4f8f86'); px(l, X(x) + 1, Y(y), '#3b6f72'); }
      // ailes : 4 positions (battement), translucides avec nervures
      const frame = Math.floor(t * 40) % 4, ang = [2.15, 2.55, 2.9, 2.55][frame];
      for (const side of [-1, 1]) {
        const a = side * ang, M = Math.ceil(12 * S);
        for (let y = -M; y <= M; y++) for (let x = -M; x <= M; x++) {
          const lx = (x * Math.cos(-a) - y * Math.sin(-a)) / S, ly = (x * Math.sin(-a) + y * Math.cos(-a)) / S;
          const ex = (lx - 9) / 10, ey = ly / 3.8, d = ex * ex + ey * ey;
          if (d > 1 || lx < -1) continue;
          const vein = Math.abs(ly) < 0.3 || Math.abs(ly - lx * 0.25 + 1) < 0.25;
          px(l, X(21) + x, cy + y, vein ? 'rgba(70,80,110,0.6)' : d > 0.86 ? 'rgba(140,160,190,0.65)' : `rgba(${215 + (x & 3) * 10},238,255,${frame === 2 ? 0.25 : 0.38})`);
        }
      }
      // thorax rayé, tête, yeux à facettes
      shade(l, X(22), cy, 5 * S, 4.6 * S, R.body, 0.9);
      for (let y = -3; y <= 3; y += 2) for (let x = X(19); x < X(25); x++) if ((x + y) % 2) px(l, x, Y(y), R.body[4]);
      shade(l, X(28), cy, 2.6 * S, 3.8 * S, R.body, 0.5);
      for (const s2 of [-1, 1]) {
        shade(l, X(29), Y(s2 * 3), 2.8 * S, 2.6 * S, R.eye, 0.3);
        for (let k = -2; k <= 2; k += 2) px(l, X(29) + k, Y(s2 * 3) + 1, R.eye[1]); // facettes
        px(l, X(29) - 1, Y(s2 * 3) - 2, R.eye[4]); px(l, X(29), Y(s2 * 3) - 2, '#ffffff');
      }
      return c;
    },

    // ---------- tapette (sprite fixe, ajouré) ----------
    swatterSprite() {
      if (this._swC) return this._swC;
      const c = canvas(48, 72), l = c.getContext('2d');
      for (let i = 0; i < 26; i++) { // fil de fer torsadé
        const x = 22 + i * 0.75, y = 30 + i * 1.3;
        px(l, x, y, ramp(R.metal, 1.5 + (i % 2) * 2)); px(l, x + 1, y, ramp(R.metal, 1 + ((i + 1) % 2) * 2));
      }
      for (let j = 0; j < 12; j++) for (let i = 0; i < 6; i++) px(l, 41 + i - Math.floor(j * 0.1), 62 + j * 0.7, ramp(R.red, (i < 2 ? 1 : 2.3) + (j % 3 === 0 ? -0.6 : 0)));
      for (let y = 0; y < 32; y++) for (let x = 0; x < 30; x++) {
        const corner = (x < 2 || x > 27) && (y < 2 || y > 29);
        if (corner) continue;
        const hole = x > 2 && x < 27 && y > 2 && y < 29 && x % 3 === 1 && y % 3 === 1;
        if (hole) continue;
        const rim = x === 0 || x === 29 || y === 0 || y === 31;
        const v = rim ? 1 : 2.6 + (x / 30) * 0.9 - (y / 32) * 0.6 + (x < 6 && y < 6 ? 1.3 : 0);
        px(l, x, y, ramp(R.red, v + bay(x, y) * 0.4));
      }
      this._swC = c;
      return c;
    },

    // ---------- éclaboussure animée ----------
    initGoo(s) {
      const r = mulberry32(Math.floor(s.x * 13 + s.y * 7));
      const cx = s.x / K, cy = s.y / K;
      s.goo = {
        cx, cy,
        drops: Array.from({ length: 26 }, () => { const a = r() * Math.PI * 2, v = 50 + r() * 130; return { x: cx, y: cy, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 30, t: 0, stick: 0.12 + r() * 0.3, stuck: false, size: r() < 0.35 ? 2 : 1, trail: [] }; }),
        tend: [-11, -6, -1, 4, 9].map((dx) => ({ dx, len: 0, max: 12 + r() * 26, sp: 5 + r() * 9, dropped: false })),
        falling: [], splash: [],
      };
    },

    updateGoo(s, dt) {
      const G = s.goo;
      for (const d of G.drops) {
        d.t += dt;
        if (!d.stuck) {
          d.vy += 320 * dt; d.x += d.vx * dt; d.y += d.vy * dt;
          if (d.y >= T) { d.y = T; d.stuck = true; this.splash(G, d.x, T); }
          else if (d.t > d.stick) d.stuck = true; // collée au mur
        } else if (d.y < T - 1) { // elle glisse lentement en laissant une traînée
          d.y += (4 + d.size * 3) * dt;
          const k = Math.round(d.x) + ',' + Math.round(d.y);
          if (d.trail[d.trail.length - 1] !== k) d.trail.push(k);
          if (d.trail.length > 30) d.trail.shift();
        }
      }
      for (const tn of G.tend) { // filaments qui s'étirent puis lâchent une goutte
        tn.len = Math.min(tn.max, tn.len + tn.sp * dt * (1.2 - tn.len / tn.max * 0.6));
        if (!tn.dropped && tn.len >= tn.max) {
          tn.dropped = true;
          G.falling.push({ x: G.cx + tn.dx, y: G.cy + 10 + tn.len + 2, vy: 0 });
          tn.len *= 0.55; tn.max *= 0.9; tn.sp *= 0.4;
        }
      }
      for (const f of G.falling) { f.vy += 300 * dt; f.y += f.vy * dt; if (f.y >= T && !f.done) { f.done = true; this.splash(G, f.x, T); } }
      for (const p of G.splash) { p.vy += 300 * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt; }
      G.splash = G.splash.filter(p => p.life > 0);
    },

    splash(G, x, y) {
      for (let i = 0; i < 4; i++) G.splash.push({ x, y: y - 1, vx: (i - 1.5) * 22, vy: -40 - (i % 2) * 25, life: 0.45 });
      G.puddles = G.puddles || [];
      G.puddles.push({ x, w: 2 + (G.puddles.length % 3) });
    },

    drawGoo(l, s) {
      const G = s.goo, sp = s.splat;
      for (const pd of G.puddles || []) for (let i = -pd.w; i <= pd.w; i++) { px(l, pd.x + i, T, R.goo[2]); if (Math.abs(i) < pd.w) px(l, pd.x + i, T + 1, R.goo[1]); }
      for (const d of G.drops) for (const k of d.trail) { const [x, y] = k.split(',').map(Number); px(l, x, y, 'rgba(90,150,40,0.55)'); }
      // tache principale, éclairée comme un liquide
      const cx = Math.round(G.cx), cy = Math.round(G.cy), grow = Math.min(1, s.splatT / 0.08);
      for (let y = -24; y <= 24; y++) for (let x = -24; x <= 24; x++) {
        const a = Math.atan2(y, x), e = sp.edge[Math.floor(((a + Math.PI) / (Math.PI * 2)) * sp.edge.length) % sp.edge.length];
        const d = Math.hypot(x, y), rr = (15 * e + 3) * grow;
        if (d >= rr) continue;
        const nx = x / rr, ny = y / rr, nz = Math.sqrt(Math.max(0, 1 - nx * nx - ny * ny));
        let v = (nx * LIGHT[0] + ny * LIGHT[1] + nz * LIGHT[2] + 0.3) / 1.3 * 4.6 + bay(x, y) * 0.6;
        if (d > rr - 1.3) v = 1;
        px(l, cx + x, cy + y, ramp(R.goo, v));
      }
      for (let y = -3; y <= 2; y++) for (let x = -6; x <= 5; x++) if (Math.abs(x) + Math.abs(y) * 1.5 < 7) px(l, cx + x, cy + y, R.body[1 + ((x + y) & 1)]); // restes de mouche
      rect(l, cx - 8, cy - 10, 2, 1, '#ffffff'); px(l, cx - 9, cy - 9, R.goo[4]); px(l, cx - 9, cy - 8, R.goo[4]); px(l, cx + 9, cy + 4, R.goo[4]);
      for (const tn of G.tend) { // filaments
        for (let y = 0; y < tn.len; y++) { px(l, cx + tn.dx, cy + 10 + y, R.goo[2]); if (y < tn.len - 3) px(l, cx + tn.dx + 1, cy + 10 + y, R.goo[1]); }
        if (!tn.dropped || tn.len > 3) shade(l, cx + tn.dx, cy + 10 + Math.round(tn.len), 2, 2.6, R.goo, 0.5);
      }
      for (const d of G.drops) { px(l, d.x, d.y, R.goo[3]); if (d.size > 1) { px(l, d.x + 1, d.y, R.goo[2]); px(l, d.x, d.y + 1, R.goo[2]); px(l, d.x, d.y - 1, R.goo[4]); } }
      for (const f of G.falling) if (!f.done) { px(l, f.x, f.y, R.goo[3]); px(l, f.x, f.y - 1, R.goo[2]); px(l, f.x, f.y + 1, R.goo[4]); }
      for (const p of G.splash) px(l, p.x, p.y, R.goo[3]);
      // "SPLAT!" en lettres pixel qui rebondissent
      const word = 'SPLAT!', amp = Math.max(0, 1 - s.splatT * 1.2);
      let x0 = cx - 36;
      [...word].forEach((ch, i) => {
        const glyph = FONT5[ch], by = cy - 52 - Math.round(Math.abs(Math.sin(s.splatT * 12 + i * 0.7)) * 9 * amp);
        for (const [ox, oy, col] of [[1, 1, R.goo[0]], [0, 0, null]]) glyph.forEach((row, j) => [...row].forEach((b, k) => {
          if (b !== '1') return;
          const c = col || ramp(R.goo, 4.4 - j * 0.35);
          l.fillStyle = c; l.fillRect(x0 + k * 3 + ox, by + j * 3 + oy, 3, 3);
        }));
        x0 += glyph[0].length * 3 + 3;
      });
    },

    update(s, dt, c) {
      baseUpdate.call(this, s, dt, c);
      if (s.splat) { if (!s.goo) this.initGoo(s); this.updateGoo(s, dt); }
    },

    draw(s, g, c) {
      const low = this._low || (this._low = canvas(LW, LH)), l = low.getContext('2d');
      l.imageSmoothingEnabled = false;
      l.drawImage(this.background(), 0, 0);
      this.drawLiving(l, s.t);
      if (s.splat && s.goo) this.drawGoo(l, s);
      else if (!s.splat) {
        // ombre tramée sur le mur, puis la mouche (tournée dans le sens du vol)
        const fx = s.x / K, fy = s.y / K;
        for (let y = -4; y <= 4; y++) for (let x = -14; x <= 14; x++) if ((x * x) / 196 + (y * y) / 16 < 1 && (x + y) % 2 === 0) px(l, fx + 8 + x, fy + 18 + y, 'rgba(70,35,60,0.35)');
        l.save(); l.translate(Math.round(fx), Math.round(fy)); l.rotate(Math.atan2(s.vy, s.vx));
        l.drawImage(this.flySprite(s.t), -34, -34); l.restore();
      }
      for (const w of s.whoosh) { // petits souffles d'air
        const r = 10 + w.t * 70, cx = w.x / K, cy = w.y / K;
        for (let a = -0.7; a < 0.7; a += 0.14) px(l, cx + Math.cos(a - 1.7) * r, cy + Math.sin(a - 1.7) * r, `rgba(255,250,235,${1 - w.t / 0.25})`);
      }
      // tapette : écrasée et "étirée" au moment du coup
      const sw = this.swatterSprite(), mx = Math.round(c.input.x / K), my = Math.round(c.input.y / K);
      if (s.swat > 0) {
        l.globalAlpha = 0.3; l.drawImage(sw, mx - 15, my - 26, 48, 72); l.globalAlpha = 1;
        l.drawImage(sw, mx - 16, my - 14, 50, 62);
      } else l.drawImage(sw, mx - 15, my - 16);

      // agrandissement ×2 sans lissage (+ tremblement à l'impact)
      const shake = s.splat && s.splatT < 0.22 ? Math.round(Math.sin(s.splatT * 90) * 3) : 0;
      g.save();
      g.imageSmoothingEnabled = false;
      g.filter = 'saturate(1.18) brightness(1.08)'; // un peu plus lumineux et coloré, sans brûler
      g.drawImage(low, shake, 0, W, H);
      g.filter = 'none';
      g.restore();

      // ---------- éclairage "à la Eastward", lisse, posé sur les pixels ----------
      g.save();
      g.globalCompositeOperation = 'multiply'; // ombres violettes loin de la fenêtre
      const amb = g.createRadialGradient(760, 150, 60, 760, 150, 900);
      amb.addColorStop(0, '#ffffff'); amb.addColorStop(0.5, '#f8f2f8'); amb.addColorStop(1, '#cbbedd');
      g.fillStyle = amb; g.fillRect(0, 0, W, H);
      g.globalCompositeOperation = 'lighter'; // halo chaud de la fenêtre + rayons
      const glow = g.createRadialGradient(760, 146, 20, 760, 146, 260);
      glow.addColorStop(0, 'rgba(255,225,160,0.22)'); glow.addColorStop(1, 'rgba(255,225,160,0)');
      g.fillStyle = glow; g.fillRect(0, 0, W, H);
      for (const [x0, x1, a] of [[660, 440, 0.07], [730, 540, 0.055], [800, 650, 0.045]]) {
        const sh = g.createLinearGradient(0, 250, 0, 430);
        sh.addColorStop(0, `rgba(255,236,190,${a})`); sh.addColorStop(1, 'rgba(255,236,190,0)');
        g.fillStyle = sh; g.beginPath(); g.moveTo(x0, 250); g.lineTo(x0 + 40, 250); g.lineTo(x1 + 70, 430); g.lineTo(x1 - 40, 430); g.closePath(); g.fill();
      }
      if (s.splat && s.splatT < 0.07) { g.fillStyle = `rgba(255,255,230,${0.55 * (1 - s.splatT / 0.07)})`; g.fillRect(0, 0, W, H); } // flash
      g.restore();
    },
  });
})();
