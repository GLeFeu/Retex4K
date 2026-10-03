// DUO (curseur + clic) : le chat dans le grenier noir. L'ÉCLAIREUR tient la lampe torche,
// l'ATTRAPEUR tient la cage : il ne peut attraper le chat que s'il est dans la lumière (clic dessus).
Engine.register({
  id: 'd_lampes', name: 'Le chat dans le noir', icon: '🔦', instruction: 'ATTRAPEZ LE CHAT !', input: 'curseur',
  hint: 'L\'UN ÉCLAIRE, L\'AUTRE ATTRAPE', duration: 8, cursor: 'none', duo: true, R: 110,
  IM: PA.images('d_lampes', ['fond']),
  CHAT: PA.images('commun', ['chat']),

  start(c) {
    const caches = [];
    for (let i = 0; i < 6; i++) caches.push({ x: 120 + c.rng() * 720, y: 200 + c.rng() * 250 });
    return { t: 0, caches, rate: 0 };
  },
  // le chat va de cachette en cachette (ne dépend que du temps : pareil chez les deux joueurs)
  chat(s) {
    const k = s.t / 1.4, i = Math.floor(k) % s.caches.length, j = (i + 1) % s.caches.length, f = clamp((k % 1) * 2.2 - 1.2, 0, 1);
    const p = s.caches[i], q = s.caches[j];
    return { x: p.x + (q.x - p.x) * f, y: p.y + (q.y - p.y) * f, court: f > 0 && f < 1 };
  },
  ghost(s, c) { return Duo.fantome(s, c); },
  bot(s, c) {
    const b = s.bot || (s.bot = { x: 480, y: 300, n: 0, tc: 0 }), dt = Duo.dtRobot(s), ch = this.chat(s);
    if (c.duo.role === 1) { // le robot éclaire : il cherche puis suit le chat
      const vu = Math.hypot(b.x - ch.x, b.y - ch.y) < 280;
      return Duo.suivre(b, vu ? ch.x : 480 + Math.cos(s.t * 0.9) * 360, vu ? ch.y : 300 + Math.sin(s.t * 1.7) * 150, 330, dt);
    }
    // le robot attrapeur : va vers le chat quand il est éclairé, et clique
    const A = s.A || { x: 0, y: 0 }, eclaire = Math.hypot(A.x - ch.x, A.y - ch.y) < this.R;
    if (eclaire) { Duo.suivre(b, ch.x, ch.y, 700, dt); if (Math.hypot(b.x - ch.x, b.y - ch.y) < 25 && s.t - b.tc > 0.4) { b.n++; b.tc = s.t; } }
    return { x: b.x, y: b.y, f: { n: b.n } };
  },

  update(s, dt, c) {
    s.t += dt; s.rate = Math.max(0, s.rate - dt);
    const [A, B] = Duo.paire(c, { x: 300, y: 270 }, { x: 660, y: 270 });
    s.A = A; s.B = B;
    if (s.won) return;
    s.ch = this.chat(s);
    if (!c.over && Duo.clicDe(s, c, 1)) {
      const eclaire = Math.hypot(A.x - s.ch.x, A.y - s.ch.y) < this.R, dessus = Math.hypot(B.x - s.ch.x, B.y - s.ch.y) < 55;
      if (eclaire && dessus) { s.won = true; c.sfx.tone(900, 0.15, 'square', 0.1); } else { s.rate = 0.4; c.sfx.swat(); }
    }
  },

  draw(s, g, c) {
    const l = PA.debut(g, { ...this.IM, ...this.CHAT }, '#3a2a20');
    if (!l) return;
    PA.fond(this.IM.fond);
    const ch = s.ch || this.chat(s);
    PA.spr(this.CHAT.chat, ch.x, ch.y + 40 - (ch.court ? Math.abs(Math.sin(s.t * 14)) * 8 : 0), { ay: 1 });
    const A = s.A || { x: 300, y: 270 }, B = s.B || { x: 660, y: 270 };
    if (!s.won) { // noir partout sauf dans le faisceau de la lampe
      const R = this.R / 3;
      const nuit = this.nuit || (this.nuit = document.createElement('canvas'));
      nuit.width = PA.LW; nuit.height = PA.LH;
      const nx = nuit.getContext('2d'), im = nx.createImageData(PA.LW, PA.LH), d = im.data;
      for (let y = 0; y < PA.LH; y++) for (let x = 0; x < PA.LW; x++) {
        const da = Math.hypot(x - A.x / 3, y - A.y / 3), k = (y * PA.LW + x) * 4;
        if (da < R - 1.5) continue;
        if (da < R) { d[k] = 255; d[k + 1] = 220; d[k + 2] = 140; d[k + 3] = 140; continue; } // liseré chaud du faisceau
        d[k] = 4; d[k + 1] = 4; d[k + 2] = 12; d[k + 3] = 250;
      }
      nx.putImageData(im, 0, 0);
      l.drawImage(nuit, 0, 0);
    } else PA.texte('MIAOU !', ch.x, ch.y - 110, 50, '#ffd400');
    // la cage de l'attrapeur
    PA.cercle(B.x, B.y, 40, '#c9ccd8', 2);
    for (let k = -2; k <= 2; k++) PA.rect(B.x + k * 14 - 1, B.y - 36, 2, 72, 'rgba(201,204,216,0.8)');
    if (s.rate) PA.texte('RATÉ !', B.x, B.y - 60, 26, '#ef233c');
    PA.texte(c.duo.role === 0 ? 'TOI : ÉCLAIRE LE CHAT' : 'TOI : CLIQUE SUR LE CHAT ÉCLAIRÉ', W / 2, 40, 24, '#ffd400');
    Duo.mains(c, A, B);
    PA.fin(g, { lumiere: s.won });
  },
});
