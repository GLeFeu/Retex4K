// Écran de consigne affiché avant chaque mini-jeu : fond noir, dessin de l'appareil à utiliser
// (clavier avec les bonnes touches allumées, souris, molette ou micro) et la consigne à lire.
const Consigne = {
  ROWS: ['AZERTYUIOP', 'QSDFGHJKLM', 'WXCVBN'],

  // Devine les touches à allumer en lisant la consigne du jeu (ou game.keys si le jeu les précise)
  keysFor(game) {
    if (game.keys) return new Set(game.keys);
    const h = ` ${(game.hint || '').toUpperCase()} `;
    const k = new Set();
    if (h.includes('ESPACE')) k.add('SPACE');
    if (h.includes('←')) k.add('LEFT');
    if (h.includes('→')) k.add('RIGHT');
    if (h.includes('↑')) k.add('UP');
    if (h.includes('↓')) k.add('DOWN');
    if (h.includes('FLÈCHE')) ['LEFT', 'RIGHT', 'UP', 'DOWN'].forEach(x => k.add(x));
    for (const m of h.matchAll(/(?<=[\s(/])([A-Z])(?=[\s)/·,])/g)) k.add(m[1]); // lettres isolées : « Q / D », « Z Q S D »
    if (h.includes('CHIFFRE')) for (let i = 0; i <= 9; i++) k.add(String(i));
    if (/LETTRE|LE MOT|TAPE-LE|TAPE LE/.test(h) && !h.includes('CHIFFRE')) k.add('*LETTRES');
    return k;
  },

  key(g, x, y, w, h, label, on, t, col) {
    const press = on ? Math.max(0, Math.sin(t * 8)) * 4 : 0;
    Draw.rrect(g, x, y + 5, w, h, 7); g.fillStyle = '#000'; g.fill();
    Draw.rrect(g, x, y + press, w, h, 7);
    Draw.fillStroke(g, on ? col : '#2b2d42', on ? '#fff' : '#4a4e69', 2);
    if (label) Draw.text(g, label, x + w / 2, y + press + h / 2 + 1, Math.min(18, h * 0.5), on ? '#1a1a1a' : '#8d99ae', null);
  },

  keyboard(g, cx, cy, game, t, col) {
    const keys = this.keysFor(game), S = 30, G = 4, letters = keys.has('*LETTRES');
    g.save();
    g.translate(cx, cy);
    g.scale(0.84, 0.84); // le clavier doit tenir dans la moitié gauche du cadre
    g.translate(-230, -90);
    Draw.rrect(g, -14, -14, 488, 196, 16); Draw.fillStroke(g, '#14141f', '#4a4e69', 4);
    // rangée des chiffres
    for (let i = 0; i < 10; i++) { const d = String((i + 1) % 10); this.key(g, 4 + i * (S + G), 0, S, S - 4, d, keys.has(d), t + i, col); }
    // lettres (AZERTY)
    this.ROWS.forEach((row, r) => {
      for (let i = 0; i < row.length; i++) {
        const ch = row[i];
        const on = keys.has(ch) || (letters && Math.sin(t * 3 + i * 1.7 + r * 2.3) > 0.6);
        this.key(g, 14 + r * 12 + i * (S + G), 32 + r * (S + G), S, S, ch, on, t + i, col);
      }
    });
    // espace
    this.key(g, 90, 32 + 3 * (S + G), 190, S - 2, 'ESPACE', keys.has('SPACE'), t, col);
    // flèches
    const ax = 362, ay = 32 + 2 * (S + G);
    this.key(g, ax + S + G, ay, S, S, '↑', keys.has('UP'), t, col);
    this.key(g, ax, ay + S + G, S, S, '←', keys.has('LEFT'), t + 1, col);
    this.key(g, ax + S + G, ay + S + G, S, S, '↓', keys.has('DOWN'), t + 2, col);
    this.key(g, ax + 2 * (S + G), ay + S + G, S, S, '→', keys.has('RIGHT'), t + 3, col);
    g.restore();
  },

  mouse(g, cx, cy, mode, t, col, right) {
    const wob = mode === 'curseur' ? Math.sin(t * 3) * 40 : 0;
    const wobY = mode === 'curseur' ? Math.sin(t * 4.3) * 18 : 0;
    g.save();
    g.translate(cx + wob, cy + wobY);
    // câble
    g.strokeStyle = '#4a4e69'; g.lineWidth = 6; g.lineCap = 'round';
    g.beginPath(); g.moveTo(0, -110); g.quadraticCurveTo(10, -150, -30, -170); g.stroke();
    Draw.rrect(g, -70, -110, 140, 220, 70); Draw.fillStroke(g, '#e9ecef', '#1a1a1a', 5);
    g.save(); Draw.rrect(g, -70, -110, 140, 220, 70); g.clip();
    const clickL = mode === 'souris' && Math.sin(t * 8) > 0;
    const clickR = right && Math.sin(t * 8 + Math.PI) > 0;
    g.fillStyle = mode === 'souris' ? (clickL ? '#fff' : col) : '#ced4da'; g.fillRect(-70, -110, 68, 95);
    g.fillStyle = right ? (clickR ? '#fff' : '#ef233c') : '#ced4da'; g.fillRect(2, -110, 68, 95);
    g.restore();
    g.fillStyle = '#1a1a1a'; g.fillRect(-3, -110, 6, 95); g.fillRect(-70, -17, 140, 5);
    // molette
    const wheelOn = mode === 'molette';
    Draw.rrect(g, -11, -85, 22, 46, 11); Draw.fillStroke(g, wheelOn ? col : '#6c757d', '#1a1a1a', 3);
    if (wheelOn) {
      g.strokeStyle = '#1a1a1a'; g.lineWidth = 2;
      const off = (t * 40) % 10;
      for (let y = -80 + off; y < -42; y += 10) { g.beginPath(); g.moveTo(-8, y); g.lineTo(8, y); g.stroke(); }
    }
    g.restore();
    // indications animées autour
    if (mode === 'molette') {
      const b = Math.sin(t * 6) * 8;
      Draw.text(g, '▲', cx + 120, cy - 70 - b, 40, col);
      Draw.text(g, '▼', cx + 120, cy - 10 + b, 40, col);
    } else if (mode === 'curseur') {
      g.strokeStyle = col; g.lineWidth = 6; g.setLineDash([10, 10]);
      g.beginPath(); g.ellipse(cx, cy, 150, 60, 0, 0, Math.PI * 2); g.stroke(); g.setLineDash([]);
    } else if (clickL || clickR) {
      // petits traits de "clic" au-dessus du bouton enfoncé
      const sx = clickR ? cx + 35 : cx - 35, sy = cy - 75, dir = clickR ? 1 : -1;
      g.strokeStyle = '#ffe14d'; g.lineWidth = 5; g.lineCap = 'round';
      for (let i = 0; i < 3; i++) {
        const a = -Math.PI / 2 + dir * (0.3 + i * 0.45);
        g.beginPath(); g.moveTo(sx + Math.cos(a) * 60, sy + Math.sin(a) * 60); g.lineTo(sx + Math.cos(a) * 85, sy + Math.sin(a) * 85); g.stroke();
      }
    }
  },

  mic(g, cx, cy, voice, t, col) {
    // ondes sonores
    for (let i = 1; i <= 3; i++) {
      const k = ((t * 1.5 + i / 3) % 1);
      g.globalAlpha = 1 - k;
      g.strokeStyle = col; g.lineWidth = 6;
      for (const s of [-1, 1]) { g.beginPath(); g.arc(cx, cy - 40, 70 + k * 90, s > 0 ? -0.6 : Math.PI - 0.6, s > 0 ? 0.6 : Math.PI + 0.6); g.stroke(); }
    }
    g.globalAlpha = 1;
    // pied
    g.fillStyle = '#4a4e69'; g.fillRect(cx - 6, cy + 40, 12, 60);
    Draw.rrect(g, cx - 60, cy + 95, 120, 18, 9); Draw.fillStroke(g, '#4a4e69', '#1a1a1a', 3);
    g.strokeStyle = '#adb5bd'; g.lineWidth = 8;
    g.beginPath(); g.arc(cx, cy - 10, 55, 0.15, Math.PI - 0.15); g.stroke();
    // capsule
    Draw.rrect(g, cx - 42, cy - 130, 84, 150, 42); Draw.fillStroke(g, '#ced4da', '#1a1a1a', 5);
    g.save(); Draw.rrect(g, cx - 42, cy - 130, 84, 150, 42); g.clip();
    g.strokeStyle = '#6c757d'; g.lineWidth = 2;
    for (let y = cy - 125; y < cy - 30; y += 10) { g.beginPath(); g.moveTo(cx - 42, y); g.lineTo(cx + 42, y); g.stroke(); }
    g.fillStyle = col; g.fillRect(cx - 42, cy - 30, 84, 14);
    g.restore();
    if (voice) {
      Draw.bubble(g, cx + 120, cy - 140, 110, 64, cx + 60, cy - 100);
      Draw.text(g, '« Aa »', cx + 120, cy - 138, 30, '#1a1a1a', null);
    }
  },

  // Coupe un texte en lignes qui tiennent dans maxW
  wrap(g, text, size, maxW) {
    g.font = `${size}px ${FONT}`;
    const lines = [];
    let cur = '';
    // « ! », « ? » et « : » restent collés au mot d'avant
    for (const w of text.replace(/ ([!?:»])/g, ' $1').replace(/« /g, '« ').split(' ')) {
      const test = cur ? cur + ' ' + w : w;
      if (g.measureText(test).width > maxW && cur) { lines.push(cur); cur = w; } else cur = test;
    }
    if (cur) lines.push(cur);
    return lines;
  },

  THUMB: { x: 60, y: 118, w: 480, h: 270 },

  draw(g, game, t, k, drawThumb) {
    const inp = INPUTS[game.input], col = inp.cols[0];
    // fond noir avec une lueur de la couleur du type de contrôle
    g.fillStyle = '#07070d'; g.fillRect(0, 0, W, H);
    const glow = g.createRadialGradient(250, 260, 30, 250, 260, 420);
    glow.addColorStop(0, inp.cols[1] + '55'); glow.addColorStop(1, '#07070d00');
    g.fillStyle = glow; g.fillRect(0, 0, W, H);

    // tout arrive en glissant
    const p = easeOutBack(clamp(t / 0.35, 0, 1));
    g.save();
    g.translate(0, (1 - p) * 50);
    g.globalAlpha *= clamp(t / 0.2, 0, 1);

    // la consigne, en gros
    g.font = `60px ${FONT}`;
    const size = Math.min(60, 60 * 860 / g.measureText(game.instruction).width);
    Draw.text(g, game.instruction, W / 2, 62, size, '#fff', '#000');

    // miniature : le vrai premier plan du mini-jeu à venir (dessinée par le moteur)
    const r = this.THUMB;
    Draw.rrect(g, r.x - 6, r.y - 6, r.w + 12, r.h + 12, 18); Draw.fillStroke(g, col, '#000', 3);
    if (drawThumb) drawThumb(r);
    // petite aide discrète sous la miniature
    if (game.hint) {
      g.font = `20px ${FONT}`;
      const hs = Math.min(20, (20 * r.w) / Math.max(1, g.measureText(game.hint).width));
      Draw.text(g, game.hint, r.x + r.w / 2, r.y + r.h + 32, hs, '#adb5bd', null);
    }

    // appareil à utiliser (à droite)
    const dx = 745, dy = 245;
    g.save();
    g.translate(dx, dy);
    g.scale(0.78, 0.78);
    if (game.input === 'clavier') this.keyboard(g, 0, -10, game, t, col);
    else if (game.input === 'micro') this.mic(g, 0, 0, game.needsVoice, t, col);
    else this.mouse(g, 0, 0, game.input, t, col, /CLIC DROIT/.test(game.hint || ''));
    g.restore();
    Draw.text(g, game.needsVoice ? '🗣️ PARLE' : inp.label, dx, 400, 26, col, '#000');
    g.restore();

    // temps de lecture restant
    Draw.rrect(g, W / 2 - 200, 482, 400, 14, 7); Draw.fillStroke(g, '#1a1a2e', '#2b2d42', 2);
    if (k > 0.01) { Draw.rrect(g, W / 2 - 198, 484, 396 * k, 10, 5); g.fillStyle = col; g.fill(); }
  },
};
