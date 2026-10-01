// WawaWare : logique multijoueur (salles, manches, vies, fantômes).
// Ce module ne crée pas de serveur : il fournit un WebSocketServer à brancher sur un serveur
// existant (serveur/serveur.js en local, ou le serveur Render du site retex4k.com).
//
// Déroulement d'une partie :
//  - les joueurs rejoignent une salle (code de 4 lettres) : c'est le salon d'attente ;
//  - l'hôte lance : tout le monde reçoit la même graine, donc la même suite de mini-jeux ;
//  - chaque manche démarre à une heure donnée par le serveur (horloges synchronisées) ;
//  - chacun envoie son résultat, le serveur fait le bilan (vies, éliminations) et lance la suite ;
//  - pendant les jeux, les positions (souris / perso) des joueurs VIVANTS sont relayées à tous :
//    ce sont les fantômes. Les éliminés continuent à jouer mais ne sont plus montrés aux autres.
const { WebSocketServer } = require('ws');

const MAX_LIVES = 4;
const MAX_PLAYERS = 12;
const COLORS = ['#ff3c6e', '#3a86ff', '#06d6a0', '#ffd400', '#9d4edd', '#fb8500', '#4cc9f0', '#ff6b9d', '#80ed99', '#e5e5e5', '#c77dff', '#f4a261'];
const BETWEEN_MS = 350;      // on enchaîne directement sur le mini-jeu suivant (petite marge réseau)
const RESULT_TIMEOUT = 4000; // on n'attend pas plus les retardataires

module.exports = function creerWawaWare() {
  const rooms = new Map();
  let nextId = 1;

  const send = (p, msg) => { if (p.ws.readyState === 1) p.ws.send(JSON.stringify(msg)); };
  const broadcast = (room, msg, except) => { const s = JSON.stringify(msg); for (const p of room.players) if (p !== except && p.ws.readyState === 1) p.ws.send(s); };

  function newCode() {
    const L = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
    let c;
    do { c = Array.from({ length: 4 }, () => L[Math.floor(Math.random() * L.length)]).join(''); } while (rooms.has(c));
    return c;
  }

  function roomInfo(room) {
    return {
      t: 'salle', code: room.code, hote: room.hostId, etat: room.state, micro: room.micro, manche: room.round,
      joueurs: room.players.map(p => ({ id: p.id, nom: p.name, couleur: p.color, vies: p.lives, score: p.score, vivant: p.alive, enJeu: p.inGame })),
    };
  }

  function joinRoom(p, wanted) {
    let code = (wanted || '').toUpperCase().replace(/[^A-Z]/g, '').slice(0, 4);
    let room = code && rooms.get(code);
    if (!room) {
      if (!code || code.length !== 4) code = newCode();
      room = { code, players: [], hostId: p.id, state: 'salon', micro: false, round: 0, seed: 0, results: new Map(), timer: null, startCount: 0 };
      rooms.set(code, room);
    }
    if (room.players.length >= MAX_PLAYERS) return send(p, { t: 'erreur', texte: 'Salle pleine.' });
    const used = new Set(room.players.map(o => o.color));
    p.color = COLORS.find(c => !used.has(c)) || COLORS[p.id % COLORS.length];
    p.room = room;
    p.lives = MAX_LIVES; p.score = 0;
    p.alive = room.state !== 'jeu'; // arriver pendant une partie = attendre la suivante
    p.inGame = false;
    room.players.push(p);
    send(p, { t: 'bienvenue', id: p.id, salle: room.code });
    broadcast(room, roomInfo(room));
  }

  function leaveRoom(p) {
    const room = p.room;
    if (!room) return;
    room.players = room.players.filter(o => o !== p);
    p.room = null;
    if (!room.players.length) { clearTimeout(room.timer); rooms.delete(room.code); return; }
    if (room.hostId === p.id) room.hostId = room.players[0].id;
    broadcast(room, { t: 'parti', id: p.id });
    broadcast(room, roomInfo(room));
    if (room.state === 'jeu') checkRound(room);
  }

  function startGame(room) {
    clearTimeout(room.timer);
    room.state = 'jeu';
    room.seed = Math.floor(Math.random() * 2 ** 31);
    room.round = 0;
    room.results = new Map();
    for (const p of room.players) { p.lives = MAX_LIVES; p.score = 0; p.alive = true; p.inGame = true; p.outRound = -1; }
    room.startCount = room.players.length;
    broadcast(room, { t: 'debut', graine: room.seed, micro: room.micro, manche: 0, a: Date.now() + 1500 });
    broadcast(room, roomInfo(room));
  }

  const alivePlayers = (room) => room.players.filter(p => p.inGame && p.alive);

  function checkRound(room) {
    if (alivePlayers(room).every(p => room.results.has(p.id))) finishRound(room);
  }

  function finishRound(room) {
    clearTimeout(room.timer);
    room.timer = null;
    if (room.state !== 'jeu') return;
    const res = {};
    for (const p of alivePlayers(room)) {
      const win = room.results.get(p.id) === true; // pas de réponse = raté
      res[p.id] = win;
      if (win) p.score++;
      else if (--p.lives <= 0) { p.alive = false; p.outRound = room.round; }
    }
    room.results = new Map();
    const alive = alivePlayers(room).length;
    broadcast(room, { t: 'bilan', manche: room.round, resultats: res });
    broadcast(room, roomInfo(room));
    const over = room.startCount > 1 ? alive <= 1 : alive === 0;
    if (over) {
      room.state = 'salon';
      const ranking = room.players.filter(p => p.inGame)
        .sort((a, b) => (b.alive - a.alive) || (b.outRound - a.outRound) || (b.score - a.score))
        .map((p, i) => ({ rang: i + 1, id: p.id, nom: p.name, couleur: p.color, score: p.score, vivant: p.alive }));
      for (const p of room.players) { p.inGame = false; p.alive = true; }
      setTimeout(() => {
        broadcast(room, { t: 'fin', classement: ranking });
        broadcast(room, roomInfo(room));
      }, 1500);
      return;
    }
    room.round++;
    broadcast(room, { t: 'manche', manche: room.round, a: Date.now() + BETWEEN_MS });
  }

  // traitement d'un message d'un joueur (une erreur ici ne doit jamais arrêter le serveur)
  function handle(p, m) {
    const room = p.room;
    switch (m.t) {
      case 'ping': send(p, { t: 'pong', c: m.c, s: Date.now() }); break;
      case 'rejoindre':
        if (room) leaveRoom(p);
        p.name = String(m.nom || 'Joueur').replace(/[<>]/g, '').trim().slice(0, 12) || 'Joueur';
        joinRoom(p, m.salle);
        break;
      case 'quitter': leaveRoom(p); break;
      case 'options':
        if (room && room.hostId === p.id && room.state === 'salon') { room.micro = !!m.micro; broadcast(room, roomInfo(room)); }
        break;
      case 'lancer':
        if (room && room.hostId === p.id && room.state === 'salon') startGame(room);
        break;
      case 'p': // position fantôme : seuls les vivants sont montrés aux autres
        if (room && room.state === 'jeu' && p.inGame && p.alive) {
          broadcast(room, { t: 'p', i: p.id, m: m.m, x: m.x, y: m.y, f: m.f }, p);
        }
        break;
      case 'resultat':
        if (room && room.state === 'jeu' && p.alive && p.inGame && m.manche === room.round && !room.results.has(p.id)) {
          room.results.set(p.id, !!m.gagne);
          if (!room.timer) room.timer = setTimeout(() => finishRound(room), RESULT_TIMEOUT);
          checkRound(room);
        }
        break;
      case 'bug': // un mini-jeu a planté chez un joueur : on le note pour pouvoir le corriger
        console.warn(`[wawaware bug] ${p.name} (salle ${room ? room.code : '-'}) : ${String(m.ou).slice(0, 80)}\n${String(m.texte).slice(0, 600)}`);
        break;
    }
  }

  const wss = new WebSocketServer({ noServer: true });

  wss.on('connection', (ws) => {
    const p = { id: nextId++, ws, name: 'Joueur', room: null, alive: true, lives: MAX_LIVES, score: 0 };
    ws.isAlive = true;
    ws.on('pong', () => { ws.isAlive = true; });
    ws.on('message', (data) => {
      let m;
      try { m = JSON.parse(data); } catch { return; }
      if (!m || typeof m !== 'object') return;
      try { handle(p, m); } catch (err) { console.error('[wawaware] message mal traité :', m.t, err); }
    });
    ws.on('close', () => { try { leaveRoom(p); } catch (err) { console.error('[wawaware] départ mal traité :', err); } });
  });

  // coupe les connexions mortes (onglet fermé brutalement)
  const sweep = setInterval(() => {
    for (const ws of wss.clients) {
      if (!ws.isAlive) { ws.terminate(); continue; }
      ws.isAlive = false;
      ws.ping();
    }
  }, 15000);
  wss.on('close', () => clearInterval(sweep));

  return {
    wss,
    // à appeler depuis server.on('upgrade') pour les connexions destinées à WawaWare
    handleUpgrade(req, socket, head) {
      wss.handleUpgrade(req, socket, head, (ws) => wss.emit('connection', ws, req));
    },
  };
};
