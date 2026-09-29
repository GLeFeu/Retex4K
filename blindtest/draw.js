/* ==========================================================================
   Drawing mode ("Dessin")
   Loaded after app.js and uses its shared helpers (el, t, mpSend, mpRoom,
   selectedGames, allGuessImages, shuffle, showScreen...).
   - Solo: practice (pick a subject, draw it, compare with the reference).
   - Multiplayer: the server (mp-server/draw-game.js) drives the phases
     pick -> draw -> guess -> reveal; this file renders them.
   ========================================================================== */

const drawSettings = { game: 'guess', who: 'all', subject: 'random', kind: 'all', drawMs: 60000, rounds: 2 };
const DRAW_KINDS = ['character', 'object', 'location'];
const DRAW_COLORS = ['#000000', '#7f7f7f', '#ffffff', '#e6231e', '#ff8c1a', '#ffd21a', '#3adf3a', '#1a9e4b',
  '#1ab8ff', '#2a4bff', '#8a3cff', '#ff5cc8', '#8b5a2b', '#f2c9a0'];

const drawEl = {
  options: document.getElementById('draw-options'),
  gameRow: document.getElementById('draw-game-row'),
  whoRowWrap: document.getElementById('draw-who-row-wrap'),
  whoRow: document.getElementById('draw-who-row'),
  subjectRow: document.getElementById('draw-subject-row'),
  kindRowWrap: document.getElementById('draw-kind-row-wrap'),
  kindRow: document.getElementById('draw-kind-row'),
  timeRow: document.getElementById('draw-time-row'),
  roundsRow: document.getElementById('draw-rounds-row'),

  roundLabel: document.getElementById('draw-round-label'),
  phaseLabel: document.getElementById('draw-phase-label'),
  clock: document.getElementById('draw-clock'),
  timerFill: document.getElementById('draw-timer-fill'),
  leaveBtn: document.getElementById('draw-leave-btn'),

  panels: {
    pick: document.getElementById('draw-panel-pick'),
    board: document.getElementById('draw-panel-board'),
    guess: document.getElementById('draw-panel-guess'),
    vote: document.getElementById('draw-panel-vote'),
    wait: document.getElementById('draw-panel-wait'),
    reveal: document.getElementById('draw-panel-reveal'),
    end: document.getElementById('draw-panel-end'),
  },
  pickText: document.getElementById('draw-pick-text'),
  pickCards: document.getElementById('draw-pick-cards'),
  freeForm: document.getElementById('draw-free-form'),
  freeSubject: document.getElementById('draw-free-subject'),
  freeWrong: document.getElementById('draw-free-wrong'),

  subjectText: document.getElementById('draw-subject-text'),
  editor: document.getElementById('draw-editor'),
  refBtn: document.getElementById('draw-ref-btn'),
  tools: document.getElementById('draw-tools'),
  traceBtn: document.getElementById('draw-trace-btn'),
  doneBtn: document.getElementById('draw-done-btn'),

  guessLabel: document.getElementById('draw-guess-label'),
  guessImg: document.getElementById('draw-guess-img'),
  guessChoices: document.getElementById('draw-guess-choices'),
  guessText: document.getElementById('draw-guess-text'),
  guessInput: document.getElementById('draw-guess-input'),
  guessSuggestions: document.getElementById('draw-guess-suggestions'),
  guessFeedback: document.getElementById('draw-guess-feedback'),

  validate: document.getElementById('draw-validate'),
  validateList: document.getElementById('draw-validate-list'),
  waitText: document.getElementById('draw-wait-text'),
  voteText: document.getElementById('draw-vote-text'),
  voteGrid: document.getElementById('draw-vote-grid'),
  revealGrid: document.getElementById('draw-reveal-grid'),
  endTitle: document.getElementById('draw-end-title'),
  finalList: document.getElementById('draw-final-list'),
  compare: document.getElementById('draw-compare'),
  againBtn: document.getElementById('draw-again-btn'),
  backBtn: document.getElementById('draw-back-btn'),
  scoreboard: document.getElementById('draw-scoreboard'),
  scoreboardList: document.getElementById('draw-scoreboard-list'),
};

/* ---------- Setup screen options ---------- */

function syncDrawOptions() {
  const pick = (row, attr, value) => row.querySelectorAll('.mini-toggle').forEach((b) => b.classList.toggle('selected', b.dataset[attr] === String(value)));
  pick(drawEl.gameRow, 'drawGame', drawSettings.game);
  pick(drawEl.whoRow, 'drawWho', drawSettings.who);
  drawEl.whoRowWrap.hidden = drawSettings.game === 'contest';
  pick(drawEl.subjectRow, 'drawSubject', drawSettings.subject);
  pick(drawEl.kindRow, 'drawKind', drawSettings.kind);
  pick(drawEl.timeRow, 'drawTime', drawSettings.drawMs);
  pick(drawEl.roundsRow, 'drawRounds', drawSettings.rounds);
  drawEl.kindRowWrap.hidden = drawSettings.subject !== 'random';
  if (answerMode === 'draw') {
    el.startBtn.textContent = t('draw_start_practice');
  } else {
    el.startBtn.textContent = t('btn_start');
  }
}

function drawApplySettings(s) {
  if (!s) return;
  drawSettings.game = s.game === 'contest' ? 'contest' : 'guess';
  drawSettings.who = s.who === 'one' ? 'one' : 'all';
  drawSettings.subject = s.subject === 'free' ? 'free' : 'random';
  drawSettings.kind = ['all', ...DRAW_KINDS].includes(s.kind) ? s.kind : 'all';
  drawSettings.drawMs = Number(s.drawMs) || 60000;
  drawSettings.rounds = Number(s.rounds) || 2;
}

[
  [drawEl.gameRow, 'drawGame', (v) => { drawSettings.game = v; }],
  [drawEl.whoRow, 'drawWho', (v) => { drawSettings.who = v; }],
  [drawEl.subjectRow, 'drawSubject', (v) => { drawSettings.subject = v; }],
  [drawEl.kindRow, 'drawKind', (v) => { drawSettings.kind = v; }],
  [drawEl.timeRow, 'drawTime', (v) => { drawSettings.drawMs = Number(v); }],
  [drawEl.roundsRow, 'drawRounds', (v) => { drawSettings.rounds = Number(v); }],
].forEach(([row, attr, apply]) => {
  row.querySelectorAll('.mini-toggle').forEach((btn) => {
    btn.addEventListener('click', () => {
      apply(btn.dataset[attr]);
      syncModeUI();
      renderGameMenu();
      updateTotalCount();
    });
  });
});

function getDrawKinds() {
  return drawSettings.kind === 'all' ? DRAW_KINDS : [drawSettings.kind];
}

function getDrawSubjectPool() {
  const kinds = getDrawKinds();
  return allGuessImages
    .filter((e) => selectedGames.has(e.game) && kinds.includes(e.kind))
    .map((e) => ({ name: e.name, kind: e.kind, image: e.image }));
}

/* In Random mode only games with pictures can provide subjects; Free works with anything. */
function drawGameHasSubjects(gameId) {
  if (drawSettings.subject === 'free') return true;
  const kinds = getDrawKinds();
  return allGuessImages.some((e) => e.game === gameId && kinds.includes(e.kind));
}

function drawKindLabel(kind) {
  const keys = { character: 'image_subject_character', object: 'image_subject_object', location: 'guess_kind_location' };
  return keys[kind] ? t(keys[kind]).toLowerCase() : '';
}

/* ---------- Drawing board: the paint editor (paint.js) ---------- */

const paint = createPaintEditor(drawEl.editor);
let drawAid = 'none'; // 'none' | 'reference' | 'trace' (highest aid used this drawing)

function drawRefreshLabels() {
  paint.applyLabels();
}

/* Aids: showing the reference costs points, tracing costs twice as much.
   Once used, an aid stays counted even if it is hidden again. */
function boardUseAid(aid) {
  const rank = { none: 0, reference: 1, trace: 2 };
  if (rank[aid] > rank[drawAid]) drawAid = aid;
}

drawEl.refBtn.addEventListener('click', () => {
  if (!paint.isEnabled) return;
  const show = !drawEl.refBtn.classList.contains('selected');
  paint.showReference(show);
  drawEl.refBtn.classList.toggle('selected', show);
  if (show) boardUseAid('reference');
});

drawEl.traceBtn.addEventListener('click', () => {
  if (!paint.isEnabled) return;
  const show = !drawEl.traceBtn.classList.contains('selected');
  paint.showTrace(show);
  drawEl.traceBtn.classList.toggle('selected', show);
  if (show) boardUseAid('trace');
});

function drawAidLabel(aid) {
  if (aid === 'trace') return t('draw_traced');
  if (aid === 'reference') return t('draw_used_reference');
  return '';
}

/* ---------- Phase display helpers ---------- */

const drawState = {
  mode: null, // 'practice' | 'mp'
  settings: null,
  poolNames: [],
  totalRounds: 0,
  round: 0,
  phase: null,
  amDrawer: false,
  subject: null,
  submitted: false,
  timerId: null,
  clockId: null,
  endsAt: 0,
  guessLocked: false,
  practicePool: [],
  lastPracticeImage: null,
};

function drawShowPanel(name) {
  Object.entries(drawEl.panels).forEach(([key, node]) => { node.hidden = key !== name; });
  // the drawing editor needs a wider frame than the other phases
  drawEl.panels.board.closest('.draw-frame').classList.toggle('wide', name === 'board');
}

function drawStartTimer(durationMs, onEnd) {
  clearTimeout(drawState.timerId);
  clearInterval(drawState.clockId);
  drawState.endsAt = Date.now() + durationMs;
  drawEl.timerFill.parentElement.hidden = false;
  drawEl.timerFill.style.transition = 'none';
  drawEl.timerFill.style.width = '100%';
  drawEl.timerFill.classList.remove('warning', 'critical');
  requestAnimationFrame(() => requestAnimationFrame(() => {
    drawEl.timerFill.style.transition = `width ${durationMs}ms linear`;
    drawEl.timerFill.style.width = '0%';
  }));
  const tick = () => {
    const left = Math.max(0, drawState.endsAt - Date.now());
    drawEl.clock.textContent = `${Math.ceil(left / 1000)}s`;
    drawEl.timerFill.classList.toggle('warning', left < durationMs * 0.5);
    drawEl.timerFill.classList.toggle('critical', left < durationMs * 0.2);
  };
  tick();
  drawState.clockId = setInterval(tick, 250);
  if (onEnd) drawState.timerId = setTimeout(onEnd, durationMs);
}

function drawStopTimer() {
  clearTimeout(drawState.timerId);
  clearInterval(drawState.clockId);
  drawEl.clock.textContent = '';
  drawEl.timerFill.parentElement.hidden = true;
}

function drawSetHeader(phaseKey) {
  drawEl.roundLabel.textContent = drawState.totalRounds
    ? t('draw_round', { index: drawState.round + 1, total: drawState.totalRounds })
    : '';
  drawEl.phaseLabel.textContent = phaseKey ? t(phaseKey) : '';
}

function drawWait(text) {
  drawShowPanel('wait');
  drawEl.waitText.textContent = text;
}

/* ---------- Pick ---------- */

function drawShowPick(options, free, wrongCount, onPicked, forEveryone = false) {
  drawShowPanel('pick');
  drawEl.pickCards.innerHTML = '';
  drawEl.freeForm.hidden = !free;
  drawEl.pickCards.hidden = free;
  drawEl.pickText.textContent = forEveryone
    ? t(free ? 'draw_pick_free_everyone' : 'draw_pick_for_everyone')
    : t(free ? 'draw_pick_free' : 'draw_pick_random');
  if (free) {
    drawEl.freeSubject.value = '';
    drawEl.freeWrong.hidden = !wrongCount;
    drawEl.freeWrong.querySelectorAll('input').forEach((i) => { i.value = ''; });
    drawEl.freeForm.onsubmit = (e) => {
      e.preventDefault();
      const name = drawEl.freeSubject.value.trim();
      if (!name) {
        drawEl.freeSubject.focus();
        return;
      }
      const inputs = Array.from(drawEl.freeWrong.querySelectorAll('input'));
      const firstEmpty = inputs.find((i) => !i.value.trim());
      if (wrongCount && firstEmpty) {
        firstEmpty.focus();
        return;
      }
      const wrong = wrongCount ? inputs.map((i) => i.value.trim()) : [];
      onPicked({ name, wrong });
    };
    setTimeout(() => drawEl.freeSubject.focus(), 50);
    return;
  }
  options.forEach((opt, index) => {
    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'draw-pick-card';
    if (opt.image) {
      const img = document.createElement('img');
      img.src = opt.image;
      img.alt = '';
      img.loading = 'eager';
      card.appendChild(img);
    }
    const name = document.createElement('span');
    name.className = 'draw-pick-name';
    name.textContent = opt.name;
    const kind = document.createElement('span');
    kind.className = 'draw-pick-kind';
    kind.textContent = drawKindLabel(opt.kind);
    card.appendChild(name);
    card.appendChild(kind);
    card.addEventListener('click', () => onPicked({ index, option: opt }));
    drawEl.pickCards.appendChild(card);
  });
}

/* ---------- Board ---------- */

function drawShowBoard(subject, editable, watchName) {
  drawShowPanel('board');
  paint.reset();
  paint.onLiveFrame = null;
  paint.setEnabled(editable);
  drawAid = 'none';
  drawEl.tools.hidden = !editable;
  const hasImage = !!(subject && subject.image);
  paint.setReference(hasImage ? subject.image : null);
  drawEl.refBtn.hidden = !hasImage;
  drawEl.traceBtn.hidden = !hasImage;
  drawEl.refBtn.classList.remove('selected');
  drawEl.traceBtn.classList.remove('selected');
  drawEl.subjectText.innerHTML = '';
  if (editable && subject) {
    drawEl.subjectText.append(`${t('draw_you_draw')} `);
    const b = document.createElement('b');
    b.textContent = subject.name;
    drawEl.subjectText.appendChild(b);
  } else if (watchName) {
    drawEl.subjectText.textContent = t('draw_is_drawing', { name: watchName });
  }
  drawEl.doneBtn.disabled = false;
}

/* ---------- Solo practice ---------- */

function drawStartPractice() {
  el.setupError.textContent = '';
  const pool = getDrawSubjectPool();
  if (drawSettings.subject === 'random' && pool.length === 0) {
    el.setupError.textContent = t('draw_no_subjects');
    return;
  }
  drawState.mode = 'practice';
  drawState.practicePool = pool;
  drawState.totalRounds = 0;
  drawEl.scoreboard.hidden = true;
  drawEl.validate.hidden = true;
  showScreen('draw');
  drawPracticePick();
}

function drawPracticePick() {
  drawSetHeader('draw_phase_pick');
  drawStopTimer();
  const free = drawSettings.subject === 'free';
  const options = free ? [] : shuffle(drawState.practicePool).slice(0, 4);
  drawShowPick(options, free, 0, (picked) => {
    drawState.subject = free ? { name: picked.name, kind: 'free', image: null } : picked.option;
    drawPracticeDraw();
  });
}

function drawPracticeDraw() {
  drawSetHeader('draw_phase_draw');
  drawState.submitted = false;
  drawShowBoard(drawState.subject, true);
  drawStartTimer(drawSettings.drawMs, drawPracticeFinish);
}

function drawPracticeFinish() {
  if (drawState.mode !== 'practice' || drawState.submitted) return;
  drawState.submitted = true;
  paint.setEnabled(false);
  drawStopTimer();
  const image = paint.exportDataURL();
  drawSetHeader('draw_phase_reveal');
  drawShowPanel('end');
  drawEl.endTitle.textContent = drawState.subject.name;
  drawEl.finalList.innerHTML = '';
  drawEl.againBtn.hidden = false;
  drawEl.compare.innerHTML = '';
  drawEl.compare.appendChild(drawCompareCard(image, t('draw_practice_end') + (drawAid !== 'none' ? ` (${drawAidLabel(drawAid)})` : '')));
  if (drawState.subject.image) drawEl.compare.appendChild(drawCompareCard(drawState.subject.image, t('draw_practice_reference')));
}

function drawCompareCard(src, caption) {
  const fig = document.createElement('figure');
  fig.className = 'draw-compare-card';
  const img = document.createElement('img');
  img.src = src;
  img.alt = caption;
  const cap = document.createElement('figcaption');
  cap.textContent = caption;
  fig.appendChild(img);
  fig.appendChild(cap);
  return fig;
}

drawEl.doneBtn.addEventListener('click', () => {
  if (drawState.mode === 'practice') drawPracticeFinish();
  else drawSubmitDrawing();
});

drawEl.againBtn.addEventListener('click', () => {
  if (drawState.mode === 'practice') drawPracticePick();
});

function drawExit() {
  drawStopTimer();
  paint.setEnabled(false);
  paint.onLiveFrame = null;
  drawState.mode = null;
  showScreen('setup');
}

drawEl.backBtn.addEventListener('click', () => {
  drawExit();
});

drawEl.leaveBtn.addEventListener('click', () => {
  if (drawState.mode === 'mp' && drawState.phase !== 'over') {
    mpLeaveRoom();
  }
  drawExit();
});

/* ---------- Multiplayer ---------- */

function drawStartMultiplayer() {
  el.setupError.textContent = '';
  const pool = getDrawSubjectPool();
  if (drawSettings.subject === 'random' && pool.length === 0) {
    el.setupError.textContent = t('draw_no_subjects');
    return;
  }
  mpSend({
    type: 'drawStart',
    pool: drawSettings.subject === 'random' ? pool : getDrawSubjectPool(),
    settings: {
      game: drawSettings.game,
      who: drawSettings.who,
      subject: drawSettings.subject,
      answer: writeTitleMode ? 'text' : 'choice',
      choiceCount: getAnswerCount(),
      drawMs: drawSettings.drawMs,
      rounds: drawSettings.rounds,
      // guessing a drawing follows the Rules answer time (+10s to type an answer)
      guessMs: getRoundDurationMs() + (writeTitleMode ? 10000 : 0),
    },
  });
}

function drawIsMe(id) {
  return !!(mpRoom && id === mpRoom.clientId);
}

function drawRenderScoreboard() {
  if (drawState.mode !== 'mp') return;
  drawRenderLeaderboard(drawEl.scoreboardList, mpPlayers);
}

function drawRenderLeaderboard(list, players) {
  list.innerHTML = '';
  players.slice().sort((a, b) => b.points - a.points).forEach((p, i) => {
    const li = document.createElement('li');
    li.className = 'mp-scoreboard-item';
    if (drawIsMe(p.id)) li.classList.add('me');
    if (p.connected === false) li.classList.add('offline');
    const rank = document.createElement('span');
    rank.className = 'mp-rank';
    rank.textContent = `#${i + 1}`;
    const name = document.createElement('span');
    name.className = 'mp-name';
    name.textContent = p.name;
    const pts = document.createElement('span');
    pts.className = 'mp-pts';
    pts.textContent = `${p.points} pts`;
    li.append(rank, name, pts);
    list.appendChild(li);
  });
}

function drawSubmitDrawing() {
  if (drawState.mode !== 'mp' || !drawState.amDrawer || drawState.submitted) return;
  drawState.submitted = true;
  paint.setEnabled(false);
  paint.onLiveFrame = null;
  drawEl.doneBtn.disabled = true;
  mpSend({ type: 'drawSubmit', image: paint.exportDataURL(), aid: drawAid });
  drawWait(t('draw_wait_others'));
}

function drawShowGuess(msg) {
  drawShowPanel('guess');
  drawState.guessLocked = false;
  drawState.guessDrawerName = msg.drawerName;
  drawEl.guessImg.src = msg.image;
  drawEl.guessLabel.textContent = DRAW_KINDS.includes(msg.kind)
    ? t('draw_guess_label_kind', { name: msg.drawerName, kind: drawKindLabel(msg.kind) })
    : t('draw_guess_label', { name: msg.drawerName });
  drawEl.guessFeedback.textContent = '';
  drawEl.guessFeedback.className = 'draw-feedback';
  drawEl.guessChoices.innerHTML = '';
  const sendAnswer = (answer) => {
    if (drawState.guessLocked || !answer) return;
    drawState.guessLocked = true;
    drawEl.guessInput.disabled = true;
    drawEl.guessChoices.querySelectorAll('button').forEach((b) => {
      b.disabled = true;
      if (b.dataset.name === answer) b.classList.add('mp-selected');
    });
    mpSend({ type: 'drawAnswer', answer });
  };
  drawState.sendAnswer = sendAnswer;

  if (Array.isArray(msg.options)) {
    drawEl.guessChoices.hidden = false;
    drawEl.guessText.hidden = true;
    msg.options.forEach((name) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'answer-btn';
      btn.dataset.name = name;
      btn.textContent = name;
      btn.addEventListener('click', () => sendAnswer(name));
      drawEl.guessChoices.appendChild(btn);
    });
  } else {
    drawEl.guessChoices.hidden = true;
    drawEl.guessText.hidden = false;
    drawEl.guessInput.value = '';
    drawEl.guessInput.disabled = false;
    drawState.suggestionNames = msg.needsValidation ? [] : drawState.poolNames;
    drawRenderSuggestions('');
    setTimeout(() => drawEl.guessInput.focus(), 50);
  }
}

function drawRenderSuggestions(query) {
  drawEl.guessSuggestions.innerHTML = '';
  const q = normalizeSearchText(query.trim());
  if (!q) return;
  (drawState.suggestionNames || [])
    .filter((n) => normalizeSearchText(n).includes(q))
    .slice(0, 12)
    .forEach((n) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'suggestion-btn';
      btn.textContent = n;
      btn.addEventListener('click', () => drawState.sendAnswer && drawState.sendAnswer(n));
      drawEl.guessSuggestions.appendChild(btn);
    });
}

drawEl.guessInput.addEventListener('input', () => drawRenderSuggestions(drawEl.guessInput.value));
drawEl.guessInput.addEventListener('keydown', (e) => {
  if (e.key !== 'Enter') return;
  e.preventDefault();
  if (drawState.sendAnswer) drawState.sendAnswer(drawEl.guessInput.value.trim());
});

function drawAddValidation(msg) {
  drawEl.validate.hidden = false;
  const li = document.createElement('li');
  li.className = 'draw-validate-item';
  const text = document.createElement('span');
  text.className = 'draw-validate-text';
  text.textContent = `${msg.guesserName} : « ${msg.answer} »`;
  const yes = document.createElement('button');
  yes.type = 'button';
  yes.className = 'mini-toggle small draw-validate-yes';
  yes.textContent = `✔ ${t('draw_confirm')}`;
  const no = document.createElement('button');
  no.type = 'button';
  no.className = 'mini-toggle small draw-validate-no';
  no.textContent = `✘ ${t('draw_reject')}`;
  const answer = (correct) => {
    mpSend({ type: 'drawVerdict', guesserId: msg.guesserId, correct });
    li.remove();
    if (!drawEl.validateList.children.length) drawEl.validate.hidden = true;
  };
  yes.addEventListener('click', () => answer(true));
  no.addEventListener('click', () => answer(false));
  li.append(text, yes, no);
  drawEl.validateList.appendChild(li);
}

function drawShowReveal(msg) {
  drawShowPanel('reveal');
  drawEl.validate.hidden = true;
  drawEl.validateList.innerHTML = '';
  drawEl.revealGrid.innerHTML = '';
  const topVotes = Math.max(0, ...msg.entries.map((e) => (Array.isArray(e.votes) ? e.votes.length : 0)));
  msg.entries.forEach((entry) => {
    const card = document.createElement('figure');
    card.className = 'draw-reveal-card';
    const img = document.createElement('img');
    img.src = entry.image;
    img.alt = entry.subject.name;
    const cap = document.createElement('figcaption');
    const title = document.createElement('b');
    title.textContent = entry.subject.name;
    const by = document.createElement('span');
    by.textContent = ` — ${entry.drawerName}${entry.aid && entry.aid !== 'none' ? ` (${drawAidLabel(entry.aid)})` : ''}`;
    const found = document.createElement('span');
    if (Array.isArray(entry.votes)) {
      found.className = entry.votes.length === topVotes && topVotes > 0 ? 'draw-found' : 'draw-not-found';
      found.textContent = `${entry.votes.length === topVotes && topVotes > 0 ? '👑 ' : ''}${t('draw_votes', { count: entry.votes.length })}`;
      if (entry.votes.length === topVotes && topVotes > 0) card.classList.add('winner');
    } else {
      found.className = entry.finders.length ? 'draw-found' : 'draw-not-found';
      found.textContent = entry.finders.length ? t('draw_found_by', { names: entry.finders.join(', ') }) : t('draw_found_by_nobody');
    }
    cap.append(title, by, document.createElement('br'), found);
    card.append(img, cap);
    drawEl.revealGrid.appendChild(card);
  });
}

function drawShowVote(msg) {
  drawShowPanel('vote');
  drawEl.voteText.textContent = t('draw_vote_text', { subject: msg.subject ? msg.subject.name : '' });
  drawEl.voteGrid.innerHTML = '';
  msg.entries.forEach((entry) => {
    const mine = drawIsMe(entry.drawerId);
    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'draw-vote-card';
    card.disabled = mine;
    const img = document.createElement('img');
    img.src = entry.image;
    img.alt = mine ? t('draw_your_drawing') : '';
    const cap = document.createElement('span');
    cap.textContent = mine ? t('draw_your_drawing') : '?';
    card.append(img, cap);
    card.addEventListener('click', () => {
      mpSend({ type: 'drawVoteCast', drawerId: entry.drawerId });
      drawEl.voteGrid.querySelectorAll('button').forEach((b) => { b.disabled = true; });
      card.classList.add('voted');
      drawEl.voteText.textContent = t('draw_vote_done');
    });
    drawEl.voteGrid.appendChild(card);
  });
}

function drawHandleMessage(msg) {
  switch (msg.type) {
    case 'drawStarting':
      drawState.mode = 'mp';
      drawState.settings = msg.settings;
      drawState.poolNames = msg.poolNames || [];
      drawState.totalRounds = msg.totalRounds;
      drawState.round = 0;
      drawState.phase = 'starting';
      mpActive = true;
      drawEl.scoreboard.hidden = false;
      drawEl.validate.hidden = true;
      drawEl.validateList.innerHTML = '';
      drawRenderScoreboard();
      showScreen('draw');
      drawSetHeader('');
      drawWait(t('draw_starting'));
      break;

    case 'drawPhase': {
      if (drawState.mode !== 'mp') break;
      drawState.round = msg.round;
      drawState.totalRounds = msg.totalRounds;
      drawState.phase = msg.phase;
      const drawers = msg.drawers || [];
      drawState.amDrawer = drawers.some((d) => drawIsMe(d.id));
      drawSetHeader(`draw_phase_${msg.phase}`);
      drawStartTimer(msg.durationMs);
      if (msg.phase === 'pick') {
        drawState.submitted = false;
        drawEl.validate.hidden = true;
        drawEl.validateList.innerHTML = '';
        if (msg.chooser) {
          // contest: one player picks for everyone
          if (!drawIsMe(msg.chooser.id)) drawWait(t('draw_is_choosing_subject', { name: msg.chooser.name }));
        } else if (!drawState.amDrawer) {
          drawWait(drawers.length === 1 ? t('draw_is_picking', { name: drawers[0].name }) : t('draw_players_picking'));
        }
      } else if (msg.phase === 'draw') {
        if (!drawState.amDrawer) {
          if (drawState.settings.who === 'one' && drawers[0]) drawShowBoard(null, false, drawers[0].name);
          else drawWait(t('draw_wait_others'));
        }
      } else if (msg.phase === 'guess') {
        const guessers = msg.guessers || [];
        if (!guessers.some((id) => drawIsMe(id))) drawWait(t('draw_wait_guessers'));
      }
      break;
    }

    case 'drawPick':
      if (drawState.mode !== 'mp') break;
      drawShowPick(msg.options || [], msg.free, msg.wrongCount, (picked) => {
        if (msg.free) mpSend({ type: 'drawPicked', name: picked.name, wrong: picked.wrong });
        else mpSend({ type: 'drawPicked', index: picked.index });
        drawWait(t('draw_wait_others'));
      }, !!msg.forEveryone);
      break;

    case 'drawSubject':
      if (drawState.mode !== 'mp') break;
      drawState.subject = msg.subject;
      drawState.submitted = false;
      drawShowBoard(msg.subject, true);
      if (drawState.settings.who === 'one' && drawState.settings.game === 'guess') {
        // the others watch live: send a small preview of the canvas as it changes
        paint.onLiveFrame = (image) => mpSend({ type: 'drawStroke', op: 'frame', stroke: { image } });
      }
      drawStartTimer(msg.durationMs, drawSubmitDrawing);
      break;

    case 'drawStroke':
      if (drawState.mode === 'mp' && !drawState.amDrawer && msg.op === 'frame' && msg.stroke) paint.showFrame(msg.stroke.image);
      break;

    case 'drawGuess':
      if (drawState.mode !== 'mp') break;
      drawShowGuess(msg);
      break;

    case 'drawAnswerPending':
      drawEl.guessFeedback.textContent = t('draw_answer_pending', { name: drawState.guessDrawerName || '' });
      drawEl.guessFeedback.className = 'draw-feedback';
      break;

    case 'drawAnswerResult':
      drawEl.guessFeedback.textContent = msg.correct
        ? t('draw_answer_correct', { points: msg.points })
        : t('draw_answer_wrong', { answer: msg.answer });
      drawEl.guessFeedback.className = `draw-feedback ${msg.correct ? 'correct' : 'wrong'}`;
      drawEl.guessChoices.querySelectorAll('button').forEach((b) => {
        b.disabled = true;
        if (b.dataset.name === msg.answer) b.classList.add('correct');
        else if (b.classList.contains('mp-selected')) b.classList.add('wrong');
      });
      playSfx(msg.correct ? sfxCorrect : sfxWrong);
      break;

    case 'drawValidate':
      drawAddValidation(msg);
      break;

    case 'drawVote':
      if (drawState.mode !== 'mp') break;
      drawShowVote(msg);
      break;

    case 'drawReveal':
      drawState.phase = 'reveal';
      drawSetHeader('draw_phase_reveal');
      drawStartTimer(msg.durationMs);
      drawShowReveal(msg);
      break;

    case 'drawGameOver':
      drawState.phase = 'over';
      mpActive = false;
      drawStopTimer();
      paint.setEnabled(false);
      paint.onLiveFrame = null;
      drawSetHeader('');
      drawShowPanel('end');
      drawEl.endTitle.textContent = t('draw_end_title');
      drawEl.compare.innerHTML = '';
      drawEl.againBtn.hidden = true;
      drawRenderLeaderboard(drawEl.finalList, msg.players || mpPlayers);
      break;

    default:
      break;
  }
}
