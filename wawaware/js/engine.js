// ===== Moteur Micro Mania =====
// Un mini-jeu est un objet enregistré via Engine.register({ ... }) :
//   id, name, icon, instruction, input, hint, duration (s), survival?, needsMic?, cursor?
//   start(ctx) -> état   |   update(état, dt, ctx)   |   draw(état, g, ctx)
// L'état met `won = true` ou `lost = true` pour terminer. Un jeu "survival" est gagné
// si le temps s'écoule sans `lost`. Tout l'aléatoire passe par ctx.rng (graine partagée),
// ce qui permettra au multijoueur de donner exactement la même partie à tout le monde.

const W = 960, H = 540, GROUND = 440;

function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle(arr, rng) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const easeOutBack = (p) => 1 + 2.70158 * Math.pow(p - 1, 3) + 1.70158 * Math.pow(p - 1, 2);

const FONT = '"Lilita One", "Arial Black", Impact, sans-serif';

const Draw = {
  text(g, str, x, y, size, fill = '#fff', stroke = '#1a1a1a', align = 'center') {
    g.font = `${size}px ${FONT}`;
    g.textAlign = align;
    g.textBaseline = 'middle';
    g.lineJoin = 'round';
    if (stroke) { g.lineWidth = Math.max(4, size / 6); g.strokeStyle = stroke; g.strokeText(str, x, y); }
    g.fillStyle = fill;
    g.fillText(str, x, y);
  },
  circle(g, x, y, r) { g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); },
  ellipse(g, x, y, rx, ry, rot = 0) { g.beginPath(); g.ellipse(x, y, rx, ry, rot, 0, Math.PI * 2); },
  rrect(g, x, y, w, h, r) { g.beginPath(); g.roundRect(x, y, w, h, r); },
  fillStroke(g, fill, stroke = '#1a1a1a', lw = 4) {
    g.fillStyle = fill;
    g.fill();
    if (stroke) { g.lineWidth = lw; g.strokeStyle = stroke; g.stroke(); }
  },

  stripes(g, t, c1, c2) {
    g.fillStyle = c1;
    g.fillRect(0, 0, W, H);
    g.save();
    g.translate(W / 2, H / 2);
    g.rotate(t * 0.25);
    g.fillStyle = c2;
    const n = 14;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      g.beginPath();
      g.moveTo(0, 0);
      g.arc(0, 0, 1200, a, a + Math.PI / n);
      g.closePath();
      g.fill();
    }
    g.restore();
  },

  heart(g, x, y, s) {
    g.beginPath();
    g.moveTo(x, y + s * 0.5);
    g.bezierCurveTo(x - s * 0.15, y + s * 0.35, x - s * 0.55, y + s * 0.1, x - s * 0.55, y - s * 0.15);
    g.bezierCurveTo(x - s * 0.55, y - s * 0.5, x - s * 0.1, y - s * 0.55, x, y - s * 0.25);
    g.bezierCurveTo(x + s * 0.1, y - s * 0.55, x + s * 0.55, y - s * 0.5, x + s * 0.55, y - s * 0.15);
    g.bezierCurveTo(x + s * 0.55, y + s * 0.1, x + s * 0.15, y + s * 0.35, x, y + s * 0.5);
    g.closePath();
  },

  // Le petit héros moustachu. (x, y) = position des pieds.
  hero(g, x, y, { face = 1, rot = 0, run = 0, shirt = '#ffd400', pants = '#7b2cbf' } = {}) {
    g.save();
    g.translate(x, y);
    g.scale(face, 1);
    g.translate(0, -40);
    g.rotate(rot);
    g.translate(0, 40);
    const l = Math.sin(run) * 7;
    Draw.ellipse(g, -10 + l, -6, 13, 7); Draw.fillStroke(g, '#5b3a1e');
    Draw.ellipse(g, 12 - l, -6, 13, 7); Draw.fillStroke(g, '#5b3a1e');
    // corps : t-shirt jaune + salopette violette
    Draw.ellipse(g, 0, -32, 26, 24); Draw.fillStroke(g, shirt, null);
    g.save();
    Draw.ellipse(g, 0, -32, 26, 24); g.clip();
    g.fillStyle = pants; g.fillRect(-30, -32, 60, 40);
    g.restore();
    Draw.ellipse(g, 0, -32, 26, 24); g.lineWidth = 4; g.strokeStyle = '#1a1a1a'; g.stroke();
    // tête
    Draw.circle(g, 2, -66, 20); Draw.fillStroke(g, '#ffcf9e');
    // casquette
    g.beginPath(); g.arc(2, -70, 21, Math.PI, 0); g.closePath(); Draw.fillStroke(g, shirt);
    Draw.rrect(g, 6, -75, 28, 8, 4); Draw.fillStroke(g, shirt, '#1a1a1a', 3);
    Draw.circle(g, -2, -80, 6); Draw.fillStroke(g, '#fff', '#1a1a1a', 2);
    // œil, nez, moustache
    Draw.ellipse(g, 10, -66, 4, 6); Draw.fillStroke(g, '#fff', '#1a1a1a', 2);
    Draw.circle(g, 11.5, -65, 2); g.fillStyle = '#1a1a1a'; g.fill();
    Draw.circle(g, 20, -58, 7); Draw.fillStroke(g, '#ff8fa3', '#1a1a1a', 3);
    g.beginPath();
    g.moveTo(4, -51); g.lineTo(10, -46); g.lineTo(16, -51); g.lineTo(22, -46); g.lineTo(28, -51);
    g.lineWidth = 5; g.strokeStyle = '#1a1a1a'; g.lineCap = 'round'; g.stroke();
    g.restore();
  },
};

const INPUTS = {
  souris:  { icon: '🖱️', label: 'SOURIS',  cols: ['#ff6b9d', '#ff4f87'] },
  curseur: { icon: '🖱️', label: 'CURSEUR', cols: ['#4cc9f0', '#3aa8d8'] },
  molette: { icon: '🖱️', label: 'MOLETTE', cols: ['#06d6a0', '#05b384'] },
  clavier: { icon: '⌨️', label: 'CLAVIER', cols: ['#ffb703', '#fb8500'] },
  micro:   { icon: '🎤', label: 'MICRO',   cols: ['#9d4edd', '#7b2cbf'] },
};

const PALETTES = [
  ['#ffcc00', '#ffb300'],
  ['#3bceac', '#20b597'],
  ['#ff6b9d', '#ff4f87'],
  ['#4cc9f0', '#3aa8d8'],
  ['#9d4edd', '#7b2cbf'],
  ['#ff7b00', '#ff5e00'],
];

const MAX_LIVES = 4;
const GAMES_PER_LEVEL = 5;

const Engine = {
  games: [],
  state: 'menu',
  t: 0,
  stateT: 0,

  register(game) { this.games.push(game); },

  init() {
    this.canvas = document.getElementById('game');
    this.g = this.canvas.getContext('2d');
    Input.init(this.canvas);
    this.last = performance.now();
    const loop = (now) => {
      try { this.frame(now); } catch (err) { this.report('moteur', err); }
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  },

  canPlay(gm) {
    if (gm.needsVoice) return Voice.ready();
    return !gm.needsMic || Input.mic.enabled;
  },

  playable() {
    // en multijoueur, la liste ne doit dépendre que des options de la salle (identique pour tous)
    if (this.multi) return this.games.filter(gm => !gm.needsMic || this.multi.micro);
    return this.games.filter(gm => this.canPlay(gm));
  },

  // ----- multijoueur -----
  startMulti({ seed, micro, round, at }) {
    this.startRun({ seed });
    this.multi = { micro, round, playing: round, late: 0, nextAt: at, myResult: null, lastResults: {}, waiting: false };
    UI.show(null);
  },

  multiNextRound(round, at) {
    if (!this.multi || round < this.multi.round) return;
    this.multi.round = round;
    this.multi.nextAt = at;
    this.multi.waiting = false;
  },

  multiResults(res) { if (this.multi) this.multi.lastResults = res; },

  multiEnd() {
    this.multi = null;
    this.setState('menu');
  },

  maxLives() {
    if (this.multi) return (Net.room && Net.room.coeurs) || MAX_LIVES;
    return UI.soloLives ? UI.soloLives() : MAX_LIVES;
  },

  amAlive() { const me = Net.me(); return !this.multi || (me && me.vivant); },

  // ce que les autres voient de moi : la position de mon perso (si le jeu la donne) ou de ma souris
  ghostOf() {
    if (this.cur.ghost) return this.cur.ghost(this.cs);
    if (this.cur.input === 'souris' || this.cur.input === 'curseur') return { x: Input.x, y: Input.y };
    return null;
  },

  startRun({ practiceId = null, seed, level = 0 } = {}) {
    if (document.activeElement) document.activeElement.blur();
    this.multi = null;
    this.snap = null; // pas de dézoom d'un jeu d'une partie précédente
    this.seed = seed ?? (Math.random() * 2 ** 32) >>> 0;
    this.rng = mulberry32(this.seed);
    this.practiceId = practiceId;
    this.lives = this.maxLives();
    this.score = 0;
    this.played = 0;
    this.level = level;
    this.speed = Math.min(2.2, 1 + level * 0.15);
    this.bag = [];
    this.lastId = null;
    this.lastWin = null;
    this.pendingSpeedup = false;
    this.setState('between');
  },

  pick() {
    if (this.practiceId) return this.games.find(gm => gm.id === this.practiceId);
    if (this.multi) {
      // choix sans mémoire : le jeu de la manche N ne dépend que de la graine et de N,
      // donc un joueur un peu en retard retombe toujours sur le même jeu que les autres
      const list = this.playable(), n = list.length;
      const cycle = Math.floor(this.played / n);
      return shuffle(list.slice(), mulberry32((this.seed + cycle * 1013) >>> 0))[this.played % n];
    }
    if (!this.bag.length) {
      this.bag = shuffle(this.playable().slice(), this.rng);
      const n = this.bag.length;
      if (n > 1 && this.bag[n - 1].id === this.lastId) [this.bag[0], this.bag[n - 1]] = [this.bag[n - 1], this.bag[0]];
    }
    return this.bag.pop();
  },

  loadNext() {
    const game = this.pick();
    this.cur = game;
    this.lastId = game.id;
    this.ctx = {
      rng: mulberry32((this.seed + this.played * 7919) >>> 0),
      diff: this.level,
      speed: this.speed,
      duration: game.duration,
      over: false,
      input: Input,
      sfx: Sfx,
      // Voix : texte entendu depuis le lancement du jeu. clearHeard() "consomme" les mots déjà
      // entendus (on compte les mots plutôt que l'heure : une phrase dite d'un trait reste une
      // seule entrée, et ses mots suivants doivent rester lisibles).
      voiceT: performance.now(),
      skipWords: 0,
      heardWords() { return Voice.since(this.voiceT).trim().split(' ').filter(Boolean); },
      heard() { return ' ' + this.heardWords().slice(this.skipWords).join(' ') + ' '; },
      clearHeard() { this.skipWords = this.heardWords().length; },
    };
    try { this.cs = game.start(this.ctx); } catch (err) { this.cs = {}; this.gameCrash(err); }
    this.gameT = 0;
    this.lastTick = Math.ceil(game.duration);
    this.setState('instruction');
    Sfx.instruction();
  },

  finish(win, silent = false) {
    this.lastWin = win;
    this.ctx.over = true;
    if (win) this.score++;
    if (!silent) { if (win) Sfx.win(); else Sfx.lose(); }
    this.setState('outro');
  },

  afterOutro() {
    this.takeSnapshot();
    if (this.multi) {
      const m = this.multi;
      if (this.amAlive()) Net.send({ t: 'resultat', manche: m.playing, gagne: this.lastWin });
      this.played = m.playing + 1;
      // si le serveur a déjà annoncé la manche suivante (on était en retard), on ne l'efface pas
      if (m.round <= m.playing) { m.waiting = true; m.nextAt = Infinity; }
      this.setState('between');
      return;
    }
    this.played++;
    if (!this.lastWin && !this.practiceId) this.lives--;
    if (this.lives <= 0) {
      this.setState('gameover');
      UI.gameOver(this.score);
      return;
    }
    if (this.played % GAMES_PER_LEVEL === 0) this.pendingSpeedup = true;
    this.setState('between');
  },

  quit() {
    if (this.multi) { Net.send({ t: 'quitter' }); this.multi = null; this.setState('menu'); UI.show('menu'); return; }
    this.setState('menu');
    UI.show(this.practiceId ? 'gallery' : 'menu');
  },

  // Image d'aperçu d'un mini-jeu : on le démarre hors écran, on le fait tourner
  // un court instant sans aucune entrée, puis on le dessine en petit.
  preview(game, width = 480) {
    const cv = document.createElement('canvas');
    cv.width = width;
    cv.height = Math.round((width * H) / W);
    const g = cv.getContext('2d');
    const silent = new Proxy({}, { get: () => () => {} });
    const fakeInput = {
      x: W / 2, y: H / 2, down: false, clicked: false, rightClicked: false, wheelNotches: 0, wheelDelta: 0,
      typed: [], digits: [], keys: new Set(), pressed: new Set(),
      isDown: () => false, wasPressed: () => false, anyKeyPressed: () => false,
      mic: { level: 0, enabled: false, clap: false, db: -100 },
    };
    const ctx = {
      rng: mulberry32(12345), diff: 0, speed: 1, duration: game.duration, over: false,
      input: fakeInput, sfx: silent, heard: () => '  ', clearHeard() {},
    };
    try {
      const st = game.start(ctx);
      for (let i = 0; i < 24; i++) game.update(st, 1 / 60, ctx);
      g.save();
      g.scale(width / W, width / W);
      game.draw(st, g, ctx);
      g.restore();
      g.save();
      g.scale(width / W, width / W);
      g.translate(W / 2, H - 70);
      g.rotate(-0.04);
      Draw.text(g, game.instruction, 0, 0, 72, '#fff');
      g.restore();
    } catch (err) {
      console.error('Aperçu impossible pour', game.id, err);
      g.fillStyle = '#ccc';
      g.fillRect(0, 0, cv.width, cv.height);
    }
    // on renvoie le canvas lui-même (toDataURL échouerait avec les photos en ouvrant le jeu en file://)
    return cv;
  },

  setState(s) { this.state = s; this.stateT = 0; },

  frame(now) {
    const dt = Math.min(0.05, (now - this.last) / 1000);
    this.last = now;
    try {
      Input.updateMic(dt);
      this.updateMusic(dt);
      this.update(dt);
      this.draw();
      if (this.state === 'menu' && UI.tick) UI.tick();
    } finally {
      Input.endFrame();
    }
  },

  // musique : pendant les parties seulement, à la vitesse du niveau, baissée pendant les jeux au micro
  updateMusic(dt) {
    const inRun = !['menu', 'gameover'].includes(this.state);
    if (!inRun) { if (Music.playing) Music.stop(); return; }
    if (!Music.playing) Music.start();
    const micGame = this.cur && this.cur.input === 'micro' && ['instruction', 'play', 'outro'].includes(this.state);
    Music.update(dt, this.speed || 1, micGame);
  },

  // ----- résistance aux plantages -----
  // Un mini-jeu qui plante ne doit jamais bloquer la partie : le joueur perd la manche et on continue.
  report(where, err) {
    console.error(`[WawaWare] ${where} a planté :`, err);
    if (typeof Net !== 'undefined') Net.send({ t: 'bug', ou: where, texte: String(err && err.stack || err).slice(0, 600) });
  },

  gameCrash(err) {
    if (this.cs && this.cs.crashed) return;
    this.report(`mini-jeu « ${this.cur && this.cur.id} »`, err);
    this.cs = Object.assign(this.cs || {}, { crashed: true, lost: true, won: false });
  },

  safeUpdate(dt) {
    if (this.cs.crashed) return;
    try { this.cur.update(this.cs, dt, this.ctx); } catch (err) { this.gameCrash(err); }
  },

  update(dt) {
    this.t += dt;
    this.stateT += dt;
    if (this.state !== 'menu' && this.state !== 'gameover' && Input.wasPressed('Escape')) { this.quit(); return; }
    const k = Math.sqrt(this.speed);

    switch (this.state) {
      case 'between':
        if (this.multi) {
          // le serveur donne l'heure de départ de chaque manche : tout le monde démarre ensemble
          if (!this.multi.waiting && performance.now() >= this.multi.nextAt) {
            const m = this.multi;
            m.playing = m.round;
            this.played = m.round;
            this.level = Math.floor(m.round / GAMES_PER_LEVEL);
            this.speed = Math.min(2.2, 1 + this.level * 0.15);
            m.myResult = null;
            // en retard (onglet en arrière-plan, ordi lent…) : on raccourcit la consigne puis le jeu
            m.late = Math.max(0, (performance.now() - m.nextAt) / 1000);
            this.loadNext();
          }
          break;
        }
        if (this.stateT >= (this.played === 0 ? 1.5 / k : 0.15)) {
          if (this.pendingSpeedup) {
            this.pendingSpeedup = false;
            this.level++;
            this.speed = Math.min(2.2, 1 + this.level * 0.15);
            this.setState('speedup');
            Sfx.speedup();
          } else this.loadNext();
        }
        break;
      case 'speedup':
        if (this.stateT >= 1.6) this.loadNext();
        break;
      case 'instruction': {
        // écran de consigne seul (le jeu est caché) : le temps de lire et de comprendre
        const late = this.multi ? this.multi.late : 0;
        if (this.stateT >= this.instrTotal() - late) {
          this.setState('play');
          if (late > this.instrTotal()) { // vraiment en retard : on entame aussi le chrono du jeu
            const lag = (late - this.instrTotal()) * (this.cur.noSpeedup ? 1 : this.speed);
            this.gameT = Math.min(this.cur.duration - 0.5, lag);
          }
        }
        break;
      }
      case 'play': {
        // les jeux à la voix gardent leur durée : la reconnaissance a un temps de réaction fixe
        const gdt = dt * (this.cur.noSpeedup ? 1 : this.speed);
        this.gameT += gdt;
        this.safeUpdate(gdt);
        const left = this.cur.duration - this.gameT;
        if (left <= 3 && Math.ceil(left) < this.lastTick) { this.lastTick = Math.ceil(left); Sfx.tick(); }
        if (this.multi) {
          // en multijoueur la manche dure jusqu'au bout pour tout le monde
          const m = this.multi;
          if (m.myResult !== false) {
            try { Net.sendGhost(m.playing, this.ghostOf()); } catch (err) { this.report('fantôme (envoi)', err); }
          }
          if (m.myResult === null && (this.cs.won || this.cs.lost)) {
            m.myResult = !!this.cs.won;
            if (!m.myResult && this.amAlive()) Net.send({ t: 'perdu', m: m.playing });
            this.ctx.over = true;
            if (m.myResult) Sfx.win(); else Sfx.lose();
          }
          if (left <= 0) this.finish(m.myResult !== null ? m.myResult : !!this.cur.survival, m.myResult !== null);
          break;
        }
        if (this.cs.won || this.cs.lost) this.finish(!!this.cs.won);
        else if (left <= 0) this.finish(!!this.cur.survival);
        break;
      }
      case 'outro':
        this.safeUpdate(dt * (this.cur.noSpeedup ? 1 : this.speed)); // laisse finir les animations
        if (this.stateT >= 1.0) this.afterOutro();
        break;
    }

    const inGame = this.state === 'play' || this.state === 'outro';
    this.canvas.style.cursor = inGame ? 'none' : 'default';
  },

  draw() {
    const g = this.g;
    switch (this.state) {
      case 'menu': Draw.stripes(g, this.t, '#ffcc00', '#ffb300'); break;
      case 'gameover': Draw.stripes(g, this.t, '#3a0ca3', '#480ca8'); break;
      case 'between':
        if (this.multi) this.drawMultiBetween(g);
        else if (this.played === 0) this.drawBetween(g);
        else this.drawTransition(g);
        break;
      case 'speedup': this.drawSpeedup(g); break;
      case 'instruction': this.drawInstruction(g); break;
      case 'play': this.drawGame(g); break;
      case 'outro': this.drawGame(g); this.drawOutro(g); this.drawEliminated(g); break;
    }
  },

  drawGame(g) {
    g.save();
    if (!this.cs.crashed) {
      try { this.cur.draw(this.cs, g, this.ctx); } catch (err) { this.gameCrash(err); }
    }
    g.restore();
    if (this.cs.crashed) {
      g.fillStyle = '#22223b'; g.fillRect(0, 0, W, H);
      Draw.text(g, '😵 OUPS, CE MINI-JEU A PLANTÉ', W / 2, H / 2 - 30, 44, '#fff');
      Draw.text(g, this.multi ? 'LA PARTIE CONTINUE POUR TOUT LE MONDE' : 'ON PASSE AU SUIVANT', W / 2, H / 2 + 30, 28, '#ffe14d');
    }
    if (this.multi) {
      try { Net.drawGhosts(g, this.cur, this.multi.playing); } catch (err) { this.report('fantôme (dessin)', err); }
      this.drawPlayersPanel(g);
      const r = this.multi.myResult;
      if (r !== null && this.state === 'play' && this.amAlive()) {
        Draw.rrect(g, W / 2 - 230, 70, 460, 50, 25); Draw.fillStroke(g, r ? '#06d6a0' : '#ef233c', '#1a1a1a', 4);
        Draw.text(g, r ? 'RÉUSSI ! ON ATTEND LES AUTRES…' : 'RATÉ… ON ATTEND LES AUTRES', W / 2, 96, 22, '#fff', null);
      }
    }
    this.drawHud(g);
    if (this.state !== 'outro') this.drawEliminated(g); // en fin de manche, il passe par-dessus "RATÉ !"
    this.drawMyCursor(g);
  },

  // mon curseur, à ma couleur (sauf dans les jeux qui dessinent leur propre outil : tapette, marteau…)
  myColor() {
    const me = this.multi && Net.me();
    return (me && me.couleur) || UI.cursorColor();
  },

  drawMyCursor(g) {
    if (this.cur.cursor === 'none' || this.cur.input === 'clavier') return;
    Net.drawCursor(g, Input.x, Input.y, this.myColor());
  },

  // ----- transitions : zoom avant sur le mini-jeu, dézoom à la fin -----
  ZOOM: 0.55,

  instrTotal() { return this.instructionTime() + this.ZOOM; },

  // dessine le mini-jeu (son vrai état) dans un rectangle de l'écran : miniature puis zoom
  drawGameIn(g, r) {
    if (this.cs.crashed) return;
    g.save();
    Draw.rrect(g, r.x, r.y, r.w, r.h, 12 * (1 - r.full)); g.clip();
    g.translate(r.x, r.y);
    g.scale(r.w / W, r.h / H);
    try { this.cur.draw(this.cs, g, this.ctx); } catch (err) { this.gameCrash(err); }
    g.restore();
  },

  // garde une image de la fin du mini-jeu, pour la faire rétrécir pendant la consigne suivante
  takeSnapshot() {
    const c = this.snapCanvas || (this.snapCanvas = document.createElement('canvas'));
    c.width = W; c.height = H;
    c.getContext('2d').drawImage(this.canvas, 0, 0);
    this.snap = c;
  },

  drawSnapshot(g, q) { // q : 0 = plein écran, 1 = disparu
    if (!this.snap) return;
    const e = q * q * (3 - 2 * q), k = 1 - e;
    if (k <= 0.01) return;
    g.save();
    g.globalAlpha = 1 - e * 0.6;
    g.translate(W / 2, H / 2);
    g.rotate(e * 0.5);
    g.scale(k, k);
    g.drawImage(this.snap, -W / 2, -H / 2);
    g.restore();
  },

  // petite liste des joueurs (en haut à gauche) : qui est encore en vie
  drawPlayersPanel(g) {
    const room = Net.room;
    if (!room) return;
    const list = room.joueurs.filter(j => j.enJeu);
    g.save();
    g.globalAlpha = 0.85;
    Draw.rrect(g, 8, 8, 170, 12 + list.length * 22, 10); g.fillStyle = 'rgba(0,0,0,0.55)'; g.fill();
    list.forEach((j, i) => {
      const y = 24 + i * 22;
      Draw.circle(g, 22, y, 6); g.fillStyle = j.vivant ? j.couleur : '#6c757d'; g.fill();
      g.font = `15px ${FONT}`; g.textAlign = 'left'; g.textBaseline = 'middle';
      g.fillStyle = j.vivant ? '#fff' : '#8d99ae';
      g.fillText((j.id === Net.id ? '▶ ' : '') + j.nom.slice(0, 10), 34, y);
      g.textAlign = 'right';
      g.fillStyle = j.vivant ? '#ff3c6e' : '#8d99ae';
      g.fillText(j.vivant ? '♥'.repeat(j.vies) : '👻', 170, y);
    });
    g.restore();
  },

  drawTransition(g) {
    g.fillStyle = '#07070d';
    g.fillRect(0, 0, W, H);
    this.drawSnapshot(g, 0); // la fin du jeu précédent reste affichée jusqu'au dézoom
    this.drawEliminated(g);
  },

  // Joueur éliminé : grand écran au moment où ça arrive, puis bandeau permanent.
  // Il peut continuer à jouer pour s'amuser, mais il n'est plus dans la partie.
  drawEliminated(g) {
    if (!this.multi || this.amAlive()) return;
    const room = Net.room;
    const alive = room ? room.joueurs.filter(j => j.enJeu && j.vivant).length : 0;
    const since = performance.now() - (this.multi.deadAt || -1e9);
    if (since < 4500) {
      const a = Math.min(1, since / 250, (4500 - since) / 400);
      g.save();
      g.globalAlpha = a;
      g.fillStyle = 'rgba(10,8,20,0.94)'; g.fillRect(0, 0, W, H);
      g.font = '70px "Segoe UI Emoji", "Apple Color Emoji", sans-serif';
      g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText('💀', W / 2, 95);
      Draw.text(g, 'TU ES ÉLIMINÉ', W / 2, 185, 80, '#ff5c7a', '#000');
      Draw.text(g, 'Tu n\'es plus dans la partie.', W / 2, 270, 32, '#fff', null);
      Draw.text(g, 'Tu peux continuer à jouer pour t\'amuser, mais ça ne compte plus.', W / 2, 315, 24, '#adb5bd', null);
      Draw.text(g, `Attends la fin (encore ${alive} joueur${alive > 1 ? 's' : ''} en vie) pour relancer une partie.`, W / 2, 360, 24, '#ffe14d', null);
      g.restore();
      return;
    }
    g.save();
    Draw.rrect(g, W / 2 - 330, H - 46, 660, 34, 17); g.fillStyle = 'rgba(10,8,20,0.75)'; g.fill();
    Draw.text(g, `💀 ÉLIMINÉ · ça ne compte plus · encore ${alive} en vie · attends la fin pour rejouer`, W / 2, H - 29, 17, '#ff8fa3', null);
    g.restore();
  },

  drawMultiBetween(g) {
    const m = this.multi;
    if (this.played > 0 && !(m.waiting && this.stateT > 0.8)) { this.drawTransition(g); return; }
    if (this.played > 0) {
      this.drawTransition(g);
      Draw.text(g, 'ON ATTEND LES AUTRES JOUEURS…', W / 2, H / 2, 36, '#fff', null);
      this.drawPlayersPanel(g);
      return;
    }
    this.drawMultiStart(g);
  },

  // écran d'avant la 1re manche : qui joue
  drawMultiStart(g) {
    const pal = PALETTES[this.level % PALETTES.length];
    Draw.stripes(g, this.t, pal[0], pal[1]);
    const m = this.multi, room = Net.room;
    const next = m.waiting ? this.played : m.round;
    Draw.text(g, `MANCHE ${next + 1}`, W / 2, 50, 44);
    if (room) {
      const list = room.joueurs.filter(j => j.enJeu);
      const cols = list.length > 6 ? 2 : 1, rows = Math.ceil(list.length / cols);
      const cw = cols === 2 ? 420 : 520;
      list.forEach((j, i) => {
        const c = Math.floor(i / rows), r = i % rows;
        const x = W / 2 - (cols * cw) / 2 + c * cw + 10, y = 105 + r * 50;
        Draw.rrect(g, x, y, cw - 20, 42, 21);
        Draw.fillStroke(g, j.vivant ? 'rgba(255,255,255,0.92)' : 'rgba(40,40,60,0.6)', j.id === Net.id ? '#ffd400' : '#1a1a1a', j.id === Net.id ? 5 : 3);
        Draw.circle(g, x + 24, y + 21, 10); g.fillStyle = j.couleur; g.fill();
        g.font = `24px ${FONT}`; g.textAlign = 'left'; g.textBaseline = 'middle';
        g.fillStyle = j.vivant ? '#1a1a1a' : '#adb5bd';
        g.fillText(j.nom, x + 44, y + 22);
        g.textAlign = 'right';
        const res = m.lastResults[j.id];
        g.fillStyle = res === true ? '#06d6a0' : res === false ? '#ef233c' : '#adb5bd';
        g.fillText(res === true ? '✔' : res === false ? '✘' : '', x + cw - 150, y + 22);
        g.fillStyle = j.vivant ? '#ff3c6e' : '#adb5bd';
        g.fillText(j.vivant ? '♥'.repeat(j.vies) : '👻 éliminé', x + cw - 36, y + 22);
      });
    }
    const left = (m.nextAt - performance.now()) / 1000;
    const msg = m.waiting || !isFinite(left) ? 'EN ATTENTE DES AUTRES…' : `PROCHAIN JEU DANS ${Math.max(0, Math.ceil(left))}`;
    Draw.text(g, msg, W / 2, H - 60, 34, '#ffe14d');
    if (!m.waiting && next > 0 && next % GAMES_PER_LEVEL === 0) Draw.text(g, 'PLUS VITE !', W / 2, H - 110, 40, '#fff');
    this.drawEliminated(g);
  },

  drawBetween(g) {
    const pal = PALETTES[this.level % PALETTES.length];
    Draw.stripes(g, this.t, pal[0], pal[1]);

    const title = this.practiceId ? this.games.find(gm => gm.id === this.practiceId).name.toUpperCase() : `JEU ${this.played + 1}`;
    Draw.text(g, title, W / 2, 70, 42);

    const pop = this.lastWin && this.stateT < 0.3 ? 1 + 0.25 * Math.sin((this.stateT / 0.3) * Math.PI) : 1;
    g.save();
    g.translate(W / 2, 200);
    g.scale(pop, pop);
    Draw.text(g, String(this.score), 0, 0, 140, '#fff');
    g.restore();

    if (this.practiceId) {
      Draw.text(g, '∞', W / 2, 345, 60, '#ff3c6e');
    } else {
      const ml = this.maxLives(), sp = Math.min(95, 640 / ml);
      for (let i = 0; i < ml; i++) {
        const x = W / 2 + (i - (ml - 1) / 2) * sp;
        let y = 345;
        if (i < this.lives) {
          y += Math.sin(this.t * 6 + i) * 5;
          Draw.heart(g, x, y, 70); Draw.fillStroke(g, '#ff3c6e', '#1a1a1a', 5);
        } else {
          Draw.heart(g, x, y, 70); Draw.fillStroke(g, 'rgba(0,0,0,0.25)', '#1a1a1a', 5);
          if (i === this.lives && this.lastWin === false && this.stateT < 0.8) {
            // le cœur perdu tombe en tournant
            const p = this.stateT;
            g.save();
            g.globalAlpha = 1 - p / 0.8;
            g.translate(x + p * 80, y + p * p * 500);
            g.rotate(p * 4);
            Draw.heart(g, 0, 0, 70); Draw.fillStroke(g, '#ff3c6e', '#1a1a1a', 5);
            g.restore();
          }
        }
      }
    }

    const pulse = 1 + 0.06 * Math.sin(this.stateT * 14);
    g.save();
    g.translate(W / 2, 460);
    g.scale(pulse, pulse);
    Draw.text(g, 'PRÊT ?', 0, 0, 56, '#ffe14d');
    g.restore();
  },

  drawSpeedup(g) {
    const flash = Math.floor(this.stateT * 8) % 2;
    Draw.stripes(g, this.t * 3, flash ? '#ff3c6e' : '#ff7b00', flash ? '#ff7b00' : '#ff3c6e');
    const p = clamp(this.stateT / 0.35, 0, 1);
    g.save();
    g.translate(W / 2, H / 2 - 20);
    g.rotate(-0.06);
    const s = easeOutBack(p);
    g.scale(s, s);
    Draw.text(g, 'PLUS VITE !', 0, 0, 120, '#fff');
    g.restore();
    Draw.text(g, `VITESSE x${this.speed.toFixed(2)}`, W / 2, H / 2 + 90, 40, '#ffe14d');
  },

  // 3 s pour lire la consigne au début, un peu moins quand ça accélère (jamais moins de 2 s)
  instructionTime() { return Math.max(2, 3 / Math.sqrt(this.speed)); },

  drawInstruction(g) {
    const tI = this.instructionTime(), t = this.stateT;
    const thumb = (r) => this.drawGameIn(g, { ...r, full: 0 });
    if (t < tI) {
      g.save();
      Consigne.draw(g, this.cur, t, clamp(1 - t / tI, 0, 1), thumb);
      g.restore();
      this.drawEliminated(g);
      // dézoom : l'image du jeu précédent rétrécit en tournant
      if (this.snap && t < 0.5) this.drawSnapshot(g, t / 0.5);
      return;
    }
    // zoom avant : la miniature grandit jusqu'au plein écran, puis le jeu démarre
    const p = clamp((t - tI) / this.ZOOM, 0, 1), e = p * p * (3 - 2 * p);
    g.save();
    g.globalAlpha = 1 - e;
    Consigne.draw(g, this.cur, t, 0, null);
    g.restore();
    const a = Consigne.THUMB;
    this.drawGameIn(g, {
      x: a.x * (1 - e), y: a.y * (1 - e),
      w: a.w + (W - a.w) * e, h: a.h + (H - a.h) * e, full: e,
    });
  },

  drawOutro(g) {
    const win = this.lastWin;
    const p = clamp(this.stateT / 0.25, 0, 1);
    g.fillStyle = win ? 'rgba(30,200,90,0.25)' : 'rgba(220,30,60,0.3)';
    g.fillRect(0, 0, W, H);
    g.save();
    g.translate(W / 2, 110);
    g.rotate(win ? -0.06 : 0.06);
    const s = easeOutBack(p);
    g.scale(s, s);
    Draw.text(g, win ? 'BRAVO !' : 'RATÉ !', 0, 0, 100, win ? '#7dff9a' : '#ff5c7a');
    g.restore();
    if (this.practiceId) return;
    // vies avant cette manche (la perte n'est comptée qu'après l'écran)
    let lives = this.lives;
    if (this.multi) { const me = Net.me(); if (!me || !me.vivant) return; lives = me.vies; }
    const ml = this.maxLives(), sp = Math.min(70, 560 / ml);
    for (let i = 0; i < ml; i++) {
      const x = W / 2 + (i - (ml - 1) / 2) * sp, y = H - 95;
      const breaking = !win && i === lives - 1;
      if (i >= lives) { Draw.heart(g, x, y, 50); Draw.fillStroke(g, 'rgba(0,0,0,0.3)', '#1a1a1a', 4); continue; }
      if (!breaking) { Draw.heart(g, x, y, 50); Draw.fillStroke(g, '#ff3c6e', '#1a1a1a', 4); continue; }
      Draw.heart(g, x, y, 50); Draw.fillStroke(g, 'rgba(0,0,0,0.3)', '#1a1a1a', 4);
      const q = clamp((this.stateT - 0.2) / 0.7, 0, 1);
      g.save();
      g.globalAlpha = 1 - q;
      g.translate(x + q * 40, y + q * q * 160);
      g.rotate(q * 3);
      Draw.heart(g, 0, 0, 50); Draw.fillStroke(g, '#ff3c6e', '#1a1a1a', 4);
      g.restore();
    }
  },

  drawHud(g) {
    // Bombe-chrono : la mèche brûle jusqu'à la bombe
    const frac = this.state === 'instruction' ? 1 : clamp(1 - this.gameT / this.cur.duration, 0, 1);
    const bx = 50, by = H - 40;
    const x1 = bx + 24, x2 = x1 + (W - 110 - x1) * frac;
    if (frac > 0) {
      g.save();
      g.lineCap = 'round';
      g.strokeStyle = '#1a1a1a'; g.lineWidth = 12;
      g.beginPath(); g.moveTo(x1, by); g.lineTo(x2, by); g.stroke();
      g.strokeStyle = '#d4a373'; g.lineWidth = 6;
      g.setLineDash([12, 8]);
      g.beginPath(); g.moveTo(x1, by); g.lineTo(x2, by); g.stroke();
      g.restore();
      const sp = 9 + Math.random() * 6;
      Draw.circle(g, x2, by, sp); g.fillStyle = '#ff7b00'; g.fill();
      Draw.circle(g, x2, by, sp * 0.5); g.fillStyle = '#ffe14d'; g.fill();
    }
    Draw.circle(g, bx, by, 28); Draw.fillStroke(g, '#2b2b2b', '#000', 4);
    Draw.circle(g, bx - 9, by - 9, 7); g.fillStyle = 'rgba(255,255,255,0.35)'; g.fill();
    const left = this.cur.duration - this.gameT;
    if (this.state === 'play' && left <= 3) Draw.text(g, String(Math.ceil(left)), bx, by + 2, 30, '#ff5c7a', null);

    // Bulle "ce que le jeu a entendu"
    if (this.cur.needsVoice) {
      const recent = performance.now() - Voice.lastT < 2500;
      const txt = !Voice.running ? '🎙️ …' : recent ? `« ${Voice.last.slice(-28)} »` : '🎙️ J\'écoute…';
      g.font = `26px ${FONT}`;
      const tw = Math.max(200, g.measureText(txt).width + 50);
      Draw.rrect(g, W / 2 - tw / 2, 12, tw, 50, 25);
      Draw.fillStroke(g, recent ? '#fff' : 'rgba(255,255,255,0.75)', '#1a1a1a', 4);
      g.font = `26px ${FONT}`;
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillStyle = '#1a1a1a';
      g.fillText(txt, W / 2, 38);
    }

    // Jauge micro
    if (this.cur.input === 'micro' && !this.cur.needsVoice && Input.mic.enabled) {
      const mx = W - 56, my = 90, mh = 300, mw = 30;
      Draw.rrect(g, mx, my, mw, mh, 12); Draw.fillStroke(g, 'rgba(0,0,0,0.35)', '#1a1a1a', 4);
      const lh = (mh - 8) * Input.mic.level;
      if (lh > 1) {
        Draw.rrect(g, mx + 4, my + mh - 4 - lh, mw - 8, lh, 8);
        const above = Input.mic.level > (this.cur.micThreshold || 0);
        // micInvert : jeux où il faut rester SOUS le seuil (ex. silence)
        g.fillStyle = this.cur.micInvert ? (above ? '#ff3c6e' : '#06d6a0') : (above ? '#06d6a0' : '#adb5bd');
        g.fill();
      }
      const ty = my + mh - 4 - (mh - 8) * (this.cur.micThreshold || 0);
      g.strokeStyle = '#ff3c6e'; g.lineWidth = 4;
      g.beginPath(); g.moveTo(mx - 8, ty); g.lineTo(mx + mw + 8, ty); g.stroke();
      if (this.cur.micMax) { // jeux "pas trop fort" : seconde limite
        const my2 = my + mh - 4 - (mh - 8) * this.cur.micMax;
        g.strokeStyle = '#1a1a1a'; g.setLineDash([6, 4]);
        g.beginPath(); g.moveTo(mx - 8, my2); g.lineTo(mx + mw + 8, my2); g.stroke();
        g.setLineDash([]);
      }
      g.font = '28px "Segoe UI Emoji", sans-serif';
      g.textAlign = 'center';
      g.fillText('🎤', mx + mw / 2, my - 22);
    }
  },
};
