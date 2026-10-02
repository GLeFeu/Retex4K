// SOURIS : « Écrase la mouche », STYLE 3 = PIXEL ART (essai de direction artistique, galerie uniquement).
// Même cuisine que le style 1. Tout est dessiné dans une image de 240×135 pixels avec une palette
// limitée, puis agrandi ×4 sans lissage (gros pixels nets, dégradés en tramage).
(() => {
  const A = Engine.games.find(g => g.id === 'mouche'); // même gameplay que le style 1
  const LW = 240, LH = 135, K = 4, T = 100; // T : haut de la table en pixels
  const P = {
    ink: '#1e1a2b', dark: '#45283c', wood: '#8f563b', woodL: '#b5794e', woodD: '#663931',
    wall: '#f4d6a0', wallD: '#e2b77f', wallDD: '#c9965f', sky: '#5fcde4', skyL: '#cbf0fc',
    hill: '#6abe30', hillD: '#37946e', white: '#ffffff', cloudS: '#cbdbfc', red: '#ac3232',
    redL: '#d95763', pink: '#e98fb0', yellow: '#fbf236', orange: '#df7126', tan: '#d9a066',
    cream: '#fff3d6', blue: '#5b6ee1', blueD: '#306082', blueL: '#639bff', glass: '#cbdbfc',
    glassD: '#9badb7', grey: '#847e87', greyL: '#c2c3c7', goo: '#99e550', gooD: '#6abe30', gooDD: '#37946e',
  };

  // petits outils de dessin "au pixel"
  const R = (l, x, y, w, h, c) => { l.fillStyle = c; l.fillRect(Math.round(x), Math.round(y), w, h); };
  const dot = (l, x, y, c) => R(l, x, y, 1, 1, c);
  function disc(l, cx, cy, rx, ry, c) {
    l.fillStyle = c;
    for (let y = -ry; y <= ry; y++) {
      const half = Math.round(rx * Math.sqrt(Math.max(0, 1 - (y * y) / ((ry + 0.5) * (ry + 0.5)))));
      l.fillRect(Math.round(cx - half), Math.round(cy + y), half * 2 + 1, 1);
    }
  }
  function dither(l, x, y, w, h, c, phase = 0) { // une case sur deux : faux dégradé rétro
    l.fillStyle = c;
    for (let j = 0; j < h; j++) for (let i = (j + phase) % 2; i < w; i += 2) l.fillRect(x + i, y + j, 1, 1);
  }
  function line(l, x0, y0, x1, y1, c) {
    x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
    const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
    let err = dx + dy;
    for (;;) { dot(l, x0, y0, c); if (x0 === x1 && y0 === y1) break; const e2 = 2 * err; if (e2 >= dy) { err += dy; x0 += sx; } if (e2 <= dx) { err += dx; y0 += sy; } }
  }
  // sprite à partir de lignes de texte (une lettre = une couleur, '.' = transparent)
  function sprite(l, rows, map, x, y, flip) {
    rows.forEach((row, j) => [...row].forEach((ch, i) => {
      if (ch !== '.') dot(l, x + (flip ? row.length - 1 - i : i), y + j, map[ch]);
    }));
  }

  // mouche vue de dessus, 16×11 pixels, 2 images (ailes ouvertes / repliées)
  const FLY = [
    ['...wgg....wgg...', '..wgggw..wgggw..', '...wgggwwgggw...', '....wggwwggw....', '..l..ddkkkkRr...', '.l.dddddkkkrRr..', '..l..ddkkkkRr...',
      '....wggwwggw....', '...wgggwwgggw...', '..wgggw..wgggw..', '...wgg....wgg...'],
    ['................', '................', '................', '..wggggw........', '.wggdddkkkkRr...', '..dddddddkkkrRr.', '.wggdddkkkkRr...',
      '..wggggw........', '................', '................', '................'],
  ];
  const FLY_MAP = { w: P.glassD, g: P.glass, d: P.dark, k: P.ink, r: P.red, R: P.redL, l: P.ink };

  Engine.register({
    ...A,
    id: 'mouche3',
    name: 'Écrase la mouche (pixel art)',
    apercu: true,
    _bg: null,

    lowCanvas() {
      if (!this._low) { this._low = document.createElement('canvas'); this._low.width = LW; this._low.height = LH; }
      return this._low;
    },

    background() {
      if (this._bg) return this._bg;
      const cv = document.createElement('canvas'); cv.width = LW; cv.height = LH;
      const l = cv.getContext('2d');
      // mur + papier peint + ombre du plafond (tramée)
      R(l, 0, 0, LW, T, P.wall);
      dither(l, 0, 0, LW, 4, P.wallD); R(l, 0, 0, LW, 1, P.wallD);
      for (let y = 8, row = 0; y < T - 4; y += 12, row++) for (let x = row % 2 ? 6 : 0; x < LW; x += 12) {
        dot(l, x, y - 1, P.wallD); dot(l, x - 1, y, P.wallD); dot(l, x + 1, y, P.wallD); dot(l, x, y + 1, P.wallD);
      }
      dither(l, 0, T - 4, LW, 4, P.wallDD, 1);
      // fenêtre
      const wx = 162, wy = 11, ww = 56, wh = 50;
      R(l, wx, wy, ww, wh, P.sky);
      dither(l, wx, wy + 18, ww, 6, P.skyL); R(l, wx, wy + 24, ww, 10, P.skyL);
      disc(l, wx + 14, wy + 12, 6, 2, P.white); disc(l, wx + 38, wy + 18, 5, 2, P.white); R(l, wx + 9, wy + 14, 10, 1, P.cloudS);
      l.save(); l.beginPath(); l.rect(wx, wy, ww, wh); l.clip(); // les collines restent dans la fenêtre
      disc(l, wx + 14, wy + wh + 6, 22, 14, P.hillD); disc(l, wx + 42, wy + wh + 8, 24, 16, P.hill);
      R(l, wx, wy + wh - 2, ww, 2, P.hillD);
      l.restore();
      R(l, wx - 3, wy - 3, ww + 6, 3, P.wood); R(l, wx - 3, wy + wh, ww + 6, 3, P.wood);
      R(l, wx - 3, wy - 3, 3, wh + 6, P.wood); R(l, wx + ww, wy - 3, 3, wh + 6, P.wood);
      R(l, wx + ww / 2 - 1, wy, 2, wh, P.wood); R(l, wx, wy + wh / 2 - 1, ww, 2, P.wood);
      R(l, wx - 3, wy - 3, ww + 6, 1, P.woodL); R(l, wx - 3, wy - 3, 1, wh + 6, P.woodL);
      R(l, wx - 6, wy + wh + 2, ww + 12, 3, P.woodL); R(l, wx - 6, wy + wh + 5, ww + 12, 1, P.woodD);
      // rideaux à plis (colonnes alternées)
      for (const side of [-1, 1]) {
        for (let y = wy - 6; y < wy + wh + 8; y++) {
          const bulge = Math.round(Math.sin((y - wy) / 14) * 2 + 4 + (y > wy + 30 ? 2 : 0));
          for (let i = 0; i < 10 + bulge; i++) {
            const x = side < 0 ? wx - 3 - i : wx + ww + 3 + i;
            dot(l, x, y, i === 9 + bulge ? P.red : (i % 3 === 1 ? P.red : P.redL));
          }
        }
      }
      R(l, wx - 22, wy - 8, ww + 44, 2, P.grey); R(l, wx - 22, wy - 8, ww + 44, 1, P.greyL);
      // rayon de lumière (tramage clair)
      for (let y = wy + wh + 6; y < T + 8; y++) {
        const t = (y - wy - wh) / 50, x0 = Math.round(wx - 55 * t), x1 = Math.round(wx + ww - 10 - 20 * t);
        l.fillStyle = y < T ? 'rgba(255,250,225,0.35)' : 'rgba(255,250,225,0.25)';
        for (let x = x0 + (y % 2); x < x1; x += 2) l.fillRect(x, y, 1, 1);
      }
      // étagère, bocaux, plante
      R(l, 13, 36, 74, 3, P.wood); R(l, 13, 36, 74, 1, P.woodL); R(l, 13, 39, 74, 1, P.woodD);
      dither(l, 15, 40, 70, 2, P.wallDD);
      for (const bx of [20, 78]) { R(l, bx, 40, 1, 6, P.grey); line(l, bx, 45, bx + 4, 40, P.grey); }
      const jar = (x, h, fill, fillL) => {
        const y = 36 - h;
        R(l, x, y + 3, 13, h - 3, P.glassD); R(l, x + 1, y + 3, 11, h - 4, P.glass);
        R(l, x + 1, y + 6, 11, h - 7, fill); R(l, x + 1, y + 6, 11, 1, fillL);
        R(l, x + 3, y + Math.round(h / 2), 7, 3, P.cream);
        R(l, x + 2, y + 4, 1, h - 6, P.white);
        R(l, x + 1, y, 11, 3, P.grey); R(l, x + 1, y, 11, 1, P.greyL);
      };
      jar(24, 15, P.red, P.redL); jar(42, 17, P.orange, P.yellow); jar(60, 14, P.tan, P.cream);
      R(l, 75, 30, 9, 6, P.orange); R(l, 74, 29, 11, 2, P.orange); R(l, 74, 29, 11, 1, P.yellow);
      for (const [x, y, c] of [[76, 24, P.hill], [79, 21, P.hillD], [82, 24, P.hill], [78, 26, P.hill], [80, 25, P.hillD]]) disc(l, x, y, 1, 3, c);
      // table en bois
      R(l, 0, T, LW, 12, P.woodL);
      for (let i = 0; i < 70; i++) dot(l, (i * 53) % LW, T + 2 + (i * 7) % 9, P.wood);
      R(l, 0, T, LW, 1, P.cream);
      R(l, 0, T + 12, LW, LH - T - 12, P.woodD); R(l, 0, T + 12, LW, 1, P.wood);
      dither(l, 0, LH - 8, LW, 8, P.ink);
      // assiette + gâteau
      disc(l, 55, T + 5, 26, 4, P.glassD); disc(l, 55, T + 4, 25, 4, P.white); disc(l, 55, T + 4, 18, 2, P.cloudS);
      const cx = 43, cy = T + 3;
      for (let i = 0; i < 28; i++) { const top = Math.round(cy - 13 - (i / 28) * 3); R(l, cx + i, top, 1, cy - top, P.tan); }
      R(l, cx + 2, cy - 9, 26, 2, P.cream); R(l, cx + 2, cy - 5, 26, 1, P.red);
      for (let i = 0; i < 28; i++) { const top = Math.round(cy - 14 - (i / 28) * 3); R(l, cx + i, top, 1, 2, P.pink); if (i % 4 === 1) dot(l, cx + i, top + 2, P.pink); }
      disc(l, cx + 18, cy - 19, 2, 2, P.red); dot(l, cx + 17, cy - 20, P.redL); R(l, cx + 17, cy - 22, 3, 1, P.hill);
      // tasse de thé
      disc(l, 197, T + 4, 11, 2, P.glassD); disc(l, 197, T + 3, 10, 2, P.white);
      R(l, 190, T - 12, 14, 13, P.blue); R(l, 191, T - 12, 3, 13, P.blueL); R(l, 202, T - 12, 2, 13, P.blueD);
      R(l, 190, T - 13, 14, 2, P.tea); R(l, 204, T - 9, 3, 1, P.blue); R(l, 206, T - 9, 1, 5, P.blue); R(l, 204, T - 5, 3, 1, P.blue);
      this._bg = cv;
      return cv;
    },

    drawPixelSwatter(l, x, y, swat) {
      const press = swat > 0, ox = press ? -1 : 0, oy = press ? 1 : 0;
      line(l, x + 5, y + 8, x + 20, y + 33, P.blueD); line(l, x + 6, y + 8, x + 21, y + 33, P.blue); line(l, x + 6, y + 7, x + 21, y + 32, P.blueL);
      const hx = x - 7 + ox, hy = y - 8 + oy;
      R(l, hx, hy, 15, 16, P.red);
      R(l, hx + 1, hy + 1, 13, 14, press ? P.pink : P.redL);
      for (let j = 2; j < 14; j += 2) for (let i = 2; i < 13; i += 2) dot(l, hx + i, hy + j, P.red);
      R(l, hx + 1, hy + 1, 4, 1, P.pink); R(l, hx + 1, hy + 1, 1, 3, P.pink);
      if (press) { dot(l, x - 10, y - 11, P.white); dot(l, x - 12, y - 9, P.white); dot(l, x - 9, y - 13, P.white); }
    },

    drawPixelSplat(l, s) {
      const sp = s.splat, cx = Math.round(s.x / K), cy = Math.round(s.y / K), drip = Math.min(5, Math.floor(s.splatT * 6));
      for (let y = -9; y <= 9; y++) for (let x = -9; x <= 9; x++) {
        const a = Math.atan2(y, x), e = sp.edge[Math.floor(((a + Math.PI) / (Math.PI * 2)) * sp.edge.length) % sp.edge.length];
        const d = Math.hypot(x, y), r = 6 * e + 1;
        if (d < r) dot(l, cx + x, cy + y, d > r - 1.2 ? P.gooDD : d < r * 0.45 ? P.goo : P.gooD);
      }
      for (const [dx, len] of [[-3, drip], [1, drip + 2], [4, Math.max(0, drip - 1)]]) R(l, cx + dx, cy + 5, 1, len, P.gooD);
      R(l, cx - 2, cy - 1, 4, 2, P.ink); dot(l, cx + 2, cy - 2, P.glass); dot(l, cx - 3, cy + 1, P.dark);
      dot(l, cx - 2, cy - 3, P.white);
      l.font = 'bold 8px monospace'; l.textAlign = 'center'; l.textBaseline = 'middle';
      for (const [ox, oy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) { l.fillStyle = P.gooDD; l.fillText('SPLAT!', cx + ox, cy - 15 + oy); }
      l.fillStyle = P.goo; l.fillText('SPLAT!', cx, cy - 15);
    },

    draw(s, g, c) {
      const low = this.lowCanvas(), l = low.getContext('2d');
      l.imageSmoothingEnabled = false;
      l.drawImage(this.background(), 0, 0);
      // poussières (scintillent)
      for (let i = 0; i < 8; i++) if ((Math.floor(s.t * 4) + i) % 3) dot(l, 130 + (i * 13) % 50, 66 + (i * 7 + Math.floor(s.t * 3)) % 32, P.cream);
      if (s.splat) this.drawPixelSplat(l, s);
      else {
        const fx = Math.round(s.x / K) - 8, fy = Math.round(s.y / K) - 5;
        dither(l, fx + 4, fy + 11, 9, 2, 'rgba(70,40,15,0.35)');
        sprite(l, FLY[Math.floor(s.t * 30) % 2], FLY_MAP, fx, fy, s.vx < 0);
      }
      for (const w of s.whoosh) {
        const r = 8 + Math.floor(w.t * 40), cx = Math.round(w.x / K), cy = Math.round(w.y / K);
        for (let a = -0.6; a < 0.6; a += 0.25) dot(l, cx + Math.round(Math.cos(a - 1.6) * r), cy + Math.round(Math.sin(a - 1.6) * r), P.white);
      }
      this.drawPixelSwatter(l, Math.round(c.input.x / K), Math.round(c.input.y / K), s.swat);
      g.save();
      g.imageSmoothingEnabled = false; // agrandi sans lissage : gros pixels nets
      g.drawImage(low, 0, 0, W, H);
      g.restore();
    },
  });
})();
