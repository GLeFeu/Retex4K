// MICRO (voix) : dire au chien l'ordre affiché (assis, couché, saute, donne la patte)
Engine.register({
  id: 'dresse',
  name: 'Dresse le chien',
  icon: '🐕',
  instruction: 'DONNE L\'ORDRE !',
  input: 'micro',
  hint: 'DIS L\'ORDRE À VOIX HAUTE',
  duration: 7,
  needsMic: true,
  needsVoice: true,
  noSpeedup: true,
  // mots à reconnaître (moteur vocal intégré)
  vocab: ['assis', 'couché', 'saute', 'donne la patte'],
  CMDS: [
    { key: 'assis', label: 'ASSIS !', pose: 'assis' },
    { key: 'couche', label: 'COUCHÉ !', pose: 'couche' },
    { key: 'saute', label: 'SAUTE !', pose: 'saute' },
    { key: 'patte', label: 'LA PATTE !', pose: 'patte' },
  ],

  start(c) {
    const n = c.diff >= 2 ? 2 : 1, order = [];
    while (order.length < n) { const k = Math.floor(c.rng() * this.CMDS.length); if (!order.includes(k)) order.push(k); }
    return { t: 0, order, i: 0, pose: 'debout', poseT: 0, confused: 0 };
  },

  update(s, dt, c) {
    s.t += dt;
    s.poseT += dt;
    s.confused = Math.max(0, s.confused - dt);
    if (s.pose === 'saute' && s.poseT > 0.7) s.pose = 'debout';
    if (s.won || c.over) return;
    const text = c.heard();
    const want = this.CMDS[s.order[s.i]];
    if (Voice.match(text, [WORDS[want.key]]) === 0) {
      s.pose = want.pose;
      s.poseT = 0;
      s.i++;
      c.clearHeard();
      c.sfx.tone(700, 0.1, 'square', 0.1);
      c.sfx.tone(900, 0.12, 'square', 0.1, 0.1);
      if (s.i >= s.order.length) s.won = true;
    } else if (Voice.match(text, this.CMDS.map(cm => WORDS[cm.key])) >= 0) {
      s.confused = 1; // il a entendu un autre ordre : le chien penche la tête
      c.clearHeard();
    }
  },

  draw(s, g) {
    Draw.sky(g, '#a2d2ff', '#e0fbfc', 380);
    Draw.cloud(g, 160, 80); Draw.cloud(g, 700, 120, 0.8);
    g.fillStyle = '#95d5b2'; g.fillRect(0, 300, W, 100);
    Draw.ground(g, 380, '#74c69d', '#52b788');
    Draw.hero(g, 150, 470, {});
    const want = this.CMDS[s.order[Math.min(s.i, s.order.length - 1)]];
    if (!s.won) {
      Draw.bubble(g, 230, 170, 300, 90, 175, 245);
      Draw.text(g, want.label, 230, 172, 46, '#ef233c', null);
    }
    if (s.order.length > 1) {
      s.order.forEach((k, j) => Draw.btn(g, 660 + j * 150, 60, 130, 44, this.CMDS[k].label.replace(' !', ''), j < s.i ? '#06d6a0' : '#fff', 22));
    }
    Draw.dog(g, 560, 470, { pose: s.pose, t: s.t, face: -1 });
    if (s.confused > 0) Draw.text(g, '?', 470, 280, 70, '#ffd400');
    if (s.won) Draw.text(g, '♥', 520, 250 - s.poseT * 40, 60, '#ff3c6e');
  },
});
