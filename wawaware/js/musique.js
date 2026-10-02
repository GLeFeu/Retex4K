// Musique pendant les parties : elle accélère avec le niveau (et monte dans les aigus, comme
// dans WarioWare), suit le volume "Musique" des réglages, et baisse pendant les jeux au micro
// pour ne pas gêner le souffle et la reconnaissance vocale.
//
// Pour utiliser ton propre morceau : dépose un fichier assets/musique/musique.mp3
// (uniquement un morceau que tu as le droit d'utiliser). Sinon, une musique originale
// composée ici (synthétiseur) est jouée.
const Music = {
  FILE: 'assets/musique/musique.mp3',
  playing: false,
  rate: 1,          // vitesse actuelle (suit Engine.speed en douceur)
  duck: 1,          // 1 = volume normal, ~0.1 pendant les jeux au micro
  el: null,         // lecteur du fichier mp3 (si présent)
  fileOk: null,     // null = pas encore testé

  start() {
    if (this.playing) return;
    this.playing = true;
    if (this.fileOk !== false) this.startFile(); else this.startSynth();
  },

  stop() {
    this.playing = false;
    if (this.el) this.el.pause();
    this.stopSynth();
  },

  // appelé à chaque image par le moteur
  update(dt, speed, duckWanted) {
    const k = Math.min(1, dt * 3);
    this.rate += (speed - this.rate) * k;
    this.duck += ((duckWanted ? 0.1 : 1) - this.duck) * Math.min(1, dt * 5);
    if (this.el && this.fileOk) {
      this.el.playbackRate = this.rate;
      this.el.volume = Math.min(1, Sfx.musicVolume * this.duck);
    }
    if (this.bus) this.bus.gain.value = 0.22 * this.duck;
  },

  // ----- fichier mp3 fourni -----
  startFile() {
    if (!this.el) {
      this.el = new Audio(this.FILE);
      this.el.loop = true;
      this.el.preservesPitch = false; // la musique monte dans les aigus en accélérant
      this.el.mozPreservesPitch = false;
      this.el.webkitPreservesPitch = false;
      this.el.addEventListener('error', () => {
        this.fileOk = false;
        if (this.playing) this.startSynth(); // pas de fichier : musique originale
      });
      this.el.addEventListener('playing', () => { this.fileOk = true; });
    }
    this.el.currentTime = 0;
    this.el.play().catch(() => { if (this.fileOk === false && this.playing) this.startSynth(); });
  },

  // ----- musique originale (synthétiseur) -----
  // Grille de 64 pas (4 mesures de 16 doubles-croches), accords C - G - Am - F.
  ROOTS: [48, 43, 45, 41],
  LEAD: [
    72, null, 76, null, 79, null, 76, 74, 72, null, 74, null, 76, null, null, null,
    74, null, 71, null, 74, null, 79, null, 77, 76, 74, null, 71, null, null, null,
    72, null, 76, null, 81, null, 79, 76, 72, null, 76, null, 79, null, 81, null,
    77, null, 76, null, 74, null, 72, null, 74, null, 71, null, 72, null, null, null,
  ],
  BPM: 132,

  startSynth() {
    if (this.synthTimer) return;
    const ac = Sfx.ctx();
    if (!this.bus) { this.bus = ac.createGain(); this.bus.gain.value = 0.22; this.bus.connect(Sfx.musicOut); }
    this.step = 0;
    this.nextTime = ac.currentTime + 0.08;
    // on programme les notes un peu à l'avance (méthode classique, aucun décalage audible)
    this.synthTimer = setInterval(() => this.schedule(), 25);
  },

  stopSynth() {
    clearInterval(this.synthTimer);
    this.synthTimer = null;
  },

  schedule() {
    const ac = Sfx.ctx();
    while (this.nextTime < ac.currentTime + 0.12) {
      this.playStep(this.step, this.nextTime);
      this.nextTime += 60 / this.BPM / 4 / this.rate;
      this.step = (this.step + 1) % 64;
    }
  },

  note(midi, t, dur, type, vol, ac) {
    const o = ac.createOscillator(), g = ac.createGain();
    o.type = type;
    o.frequency.value = 440 * Math.pow(2, (midi - 69) / 12) * (0.9 + this.rate * 0.1); // monte un peu en accélérant
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(this.bus);
    o.start(t); o.stop(t + dur + 0.02);
  },

  drum(t, kind, ac) {
    if (kind === 'kick') {
      const o = ac.createOscillator(), g = ac.createGain();
      o.frequency.setValueAtTime(140, t); o.frequency.exponentialRampToValueAtTime(45, t + 0.12);
      g.gain.setValueAtTime(0.9, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.14);
      o.connect(g).connect(this.bus); o.start(t); o.stop(t + 0.16);
      return;
    }
    const len = kind === 'snare' ? 0.12 : 0.03;
    const buf = ac.createBuffer(1, Math.floor(ac.sampleRate * len), ac.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
    const src = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain();
    src.buffer = buf; f.type = 'highpass'; f.frequency.value = kind === 'snare' ? 1200 : 6000;
    g.gain.value = kind === 'snare' ? 0.45 : 0.18;
    src.connect(f).connect(g).connect(this.bus); src.start(t);
  },

  playStep(step, t) {
    const ac = Sfx.ctx(), bar = Math.floor(step / 16), s = step % 16;
    const spb = 60 / this.BPM / 4 / this.rate;
    const root = this.ROOTS[bar];
    if ([0, 3, 6, 8, 11, 14].includes(s)) this.note(root + (s % 6 === 0 ? 0 : 12), t, spb * 1.6, 'triangle', 0.5, ac);
    const third = bar === 2 ? 15 : 16; // la mineur (Am) : tierce mineure
    if (s % 4 === 2) for (const iv of [12, third, 19]) this.note(root + iv, t, spb * 0.9, 'square', 0.035, ac);
    const lead = this.LEAD[step];
    if (lead) this.note(lead, t, spb * 1.8, 'square', 0.09, ac);
    if (s === 0 || s === 8 || s === 10) this.drum(t, 'kick', ac);
    if (s === 4 || s === 12) this.drum(t, 'snare', ac);
    if (s % 2 === 0) this.drum(t, 'hat', ac);
  },
};
