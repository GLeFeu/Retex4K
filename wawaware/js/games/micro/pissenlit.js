// MICRO : souffler toutes les graines du pissenlit
Engine.register({
  id: 'pissenlit', name: 'Pissenlit', icon: '🌼', instruction: 'SOUFFLE !', input: 'micro',
  hint: 'FAIS S\'ENVOLER TOUTES LES GRAINES', duration: 5, needsMic: true, micThreshold: 0.15, CX: 480, CY: 200,

  start(c) {
    const n = 14 + 2 * Math.min(c.diff, 6);
    const seeds = Array.from({ length: n }, (_, i) => ({ a: (i / n) * Math.PI * 2, x: 0, y: 0, vx: 0, vy: 0, free: false }));
    return { t: 0, seeds, acc: 0, lvl: 0, per: 0.07 };
  },

  update(s, dt, c) {
    s.t += dt;
    s.lvl = c.input.mic.level;
    if (!s.won && !c.over && s.lvl > this.micThreshold) {
      s.acc += s.lvl * dt;
      while (s.acc >= s.per) {
        s.acc -= s.per;
        const left = s.seeds.filter(sd => !sd.free);
        if (!left.length) break;
        const sd = left[Math.floor(c.rng() * left.length)];
        sd.free = true;
        sd.x = this.CX + Math.cos(sd.a) * 70; sd.y = this.CY + Math.sin(sd.a) * 70;
        sd.vx = 120 + c.rng() * 200; sd.vy = -60 - c.rng() * 80;
      }
      if (s.seeds.every(sd => sd.free)) s.won = true;
    }
    for (const sd of s.seeds) if (sd.free) { sd.x += sd.vx * dt; sd.y += sd.vy * dt + Math.sin(s.t * 4 + sd.a) * 0.6; }
  },

  draw(s, g) {
    Draw.sky(g, '#a9def9', '#e4f9f5', 420);
    Draw.ground(g, 420, '#80b918', '#55a630');
    g.strokeStyle = '#2d6a4f'; g.lineWidth = 8;
    g.beginPath(); g.moveTo(this.CX, 440); g.quadraticCurveTo(this.CX - 30, 330, this.CX, this.CY); g.stroke();
    Draw.circle(g, this.CX, this.CY, 12); Draw.fillStroke(g, '#ccd5ae', '#1a1a1a', 3);
    for (const sd of s.seeds) {
      const x = sd.free ? sd.x : this.CX + Math.cos(sd.a) * 70, y = sd.free ? sd.y : this.CY + Math.sin(sd.a) * 70;
      const bx = sd.free ? x - 14 : this.CX + Math.cos(sd.a) * 14, by = sd.free ? y + 14 : this.CY + Math.sin(sd.a) * 14;
      g.strokeStyle = 'rgba(80,80,80,0.6)'; g.lineWidth = 2; g.beginPath(); g.moveTo(bx, by); g.lineTo(x, y); g.stroke();
      Draw.circle(g, x, y, 9); g.fillStyle = 'rgba(255,255,255,0.95)'; g.fill();
    }
    Draw.text(g, `${s.seeds.filter(sd => !sd.free).length}`, 860, 60, 44);
  },
});
