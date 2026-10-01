// MICRO (voix) : dire "attrape" pour que le chien saute attraper le frisbee
Engine.register({
  id: 'attrape',
  name: 'Le frisbee',
  icon: '🥏',
  instruction: 'DIS « ATTRAPE ! »',
  input: 'micro',
  hint: 'CHAQUE FOIS QU\'UN FRISBEE VOLE',
  duration: 7,
  needsMic: true,
  needsVoice: true,
  noSpeedup: true,
  // mots à reconnaître (moteur vocal intégré)
  vocab: ['attrape'],

  start(c) {
    return { t: 0, need: c.diff >= 2 ? 2 : 1, got: 0, fx: 140, fy: 300, flying: true, jumpT: -1, throwT: 0 };
  },

  update(s, dt, c) {
    s.t += dt;
    if (s.jumpT >= 0) s.jumpT += dt;
    if (s.flying) {
      s.throwT += dt;
      // le frisbee plane lentement au-dessus du chien
      s.fx = 140 + Math.min(420, s.throwT * 160) + Math.sin(s.throwT * 2) * 20;
      s.fy = 250 + Math.sin(s.throwT * 1.6) * 40;
    }
    if (s.jumpT > 0.9) {
      s.jumpT = -1;
      if (s.got < s.need) { s.flying = true; s.throwT = 0; c.clearHeard(); }
    }
    if (s.won || c.over || !s.flying) return;
    if (Voice.match(c.heard(), [WORDS.attrape]) === 0) {
      s.flying = false;
      s.jumpT = 0;
      s.got++;
      c.clearHeard();
      c.sfx.jump();
      if (s.got >= s.need) s.won = true;
    }
  },

  draw(s, g) {
    Draw.sky(g, '#ffd6a5', '#fdffb6', 400);
    Draw.cloud(g, 300, 90); Draw.cloud(g, 820, 60, 0.7);
    Draw.ground(g, 400, '#80b918', '#55a630');
    Draw.hero(g, 100, 470, {});
    const jump = s.jumpT >= 0 && s.jumpT < 0.7;
    const dx = 600;
    Draw.dog(g, dx, 470, { pose: jump ? 'saute' : 'debout', t: s.t, face: -1 });
    let fx = s.fx, fy = s.fy;
    if (!s.flying) { fx = dx - 70; fy = jump ? 300 : 375; } // dans la gueule
    if (s.flying || jump) {
      Draw.ellipse(g, fx, fy, 34, 10); Draw.fillStroke(g, '#ef233c');
      Draw.ellipse(g, fx, fy - 2, 18, 4); g.fillStyle = '#ff8fa3'; g.fill();
    }
    Draw.text(g, `${s.got} / ${s.need}`, W - 90, 100, 40);
  },
});
