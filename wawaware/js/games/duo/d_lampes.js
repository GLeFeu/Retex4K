// DUO (curseur) : deux lampes torches dans le grenier. Le chat n'apparaît que là où les DEUX lumières se croisent.
Engine.register({
  id: 'd_lampes', name: 'Deux lampes', icon: '🔦', instruction: 'TROUVEZ LE CHAT !', input: 'curseur',
  hint: 'CROISEZ VOS LUMIÈRES SUR LE CHAT', duration: 7, cursor: 'none', duo: true, R: 95,
  IM: PA.images('d_lampes', ['fond']),
  CHAT: PA.images('commun', ['chat']),

  start(c) { return { t: 0, cx: 140 + c.rng() * 680, cy: 180 + c.rng() * 280, vu: 0 }; },
  ghost(s, c) { return { x: c.input.x, y: c.input.y }; },
  bot(s, c) { // robot : fouille en balayant, et se rapproche du chat quand il passe près
    const b = s.bot || (s.bot = { x: 700, y: 300 });
    const proche = Math.hypot(b.x - s.cx, b.y - s.cy) < 260;
    return Duo.suivre(b, proche ? s.cx : 480 + Math.cos(s.t * 0.9) * 360, proche ? s.cy : 300 + Math.sin(s.t * 1.7) * 170, 300, Duo.dtRobot(s));
  },

  update(s, dt, c) {
    s.t += dt;
    const [A, B] = Duo.paire(c);
    s.A = A; s.B = B;
    if (s.won || c.over) return;
    const dans = (p) => Math.hypot(p.x - s.cx, p.y - s.cy) < this.R * 0.8;
    s.vu = dans(A) && dans(B) ? s.vu + dt : Math.max(0, s.vu - dt * 0.5);
    if (s.vu > 0.6) { s.won = true; c.sfx.tone(900, 0.15, 'square', 0.1); }
  },

  draw(s, g, c) {
    const l = PA.debut(g, { ...this.IM, ...this.CHAT }, '#3a2a20');
    if (!l) return;
    PA.fond(this.IM.fond);
    PA.spr(this.CHAT.chat, s.cx, s.cy + 40, { ay: 1 });
    const A = s.A || { x: 300, y: 270 }, B = s.B || { x: 660, y: 270 };
    if (!s.won) { // noir partout, demi-ombre dans une seule lumière, net là où elles se croisent
      const R = this.R / 3;
      const nuit = this.nuit || (this.nuit = document.createElement('canvas'));
      nuit.width = PA.LW; nuit.height = PA.LH;
      const nx = nuit.getContext('2d'), im = nx.createImageData(PA.LW, PA.LH), d = im.data;
      for (let y = 0; y < PA.LH; y++) for (let x = 0; x < PA.LW; x++) {
        const da = Math.hypot(x - A.x / 3, y - A.y / 3), db = Math.hypot(x - B.x / 3, y - B.y / 3), a = da < R, b = db < R;
        if (a && b) continue;
        const k = (y * PA.LW + x) * 4, bord = (a && da > R - 1.5) || (b && db > R - 1.5);
        if (bord) { d[k] = 255; d[k + 1] = 220; d[k + 2] = 140; d[k + 3] = 140; continue; } // liseré chaud du faisceau
        d[k] = 4; d[k + 1] = 4; d[k + 2] = 12; d[k + 3] = a || b ? 150 : 250;
      }
      nx.putImageData(im, 0, 0);
      l.drawImage(nuit, 0, 0);
    } else PA.texte('MIAOU !', s.cx, s.cy - 110, 50, '#ffd400');
    Duo.mains(c, A, B);
    PA.fin(g, { lumiere: s.won });
  },
});
