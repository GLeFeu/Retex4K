// SOURIS : suivre la balle sous les gobelets mélangés
Engine.register({
  id: 'bonneteau', name: 'Bonneteau', icon: '🥤', instruction: 'OÙ EST LA BALLE ?', input: 'souris',
  hint: 'SUIS LE BON GOBELET', duration: 6, cursor: 'pointer', XS: [260, 480, 700],

  start(c) {
    const swaps = [];
    for (let i = 0; i < 3 + Math.min(c.diff, 6); i++) { const a = Math.floor(c.rng() * 3); swaps.push([a, (a + 1 + Math.floor(c.rng() * 2)) % 3]); }
    return { t: 0, pos: [0, 1, 2], ball: Math.floor(c.rng() * 3), swaps, k: 0, st: 0, dur: 0.35, picked: -1 };
  },

  update(s, dt, c) {
    s.t += dt;
    if (s.t < 0.9) return; // on montre la balle
    if (s.k < s.swaps.length) {
      s.st += dt;
      if (s.st >= s.dur) {
        const [a, b] = s.swaps[s.k];
        const ia = s.pos.indexOf(a), ib = s.pos.indexOf(b);
        [s.pos[ia], s.pos[ib]] = [s.pos[ib], s.pos[ia]];
        s.k++; s.st = 0;
      }
      return;
    }
    if (s.picked >= 0 || c.over || !c.input.clicked) return;
    for (let slot = 0; slot < 3; slot++) {
      if (Math.abs(c.input.x - this.XS[slot]) < 80 && c.input.y > 220 && c.input.y < 440) {
        s.picked = s.pos[slot];
        if (s.picked === s.ball) s.won = true; else { s.lost = true; c.sfx.hit(); }
      }
    }
  },

  cupX(s, cup) {
    let x = this.XS[s.pos.indexOf(cup)];
    if (s.k < s.swaps.length && s.t >= 0.9) {
      const [a, b] = s.swaps[s.k];
      if (cup === a || cup === b) {
        const other = cup === a ? b : a, p = s.st / s.dur;
        const x2 = this.XS[s.pos.indexOf(other)];
        return { x: x + (x2 - x) * p, y: Math.sin(p * Math.PI) * (cup === a ? -40 : 40) };
      }
    }
    return { x, y: 0 };
  },

  draw(s, g) {
    g.fillStyle = '#2d6a4f'; g.fillRect(0, 0, W, H);
    Draw.rrect(g, 100, 420, 760, 30, 8); Draw.fillStroke(g, '#7f5539');
    const reveal = s.t < 0.6 || s.picked >= 0;
    for (let cup = 0; cup < 3; cup++) {
      const { x, y } = this.cupX(s, cup);
      if (cup === s.ball && reveal) { Draw.circle(g, x, 400, 22); Draw.fillStroke(g, '#ef233c'); }
      const lift = (reveal && (s.t < 0.6 ? true : cup === s.picked || cup === s.ball)) ? 90 : 0;
      g.beginPath(); g.moveTo(x - 70, 420 - lift + y); g.lineTo(x + 70, 420 - lift + y); g.lineTo(x + 45, 260 - lift + y); g.lineTo(x - 45, 260 - lift + y); g.closePath();
      Draw.fillStroke(g, '#e63946');
      g.fillStyle = '#fff'; g.fillRect(x - 55, 360 - lift + y, 110, 14);
    }
  },
});
