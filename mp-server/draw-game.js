/* ---------- Drawing game ("Dessin") ----------
   A round goes through four phases, all driven by the server:
     pick   -> each drawer picks what to draw (1 of 4 random subjects, or a free subject)
     draw   -> drawers draw; in "one drawer" mode the strokes are relayed live
     guess  -> guessers get a drawing and answer (choices or typed text);
               for a free subject with typed answers, the drawer validates
     reveal -> every drawing of the round is shown with its answer
   "all" mode: everybody draws at once, then each player guesses someone else's
   drawing (rotating every round). "one" mode: a single drawer per round,
   everybody else guesses.
   "contest" game: one player (in turn) picks a subject, everybody draws that
   same subject, then everybody votes for the best drawing (not their own). */

const PICK_MS = 20000;
const FREE_PICK_MS = 45000;
const GUESS_CHOICE_MS = 20000;
const GUESS_TEXT_MS = 30000;
const REVEAL_MS = 8000;
const VOTE_MS = 25000;
const POINTS_PER_VOTE = 50;
const SUBMIT_GRACE_MS = 2500;
const GUESSER_MAX_POINTS = 100;
const DRAWER_POINTS_PER_FINDER = 50;
/* Drawing aids cost the drawer part of the points they earn per finder:
   showing the reference -30%, tracing over it -60%. */
const AID_FACTOR = { none: 1, reference: 0.7, trace: 0.4 };
const MAX_IMAGE_CHARS = 2_000_000;

function normalize(text) {
  return String(text || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function shuffle(array) {
  const a = array.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function cleanText(value, max = 60) {
  return String(value || '').replace(/\s+/g, ' ').trim().slice(0, max);
}

function createDrawGame({ send, broadcast, broadcastScoreboard, scoreboard }) {
  function playerName(room, id) {
    const p = room.players.get(id);
    return p ? p.name : '?';
  }

  function isConnected(room, id) {
    const p = room.players.get(id);
    return !!(p && p.connected);
  }

  function sendTo(room, id, payload) {
    const p = room.players.get(id);
    if (p) send(p.ws, payload);
  }

  function setTimer(room, ms, fn) {
    clearTimeout(room.draw.timer);
    room.draw.timer = setTimeout(fn, ms);
  }

  function uniqueByName(list) {
    const seen = new Set();
    return list.filter((s) => {
      const key = normalize(s.name);
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  /* ---------- start ---------- */

  function start(room, msg) {
    const s = msg.settings && typeof msg.settings === 'object' ? msg.settings : {};
    const pool = uniqueByName((Array.isArray(msg.pool) ? msg.pool : [])
      .slice(0, 400)
      .map((e) => ({ name: cleanText(e.name), kind: cleanText(e.kind, 20), image: typeof e.image === 'string' ? e.image.slice(0, 500) : null }))
      .filter((e) => e.name));

    const settings = {
      game: s.game === 'contest' ? 'contest' : 'guess',
      who: s.who === 'one' ? 'one' : 'all',
      subject: s.subject === 'free' ? 'free' : 'random',
      answer: s.answer === 'text' ? 'text' : 'choice',
      choiceCount: Math.min(10, Math.max(2, Number(s.choiceCount) || 4)),
      drawMs: Math.min(180000, Math.max(15000, Number(s.drawMs) || 60000)),
      rounds: Math.min(10, Math.max(1, Number(s.rounds) || 2)),
      guessMs: Math.min(60000, Math.max(3000, Number(s.guessMs) || 0)) || null,
    };
    if (settings.subject === 'random' && pool.length === 0) return false;

    const order = Array.from(room.players.values()).filter((p) => p.connected).map((p) => p.id);
    if (order.length === 0) return false;

    clearTimeout(room.roundTimeoutId);
    if (room.draw) clearTimeout(room.draw.timer);
    room.started = true;
    room.paused = false;
    room.tracks = [];
    room.currentIndex = -1;
    room.players.forEach((p) => { p.score = 0; p.points = 0; p.answered = false; });
    room.draw = {
      settings,
      pool,
      order,
      round: -1,
      totalRounds: settings.who === 'one' && settings.game === 'guess' ? settings.rounds * order.length : settings.rounds,
      phase: null,
      durationMs: 0,
      phaseStartedAt: 0,
      entries: new Map(),
      guesses: new Map(),
      timer: null,
    };

    broadcast(room, {
      type: 'drawStarting',
      settings,
      totalRounds: room.draw.totalRounds,
      poolNames: pool.map((e) => e.name),
    });
    broadcastScoreboard(room);
    nextRound(room);
    return true;
  }

  function drawersForRound(room) {
    const d = room.draw;
    if (d.settings.who === 'one' && d.settings.game === 'guess') {
      // skip disconnected players when it's their turn
      for (let k = 0; k < d.order.length; k++) {
        const id = d.order[(d.round + k) % d.order.length];
        if (isConnected(room, id)) return [id];
      }
      return [];
    }
    return d.order.filter((id) => isConnected(room, id));
  }

  function broadcastPhase(room, extra = {}) {
    const d = room.draw;
    broadcast(room, {
      type: 'drawPhase',
      phase: d.phase,
      round: d.round,
      totalRounds: d.totalRounds,
      durationMs: d.durationMs,
      drawers: Array.from(d.entries.keys()).map((id) => ({ id, name: playerName(room, id) })),
      ...extra,
    });
  }

  /* ---------- pick ---------- */

  function nextRound(room) {
    const d = room.draw;
    d.round += 1;
    if (d.round >= d.totalRounds) {
      finish(room);
      return;
    }
    d.entries = new Map();
    d.guesses = new Map();
    const drawers = drawersForRound(room);
    if (drawers.length === 0) {
      finish(room);
      return;
    }

    d.phase = 'pick';
    d.durationMs = d.settings.subject === 'free' ? FREE_PICK_MS : PICK_MS;
    d.phaseStartedAt = Date.now();
    if (d.settings.game === 'contest') {
      d.chooserId = chooserForRound(room);
      d.contestOptions = d.settings.subject === 'random' ? shuffle(d.pool).slice(0, 4) : [];
      d.contestSubject = null;
      drawers.forEach((id) => d.entries.set(id, newEntry(id, [])));
      broadcastPhase(room, { chooser: { id: d.chooserId, name: playerName(room, d.chooserId) } });
      sendTo(room, d.chooserId, {
        type: 'drawPick',
        round: d.round,
        free: d.settings.subject === 'free',
        wrongCount: 0,
        options: d.contestOptions,
        durationMs: d.durationMs,
        forEveryone: true,
      });
      setTimer(room, d.durationMs, () => endPick(room));
      return;
    }
    drawers.forEach((id) => {
      d.entries.set(id, newEntry(id, d.settings.subject === 'random' ? shuffle(d.pool).slice(0, 4) : []));
    });
    broadcastPhase(room);
    d.entries.forEach((entry, id) => sendPick(room, id, entry));
    setTimer(room, d.durationMs, () => endPick(room));
  }

  function newEntry(id, options) {
    return { drawerId: id, options, subject: null, wrong: [], picked: false, image: null, aid: 'none', submitted: false, finders: [], votes: [] };
  }

  function chooserForRound(room) {
    const d = room.draw;
    for (let k = 0; k < d.order.length; k++) {
      const id = d.order[(d.round + k) % d.order.length];
      if (isConnected(room, id)) return id;
    }
    return d.order[0];
  }

  function sendPick(room, id, entry) {
    const d = room.draw;
    sendTo(room, id, {
      type: 'drawPick',
      round: d.round,
      free: d.settings.subject === 'free',
      wrongCount: d.settings.answer === 'choice' ? 3 : 0,
      options: entry.options,
      durationMs: Math.max(0, d.durationMs - (Date.now() - d.phaseStartedAt)),
    });
  }

  function handlePicked(room, player, msg) {
    const d = room.draw;
    if (d.settings.game === 'contest') {
      if (d.phase !== 'pick' || player.id !== d.chooserId || d.contestSubject) return;
      if (d.settings.subject === 'random') {
        const option = d.contestOptions[Number(msg.index)];
        if (!option) return;
        d.contestSubject = option;
      } else {
        const name = cleanText(msg.name);
        if (!name) return;
        d.contestSubject = { name, kind: 'free', image: null };
      }
      endPick(room);
      return;
    }
    const entry = d.entries.get(player.id);
    if (d.phase !== 'pick' || !entry || entry.picked) return;
    if (d.settings.subject === 'random') {
      const option = entry.options[Number(msg.index)];
      if (!option) return;
      entry.subject = option;
    } else {
      const name = cleanText(msg.name);
      if (!name) return;
      entry.subject = { name, kind: 'free', image: null };
      const wrong = (Array.isArray(msg.wrong) ? msg.wrong : []).map((w) => cleanText(w)).filter((w) => w && normalize(w) !== normalize(name));
      entry.wrong = uniqueByName(wrong.map((w) => ({ name: w }))).slice(0, 3).map((w) => w.name);
    }
    entry.picked = true;
    if (Array.from(d.entries.values()).every((e) => e.picked || !isConnected(room, e.drawerId))) endPick(room);
  }

  function fallbackSubject(room) {
    const d = room.draw;
    const pick = d.pool.length ? d.pool[Math.floor(Math.random() * d.pool.length)] : null;
    return pick || { name: '?', kind: 'free', image: null };
  }

  function endPick(room) {
    const d = room.draw;
    if (d.phase !== 'pick') return;
    if (d.settings.game === 'contest') {
      const subject = d.contestSubject || d.contestOptions[0] || fallbackSubject(room);
      d.entries.forEach((entry) => { entry.subject = subject; });
    }
    d.entries.forEach((entry) => {
      if (!entry.subject) entry.subject = entry.options[0] || fallbackSubject(room);
      entry.picked = true;
    });

    d.phase = 'draw';
    d.durationMs = d.settings.drawMs;
    d.phaseStartedAt = Date.now();
    broadcastPhase(room);
    d.entries.forEach((entry, id) => {
      sendTo(room, id, { type: 'drawSubject', subject: entry.subject, durationMs: d.durationMs });
    });
    setTimer(room, d.durationMs + SUBMIT_GRACE_MS, () => endDraw(room));
  }

  /* ---------- draw ---------- */

  function handleStroke(room, player, msg) {
    const d = room.draw;
    if (d.phase !== 'draw' || d.settings.who !== 'one' || d.settings.game !== 'guess' || !d.entries.has(player.id)) return;
    const data = JSON.stringify({ type: 'drawStroke', op: msg.op, stroke: msg.stroke });
    if (data.length > 600000) return;
    room.players.forEach((p) => {
      if (p.id !== player.id && p.ws && p.ws.readyState === 1) p.ws.send(data);
    });
  }

  function handleSubmit(room, player, msg) {
    const d = room.draw;
    const entry = d.entries.get(player.id);
    if (d.phase !== 'draw' || !entry || entry.submitted) return;
    if (typeof msg.image !== 'string' || !msg.image.startsWith('data:image/') || msg.image.length > MAX_IMAGE_CHARS) return;
    entry.image = msg.image;
    entry.aid = AID_FACTOR[msg.aid] ? msg.aid : 'none';
    entry.submitted = true;
    if (Array.from(d.entries.values()).every((e) => e.submitted || !isConnected(room, e.drawerId))) endDraw(room);
  }

  /* ---------- guess ---------- */

  function buildOptions(room, entry) {
    const d = room.draw;
    if (d.settings.answer !== 'choice') return null;
    if (d.settings.subject === 'free') {
      return shuffle([entry.subject.name, ...entry.wrong]);
    }
    const others = shuffle(d.pool.filter((e) => normalize(e.name) !== normalize(entry.subject.name)));
    const sameKind = others.filter((e) => e.kind === entry.subject.kind);
    const rest = others.filter((e) => e.kind !== entry.subject.kind);
    const decoys = [...sameKind, ...rest].slice(0, d.settings.choiceCount - 1).map((e) => e.name);
    return shuffle([entry.subject.name, ...decoys]);
  }

  function endDraw(room) {
    const d = room.draw;
    if (d.phase !== 'draw') return;
    d.entries.forEach((entry, id) => { if (!entry.image) d.entries.delete(id); });
    if (d.settings.game === 'contest') {
      startVote(room);
      return;
    }

    const drawerIds = Array.from(d.entries.keys());
    const connected = d.order.filter((id) => isConnected(room, id));
    if (d.settings.who === 'one') {
      const drawerId = drawerIds[0];
      if (drawerId) connected.filter((id) => id !== drawerId).forEach((id) => d.guesses.set(id, { drawerId }));
    } else if (drawerIds.length > 1) {
      // rotate: at round r every guesser gets the drawing of the player `shift` places after them
      const n = drawerIds.length;
      const shift = 1 + (d.round % (n - 1));
      drawerIds.forEach((id, i) => d.guesses.set(id, { drawerId: drawerIds[(i + shift) % n] }));
    }

    if (d.guesses.size === 0) {
      reveal(room);
      return;
    }

    d.phase = 'guess';
    d.durationMs = d.settings.guessMs || (d.settings.answer === 'choice' ? GUESS_CHOICE_MS : GUESS_TEXT_MS);
    d.phaseStartedAt = Date.now();
    broadcastPhase(room, { guessers: Array.from(d.guesses.keys()) });
    d.guesses.forEach((g, guesserId) => {
      const entry = d.entries.get(g.drawerId);
      g.answered = false;
      g.pending = false;
      g.correct = false;
      sendTo(room, guesserId, {
        type: 'drawGuess',
        drawerId: g.drawerId,
        drawerName: playerName(room, g.drawerId),
        image: entry.image,
        kind: entry.subject.kind,
        options: buildOptions(room, entry),
        needsValidation: d.settings.subject === 'free' && d.settings.answer === 'text',
        durationMs: d.durationMs,
      });
    });
    setTimer(room, d.durationMs + 400, () => endGuess(room));
  }

  function speedFactor(room, at) {
    const d = room.draw;
    const ratio = Math.min(1, Math.max(0, (at - d.phaseStartedAt) / d.durationMs));
    return Math.max(0.5, 1 - 0.5 * ratio);
  }

  function resolveGuess(room, guesserId, correct) {
    const d = room.draw;
    const g = d.guesses.get(guesserId);
    if (!g || g.resolved) return;
    g.resolved = true;
    g.pending = false;
    g.correct = correct;
    const entry = d.entries.get(g.drawerId);
    let points = 0;
    if (correct) {
      const guesser = room.players.get(guesserId);
      const drawer = room.players.get(g.drawerId);
      points = Math.round(GUESSER_MAX_POINTS * speedFactor(room, g.answeredAt));
      if (guesser) { guesser.score += 1; guesser.points += points; }
      if (drawer) drawer.points += Math.round(DRAWER_POINTS_PER_FINDER * AID_FACTOR[entry.aid]);
      entry.finders.push(playerName(room, guesserId));
    }
    sendTo(room, guesserId, { type: 'drawAnswerResult', correct, points, answer: entry.subject.name });
    broadcastScoreboard(room);
    if (allGuessesResolved(room)) endGuess(room);
  }

  function allGuessesResolved(room) {
    return Array.from(room.draw.guesses.entries()).every(([id, g]) => g.resolved || !isConnected(room, id));
  }

  function handleAnswer(room, player, msg) {
    const d = room.draw;
    const g = d.guesses.get(player.id);
    if (d.phase !== 'guess' || !g || g.answered) return;
    const answer = cleanText(msg.answer);
    if (!answer) return;
    g.answered = true;
    g.answer = answer;
    g.answeredAt = Date.now();
    const entry = d.entries.get(g.drawerId);
    if (d.settings.subject === 'free' && d.settings.answer === 'text') {
      if (normalize(answer) === normalize(entry.subject.name)) {
        resolveGuess(room, player.id, true);
        return;
      }
      g.pending = true;
      sendTo(room, player.id, { type: 'drawAnswerPending' });
      sendTo(room, g.drawerId, { type: 'drawValidate', guesserId: player.id, guesserName: player.name, answer, subject: entry.subject.name });
      return;
    }
    resolveGuess(room, player.id, normalize(answer) === normalize(entry.subject.name));
  }

  function handleVerdict(room, player, msg) {
    const d = room.draw;
    const g = d.guesses.get(String(msg.guesserId));
    if (d.phase !== 'guess' || !g || !g.pending || g.drawerId !== player.id) return;
    resolveGuess(room, String(msg.guesserId), !!msg.correct);
  }

  function endGuess(room) {
    const d = room.draw;
    if (d.phase !== 'guess') return;
    d.guesses.forEach((g, id) => { if (!g.resolved) resolveGuess(room, id, false); });
    if (d.phase === 'guess') reveal(room);
  }

  /* ---------- contest vote ---------- */

  function startVote(room) {
    const d = room.draw;
    d.voters = new Map(); // voterId -> drawerId voted for
    const candidates = Array.from(d.entries.values());
    if (candidates.length < 2) {
      reveal(room);
      return;
    }
    d.phase = 'vote';
    d.durationMs = VOTE_MS;
    d.phaseStartedAt = Date.now();
    broadcastPhase(room);
    broadcast(room, {
      type: 'drawVote',
      subject: candidates[0].subject,
      durationMs: VOTE_MS,
      entries: shuffle(candidates).map((e) => ({ drawerId: e.drawerId, drawerName: playerName(room, e.drawerId), image: e.image })),
    });
    setTimer(room, VOTE_MS + 400, () => endVote(room));
  }

  function eligibleVoters(room) {
    return room.draw.order.filter((id) => isConnected(room, id));
  }

  function handleVoteCast(room, player, msg) {
    const d = room.draw;
    const drawerId = String(msg.drawerId);
    if (d.phase !== 'vote' || d.voters.has(player.id) || drawerId === player.id || !d.entries.has(drawerId)) return;
    d.voters.set(player.id, drawerId);
    d.entries.get(drawerId).votes.push(player.name);
    if (eligibleVoters(room).every((id) => d.voters.has(id))) endVote(room);
  }

  function endVote(room) {
    const d = room.draw;
    if (d.phase !== 'vote') return;
    d.entries.forEach((entry) => {
      const drawer = room.players.get(entry.drawerId);
      if (drawer && entry.votes.length) {
        drawer.points += Math.round(entry.votes.length * POINTS_PER_VOTE * AID_FACTOR[entry.aid]);
        drawer.score += entry.votes.length;
      }
    });
    reveal(room);
  }

  /* ---------- reveal / end ---------- */

  function reveal(room) {
    const d = room.draw;
    d.phase = 'reveal';
    d.durationMs = REVEAL_MS;
    d.phaseStartedAt = Date.now();
    clearTimeout(d.timer);
    broadcast(room, {
      type: 'drawReveal',
      round: d.round,
      totalRounds: d.totalRounds,
      durationMs: REVEAL_MS,
      entries: Array.from(d.entries.values()).map((e) => ({
        drawerName: playerName(room, e.drawerId),
        subject: e.subject,
        image: e.image,
        aid: e.aid,
        finders: e.finders,
        votes: d.settings.game === 'contest' ? e.votes : null,
      })),
    });
    broadcastScoreboard(room);
    setTimer(room, REVEAL_MS, () => nextRound(room));
  }

  function finish(room) {
    const d = room.draw;
    if (d) clearTimeout(d.timer);
    room.draw = null;
    room.started = false;
    broadcast(room, { type: 'drawGameOver', players: scoreboard(room) });
  }

  /* ---------- wiring ---------- */

  function handle(room, player, msg) {
    if (msg.type === 'drawStart') {
      if (player.id === room.hostId && !room.started) {
        if (!start(room, msg)) send(player.ws, { type: 'error', message: 'draw_no_subjects' });
      }
      return true;
    }
    if (!room.draw) return String(msg.type || '').startsWith('draw');
    switch (msg.type) {
      case 'drawPicked': handlePicked(room, player, msg); return true;
      case 'drawStroke': handleStroke(room, player, msg); return true;
      case 'drawSubmit': handleSubmit(room, player, msg); return true;
      case 'drawAnswer': handleAnswer(room, player, msg); return true;
      case 'drawVerdict': handleVerdict(room, player, msg); return true;
      case 'drawVoteCast': handleVoteCast(room, player, msg); return true;
      case 'drawStop':
        if (player.id === room.hostId) finish(room);
        return true;
      default: return false;
    }
  }

  /* A player (re)joining mid-game gets the current phase; if it concerns
     them directly (their pick / their subject) they get that too. */
  function onJoin(room, player) {
    const d = room.draw;
    if (!d) return;
    send(player.ws, { type: 'drawStarting', settings: d.settings, totalRounds: d.totalRounds, poolNames: d.pool.map((e) => e.name) });
    const remaining = Math.max(0, d.durationMs - (Date.now() - d.phaseStartedAt));
    send(player.ws, {
      type: 'drawPhase',
      phase: d.phase,
      round: d.round,
      totalRounds: d.totalRounds,
      durationMs: remaining,
      drawers: Array.from(d.entries.keys()).map((id) => ({ id, name: playerName(room, id) })),
    });
    const entry = d.entries.get(player.id);
    if (entry && d.phase === 'pick' && !entry.picked) sendPick(room, player.id, entry);
    if (entry && d.phase === 'draw' && !entry.submitted) send(player.ws, { type: 'drawSubject', subject: entry.subject, durationMs: remaining });
  }

  /* A disconnect can be the last thing a phase was waiting for. */
  function onDisconnect(room) {
    const d = room.draw;
    if (!d) return;
    const entries = Array.from(d.entries.values());
    if (d.phase === 'pick' && entries.every((e) => e.picked || !isConnected(room, e.drawerId))) endPick(room);
    else if (d.phase === 'draw' && entries.every((e) => e.submitted || !isConnected(room, e.drawerId))) endDraw(room);
    else if (d.phase === 'guess' && allGuessesResolved(room)) endGuess(room);
    else if (d.phase === 'vote' && eligibleVoters(room).every((id) => d.voters.has(id))) endVote(room);
  }

  function stop(room) {
    if (room.draw) clearTimeout(room.draw.timer);
    room.draw = null;
  }

  return { handle, onJoin, onDisconnect, stop };
}

module.exports = { createDrawGame };
