const REVEAL_PAUSE_MS = 2500;
const CHALLENGE_CLIP_MS = 1000;
const WARNING_FRACTION = 8 / 15;
const CRITICAL_FRACTION = 12 / 15;

(function loadYouTubeIframeAPI() {
  const tag = document.createElement('script');
  tag.src = 'https://www.youtube.com/iframe_api';
  const firstScript = document.getElementsByTagName('script')[0];
  firstScript.parentNode.insertBefore(tag, firstScript);
})();

let allTracks = [];
let currentPool = [];
let playlist = [];
let currentIndex = 0;
let score = 0;
let totalPoints = 0;
let player = null;
let ytApiReady = false;
let roundTimeoutId = null;
let warningTimeoutId = null;
let criticalTimeoutId = null;
let revealAdvanceTimeoutId = null;
let answerLocked = false;
let pauseRequested = false;
let isPaused = false;
let isMuted = false;
let roundStartTime = 0;
let roundAnswered = false;
let challengeDurationCheckId = null;
let challengeClipStopId = null;
let pendingTitle = null;
let fadeOutIntervalId = null;

/* ---------- Multiplayer (realtime sync via WebSocket server) ---------- */

const MP_SERVER_URL = 'wss://retex4k.onrender.com';
const MP_CLIENT_ID_KEY = 'ostquiz-mp-client-id';

function mpGetClientId() {
  try {
    let id = localStorage.getItem(MP_CLIENT_ID_KEY);
    if (!id) {
      id = Math.random().toString(36).slice(2) + Date.now().toString(36);
      localStorage.setItem(MP_CLIENT_ID_KEY, id);
    }
    return id;
  } catch (e) {
    return Math.random().toString(36).slice(2) + Date.now().toString(36);
  }
}

const mpClientId = mpGetClientId();
let mpSocket = null;
let mpRoom = null; // { code, clientId, hostId }
let mpIsHost = false;
let mpPlayers = [];
let mpActive = false; // true once a multiplayer round is actually being played
let mpAnsweredCorrect = false;
let mpAnsweredPoints = 0;

/* ---------- Défi / Handicap modifiers ---------- */

let clipChallenge = false; // 1-second clip from the middle of the track
let timeChallenge = null; // null | 'time30' | 'time25' | 'time20' | 'time10' | 'time5' | 'time3'
let answerCountOverride = null; // null | 6 | 8 | 10 | 3 | 2 (shared radio across Défi and Handicap)
let writeTitleMode = false; // write the title instead of picking a choice
let guessGameMode = false; // also guess the game the track is from
let handicapShowGameLabel = false; // show the game name under each choice
let handicapGameHint = false; // reveal which game the mystery track is from

const VOLUME_STORAGE_KEY = 'ostquiz-volume';
const MUTE_STORAGE_KEY = 'ostquiz-muted';
const SFX_VOLUME_STORAGE_KEY = 'ostquiz-sfx-volume';
const SFX_MUTE_STORAGE_KEY = 'ostquiz-sfx-muted';
const GAME_STATE_KEY = 'ostquiz-game-state';

function loadStoredVolume(key, defaultValue) {
  try {
    const saved = parseInt(localStorage.getItem(key), 10);
    if (!Number.isNaN(saved) && saved >= 0 && saved <= 100) return saved;
  } catch (e) {
    /* localStorage unavailable, keep default */
  }
  return defaultValue;
}

function loadStoredMute(key) {
  try {
    return localStorage.getItem(key) === 'true';
  } catch (e) {
    return false;
  }
}

let currentVolume = loadStoredVolume(VOLUME_STORAGE_KEY, 70);
let sfxVolume = loadStoredVolume(SFX_VOLUME_STORAGE_KEY, 15);
isMuted = loadStoredMute(MUTE_STORAGE_KEY);
let isSfxMuted = loadStoredMute(SFX_MUTE_STORAGE_KEY);

/* ---------- Language: site UI (en/fr) and track-title language (en/fr) ---------- */

const UI_LANG_STORAGE_KEY = 'ostquiz-ui-lang';
const TRACK_LANG_STORAGE_KEY = 'ostquiz-track-lang';

function loadStoredLang(key) {
  try {
    const saved = localStorage.getItem(key);
    return saved === 'fr' ? 'fr' : 'en';
  } catch (e) {
    return 'en';
  }
}

let uiLang = loadStoredLang(UI_LANG_STORAGE_KEY);
let trackLang = loadStoredLang(TRACK_LANG_STORAGE_KEY);

const TRANSLATIONS = {
  en: {
    title: 'BLIND TEST',
    subtitle: 'Can you recognize every track?',
    label_ui_lang: 'Language',
    label_track_lang: 'Track titles',
    label_game: 'Game (multi-select)',
    label_track_count: 'Number of tracks',
    btn_select_all: 'Select all',
    mode_all: 'All tracks',
    mode_half: 'Half, random',
    mode_custom: 'Custom number:',
    btn_start: 'START',
    heading_defi: 'Challenge',
    heading_handicap: 'Handicap',
    label_answer_time: 'Answer time',
    note_default_time: 'Default answer time: 15s',
    label_choices: 'Choices',
    note_default_choices: 'Default: 4 choices',
    opt_clip1s: '1-second clip (from the middle)',
    opt_write_title: 'Write the title (no choices)',
    opt_guess_game: "Also guess the game it's from",
    opt_show_game_label: 'Show the game name under each choice',
    opt_game_hint: "Hint: which game it's from",
    btn_pause: 'PAUSE',
    btn_pause_queued: 'PAUSE (queued)',
    btn_resume: 'RESUME',
    btn_replay: 'REPLAY (1s)',
    placeholder_type_title: 'Type the track title...',
    label_which_game: 'Which game is it from?',
    pause_overlay_text: '* The music stops for a moment...',
    heading_results: 'RESULTS',
    label_score: 'Score',
    label_points: 'Points',
    btn_play_again: 'PLAY AGAIN',
    aria_back: 'Back to menu',
    aria_mute: 'Mute',
    aria_unmute: 'Unmute',
    aria_mute_sfx: 'Mute sound effects',
    aria_unmute_sfx: 'Unmute sound effects',
    footer_disclaimer:
      '<b>Community project</b>, not affiliated with <b>Nintendo</b>.\n  Music composed by <b>Koji Kondo</b> for <b>The Legend of Zelda</b> - all\n  rights reserved to their respective creators.',
    err_select_game: 'Select at least one game.',
    err_min_tracks: 'At least {count} tracks must be available for this selection.',
    err_only_n_tracks: 'Only {count} tracks are available for this selection.',
    err_valid_number: 'Choose a valid number of tracks.',
    err_load_tracks: 'Unable to load tracks.json.',
    time_estimate: 'Estimated playtime: {range} ({count} track{plural})',
    score_multiplier: 'Score multiplier: x{multiplier} (up to {points} pts / correct answer, faster = more)',
    live_find: 'Find: {score} / {total}',
    live_track: 'Track {index} / {total}',
    live_points: '{points} pts',
    game_hint: '* Hint: from {game}',
    reveal_correct: 'Correct! +{points} pts',
    reveal_wrong: 'Wrong!',
    reveal_timeout: "Time's up!",
    btn_resume_label: 'RESUME ({index}/{total})',
    btn_loading: 'LOADING...',
    result_perfect: 'A true Hero of Hyrule.',
    result_great: 'You know your Hyrule history well.',
    result_ok: 'Not bad, keep exploring!',
    result_bad: 'Go train at the Lost Woods...',
    heading_mp: 'Multiplayer',
    placeholder_mp_name: 'Nickname',
    btn_mp_create: 'CREATE A GAME',
    btn_mp_join: 'JOIN',
    btn_mp_start: 'START FOR EVERYONE',
    btn_mp_leave: 'LEAVE',
    label_mp_room_code: 'Room code',
    mp_waiting_host: 'Waiting for the host to start...',
    mp_waiting_others: 'Waiting for other players...',
    heading_mp_scoreboard: 'Scoreboard',
    label_mp_final_ranking: 'Final ranking',
    mp_err_connect: 'Unable to connect to the multiplayer server.',
    mp_err_enter_code: 'Enter a room code.',
    mp_err_room_not_found: 'Room not found.',
    mp_err_disconnected: 'Disconnected from the multiplayer server.',
    placeholder_year_from: 'From',
    placeholder_year_to: 'To',
    btn_reset_filters: 'Reset',
    label_no_games_match: 'No games match these filters.',
    btn_collapse_all: 'Collapse all',
    btn_expand_all: 'Expand all',
    placeholder_game_search: 'Search a game...',
    label_filter_console: 'Console',
  },
  fr: {
    title: 'BLIND TEST',
    subtitle: 'Sauras-tu reconnaître chaque morceau ?',
    label_ui_lang: 'Langue',
    label_track_lang: 'Titres des musiques',
    label_game: 'Jeu (multi-sélection)',
    label_track_count: 'Nombre de morceaux',
    btn_select_all: 'Tout sélectionner',
    mode_all: 'Tous les morceaux',
    mode_half: 'Moitié, aléatoire',
    mode_custom: 'Nombre personnalisé :',
    btn_start: 'DÉMARRER',
    heading_defi: 'Défi',
    heading_handicap: 'Handicap',
    label_answer_time: 'Temps de réponse',
    note_default_time: 'Temps de réponse par défaut : 15s',
    label_choices: 'Choix',
    note_default_choices: 'Par défaut : 4 choix',
    opt_clip1s: 'Extrait de 1 seconde (au milieu)',
    opt_write_title: 'Écrire le titre (sans choix)',
    opt_guess_game: "Deviner aussi le jeu d'origine",
    opt_show_game_label: 'Afficher le nom du jeu sous chaque choix',
    opt_game_hint: "Indice : de quel jeu ça vient",
    btn_pause: 'PAUSE',
    btn_pause_queued: 'PAUSE (en attente)',
    btn_resume: 'REPRENDRE',
    btn_replay: 'REJOUER (1s)',
    placeholder_type_title: 'Écris le titre du morceau...',
    label_which_game: "De quel jeu s'agit-il ?",
    pause_overlay_text: "* La musique s'arrête un instant...",
    heading_results: 'RÉSULTATS',
    label_score: 'Score',
    label_points: 'Points',
    btn_play_again: 'REJOUER',
    aria_back: 'Retour au menu',
    aria_mute: 'Couper le son',
    aria_unmute: 'Réactiver le son',
    aria_mute_sfx: 'Couper les bruitages',
    aria_unmute_sfx: 'Réactiver les bruitages',
    footer_disclaimer:
      '<b>Projet communautaire</b>, non affilié à <b>Nintendo</b>.\n  Musique composée par <b>Koji Kondo</b> pour <b>The Legend of Zelda</b> - tous\n  droits réservés à leurs créateurs respectifs.',
    err_select_game: 'Sélectionne au moins un jeu.',
    err_min_tracks: 'Il faut au moins {count} morceaux disponibles pour cette sélection.',
    err_only_n_tracks: 'Seulement {count} morceaux disponibles pour cette sélection.',
    err_valid_number: 'Choisis un nombre de morceaux valide.',
    err_load_tracks: 'Impossible de charger tracks.json.',
    time_estimate: 'Durée estimée : {range} ({count} morceau{plural})',
    score_multiplier: 'Multiplicateur de score : x{multiplier} (jusqu\'à {points} pts / bonne réponse, plus rapide = plus de points)',
    live_find: 'Trouvés : {score} / {total}',
    live_track: 'Morceau {index} / {total}',
    live_points: '{points} pts',
    game_hint: '* Indice : de {game}',
    reveal_correct: 'Correct ! +{points} pts',
    reveal_wrong: 'Faux !',
    reveal_timeout: 'Temps écoulé !',
    btn_resume_label: 'REPRENDRE ({index}/{total})',
    btn_loading: 'CHARGEMENT...',
    result_perfect: 'Un véritable héros de Hyrule.',
    result_great: 'Tu connais bien l\'histoire de Hyrule.',
    result_ok: 'Pas mal, continue à explorer !',
    result_bad: "Va t'entraîner dans le Bois Perdu...",
    heading_mp: 'Multijoueur',
    placeholder_mp_name: 'Pseudo',
    btn_mp_create: 'CRÉER UNE PARTIE',
    btn_mp_join: 'REJOINDRE',
    btn_mp_start: 'DÉMARRER POUR TOUS',
    btn_mp_leave: 'QUITTER',
    label_mp_room_code: 'Code de la partie',
    mp_waiting_host: "En attente du lancement par l'hôte...",
    mp_waiting_others: 'En attente des autres joueurs...',
    heading_mp_scoreboard: 'Classement',
    label_mp_final_ranking: 'Classement final',
    mp_err_connect: 'Impossible de se connecter au serveur multijoueur.',
    mp_err_enter_code: 'Entre un code de partie.',
    mp_err_room_not_found: 'Partie introuvable.',
    mp_err_disconnected: 'Déconnecté du serveur multijoueur.',
    placeholder_year_from: 'De',
    placeholder_year_to: 'À',
    btn_reset_filters: 'Réinitialiser',
    label_no_games_match: 'Aucun jeu ne correspond à ces filtres.',
    btn_collapse_all: 'Tout replier',
    btn_expand_all: 'Tout déplier',
    placeholder_game_search: 'Rechercher un jeu...',
    label_filter_console: 'Console',
  },
};

function t(key, params) {
  const dict = TRANSLATIONS[uiLang] || TRANSLATIONS.en;
  let str = dict[key] !== undefined ? dict[key] : (TRANSLATIONS.en[key] !== undefined ? TRANSLATIONS.en[key] : key);
  if (params) {
    Object.keys(params).forEach((k) => {
      str = str.split(`{${k}}`).join(params[k]);
    });
  }
  return str;
}

function applyTranslations() {
  document.documentElement.lang = uiLang;

  document.querySelectorAll('[data-i18n]').forEach((node) => {
    node.textContent = t(node.dataset.i18n);
  });

  document.querySelectorAll('[data-i18n-placeholder]').forEach((node) => {
    node.placeholder = t(node.dataset.i18nPlaceholder);
  });

  document.querySelectorAll('[data-i18n-aria]').forEach((node) => {
    node.setAttribute('aria-label', t(node.dataset.i18nAria));
  });

  document.querySelectorAll('[data-i18n-html]').forEach((node) => {
    node.innerHTML = t(node.dataset.i18nHtml);
  });
}

/* ---------- Sound effects ---------- */

const sfxCorrect = new Audio('sfx/correct.wav');
const sfxWrong = new Audio('sfx/wrong.wav');

function playSfx(audio) {
  if (isSfxMuted) return;
  try {
    audio.currentTime = 0;
    audio.volume = Math.max(0, Math.min(1, sfxVolume / 100));
    audio.play().catch(() => {});
  } catch (e) {
    /* ignore playback errors (e.g. autoplay restrictions) */
  }
}

const el = {
  screens: {
    setup: document.getElementById('screen-setup'),
    game: document.getElementById('screen-game'),
    results: document.getElementById('screen-results'),
  },
  totalCount: document.getElementById('total-count'),
  halfCount: document.getElementById('half-count'),
  timeEstimate: document.getElementById('time-estimate'),
  scoreMultiplier: document.getElementById('score-multiplier'),
  gameMenu: document.getElementById('game-menu'),
  gameSearchInput: document.getElementById('game-search-input'),
  consoleFilterBtn: document.getElementById('console-filter-btn'),
  consoleFilterBadge: document.getElementById('console-filter-badge'),
  consoleFilterPanel: document.getElementById('console-filter-panel'),
  gameFilterYearFrom: document.getElementById('game-filter-year-from'),
  gameFilterYearTo: document.getElementById('game-filter-year-to'),
  gameFilterReset: document.getElementById('game-filter-reset'),
  gameCollapseAllBtn: document.getElementById('game-collapse-all-btn'),
  gameExpandAllBtn: document.getElementById('game-expand-all-btn'),
  modeMenu: document.getElementById('mode-menu'),
  customCount: document.getElementById('custom-count'),
  challengeMenu: document.getElementById('challenge-menu'),
  handicapMenu: document.getElementById('handicap-menu'),
  startBtn: document.getElementById('start-btn'),
  setupError: document.getElementById('setup-error'),
  progressLabel: document.getElementById('progress-label'),
  liveScore: document.getElementById('live-score'),
  livePoints: document.getElementById('live-points'),
  finalPoints: document.getElementById('final-points'),
  hpFill: document.getElementById('hp-fill'),
  gameHint: document.getElementById('game-hint'),
  revealMessage: document.getElementById('reveal-message'),
  revealCorrectTitle: document.getElementById('reveal-correct-title'),
  answersGrid: document.getElementById('answers-grid'),
  textAnswer: document.getElementById('text-answer'),
  answerTextInput: document.getElementById('answer-text-input'),
  answerSuggestions: document.getElementById('answer-suggestions'),
  gameAnswer: document.getElementById('game-answer'),
  gameAnswersGrid: document.getElementById('game-answers-grid'),
  finalScore: document.getElementById('final-score'),
  finalTotal: document.getElementById('final-total'),
  scoreComment: document.getElementById('score-comment'),
  replayBtn: document.getElementById('replay-btn'),
  volumeSliderSetup: document.getElementById('volume-slider-setup'),
  volumeSliderGame: document.getElementById('volume-slider-game'),
  volumeTooltipSetup: document.getElementById('volume-tooltip-setup'),
  volumeTooltipGame: document.getElementById('volume-tooltip-game'),
  muteBtnSetup: document.getElementById('mute-btn-setup'),
  muteBtnGame: document.getElementById('mute-btn-game'),
  sfxVolumeSliderSetup: document.getElementById('sfx-volume-slider-setup'),
  sfxVolumeSliderGame: document.getElementById('sfx-volume-slider-game'),
  sfxVolumeTooltipSetup: document.getElementById('sfx-volume-tooltip-setup'),
  sfxVolumeTooltipGame: document.getElementById('sfx-volume-tooltip-game'),
  sfxMuteBtnSetup: document.getElementById('sfx-mute-btn-setup'),
  sfxMuteBtnGame: document.getElementById('sfx-mute-btn-game'),
  langEnBtn: document.getElementById('lang-en-btn'),
  langFrBtn: document.getElementById('lang-fr-btn'),
  trackLangEnBtn: document.getElementById('track-lang-en-btn'),
  trackLangFrBtn: document.getElementById('track-lang-fr-btn'),
  pauseBtn: document.getElementById('pause-btn'),
  pauseResumeBtn: document.getElementById('pause-resume-btn'),
  pauseOverlay: document.getElementById('pause-overlay'),
  backBtn: document.getElementById('back-btn'),
  resumeBtn: document.getElementById('resume-btn'),
  replayClipBtn: document.getElementById('replay-clip-btn'),
  mpJoinCreate: document.getElementById('mp-join-create'),
  mpLobby: document.getElementById('mp-lobby'),
  mpNameInput: document.getElementById('mp-name-input'),
  mpCreateBtn: document.getElementById('mp-create-btn'),
  mpCodeInput: document.getElementById('mp-code-input'),
  mpJoinBtn: document.getElementById('mp-join-btn'),
  mpError: document.getElementById('mp-error'),
  mpRoomCodeDisplay: document.getElementById('mp-room-code-display'),
  mpPlayerList: document.getElementById('mp-player-list'),
  mpStartBtn: document.getElementById('mp-start-btn'),
  mpWaitingNote: document.getElementById('mp-waiting-note'),
  mpLeaveBtn: document.getElementById('mp-leave-btn'),
  mpScoreboardPanel: document.getElementById('mp-scoreboard-panel'),
  mpScoreboardList: document.getElementById('mp-scoreboard-list'),
  mpFinalLeaderboard: document.getElementById('mp-final-leaderboard'),
  mpFinalScoreboardList: document.getElementById('mp-final-scoreboard-list'),
};

let selectedMode = 'all';
let selectedGames = new Set(['zelda1']);

/* ---------- Game catalog: franchise / console / year metadata ---------- */
/* Add new entries here as more games are curated in tracks.json — the menu,
   franchise grouping and "select all" buttons are all generated from this list. */

const FRANCHISES = [
  { id: 'zelda', name: 'The Legend of Zelda' },
  { id: 'undertale', name: 'Undertale' },
  { id: 'deltarune', name: 'Deltarune' },
];

const GAMES = [
  { id: 'zelda1', franchise: 'zelda', name: 'The Legend of Zelda', console: 'NES', year: 1986 },
  { id: 'alttp', franchise: 'zelda', name: 'A Link to the Past', console: 'SNES', year: 1991 },
  { id: 'oot', franchise: 'zelda', name: 'Ocarina of Time', console: 'N64', year: 1998 },
  { id: 'zelda2', franchise: 'zelda', name: 'Zelda II: The Adventure of Link', console: 'NES', year: 1987 },
  { id: 'la', franchise: 'zelda', name: "Link's Awakening", console: 'Game Boy', year: 1993 },
  { id: 'laswitch', franchise: 'zelda', name: "Link's Awakening (Switch remake)", console: 'Switch', year: 2019 },
  { id: 'mm', franchise: 'zelda', name: "Majora's Mask", console: 'N64', year: 2000 },
  { id: 'ooa', franchise: 'zelda', name: 'Oracle of Ages', console: 'Game Boy Color', year: 2001 },
  { id: 'oos', franchise: 'zelda', name: 'Oracle of Seasons', console: 'Game Boy Color', year: 2001 },
  { id: 'fs', franchise: 'zelda', name: 'Four Swords', console: 'GBA', year: 2002 },
  { id: 'ww', franchise: 'zelda', name: 'The Wind Waker', console: 'GameCube', year: 2003 },
  { id: 'fsa', franchise: 'zelda', name: 'Four Swords Adventures', console: 'GameCube', year: 2004 },
  { id: 'mc', franchise: 'zelda', name: 'The Minish Cap', console: 'GBA', year: 2004 },
  { id: 'tp', franchise: 'zelda', name: 'Twilight Princess', console: 'GameCube / Wii', year: 2006 },
  { id: 'ph', franchise: 'zelda', name: 'Phantom Hourglass', console: 'DS', year: 2007 },
  { id: 'st', franchise: 'zelda', name: 'Spirit Tracks', console: 'DS', year: 2009 },
  { id: 'ss', franchise: 'zelda', name: 'Skyward Sword', console: 'Wii', year: 2011 },
  { id: 'albw', franchise: 'zelda', name: 'A Link Between Worlds', console: '3DS', year: 2013 },
  { id: 'tfh', franchise: 'zelda', name: 'Tri Force Heroes', console: '3DS', year: 2015 },
  { id: 'botw', franchise: 'zelda', name: 'Breath of the Wild', console: 'Switch', year: 2017 },
  { id: 'totk', franchise: 'zelda', name: 'Tears of the Kingdom', console: 'Switch', year: 2023 },
  { id: 'eow', franchise: 'zelda', name: 'Echoes of Wisdom', console: 'Switch', year: 2024 },

  { id: 'undertale', franchise: 'undertale', name: 'Undertale', console: 'PC', year: 2015 },

  { id: 'dr1', franchise: 'deltarune', name: 'Deltarune - Chapter 1', console: 'PC', year: 2018 },
  { id: 'dr2', franchise: 'deltarune', name: 'Deltarune - Chapter 2', console: 'PC', year: 2021 },
  { id: 'dr3', franchise: 'deltarune', name: 'Deltarune - Chapter 3', console: 'PC', year: 2025 },
  { id: 'dr4', franchise: 'deltarune', name: 'Deltarune - Chapter 4', console: 'PC', year: 2025 },
  { id: 'dr5', franchise: 'deltarune', name: 'Deltarune - Chapter 5', console: 'PC', year: 2025 },
];

const gamesById = {};
GAMES.forEach((g) => { gamesById[g.id] = g; });

function getGameDisplayName(gameId) {
  const g = gamesById[gameId];
  return g ? g.name : gameId;
}

/* ---------- Game catalog filters: console + year range, so the list stays
   usable on a 16:9 screen instead of growing into endless page scroll as
   more games/franchises get added. Franchises are also collapsible. ---------- */

const franchiseCollapsed = {};
let franchiseCollapsedInitialized = false;
const gameFilter = { consoles: new Set(), yearFrom: null, yearTo: null, search: '' };

function getAllConsoles() {
  return Array.from(new Set(GAMES.map((g) => g.console))).sort();
}

function isAnyGameFilterActive() {
  return gameFilter.consoles.size > 0 || gameFilter.yearFrom !== null || gameFilter.yearTo !== null || gameFilter.search.trim().length > 0;
}

function gameMatchesFilter(game, franchise) {
  if (gameFilter.consoles.size > 0 && !gameFilter.consoles.has(game.console)) return false;
  if (gameFilter.yearFrom !== null && game.year < gameFilter.yearFrom) return false;
  if (gameFilter.yearTo !== null && game.year > gameFilter.yearTo) return false;
  const query = gameFilter.search.trim().toLowerCase();
  if (query) {
    const haystack = `${game.name} ${franchise ? franchise.name : ''} ${game.console}`.toLowerCase();
    if (!haystack.includes(query)) return false;
  }
  return true;
}

/* Collapse franchises with no current selection by default so a catalog with
   many franchises opens compact; leave that decision alone once the user has
   manually expanded/collapsed something. */
function initFranchiseCollapsedDefaults() {
  if (franchiseCollapsedInitialized) return;
  franchiseCollapsedInitialized = true;
  FRANCHISES.forEach((franchise) => {
    const gamesInFranchise = GAMES.filter((g) => g.franchise === franchise.id);
    const hasSelection = gamesInFranchise.some((g) => selectedGames.has(g.id));
    franchiseCollapsed[franchise.id] = !hasSelection;
  });
}

/* ---------- Console filter: compact dropdown instead of a row of toggles,
   so it stays small even once many consoles are represented in the catalog. ---------- */

function updateConsoleFilterButton() {
  const count = gameFilter.consoles.size;
  el.consoleFilterBtn.classList.toggle('active', count > 0);
  el.consoleFilterBadge.hidden = count === 0;
  el.consoleFilterBadge.textContent = String(count);
}

function renderConsoleFilterPanel() {
  el.consoleFilterPanel.innerHTML = '';
  getAllConsoles().forEach((console_) => {
    const label = document.createElement('label');
    label.className = 'filter-dropdown-option';

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = gameFilter.consoles.has(console_);
    checkbox.addEventListener('change', () => {
      if (checkbox.checked) gameFilter.consoles.add(console_);
      else gameFilter.consoles.delete(console_);
      updateConsoleFilterButton();
      renderGameMenu();
    });

    label.appendChild(checkbox);
    label.appendChild(document.createTextNode(console_));
    el.consoleFilterPanel.appendChild(label);
  });
  updateConsoleFilterButton();
}

function closeConsoleFilterPanel() {
  el.consoleFilterPanel.hidden = true;
}

el.consoleFilterBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  el.consoleFilterPanel.hidden = !el.consoleFilterPanel.hidden;
});

document.addEventListener('click', (e) => {
  if (el.consoleFilterPanel.hidden) return;
  if (el.consoleFilterPanel.contains(e.target) || e.target === el.consoleFilterBtn) return;
  closeConsoleFilterPanel();
});

el.gameSearchInput.addEventListener('input', () => {
  gameFilter.search = el.gameSearchInput.value;
  renderGameMenu();
});

function applyYearFilterFromInputs() {
  const from = parseInt(el.gameFilterYearFrom.value, 10);
  const to = parseInt(el.gameFilterYearTo.value, 10);
  gameFilter.yearFrom = Number.isFinite(from) ? from : null;
  gameFilter.yearTo = Number.isFinite(to) ? to : null;
  renderGameMenu();
}

el.gameFilterYearFrom.addEventListener('input', applyYearFilterFromInputs);
el.gameFilterYearTo.addEventListener('input', applyYearFilterFromInputs);

el.gameFilterReset.addEventListener('click', () => {
  gameFilter.consoles.clear();
  gameFilter.yearFrom = null;
  gameFilter.yearTo = null;
  gameFilter.search = '';
  el.gameFilterYearFrom.value = '';
  el.gameFilterYearTo.value = '';
  el.gameSearchInput.value = '';
  renderConsoleFilterPanel();
  renderGameMenu();
});

el.gameCollapseAllBtn.addEventListener('click', () => {
  FRANCHISES.forEach((franchise) => { franchiseCollapsed[franchise.id] = true; });
  renderGameMenu();
});

el.gameExpandAllBtn.addEventListener('click', () => {
  FRANCHISES.forEach((franchise) => { franchiseCollapsed[franchise.id] = false; });
  renderGameMenu();
});

function renderGameMenu() {
  el.gameMenu.innerHTML = '';
  const filterActive = isAnyGameFilterActive();

  FRANCHISES.forEach((franchise) => {
    const gamesInFranchise = GAMES.filter((g) => g.franchise === franchise.id);
    if (gamesInFranchise.length === 0) return;

    const visibleGames = gamesInFranchise.filter((g) => gameMatchesFilter(g, franchise));
    if (filterActive && visibleGames.length === 0) return;

    /* Filtering implies "show me what matched": ignore the stored collapse
       preference while a filter is active instead of hiding the results. */
    const collapsed = filterActive ? false : !!franchiseCollapsed[franchise.id];

    const block = document.createElement('div');
    block.className = 'franchise-block';

    const header = document.createElement('div');
    header.className = 'franchise-header';

    const collapseBtn = document.createElement('button');
    collapseBtn.type = 'button';
    collapseBtn.className = 'franchise-collapse-btn';
    collapseBtn.textContent = collapsed ? '▸' : '▾';
    collapseBtn.setAttribute('aria-label', collapsed ? 'Expand' : 'Collapse');

    const nameSpan = document.createElement('span');
    nameSpan.className = 'franchise-name';
    nameSpan.textContent = `${franchise.name} (${visibleGames.length}/${gamesInFranchise.length})`;

    const selectAllBtn = document.createElement('button');
    selectAllBtn.type = 'button';
    selectAllBtn.className = 'franchise-select-all';
    selectAllBtn.textContent = t('btn_select_all');
    selectAllBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const ids = (visibleGames.length ? visibleGames : gamesInFranchise).map((g) => g.id);
      const allSelected = ids.every((id) => selectedGames.has(id));
      ids.forEach((id) => {
        if (allSelected) selectedGames.delete(id);
        else selectedGames.add(id);
      });
      el.gameMenu.querySelectorAll('.menu-option').forEach((btn) => {
        btn.classList.toggle('selected', selectedGames.has(btn.dataset.game));
      });
      updateTotalCount();
      el.setupError.textContent = '';
    });

    header.appendChild(collapseBtn);
    header.appendChild(nameSpan);
    header.appendChild(selectAllBtn);
    header.addEventListener('click', (e) => {
      if (e.target === selectAllBtn) return;
      franchiseCollapsed[franchise.id] = !franchiseCollapsed[franchise.id];
      renderGameMenu();
    });

    block.appendChild(header);

    if (!collapsed) {
      const gamesContainer = document.createElement('div');
      gamesContainer.className = 'franchise-games';

      if (visibleGames.length === 0) {
        const empty = document.createElement('p');
        empty.className = 'menu-empty-note';
        empty.textContent = t('label_no_games_match');
        gamesContainer.appendChild(empty);
      }

      visibleGames
        .slice()
        .sort((a, b) => a.year - b.year)
        .forEach((game) => {
          const btn = document.createElement('button');
          btn.type = 'button';
          btn.className = 'menu-option';
          btn.dataset.game = game.id;
          btn.classList.toggle('selected', selectedGames.has(game.id));

          const cursor = document.createElement('span');
          cursor.className = 'cursor';
          cursor.textContent = '♥';
          btn.appendChild(cursor);

          const label = document.createElement('span');
          label.textContent = game.name;
          const meta = document.createElement('span');
          meta.className = 'game-option-meta';
          meta.textContent = `(${game.console}, ${game.year})`;
          label.appendChild(meta);
          btn.appendChild(label);

          btn.addEventListener('click', () => {
            if (selectedGames.has(game.id)) selectedGames.delete(game.id);
            else selectedGames.add(game.id);
            btn.classList.toggle('selected', selectedGames.has(game.id));
            updateTotalCount();
            el.setupError.textContent = '';
          });

          gamesContainer.appendChild(btn);
        });

      block.appendChild(gamesContainer);
    }

    el.gameMenu.appendChild(block);
  });
}

/* ---------- Track title language (falls back to English if no French title) ---------- */

function getDisplayTitle(track) {
  if (trackLang === 'fr' && track.title_fr) return track.title_fr;
  return track.title;
}

/* ---------- Language toggles ---------- */

function syncLangButtons() {
  el.langEnBtn.classList.toggle('selected', uiLang === 'en');
  el.langFrBtn.classList.toggle('selected', uiLang === 'fr');
  el.trackLangEnBtn.classList.toggle('selected', trackLang === 'en');
  el.trackLangFrBtn.classList.toggle('selected', trackLang === 'fr');
}

function refreshDynamicText() {
  applyTranslations();
  renderGameMenu();
  updateTimeEstimate();
  updateScoreMultiplierDisplay();
  refreshResumeAvailability();
  if (playlist.length > 0) {
    updateLiveScore();
    el.progressLabel.textContent = t('live_track', { index: currentIndex + 1, total: playlist.length });
  }
}

function setUiLang(lang) {
  uiLang = lang;
  try {
    localStorage.setItem(UI_LANG_STORAGE_KEY, lang);
  } catch (e) {
    /* localStorage unavailable, ignore */
  }
  syncLangButtons();
  refreshDynamicText();
}

function setTrackLang(lang) {
  trackLang = lang;
  try {
    localStorage.setItem(TRACK_LANG_STORAGE_KEY, lang);
  } catch (e) {
    /* localStorage unavailable, ignore */
  }
  syncLangButtons();
  if (playlist.length > 0 && !answerLocked) {
    renderAnswers(playlist[currentIndex]);
  }
}

el.langEnBtn.addEventListener('click', () => setUiLang('en'));
el.langFrBtn.addEventListener('click', () => setUiLang('fr'));
el.trackLangEnBtn.addEventListener('click', () => setTrackLang('en'));
el.trackLangFrBtn.addEventListener('click', () => setTrackLang('fr'));

/* ---------- Utilities ---------- */

function shuffle(array) {
  const a = array.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function showScreen(name) {
  Object.entries(el.screens).forEach(([key, node]) => {
    node.classList.toggle('active', key === name);
  });
}

function getFilteredPool() {
  return allTracks.filter((t) => selectedGames.has(t.game));
}

const ROUND_DURATIONS_BY_KEY = {
  time30: 30000,
  time25: 25000,
  time20: 20000,
  time10: 10000,
  time5: 5000,
  time3: 3000,
};

function getRoundDurationMs() {
  return ROUND_DURATIONS_BY_KEY[timeChallenge] || 15000;
}

function getAnswerCount() {
  return answerCountOverride || 4;
}

function usesGameStep() {
  return guessGameMode && selectedGames.size > 1;
}

/* ---------- Scoring: harder Défis pay more, easier Handicaps pay less ---------- */

const BASE_POINTS_PER_CORRECT = 100;

const TIME_MULTIPLIER_BONUS = {
  time3: 0.40,
  time5: 0.25,
  time10: 0.10,
  time20: -0.10,
  time25: -0.20,
  time30: -0.30,
};

const COUNT_MULTIPLIER_BONUS = {
  count10: 0.15,
  count8: 0.10,
  count6: 0.05,
  count3: -0.10,
  count2: -0.20,
};

function computeScoreMultiplier() {
  let bonus = 0;

  if (timeChallenge && TIME_MULTIPLIER_BONUS[timeChallenge]) {
    bonus += TIME_MULTIPLIER_BONUS[timeChallenge];
  }

  if (answerCountOverride) {
    const countKey = Object.keys(COUNT_VALUES).find((k) => COUNT_VALUES[k] === answerCountOverride);
    if (countKey && COUNT_MULTIPLIER_BONUS[countKey]) bonus += COUNT_MULTIPLIER_BONUS[countKey];
  }

  if (clipChallenge) bonus += 0.15;
  if (writeTitleMode) bonus += 0.20;
  if (guessGameMode) bonus += 0.10;
  if (handicapShowGameLabel) bonus -= 0.10;
  if (handicapGameHint) bonus -= 0.15;

  return Math.max(0.2, 1 + bonus);
}

function getPointsPerCorrectAnswer() {
  return Math.round(BASE_POINTS_PER_CORRECT * computeScoreMultiplier());
}

/* Speed bonus: answering right away pays full points, answering at the
   very last moment only pays MIN_SPEED_FACTOR of them. Decays linearly
   with how much of the round's time has already elapsed. */
const MIN_SPEED_FACTOR = 0.5;

function getSpeedFactor() {
  const duration = getRoundDurationMs();
  const elapsed = Math.max(0, Date.now() - roundStartTime);
  const ratio = duration > 0 ? Math.min(1, elapsed / duration) : 1;
  return Math.max(MIN_SPEED_FACTOR, 1 - (1 - MIN_SPEED_FACTOR) * ratio);
}

/* ---------- In-progress game persistence (survives refresh / going back to the menu) ---------- */

function saveGameState() {
  try {
    localStorage.setItem(GAME_STATE_KEY, JSON.stringify({
      playlistIds: playlist.map((t) => t.id),
      currentIndex,
      score,
      totalPoints,
      selectedGames: Array.from(selectedGames),
      selectedMode,
      customCount: el.customCount.value,
      roundStartTime,
      answered: roundAnswered,
      clipChallenge,
      timeChallenge,
      answerCountOverride,
      writeTitleMode,
      guessGameMode,
      handicapShowGameLabel,
      handicapGameHint,
    }));
  } catch (e) {
    /* localStorage unavailable, ignore */
  }
}

function clearGameState() {
  try {
    localStorage.removeItem(GAME_STATE_KEY);
  } catch (e) {
    /* localStorage unavailable, ignore */
  }
}

function loadGameState() {
  try {
    const raw = localStorage.getItem(GAME_STATE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (!data || !Array.isArray(data.playlistIds) || typeof data.currentIndex !== 'number') return null;
    if (data.currentIndex >= data.playlistIds.length) return null;
    return data;
  } catch (e) {
    return null;
  }
}

function refreshResumeAvailability() {
  const saved = loadGameState();
  el.resumeBtn.hidden = !saved;
  if (saved) {
    el.resumeBtn.textContent = t('btn_resume_label', { index: saved.currentIndex + 1, total: saved.playlistIds.length });
  }
}

syncLangButtons();
applyTranslations();
refreshResumeAvailability();
updateScoreMultiplierDisplay();

function updateTotalCount() {
  const pool = getFilteredPool();
  el.totalCount.textContent = pool.length;
  el.halfCount.textContent = Math.max(1, Math.floor(pool.length / 2));
  el.customCount.max = pool.length;
  el.customCount.value = Math.min(parseInt(el.customCount.value, 10) || 10, pool.length || 1);
  updateTimeEstimate();
}

/* ---------- Estimated playtime ---------- */

const FAST_ANSWER_MS = 2000;

function getPlannedTrackCount() {
  const pool = getFilteredPool();
  if (pool.length === 0) return 0;
  if (selectedMode === 'all') return pool.length;
  if (selectedMode === 'half') return Math.max(1, Math.floor(pool.length / 2));
  const custom = parseInt(el.customCount.value, 10);
  return Number.isFinite(custom) && custom > 0 ? Math.min(custom, pool.length) : 0;
}

function updateTimeEstimate() {
  const count = getPlannedTrackCount();
  if (!count) {
    el.timeEstimate.textContent = '';
    return;
  }

  const duration = getRoundDurationMs();
  const minMinutes = Math.max(1, Math.round((count * (FAST_ANSWER_MS + REVEAL_PAUSE_MS)) / 60000));
  const maxMinutes = Math.max(minMinutes, Math.round((count * (duration + REVEAL_PAUSE_MS)) / 60000));
  const range = minMinutes === maxMinutes ? `~${minMinutes} min` : `~${minMinutes}-${maxMinutes} min`;
  const plural = count > 1 ? (uiLang === 'fr' ? 'x' : 's') : '';
  el.timeEstimate.textContent = t('time_estimate', { range, count, plural });
}

function updateScoreMultiplierDisplay() {
  const multiplier = computeScoreMultiplier();
  const points = getPointsPerCorrectAnswer();
  el.scoreMultiplier.textContent = t('score_multiplier', { multiplier: multiplier.toFixed(2), points });
}

/* ---------- Loading the tracks ---------- */

fetch('tracks.json')
  .then((res) => res.json())
  .then((data) => {
    allTracks = data.filter((t) => t.title && t.id);
    el.customCount.value = 10;
    updateTotalCount();
  })
  .catch(() => {
    el.setupError.textContent = t('err_load_tracks');
  });

/* ---------- Setup screen ---------- */

renderConsoleFilterPanel();
initFranchiseCollapsedDefaults();
renderGameMenu();

el.modeMenu.querySelectorAll('.menu-option').forEach((btn) => {
  btn.addEventListener('click', () => {
    selectedMode = btn.dataset.mode;
    el.modeMenu.querySelectorAll('.menu-option').forEach((b) =>
      b.classList.toggle('selected', b === btn)
    );
    updateTimeEstimate();
  });
});

el.customCount.addEventListener('input', updateTimeEstimate);

/* ---------- Défi / Handicap menus ---------- */

const TIME_KEYS = ['time30', 'time25', 'time20', 'time10', 'time5', 'time3'];
const MINI_COUNT_KEYS = ['count6', 'count8', 'count10', 'count3', 'count2'];
const COUNT_VALUES = { count6: 6, count8: 8, count10: 10, count3: 3, count2: 2 };

function getModifierToggle(key) {
  return document.querySelector(`[data-challenge="${key}"], [data-handicap="${key}"]`);
}

function getTimeToggle(key) {
  return getModifierToggle(key);
}

function getCountToggle(key) {
  return getModifierToggle(key);
}

function clearTimeSelection() {
  TIME_KEYS.forEach((key) => {
    const btn = getModifierToggle(key);
    if (btn) btn.classList.remove('selected');
  });
}

function clearCountSelection() {
  MINI_COUNT_KEYS.forEach((key) => {
    const btn = getModifierToggle(key);
    if (btn) btn.classList.remove('selected');
  });
}

document.querySelectorAll(TIME_KEYS.map((k) => `[data-challenge="${k}"], [data-handicap="${k}"]`).join(', ')).forEach((btn) => {
  btn.addEventListener('click', () => {
    const key = btn.dataset.challenge || btn.dataset.handicap;
    const wasSelected = btn.classList.contains('selected');
    clearTimeSelection();
    timeChallenge = wasSelected ? null : key;
    if (!wasSelected) btn.classList.add('selected');
    updateTimeEstimate();
    updateScoreMultiplierDisplay();
  });
});

document.querySelectorAll(MINI_COUNT_KEYS.map((k) => `[data-challenge="${k}"], [data-handicap="${k}"]`).join(', ')).forEach((btn) => {
  btn.addEventListener('click', () => {
    const key = btn.dataset.challenge || btn.dataset.handicap;
    const wasSelected = btn.classList.contains('selected');
    clearCountSelection();
    answerCountOverride = wasSelected ? null : COUNT_VALUES[key];
    if (!wasSelected) btn.classList.add('selected');
    updateScoreMultiplierDisplay();
  });
});

el.challengeMenu.querySelectorAll('.menu-option').forEach((btn) => {
  btn.addEventListener('click', () => {
    const key = btn.dataset.challenge;
    const wasSelected = btn.classList.contains('selected');
    btn.classList.toggle('selected', !wasSelected);
    if (key === 'clip1s') clipChallenge = !wasSelected;
    else if (key === 'writeTitle') writeTitleMode = !wasSelected;
    else if (key === 'guessGame') guessGameMode = !wasSelected;
    updateScoreMultiplierDisplay();
  });
});

el.handicapMenu.querySelectorAll('.menu-option').forEach((btn) => {
  btn.addEventListener('click', () => {
    const key = btn.dataset.handicap;
    const wasSelected = btn.classList.contains('selected');
    btn.classList.toggle('selected', !wasSelected);
    if (key === 'showGameLabel') handicapShowGameLabel = !wasSelected;
    else if (key === 'gameHint') handicapGameHint = !wasSelected;
    updateScoreMultiplierDisplay();
  });
});

function preparePlaylist() {
  el.setupError.textContent = '';

  if (selectedGames.size === 0) {
    el.setupError.textContent = t('err_select_game');
    return false;
  }

  currentPool = getFilteredPool();

  const effectiveCount = writeTitleMode ? 4 : getAnswerCount();
  if (currentPool.length < effectiveCount) {
    el.setupError.textContent = t('err_min_tracks', { count: effectiveCount });
    return false;
  }

  let count;
  if (selectedMode === 'all') {
    count = currentPool.length;
  } else if (selectedMode === 'half') {
    count = Math.max(1, Math.floor(currentPool.length / 2));
  } else {
    count = parseInt(el.customCount.value, 10);
    if (!count || count < 1) {
      el.setupError.textContent = t('err_valid_number');
      return false;
    }
    if (count > currentPool.length) {
      el.setupError.textContent = t('err_only_n_tracks', { count: currentPool.length });
      return false;
    }
  }

  playlist = shuffle(currentPool).slice(0, count);
  currentIndex = 0;
  score = 0;
  totalPoints = 0;
  roundStartTime = 0;
  roundAnswered = false;
  return true;
}

el.startBtn.addEventListener('click', async () => {
  if (!preparePlaylist()) return;
  saveGameState();
  await beginGame(el.startBtn, t('btn_start'));
});

el.resumeBtn.addEventListener('click', async () => {
  const saved = loadGameState();
  if (!saved || allTracks.length === 0) {
    refreshResumeAvailability();
    return;
  }

  selectedGames = new Set(saved.selectedGames);
  el.gameMenu.querySelectorAll('.menu-option').forEach((btn) => {
    btn.classList.toggle('selected', selectedGames.has(btn.dataset.game));
  });

  selectedMode = saved.selectedMode;
  el.modeMenu.querySelectorAll('.menu-option').forEach((btn) => {
    btn.classList.toggle('selected', btn.dataset.mode === selectedMode);
  });
  el.customCount.value = saved.customCount;

  clipChallenge = !!saved.clipChallenge;
  timeChallenge = saved.timeChallenge || null;
  answerCountOverride = saved.answerCountOverride || null;
  writeTitleMode = !!saved.writeTitleMode;
  guessGameMode = !!saved.guessGameMode;
  handicapShowGameLabel = !!saved.handicapShowGameLabel;
  handicapGameHint = !!saved.handicapGameHint;

  TIME_KEYS.forEach((key) => {
    const btn = getModifierToggle(key);
    if (btn) btn.classList.toggle('selected', timeChallenge === key);
  });

  MINI_COUNT_KEYS.forEach((key) => {
    const btn = getModifierToggle(key);
    if (btn) btn.classList.toggle('selected', answerCountOverride === COUNT_VALUES[key]);
  });

  updateTimeEstimate();
  updateScoreMultiplierDisplay();

  el.challengeMenu.querySelectorAll('.menu-option').forEach((btn) => {
    const key = btn.dataset.challenge;
    let active = false;
    if (key === 'clip1s') active = clipChallenge;
    else if (key === 'writeTitle') active = writeTitleMode;
    else if (key === 'guessGame') active = guessGameMode;
    btn.classList.toggle('selected', active);
  });

  el.handicapMenu.querySelectorAll('.menu-option').forEach((btn) => {
    const key = btn.dataset.handicap;
    let active = false;
    if (key === 'showGameLabel') active = handicapShowGameLabel;
    else if (key === 'gameHint') active = handicapGameHint;
    btn.classList.toggle('selected', active);
  });

  currentPool = getFilteredPool();
  playlist = saved.playlistIds
    .map((id) => allTracks.find((t) => t.id === id))
    .filter(Boolean);
  currentIndex = saved.currentIndex;
  score = saved.score;
  totalPoints = saved.totalPoints || 0;

  if (playlist.length === 0 || currentIndex >= playlist.length) {
    clearGameState();
    refreshResumeAvailability();
    return;
  }

  if (saved.answered) {
    /* The track was already answered before the interruption: that answer
       already counts (score was saved at the time), so skip straight to the
       next track instead of replaying/re-scoring the one just left. */
    currentIndex += 1;
    roundStartTime = 0;
    roundAnswered = false;
    if (currentIndex >= playlist.length) {
      finishGame();
      return;
    }
  } else {
    /* Not yet answered: keep the original start time so the countdown
       continues from where it was, instead of granting a fresh round. */
    roundStartTime = saved.roundStartTime || 0;
    roundAnswered = false;
  }

  await beginGame(el.resumeBtn, t('btn_resume'));
});

async function beginGame(triggerBtn, idleLabel) {
  mpActive = false;
  mpSetScoreboardVisible(false);
  el.pauseBtn.hidden = false;
  pauseRequested = false;
  isPaused = false;
  el.pauseBtn.textContent = t('btn_pause');
  el.pauseBtn.classList.remove('queued', 'paused');
  el.pauseOverlay.hidden = true;
  el.answersGrid.hidden = false;
  el.textAnswer.hidden = true;
  el.gameAnswer.hidden = true;

  el.startBtn.disabled = true;
  el.resumeBtn.disabled = true;
  triggerBtn.textContent = t('btn_loading');
  await ensureYouTubeReady();
  el.startBtn.disabled = false;
  el.resumeBtn.disabled = false;
  triggerBtn.textContent = idleLabel;

  showScreen('game');
  startRound();
}

el.replayBtn.addEventListener('click', () => {
  refreshResumeAvailability();
  if (mpRoom) mpShowLobby();
  showScreen('setup');
});

/* ---------- Volume control (generic: reused for music and SFX) ---------- */

function positionVolumeTooltip(slider, tooltip) {
  const min = parseInt(slider.min, 10) || 0;
  const max = parseInt(slider.max, 10) || 100;
  const percent = ((slider.value - min) / (max - min)) * 100;
  tooltip.textContent = `${slider.value}%`;
  tooltip.style.left = `${percent}%`;
}

function setupVolumeSliders(pairs, initialValue, storageKey, onChange) {
  function showTooltip(activeSlider) {
    pairs.forEach(({ slider, tooltip }) => {
      positionVolumeTooltip(slider, tooltip);
      tooltip.classList.toggle('visible', slider === activeSlider);
    });
  }

  function hideTooltips() {
    pairs.forEach(({ tooltip }) => tooltip.classList.remove('visible'));
  }

  pairs.forEach(({ slider, tooltip }) => {
    slider.value = initialValue;
    positionVolumeTooltip(slider, tooltip);

    slider.addEventListener('input', () => {
      const value = parseInt(slider.value, 10);
      pairs.forEach(({ slider: other }) => {
        if (other !== slider) other.value = value;
      });
      showTooltip(slider);
      onChange(value);
      try {
        localStorage.setItem(storageKey, String(value));
      } catch (e) {
        /* localStorage unavailable, ignore */
      }
    });

    ['change', 'pointerup', 'mouseup', 'touchend', 'blur'].forEach((eventName) => {
      slider.addEventListener(eventName, hideTooltips);
    });
  });
}

setupVolumeSliders(
  [
    { slider: el.volumeSliderSetup, tooltip: el.volumeTooltipSetup },
    { slider: el.volumeSliderGame, tooltip: el.volumeTooltipGame },
  ],
  currentVolume,
  VOLUME_STORAGE_KEY,
  (value) => {
    currentVolume = value;
    if (isMuted) setMuted(false);
    if (player && typeof player.setVolume === 'function') {
      player.setVolume(currentVolume);
    }
  }
);

setupVolumeSliders(
  [
    { slider: el.sfxVolumeSliderSetup, tooltip: el.sfxVolumeTooltipSetup },
    { slider: el.sfxVolumeSliderGame, tooltip: el.sfxVolumeTooltipGame },
  ],
  sfxVolume,
  SFX_VOLUME_STORAGE_KEY,
  (value) => {
    sfxVolume = value;
    if (isSfxMuted) setSfxMuted(false);
  }
);

/* ---------- Mute toggles ---------- */

const muteButtons = [el.muteBtnSetup, el.muteBtnGame];
const sfxMuteButtons = [el.sfxMuteBtnSetup, el.sfxMuteBtnGame];

function setMuted(muted) {
  isMuted = muted;
  if (player) {
    if (muted && typeof player.mute === 'function') player.mute();
    else if (!muted && typeof player.unMute === 'function') player.unMute();
  }
  muteButtons.forEach((btn) => {
    btn.classList.toggle('muted', muted);
    btn.setAttribute('aria-label', muted ? t('aria_unmute') : t('aria_mute'));
  });
  try {
    localStorage.setItem(MUTE_STORAGE_KEY, String(muted));
  } catch (e) {
    /* localStorage unavailable, ignore */
  }
}

function setSfxMuted(muted) {
  isSfxMuted = muted;
  sfxMuteButtons.forEach((btn) => {
    btn.classList.toggle('muted', muted);
    btn.setAttribute('aria-label', muted ? t('aria_unmute_sfx') : t('aria_mute_sfx'));
  });
  try {
    localStorage.setItem(SFX_MUTE_STORAGE_KEY, String(muted));
  } catch (e) {
    /* localStorage unavailable, ignore */
  }
}

setMuted(isMuted);
setSfxMuted(isSfxMuted);

muteButtons.forEach((btn) => {
  btn.addEventListener('click', () => setMuted(!isMuted));
});

sfxMuteButtons.forEach((btn) => {
  btn.addEventListener('click', () => setSfxMuted(!isSfxMuted));
});

/* ---------- Back button (in-game, returns to the menu) ---------- */

el.backBtn.addEventListener('click', () => {
  clearTimers();
  answerLocked = true;
  if (player && typeof player.stopVideo === 'function') {
    player.stopVideo();
  }
  if (mpActive) {
    mpLeaveRoom();
  } else {
    pauseRequested = false;
    isPaused = false;
    el.pauseBtn.textContent = t('btn_pause');
    el.pauseBtn.classList.remove('queued', 'paused');
    el.pauseOverlay.hidden = true;
    refreshResumeAvailability();
  }
  showScreen('setup');
});

/* ---------- Pause control (takes effect only at the next round, to prevent cheating) ---------- */

el.pauseBtn.addEventListener('click', () => {
  if (isPaused) {
    isPaused = false;
    el.pauseBtn.textContent = t('btn_pause');
    el.pauseBtn.classList.remove('paused');
    el.pauseOverlay.hidden = true;
    el.answersGrid.hidden = false;
    startRound();
  } else if (pauseRequested) {
    pauseRequested = false;
    el.pauseBtn.textContent = t('btn_pause');
    el.pauseBtn.classList.remove('queued');
  } else {
    pauseRequested = true;
    el.pauseBtn.textContent = t('btn_pause_queued');
    el.pauseBtn.classList.add('queued');
  }
});

el.pauseResumeBtn.addEventListener('click', () => {
  el.pauseBtn.click();
});

/* ---------- Hidden YouTube player ---------- */

function onYouTubeIframeAPIReady() {
  ytApiReady = true;
}
window.onYouTubeIframeAPIReady = onYouTubeIframeAPIReady;

function ensureYouTubeReady() {
  return new Promise((resolve) => {
    if (ytApiReady && player) return resolve();
    const check = setInterval(() => {
      if (!ytApiReady) return;
      clearInterval(check);
      if (!player) {
        player = new YT.Player('yt-player', {
          height: '1',
          width: '1',
          host: 'https://www.youtube-nocookie.com',
          playerVars: {
            autoplay: 0,
            controls: 0,
            disablekb: 1,
            fs: 0,
            modestbranding: 1,
            rel: 0,
            iv_load_policy: 3,
            playsinline: 1,
          },
          events: {
            onReady: () => {
              player.setVolume(currentVolume);
              if (isMuted) player.mute();
              resolve();
            },
          },
        });
      } else {
        resolve();
      }
    }, 100);
  });
}

/* ---------- Playing a round ---------- */

function updateLiveScore() {
  el.liveScore.textContent = t('live_find', { score, total: playlist.length });
  el.livePoints.textContent = t('live_points', { points: totalPoints });
}

function startRound() {
  answerLocked = false;
  clearTimers();

  const track = playlist[currentIndex];
  el.progressLabel.textContent = t('live_track', { index: currentIndex + 1, total: playlist.length });
  updateLiveScore();

  el.gameHint.hidden = !handicapGameHint;
  if (handicapGameHint) {
    el.gameHint.textContent = t('game_hint', { game: getGameDisplayName(track.game) });
  }

  el.revealMessage.hidden = true;
  el.revealCorrectTitle.hidden = true;

  renderAnswers(track);

  /* roundStartTime may already be set when resuming an interrupted round:
     in that case the countdown continues from where it was instead of
     granting a fresh round, which would let someone cheat by refreshing
     or leaving mid-round to buy more thinking time. */
  const duration = getRoundDurationMs();
  const now = Date.now();
  if (!roundStartTime) roundStartTime = now;
  const elapsed = Math.max(now - roundStartTime, 0);
  const remaining = Math.max(duration - elapsed, 0);
  roundAnswered = false;
  saveGameState();

  if (remaining <= 0) {
    /* Time had already run out while away: resolve exactly like a natural timeout. */
    revealAnswer(null, null);
    return;
  }

  resetTimerBar(remaining, elapsed);

  el.replayClipBtn.hidden = !clipChallenge;
  if (clipChallenge) {
    playChallengeClip(track);
  } else {
    player.loadVideoById({ videoId: track.id, startSeconds: 0 });
    player.playVideo();
    if (!isMuted) player.unMute?.();
  }

  roundTimeoutId = setTimeout(() => revealAnswer(null, null), remaining);

  const warningRemaining = duration * WARNING_FRACTION - elapsed;
  if (warningRemaining <= 0) {
    el.hpFill.classList.add('warning');
  } else {
    warningTimeoutId = setTimeout(() => el.hpFill.classList.add('warning'), warningRemaining);
  }

  const criticalRemaining = duration * CRITICAL_FRACTION - elapsed;
  if (criticalRemaining <= 0) {
    el.hpFill.classList.add('critical');
  } else {
    criticalTimeoutId = setTimeout(() => el.hpFill.classList.add('critical'), criticalRemaining);
  }
}

/* ---------- Rendering answers: multiple choice, free text, or game step ---------- */

function pickDecoys(track, neededCount) {
  if (neededCount <= 0) return [];
  const sameGamePool = currentPool.filter((t) => t.game === track.game && t.title !== track.title);
  const otherPool = currentPool.filter((t) => t.game !== track.game);

  if (handicapGameHint && sameGamePool.length > 0) {
    /* Guarantee at least one same-game decoy so the "which game" hint
       never trivially gives away the answer by elimination. */
    const shuffledSameGame = shuffle(sameGamePool);
    const guaranteed = shuffledSameGame.slice(0, 1);
    const rest = shuffle([...shuffledSameGame.slice(1), ...otherPool]).slice(0, neededCount - 1);
    return [...guaranteed, ...rest];
  }

  return shuffle(currentPool.filter((t) => t.title !== track.title)).slice(0, neededCount);
}

function renderAnswers(track) {
  pendingTitle = null;
  el.gameAnswer.hidden = true;

  if (writeTitleMode) {
    el.answersGrid.hidden = true;
    el.textAnswer.hidden = false;
    renderTextAnswer();
  } else {
    el.answersGrid.hidden = false;
    el.textAnswer.hidden = true;
    renderChoiceAnswers(track);
  }
}

function renderChoiceAnswers(track) {
  const neededCount = getAnswerCount() - 1;
  const decoys = pickDecoys(track, neededCount);
  const options = shuffle([track, ...decoys]);

  el.answersGrid.innerHTML = '';
  options.forEach((opt) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'answer-btn';
    btn.dataset.title = opt.title;

    const titleSpan = document.createElement('span');
    titleSpan.textContent = getDisplayTitle(opt);
    btn.appendChild(titleSpan);

    if (handicapShowGameLabel) {
      const gameSpan = document.createElement('span');
      gameSpan.className = 'answer-game-label';
      gameSpan.textContent = getGameDisplayName(opt.game);
      btn.appendChild(gameSpan);
    }

    btn.addEventListener('click', () => onTitleChosen(opt.title));
    el.answersGrid.appendChild(btn);
  });
}

function getUniqueTitledTracks() {
  const seen = new Set();
  const result = [];
  currentPool.forEach((t) => {
    if (seen.has(t.title)) return;
    seen.add(t.title);
    result.push(t);
  });
  return result;
}

function renderTextAnswer() {
  el.answerTextInput.value = '';
  el.answerTextInput.disabled = false;
  updateTextSuggestions('');
  el.answerTextInput.focus();
}

function updateTextSuggestions(query) {
  const q = query.trim().toLowerCase();
  const matches = getUniqueTitledTracks()
    .filter((track) => !q || getDisplayTitle(track).toLowerCase().includes(q))
    .sort((a, b) => getDisplayTitle(a).localeCompare(getDisplayTitle(b)))
    .slice(0, 40);

  el.answerSuggestions.innerHTML = '';
  matches.forEach((track) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'suggestion-btn';
    btn.dataset.title = track.title;

    const titleSpan = document.createElement('span');
    titleSpan.textContent = getDisplayTitle(track);
    btn.appendChild(titleSpan);

    if (handicapShowGameLabel) {
      const gameSpan = document.createElement('span');
      gameSpan.className = 'answer-game-label';
      gameSpan.textContent = getGameDisplayName(track.game);
      btn.appendChild(gameSpan);
    }

    btn.addEventListener('click', () => onTitleChosen(track.title));
    el.answerSuggestions.appendChild(btn);
  });
}

el.answerTextInput.addEventListener('input', () => {
  updateTextSuggestions(el.answerTextInput.value);
});

el.answerTextInput.addEventListener('keydown', (e) => {
  if (e.key !== 'Enter') return;
  /* Submit the first suggestion currently shown for the typed query, instead
     of requiring an exact character-for-character match. */
  const firstBtn = el.answerSuggestions.querySelector('.suggestion-btn');
  if (firstBtn) onTitleChosen(firstBtn.dataset.title);
});

function onTitleChosen(title) {
  if (answerLocked) return;

  if (usesGameStep()) {
    pendingTitle = title;
    renderGameAnswer();
    return;
  }

  const impliedGame = guessGameMode ? Array.from(selectedGames)[0] : null;
  if (mpActive) mpSubmitAnswer(title, impliedGame);
  else revealAnswer(title, impliedGame);
}

function renderGameAnswer() {
  el.answersGrid.hidden = true;
  el.textAnswer.hidden = true;
  el.gameAnswer.hidden = false;

  el.gameAnswersGrid.innerHTML = '';
  Array.from(selectedGames).forEach((gameId) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'answer-btn';
    btn.dataset.game = gameId;
    btn.textContent = getGameDisplayName(gameId);
    btn.addEventListener('click', () => {
      if (mpActive) mpSubmitAnswer(pendingTitle, gameId);
      else revealAnswer(pendingTitle, gameId);
    });
    el.gameAnswersGrid.appendChild(btn);
  });
}

function resetTimerBar(remainingMs, elapsedMs) {
  const total = remainingMs + elapsedMs;
  const startPercent = total > 0 ? Math.max(0, Math.min(100, 100 - (elapsedMs / total) * 100)) : 100;
  el.hpFill.classList.remove('warning', 'critical');
  el.hpFill.style.transition = 'none';
  el.hpFill.style.width = `${startPercent}%`;
  void el.hpFill.offsetWidth;
  el.hpFill.style.transition = `width ${remainingMs / 1000}s linear, background-color 0.3s ease`;
  el.hpFill.style.width = '0%';
}

function clearTimers() {
  clearTimeout(roundTimeoutId);
  clearTimeout(warningTimeoutId);
  clearTimeout(criticalTimeoutId);
  clearTimeout(revealAdvanceTimeoutId);
  stopChallengeClip();
  stopFadeOut();
}

/* ---------- Fade the volume out smoothly instead of cutting the music abruptly ---------- */

function stopFadeOut() {
  if (fadeOutIntervalId) {
    clearInterval(fadeOutIntervalId);
    fadeOutIntervalId = null;
    if (player && typeof player.setVolume === 'function') {
      player.setVolume(currentVolume);
    }
  }
}

function fadeOutAndPause(durationMs = 200) {
  if (!player || typeof player.setVolume !== 'function' || typeof player.pauseVideo !== 'function') return;
  stopFadeOut();

  const steps = 14;
  const stepTime = durationMs / steps;
  const startVolume = currentVolume;
  let step = 0;

  fadeOutIntervalId = setInterval(() => {
    step++;
    const vol = Math.max(0, Math.round(startVolume * (1 - step / steps)));
    player.setVolume(vol);
    if (step >= steps) {
      clearInterval(fadeOutIntervalId);
      fadeOutIntervalId = null;
      player.pauseVideo();
      player.setVolume(startVolume);
    }
  }, stepTime);
}

/* ---------- Challenge mode: play a 1-second clip from the middle of the track ---------- */

function stopChallengeClip() {
  clearInterval(challengeDurationCheckId);
  clearTimeout(challengeClipStopId);
  challengeDurationCheckId = null;
  challengeClipStopId = null;
}

function playChallengeClip(track) {
  stopChallengeClip();
  if (!isMuted) player.unMute?.();
  player.loadVideoById({ videoId: track.id, startSeconds: 0 });

  challengeDurationCheckId = setInterval(() => {
    const duration = typeof player.getDuration === 'function' ? player.getDuration() : 0;
    if (!duration) return;
    clearInterval(challengeDurationCheckId);
    challengeDurationCheckId = null;

    const midpoint = duration > 4 ? duration / 2 : 0;
    player.seekTo(midpoint, true);
    player.playVideo();
    challengeClipStopId = setTimeout(() => {
      if (player && typeof player.pauseVideo === 'function') player.pauseVideo();
    }, CHALLENGE_CLIP_MS);
  }, 100);
}

el.replayClipBtn.addEventListener('click', () => {
  if (answerLocked) return;
  const track = playlist[currentIndex];
  if (track) playChallengeClip(track);
});

function revealAnswer(selectedTitle, selectedGameId) {
  if (answerLocked) return;
  answerLocked = true;
  clearTimers();

  const track = playlist[currentIndex];
  const titleCorrect = selectedTitle === track.title;
  const gameCorrect = !guessGameMode || selectedGameId === track.game;
  let pointsEarned = 0;
  if (titleCorrect && gameCorrect) {
    score++;
    pointsEarned = Math.round(getPointsPerCorrectAnswer() * getSpeedFactor());
    totalPoints += pointsEarned;
  }
  roundAnswered = true;
  saveGameState();
  updateLiveScore();

  const noAnswerGiven = selectedTitle === null;

  function markButtons(buttons, correctValue, selectedValue, dataKey) {
    buttons.forEach((btn) => {
      btn.disabled = true;
      if (btn.dataset[dataKey] === correctValue) {
        btn.classList.add('correct');
      } else if (noAnswerGiven || btn.dataset[dataKey] === selectedValue) {
        /* No answer given: mark every other option red too, so it's clear
           the correct one being shown wasn't picked and earned no points. */
        btn.classList.add('wrong');
      }
    });
  }

  if (writeTitleMode) {
    el.textAnswer.hidden = false;
    el.answersGrid.hidden = true;
    el.answerTextInput.disabled = true;
    markButtons(el.answerSuggestions.querySelectorAll('.suggestion-btn'), track.title, selectedTitle, 'title');
  } else {
    el.answersGrid.hidden = false;
    el.textAnswer.hidden = true;
    markButtons(el.answersGrid.querySelectorAll('.answer-btn'), track.title, selectedTitle, 'title');
  }

  if (usesGameStep() && el.gameAnswersGrid.children.length > 0) {
    el.gameAnswer.hidden = false;
    markButtons(el.gameAnswersGrid.querySelectorAll('.answer-btn'), track.game, selectedGameId, 'game');
  } else {
    el.gameAnswer.hidden = true;
  }

  if (titleCorrect && gameCorrect) {
    el.revealMessage.textContent = t('reveal_correct', { points: pointsEarned });
    el.revealMessage.className = 'reveal-message correct';
    playSfx(sfxCorrect);
  } else if (noAnswerGiven) {
    el.revealMessage.textContent = t('reveal_timeout');
    el.revealMessage.className = 'reveal-message wrong';
    playSfx(sfxWrong);
  } else {
    el.revealMessage.textContent = t('reveal_wrong');
    el.revealMessage.className = 'reveal-message wrong';
    playSfx(sfxWrong);
  }
  el.revealMessage.hidden = false;

  if (writeTitleMode && !(titleCorrect && gameCorrect)) {
    el.revealCorrectTitle.textContent = getDisplayTitle(track);
    el.revealCorrectTitle.hidden = false;
  } else {
    el.revealCorrectTitle.hidden = true;
  }

  fadeOutAndPause();
  el.replayClipBtn.hidden = true;

  revealAdvanceTimeoutId = setTimeout(() => {
    currentIndex++;
    roundStartTime = 0;
    roundAnswered = false;
    saveGameState();
    if (currentIndex >= playlist.length) {
      finishGame();
      return;
    }
    if (pauseRequested) {
      pauseRequested = false;
      isPaused = true;
      el.progressLabel.textContent = t('live_track', { index: currentIndex + 1, total: playlist.length });
      el.pauseBtn.textContent = t('btn_resume');
      el.pauseBtn.classList.remove('queued');
      el.pauseBtn.classList.add('paused');
      el.answersGrid.hidden = true;
      el.pauseOverlay.hidden = false;
    } else {
      startRound();
    }
  }, REVEAL_PAUSE_MS);
}

/* ---------- Results screen ---------- */

function finishGame() {
  clearGameState();
  el.mpFinalLeaderboard.hidden = true;
  if (player && typeof player.stopVideo === 'function') {
    player.stopVideo();
  }
  el.finalScore.textContent = score;
  el.finalTotal.textContent = playlist.length;
  el.finalPoints.textContent = totalPoints;

  const ratio = score / playlist.length;
  let commentKey;
  if (ratio === 1) commentKey = 'result_perfect';
  else if (ratio >= 0.7) commentKey = 'result_great';
  else if (ratio >= 0.4) commentKey = 'result_ok';
  else commentKey = 'result_bad';
  el.scoreComment.textContent = t(commentKey);

  showScreen('results');
}

/* ---------- Multiplayer: WebSocket transport ---------- */

function mpConnect() {
  return new Promise((resolve, reject) => {
    if (mpSocket && mpSocket.readyState === WebSocket.OPEN) {
      resolve(mpSocket);
      return;
    }
    let settled = false;
    const ws = new WebSocket(MP_SERVER_URL);
    ws.addEventListener('open', () => {
      settled = true;
      mpSocket = ws;
      resolve(ws);
    });
    ws.addEventListener('error', () => {
      if (!settled) {
        settled = true;
        reject(new Error('mp_connect_failed'));
      }
    });
    ws.addEventListener('close', () => {
      if (mpSocket === ws) mpSocket = null;
      if (mpRoom) mpShowLobbyError(t('mp_err_disconnected'));
    });
    ws.addEventListener('message', (event) => {
      let msg;
      try {
        msg = JSON.parse(event.data);
      } catch (e) {
        return;
      }
      mpHandleMessage(msg);
    });
  });
}

function mpSend(payload) {
  if (mpSocket && mpSocket.readyState === WebSocket.OPEN) {
    mpSocket.send(JSON.stringify(payload));
  }
}

function mpHandleMessage(msg) {
  switch (msg.type) {
    case 'created':
      mpRoom = { code: msg.code, clientId: msg.clientId, hostId: msg.hostId };
      mpIsHost = true;
      mpShowLobby();
      break;
    case 'joined':
      mpRoom = { code: msg.code, clientId: msg.clientId, hostId: msg.hostId };
      mpIsHost = msg.hostId === msg.clientId;
      if (msg.started) {
        /* Joining a room whose game is already running: catch up directly
           instead of showing a lobby the player would never leave. */
        mpApplySettings(msg.settings);
        selectedGames = new Set(msg.selectedGames || []);
        playlist = (msg.trackIds || []).map((id) => allTracks.find((tr) => tr.id === id)).filter(Boolean);
        currentPool = getFilteredPool();
        currentIndex = -1;
        score = 0;
        totalPoints = 0;
        mpActive = true;
        beginMpGame();
      } else {
        if (Array.isArray(msg.selectedGames) && msg.selectedGames.length) {
          selectedGames = new Set(msg.selectedGames);
          el.gameMenu.querySelectorAll('.menu-option').forEach((btn) => {
            btn.classList.toggle('selected', selectedGames.has(btn.dataset.game));
          });
          updateTotalCount();
        }
        mpShowLobby();
      }
      break;
    case 'players':
      mpPlayers = msg.players || [];
      if (msg.hostId) mpRoom = mpRoom ? { ...mpRoom, hostId: msg.hostId } : mpRoom;
      mpRenderLobbyPlayers();
      break;
    case 'scoreboard':
      mpPlayers = msg.players || [];
      mpRenderLobbyPlayers();
      mpUpdateScoreboardUI();
      break;
    case 'error':
      mpShowLobbyError(t(`mp_err_${msg.message}`) !== `mp_err_${msg.message}` ? t(`mp_err_${msg.message}`) : msg.message);
      break;
    case 'gameStarting':
      mpApplySettings(msg.settings);
      selectedGames = new Set(msg.selectedGames || []);
      playlist = (msg.trackIds || []).map((id) => allTracks.find((tr) => tr.id === id)).filter(Boolean);
      currentPool = getFilteredPool();
      currentIndex = -1;
      score = 0;
      totalPoints = 0;
      mpActive = true;
      beginMpGame();
      break;
    case 'round':
      mpHandleRound(msg);
      break;
    case 'reveal':
      mpHandleReveal(msg);
      break;
    case 'gameOver':
      mpPlayers = msg.players || mpPlayers;
      mpHandleGameOver();
      break;
    default:
      break;
  }
}

/* ---------- Multiplayer: lobby UI ---------- */

function mpShowJoinCreateForm() {
  el.mpJoinCreate.hidden = false;
  el.mpLobby.hidden = true;
}

function mpShowLobby() {
  el.mpError.textContent = '';
  el.mpJoinCreate.hidden = true;
  el.mpLobby.hidden = false;
  el.mpRoomCodeDisplay.textContent = mpRoom ? mpRoom.code : '';
  el.mpStartBtn.hidden = !mpIsHost;
  el.mpWaitingNote.hidden = mpIsHost;
  mpRenderLobbyPlayers();
}

function mpRenderLobbyPlayers() {
  el.mpPlayerList.innerHTML = '';
  mpPlayers.forEach((p) => {
    const li = document.createElement('li');
    li.className = 'mp-player-item';
    if (mpRoom && p.id === mpRoom.hostId) li.classList.add('host');
    if (p.connected === false) li.classList.add('offline');
    li.textContent = p.name;
    el.mpPlayerList.appendChild(li);
  });
}

function mpShowLobbyError(message) {
  el.mpError.textContent = message;
}

el.mpCreateBtn.addEventListener('click', async () => {
  mpShowLobbyError('');
  const name = el.mpNameInput.value.trim() || 'Player';
  try {
    await mpConnect();
    mpSend({ type: 'create', name, clientId: mpClientId });
  } catch (e) {
    mpShowLobbyError(t('mp_err_connect'));
  }
});

el.mpJoinBtn.addEventListener('click', async () => {
  mpShowLobbyError('');
  const name = el.mpNameInput.value.trim() || 'Player';
  const code = el.mpCodeInput.value.trim().toUpperCase();
  if (!code) {
    mpShowLobbyError(t('mp_err_enter_code'));
    return;
  }
  try {
    await mpConnect();
    mpSend({ type: 'join', code, name, clientId: mpClientId });
  } catch (e) {
    mpShowLobbyError(t('mp_err_connect'));
  }
});

el.mpStartBtn.addEventListener('click', () => {
  if (!mpIsHost) return;
  if (!preparePlaylist()) return;
  mpSend({
    type: 'startGame',
    trackIds: playlist.map((tr) => tr.id),
    selectedGames: Array.from(selectedGames),
    settings: {
      durationMs: getRoundDurationMs(),
      answerCount: getAnswerCount(),
      writeTitleMode,
      guessGameMode,
      handicapShowGameLabel,
      handicapGameHint,
      clipChallenge,
      revealPauseMs: REVEAL_PAUSE_MS,
    },
  });
});

el.mpLeaveBtn.addEventListener('click', () => {
  mpSend({ type: 'leave' });
  if (mpSocket) {
    mpSocket.close();
    mpSocket = null;
  }
  mpRoom = null;
  mpIsHost = false;
  mpPlayers = [];
  mpShowJoinCreateForm();
});

function mpLeaveRoom() {
  mpSend({ type: 'leave' });
  if (mpSocket) {
    mpSocket.close();
    mpSocket = null;
  }
  mpActive = false;
  mpRoom = null;
  mpIsHost = false;
  mpPlayers = [];
  mpSetScoreboardVisible(false);
  el.pauseBtn.hidden = false;
  mpRestorePreGameModifiers();
  mpShowJoinCreateForm();
}

/* ---------- Multiplayer: in-game round driver (server-timed, everyone in sync) ---------- */

let mpSettings = {};
let mpPreGameModifiers = null;

function mpApplySettings(settings) {
  const s = settings || {};

  /* Remember this client's own modifier state (and game selection) from
     before the host's settings are applied, so it can be restored once the
     multiplayer game ends instead of silently corrupting the next solo game. */
  mpPreGameModifiers = {
    writeTitleMode, guessGameMode, handicapShowGameLabel, handicapGameHint,
    clipChallenge, answerCountOverride, timeChallenge,
    selectedGames: new Set(selectedGames),
  };

  writeTitleMode = !!s.writeTitleMode;
  guessGameMode = !!s.guessGameMode;
  handicapShowGameLabel = !!s.handicapShowGameLabel;
  handicapGameHint = !!s.handicapGameHint;
  clipChallenge = !!s.clipChallenge;
  answerCountOverride = s.answerCount && s.answerCount !== 4 ? s.answerCount : null;
  timeChallenge = null; // duration is taken directly from settings.durationMs in mpHandleRound
  mpSettings = s;
}

function mpRestorePreGameModifiers() {
  if (!mpPreGameModifiers) return;
  ({ writeTitleMode, guessGameMode, handicapShowGameLabel, handicapGameHint, clipChallenge, answerCountOverride, timeChallenge } = mpPreGameModifiers);
  selectedGames = new Set(mpPreGameModifiers.selectedGames);
  el.gameMenu.querySelectorAll('.menu-option').forEach((btn) => {
    btn.classList.toggle('selected', selectedGames.has(btn.dataset.game));
  });
  updateTotalCount();
  mpPreGameModifiers = null;
}

async function beginMpGame() {
  pauseRequested = false;
  isPaused = false;
  el.pauseBtn.hidden = true;
  el.pauseOverlay.hidden = true;
  el.answersGrid.hidden = false;
  el.textAnswer.hidden = true;
  el.gameAnswer.hidden = true;
  await ensureYouTubeReady();
  showScreen('game');
  mpSetScoreboardVisible(true);
  mpUpdateScoreboardUI();
}

function mpSetScoreboardVisible(visible) {
  el.mpScoreboardPanel.hidden = !visible;
}

function mpHandleRound(msg) {
  clearTimers();
  answerLocked = false;
  mpAnsweredCorrect = false;
  mpAnsweredPoints = 0;
  currentIndex = msg.index;
  const track = playlist[currentIndex];
  if (!track) return;

  roundStartTime = msg.startTime;
  el.progressLabel.textContent = t('live_track', { index: currentIndex + 1, total: msg.total || playlist.length });
  mpUpdateScoreboardUI();

  el.gameHint.hidden = !handicapGameHint;
  if (handicapGameHint) {
    el.gameHint.textContent = t('game_hint', { game: getGameDisplayName(track.game) });
  }

  el.revealMessage.hidden = true;
  el.revealCorrectTitle.hidden = true;
  el.answersGrid.hidden = false;
  el.textAnswer.hidden = true;
  el.gameAnswer.hidden = true;

  renderAnswers(track);

  const duration = msg.durationMs || 15000;
  const elapsed = Math.max(0, Date.now() - msg.startTime);
  const remaining = Math.max(0, duration - elapsed);
  resetTimerBar(remaining, elapsed);

  el.replayClipBtn.hidden = !clipChallenge;
  if (clipChallenge) {
    playChallengeClip(track);
  } else {
    player.loadVideoById({ videoId: track.id, startSeconds: 0 });
    player.playVideo();
    if (!isMuted) player.unMute?.();
  }
}

function mpSubmitAnswer(selectedTitle, selectedGameId) {
  if (answerLocked) return;
  answerLocked = true;

  const track = playlist[currentIndex];
  const titleCorrect = selectedTitle === track.title;
  const gameCorrect = !guessGameMode || selectedGameId === track.game;
  const correct = titleCorrect && gameCorrect;
  let pointsEarned = 0;
  if (correct) {
    pointsEarned = Math.round(getPointsPerCorrectAnswer() * getSpeedFactor());
  }
  mpAnsweredCorrect = correct;
  mpAnsweredPoints = pointsEarned;

  mpSend({ type: 'answer', index: currentIndex, correct, points: pointsEarned });

  function markSelected(buttons, dataKey) {
    buttons.forEach((btn) => {
      btn.disabled = true;
      if (btn.dataset[dataKey] === (dataKey === 'title' ? selectedTitle : selectedGameId)) {
        btn.classList.add('mp-selected');
      }
    });
  }

  if (writeTitleMode) {
    el.answerTextInput.disabled = true;
    markSelected(el.answerSuggestions.querySelectorAll('.suggestion-btn'), 'title');
  } else {
    markSelected(el.answersGrid.querySelectorAll('.answer-btn'), 'title');
  }
  if (usesGameStep() && el.gameAnswersGrid.children.length > 0) {
    markSelected(el.gameAnswersGrid.querySelectorAll('.answer-btn'), 'game');
  }

  el.revealMessage.textContent = t('mp_waiting_others');
  el.revealMessage.className = 'reveal-message';
  el.revealMessage.hidden = false;
}

function mpHandleReveal(msg) {
  const wasAnswered = answerLocked;
  answerLocked = true;
  clearTimers();

  const track = playlist[msg.index];
  if (!track) return;

  function markButtons(buttons, correctValue, dataKey) {
    buttons.forEach((btn) => {
      btn.disabled = true;
      if (btn.dataset[dataKey] === correctValue) {
        btn.classList.add('correct');
      } else if (btn.classList.contains('mp-selected')) {
        btn.classList.add('wrong');
      }
    });
  }

  if (writeTitleMode) {
    el.answerTextInput.disabled = true;
    markButtons(el.answerSuggestions.querySelectorAll('.suggestion-btn'), track.title, 'title');
  } else {
    markButtons(el.answersGrid.querySelectorAll('.answer-btn'), track.title, 'title');
  }
  if (usesGameStep() && el.gameAnswersGrid.children.length > 0) {
    el.gameAnswer.hidden = false;
    markButtons(el.gameAnswersGrid.querySelectorAll('.answer-btn'), track.game, 'game');
  }

  if (!wasAnswered) {
    el.revealMessage.textContent = t('reveal_timeout');
    el.revealMessage.className = 'reveal-message wrong';
    playSfx(sfxWrong);
  } else if (mpAnsweredCorrect) {
    el.revealMessage.textContent = t('reveal_correct', { points: mpAnsweredPoints });
    el.revealMessage.className = 'reveal-message correct';
    playSfx(sfxCorrect);
  } else {
    el.revealMessage.textContent = t('reveal_wrong');
    el.revealMessage.className = 'reveal-message wrong';
    playSfx(sfxWrong);
  }
  el.revealMessage.hidden = false;

  if (writeTitleMode && !(wasAnswered && mpAnsweredCorrect)) {
    el.revealCorrectTitle.textContent = getDisplayTitle(track);
    el.revealCorrectTitle.hidden = false;
  } else {
    el.revealCorrectTitle.hidden = true;
  }

  fadeOutAndPause();
  el.replayClipBtn.hidden = true;
}

function mpUpdateScoreboardUI() {
  el.mpScoreboardList.innerHTML = '';
  const sorted = mpPlayers.slice().sort((a, b) => b.points - a.points);
  sorted.forEach((p, i) => {
    const li = document.createElement('li');
    li.className = 'mp-scoreboard-item';
    if (mpRoom && p.id === mpRoom.clientId) li.classList.add('me');
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

    li.appendChild(rank);
    li.appendChild(name);
    li.appendChild(pts);
    el.mpScoreboardList.appendChild(li);
  });
}

function mpRenderFinalLeaderboard() {
  el.mpFinalLeaderboard.hidden = false;
  el.mpFinalScoreboardList.innerHTML = '';
  const sorted = mpPlayers.slice().sort((a, b) => b.points - a.points);
  sorted.forEach((p, i) => {
    const li = document.createElement('li');
    li.className = 'mp-scoreboard-item';
    if (mpRoom && p.id === mpRoom.clientId) li.classList.add('me');

    const rank = document.createElement('span');
    rank.className = 'mp-rank';
    rank.textContent = `#${i + 1}`;

    const name = document.createElement('span');
    name.className = 'mp-name';
    name.textContent = p.name;

    const pts = document.createElement('span');
    pts.className = 'mp-pts';
    pts.textContent = `${p.points} pts (${p.score})`;

    li.appendChild(rank);
    li.appendChild(name);
    li.appendChild(pts);
    el.mpFinalScoreboardList.appendChild(li);
  });
}

function mpHandleGameOver() {
  mpActive = false;
  mpRestorePreGameModifiers();
  const me = mpPlayers.find((p) => mpRoom && p.id === mpRoom.clientId);
  score = me ? me.score : 0;
  totalPoints = me ? me.points : 0;

  el.finalScore.textContent = score;
  el.finalTotal.textContent = playlist.length;
  el.finalPoints.textContent = totalPoints;

  const ratio = playlist.length ? score / playlist.length : 0;
  let commentKey;
  if (ratio === 1) commentKey = 'result_perfect';
  else if (ratio >= 0.7) commentKey = 'result_great';
  else if (ratio >= 0.4) commentKey = 'result_ok';
  else commentKey = 'result_bad';
  el.scoreComment.textContent = t(commentKey);

  mpRenderFinalLeaderboard();
  showScreen('results');
}
