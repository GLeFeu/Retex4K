// CLAVIER (lettres) : taper le mot affiché
Engine.register({
  id: 'mot',
  name: 'Tape le mot',
  icon: '🔤',
  instruction: 'TAPE-LE !',
  input: 'clavier',
  hint: 'TAPE LE MOT AU CLAVIER',
  duration: 6,
  WORDS: {
    4: ['CHAT', 'VITE', 'LOUP', 'PAIN', 'BOUM', 'MIAM', 'JEUX', 'NUIT'],
    5: ['PIZZA', 'ROBOT', 'TIGRE', 'POMME', 'FUSEE', 'CRABE', 'NINJA'],
    6: ['BANANE', 'DRAGON', 'PIRATE', 'TOMATE', 'GIRAFE', 'MOUCHE'],
    7: ['FROMAGE', 'CHATEAU', 'LICORNE', 'POUSSIN', 'TORNADE'],
  },

  start(c) {
    const list = this.WORDS[Math.min(7, 4 + Math.floor(c.diff / 2))];
    return { t: 0, word: list[Math.floor(c.rng() * list.length)], i: 0, shake: 0 };
  },

  update(s, dt, c) {
    s.t += dt;
    s.shake = Math.max(0, s.shake - dt);
    if (s.won || c.over) return;
    for (const ch of c.input.typed) {
      if (ch === s.word[s.i]) {
        s.i++;
        c.sfx.tone(500 + s.i * 60, 0.06, 'square', 0.08);
        if (s.i >= s.word.length) { s.won = true; return; }
      } else {
        s.shake = 0.25;
        c.sfx.tone(120, 0.12, 'sawtooth', 0.08);
      }
    }
  },

  draw(s, g) {
    g.fillStyle = '#2d6a4f'; g.fillRect(0, 0, W, H);
    Draw.rrect(g, 60, 50, W - 120, 380, 16); Draw.fillStroke(g, '#1b4332', '#8d5524', 18);
    g.fillStyle = '#8d5524'; g.fillRect(0, 440, W, 100);
    g.fillStyle = 'rgba(255,255,255,0.1)';
    for (let i = 0; i < 6; i++) g.fillRect(120 + i * 130, 80 + (i % 3) * 90, 60, 4);

    const n = s.word.length, size = Math.min(100, 640 / n);
    const sx = s.shake > 0 ? Math.sin(s.shake * 80) * 10 : 0;
    for (let i = 0; i < n; i++) {
      const x = W / 2 + (i - (n - 1) / 2) * (size + 12) + sx;
      Draw.rrect(g, x - size / 2, 180, size, size * 1.2, 12);
      Draw.fillStroke(g, i < s.i ? '#06d6a0' : i === s.i ? '#fff' : 'rgba(255,255,255,0.75)', '#1a1a1a', 4);
      Draw.text(g, s.word[i], x, 180 + size * 0.62, size * 0.8, i < s.i ? '#fff' : '#1a1a1a', null);
      if (i === s.i && Math.floor(s.t * 6) % 2) { g.fillStyle = '#ef233c'; g.fillRect(x - size / 3, 190 + size * 1.25, size * 0.66, 8); }
    }
    Draw.hero(g, 820, 520, { face: -1 });
  },
});
