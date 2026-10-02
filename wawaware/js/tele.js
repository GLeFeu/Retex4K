// ===== Transition « télé » façon WarioWare =====
// Entre deux mini-jeux : on voit la chambre (décor pixel art), un enfant de dos joue devant une grosse
// télé cathodique posée sur un meuble avec des consoles. Sur l'écran bleu : l'appareil à utiliser
// (souris / clavier / micro), les vies et le numéro du jeu. Puis la caméra plonge dans la télé, la
// consigne s'affiche en gros quelques instants, disparaît, et le mini-jeu démarre.
//
// Images (générées en local puis nettoyées, WebP sans perte) : assets/ia/tele/
// Coordonnées en "gros pixels" : le décor fait 320×180 et s'affiche ×3.
const Tele = (() => {
  const LW = 320, LH = 180;
  const DIR = 'assets/ia/tele/';
  const load = (n) => { const i = new Image(); i.src = DIR + n + '.webp?v=' + WAWAWARE_VERSION; return i; };
  const IM = {};
  // réglages de mise en page (rempli d'après l'image retenue)
  const L = {
    tv: { x: 115, y: 33 },                    // la télé (97×100) : son écran est pile au milieu de l'image
    ecran: { x: 134, y: 53, w: 53, h: 39 },   // l'écran de la télé, dans le décor 320×180
    meuble: { x: 58, y: 128 },                // le meuble (205×117, il dépasse en bas de l'image)
    enfant: { x: 160, y: 181 },               // pieds de l'enfant (milieu bas)
    consoles: [                               // { nom, x, y } : bas-milieu de chaque console
      { nom: 'snes', x: 77, y: 137 }, { nom: 'wii', x: 104, y: 137 },
      { nom: 'playstation', x: 239, y: 137 }, { nom: 'gamecube', x: 239, y: 116 },
      { nom: 'megadrive', x: 228, y: 165 },
    ],
  };
  const ok = (i) => i && i.complete && i.naturalWidth > 0;
  let low, lg;

  function init(layout, images) {
    Object.assign(L, layout);
    for (const n of images) IM[n] = load(n);
  }
  const ready = () => ['chambre', 'tv', 'meuble', 'enfant'].every(n => ok(IM[n]));

  // ----- la chambre en basse résolution, avec ses petites animations -----
  function drawRoom(t, mood, moodT) {
    if (!low) { low = document.createElement('canvas'); low.width = LW; low.height = LH; lg = low.getContext('2d'); }
    lg.imageSmoothingEnabled = false;
    lg.clearRect(0, 0, LW, LH);
    if (ok(IM.chambre)) lg.drawImage(IM.chambre, 8, 6, LW, LH, 0, 0, LW, LH); // décor 336×192 : on garde le centre
    if (ok(IM.meuble)) lg.drawImage(IM.meuble, L.meuble.x, L.meuble.y);
    for (const c of L.consoles) {
      const im = IM[c.nom];
      if (ok(im)) lg.drawImage(im, Math.round(c.x - im.width / 2), Math.round(c.y - im.height));
    }
    if (ok(IM.tv)) lg.drawImage(IM.tv, L.tv.x, L.tv.y);
    // l'enfant : il respire, saute de joie quand on gagne, se tasse quand on perd
    const k = IM.enfant;
    if (ok(k)) {
      let dy = Math.round(Math.sin(t * 3) * 0.6), dx = 0, sy = 1;
      if (mood === true && moodT < 1.2) dy = -Math.round(Math.abs(Math.sin(moodT * 9)) * 8 * (1 - moodT / 1.2));
      if (mood === false && moodT < 1.2) { sy = 0.92; dx = Math.round(Math.sin(moodT * 40) * (moodT < 0.5 ? 2 : 0)); dy = 2; }
      const h = Math.round(k.height * sy);
      lg.drawImage(k, Math.round(L.enfant.x - k.width / 2 + dx), Math.round(L.enfant.y - h + dy), k.width, h);
    }
    // pièce plongée dans le noir : seule la télé éclaire (l'enfant est à contre-jour)
    const s = L.ecran, cx = s.x + s.w / 2, cy = s.y + s.h / 2;
    const vacille = Math.sin(t * 7) * 0.02 + (Math.random() < 0.05 ? 0.04 : 0);
    const nuit = lg.createRadialGradient(cx, cy + 4, s.w * 0.42, cx, cy + 16, s.w * 1.9);
    nuit.addColorStop(0, 'rgba(3,3,12,0)'); nuit.addColorStop(0.3, `rgba(3,3,12,${0.45 - vacille})`); nuit.addColorStop(0.65, `rgba(3,3,12,${0.8 - vacille})`); nuit.addColorStop(1, 'rgba(3,3,12,0.95)');
    lg.fillStyle = nuit; lg.fillRect(0, 0, LW, LH);
    lg.save();
    lg.globalCompositeOperation = 'lighter'; // halo bleuté de l'écran
    const gl = lg.createRadialGradient(cx, cy, s.w * 0.4, cx, cy + 10, s.w * 1.6);
    gl.addColorStop(0, `rgba(80,130,255,${0.22 + vacille})`); gl.addColorStop(1, 'rgba(80,130,255,0)');
    lg.fillStyle = gl; lg.fillRect(0, 0, LW, LH);
    lg.restore();
    return low;
  }

  // ----- ce qu'affiche l'écran, dans un espace virtuel 400×300 (4/3), quelle que soit la taille -----
  const V = { w: 400, h: 300 };
  const REPOS = { x: 56, y: 36, w: 208, h: 117 }; // cadre au repos (16/9) dans le décor 320×180
  function crt(g, t, k = 1) {
    // lignes de balayage, bande qui défile, bords sombres arrondis, reflet
    g.save();
    g.fillStyle = `rgba(0,0,30,${0.22 * k})`;
    for (let y = 0; y < V.h; y += 4) g.fillRect(0, y, V.w, 2);
    const band = ((t * 90) % (V.h + 80)) - 40;
    const bg = g.createLinearGradient(0, band - 30, 0, band + 30);
    bg.addColorStop(0, 'rgba(255,255,255,0)'); bg.addColorStop(0.5, `rgba(255,255,255,${0.06 * k})`); bg.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = bg; g.fillRect(0, band - 30, V.w, 60);
    const vg = g.createRadialGradient(V.w / 2, V.h / 2, V.h * 0.35, V.w / 2, V.h / 2, V.w * 0.68);
    vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, `rgba(0,0,20,${0.55 * k})`);
    g.fillStyle = vg; g.fillRect(0, 0, V.w, V.h);
    g.fillStyle = `rgba(255,255,255,${0.07 * k})`;
    g.beginPath(); g.moveTo(V.w * 0.08, V.h * 0.06); g.lineTo(V.w * 0.42, V.h * 0.06); g.lineTo(V.w * 0.18, V.h * 0.5); g.lineTo(V.w * 0.05, V.h * 0.5); g.closePath(); g.fill();
    g.restore();
  }

  function bleu(g, t) {
    const bgr = g.createLinearGradient(0, 0, 0, V.h);
    bgr.addColorStop(0, '#2f5fe0'); bgr.addColorStop(1, '#1838a8');
    g.fillStyle = bgr; g.fillRect(0, 0, V.w, V.h);
  }

  function neige(g, k) { // parasites (changement de chaîne)
    g.save(); g.globalAlpha = k;
    for (let i = 0; i < 700; i++) { const v = Math.random() * 255 | 0; g.fillStyle = `rgb(${v},${v},${v})`; g.fillRect(Math.random() * V.w, Math.random() * V.h, 6, 3); }
    g.restore();
  }

  // écran d'info : appareil + vies + numéro du jeu (ou un message : PRÊT ?, PLUS VITE !)
  function info(g, t, o) {
    bleu(g, t);
    const game = o.game;
    if (o.titre) Draw.text(g, o.titre, V.w / 2, 30, 36, '#fff', '#0b1a5c');
    if (o.message) {
      const p = 1 + 0.06 * Math.sin(t * 14);
      g.save(); g.translate(V.w / 2, V.h / 2 - 10); g.scale(p, p);
      Draw.text(g, o.message, 0, 0, o.messageTaille || 56, o.messageCouleur || '#ffe14d', '#0b1a5c');
      g.restore();
    } else if (game) {
      const inp = INPUTS[game.input];
      g.save();
      g.translate(V.w / 2, 146);
      g.scale(0.72, 0.72);
      if (game.input === 'clavier') Consigne.keyboard(g, 0, -10, game, t, '#ffe14d');
      else if (game.input === 'micro') Consigne.mic(g, 0, 0, game.needsVoice, t, '#ffe14d');
      else Consigne.mouse(g, 0, 0, game.input, t, '#ffe14d', /CLIC DROIT/.test(game.hint || ''));
      g.restore();
      Draw.text(g, game.needsVoice ? 'PARLE !' : inp.label, V.w / 2, 236, 40, '#ffe14d', '#0b1a5c');
    }
    if (o.vies != null) {
      const n = o.viesMax, sp = Math.min(40, 320 / n);
      for (let i = 0; i < n; i++) {
        const x = V.w / 2 + (i - (n - 1) / 2) * sp, y = 274;
        const plein = i < o.vies, perdu = i === o.vies && o.perdu;
        if (perdu && Math.floor(t * 8) % 2) continue; // le cœur qu'on vient de perdre clignote
        Draw.heart(g, x, y, 32); Draw.fillStroke(g, plein || perdu ? '#ff3c6e' : 'rgba(0,0,40,0.4)', '#0b1a5c', 3);
      }
    }
  }

  // ----- dessin complet : la chambre vue par une caméra qui peut plonger dans l'écran -----
  // cam : 0 = toute la chambre, 1 = l'écran remplit l'image. ecran(g) dessine le contenu dans 400×300.
  function draw(g, { t, cam, ecran, mood = null, moodT = 9 }) {
    const room = drawRoom(t, mood, moodT);
    const s = L.ecran;
    // cadre visé : la largeur de l'écran, au format 16/9, centré sur l'écran
    const tw = s.w, th = s.w * 9 / 16, tx = s.x, ty = s.y + s.h / 2 - th / 2;
    // cadre au repos : la télé en grand avec la tête de l'enfant en bas ; puis on plonge vers l'écran
    const R = REPOS, c = cam;
    const sx = R.x + (tx - R.x) * c, sy = R.y + (ty - R.y) * c, sw = R.w + (tw - R.w) * c, sh = R.h + (th - R.h) * c;
    g.save();
    g.imageSmoothingEnabled = false;
    g.fillStyle = '#000'; g.fillRect(0, 0, W, H);
    g.drawImage(room, sx, sy, sw, sh, 0, 0, W, H);
    // l'écran, à sa place à l'écran
    const kx = W / sw, ky = H / sh;
    const ex = (s.x - sx) * kx, ey = (s.y - sy) * ky, ew = s.w * kx, eh = s.h * ky;
    g.beginPath(); g.rect(ex, ey, ew, eh); g.clip();
    g.translate(ex, ey); g.scale(ew / V.w, eh / V.h);
    g.imageSmoothingEnabled = true;
    ecran(g);
    crt(g, t, 1 - c * 0.6);
    g.restore();
  }

  return { init, ready, draw, info, bleu, crt, neige, V, L, IM };
})();
Tele.init({}, ['chambre', 'tv', 'meuble', 'enfant', 'snes', 'megadrive', 'gamecube', 'wii', 'playstation']);
