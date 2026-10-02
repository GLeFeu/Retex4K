// SOURIS : « Écrase la mouche », STYLE 4 = PHOTOMONTAGE « À L'ARRACHE » (essai, galerie uniquement).
// Même cuisine, mais façon Photoshop raté (genre Photoshop Flowey) : image trop contrastée et trop
// saturée, compression JPEG visible, fenêtre brûlée avec reflet d'objectif, photos de radis
// détourées grossièrement et collées n'importe comment, mouche énorme avec décalage des couleurs,
// tapette détourée au contour blanc, bugs d'image, texte en police Impact comme un mème.
(() => {
  const A = Engine.games.find(g => g.id === 'mouche');
  const B = Engine.games.find(g => g.id === 'mouche2'); // décor réaliste de base
  const img = (src) => { const i = new Image(); i.src = src; return i; };
  const PHOTOS = { beau: img('assets/radis/beau.jpg'), moche: img('assets/radis/moche.jpg') };
  const loaded = (i) => i.complete && i.naturalWidth > 0;

  // copie d'une image entièrement teintée d'une couleur (pour le contour blanc et l'ombre dure)
  function tinted(src, color) {
    const c = document.createElement('canvas'); c.width = src.width; c.height = src.height;
    const g = c.getContext('2d');
    g.drawImage(src, 0, 0);
    g.globalCompositeOperation = 'source-in';
    g.fillStyle = color; g.fillRect(0, 0, c.width, c.height);
    return c;
  }
  // "détourage" raté : contour blanc irrégulier + ombre portée trop dure
  function cutout(g, src, x, y, border = 4, shadow = 9) {
    const white = tinted(src, '#fff'), black = tinted(src, 'rgba(0,0,0,0.6)');
    g.drawImage(black, x + shadow, y + shadow);
    for (let a = 0; a < Math.PI * 2; a += Math.PI / 6) g.drawImage(white, x + Math.cos(a) * border, y + Math.sin(a) * border);
    g.drawImage(src, x, y);
  }
  const pad = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };

  Engine.register({
    ...A,
    id: 'mouche4',
    name: 'Écrase la mouche (photomontage)',
    apercu: true,
    _bg: null,

    background() {
      if (this._bg) return this._bg;
      const cv = pad(W, H), g = cv.getContext('2d');
      // 1. le décor réaliste, poussé beaucoup trop loin
      g.filter = 'contrast(1.35) saturate(1.8) brightness(1.04)';
      g.drawImage(B.background(), 0, 0);
      g.filter = 'none';
      // 2. compression JPEG visible : blocs de 8×8 pixels + bruit
      if (g.getImageData) {
        const im = g.getImageData(0, 0, W, H), d = im.data;
        for (let by = 0; by < H; by += 8) for (let bx = 0; bx < W; bx += 8) {
          let r = 0, gg = 0, b = 0, n = 0;
          for (let y = by; y < by + 8 && y < H; y++) for (let x = bx; x < bx + 8; x++) { const i = (y * W + x) * 4; r += d[i]; gg += d[i + 1]; b += d[i + 2]; n++; }
          r /= n; gg /= n; b /= n;
          for (let y = by; y < by + 8 && y < H; y++) for (let x = bx; x < bx + 8; x++) {
            const i = (y * W + x) * 4, noise = (((x * 73 + y * 151) % 13) - 6);
            d[i] = d[i] * 0.72 + r * 0.28 + noise; d[i + 1] = d[i + 1] * 0.72 + gg * 0.28 + noise; d[i + 2] = d[i + 2] * 0.72 + b * 0.28 + noise;
          }
        }
        g.putImageData(im, 0, 0);
      }
      // 3. fenêtre "brûlée" par la lumière + reflet d'objectif
      const lx = 760, ly = 146;
      g.save(); g.globalCompositeOperation = 'lighter';
      const burn = g.createRadialGradient(lx, ly, 10, lx, ly, 260);
      burn.addColorStop(0, 'rgba(255,255,240,0.75)'); burn.addColorStop(0.35, 'rgba(255,240,200,0.35)'); burn.addColorStop(1, 'rgba(255,240,200,0)');
      g.fillStyle = burn; g.fillRect(0, 0, W, H);
      const flare = [[0.25, 22, 'rgba(120,255,180,0.18)'], [0.45, 46, 'rgba(255,120,220,0.14)'], [0.6, 14, 'rgba(255,255,140,0.25)'], [0.85, 70, 'rgba(120,170,255,0.12)'], [1.05, 30, 'rgba(255,170,90,0.2)']];
      for (const [k, r, c] of flare) { const fx = lx + (W / 2 - lx) * k * 2, fy = ly + (H / 2 - ly) * k * 2; g.fillStyle = c; g.beginPath(); g.arc(fx, fy, r, 0, Math.PI * 2); g.fill(); }
      g.strokeStyle = 'rgba(255,255,255,0.35)'; g.lineWidth = 3; g.beginPath(); g.moveTo(lx - 300, ly + 40); g.lineTo(lx + 200, ly - 30); g.stroke();
      g.restore();
      // 4. photos de radis découpées et collées n'importe comment
      if (loaded(PHOTOS.beau) && loaded(PHOTOS.moche)) {
        const frame = pad(140, 140), f = frame.getContext('2d'); // photo "encadrée" du beau radis, de travers
        f.fillStyle = '#fff'; f.fillRect(0, 0, 140, 140); f.drawImage(PHOTOS.beau, 8, 8, 124, 110);
        f.fillStyle = '#222'; f.font = 'italic 12px "Comic Sans MS", cursive'; f.fillText('mon radis <3', 30, 132);
        g.save(); g.translate(430, 60); g.rotate(-0.13);
        g.shadowColor = 'rgba(0,0,0,0.7)'; g.shadowOffsetX = 10; g.shadowOffsetY = 12; g.drawImage(frame, -70, -70); g.shadowColor = 'transparent';
        g.fillStyle = 'rgba(255,255,200,0.75)'; g.save(); g.rotate(0.5); g.fillRect(-20, -82, 46, 16); g.restore();
        g.restore();
        // radis moche détouré au lasso (polygone de travers), posé sur la table, BEAUCOUP trop grand
        const cut = pad(170, 260), k = cut.getContext('2d');
        k.beginPath(); [[78, 4], [128, 12], [150, 60], [118, 118], [96, 170], [70, 252], [52, 250], [60, 170], [36, 110], [44, 40]].forEach(([x, y], i) => (i ? k.lineTo(x, y) : k.moveTo(x, y)));
        k.closePath(); k.clip();
        k.drawImage(PHOTOS.moche, -60, -20, 300, 300);
        g.save(); g.translate(330, 160); g.rotate(0.08); cutout(g, cut, 0, 0, 5, 12); g.restore();
      } else return cv; // photos pas encore chargées : on réessaiera à la prochaine image
      this._bg = cv;
      return cv;
    },

    draw(s, g, c) {
      const glitch = (s.t % 2.3) < 0.09 || (s.t % 3.7) < 0.05; // petits bugs d'image de temps en temps
      g.save();
      if (glitch) g.translate((s.t * 997 % 9) - 4, 0); // l'image saute
      g.drawImage(this.background(), 0, 0);
      if (s.splat) {
        B.drawSplat.call(B, g, s);
        // texte façon mème
        g.save(); g.translate(W / 2, 80); g.rotate(-0.05 + Math.sin(s.t * 40) * 0.02);
        g.font = '86px Impact, "Arial Black", sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
        g.lineWidth = 9; g.strokeStyle = '#000'; g.strokeText('SPLAT', 0, 0); g.fillStyle = '#fff'; g.fillText('SPLAT', 0, 0);
        g.restore();
      } else {
        // mouche ÉNORME avec décalage rouge / bleu (aberration chromatique)
        const fc = this._fly || (this._fly = pad(260, 260)), f = fc.getContext('2d');
        f.clearRect(0, 0, 260, 260);
        f.save(); f.translate(130, 130); f.scale(1.45, 1.45); f.translate(-130, -130);
        B.drawFly.call(B, f, { ...s, x: 130, y: 130 });
        f.restore();
        const red = tinted(fc, 'rgba(255,0,40,0.55)'), cyan = tinted(fc, 'rgba(0,220,255,0.55)');
        g.save(); g.globalCompositeOperation = 'lighter';
        g.drawImage(red, s.x - 130 - 4, s.y - 130); g.drawImage(cyan, s.x - 130 + 4, s.y - 130 + 1);
        g.restore();
        g.drawImage(fc, s.x - 130, s.y - 130);
      }
      g.restore();
      // tapette détourée au contour blanc, ombre bien trop dure
      const sc = this._sw || (this._sw = pad(380, 380)), sg = sc.getContext('2d');
      sg.clearRect(0, 0, 380, 380);
      B.drawSwatter.call(B, sg, 130, 130, s.swat);
      cutout(g, sc, c.input.x - 130, c.input.y - 130, 4, 14);
      // bug d'image : des bandes horizontales décalées
      if (glitch && g.getTransform && g.getTransform().a === 1) {
        for (let i = 0; i < 6; i++) {
          const y = ((i * 97 + Math.floor(s.t * 50) * 31) % H), h = 6 + (i * 7) % 20, dx = ((i * 53) % 60) - 30;
          g.drawImage(g.canvas, 0, y, W, h, dx, y, W, h);
        }
        g.fillStyle = 'rgba(0,255,120,0.08)'; g.fillRect(0, 0, W, H);
      }
      // lignes de télé + vignettage bien lourd
      g.fillStyle = 'rgba(0,0,0,0.07)';
      for (let y = 0; y < H; y += 3) g.fillRect(0, y, W, 1);
      Draw.vignette(g, 0.55);
    },
  });
})();
