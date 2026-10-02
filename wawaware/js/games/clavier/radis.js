// CLAVIER (← →) : trier les radis de la vidéo. Beau radis → panier, radis moche → poubelle.
// Photos et voix extraites de VID_20260915_171823.mp4 (dossier assets/radis).
(() => {
  const img = (src) => { const i = new Image(); i.src = src; return i; };
  const MEDIA = {
    beau: { img: img('assets/radis/beau.jpg'), voice: 'assets/radis/beau.mp3' },
    moche: { img: img('assets/radis/moche.jpg'), voice: 'assets/radis/moche.mp3' },
  };
  let playing = null;
  const say = (kind) => {
    try {
      if (playing) playing.pause();
      playing = new Audio(MEDIA[kind].voice);
      playing.volume = Sfx.volume;
      playing.play().catch(() => {});
    } catch { /* audio indisponible */ }
  };

  Engine.register({
    id: 'radis',
    name: 'Tri des radis',
    icon: '🌶️',
    instruction: 'TRIE LES RADIS !',
    input: 'clavier',
    hint: '← BEAU (PANIER)   MOCHE (POUBELLE) →',
    duration: 6,
    CX: W / 2,

    start(c) {
      const n = 3 + Math.min(3, Math.floor(c.diff / 2));
      const list = [];
      for (let i = 0; i < n; i++) list.push(c.rng() < 0.5 ? 'beau' : 'moche');
      if (list.every(k => k === list[0])) list[n - 1] = list[0] === 'beau' ? 'moche' : 'beau';
      return {
        t: 0, list, i: 0, x: -200, fly: null, flash: 0,
        belt: 520 + 60 * Math.min(c.diff, 6), // vitesse d'arrivée du radis
      };
    },

    update(s, dt, c) {
      s.t += dt;
      s.flash = Math.max(0, s.flash - dt);
      if (s.fly) {
        s.fly.t += dt;
        s.fly.x += s.fly.vx * dt;
        s.fly.y += s.fly.vy * dt;
        s.fly.vy += 1600 * dt;
        s.fly.rot += s.fly.vr * dt;
        if (s.fly.t > 0.7) s.fly = null;
      }
      if (s.won || s.lost || s.i >= s.list.length) return;
      s.x = Math.min(this.CX, s.x + s.belt * dt);
      if (c.over || s.x < this.CX - 120) return;
      const left = c.input.wasPressed('ArrowLeft', 'KeyA'), right = c.input.wasPressed('ArrowRight', 'KeyD');
      if (!left && !right) return;
      const kind = s.list[s.i];
      const ok = (left && kind === 'beau') || (right && kind === 'moche');
      say(kind);
      s.fly = { kind, x: s.x, y: 250, vx: left ? -700 : 700, vy: -600, rot: 0, vr: left ? -6 : 6, t: 0 };
      if (!ok) { s.lost = true; s.wrong = left ? 'panier' : 'poubelle'; c.sfx.hit(); return; }
      s.flash = 0.2;
      s.i++;
      s.x = -200;
      if (s.i >= s.list.length) s.won = true;
    },

    photo(g, kind, x, y, rot = 0, size = 190) {
      g.save();
      g.translate(x, y);
      g.rotate(rot);
      Draw.rrect(g, -size / 2 - 10, -size / 2 - 10, size + 20, size + 44, 10); Draw.fillStroke(g, '#fff');
      const im = MEDIA[kind].img;
      if (im.complete && im.naturalWidth) g.drawImage(im, -size / 2, -size / 2, size, size);
      else { g.fillStyle = kind === 'beau' ? '#ef233c' : '#9d0208'; g.fillRect(-size / 2, -size / 2, size, size); }
      g.restore();
    },

    draw(s, g) {
      g.fillStyle = '#e9f5db'; g.fillRect(0, 0, W, H);
      g.fillStyle = '#cfe1b9';
      for (let x = 0; x < W; x += 80) g.fillRect(x, 0, 40, 360);
      // tapis roulant
      g.fillStyle = '#495057'; g.fillRect(0, 370, W, 60);
      g.fillStyle = '#6c757d';
      for (let x = -((s.t * 300) % 60); x < W; x += 60) g.fillRect(x, 380, 30, 40);
      for (let x = 30; x < W; x += 120) { Draw.circle(g, x, 440, 18); Draw.fillStroke(g, '#adb5bd'); }
      // panier (gauche) et poubelle (droite)
      g.beginPath(); g.moveTo(20, 300); g.lineTo(200, 300); g.lineTo(180, 420); g.lineTo(40, 420); g.closePath();
      Draw.fillStroke(g, s.wrong === 'panier' ? '#ef233c' : '#d4a373');
      Draw.text(g, '← BEAU', 110, 470, 36, '#06d6a0');
      Draw.rrect(g, W - 190, 300, 150, 130, 10); Draw.fillStroke(g, s.wrong === 'poubelle' ? '#ef233c' : '#6c757d');
      Draw.rrect(g, W - 200, 285, 170, 24, 8); Draw.fillStroke(g, '#495057');
      Draw.text(g, 'MOCHE →', W - 115, 470, 36, '#ef233c');

      if (s.i < s.list.length && !s.lost) this.photo(g, s.list[s.i], s.x, 250, Math.sin(s.t * 6) * 0.04);
      if (s.fly) this.photo(g, s.fly.kind, s.fly.x, s.fly.y, s.fly.rot, 150);
      // compteur
      s.list.forEach((k, j) => {
        Draw.circle(g, W / 2 - (s.list.length - 1) * 22 + j * 44, 40, 14);
        Draw.fillStroke(g, j < s.i ? '#06d6a0' : '#fff', '#1a1a1a', 3);
      });
      if (s.flash > 0) Draw.text(g, 'OK !', W / 2, 110, 50, '#06d6a0');
      if (s.lost) Draw.text(g, 'MAUVAIS TRI !', W / 2, 110, 56, '#ef233c');
    },
  });
})();
