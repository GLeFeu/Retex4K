// SOURIS : « Écrase les mouches » (2 mouches), ESSAI IMAGES IA (galerie uniquement).
// Décor, mouche, tapette et tache générés en local (SDXL + LoRA Pixel Art XL, dossier ia/), nettoyés en
// vrai pixel art (grille 320×180 affichée ×3). Animation "par morceaux" dans le code : les ailes de la
// mouche sont des images séparées qui battent, le corps tangue et suit la direction du vol ; la tache
// éclate puis dégouline (gouttes, traînées, flaques) en pixels dessinés par le code.
(() => {
  const A = Engine.games.find(g => g.id === 'mouche');
  const K = 3, LW = W / K, LH = H / K, SOL = 170; // SOL : hauteur du plancher (basse résolution)
  const DIR = 'assets/ia/mouche/';
  const img = (n) => { const i = new Image(); i.src = DIR + n + '.png?v=' + WAWAWARE_VERSION; return i; };
  const IM = { fond: img('fond'), corps: img('mouche_corps'), ailG: img('mouche_aile_g'), ailD: img('mouche_aile_d'), tapette: img('tapette'), tache: img('tache') };
  const ok = () => Object.values(IM).every(i => i.complete && i.naturalWidth > 0);
  const GOO = ['#1d3d1a', '#2f6b25', '#5aa83a', '#a6e05a', '#e4f88c'];
  const px = (l, x, y, c) => { l.fillStyle = c; l.fillRect(Math.round(x), Math.round(y), 1, 1); };
  const FONT5 = {
    S: ['01111', '10000', '10000', '01110', '00001', '00001', '11110'], P: ['11110', '10001', '10001', '11110', '10000', '10000', '10000'],
    L: ['10000', '10000', '10000', '10000', '10000', '10000', '11111'], A: ['01110', '10001', '10001', '11111', '10001', '10001', '10001'],
    T: ['11111', '00100', '00100', '00100', '00100', '00100', '00100'], '!': ['1', '1', '1', '1', '1', '0', '1'],
  };

  Engine.register({
    ...A,
    id: 'moucheia',
    name: 'Écrase les mouches (images IA)',
    apercu: true,
    pixel: false,

    instruction: 'ÉCRASE-LES !',
    hint: 'ÉCRASE LES 2 MOUCHES',
    duration: 6,
    NB: 2, // nombre de mouches

    start(c) {
      const d = Math.min(c.diff, 8);
      const flies = Array.from({ length: this.NB }, (_, i) => ({
        x: 160 + i * (640 / Math.max(1, this.NB - 1)) * 0.9 + c.rng() * 80, y: 110 + c.rng() * 220,
        vx: 0, vy: 0, dirT: 0, ph: i * 1.7 + c.rng(), t: 0, splat: null, splatT: 0, goo: null,
      }));
      return { t: 0, swat: 0, whoosh: [], flies, lastSplat: null, sp: 230 + 40 * d, flee: 250 + 110 * d };
    },

    // même vol que la mouche du jeu de base, pour chaque mouche
    moveFly(f, s, dt, c) {
      const inp = c.input;
      f.dirT -= dt;
      if (f.dirT <= 0) { const a = c.rng() * Math.PI * 2; f.vx = Math.cos(a) * s.sp; f.vy = Math.sin(a) * s.sp; f.dirT = 0.15 + c.rng() * 0.4; }
      const dx = f.x - inp.x, dy = f.y - inp.y, d = Math.hypot(dx, dy) || 1;
      if (d < 150) { f.vx += (dx / d) * s.flee * 4 * dt; f.vy += (dy / d) * s.flee * 4 * dt; }
      const v = Math.hypot(f.vx, f.vy), max = s.sp * 1.5;
      if (v > max) { f.vx *= max / v; f.vy *= max / v; }
      f.x += f.vx * dt; f.y += f.vy * dt;
      if (f.x < 50) { f.x = 50; f.vx = Math.abs(f.vx); }
      if (f.x > W - 50) { f.x = W - 50; f.vx = -Math.abs(f.vx); }
      if (f.y < 50) { f.y = 50; f.vy = Math.abs(f.vy); }
      if (f.y > H - 140) { f.y = H - 140; f.vy = -Math.abs(f.vy); }
    },

    update(s, dt, c) {
      const inp = c.input;
      s.t += dt;
      s.swat = Math.max(0, s.swat - dt);
      for (const w of s.whoosh) w.t += dt;
      s.whoosh = s.whoosh.filter(w => w.t < 0.25);
      for (const f of s.flies) {
        f.t = s.t + f.ph;
        if (f.splat) { f.splatT += dt; this.updateGoo(f, dt); } else if (!s.won) this.moveFly(f, s, dt, c);
      }
      if (s.won || !inp.clicked || c.over) return;
      s.swat = 0.15;
      let hit = null, best = 55;
      for (const f of s.flies) if (!f.splat) { const d = Math.hypot(inp.x - f.x, inp.y - f.y); if (d < best) { best = d; hit = f; } }
      if (hit) {
        hit.splat = true; hit.splatT = 0; this.initGoo(hit, c); s.lastSplat = hit;
        c.sfx.splat();
        if (s.flies.every(f => f.splat)) s.won = true;
      } else { c.sfx.swat(); s.whoosh.push({ x: inp.x, y: inp.y, t: 0 }); }
    },

    initGoo(s, c) {
      const cx = s.x / K, cy = s.y / K, r = c.rng;
      s.goo = {
        cx, cy,
        // gouttes projetées : elles volent, se collent au mur puis glissent en laissant une traînée
        drops: Array.from({ length: 22 }, () => { const a = r() * Math.PI * 2, v = 40 + r() * 110; return { x: cx, y: cy, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 25, t: 0, stick: 0.1 + r() * 0.25, stuck: false, big: r() < 0.35, trail: [] }; }),
        // coulures sous la tache : elles s'allongent puis lâchent une goutte
        tend: [-9, -4, 1, 6, 10].map(dx => ({ dx, len: 0, max: 8 + r() * 22, sp: 4 + r() * 8, dropped: false })),
        falling: [], splash: [], puddles: [],
      };
    },

    updateGoo(s, dt) {
      const G = s.goo;
      const splash = (x) => { for (let i = 0; i < 4; i++) G.splash.push({ x, y: SOL - 1, vx: (i - 1.5) * 18, vy: -35 - (i % 2) * 20, life: 0.4 }); G.puddles.push({ x, w: 1 + (G.puddles.length % 3) }); };
      for (const d of G.drops) {
        d.t += dt;
        if (!d.stuck) {
          d.vy += 260 * dt; d.x += d.vx * dt; d.y += d.vy * dt;
          if (d.y >= SOL) { d.y = SOL; d.stuck = true; splash(d.x); } else if (d.t > d.stick) d.stuck = true;
        } else if (d.y < SOL - 1) {
          d.y += (3 + (d.big ? 3 : 0)) * dt;
          const k = Math.round(d.x) + ',' + Math.round(d.y);
          if (d.trail[d.trail.length - 1] !== k) d.trail.push(k);
          if (d.trail.length > 24) d.trail.shift();
        }
      }
      for (const tn of G.tend) {
        tn.len = Math.min(tn.max, tn.len + tn.sp * dt * (1.2 - tn.len / tn.max * 0.6));
        if (!tn.dropped && tn.len >= tn.max) { tn.dropped = true; G.falling.push({ x: G.cx + tn.dx, y: G.cy + 9 + tn.len, vy: 0 }); tn.len *= 0.55; tn.max *= 0.9; tn.sp *= 0.4; }
      }
      for (const f of G.falling) { f.vy += 260 * dt; f.y += f.vy * dt; if (f.y >= SOL && !f.done) { f.done = true; splash(f.x); } }
      for (const p of G.splash) { p.vy += 260 * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt; }
      G.splash = G.splash.filter(p => p.life > 0);
    },

    drawFly(l, s) {
      const fx = Math.round(s.x / K), fy = Math.round(s.y / K + Math.sin(s.t * 18));
      const w = IM.corps.width, h = IM.corps.height;
      // ombre portée sur le mur (tramée)
      for (let y = -3; y <= 3; y++) for (let x = -9; x <= 9; x++) if ((x * x) / 81 + (y * y) / 9 < 1 && (x + y) % 2 === 0) px(l, fx + 7 + x, fy + 15 + y, 'rgba(40,15,40,0.4)');
      l.save();
      l.translate(fx, fy);
      l.rotate(Math.atan2(s.vy, s.vx) + Math.PI / 2 + Math.sin(s.t * 9) * 0.08); // la mouche regarde où elle va, en tanguant
      l.translate(-Math.round(w / 2), -Math.round(h / 2));
      l.drawImage(IM.corps, 0, 0);
      // ailes : 3 positions qui alternent vite (battement), + une "trace" transparente
      const frame = Math.floor(s.t * 36) % 4, ang = [0.15, -0.35, -0.75, -0.35][frame];
      const wing = (im, side, a, alpha) => {
        l.save(); l.globalAlpha = alpha;
        const rx = w / 2 + side * 3, ry = 11; // racine de l'aile, sur le dos
        l.translate(rx, ry); l.rotate(side * a); l.translate(-rx, -ry);
        l.drawImage(im, 0, 0); l.restore();
      };
      wing(IM.ailG, -1, ang + 0.5, 0.3); wing(IM.ailD, 1, ang + 0.5, 0.3);
      wing(IM.ailG, -1, ang, 0.9); wing(IM.ailD, 1, ang, 0.9);
      l.restore();
    },

    drawSplat(l, s) {
      const G = s.goo, cx = Math.round(G.cx), cy = Math.round(G.cy);
      for (const pd of G.puddles) for (let i = -pd.w - 1; i <= pd.w + 1; i++) { px(l, pd.x + i, SOL, GOO[2]); if (Math.abs(i) <= pd.w) px(l, pd.x + i, SOL + 1, GOO[1]); }
      for (const d of G.drops) for (const k of d.trail) { const [x, y] = k.split(',').map(Number); px(l, x, y, 'rgba(70,140,40,0.55)'); }
      // la tache "éclate" : elle grandit d'un coup avec un petit rebond
      const p = Math.min(1, s.splatT / 0.12), sc = p < 1 ? p * 1.25 : 1;
      const tw = Math.round(IM.tache.width * sc), th = Math.round(IM.tache.height * sc);
      if (tw > 0) l.drawImage(IM.tache, cx - Math.round(tw / 2), cy - Math.round(th * 0.45), tw, th);
      // restes de la mouche écrasée, aplatie et assombrie
      l.save(); l.globalAlpha = 0.85; l.filter = 'brightness(0.55)';
      const w = IM.corps.width, h = IM.corps.height;
      l.drawImage(IM.corps, cx - Math.round(w * 0.35), cy - 3, Math.round(w * 0.7), Math.round(h * 0.35));
      l.restore();
      for (const tn of G.tend) {
        for (let y = 0; y < tn.len; y++) { px(l, cx + tn.dx, cy + 9 + y, GOO[2]); if (y < tn.len - 2) px(l, cx + tn.dx + 1, cy + 9 + y, GOO[1]); }
        const by = cy + 9 + Math.round(tn.len);
        px(l, cx + tn.dx, by, GOO[3]); px(l, cx + tn.dx + 1, by, GOO[2]); px(l, cx + tn.dx, by + 1, GOO[2]); px(l, cx + tn.dx + 1, by + 1, GOO[1]);
      }
      for (const d of G.drops) { px(l, d.x, d.y, GOO[3]); if (d.big) { px(l, d.x + 1, d.y, GOO[2]); px(l, d.x, d.y + 1, GOO[2]); px(l, d.x, d.y - 1, GOO[4]); } }
      for (const f of G.falling) if (!f.done) { px(l, f.x, f.y - 1, GOO[2]); px(l, f.x, f.y, GOO[3]); px(l, f.x, f.y + 1, GOO[4]); }
      for (const q of G.splash) px(l, q.x, q.y, GOO[3]);
      // "SPLAT!" en lettres pixel qui rebondissent
      const amp = Math.max(0, 1 - s.splatT * 1.2);
      let x0 = cx - 24;
      [...'SPLAT!'].forEach((ch, i) => {
        const gl = FONT5[ch], by = Math.max(4, cy - 36) - Math.round(Math.abs(Math.sin(s.splatT * 12 + i * 0.7)) * 6 * amp);
        for (const [ox, oy, col] of [[1, 1, GOO[0]], [0, 0, null]]) gl.forEach((row, j) => [...row].forEach((b, k) => {
          if (b === '1') { l.fillStyle = col || GOO[j < 2 ? 4 : j < 5 ? 3 : 2]; l.fillRect(x0 + k * 2 + ox, by + j * 2 + oy, 2, 2); }
        }));
        x0 += gl[0].length * 2 + 2;
      });
    },

    draw(s, g, c) {
      if (!ok()) { g.fillStyle = '#5a3a55'; g.fillRect(0, 0, W, H); return; } // images pas encore chargées
      const low = this._low || (this._low = Object.assign(document.createElement('canvas'), { width: LW, height: LH }));
      const l = low.getContext('2d');
      l.imageSmoothingEnabled = false;
      l.drawImage(IM.fond, 8, 6, LW, LH, 0, 0, LW, LH);
      // grains de poussière qui flottent dans la lumière
      for (let i = 0; i < 14; i++) {
        const x = (i * 53 + Math.sin(s.t * 0.6 + i) * 10 + s.t * 3) % LW, y = 20 + (i * 37 + s.t * (2 + i % 3)) % 120;
        if ((Math.floor(s.t * 3) + i) % 4) px(l, x, y, 'rgba(255,240,210,0.7)');
      }
      for (const w of s.whoosh) { // souffle d'air quand on rate
        const r = 6 + w.t * 50, cx = w.x / K, cy = w.y / K;
        for (let a = -0.7; a < 0.7; a += 0.15) px(l, cx + Math.cos(a - 1.7) * r, cy + Math.sin(a - 1.7) * r, `rgba(255,250,235,${1 - w.t / 0.25})`);
      }
      for (const f of s.flies) if (f.splat) this.drawSplat(l, f);
      for (const f of s.flies) if (!f.splat) this.drawFly(l, f);
      // tapette : la tête du filet est sous le curseur ; écrasée pendant le coup
      const tp = IM.tapette, mx = Math.round(c.input.x / K), my = Math.round(c.input.y / K);
      if (s.swat > 0) { l.globalAlpha = 0.35; l.drawImage(tp, mx - 12, my - 22); l.globalAlpha = 1; l.drawImage(tp, mx - 13, my - 9, tp.width + 2, Math.round(tp.height * 0.88)); }
      else l.drawImage(tp, mx - 12, my - 13);

      const ls = s.lastSplat, shake = ls && ls.splatT < 0.22 ? Math.round(Math.sin(ls.splatT * 90) * 4) : 0;
      g.save();
      g.imageSmoothingEnabled = false;
      g.drawImage(low, shake, 0, W, H);
      // lumière douce par-dessus (halo chaud + coins légèrement violets)
      g.globalCompositeOperation = 'multiply';
      const v = g.createRadialGradient(W / 2, H * 0.35, 200, W / 2, H * 0.4, 700);
      v.addColorStop(0, '#ffffff'); v.addColorStop(1, '#d8c8e6');
      g.fillStyle = v; g.fillRect(0, 0, W, H);
      g.globalCompositeOperation = 'lighter';
      const gl = g.createRadialGradient(W * 0.72, H * 0.2, 10, W * 0.72, H * 0.2, 380);
      gl.addColorStop(0, 'rgba(255,220,160,0.14)'); gl.addColorStop(1, 'rgba(255,220,160,0)');
      g.fillStyle = gl; g.fillRect(0, 0, W, H);
      g.globalCompositeOperation = 'source-over';
      if (ls && ls.splatT < 0.07) { g.fillStyle = `rgba(255,255,230,${0.5 * (1 - ls.splatT / 0.07)})`; g.fillRect(0, 0, W, H); }
      g.restore();
    },
  });
})();
