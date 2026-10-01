// CLAVIER (alterner) : marteler ← → pour battre le rival au sprint
Engine.register({
  id: 'course',
  name: 'Sprint',
  icon: '🏃',
  instruction: 'ALTERNE !',
  input: 'clavier',
  hint: '← → ← → (OU Q D Q D) À FOND',
  duration: 5,
  START: 110, FINISH: 830,

  start(c) {
    return { t: 0, need: 16 + 3 * Math.min(c.diff, 6), steps: 0, last: null, run: 0 };
  },

  update(s, dt, c) {
    s.t += dt;
    if (s.won || c.over) return;
    const left = c.input.wasPressed('ArrowLeft', 'KeyA'), right = c.input.wasPressed('ArrowRight', 'KeyD');
    if (left && s.last !== 'L') { s.steps++; s.last = 'L'; c.sfx.tone(320, 0.03, 'square', 0.05); }
    if (right && s.last !== 'R') { s.steps++; s.last = 'R'; c.sfx.tone(380, 0.03, 'square', 0.05); }
    if (s.steps >= s.need) s.won = true;
  },

  draw(s, g, c) {
    g.fillStyle = '#90e0ef'; g.fillRect(0, 0, W, 170);
    // tribune
    g.fillStyle = '#6c757d'; g.fillRect(0, 100, W, 90);
    for (let i = 0; i < 48; i++) {
      Draw.circle(g, 10 + i * 20, 125 + (i % 2) * 30 + Math.sin(s.t * 10 + i) * 3, 9);
      g.fillStyle = ['#ef233c', '#ffd400', '#3a86ff', '#06d6a0'][i % 4]; g.fill();
    }
    g.fillStyle = '#e76f51'; g.fillRect(0, 190, W, H - 190);
    g.strokeStyle = '#fff'; g.lineWidth = 4;
    for (const y of [190, 300, 410, 520]) { g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke(); }
    for (let y = 190; y < 520; y += 20) for (let k = 0; k < 2; k++) {
      g.fillStyle = (y / 20 + k) % 2 ? '#fff' : '#1a1a1a';
      g.fillRect(this.FINISH + k * 14, y, 14, 20);
    }

    const p = Math.min(1, s.steps / s.need);
    const rival = Math.min(1, s.t / c.duration);
    const lerp = (k) => this.START + (this.FINISH - this.START) * k;
    Draw.hero(g, lerp(rival), 285, { run: s.t * 16, shirt: '#adb5bd', pants: '#495057' });
    Draw.hero(g, lerp(p), 395, { run: s.steps * 1.6 });
    Draw.text(g, 'RIVAL', lerp(rival), 200, 22, '#fff');

    const keyBox = (x, label, on) => {
      Draw.rrect(g, x - 40, 440, 80, 70, 12);
      Draw.fillStroke(g, on ? '#ffd400' : '#fff');
      Draw.text(g, label, x, 476, 40, '#1a1a1a', null);
    };
    if (!s.won) {
      keyBox(W / 2 - 60, '←', s.last !== 'L' && Math.floor(s.t * 8) % 2 === 0);
      keyBox(W / 2 + 60, '→', s.last !== 'R' && Math.floor(s.t * 8) % 2 === 0);
    }
  },
});
