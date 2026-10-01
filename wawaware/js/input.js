// Gestion centralisée des entrées : souris, molette, clavier, micro.
// Les codes clavier (e.code) sont physiques : 'KeyA' = touche Q sur AZERTY, A sur QWERTY.
const Input = {
  x: 480, y: 270,
  down: false,        // bouton gauche maintenu
  clicked: false,     // clic gauche pendant cette frame
  rightClicked: false,// clic droit pendant cette frame
  wheelNotches: 0,    // crans de molette pendant cette frame (toutes directions)
  wheelDelta: 0,      // crans signés : négatif = vers le haut, positif = vers le bas
  keys: new Set(),    // touches maintenues
  pressed: new Set(), // touches appuyées pendant cette frame
  typed: [],          // lettres tapées pendant cette frame (selon la disposition du clavier)
  digits: [],         // chiffres tapés pendant cette frame (rangée du haut ou pavé numérique)
  mic: {
    enabled: false, level: 0, db: -100, floor: -60, clap: false,
    sensitivity: 1, analyser: null, buf: null, stream: null, clapCd: 0, prevLvl: 0,
  },

  init(canvas) {
    const toLocal = (e) => {
      const r = canvas.getBoundingClientRect();
      this.x = (e.clientX - r.left) * (canvas.width / r.width);
      this.y = (e.clientY - r.top) * (canvas.height / r.height);
    };
    window.addEventListener('pointermove', toLocal);
    canvas.addEventListener('pointerdown', (e) => {
      toLocal(e);
      if (e.button === 2) { this.rightClicked = true; return; }
      this.down = true;
      this.clicked = true;
    });
    window.addEventListener('pointerup', (e) => { if (e.button !== 2) this.down = false; });
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());

    canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      let d = Math.abs(e.deltaY);
      if (e.deltaMode === 1) d *= 40;
      else if (e.deltaMode === 2) d *= 400;
      const n = Math.min(d / 100, 1.5);
      this.wheelNotches += n;
      this.wheelDelta += Math.sign(e.deltaY) * n;
    }, { passive: false });

    window.addEventListener('keydown', (e) => {
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Tab'].includes(e.code)) e.preventDefault();
      if (!e.repeat) {
        this.pressed.add(e.code);
        if (e.key.length === 1) {
          const ch = e.key.normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase();
          if (/^[A-Z]$/.test(ch)) this.typed.push(ch);
        }
        const dm = /^(?:Digit|Numpad)([0-9])$/.exec(e.code);
        if (dm) this.digits.push(Number(dm[1]));
      }
      this.keys.add(e.code);
    });
    window.addEventListener('keyup', (e) => this.keys.delete(e.code));
    window.addEventListener('blur', () => { this.keys.clear(); this.down = false; });
  },

  isDown(...codes) { return codes.some(c => this.keys.has(c)); },
  wasPressed(...codes) { return codes.some(c => this.pressed.has(c)); },
  anyKeyPressed() { return this.pressed.size > 0; },

  endFrame() {
    this.clicked = false;
    this.rightClicked = false;
    this.wheelNotches = 0;
    this.wheelDelta = 0;
    this.pressed.clear();
    this.typed.length = 0;
    this.digits.length = 0;
  },

  async enableMic() {
    if (this.mic.enabled) return;
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      throw new Error('Micro indisponible : ouvre le jeu via http://localhost (lancer.bat)');
    }
    // On coupe les traitements du navigateur sinon le souffle est filtré comme du bruit
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
    });
    const ac = Sfx.ctx();
    const analyser = ac.createAnalyser();
    analyser.fftSize = 1024;
    const source = ac.createMediaStreamSource(stream); // partagée avec la reconnaissance vocale intégrée
    source.connect(analyser);
    Object.assign(this.mic, { enabled: true, stream, source, analyser, buf: new Float32Array(analyser.fftSize) });
  },

  // Le niveau (0 à 1) est mesuré en décibels AU-DESSUS du bruit ambiant de la pièce,
  // qui est réévalué en permanence : ça marche pareil avec un micro sensible ou faible.
  updateMic(dt) {
    const m = this.mic;
    m.clap = false;
    if (!m.enabled) return;
    m.analyser.getFloatTimeDomainData(m.buf);
    let sum = 0;
    for (let i = 0; i < m.buf.length; i++) sum += m.buf[i] * m.buf[i];
    m.db = 20 * Math.log10(Math.sqrt(sum / m.buf.length) + 1e-9);

    // bruit de fond : redescend vite, remonte très lentement (pour ne pas "apprendre" le souffle)
    if (m.db < m.floor) m.floor += (m.db - m.floor) * Math.min(1, dt * 4);
    else m.floor += Math.min(m.db - m.floor, 12) * dt * 0.05;
    m.floor = clamp(m.floor, -95, -35);

    const range = 28 / m.sensitivity;
    const lvl = clamp((m.db - m.floor - 6) / range, 0, 1);
    m.level = Math.max(lvl, m.level * Math.pow(0.0005, dt)); // montée instantanée, descente douce

    // applaudissement / claquement : montée brutale du volume
    m.clapCd = Math.max(0, m.clapCd - dt);
    if (lvl > 0.55 && m.prevLvl < 0.25 && m.clapCd === 0) { m.clap = true; m.clapCd = 0.15; }
    m.prevLvl = lvl;
  },
};
