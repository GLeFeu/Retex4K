// Left Right Dilemma — module multijoueur
// 3 dilemmes par manche, Charlie choisit G/D en silence, les autres devinent quel chalet.
// Branché sur /lrd via server.js (comme /wawaware).
'use strict';

const { WebSocketServer } = require('ws');
const DILEMMAS = require('./lrd-dilemmas.json');

const MAX_PLAYERS    = 20;
const CHARLIE_MS     = 45000;   // 45s pour que Charlie fasse ses 3 choix
const VOTE_MS        = 90000;   // 90s de discussion + vote
const REVEAL_PAUSE   = 12000;   // 12s avant passage automatique à la manche suivante

module.exports = function createLRD() {
  const wss  = new WebSocketServer({ noServer: true });
  const rooms = new Map();
  let nextId = 0;

  /* ---- utilitaires ---- */
  const send = (p, m) => { if (p.ws && p.ws.readyState === 1) p.ws.send(JSON.stringify(m)); };
  const bcast = (room, m, except) => {
    const s = JSON.stringify(m);
    for (const p of room.players)
      if (p !== except && p.ws && p.ws.readyState === 1) p.ws.send(s);
  };
  function newCode() {
    const L = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
    let c;
    do { c = Array.from({length:4}, () => L[Math.floor(Math.random()*L.length)]).join(''); }
    while (rooms.has(c));
    return c;
  }

  /* ---- snapshot salle ---- */
  function snap(room) {
    return {
      t: 'salle',
      code: room.code,
      hote: room.hostId,
      etat: room.state,
      manches: room.rounds,
      mancheActuelle: room.roundIdx,
      scoreGroupe: room.groupScore,
      categories: room.categories,
      avecTimer: room.avecTimer,
      joueurs: room.players.map(p => ({ id:p.id, nom:p.nom, points:p.points, connecte:p.connected })),
    };
  }

  /* ---- pioche 3 dilemmes ---- */
  function pickDilemmas(room) {
    const cats = room.categories;
    let pool = DILEMMAS.filter(d => cats.includes(d.c));
    if (pool.length < 3) pool = DILEMMAS;
    let avail = pool.filter(d => !room.usedIds.has(d.id));
    if (avail.length < 3) { room.usedIds.clear(); avail = pool; }
    const picked = [];
    const taken = new Set();
    while (picked.length < 3) {
      const i = Math.floor(Math.random() * avail.length);
      if (!taken.has(i)) { taken.add(i); picked.push(avail[i]); room.usedIds.add(avail[i].id); }
    }
    return picked;
  }

  /* ---- chalet 1-8 depuis 3 choix ---- */
  //  LLL=1 LLR=2 LRL=3 LRR=4 RLL=5 RLR=6 RRL=7 RRR=8
  function chalet(picks) {
    return picks.reduce((n, c) => n*2 + (c==='droite'?1:0), 0) + 1;
  }

  /* ---- phases ---- */
  function startRound(room) {
    clearTimeout(room.timer);
    room.roundIdx++;
    if (room.roundIdx >= room.rounds) { endGame(room); return; }

    const charlieIdx = room.roundIdx % room.players.length;
    room.charlie = room.players[charlieIdx];
    room.picks   = [];
    room.votes   = new Map();
    room.dilemmas = pickDilemmas(room);
    room.state   = 'charlie';
    room.tDebut  = Date.now();

    bcast(room, {
      t: 'manche',
      num: room.roundIdx + 1,
      total: room.rounds,
      charlie: { id: room.charlie.id, nom: room.charlie.nom },
      dilemmes: room.dilemmas,
      dureeMs: CHARLIE_MS,
      tDebut: room.tDebut,
    });

    const charlieMs = room.avecTimer ? CHARLIE_MS : 30 * 60 * 1000;
    room.timer = setTimeout(() => {
      while (room.picks.length < 3) room.picks.push(Math.random()<.5?'gauche':'droite');
      startVote(room);
    }, charlieMs);
  }

  function startVote(room) {
    clearTimeout(room.timer);
    room.state  = 'vote';
    room.chalet = chalet(room.picks);
    room.tVote  = Date.now();

    const voteMs = room.avecTimer ? VOTE_MS : 30 * 60 * 1000;
    bcast(room, { t:'vote_debut', dureeMs:voteMs, tDebut:room.tVote });

    room.timer = setTimeout(() => endVote(room), voteMs);
    checkAllVoted(room);
  }

  function checkAllVoted(room) {
    if (room.state !== 'vote') return;
    const eligible = room.players.filter(p => p.connected && p !== room.charlie);
    if (eligible.length > 0 && eligible.every(p => room.votes.has(p.id))) endVote(room);
  }

  function endVote(room) {
    clearTimeout(room.timer);
    // vote de groupe = majorité
    const counts = new Array(9).fill(0);
    room.votes.forEach(v => { if (v>=1&&v<=8) counts[v]++; });
    let groupChalet=1, max=-1;
    for (let i=1;i<=8;i++) if (counts[i]>max) { max=counts[i]; groupChalet=i; }

    const correct = groupChalet === room.chalet;
    if (correct) room.groupScore++;

    room.votes.forEach((v, pid) => {
      const p = room.players.find(x=>x.id===pid);
      if (p && v===room.chalet) p.points++;
    });

    room.state = 'revelation';

    const votesObj = {};
    room.votes.forEach((v,id) => { votesObj[id]=v; });

    bcast(room, {
      t: 'revelation',
      chemin: room.picks,
      chalet: room.chalet,
      voteGroupe: groupChalet,
      correct,
      scoreGroupe: room.groupScore,
      votes: votesObj,
      joueurs: room.players.map(p=>({ id:p.id, nom:p.nom, points:p.points })),
    });

    room.timer = setTimeout(() => startRound(room), REVEAL_PAUSE);
  }

  function endGame(room) {
    clearTimeout(room.timer);
    room.state = 'fin';
    const s = room.groupScore, n = room.rounds;
    const pct = n>0 ? s/n : 0;
    const msg =
      pct>=.9 ? 'Vous vous connaissez par cœur ! 🔥' :
      pct>=.7 ? 'Vous vous connaissez très bien ! 😎' :
      pct>=.5 ? 'Pas mal, vous commencez à vous connaître 👀' :
      pct>=.3 ? 'Vous avez encore des surprises à vous faire 😮' :
                'Vous venez à peine de vous rencontrer ? 😅';
    bcast(room, {
      t:'fin', scoreGroupe:s, max:n, message:msg,
      joueurs: room.players.map(p=>({id:p.id,nom:p.nom,points:p.points})).sort((a,b)=>b.points-a.points),
    });
  }

  /* ---- connexions ---- */
  wss.on('connection', ws => {
    const id = String(++nextId);
    const player = { id, nom:'Joueur', ws, room:null, points:0, connected:true };

    ws.on('message', raw => {
      let m; try { m=JSON.parse(raw); } catch(e) { return; }

      /* rejoindre / créer */
      if (m.t === 'rejoindre') {
        let code = (m.code||'').toUpperCase().replace(/[^A-Z]/g,'').slice(0,4);
        let room = code && rooms.get(code);
        if (!room) {
          if (!code||code.length!==4) code=newCode();
          room = {
            code, hostId:id,
            players:[], state:'salon',
            rounds:6, roundIdx:-1, groupScore:0,
            categories:['normal','fun'],
            avecTimer: true,
            dilemmas:[], charlie:null, picks:[], chalet:0,
            votes:new Map(), usedIds:new Set(),
            timer:null, tDebut:0, tVote:0,
          };
          rooms.set(code, room);
        }
        if (room.players.length >= MAX_PLAYERS) { send(player, {t:'erreur',texte:'Salle pleine.'}); return; }
        player.nom = String(m.nom||'Joueur').slice(0,20)||'Joueur';
        player.points = 0; player.connected = true; player.room = room;
        room.players.push(player);
        send(player, {t:'bienvenue', id:player.id, code:room.code, hote:room.hostId});
        bcast(room, snap(room));
        return;
      }

      const room = player.room;
      if (!room) return;

      /* réglages (hôte, salon) */
      if (m.t==='settings' && player.id===room.hostId && room.state==='salon') {
        if (Array.isArray(m.categories)&&m.categories.length>0)
          room.categories = m.categories.filter(c=>['normal','fun','18plus','wtf','extreme'].includes(c));
        if (typeof m.manches==='number'&&m.manches>=3&&m.manches<=20)
          room.rounds = m.manches;
        if (typeof m.avecTimer==='boolean')
          room.avecTimer = m.avecTimer;
        bcast(room, snap(room));
        return;
      }

      /* lancer la partie */
      if (m.t==='demarrer' && player.id===room.hostId && room.state==='salon') {
        if (room.players.length < 2) { send(player,{t:'erreur',texte:'Il faut au moins 2 joueurs.'}); return; }
        for (const p of room.players) p.points=0;
        room.groupScore=0; room.roundIdx=-1; room.usedIds.clear();
        startRound(room);
        return;
      }

      /* choix de Charlie */
      if (m.t==='choix' && room.state==='charlie' && player===room.charlie) {
        if (room.picks.length<3) {
          room.picks.push(m.dir==='droite'?'droite':'gauche');
          if (room.picks.length===3) startVote(room);
        }
        return;
      }

      /* vote d'un joueur */
      if (m.t==='vote' && room.state==='vote' && player!==room.charlie) {
        const v=parseInt(m.chalet);
        if (v>=1&&v<=8) {
          room.votes.set(player.id, v);
          const eligible=room.players.filter(p=>p.connected&&p!==room.charlie);
          bcast(room, {t:'votes_update', nb:room.votes.size, total:eligible.length});
          checkAllVoted(room);
        }
        return;
      }

      /* hôte passe à la manche suivante */
      if (m.t==='suivant' && player.id===room.hostId && room.state==='revelation') {
        clearTimeout(room.timer); startRound(room);
        return;
      }

      /* rejouer */
      if (m.t==='rejouer' && player.id===room.hostId) {
        clearTimeout(room.timer);
        room.state='salon'; room.groupScore=0; room.roundIdx=-1; room.usedIds.clear();
        for (const p of room.players) p.points=0;
        bcast(room, snap(room));
        return;
      }
    });

    ws.on('close', () => {
      player.connected = false;
      const room = player.room;
      if (!room) return;
      room.players = room.players.filter(p=>p!==player);
      if (!room.players.length) { clearTimeout(room.timer); rooms.delete(room.code); return; }
      if (player.id===room.hostId) room.hostId=room.players[0].id;
      if (room.state==='charlie'&&room.charlie===player) {
        while (room.picks.length<3) room.picks.push(Math.random()<.5?'gauche':'droite');
        startVote(room); return;
      }
      if (room.state==='vote') checkAllVoted(room);
      bcast(room, snap(room));
    });
  });

  return { handleUpgrade: (req, sock, head) => wss.handleUpgrade(req, sock, head, ws => wss.emit('connection', ws, req)) };
};
