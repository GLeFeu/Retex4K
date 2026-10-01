// CLAVIER (chiffres) : taper le résultat du calcul
Engine.register({
  id: 'calculclavier', name: 'Calculatrice', icon: '➕', instruction: 'CALCULE !', input: 'clavier',
  hint: 'TAPE LE RÉSULTAT AVEC LES CHIFFRES', duration: 6,

  start(c) {
    const max = Math.min(12, 5 + c.diff * 1.5);
    let a = 1 + Math.floor(c.rng() * max), b = 1 + Math.floor(c.rng() * max), op = '+';
    if (c.diff >= 3 && c.rng() < 0.4) { a = 2 + Math.floor(c.rng() * 8); b = 2 + Math.floor(c.rng() * 8); op = '×'; }
    else if (c.diff >= 1 && c.rng() < 0.5) { op = '−'; if (b > a) [a, b] = [b, a]; }
    const ans = op === '+' ? a + b : op === '−' ? a - b : a * b;
    return { t: 0, a, b, op, ans, typed: '' };
  },

  update(s, dt, c) {
    s.t += dt;
    if (s.won || s.lost || c.over) return;
    for (const d of c.input.digits) {
      s.typed += d;
      c.sfx.tone(700, 0.04, 'square', 0.06);
      if (s.typed.length >= String(s.ans).length) {
        if (Number(s.typed) === s.ans) s.won = true; else { s.lost = true; c.sfx.hit(); }
        return;
      }
    }
    if (c.input.wasPressed('Backspace')) s.typed = s.typed.slice(0, -1);
  },

  draw(s, g) {
    g.fillStyle = '#495057'; g.fillRect(0, 0, W, H);
    Draw.rrect(g, 230, 30, 500, 480, 30); Draw.fillStroke(g, '#343a40');
    Draw.rrect(g, 260, 60, 440, 130, 14); Draw.fillStroke(g, s.lost ? '#ffccd5' : '#b7e4c7');
    Draw.text(g, `${s.a} ${s.op} ${s.b} =`, 680, 100, 46, '#1a1a1a', null, 'right');
    const shown = s.typed + (Math.floor(s.t * 3) % 2 && !s.won ? '_' : '');
    Draw.text(g, shown || ' ', 680, 158, 52, '#1a1a1a', null, 'right');
    const keys = ['7', '8', '9', '4', '5', '6', '1', '2', '3', '0'];
    keys.forEach((k, i) => {
      const x = 320 + (i % 3) * 110 + (k === '0' ? 110 : 0), y = 250 + Math.floor(i / 3) * 65;
      Draw.btn(g, x, y, 90, 52, k, s.typed.endsWith(k) ? '#ffd400' : '#e9ecef', 30);
    });
  },
});
