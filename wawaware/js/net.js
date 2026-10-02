// Multijoueur côté navigateur : connexion au serveur, salon, synchro des horloges, fantômes.
//
// Fantômes : pendant un mini-jeu, chaque joueur vivant envoie la position de sa souris (ou de son
// perso) 30 fois par seconde. À la réception, on garde les dernières positions et on affiche le
// fantôme avec 100 ms de retard en interpolant entre deux positions : le mouvement reste fluide
// à 60 images/seconde même si les messages arrivent un peu irrégulièrement.
const Net = {
  ws: null,
  connected: false,
  id: null,
  room: null,          // dernier état de la salle envoyé par le serveur
  offset: 0,           // heure serveur - heure locale (ms)
  bestRtt: Infinity,
  ghosts: new Map(),   // id -> [{ t, m, x, y, f }]
  lostRound: new Map(), // id -> manche où ce joueur a raté (son fantôme est caché)
  lastSend: 0,
  handlers: {},        // callbacks de l'interface (salle, fin, erreur…)
  SEND_EVERY: 30, // ≈ 30 envois/s (marge pour les images à 16,7 ms)
  DELAY: 100,

  available() { return !!WAWAWARE_SERVEUR || /^https?:$/.test(location.protocol); },

  serverUrl() {
    if (WAWAWARE_SERVEUR) return WAWAWARE_SERVEUR; // serveur hébergé ailleurs (js/config.js)
    const base = location.pathname.replace(/[^/]*$/, ''); // marche aussi sous /wawaware/
    return `${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}${base}ws`;
  },

  connect() {
    if (this.ws && this.ws.readyState <= 1) return Promise.resolve();
    return new Promise((resolve, reject) => {
      const ws = new WebSocket(this.serverUrl());
      this.ws = ws;
      ws.onopen = () => {
        this.connected = true;
        for (let i = 0; i < 6; i++) setTimeout(() => this.send({ t: 'ping', c: performance.now() }), i * 150);
        this.pingTimer = setInterval(() => this.send({ t: 'ping', c: performance.now() }), 5000);
        resolve();
      };
      const timeout = setTimeout(() => { ws.close(); reject(new Error('délai dépassé')); }, 15000);
      ws.addEventListener('open', () => clearTimeout(timeout));
      ws.onerror = () => { clearTimeout(timeout); reject(new Error('Serveur multijoueur introuvable')); };
      ws.onclose = () => {
        this.connected = false;
        clearInterval(this.pingTimer);
        this.room = null;
        this.emit('deconnecte');
      };
      ws.onmessage = (e) => { try { this.onMessage(JSON.parse(e.data)); } catch (err) { Engine.report('réseau', err); } };
    });
  },

  // Le serveur gratuit (Render) s'endort après 15 min sans visite : on le réveille dès l'ouverture du salon
  wake() {
    if (!WAWAWARE_SERVEUR) return;
    fetch(WAWAWARE_SERVEUR.replace(/^ws/, 'http').replace(/\/wawaware\/?$/, '/'), { mode: 'no-cors' }).catch(() => {});
  },

  send(msg) { if (this.ws && this.ws.readyState === 1) this.ws.send(JSON.stringify(msg)); },
  on(name, fn) { this.handlers[name] = fn; },
  emit(name, data) { if (this.handlers[name]) this.handlers[name](data); },

  // heure serveur -> heure locale (performance.now)
  toLocal(serverMs) { return serverMs - this.offset; },

  me() { return this.room && this.room.joueurs.find(j => j.id === this.id); },
  player(id) { return this.room && this.room.joueurs.find(j => j.id === id); },
  isHost() { return this.room && this.room.hote === this.id; },

  onMessage(m) {
    switch (m.t) {
      case 'pong': {
        const now = performance.now(), rtt = now - m.c;
        if (rtt < this.bestRtt * 1.5) { // on garde les mesures les plus rapides, plus fiables
          this.bestRtt = Math.min(this.bestRtt, rtt);
          this.offset = m.s - (m.c + rtt / 2);
        }
        break;
      }
      case 'bienvenue': this.id = m.id; break;
      case 'salle': {
        const wasAlive = this.me() && this.me().vivant;
        this.room = m;
        const me = this.me();
        // je viens d'être éliminé : le jeu affiche le grand écran "TU ES ÉLIMINÉ"
        if (Engine.multi && wasAlive && me && me.enJeu && !me.vivant) Engine.multi.deadAt = performance.now();
        this.emit('salle', m);
        break;
      }
      case 'perdu': this.lostRound.set(m.i, m.m); break;
      case 'erreur': this.emit('erreur', m.texte); break;
      case 'debut':
        this.ghosts.clear();
        this.lostRound.clear();
        Engine.startMulti({ seed: m.graine, micro: m.micro, round: m.manche, at: this.toLocal(m.a) });
        this.emit('debut');
        break;
      case 'manche': Engine.multiNextRound(m.manche, this.toLocal(m.a)); break;
      case 'bilan': Engine.multiResults(m.resultats); break;
      case 'fin': Engine.multiEnd(); this.emit('fin', m.classement); break;
      case 'parti': this.ghosts.delete(m.i); break;
      case 'p': {
        let buf = this.ghosts.get(m.i);
        if (!buf) { buf = []; this.ghosts.set(m.i, buf); }
        buf.push({ t: performance.now(), m: m.m, x: m.x, y: m.y, f: m.f });
        if (buf.length > 30) buf.splice(0, buf.length - 30);
        break;
      }
    }
  },

  // Appelé à chaque image pendant un mini-jeu : envoie ma position (si je suis encore en vie)
  sendGhost(round, pos) {
    const now = performance.now();
    if (!pos || now - this.lastSend < this.SEND_EVERY) return;
    const me = this.me();
    if (!me || !me.vivant) return;
    this.lastSend = now;
    this.send({ t: 'p', m: round, x: Math.round(pos.x), y: Math.round(pos.y), f: pos.f });
  },

  // Position interpolée d'un fantôme, affichée avec DELAY ms de retard
  ghostPos(buf, round) {
    const target = performance.now() - this.DELAY;
    const pts = buf.filter(s => s.m === round);
    if (!pts.length) return null;
    if (performance.now() - pts[pts.length - 1].t > 1500) return null; // plus de nouvelles
    let a = pts[0], b = pts[0];
    for (const s of pts) { if (s.t <= target) a = s; else { b = s; break; } b = s; }
    if (a === b || b.t === a.t) return { x: b.x, y: b.y, f: b.f };
    const k = clamp((target - a.t) / (b.t - a.t), 0, 1);
    return { x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k, f: k < 0.5 ? a.f : b.f };
  },

  drawGhosts(g, game, round) {
    for (const [id, buf] of this.ghosts) {
      const pl = this.player(id);
      if (!pl || !pl.vivant) continue; // les éliminés ne sont plus montrés
      if (this.lostRound.get(id) === round) continue; // a raté ce mini-jeu : son fantôme disparaît
      const pos = this.ghostPos(buf, round);
      if (!pos) continue;
      g.save();
      g.globalAlpha = 0.18; // les autres restent très discrets : c'est ton jeu qui compte
      if (game.drawGhost) game.drawGhost(g, pos, pl.couleur);
      else this.drawCursor(g, pos.x, pos.y, pl.couleur);
      g.restore();
      const ny = game.ghostLabelY ? game.ghostLabelY(pos) : pos.y - 26;
      g.save();
      g.globalAlpha = 0.3;
      g.font = `15px ${FONT}`;
      const w = g.measureText(pl.nom).width + 14;
      Draw.rrect(g, pos.x - w / 2, ny - 11, w, 20, 10); g.fillStyle = pl.couleur; g.fill();
      Draw.text(g, pl.nom, pos.x, ny, 15, '#1a1a1a', null);
      g.restore();
    }
  },

  drawCursor(g, x, y, col) {
    g.beginPath();
    g.moveTo(x, y); g.lineTo(x, y + 26); g.lineTo(x + 7, y + 19); g.lineTo(x + 12, y + 30);
    g.lineTo(x + 17, y + 28); g.lineTo(x + 12, y + 17); g.lineTo(x + 21, y + 17); g.closePath();
    Draw.fillStroke(g, col, '#1a1a1a', 2.5);
  },
};
