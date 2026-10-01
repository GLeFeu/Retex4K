// MOLETTE (haut/bas) : garder la température de la serre dans la zone verte
Engine.register({
  id: 'thermostat', name: 'Thermostat', icon: '🌡️', instruction: 'BONNE TEMPÉRATURE !', input: 'molette',
  hint: 'MOLETTE ↑ CHAUFFE · ↓ REFROIDIT', duration: 5, survival: true,

  start(c) { return { t: 0, temp: 0.5, drift: 0, out: 0, chaos: 0.25 + 0.05 * Math.min(c.diff, 6), zone: Math.max(0.12, 0.2 - 0.01 * c.diff), nextT: 0 }; },

  update(s, dt, c) {
    s.t += dt;
    if (s.lost) return;
    s.nextT -= dt;
    if (s.nextT <= 0) { s.drift = (c.rng() < 0.5 ? -1 : 1) * s.chaos * (0.5 + c.rng()); s.nextT = 0.6 + c.rng() * 0.6; }
    s.temp += s.drift * dt;
    if (!c.over) s.temp -= c.input.wheelDelta * 0.035;
    s.temp = clamp(s.temp, 0, 1);
    if (Math.abs(s.temp - 0.5) > s.zone) s.out += dt; else s.out = 0;
    if (s.out > 0.6 && !c.over) { s.lost = true; c.sfx.lose(); }
  },

  draw(s, g) {
    const hot = s.temp > 0.5 + s.zone, cold = s.temp < 0.5 - s.zone;
    g.fillStyle = hot ? '#ffd6a5' : cold ? '#caf0f8' : '#d8f3dc'; g.fillRect(0, 0, W, H);
    // plantes
    for (let i = 0; i < 4; i++) {
      const x = 120 + i * 130, wilt = hot ? 0.6 : cold ? -0.4 : 0;
      Draw.rrect(g, x - 30, 400, 60, 60, 6); Draw.fillStroke(g, '#bc6c25');
      g.save(); g.translate(x, 400); g.rotate(wilt * (i % 2 ? 1 : -1));
      g.strokeStyle = '#2d6a4f'; g.lineWidth = 6; g.beginPath(); g.moveTo(0, 0); g.lineTo(0, -120); g.stroke();
      Draw.circle(g, 0, -130, 24); Draw.fillStroke(g, cold ? '#90e0ef' : hot ? '#bc6c25' : '#ff6b9d');
      g.restore();
    }
    // thermomètre
    const tx = 760, top = 70, bot = 420, h = bot - top;
    Draw.rrect(g, tx - 26, top - 10, 52, h + 20, 26); Draw.fillStroke(g, '#fff');
    g.fillStyle = 'rgba(6,214,160,0.4)'; g.fillRect(tx - 22, bot - h * (0.5 + s.zone), 44, h * s.zone * 2);
    const ly = bot - h * s.temp;
    g.fillStyle = '#ef233c'; g.fillRect(tx - 10, ly, 20, bot - ly + 20);
    Draw.circle(g, tx, bot + 30, 38); Draw.fillStroke(g, '#ef233c');
    Draw.text(g, `${Math.round(10 + s.temp * 30)}°`, tx + 100, ly, 40);
    if (s.out > 0) Draw.text(g, hot ? 'TROP CHAUD !' : 'TROP FROID !', 330, 80, 50, hot ? '#ef233c' : '#3a86ff');
  },
});
