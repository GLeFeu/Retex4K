// MICRO (dosage) : souffler DOUCEMENT pour gonfler la bulle, trop fort elle éclate
Engine.register({
  id: 'bulle', name: 'Bulle de savon', icon: '🫧', instruction: 'DOUCEMENT…', input: 'micro',
  hint: 'SOUFFLE DOUX, PAS TROP FORT !', duration: 5, needsMic: true, micThreshold: 0.12, micMax: 0.7,

  start(c) { return { t: 0, size: 0, lvl: 0, over: 0, need: 1, rate: 0.55 - 0.03 * Math.min(c.diff, 6) }; },

  update(s, dt, c) {
    s.t += dt;
    s.lvl = c.input.mic.level;
    if (s.won || s.lost || c.over) return;
    if (s.lvl > this.micMax) { s.over += dt; if (s.over > 0.12) { s.lost = true; c.sfx.pop(); } }
    else s.over = 0;
    if (s.lvl > this.micThreshold && s.lvl <= this.micMax) s.size += s.rate * dt;
    if (s.size >= s.need) { s.won = true; c.sfx.tone(900, 0.2, 'sine', 0.1); }
  },

  draw(s, g) {
    Draw.sky(g, '#b8c0ff', '#e7c6ff');
    // anneau à bulles
    g.strokeStyle = '#1a1a1a'; g.lineWidth = 12;
    g.beginPath(); g.moveTo(330, 540); g.lineTo(390, 330); g.stroke();
    g.strokeStyle = '#ff6b9d'; g.lineWidth = 6; g.stroke();
    Draw.circle(g, 400, 290, 40); g.lineWidth = 10; g.strokeStyle = '#1a1a1a'; g.stroke(); g.lineWidth = 6; g.strokeStyle = '#ff6b9d'; g.stroke();
    if (s.lost) {
      for (let i = 0; i < 12; i++) { const a = i * 0.52; Draw.circle(g, 560 + Math.cos(a) * 120, 230 + Math.sin(a) * 120, 6); g.fillStyle = 'rgba(160,200,255,0.8)'; g.fill(); }
      Draw.text(g, 'PLOP…', 560, 230, 60, '#fff');
      return;
    }
    const r = 30 + s.size * 150, wob = Math.sin(s.t * 8) * 4 * (1 + s.lvl * 3);
    const cx = 400 + r * 0.9, cy = 290 - r * 0.25;
    const gr = g.createRadialGradient(cx - r * 0.3, cy - r * 0.3, 2, cx, cy, r);
    gr.addColorStop(0, 'rgba(255,255,255,0.8)'); gr.addColorStop(0.7, 'rgba(180,220,255,0.25)'); gr.addColorStop(1, 'rgba(255,150,220,0.5)');
    Draw.ellipse(g, cx, cy, r + wob, r - wob); g.fillStyle = gr; g.fill();
    g.lineWidth = 3; g.strokeStyle = 'rgba(255,255,255,0.9)'; g.stroke();
    if (s.won) Draw.text(g, 'MAGNIFIQUE !', W / 2, 80, 56, '#fff');
  },
});
