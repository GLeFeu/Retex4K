// SOURIS : « Écrase la mouche », STYLE 2 (essai de direction artistique, visible seulement dans
// la galerie) : pique-nique au jardin à l'heure dorée, arrière-plan flou, nappe en perspective,
// lumière qui passe à travers les feuilles, objets transparents. Même gameplay que le style 1.
(() => {
  const A = Engine.games.find(g => g.id === 'mouche'); // on réutilise la logique du style 1
  const Y0 = 300; // bord arrière de la table

  // perspective de la nappe : bord arrière étroit, bord avant large
  const tableX = (y, side) => {
    const t = (y - Y0) / (H - Y0);
    return side < 0 ? 110 + (-260 - 110) * t : 850 + (1220 - 850) * t;
  };
  const rowY = (v) => Y0 + (H - Y0) * ((v * 2.2) / (1 + 1.2 * v)); // les rangées grandissent vers l'avant

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

      // --- jardin au loin, flouté (profondeur de champ) ---
      const far = document.createElement('canvas');
      far.width = W; far.height = Y0 + 60;
      const f = far.getContext('2d');
      f.fillStyle = Draw.vgrad(f, 0, Y0 + 60, ['#ffe0a3', '#f6d48a', '#b9dc8c']);
      f.fillRect(0, 0, W, Y0 + 60);
      f.fillStyle = 'rgba(255,240,200,0.9)';
      Draw.circle(f, 760, 70, 60); f.fill();
      for (const [x, w, h, col] of [[-40, 260, 200, '#7fa85a'], [180, 320, 160, '#8fbc63'], [470, 280, 210, '#6f9a4e'], [700, 330, 180, '#86b35d']]) {
        f.fillStyle = col;
        f.beginPath(); f.ellipse(x + w / 2, Y0 - 20, w / 2, h, 0, Math.PI, 0); f.fill();
      }
      f.fillStyle = '#5c3b22';
      for (const x of [120, 560]) f.fillRect(x, Y0 - 150, 26, 160);
      for (const [x, y, r, col] of [[120, Y0 - 190, 110, '#4f7f3a'], [570, Y0 - 200, 130, '#5b8c42'], [330, Y0 - 120, 70, '#6c9c4a']]) {
        f.fillStyle = col; Draw.circle(f, x + 13, y, r); f.fill();
      }
      for (let i = 0; i < 40; i++) { // fleurs dans l'herbe
        f.fillStyle = ['#ff8fab', '#fff3b0', '#ffffff', '#ffb703'][i % 4];
        Draw.circle(f, (i * 97) % W, Y0 + 10 + (i * 37) % 40, 4); f.fill();
      }
      g.filter = 'blur(6px)';
      g.drawImage(far, 0, 0);
      g.filter = 'none';
      // bokeh : petites taches de lumière floues
      g.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 26; i++) {
        const x = (i * 173) % W, y = 30 + (i * 59) % (Y0 - 40), r = 10 + (i % 5) * 7;
        const bg = g.createRadialGradient(x, y, 0, x, y, r);
        bg.addColorStop(0, 'rgba(255,245,200,0.35)'); bg.addColorStop(0.7, 'rgba(255,230,160,0.15)'); bg.addColorStop(1, 'rgba(255,230,160,0)');
        g.fillStyle = bg; Draw.circle(g, x, y, r); g.fill();
      }
      g.globalCompositeOperation = 'source-over';

      // --- nappe à carreaux en perspective ---
      const N = 7, M = 12;
      for (let i = 0; i < N; i++) {
        const ya = rowY(i / N), yb = rowY((i + 1) / N);
        for (let j = 0; j < M; j++) {
          const p = (y, k) => tableX(y, -1) + (tableX(y, 1) - tableX(y, -1)) * k;
          g.beginPath();
          g.moveTo(p(ya, j / M), ya); g.lineTo(p(ya, (j + 1) / M), ya);
          g.lineTo(p(yb, (j + 1) / M), yb); g.lineTo(p(yb, j / M), yb); g.closePath();
          g.fillStyle = (i + j) % 2 ? '#fff6e6' : '#d9534f';
          g.fill();
        }
      }
      g.fillStyle = 'rgba(255,255,255,0.12)'; // tissage (discret)
      for (let y = Y0; y < H; y += 3) { g.fillRect(tableX(y, -1), y, tableX(y, 1) - tableX(y, -1), 1); }
      g.fillStyle = Draw.vgrad(g, Y0, H, ['rgba(255,220,150,0.25)', 'rgba(60,20,0,0.25)']); // la lumière vient du fond
      g.beginPath(); g.moveTo(tableX(Y0, -1), Y0); g.lineTo(tableX(Y0, 1), Y0); g.lineTo(tableX(H, 1), H); g.lineTo(tableX(H, -1), H); g.closePath(); g.fill();
      g.fillStyle = 'rgba(120,40,20,0.35)'; g.fillRect(tableX(Y0, -1), Y0, tableX(Y0, 1) - tableX(Y0, -1), 3);

      // --- tranche de pastèque (ce qui attire la mouche) ---
      const wx = 300, wy = 405;
      Draw.softShadow(g, wx + 10, wy + 20, 120, 22, 0.35);
      g.save(); g.translate(wx, wy); g.scale(1, 0.62);
      g.beginPath(); g.arc(0, 0, 112, Math.PI, 0); g.closePath(); Draw.fillLine(g, Draw.vgrad(g, -112, 0, ['#2f7d32', '#1b5e20']), '#0f3d12', 2.5);
      g.beginPath(); g.arc(0, 0, 100, Math.PI, 0); g.closePath(); g.fillStyle = '#c5e1a5'; g.fill();
      g.beginPath(); g.arc(0, 0, 92, Math.PI, 0); g.closePath();
      g.fillStyle = Draw.rgrad(g, 0, -10, 10, 95, '#ff5a6e', '#e02c45', 0, -30); g.fill();
      g.fillStyle = 'rgba(255,255,255,0.18)'; g.beginPath(); g.ellipse(-30, -55, 30, 12, -0.3, 0, Math.PI * 2); g.fill();
      for (let i = 0; i < 11; i++) {
        const a = Math.PI + 0.35 + (i % 6) * 0.45, r = 40 + (i % 3) * 18;
        g.save(); g.translate(Math.cos(a) * r, Math.sin(a) * r); g.rotate(a + Math.PI / 2);
        g.fillStyle = '#1a1a1a'; g.beginPath(); g.ellipse(0, 0, 3.2, 6, 0, 0, Math.PI * 2); g.fill();
        g.fillStyle = 'rgba(255,255,255,0.5)'; g.beginPath(); g.ellipse(-1, -2, 1, 2, 0, 0, Math.PI * 2); g.fill();
        g.restore();
      }
      g.restore();

      // --- carafe de citronnade (verre transparent) ---
      const cx = 700, cb = 410, ch = 150, cw = 64;
      Draw.softShadow(g, cx + 14, cb + 6, 70, 14, 0.3);
      g.globalCompositeOperation = 'lighter'; // lumière qui traverse la citronnade
      g.fillStyle = 'rgba(255,220,90,0.18)'; g.beginPath(); g.ellipse(cx + 40, cb + 12, 60, 12, 0, 0, Math.PI * 2); g.fill();
      g.globalCompositeOperation = 'source-over';
      const body = () => { g.beginPath(); g.moveTo(cx - cw, cb); g.quadraticCurveTo(cx - cw - 8, cb - ch * 0.5, cx - cw + 14, cb - ch); g.lineTo(cx + cw - 14, cb - ch); g.quadraticCurveTo(cx + cw + 8, cb - ch * 0.5, cx + cw, cb); g.closePath(); };
      g.save(); body(); g.clip();
      g.fillStyle = Draw.vgrad(g, cb - ch, cb, ['rgba(255,236,140,0.55)', 'rgba(255,205,60,0.75)']);
      g.fillRect(cx - cw - 10, cb - ch * 0.72, cw * 2 + 20, ch);
      for (const [x, y, r] of [[-20, -60, 18], [24, -86, 16], [6, -30, 15]]) { // rondelles de citron
        g.fillStyle = '#fff59d'; Draw.circle(g, cx + x, cb + y, r); g.fill();
        g.strokeStyle = 'rgba(230,190,40,0.9)'; g.lineWidth = 1.5;
        for (let k = 0; k < 6; k++) { const a = k * Math.PI / 3; g.beginPath(); g.moveTo(cx + x, cb + y); g.lineTo(cx + x + Math.cos(a) * r * 0.85, cb + y + Math.sin(a) * r * 0.85); g.stroke(); }
        Draw.circle(g, cx + x, cb + y, r); g.lineWidth = 2.5; g.strokeStyle = '#f9d71c'; g.stroke();
      }
      for (const [x, y] of [[-34, -100], [10, -110], [30, -50]]) { // glaçons
        Draw.rrect(g, cx + x, cb + y, 22, 20, 5); g.fillStyle = 'rgba(255,255,255,0.45)'; g.fill();
        g.strokeStyle = 'rgba(255,255,255,0.8)'; g.lineWidth = 1.5; g.stroke();
      }
      g.fillStyle = 'rgba(255,255,255,0.12)'; g.fillRect(cx - cw - 10, cb - ch, cw * 2 + 20, ch * 0.28);
      g.restore();
      body(); g.lineWidth = 3; g.strokeStyle = 'rgba(255,255,255,0.75)'; g.stroke();
      g.lineWidth = 1.2; g.strokeStyle = 'rgba(120,90,30,0.5)'; g.stroke();
      g.fillStyle = 'rgba(255,255,255,0.55)'; Draw.rrect(g, cx - cw + 10, cb - ch + 14, 10, ch - 34, 5); g.fill();
      g.fillStyle = 'rgba(255,255,255,0.7)';
      for (let i = 0; i < 18; i++) { Draw.circle(g, cx - cw + 22 + (i * 23) % (cw * 2 - 30), cb - 20 - (i * 41) % (ch - 50), 1.6); g.fill(); } // condensation
      g.beginPath(); g.moveTo(cx + cw - 6, cb - ch + 26); g.bezierCurveTo(cx + cw + 46, cb - ch + 20, cx + cw + 46, cb - 40, cx + cw - 2, cb - 36);
      g.lineWidth = 9; g.strokeStyle = 'rgba(255,255,255,0.55)'; g.stroke();
      g.lineWidth = 1.5; g.strokeStyle = 'rgba(120,90,30,0.45)'; g.stroke();

      // --- taches de lumière filtrée par les feuilles ---
      g.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 16; i++) {
        const x = 60 + (i * 211) % 860, y = Y0 + 20 + (i * 67) % (H - Y0 - 30), r = 26 + (i % 4) * 14;
        const lg = g.createRadialGradient(x, y, 0, x, y, r);
        lg.addColorStop(0, 'rgba(255,225,150,0.22)'); lg.addColorStop(1, 'rgba(255,225,150,0)');
        g.save(); g.translate(x, y); g.scale(1.6, 0.6); g.translate(-x, -y);
        g.fillStyle = lg; Draw.circle(g, x, y, r); g.fill(); g.restore();
      }
      g.globalCompositeOperation = 'source-over';

      // --- étalonnage chaud, façon film ---
      g.globalCompositeOperation = 'soft-light';
      g.fillStyle = Draw.vgrad(g, 0, H, ['rgba(255,170,60,0.55)', 'rgba(255,120,60,0.35)']);
      g.fillRect(0, 0, W, H);
      g.globalCompositeOperation = 'source-over';
      this._bg = cv;
      return cv;
    },

    // feuilles au premier plan (elles bougent un peu avec le vent)
    drawLeaves(g, t) {
      const leaf = (x, y, a, l, col) => {
        g.save(); g.translate(x, y); g.rotate(a);
        g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(l * 0.5, -l * 0.28, l, 0); g.quadraticCurveTo(l * 0.5, l * 0.28, 0, 0);
        g.fillStyle = col; g.fill();
        g.strokeStyle = 'rgba(0,0,0,0.25)'; g.lineWidth = 1.2; g.beginPath(); g.moveTo(2, 0); g.lineTo(l - 4, 0); g.stroke();
        g.restore();
      };
      const sway = Math.sin(t * 1.3) * 0.05;
      g.save();
      g.globalAlpha = 0.92;
      for (const [x, y, a, l, c] of [[-20, -10, 0.5, 130, '#24481f'], [10, -30, 0.95, 120, '#2f5e27'], [-30, 40, 0.15, 110, '#1e3d1a'], [40, -20, 1.4, 100, '#356b2c']]) leaf(x, y, a + sway, l, c);
      for (const [x, y, a, l, c] of [[W + 20, -10, Math.PI - 0.5, 130, '#24481f'], [W - 10, -30, Math.PI - 0.95, 115, '#2f5e27'], [W + 30, 50, Math.PI - 0.2, 105, '#1e3d1a']]) leaf(x, y, a - sway, l, c);
      g.restore();
    },

    // tapette verte translucide : les trous laissent vraiment voir à travers
    drawSwatter(g, x, y, swat) {
      const press = swat > 0;
      const head = () => {
        g.beginPath();
        g.roundRect(-54, -58, 108, 116, 24);
        for (let yy = -46; yy <= 46; yy += 12) for (let xx = (Math.abs(yy / 12) % 2 ? -42 : -48); xx <= 48; xx += 12) {
          g.moveTo(xx + 3.6, yy); g.arc(xx, yy, 3.6, 0, Math.PI * 2);
        }
      };
      g.save();
      g.translate(x, y);
      g.rotate(press ? -0.28 : 0.1);
      const k = press ? 0.9 : 1;
      g.scale(k, k);
      // ombre (avec les trous)
      g.save(); g.translate(16, 22); g.fillStyle = 'rgba(40,20,0,0.2)'; head(); g.fill('evenodd');
      g.lineCap = 'round'; g.lineWidth = 16; g.strokeStyle = 'rgba(40,20,0,0.2)'; g.beginPath(); g.moveTo(26, 54); g.lineTo(92, 172); g.stroke();
      g.restore();
      // manche en bois avec poignée en cuir
      g.lineCap = 'round';
      g.lineWidth = 14; g.strokeStyle = '#6b4423'; g.beginPath(); g.moveTo(22, 52); g.lineTo(90, 170); g.stroke();
      g.lineWidth = 10; g.strokeStyle = '#b07a45'; g.stroke();
      g.lineWidth = 2; g.strokeStyle = 'rgba(255,240,210,0.45)'; g.beginPath(); g.moveTo(22, 50); g.lineTo(88, 164); g.stroke();
      g.lineWidth = 13; g.strokeStyle = '#4a2c17';
      g.beginPath(); g.moveTo(22 + 68 * 0.62, 52 + 118 * 0.62); g.lineTo(22 + 68 * 0.98, 52 + 118 * 0.98); g.stroke();
      g.lineWidth = 1.5; g.strokeStyle = 'rgba(255,220,180,0.35)';
      for (let i = 0; i < 5; i++) { const q = 0.66 + i * 0.07; g.beginPath(); g.moveTo(22 + 68 * q - 6, 52 + 118 * q + 3); g.lineTo(22 + 68 * q + 6, 52 + 118 * q - 3); g.stroke(); }
      // tête translucide
      const hg = g.createLinearGradient(-54, -58, 54, 58);
      hg.addColorStop(0, 'rgba(196,240,110,0.92)'); hg.addColorStop(1, 'rgba(110,170,30,0.92)');
      g.fillStyle = hg; head(); g.fill('evenodd');
      g.beginPath(); g.roundRect(-54, -58, 108, 116, 24); g.lineWidth = 3; g.strokeStyle = '#3f6b0e'; g.stroke();
      g.beginPath(); g.roundRect(-50, -54, 100, 108, 20); g.lineWidth = 1.5; g.strokeStyle = 'rgba(255,255,255,0.45)'; g.stroke();
      g.fillStyle = 'rgba(255,255,255,0.28)'; g.beginPath(); g.roundRect(-46, -52, 44, 20, 10); g.fill();
      g.restore();
      if (press) {
        g.save(); g.strokeStyle = 'rgba(255,255,240,0.85)'; g.lineWidth = 3; g.lineCap = 'round';
        for (let i = 0; i < 3; i++) { g.beginPath(); g.arc(x - 10, y - 10, 72 + i * 10, -2.6 + i * 0.12, -1.7 + i * 0.12); g.stroke(); }
        g.restore();
      }
    },

    draw(s, g, c) {
      g.drawImage(this.background(), 0, 0);
      if (s.splat) A.drawSplat.call(this, g, s);
      else {
        // ombre de la mouche projetée sur la nappe (plus elle vole haut, plus elle est loin et floue)
        const sy = Math.max(Y0 + 30, Math.min(H - 20, s.y + 120));
        Draw.softShadow(g, s.x + 30, sy, 22 + (sy - s.y) * 0.05, 7, 0.22);
        // contre-jour doré autour de la mouche
        g.save(); g.globalCompositeOperation = 'lighter';
        const gl = g.createRadialGradient(s.x, s.y, 0, s.x, s.y, 46);
        gl.addColorStop(0, 'rgba(255,220,140,0.28)'); gl.addColorStop(1, 'rgba(255,220,140,0)');
        g.fillStyle = gl; Draw.circle(g, s.x, s.y, 46); g.fill();
        g.restore();
        A.drawFly.call(this, g, s);
      }
      for (const w of s.whoosh) {
        g.save(); g.globalAlpha = 1 - w.t / 0.25; g.strokeStyle = 'rgba(255,255,240,0.95)'; g.lineWidth = 2.5; g.lineCap = 'round';
        for (let i = 0; i < 3; i++) { g.beginPath(); g.arc(w.x, w.y, 30 + w.t * 160 + i * 8, -0.5 + i, 0.3 + i); g.stroke(); }
        g.restore();
      }
      this.drawLeaves(g, s.t);
      Draw.vignette(g, 0.42);
      this.drawSwatter(g, c.input.x, c.input.y, s.swat);
    },
  });
})();
