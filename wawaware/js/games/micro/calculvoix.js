// MICRO (voix) : dire le résultat du calcul
Engine.register({
  id: 'calculvoix',
  name: 'Calcul mental',
  icon: '🧮',
  instruction: 'CALCULE !',
  input: 'micro',
  hint: 'DIS LE RÉSULTAT',
  duration: 7,
  needsMic: true,
  needsVoice: true,
  noSpeedup: true,
  // mots à reconnaître (moteur vocal intégré)
  vocab: [],

  start(c) {
    const max = Math.min(10, 5 + c.diff);
    let a = 1 + Math.floor(c.rng() * max), b = 1 + Math.floor(c.rng() * max), op = '+';
    if (c.diff >= 2 && c.rng() < 0.5) { op = '-'; if (b > a) [a, b] = [b, a]; }
    return { t: 0, a, b, op, ans: op === '+' ? a + b : a - b };
  },

  update(s, dt, c) {
    s.t += dt;
    if (!s.won && !c.over && Voice.numbers(c.heard()).has(s.ans)) s.won = true;
  },

  draw(s, g) {
    g.fillStyle = '#264653'; g.fillRect(0, 0, W, H);
    Draw.rrect(g, 120, 110, 720, 300, 20); Draw.fillStroke(g, '#2a9d8f', '#e9c46a', 14);
    Draw.text(g, `${s.a} ${s.op} ${s.b} = ${s.won ? s.ans : '?'}`, W / 2, 260, 120, s.won ? '#ffd400' : '#fff');
    for (let i = 0; i < 12; i++) Draw.text(g, ['+', '−', '×', '÷'][i % 4], (i * 173) % W, 470 + (i % 2) * 30, 30, 'rgba(255,255,255,0.25)', null);
  },
});
