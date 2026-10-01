// Fantômes en multijoueur : pour les jeux où l'on dirige un personnage, on dit ici quelle position
// envoyer aux autres (ghost) et comment la dessiner chez eux (drawGhost), en transparence et à la
// couleur du joueur. Les jeux à la souris / au curseur n'ont rien à déclarer : on montre le curseur.
(() => {
  const HERO_LABEL = (p) => p.y - 105;
  const hero = (g, p, c, opts = {}) => Draw.hero(g, p.x, p.y, { shirt: c, pants: c, ...opts });

  const GHOSTS = {
    saut: { ghost(s) { return { x: this.PX, y: s.py }; }, drawGhost: hero, ghostLabelY: HERO_LABEL },
    sautecorde: { ghost(s) { return { x: this.PX, y: 440 + s.py }; }, drawGhost: hero, ghostLabelY: HERO_LABEL },
    esquive: {
      ghost(s) { return { x: s.px, y: GROUND + s.hy, f: s.face }; },
      drawGhost(g, p, c) { hero(g, p, c, { face: p.f || 1 }); }, ghostLabelY: HERO_LABEL,
    },
    ninja: {
      ghost(s) { return { x: this.PX, y: s.py, f: s.duck ? 1 : 0 }; },
      drawGhost(g, p, c) { g.translate(p.x, p.y); if (p.f) g.scale(1.25, 0.55); Draw.hero(g, 0, 0, { shirt: c, pants: c }); },
      ghostLabelY: HERO_LABEL,
    },
    course: {
      ghost(s) { return { x: this.START + (this.FINISH - this.START) * Math.min(1, s.steps / s.need), y: 395 }; },
      drawGhost(g, p, c) { hero(g, p, c, { run: p.x * 0.1 }); }, ghostLabelY: HERO_LABEL,
    },
    parachute: {
      ghost(s) { return { x: s.x, y: s.y }; },
      drawGhost(g, p, c) {
        g.beginPath(); g.arc(p.x, p.y - 110, 62, Math.PI, 0); g.closePath(); Draw.fillStroke(g, c);
        hero(g, { x: p.x, y: p.y + 10 }, c);
      },
      ghostLabelY: (p) => p.y - 185,
    },
    panier: {
      ghost(s) { return { x: s.bx, y: this.BY }; },
      drawGhost(g, p, c) {
        g.beginPath(); g.moveTo(p.x - 65, p.y - 20); g.lineTo(p.x + 65, p.y - 20); g.lineTo(p.x + 50, p.y + 30); g.lineTo(p.x - 50, p.y + 30); g.closePath();
        Draw.fillStroke(g, c);
      },
      ghostLabelY: (p) => p.y - 40,
    },
    crepe: {
      ghost(s) { return { x: s.px, y: this.PANY }; },
      drawGhost(g, p, c) { Draw.ellipse(g, p.x, p.y + 10, 100, 22); Draw.fillStroke(g, c); },
      ghostLabelY: (p) => p.y - 30,
    },
    flappy: {
      ghost(s) { return { x: this.BX, y: s.by }; },
      drawGhost(g, p, c) { Draw.ellipse(g, p.x, p.y, 22, 18); Draw.fillStroke(g, c); },
    },
    traverse: {
      ghost(s) { return { x: s.x, y: this.rowY(s, s.row) + 10 }; },
      drawGhost(g, p, c) { Draw.ellipse(g, p.x, p.y, 24, 20); Draw.fillStroke(g, c); },
    },
    route: {
      ghost(s) { return { x: this.CX, y: s.cy }; },
      drawGhost(g, p, c) { Draw.rrect(g, p.x - 50, p.y - 26, 100, 52, 16); Draw.fillStroke(g, c); },
      ghostLabelY: (p) => p.y - 40,
    },
    sousmarin: {
      ghost(s) { return { x: this.SX, y: s.y }; },
      drawGhost(g, p, c) { Draw.ellipse(g, p.x, p.y, 70, 32); Draw.fillStroke(g, c); Draw.rrect(g, p.x - 20, p.y - 52, 40, 28, 8); Draw.fillStroke(g, c); },
      ghostLabelY: (p) => p.y - 70,
    },
    invaders: {
      ghost(s) { return { x: s.x, y: this.PY }; },
      drawGhost(g, p, c) { g.beginPath(); g.moveTo(p.x, p.y - 30); g.lineTo(p.x + 34, p.y + 16); g.lineTo(p.x - 34, p.y + 16); g.closePath(); Draw.fillStroke(g, c); },
      ghostLabelY: (p) => p.y - 48,
    },
    atterris: {
      ghost(s) { return { x: 480, y: s.y }; },
      drawGhost(g, p, c) { Draw.ellipse(g, p.x, p.y, 44, 28); Draw.fillStroke(g, c); },
      ghostLabelY: (p) => p.y - 45,
    },
    ascenseur: {
      ghost(s) { return { x: 420, y: this.BASE - (s.f + 1) * this.FH + this.FH / 2 }; },
      drawGhost(g, p, c) { Draw.rrect(g, p.x - 60, p.y - this.FH / 2 + 2, 120, this.FH - 6, 6); Draw.fillStroke(g, c); },
    },
    voilier: {
      ghost(s) { return { x: s.x, y: 340 }; },
      drawGhost(g, p, c) {
        g.beginPath(); g.moveTo(p.x - 80, p.y - 10); g.lineTo(p.x + 80, p.y - 10); g.lineTo(p.x + 55, p.y + 30); g.lineTo(p.x - 55, p.y + 30); g.closePath(); Draw.fillStroke(g, c);
        g.beginPath(); g.moveTo(p.x + 4, p.y - 165); g.quadraticCurveTo(p.x + 80, p.y - 100, p.x + 4, p.y - 25); g.closePath(); Draw.fillStroke(g, c);
      },
      ghostLabelY: (p) => p.y - 185,
    },
    fusee: {
      ghost(s) { return { x: 480, y: 440 - clamp(s.h, 0, 1.05) * 300 }; },
      drawGhost(g, p, c) {
        g.beginPath(); g.moveTo(p.x, p.y - 80); g.quadraticCurveTo(p.x + 34, p.y - 40, p.x + 26, p.y + 34); g.lineTo(p.x - 26, p.y + 34); g.quadraticCurveTo(p.x - 34, p.y - 40, p.x, p.y - 80); g.closePath();
        Draw.fillStroke(g, c);
      },
      ghostLabelY: (p) => p.y - 100,
    },
    plume: {
      ghost(s) { return { x: W / 2 + Math.sin(s.t * 2) * 80, y: s.y }; },
      drawGhost(g, p, c) { Draw.ellipse(g, p.x, p.y, 16, 48, 0.3); Draw.fillStroke(g, c); },
      ghostLabelY: (p) => p.y - 64,
    },
    dedale: {
      ghost(s) {
        const S = s.size, ox = (W - s.cols * S) / 2, oy = (H - s.rows * S) / 2 - 10;
        return { x: ox + (s.p % s.cols + 0.5) * S, y: oy + (Math.floor(s.p / s.cols) + 0.5) * S };
      },
      drawGhost(g, p, c) { Draw.circle(g, p.x, p.y, 16); Draw.fillStroke(g, c); },
    },
    serpent: {
      ghost(s) { const h = s.body[0]; return { x: (W - this.COLS * this.S) / 2 + (h.x + 0.5) * this.S, y: 50 + (h.y + 0.5) * this.S }; },
      drawGhost(g, p, c) { Draw.rrect(g, p.x - 22, p.y - 22, 44, 44, 12); Draw.fillStroke(g, c); },
    },
  };

  for (const [id, extra] of Object.entries(GHOSTS)) {
    const game = Engine.games.find(gm => gm.id === id);
    if (game) Object.assign(game, extra);
  }
})();
