// ===== Outils communs des mini-jeux en DUO (deux joueurs de la même équipe) =====
// Chaque joueur simule toute la scène chez lui, avec SA souris et celle de son coéquipier (reçue en
// direct, ~30 fois/s). Le rôle (0 ou 1) dit qui fait quoi. En galerie, le coéquipier est un robot.
const Duo = {
  // les deux joueurs rangés par rôle : [rôle 0, rôle 1]. f = petite info envoyée par le jeu (clic, compteur…)
  paire(c, defaut0 = { x: W * 0.3, y: H / 2 }, defaut1 = { x: W * 0.7, y: H / 2 }) {
    const moi = { x: c.input.x, y: c.input.y, f: null, moi: true };
    const a = c.duo.ami();
    const ami = a ? { x: a.x, y: a.y, f: a.f, moi: false } : { ...(c.duo.role ? defaut0 : defaut1), f: null, moi: false };
    return c.duo.role === 0 ? [moi, ami] : [ami, moi];
  },
  ami(c) { return c.duo.ami() || null; },

  // un "clic" du coéquipier : son compteur f.n a augmenté depuis la dernière fois
  nouveauxClics(s, c, cle = 'clicsAmi') {
    const a = c.duo.ami(), n = a && a.f && a.f.n != null ? a.f.n : 0;
    const avant = s[cle] || 0;
    s[cle] = Math.max(avant, n);
    return Math.max(0, n - avant);
  },

  // main (curseur) en pixels, à la couleur du joueur, avec son nom au-dessus
  main(p, coul, nom) {
    PA.forme((x) => { x.moveTo(p.x, p.y); x.lineTo(p.x, p.y + 26); x.lineTo(p.x + 7, p.y + 19); x.lineTo(p.x + 12, p.y + 30); x.lineTo(p.x + 17, p.y + 28); x.lineTo(p.x + 12, p.y + 17); x.lineTo(p.x + 21, p.y + 17); x.closePath(); }, coul.length === 7 ? coul : '#ffd400');
    if (nom) PA.texte(nom, p.x + 10, p.y - 12, 16, coul, '#1a1222');
  },
  couleurs(c) { return [Engine.myColor ? Engine.myColor() : '#ffd400', c.duo.couleur]; },
  // dessine les deux mains (la mienne + celle du coéquipier)
  mains(c, A, B) {
    const [moiCoul, amiCoul] = this.couleurs(c);
    for (const p of [A, B]) this.main(p, p.moi ? moiCoul : amiCoul, p.moi ? null : c.duo.nom);
  },

  // robot : se rapproche doucement d'une cible (b = état du robot, gardé dans l'état du jeu)
  suivre(b, cx, cy, vitesse, dt) {
    const dx = cx - b.x, dy = cy - b.y, d = Math.hypot(dx, dy);
    if (d > 0.5) { const k = Math.min(1, (vitesse * dt) / d); b.x += dx * k; b.y += dy * k; }
    return b;
  },
  // temps écoulé depuis le dernier appel du robot (le robot est appelé quand le jeu lit le coéquipier)
  dtRobot(s) { const d = Math.max(0, Math.min(0.05, s.t - (s._tr ?? s.t))); s._tr = s.t; return d; },

  // distance d'un point à un segment
  distSeg(px, py, ax, ay, bx, by) {
    const dx = bx - ax, dy = by - ay, l2 = dx * dx + dy * dy || 1;
    const k = clamp(((px - ax) * dx + (py - ay) * dy) / l2, 0, 1);
    return Math.hypot(px - (ax + dx * k), py - (ay + dy * k));
  },
};
