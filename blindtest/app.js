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
let comboStreak = 0; // consecutive correct answers, resets on a wrong/timed-out answer
const COMBO_MAX = 5; // multiplier caps at x5 once the streak reaches 5 in a row
let challengeDurationCheckId = null;
let challengeClipStopId = null;
let pendingTitle = null;
let fadeOutIntervalId = null;

/* ---------- Multiplayer (realtime sync via WebSocket server) ---------- */

const MP_SERVER_URL = (() => {
  /* Testing against a local server: ?mpserver=ws://localhost:3000 (localhost only) */
  try {
    const override = new URLSearchParams(location.search).get('mpserver');
    if (override && /^ws:\/\/(localhost|127\.0\.0\.1)(:\d+)?\/?$/.test(override)) return override;
  } catch (e) { /* ignore */ }
  return 'wss://retex4k.onrender.com';
})();
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
let mpPaused = false;
let mpSyncMode = false;
let mpAnsweredCorrect = false;
let mpAnsweredPoints = 0;

/* ---------- Défi / Handicap modifiers ---------- */

let clipChallenge = false; // 1-second clip from the middle of the track
let timeChallenge = null; // null | 'time30' | 'time25' | 'time20' | 'time10' | 'time5' | 'time3'
let answerCountOverride = null; // null | 6 | 8 | 10 | 3 | 2 (shared radio across Défi and Handicap)
let writeTitleMode = false; // type the answer instead of picking among choices (every mode)
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
    label_ui_lang: 'Site language',
    label_track_lang: 'Answer language',
    label_game: 'Games',
    label_category: 'Category',
    category_soon: '(soon)',
    games_selected: '{count} selected',
    btn_clear_selection: 'Clear',
    btn_select_all_games: 'Select all',
    label_track_count: 'Number of tracks',
    btn_select_all: 'Select all',
    mode_all: 'All tracks',
    mode_custom: 'Custom number:',
    btn_start: 'START',
    heading_rules: 'Rules',
    label_answer_time: 'Answer time',
    label_choices: 'Choices',
    label_duration: 'Duration',
    duration_full: 'Full',
    duration_1s: '1 second',
    tip_clip_off_music: 'The track plays for the whole round.',
    tip_clip_on_music: 'You only hear 1 second of the track (from the middle). You can replay it.',
    tip_clip_off_image: 'The picture stays on screen for the whole round.',
    tip_clip_on_image: 'The picture only shows for 1 second, then disappears.',
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
      '<b>Community project</b>, not affiliated with <b>Nintendo</b>, <b>Toby Fox</b>, or any other\n  rights holder. Music belongs to its respective creators.',
    err_select_game: 'Select at least one game.',
    err_min_tracks: 'At least {count} tracks must be available for this selection.',
    err_only_n_tracks: 'Only {count} tracks are available for this selection.',
    err_valid_number: 'Choose a valid number of tracks.',
    err_load_tracks: 'Unable to load tracks.json.',
    time_estimate: 'Estimated time: {range}',
    score_points_note: 'Up to {points} pts per correct answer (faster = more)',
    tip_points_bonus: '{sign}{percent}% points',
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
    label_no_games_match: 'No game matches this search.',
    placeholder_game_search: 'Search: game, console, year, company...',
    heading_mode: 'Mode',
    mode_tab_quiz: 'Quiz',
    mode_tab_image: 'Image',
    mode_tab_draw: 'Drawing',
    tag_soon: 'soon',
    quiz_theme_music: 'Music',
    quiz_theme_describe: 'Description',
    subject_random: 'Random',
    tip_theme_random: 'Every round picks at random between a track and a description.',
    tip_subject_random: 'Every round picks at random: track, screenshot, location, character or item.',
    desc_quiz_random: 'Every round changes at random: a track to recognize or a description to identify.',
    desc_image_random: 'Every round changes at random: track, screenshot, location, character or item.',
    tip_theme_describe: 'A text describes a character, an item, a place or a game: find what it is.',
    desc_quiz_describe: 'Read the description and find what it describes.',
    describe_kind_game: 'Game',
    quiz_theme_questions: 'Questions',
    label_image_subject: 'To guess',
    image_subject_music: 'Music',
    image_subject_character: 'Character',
    image_subject_object: 'Object',
    label_image_effect: 'Effect',
    label_image_answer: 'Answer',
    submode_normal: 'Normal',
    desc_quiz_music: 'Listen to a clip and find the title of the track.',
    desc_image_music: 'Listen to the track and pick the image that goes with it.',
    desc_image_location: 'A location appears: find its name.',
    desc_image_screenshot: 'A screenshot appears: find what it shows.',
    desc_draw: 'Draw a subject, then guess what the other players drew. Multiplayer (or solo practice).',
    label_draw_who: 'Who draws',
    paint_tool_brush: 'Brush',
    paint_tool_eraser: 'Eraser',
    paint_tool_bucket: 'Paint bucket',
    paint_tool_wand: 'Magic wand (Shift = add, Alt = remove)',
    paint_tool_picker: 'Eyedropper (or Alt+click)',
    paint_tool_line: 'Line (Shift = 45°)',
    paint_tool_rect: 'Rectangle (Shift = square)',
    paint_tool_ellipse: 'Ellipse (Shift = circle)',
    paint_undo: 'Undo',
    paint_redo: 'Redo',
    paint_color: 'Pick any color',
    paint_size: 'Size',
    paint_opacity: 'Opacity',
    paint_tolerance: 'Tolerance',
    paint_layer_opacity: 'Layer opacity',
    paint_size_tip: 'Mouse wheel on the canvas, or [ and ]',
    paint_opacity_tip: 'Shift + mouse wheel on the canvas',
    paint_sample_all: 'All layers',
    paint_fill_shapes: 'Filled',
    paint_layers: 'Layers',
    paint_layer: 'Layer',
    paint_layer_add: 'New layer',
    paint_layer_duplicate: 'Duplicate layer',
    paint_layer_delete: 'Delete layer',
    paint_layer_up: 'Move up',
    paint_layer_down: 'Move down',
    paint_layer_visibility: 'Show / hide',
    paint_selection: 'Selection',
    paint_select_all: 'Select all',
    paint_deselect: 'Deselect',
    paint_invert: 'Invert',
    paint_clear_selection: 'Erase',
    paint_fill_selection: 'Fill',
    paint_clear_layer: 'Clear layer',
    paint_key_delete: 'Delete key',
    label_draw_game: 'Game',
    draw_game_guess: 'Guessing',
    draw_game_contest: 'Contest',
    tip_draw_game_guess: 'You draw so that the others find what it is.',
    tip_draw_game_contest: 'Everybody draws the same subject (chosen by one player in turn), then everybody votes for the best drawing. Each vote earns 50 points.',
    draw_phase_vote: 'Vote!',
    draw_pick_for_everyone: 'Choose what EVERYONE will draw:',
    draw_pick_free_everyone: 'Choose freely what EVERYONE will draw.',
    draw_is_choosing_subject: '{name} is choosing what everyone will draw...',
    draw_vote_text: 'Vote for the best drawing of: {subject}',
    draw_vote_done: 'Vote saved! Waiting for the others...',
    draw_your_drawing: 'Your drawing',
    draw_votes: '{count} vote(s)',
    draw_who_all: 'Everyone',
    draw_who_one: 'One at a time',
    tip_draw_who_all: 'Everyone draws at the same time, then each player guesses another player\'s drawing.',
    tip_draw_who_one: 'One player draws (the others watch live), then everyone else guesses. Players take turns.',
    label_draw_subject: 'Subject',
    draw_subject_random: 'Random',
    draw_subject_free: 'Free',
    tip_draw_subject_random: 'You pick 1 of 4 random subjects (with a reference picture) from the selected games.',
    tip_draw_subject_free: 'You draw whatever you want and write the answer yourself (plus 3 wrong answers for the choices).',
    draw_kind_all: 'All',
    label_draw_time: 'Draw time',
    label_draw_rounds: 'Rounds',
    draw_free_subject_label: 'What will you draw?',
    draw_free_wrong_label: '3 wrong answers (shown as choices)',
    btn_draw_confirm: 'CONFIRM',
    draw_trace: 'Trace',
    draw_reference: 'Reference',
    tip_draw_reference: 'Shows the picture of what you draw in a corner. When the others find your drawing, you earn 30% fewer points.',
    draw_used_reference: 'with reference',
    tip_draw_trace: 'Shows the picture see-through under your drawing so you can trace it. When the others find your drawing, you earn 60% fewer points.',
    btn_draw_done: 'DONE',
    draw_validate_title: 'Validate the answers to your drawing',
    btn_draw_again: 'NEW DRAWING',
    btn_draw_back: 'BACK',
    draw_round: 'Round {index} / {total}',
    draw_phase_pick: 'Choose what to draw',
    draw_phase_draw: 'Draw!',
    draw_phase_guess: 'Guess!',
    draw_phase_reveal: 'Results',
    draw_pick_random: 'Pick what you will draw:',
    draw_pick_free: 'Choose freely what you will draw.',
    draw_you_draw: 'You draw:',
    draw_is_drawing: '{name} is drawing...',
    draw_is_picking: '{name} is choosing what to draw...',
    draw_players_picking: 'Players are choosing what to draw...',
    draw_wait_others: 'Waiting for the other players...',
    draw_wait_guessers: 'The others are guessing your drawing...',
    draw_starting: 'The game is starting...',
    draw_guess_label: '{name}\'s drawing',
    draw_guess_label_kind: '{name}\'s drawing: it\'s a {kind}',
    draw_answer_pending: 'Waiting for {name} to validate your answer...',
    draw_answer_correct: 'Correct! +{points} pts',
    draw_answer_wrong: 'Wrong! It was: {answer}',
    draw_found_by: 'Found by: {names}',
    draw_found_by_nobody: 'Nobody found it',
    draw_traced: 'traced',
    draw_end_title: 'Final ranking',
    draw_practice_end: 'Your drawing',
    draw_practice_reference: 'Reference',
    draw_no_subjects: 'No subjects available: select games that have pictures (characters, items, places).',
    mp_err_draw_no_subjects: 'No subjects available: select games that have pictures (characters, items, places).',
    draw_confirm: 'Correct',
    draw_reject: 'Wrong',
    draw_start_practice: 'PRACTICE (SOLO)',
    tip_mode_quiz: 'Answer with text: find the title of a track from a clip (trivia questions coming soon).',
    tip_mode_image: 'Guess from pictures: pick the image that matches a track, or name a screenshot, location, character or object.',
    tip_mode_draw: 'Multiplayer: each player draws a word, then guesses another player\'s drawing. Coming soon.',
    tip_theme_music: 'A clip of a track plays: find its title.',
    tip_theme_questions: 'Trivia questions about the games. Coming soon.',
    tip_subject_music: 'A track plays: pick the image that goes with it.',
    tip_subject_location: 'A place from the game is shown: find its name.',
    tip_subject_screenshot: 'A screenshot from the game is shown: find what it shows.',
    tip_subject_character: 'A character from the game is shown: find their name.',
    tip_subject_object: 'An item from the game is shown: find its name.',
    tip_effect_normal: 'The image is shown as is, from the start.',
    tip_effect_pixel: 'The image starts as big pixels and gets sharper over time.',
    tip_effect_zoom: 'The image starts zoomed in on a detail and zooms out over time.',
    tip_answer_choice: 'Pick the answer among several choices (4 by default, change it in Challenge / Handicap).',
    tip_answer_text: 'Type the answer; suggestions appear as you type.',
    guess_style_choice_n: '{count} choices',
    desc_image_character: 'A character appears: find their name.',
    desc_image_object: 'An item appears: find its name.',
    note_visual_needs_images: 'Not enough tracks with an image yet for this selection.',
    note_guess_needs_images: 'Not enough pictures yet for this selection.',
    submode_music: 'Music',
    submode_pixel: 'Pixelated',
    submode_zoom: 'Zoom out',
    guess_kind_cover: 'Screenshot',
    guess_kind_location: 'Location',
    guess_style_text: 'Type answer',
    guess_style_choice: '4 choices',
    placeholder_guess_answer: 'Type your answer...',
    category_games: 'Video games',
    category_anime: 'Anime',
    category_tv: 'TV Series',
    category_cartoon: 'Cartoon',
    label_no_games_in_category: 'No games in this category yet.',
    combo_label: 'Combo x{streak} ({multiplier}x pts)',
    btn_mp_resume_session: 'RESUME GAME',
    label_mp_sync: 'Sync mode',
    note_mp_sync: 'Auto-pauses for everyone if a player disconnects.',
    mp_sync_on: 'ON',
    mp_sync_off: 'OFF',
    mp_pause_sync_wait: '* Waiting for every player to be back...',
    mp_pause_manual: '* The host paused the game...',
  },
  fr: {
    title: 'BLIND TEST',
    label_ui_lang: 'Langue du site',
    label_track_lang: 'Langue des réponses',
    label_game: 'Jeux',
    label_category: 'Catégorie',
    category_soon: '(bientôt)',
    games_selected: '{count} sélectionné{plural}',
    btn_clear_selection: 'Tout retirer',
    btn_select_all_games: 'Tout sélectionner',
    label_track_count: 'Nombre de morceaux',
    btn_select_all: 'Tout sélectionner',
    mode_all: 'Tous les morceaux',
    mode_custom: 'Nombre personnalisé :',
    btn_start: 'DÉMARRER',
    heading_rules: 'Réglages',
    label_answer_time: 'Temps de réponse',
    label_choices: 'Choix',
    label_duration: 'Durée',
    duration_full: 'Complet',
    duration_1s: '1 seconde',
    tip_clip_off_music: 'La musique joue pendant toute la manche.',
    tip_clip_on_music: 'Tu n\'entends qu\'une seconde de la musique (prise au milieu). Tu peux la réécouter.',
    tip_clip_off_image: 'L\'image reste affichée pendant toute la manche.',
    tip_clip_on_image: 'L\'image n\'apparaît qu\'une seconde, puis disparaît.',
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
      '<b>Projet communautaire</b>, non affilié à <b>Nintendo</b>, <b>Toby Fox</b>, ni aucun autre\n  ayant droit. La musique appartient à ses créateurs respectifs.',
    err_select_game: 'Sélectionne au moins un jeu.',
    err_min_tracks: 'Il faut au moins {count} morceaux disponibles pour cette sélection.',
    err_only_n_tracks: 'Seulement {count} morceaux disponibles pour cette sélection.',
    err_valid_number: 'Choisis un nombre de morceaux valide.',
    err_load_tracks: 'Impossible de charger tracks.json.',
    time_estimate: 'Durée estimée : {range}',
    score_points_note: 'Jusqu\'à {points} pts par bonne réponse (plus rapide = plus de points)',
    tip_points_bonus: '{sign}{percent} % de points',
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
    label_no_games_match: 'Aucun jeu ne correspond à cette recherche.',
    placeholder_game_search: 'Rechercher : jeu, console, année, société...',
    heading_mode: 'Mode',
    mode_tab_quiz: 'Quiz',
    mode_tab_image: 'Image',
    mode_tab_draw: 'Dessin',
    tag_soon: 'bientôt',
    quiz_theme_music: 'Musique',
    quiz_theme_describe: 'Description',
    subject_random: 'Aléatoire',
    tip_theme_random: 'Chaque manche tire au hasard entre une musique et une description.',
    tip_subject_random: 'Chaque manche tire au hasard : musique, screenshot, lieu, personnage ou objet.',
    desc_quiz_random: 'Chaque manche change au hasard : une musique à reconnaître ou une description à identifier.',
    desc_image_random: 'Chaque manche change au hasard : musique, screenshot, lieu, personnage ou objet.',
    tip_theme_describe: 'Un texte décrit un personnage, un objet, un lieu ou un jeu : trouve de quoi il s\'agit.',
    desc_quiz_describe: 'Lis la description et trouve ce qu\'elle décrit.',
    describe_kind_game: 'Jeu',
    quiz_theme_questions: 'Questions',
    label_image_subject: 'À deviner',
    image_subject_music: 'Musique',
    image_subject_character: 'Personnage',
    image_subject_object: 'Objet',
    label_image_effect: 'Effet',
    label_image_answer: 'Réponse',
    submode_normal: 'Normal',
    desc_quiz_music: 'Écoute un extrait et trouve le titre de la musique.',
    desc_image_music: 'Écoute la musique et choisis l\'image qui lui correspond.',
    desc_image_location: 'Un lieu apparaît : trouve son nom.',
    desc_image_screenshot: 'Un screenshot apparaît : trouve ce qu\'il montre.',
    desc_draw: 'Dessine un sujet, puis devine ce que les autres joueurs ont dessiné. En multijoueur (ou entraînement solo).',
    label_draw_who: 'Qui dessine',
    paint_tool_brush: 'Pinceau',
    paint_tool_eraser: 'Gomme',
    paint_tool_bucket: 'Pot de peinture',
    paint_tool_wand: 'Baguette magique (Maj = ajouter, Alt = retirer)',
    paint_tool_picker: 'Pipette (ou Alt+clic)',
    paint_tool_line: 'Ligne (Maj = 45°)',
    paint_tool_rect: 'Rectangle (Maj = carré)',
    paint_tool_ellipse: 'Ellipse (Maj = cercle)',
    paint_undo: 'Annuler',
    paint_redo: 'Rétablir',
    paint_color: 'Choisir n\'importe quelle couleur',
    paint_size: 'Taille',
    paint_opacity: 'Opacité',
    paint_tolerance: 'Tolérance',
    paint_layer_opacity: 'Opacité du calque',
    paint_size_tip: 'Molette sur la feuille, ou [ et ]',
    paint_opacity_tip: 'Maj + molette sur la feuille',
    paint_sample_all: 'Tous les calques',
    paint_fill_shapes: 'Rempli',
    paint_layers: 'Calques',
    paint_layer: 'Calque',
    paint_layer_add: 'Nouveau calque',
    paint_layer_duplicate: 'Dupliquer le calque',
    paint_layer_delete: 'Supprimer le calque',
    paint_layer_up: 'Monter',
    paint_layer_down: 'Descendre',
    paint_layer_visibility: 'Afficher / masquer',
    paint_selection: 'Sélection',
    paint_select_all: 'Tout sélectionner',
    paint_deselect: 'Désélectionner',
    paint_invert: 'Inverser',
    paint_clear_selection: 'Effacer',
    paint_fill_selection: 'Remplir',
    paint_clear_layer: 'Vider le calque',
    paint_key_delete: 'Touche Suppr',
    label_draw_game: 'Jeu',
    draw_game_guess: 'Devinette',
    draw_game_contest: 'Concours',
    tip_draw_game_guess: 'Tu dessines pour que les autres trouvent ce que c\'est.',
    tip_draw_game_contest: 'Tout le monde dessine le même sujet (choisi par un joueur à tour de rôle), puis chacun vote pour le plus beau dessin. Chaque vote rapporte 50 points.',
    draw_phase_vote: 'Vote !',
    draw_pick_for_everyone: 'Choisis ce que TOUT LE MONDE va dessiner :',
    draw_pick_free_everyone: 'Choisis librement ce que TOUT LE MONDE va dessiner.',
    draw_is_choosing_subject: '{name} choisit ce que tout le monde va dessiner...',
    draw_vote_text: 'Vote pour le plus beau dessin de : {subject}',
    draw_vote_done: 'Vote enregistré ! En attente des autres...',
    draw_your_drawing: 'Ton dessin',
    draw_votes: '{count} vote(s)',
    draw_who_all: 'Tout le monde',
    draw_who_one: 'Un seul',
    tip_draw_who_all: 'Tout le monde dessine en même temps, puis chaque joueur devine le dessin d\'un autre joueur.',
    tip_draw_who_one: 'Un joueur dessine (les autres le voient en direct), puis tous les autres devinent. Chacun son tour.',
    label_draw_subject: 'Sujet',
    draw_subject_random: 'Aléatoire',
    draw_subject_free: 'Libre',
    tip_draw_subject_random: 'Tu choisis 1 sujet parmi 4 tirés au hasard (avec une image de référence) dans les jeux sélectionnés.',
    tip_draw_subject_free: 'Tu dessines ce que tu veux et tu écris toi-même la réponse (et 3 mauvaises réponses pour les choix).',
    draw_kind_all: 'Tout',
    label_draw_time: 'Temps',
    label_draw_rounds: 'Manches',
    draw_free_subject_label: 'Que vas-tu dessiner ?',
    draw_free_wrong_label: '3 mauvaises réponses (proposées dans les choix)',
    btn_draw_confirm: 'VALIDER',
    draw_trace: 'Calque',
    draw_reference: 'Référence',
    tip_draw_reference: 'Affiche l\'image de ce que tu dessines dans un coin. Quand les autres trouvent ton dessin, tu gagnes 30 % de points en moins.',
    draw_used_reference: 'avec référence',
    tip_draw_trace: 'Affiche l\'image en transparence sous ton dessin pour la décalquer. Quand les autres trouvent ton dessin, tu gagnes 60 % de points en moins.',
    btn_draw_done: 'TERMINÉ',
    draw_validate_title: 'Valide les réponses à ton dessin',
    btn_draw_again: 'NOUVEAU DESSIN',
    btn_draw_back: 'RETOUR',
    draw_round: 'Manche {index} / {total}',
    draw_phase_pick: 'Choisis quoi dessiner',
    draw_phase_draw: 'Dessine !',
    draw_phase_guess: 'Devine !',
    draw_phase_reveal: 'Résultats',
    draw_pick_random: 'Choisis ce que tu vas dessiner :',
    draw_pick_free: 'Choisis librement ce que tu vas dessiner.',
    draw_you_draw: 'Tu dessines :',
    draw_is_drawing: '{name} dessine...',
    draw_is_picking: '{name} choisit quoi dessiner...',
    draw_players_picking: 'Les joueurs choisissent quoi dessiner...',
    draw_wait_others: 'En attente des autres joueurs...',
    draw_wait_guessers: 'Les autres devinent ton dessin...',
    draw_starting: 'La partie commence...',
    draw_guess_label: 'Dessin de {name}',
    draw_guess_label_kind: 'Dessin de {name} : c\'est un {kind}',
    draw_answer_pending: 'En attente de la validation de {name}...',
    draw_answer_correct: 'Bravo ! +{points} pts',
    draw_answer_wrong: 'Raté ! C\'était : {answer}',
    draw_found_by: 'Trouvé par : {names}',
    draw_found_by_nobody: 'Personne n\'a trouvé',
    draw_traced: 'décalqué',
    draw_end_title: 'Classement final',
    draw_practice_end: 'Ton dessin',
    draw_practice_reference: 'Référence',
    draw_no_subjects: 'Aucun sujet disponible : sélectionne des jeux qui ont des images (personnages, objets, lieux).',
    mp_err_draw_no_subjects: 'Aucun sujet disponible : sélectionne des jeux qui ont des images (personnages, objets, lieux).',
    draw_confirm: 'Bon',
    draw_reject: 'Faux',
    draw_start_practice: 'S\'ENTRAÎNER (SOLO)',
    tip_mode_quiz: 'Réponds avec du texte : trouve le titre d\'une musique à partir d\'un extrait (questions de culture bientôt).',
    tip_mode_image: 'Devine avec des images : choisis l\'image qui va avec une musique, ou nomme un screenshot, un lieu, un personnage ou un objet.',
    tip_mode_draw: 'Multijoueur : chaque joueur dessine un mot, puis devine le dessin d\'un autre joueur. Bientôt disponible.',
    tip_theme_music: 'Un extrait de musique est joué : trouve son titre.',
    tip_theme_questions: 'Des questions de culture sur les jeux. Bientôt disponible.',
    tip_subject_music: 'Une musique est jouée : choisis l\'image qui lui correspond.',
    tip_subject_location: 'Un lieu du jeu est affiché : trouve son nom.',
    tip_subject_screenshot: 'Un screenshot du jeu est affiché : trouve ce qu\'il montre.',
    tip_subject_character: 'Un personnage du jeu est affiché : trouve son nom.',
    tip_subject_object: 'Un objet du jeu est affiché : trouve son nom.',
    tip_effect_normal: 'L\'image est affichée telle quelle dès le début.',
    tip_effect_pixel: 'L\'image commence en gros pixels et devient nette petit à petit.',
    tip_effect_zoom: 'L\'image commence zoomée sur un détail et se dézoome petit à petit.',
    tip_answer_choice: 'Choisis la réponse parmi plusieurs propositions (4 par défaut, modifiable dans Défi / Handicap).',
    tip_answer_text: 'Tape la réponse ; des suggestions apparaissent pendant que tu écris.',
    guess_style_choice_n: '{count} choix',
    desc_image_character: 'Un personnage apparaît : trouve son nom.',
    desc_image_object: 'Un objet apparaît : trouve son nom.',
    note_visual_needs_images: 'Pas encore assez de musiques avec image pour cette sélection.',
    note_guess_needs_images: 'Pas encore assez d\'images pour cette sélection.',
    submode_music: 'Musique',
    submode_pixel: 'Pixelisation',
    submode_zoom: 'Dézoom',
    guess_kind_cover: 'Screenshot',
    guess_kind_location: 'Lieu',
    guess_style_text: 'Écrire la réponse',
    guess_style_choice: '4 choix',
    placeholder_guess_answer: 'Écris ta réponse...',
    category_games: 'Jeux vidéo',
    category_anime: 'Anime',
    category_tv: 'Série TV',
    category_cartoon: 'Cartoon',
    label_no_games_in_category: 'Aucun jeu dans cette catégorie pour le moment.',
    combo_label: 'Combo x{streak} ({multiplier}x pts)',
    btn_mp_resume_session: 'REPRENDRE LA PARTIE',
    label_mp_sync: 'Mode sync',
    note_mp_sync: 'Met en pause pour tout le monde si un joueur se déconnecte.',
    mp_sync_on: 'ON',
    mp_sync_off: 'OFF',
    mp_pause_sync_wait: "* En attente que tous les joueurs soient de retour...",
    mp_pause_manual: "* L'hôte a mis la partie en pause...",
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

  document.querySelectorAll('[data-i18n-tip]').forEach((node) => {
    node.dataset.tip = t(node.dataset.i18nTip);
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
    draw: document.getElementById('screen-draw'),
  },
  totalCount: document.getElementById('total-count'),
  timeEstimate: document.getElementById('time-estimate'),
  scoreMultiplier: document.getElementById('score-multiplier'),
  scorePointsNote: document.getElementById('score-points-note'),
  mainTitle: document.getElementById('main-title'),
  gameMenu: document.getElementById('game-menu'),
  gameSearchInput: document.getElementById('game-search-input'),
  gameSelectionSummary: document.getElementById('game-selection-summary'),
  gameClearBtn: document.getElementById('game-clear-btn'),
  gameSelectAllBtn: document.getElementById('game-select-all-btn'),
  categorySelect: document.getElementById('category-select'),
  visualSubmodeRow: document.getElementById('visual-submode-row'),
  modeTabs: document.getElementById('mode-tabs'),
  quizOptions: document.getElementById('quiz-options'),
  drawOptions: document.getElementById('draw-options'),
  imageOptions: document.getElementById('image-options'),
  imageSubjectRow: document.getElementById('image-subject-row'),
  imageEffectRow: document.getElementById('image-effect-row'),
  modeDescription: document.getElementById('mode-description'),
  answerChoiceBtn: document.getElementById('answer-choice-btn'),
  answerStyleRow: document.getElementById('answer-style-row'),
  guessModeNote: document.getElementById('guess-mode-note'),
  guessPictureWrap: document.getElementById('guess-picture-wrap'),
  describeBox: document.getElementById('describe-box'),
  describeKind: document.getElementById('describe-kind'),
  describeText: document.getElementById('describe-text'),
  quizSubjectRow: document.querySelector('#quiz-options .mode-option-buttons'),
  clipRowWrap: document.getElementById('clip-row-wrap'),
  answerStyleRowWrap: document.getElementById('answer-style-row-wrap'),
  guessPictureCanvas: document.getElementById('guess-picture-canvas'),
  guessChoicesGrid: document.getElementById('guess-choices-grid'),
  guessTextAnswer: document.getElementById('guess-text-answer'),
  guessTextInput: document.getElementById('guess-text-input'),
  guessSuggestions: document.getElementById('guess-suggestions'),
  modeMenu: document.getElementById('mode-menu'),
  customCount: document.getElementById('custom-count'),
  clipRow: document.getElementById('clip-row'),
  timeOptions: document.getElementById('time-options'),
  countOptions: document.getElementById('count-options'),
  handicapMenu: document.getElementById('handicap-menu'),
  startBtn: document.getElementById('start-btn'),
  setupError: document.getElementById('setup-error'),
  progressLabel: document.getElementById('progress-label'),
  liveScore: document.getElementById('live-score'),
  livePoints: document.getElementById('live-points'),
  comboDisplay: document.getElementById('combo-display'),
  finalPoints: document.getElementById('final-points'),
  hpFill: document.getElementById('hp-fill'),
  gameHint: document.getElementById('game-hint'),
  revealMessage: document.getElementById('reveal-message'),
  revealCorrectTitle: document.getElementById('reveal-correct-title'),
  answersGrid: document.getElementById('answers-grid'),
  visualAnswersGrid: document.getElementById('visual-answers-grid'),
  visualModeNote: document.getElementById('visual-mode-note'),
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
  mpResumeSessionBtn: document.getElementById('mp-resume-session-btn'),
  mpSyncToggle: document.getElementById('mp-sync-toggle'),
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
let answerMode = 'text'; // 'text' (blind test, titles) | 'visual' (guess the matching screenshot)
let selectedGames = new Set();
let selectedCategory = 'games';
let visualSubMode = 'normal'; // 'normal' | 'pixel' | 'zoom' — sub-modes of BLIND IMAGE
let guessKind = 'screenshot'; // 'screenshot' | 'location' — sub-modes of "Guess the picture"
let guessPlaylist = [];
/* "Random" subject: every round of the game picks its own kind within a family.
   mixFamily is null outside that mode. */
let mixFamily = null; // null | 'quiz' | 'image'
let mixRounds = []; // [{ key, mode, kind, item }]
let mixPools = {}; // key -> pool used for that kind of round (decoys, suggestions)
let guessRevealIntervalId = null;

/* ---------- Game catalog: franchise / console / year metadata ---------- */
/* Add new entries here as more games are curated in tracks.json — the menu,
   franchise grouping and "select all" buttons are all generated from this list. */

const CATEGORIES = [
  { id: 'games', name: 'Video games' },
  { id: 'anime', name: 'Anime' },
  { id: 'tv', name: 'TV Series' },
  { id: 'cartoon', name: 'Cartoon' },
];

const FRANCHISES = [
  { id: 'zelda', category: 'games', name: 'The Legend of Zelda', company: 'Nintendo' },
  { id: 'undertale', category: 'games', name: 'Undertale / Deltarune', company: 'Toby Fox' },
];

const GAMES = [
  { id: 'zelda1', franchise: 'zelda', name: 'The Legend of Zelda', console: 'NES', year: 1986 },
  { id: 'alttp', franchise: 'zelda', name: 'A Link to the Past', console: 'SNES', year: 1991 },
  { id: 'oot', franchise: 'zelda', name: 'Ocarina of Time', console: 'N64', year: 1998 },
  { id: 'zelda2', franchise: 'zelda', name: 'Zelda II: The Adventure of Link', console: 'NES', year: 1987 },
  { id: 'la', franchise: 'zelda', name: "Link's Awakening", console: 'Game Boy', year: 1993 },
  { id: 'laswitch', franchise: 'zelda', name: "Link's Awakening (Switch remake)", console: 'Switch', year: 2019, developer: 'Grezzo' },
  { id: 'mm', franchise: 'zelda', name: "Majora's Mask", console: 'N64', year: 2000 },
  { id: 'ooa', franchise: 'zelda', name: 'Oracle of Ages', console: 'Game Boy Color', year: 2001, developer: 'Capcom, Flagship' },
  { id: 'oos', franchise: 'zelda', name: 'Oracle of Seasons', console: 'Game Boy Color', year: 2001, developer: 'Capcom, Flagship' },
  { id: 'fs', franchise: 'zelda', name: 'Four Swords', console: 'GBA', year: 2002, developer: 'Capcom, Flagship' },
  { id: 'ww', franchise: 'zelda', name: 'The Wind Waker', console: 'GameCube', year: 2003 },
  { id: 'fsa', franchise: 'zelda', name: 'Four Swords Adventures', console: 'GameCube', year: 2004 },
  { id: 'mc', franchise: 'zelda', name: 'The Minish Cap', console: 'GBA', year: 2004, developer: 'Capcom, Flagship' },
  { id: 'tp', franchise: 'zelda', name: 'Twilight Princess', console: 'GameCube / Wii', year: 2006 },
  { id: 'ph', franchise: 'zelda', name: 'Phantom Hourglass', console: 'DS', year: 2007 },
  { id: 'st', franchise: 'zelda', name: 'Spirit Tracks', console: 'DS', year: 2009 },
  { id: 'ss', franchise: 'zelda', name: 'Skyward Sword', console: 'Wii', year: 2011 },
  { id: 'albw', franchise: 'zelda', name: 'A Link Between Worlds', console: '3DS', year: 2013 },
  { id: 'tfh', franchise: 'zelda', name: 'Tri Force Heroes', console: '3DS', year: 2015, developer: 'Grezzo' },
  { id: 'botw', franchise: 'zelda', name: 'Breath of the Wild', console: 'Switch', year: 2017 },
  { id: 'totk', franchise: 'zelda', name: 'Tears of the Kingdom', console: 'Switch', year: 2023 },
  { id: 'eow', franchise: 'zelda', name: 'Echoes of Wisdom', console: 'Switch', year: 2024, developer: 'Grezzo' },

  { id: 'undertale', franchise: 'undertale', name: 'Undertale', console: 'PC', year: 2015 },

  { id: 'dr1', franchise: 'undertale', name: 'Deltarune - Chapter 1', console: 'PC', year: 2018 },
  { id: 'dr2', franchise: 'undertale', name: 'Deltarune - Chapter 2', console: 'PC', year: 2021 },
  { id: 'dr3', franchise: 'undertale', name: 'Deltarune - Chapter 3', console: 'PC', year: 2025 },
  { id: 'dr4', franchise: 'undertale', name: 'Deltarune - Chapter 4', console: 'PC', year: 2025 },
  { id: 'dr5', franchise: 'undertale', name: 'Deltarune - Chapter 5', console: 'PC', year: 2026 },
];

const gamesById = {};
GAMES.forEach((g) => { gamesById[g.id] = g; });

function getGameDisplayName(gameId) {
  const g = gamesById[gameId];
  return g ? g.name : gameId;
}

/* ---------- Game catalog: one search box + collapsible franchises. Each
   franchise has a checkbox to take all its games at once, and its games are
   laid out as a compact grid so big series (Zelda...) stay short. ---------- */

const franchiseCollapsed = {};
let franchiseCollapsedInitialized = false;
let gameSearchQuery = '';

function normalizeSearchText(text) {
  return text.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}

function gameMatchesSearch(game, franchise) {
  const query = normalizeSearchText(gameSearchQuery.trim());
  if (!query) return true;
  const haystack = normalizeSearchText(
    `${game.name} ${franchise.name} ${game.console} ${game.year} ${franchise.company || ''} ${game.developer || ''}`
  );
  return query.split(/\s+/).every((word) => haystack.includes(word));
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

/* ---------- Category picker: a single dropdown instead of a row of tabs.
   Categories with nothing in them yet are listed but disabled. ---------- */

function renderCategorySelect() {
  el.categorySelect.innerHTML = '';
  CATEGORIES.forEach((category) => {
    const option = document.createElement('option');
    option.value = category.id;
    const isEmpty = !FRANCHISES.some((f) => f.category === category.id);
    option.textContent = isEmpty
      ? `${t(`category_${category.id}`)} ${t('category_soon')}`
      : t(`category_${category.id}`);
    option.disabled = isEmpty;
    el.categorySelect.appendChild(option);
  });
  el.categorySelect.value = selectedCategory;
}

el.categorySelect.addEventListener('change', () => {
  selectedCategory = el.categorySelect.value;
  renderGameMenu();
  updateTotalCount();
  el.setupError.textContent = '';
});

el.gameSearchInput.addEventListener('input', () => {
  gameSearchQuery = el.gameSearchInput.value;
  renderGameMenu();
});

/* Games the "Select all" button acts on: everything playable in the current
   category and mode, narrowed to the search results while searching. */
function getSelectableGames() {
  return FRANCHISES.filter((f) => f.category === selectedCategory).flatMap((franchise) =>
    GAMES.filter((g) => g.franchise === franchise.id && isGameAvailableInMode(g) && gameMatchesSearch(g, franchise)));
}

el.gameSelectAllBtn.addEventListener('click', () => {
  getSelectableGames().forEach((g) => selectedGames.add(g.id));
  onGameSelectionChanged();
});

el.gameClearBtn.addEventListener('click', () => {
  selectedGames.clear();
  renderGameMenu();
  updateTotalCount();
});

function gameHasVisualTracks(gameId) {
  return allTracks.some((t) => t.game === gameId && !!t.image);
}

function gameHasGuessImages(gameId) {
  return allGuessImages.some((e) => e.game === gameId && e.kind === guessKind);
}

function isGameAvailableInMode(game) {
  if (mixFamily) return getMixSubModes().some((sub) => sub.source().some((e) => e.game === game.id));
  return (answerMode !== 'visual' || gameHasVisualTracks(game.id))
    && (answerMode !== 'guess' || gameHasGuessImages(game.id))
    && (answerMode !== 'describe' || allDescriptions.some((e) => e.game === game.id))
    && (answerMode !== 'draw' || typeof drawGameHasSubjects !== 'function' || drawGameHasSubjects(game.id));
}

function onGameSelectionChanged() {
  renderGameMenu();
  updateTotalCount();
  el.setupError.textContent = '';
}

function updateGameSelectionSummary() {
  const count = GAMES.filter((g) => selectedGames.has(g.id) && isGameAvailableInMode(g)).length;
  el.gameSelectionSummary.textContent = count
    ? t('games_selected', { count, plural: count > 1 ? 's' : '' })
    : '';
  el.gameClearBtn.hidden = count === 0;
  const selectable = getSelectableGames();
  el.gameSelectAllBtn.hidden = selectable.length === 0 || selectable.every((g) => selectedGames.has(g.id));
}

function renderGameMenu() {
  const scrollTop = el.gameMenu.scrollTop;
  el.gameMenu.innerHTML = '';
  const searching = gameSearchQuery.trim().length > 0;

  FRANCHISES.filter((franchise) => franchise.category === selectedCategory).forEach((franchise) => {
    const gamesInFranchise = GAMES.filter((g) => g.franchise === franchise.id && isGameAvailableInMode(g));
    if (gamesInFranchise.length === 0) return;

    const visibleGames = gamesInFranchise.filter((g) => gameMatchesSearch(g, franchise));
    if (searching && visibleGames.length === 0) return;

    /* Searching implies "show me what matched": ignore the stored collapse
       preference while a search is active instead of hiding the results. */
    const collapsed = searching ? false : !!franchiseCollapsed[franchise.id];
    const selectedCount = gamesInFranchise.filter((g) => selectedGames.has(g.id)).length;
    const state = selectedCount === 0 ? 'none' : (selectedCount === gamesInFranchise.length ? 'all' : 'some');

    const block = document.createElement('div');
    block.className = 'franchise-block';

    const header = document.createElement('div');
    header.className = 'franchise-header';

    const checkBtn = document.createElement('button');
    checkBtn.type = 'button';
    checkBtn.className = `franchise-check state-${state}`;
    checkBtn.textContent = state === 'all' ? '♥' : (state === 'some' ? '-' : '');
    checkBtn.title = t('btn_select_all');
    checkBtn.setAttribute('aria-label', `${t('btn_select_all')} : ${franchise.name}`);
    checkBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const ids = (searching ? visibleGames : gamesInFranchise).map((g) => g.id);
      const allSelected = ids.every((id) => selectedGames.has(id));
      ids.forEach((id) => {
        if (allSelected) selectedGames.delete(id);
        else selectedGames.add(id);
      });
      onGameSelectionChanged();
    });

    const nameSpan = document.createElement('span');
    nameSpan.className = 'franchise-name';
    nameSpan.textContent = franchise.name;

    const countSpan = document.createElement('span');
    countSpan.className = 'franchise-count';
    countSpan.textContent = `${selectedCount}/${gamesInFranchise.length}`;

    const arrow = document.createElement('span');
    arrow.className = 'franchise-arrow';
    arrow.textContent = collapsed ? '▸' : '▾';

    header.appendChild(checkBtn);
    header.appendChild(nameSpan);
    header.appendChild(countSpan);
    header.appendChild(arrow);
    header.addEventListener('click', () => {
      franchiseCollapsed[franchise.id] = !collapsed;
      renderGameMenu();
    });

    block.appendChild(header);

    if (!collapsed) {
      const gamesContainer = document.createElement('div');
      gamesContainer.className = 'franchise-games';

      visibleGames
        .slice()
        .sort((a, b) => a.year - b.year)
        .forEach((game) => {
          const btn = document.createElement('button');
          btn.type = 'button';
          btn.className = 'game-chip';
          btn.dataset.game = game.id;
          btn.classList.toggle('selected', selectedGames.has(game.id));

          const name = document.createElement('span');
          name.className = 'game-chip-name';
          name.textContent = game.name;
          const meta = document.createElement('span');
          meta.className = 'game-chip-meta';
          meta.textContent = `${game.console} · ${game.year}`;
          btn.appendChild(name);
          btn.appendChild(meta);

          btn.addEventListener('click', () => {
            if (selectedGames.has(game.id)) selectedGames.delete(game.id);
            else selectedGames.add(game.id);
            onGameSelectionChanged();
          });

          gamesContainer.appendChild(btn);
        });

      block.appendChild(gamesContainer);
    }

    el.gameMenu.appendChild(block);
  });

  if (!el.gameMenu.children.length) {
    const empty = document.createElement('p');
    empty.className = 'menu-empty-note';
    empty.textContent = t(searching ? 'label_no_games_match' : 'label_no_games_in_category');
    el.gameMenu.appendChild(empty);
  }

  el.gameMenu.scrollTop = scrollTop;
  updateGameSelectionSummary();
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

function updateMainTitle() {
  /* The big title is just the mode family: QUIZ / IMAGE / DESSIN */
  const tabKey = answerMode === 'draw' ? 'mode_tab_draw'
    : ((mixFamily === 'quiz' || (!mixFamily && (answerMode === 'text' || answerMode === 'describe'))) ? 'mode_tab_quiz' : 'mode_tab_image');
  el.mainTitle.textContent = t(tabKey).toUpperCase();
}

function refreshDynamicText() {
  applyTranslations();
  renderCategorySelect();
  if (typeof drawRefreshLabels === 'function') drawRefreshLabels();
  syncModeUI();
  renderRuleBonusTags();
  renderGameMenu();
  updateTimeEstimate();
  updateScoreMultiplierDisplay();
  refreshResumeAvailability();
  updateMainTitle();
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
  const pool = allTracks.filter((t) => selectedGames.has(t.game));
  if (answerMode === 'visual') return pool.filter((t) => !!t.image);
  return pool;
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

const OPTION_MULTIPLIER_BONUS = {
  clip1s: 0.15,
  writeTitle: 0.20,
  showGameLabel: -0.10,
  gameHint: -0.15,
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

  if (clipChallenge && answerMode !== 'describe') bonus += OPTION_MULTIPLIER_BONUS.clip1s;
  if (writeTitleMode) bonus += OPTION_MULTIPLIER_BONUS.writeTitle;
  if (handicapShowGameLabel) bonus += OPTION_MULTIPLIER_BONUS.showGameLabel;
  if (handicapGameHint) bonus += OPTION_MULTIPLIER_BONUS.gameHint;

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

/* Combo: each correct answer in a row raises the multiplier by x1, capped at
   x5 once the streak reaches 5. A wrong answer or timeout resets it. */
function getComboMultiplier() {
  return Math.max(1, Math.min(COMBO_MAX, comboStreak));
}

function updateComboDisplay() {
  if (comboStreak >= 2) {
    el.comboDisplay.textContent = t('combo_label', { streak: comboStreak, multiplier: getComboMultiplier() });
    el.comboDisplay.hidden = false;
  } else {
    el.comboDisplay.hidden = true;
  }
}

/* ---------- In-progress game persistence (survives refresh / going back to the menu) ---------- */

function saveGameState() {
  if (mixFamily) return;
  try {
    localStorage.setItem(GAME_STATE_KEY, JSON.stringify({
      playlistIds: playlist.map((t) => t.id),
      currentIndex,
      score,
      totalPoints,
      comboStreak,
      selectedGames: Array.from(selectedGames),
      selectedMode,
      answerMode,
      visualSubMode,
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
updateMainTitle();

/* "Guess-like" modes share one engine (single prompt, choices or typed name):
   'guess' shows a picture, 'describe' shows a text. */
function isGuessLike() {
  return answerMode === 'guess' || answerMode === 'describe';
}

function getGuessPool() {
  if (answerMode === 'describe') return allDescriptions.filter((e) => selectedGames.has(e.game));
  return allGuessImages.filter((e) => e.kind === guessKind && selectedGames.has(e.game));
}

function updateTotalCount() {
  const pool = mixFamily ? getMixTotalPool() : (isGuessLike() ? getGuessPool() : getFilteredPool());
  el.totalCount.textContent = pool.length;
  el.customCount.max = pool.length;
  el.customCount.value = Math.min(parseInt(el.customCount.value, 10) || 10, pool.length || 1);
  updateTimeEstimate();
  if (mixFamily) {
    el.visualModeNote.hidden = true;
    el.guessModeNote.hidden = pool.length > 0;
    return;
  }
  el.visualModeNote.hidden = !(answerMode === 'visual' && pool.length < (writeTitleMode ? 1 : getAnswerCount()));
  el.guessModeNote.hidden = !(isGuessLike() && pool.length < (!writeTitleMode ? getAnswerCount() : 1));
}

/* ---------- Estimated playtime ---------- */

const FAST_ANSWER_MS = 2000;

function getPlannedTrackCount() {
  const pool = mixFamily ? getMixTotalPool() : (isGuessLike() ? getGuessPool() : getFilteredPool());
  if (pool.length === 0) return 0;
  if (selectedMode === 'all') return pool.length;
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
  const range = minMinutes === maxMinutes ? `${minMinutes} min` : `${minMinutes} - ${maxMinutes} min`;
  el.timeEstimate.textContent = t('time_estimate', { range });
}

function updateScoreMultiplierDisplay() {
  const multiplier = computeScoreMultiplier();
  const points = getPointsPerCorrectAnswer();
  el.scoreMultiplier.textContent = `x${multiplier.toFixed(2)}`;
  el.scoreMultiplier.classList.toggle('harder', multiplier > 1);
  el.scoreMultiplier.classList.toggle('easier', multiplier < 1);
  el.scorePointsNote.textContent = t('score_points_note', { points });
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

let allGuessImages = [];
let allDescriptions = [];

fetch('descriptions.json')
  .then((res) => res.json())
  .then((data) => {
    allDescriptions = Array.isArray(data) ? data.filter((e) => e.name && e.text && e.kind) : [];
    renderGameMenu();
    updateTotalCount();
  })
  .catch(() => {
    allDescriptions = [];
  });

fetch('images.json')
  .then((res) => res.json())
  .then((data) => {
    allGuessImages = Array.isArray(data) ? data.filter((e) => e.name && e.image && e.kind) : [];
    updateTotalCount();
  })
  .catch(() => {
    allGuessImages = [];
  });

/* ---------- Setup screen ---------- */

renderCategorySelect();
initFranchiseCollapsedDefaults();
renderGameMenu();
syncModeUI();
renderRuleBonusTags();

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

/* ---------- Mode picker: two families (Quiz / Image) with their own
   options. Internally they map onto answerMode: Quiz > Music = 'text',
   Image > Music = 'visual', Image > Location / Screenshot = 'guess'. ---------- */

let lastImageSubject = 'music';
let lastQuizSubject = 'music';

function getImageSubject() {
  return answerMode === 'visual' ? 'music' : guessKind;
}

function syncModeUI() {
  const topMode = answerMode === 'draw' ? 'draw' : ((answerMode === 'text' || answerMode === 'describe') ? 'quiz' : 'image');
  el.modeTabs.querySelectorAll('.mode-tab').forEach((b) => b.classList.toggle('selected', b.dataset.topMode === topMode));
  el.quizOptions.hidden = topMode !== 'quiz';
  el.imageOptions.hidden = topMode !== 'image';
  el.drawOptions.hidden = topMode !== 'draw';
  document.querySelectorAll('.track-count-part').forEach((node) => { node.hidden = topMode === 'draw'; });

  const subject = mixFamily === 'image' ? 'random' : getImageSubject();
  el.imageSubjectRow.querySelectorAll('.mini-toggle').forEach((b) => b.classList.toggle('selected', topMode === 'image' && b.dataset.imageSubject === subject));
  el.imageEffectRow.hidden = topMode !== 'image';
  el.visualSubmodeRow.querySelectorAll('.mini-toggle').forEach((b) => b.classList.toggle('selected', b.dataset.visualSubmode === visualSubMode));
  el.answerStyleRow.querySelectorAll('.mini-toggle').forEach((b) => b.classList.toggle('selected', (b.dataset.answerStyle === 'text') === writeTitleMode));

  const quizSubject = mixFamily === 'quiz' ? 'random' : (answerMode === 'describe' ? 'describe' : 'music');
  el.quizSubjectRow.querySelectorAll('.mini-toggle').forEach((b) => b.classList.toggle('selected', b.dataset.quizTheme === quizSubject));
  el.clipRowWrap.hidden = answerMode === 'describe' || answerMode === 'draw';
  el.answerStyleRowWrap.hidden = answerMode === 'draw' && typeof drawSettings === 'object' && drawSettings.game === 'contest';
  el.modeDescription.textContent = t(topMode === 'draw' ? 'desc_draw'
    : (topMode === 'quiz' ? (mixFamily === 'quiz' ? 'desc_quiz_random' : (answerMode === 'describe' ? 'desc_quiz_describe' : 'desc_quiz_music')) : `desc_image_${subject}`));
  if (typeof syncDrawOptions === 'function') syncDrawOptions();
  el.answerChoiceBtn.textContent = t('guess_style_choice_n', { count: getAnswerCount() });

  const clipTarget = answerMode === 'guess' ? 'image' : 'music';
  el.clipRow.querySelectorAll('.mini-toggle').forEach((b) => {
    b.classList.toggle('selected', (b.dataset.clip === 'on') === clipChallenge);
    b.dataset.tip = t(`tip_clip_${b.dataset.clip}_${clipTarget}`);
  });
}

function onModeChanged() {
  syncModeUI();
  renderGameMenu();
  updateTotalCount();
  updateMainTitle();
  el.setupError.textContent = '';
}

function setImageSubject(subject) {
  lastImageSubject = subject;
  mixFamily = subject === 'random' ? 'image' : null;
  if (subject === 'music' || subject === 'random') {
    answerMode = 'visual';
  } else {
    answerMode = 'guess';
    guessKind = subject;
  }
}

el.modeTabs.querySelectorAll('.mode-tab').forEach((btn) => {
  btn.addEventListener('click', () => {
    if (btn.dataset.topMode === 'quiz') {
      answerMode = lastQuizSubject === 'describe' ? 'describe' : 'text';
      mixFamily = lastQuizSubject === 'random' ? 'quiz' : null;
    } else if (btn.dataset.topMode === 'image') {
      setImageSubject(lastImageSubject);
    } else if (btn.dataset.topMode === 'draw') {
      answerMode = 'draw';
      mixFamily = null;
    }
    onModeChanged();
  });
});

el.quizSubjectRow.querySelectorAll('.mini-toggle').forEach((btn) => {
  btn.addEventListener('click', () => {
    lastQuizSubject = btn.dataset.quizTheme;
    answerMode = lastQuizSubject === 'describe' ? 'describe' : 'text';
    mixFamily = lastQuizSubject === 'random' ? 'quiz' : null;
    onModeChanged();
    updateScoreMultiplierDisplay();
  });
});

el.imageSubjectRow.querySelectorAll('.mini-toggle').forEach((btn) => {
  btn.addEventListener('click', () => {
    setImageSubject(btn.dataset.imageSubject);
    onModeChanged();
  });
});

el.answerStyleRow.querySelectorAll('.mini-toggle').forEach((btn) => {
  btn.addEventListener('click', () => {
    writeTitleMode = btn.dataset.answerStyle === 'text';
    syncModeUI();
    updateTotalCount();
    updateScoreMultiplierDisplay();
  });
});

el.visualSubmodeRow.querySelectorAll('.mini-toggle').forEach((btn) => {
  btn.addEventListener('click', () => {
    visualSubMode = btn.dataset.visualSubmode;
    syncModeUI();
  });
});

/* ---------- Défi / Handicap menus ---------- */

const TIME_KEYS = ['time30', 'time25', 'time20', 'time10', 'time5', 'time3'];
const MINI_COUNT_KEYS = ['count6', 'count8', 'count10', 'count3', 'count2'];
const COUNT_VALUES = { count6: 6, count8: 8, count10: 10, count3: 3, count2: 2 };

function getModifierToggle(key) {
  return document.querySelector(`[data-challenge="${key}"], [data-handicap="${key}"]`);
}

el.timeOptions.querySelectorAll('.mini-toggle').forEach((btn) => {
  btn.addEventListener('click', () => {
    timeChallenge = btn.dataset.challenge || btn.dataset.handicap || null;
    syncModifierButtons();
    updateTimeEstimate();
    updateScoreMultiplierDisplay();
  });
});

el.countOptions.querySelectorAll('.mini-toggle').forEach((btn) => {
  btn.addEventListener('click', () => {
    const key = btn.dataset.challenge || btn.dataset.handicap;
    answerCountOverride = key ? COUNT_VALUES[key] : null;
    syncModifierButtons();
    updateScoreMultiplierDisplay();
    syncModeUI();
    updateTotalCount();
  });
});

syncModifierButtons();

/* Shows what each rule does to the score: a "+15%" / "-10%" tag on options,
   a hover tip plus red (harder) / green (easier) colouring on time and count. */
function renderRuleBonusTags() {
  const describe = (bonus) => t('tip_points_bonus', { sign: bonus > 0 ? '+' : '-', percent: Math.round(Math.abs(bonus) * 100) });
  const mark = (node, bonus) => {
    node.classList.toggle('harder', bonus > 0);
    node.classList.toggle('easier', bonus < 0);
  };
  el.timeOptions.querySelectorAll('.mini-toggle').forEach((btn) => {
    const bonus = TIME_MULTIPLIER_BONUS[btn.dataset.challenge || btn.dataset.handicap] || 0;
    mark(btn, bonus);
    if (bonus) btn.dataset.tip = describe(bonus);
  });
  el.countOptions.querySelectorAll('.mini-toggle').forEach((btn) => {
    const bonus = COUNT_MULTIPLIER_BONUS[btn.dataset.challenge || btn.dataset.handicap] || 0;
    mark(btn, bonus);
    if (bonus) btn.dataset.tip = describe(bonus);
  });
  document.querySelectorAll('.rules-tag[data-bonus-key]').forEach((tag) => {
    const bonus = OPTION_MULTIPLIER_BONUS[tag.dataset.bonusKey];
    tag.textContent = `${bonus > 0 ? '+' : '-'}${Math.round(Math.abs(bonus) * 100)}%`;
    mark(tag, bonus);
    const option = tag.closest('.menu-option');
    if (option) mark(option, bonus);
  });
}

el.clipRow.querySelectorAll('.mini-toggle').forEach((btn) => {
  btn.addEventListener('click', () => {
    clipChallenge = btn.dataset.clip === 'on';
    syncModeUI();
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

function syncModifierButtons() {
  if (el.answerStyleRow) syncModeUI();
  el.timeOptions.querySelector('[data-default-time]').classList.toggle('selected', !timeChallenge);
  el.countOptions.querySelector('[data-default-count]').classList.toggle('selected', !answerCountOverride);
  TIME_KEYS.forEach((key) => {
    const btn = getModifierToggle(key);
    if (btn) btn.classList.toggle('selected', timeChallenge === key);
  });
  MINI_COUNT_KEYS.forEach((key) => {
    const btn = getModifierToggle(key);
    if (btn) btn.classList.toggle('selected', answerCountOverride === COUNT_VALUES[key]);
  });
  el.handicapMenu.querySelectorAll('.menu-option').forEach((btn) => {
    const key = btn.dataset.handicap;
    let active = false;
    if (key === 'showGameLabel') active = handicapShowGameLabel;
    else if (key === 'gameHint') active = handicapGameHint;
    btn.classList.toggle('selected', active);
  });
}

/* ---------- Random subject ("Aléatoire"): mixed rounds ---------- */

function getMixSubModes() {
  if (mixFamily === 'quiz') {
    return [
      { key: 'text', mode: 'text', source: () => allTracks },
      { key: 'describe', mode: 'describe', source: () => allDescriptions },
    ];
  }
  if (mixFamily === 'image') {
    return [
      { key: 'visual', mode: 'visual', source: () => allTracks.filter((tr) => !!tr.image) },
      ...['screenshot', 'location', 'character', 'object'].map((kind) => ({
        key: `guess-${kind}`, mode: 'guess', kind, source: () => allGuessImages.filter((e) => e.kind === kind),
      })),
    ];
  }
  return [];
}

/* Kinds of round that can actually be played with the selected games: a
   choice round needs enough different answers for the choices. */
function getPlayableMixPools() {
  const needed = writeTitleMode ? 1 : getAnswerCount();
  const pools = {};
  getMixSubModes().forEach((sub) => {
    const pool = sub.source().filter((e) => selectedGames.has(e.game));
    if (pool.length >= needed) pools[sub.key] = { sub, pool };
  });
  return pools;
}

function getMixTotalPool() {
  return Object.values(getPlayableMixPools()).flatMap(({ pool }) => pool);
}

function prepareMixPlaylist() {
  const playable = getPlayableMixPools();
  const keys = Object.keys(playable);
  const total = keys.reduce((sum, k) => sum + playable[k].pool.length, 0);
  if (!keys.length) {
    el.setupError.textContent = t('err_min_tracks', { count: writeTitleMode ? 1 : getAnswerCount() });
    return false;
  }
  let count = total;
  if (selectedMode !== 'all') {
    count = parseInt(el.customCount.value, 10);
    if (!count || count < 1) {
      el.setupError.textContent = t('err_valid_number');
      return false;
    }
    count = Math.min(count, total);
  }
  // each round: pick a kind at random among those with items left, then an item of that kind
  const remaining = {};
  keys.forEach((k) => { remaining[k] = shuffle(playable[k].pool); });
  mixPools = {};
  keys.forEach((k) => { mixPools[k] = playable[k].pool; });
  mixRounds = [];
  for (let i = 0; i < count; i++) {
    const available = keys.filter((k) => remaining[k].length);
    if (!available.length) break;
    const key = available[Math.floor(Math.random() * available.length)];
    const { sub } = playable[key];
    mixRounds.push({ key, mode: sub.mode, kind: sub.kind || null, item: remaining[key].pop() });
  }
  playlist = mixRounds.map((r) => (r.mode === 'text' || r.mode === 'visual' ? r.item : null));
  guessPlaylist = mixRounds.map((r) => (r.mode === 'guess' || r.mode === 'describe' ? r.item : null));
  currentIndex = 0;
  score = 0;
  totalPoints = 0;
  comboStreak = 0;
  roundStartTime = 0;
  roundAnswered = false;
  return true;
}

/* Points the round engine at the kind of the current round. */
function applyMixRound(index) {
  const round = mixRounds[index];
  if (!round) return;
  answerMode = round.mode;
  if (round.kind) guessKind = round.kind;
  currentPool = mixPools[round.key] || [];
}

/* Starts the current round with the engine that fits it (music vs single
   prompt), hiding whatever the previous kind of round had on screen. */
/* Back on the setup screen after a mixed game: answerMode goes back to the
   family's own setting instead of whatever the last round was. */
function restoreMixSetupMode() {
  if (!mixFamily) return;
  answerMode = mixFamily === 'quiz' ? 'text' : 'visual';
  syncModeUI();
  renderGameMenu();
  updateTotalCount();
  updateScoreMultiplierDisplay();
}

function startCurrentRound() {
  if (mixFamily && mixRounds.length) applyMixRound(currentIndex);
  if (isGuessLike()) {
    el.answersGrid.hidden = true;
    el.visualAnswersGrid.hidden = true;
    el.textAnswer.hidden = true;
    startGuessRound();
  } else {
    el.guessPictureWrap.hidden = true;
    el.describeBox.hidden = true;
    el.guessChoicesGrid.hidden = true;
    el.guessTextAnswer.hidden = true;
    startRound();
  }
}

function preparePlaylist() {
  el.setupError.textContent = '';
  if (mixFamily) {
    if (selectedGames.size === 0) {
      el.setupError.textContent = t('err_select_game');
      return false;
    }
    return prepareMixPlaylist();
  }
  mixRounds = [];

  if (selectedGames.size === 0) {
    el.setupError.textContent = t('err_select_game');
    return false;
  }

  const pool = isGuessLike() ? getGuessPool() : getFilteredPool();
  currentPool = pool;

  const effectiveCount = isGuessLike()
    ? (!writeTitleMode ? getAnswerCount() : 1)
    : writeTitleMode ? 4 : getAnswerCount();
  if (pool.length < effectiveCount) {
    el.setupError.textContent = t('err_min_tracks', { count: effectiveCount });
    return false;
  }

  let count;
  if (selectedMode === 'all') {
    count = pool.length;
  } else {
    count = parseInt(el.customCount.value, 10);
    if (!count || count < 1) {
      el.setupError.textContent = t('err_valid_number');
      return false;
    }
    if (count > pool.length) {
      el.setupError.textContent = t('err_only_n_tracks', { count: pool.length });
      return false;
    }
  }

  if (isGuessLike()) {
    guessPlaylist = shuffle(pool).slice(0, count);
  } else {
    playlist = shuffle(pool).slice(0, count);
  }
  currentIndex = 0;
  score = 0;
  totalPoints = 0;
  comboStreak = 0;
  roundStartTime = 0;
  roundAnswered = false;
  return true;
}

el.startBtn.addEventListener('click', async () => {
  if (answerMode === 'draw') {
    drawStartPractice();
    return;
  }
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
  renderGameMenu();

  selectedMode = saved.selectedMode;
  el.modeMenu.querySelectorAll('.menu-option').forEach((btn) => {
    btn.classList.toggle('selected', btn.dataset.mode === selectedMode);
  });
  el.customCount.value = saved.customCount;

  answerMode = saved.answerMode === 'visual' ? 'visual' : 'text';
  visualSubMode = ['pixel', 'zoom'].includes(saved.visualSubMode) ? saved.visualSubMode : 'normal';
  syncModeUI();
  renderGameMenu();
  updateMainTitle();

  clipChallenge = !!saved.clipChallenge;
  timeChallenge = saved.timeChallenge || null;
  answerCountOverride = saved.answerCountOverride || null;
  writeTitleMode = !!saved.writeTitleMode;
  guessGameMode = false; // option removed from the Rules box
  handicapShowGameLabel = !!saved.handicapShowGameLabel;
  handicapGameHint = !!saved.handicapGameHint;

  syncModifierButtons();
  updateTimeEstimate();
  updateScoreMultiplierDisplay();

  currentPool = getFilteredPool();
  playlist = saved.playlistIds
    .map((id) => allTracks.find((t) => t.id === id))
    .filter(Boolean);
  currentIndex = saved.currentIndex;
  score = saved.score;
  totalPoints = saved.totalPoints || 0;
  comboStreak = saved.comboStreak || 0;
  updateComboDisplay();

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
  updateComboDisplay();
  el.pauseBtn.hidden = false;
  pauseRequested = false;
  isPaused = false;
  el.pauseBtn.textContent = t('btn_pause');
  el.pauseBtn.classList.remove('queued', 'paused');
  el.pauseOverlay.hidden = true;
  el.answersGrid.hidden = false;
  el.textAnswer.hidden = true;
  el.gameAnswer.hidden = true;

  const needsMusic = mixFamily && mixRounds.length
    ? mixRounds.some((r) => r.mode === 'text' || r.mode === 'visual')
    : !isGuessLike();
  if (!needsMusic) {
    showScreen('game');
    startCurrentRound();
    return;
  }

  el.startBtn.disabled = true;
  el.resumeBtn.disabled = true;
  triggerBtn.textContent = t('btn_loading');
  await ensureYouTubeReady();
  el.startBtn.disabled = false;
  el.resumeBtn.disabled = false;
  triggerBtn.textContent = idleLabel;

  showScreen('game');
  startCurrentRound();
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
  el.guessPictureWrap.hidden = true;
  el.describeBox.hidden = true;
  restoreMixSetupMode();
  showScreen('setup');
});

/* ---------- Pause control (takes effect only at the next round, to prevent cheating) ---------- */

el.pauseBtn.addEventListener('click', () => {
  if (mpActive) {
    if (!mpIsHost) return;
    mpSend({ type: mpPaused ? 'resume' : 'pause' });
    return;
  }

  if (isPaused) {
    isPaused = false;
    el.pauseBtn.textContent = t('btn_pause');
    el.pauseBtn.classList.remove('paused');
    el.pauseOverlay.hidden = true;
    el.answersGrid.hidden = false;
    startCurrentRound();
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
  if (mpActive) {
    if (mpIsHost && mpPaused) mpSend({ type: 'resume' });
    return;
  }
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

/* ---------- "Guess the picture" mode: a single image, no music, revealed
   gradually from pixelated to clear over the round's duration. Two flavors
   picked via guessKind (box art / location) and answered by typing the name
   or picking among choices, via writeTitleMode. ---------- */

/* Round length follows the Défi / Handicap answer time, like the other modes. */
function getGuessRoundDurationMs() {
  return getRoundDurationMs();
}

function getGuessSpeedFactor() {
  const elapsed = Math.max(0, Date.now() - roundStartTime);
  const ratio = Math.min(1, elapsed / getGuessRoundDurationMs());
  return Math.max(MIN_SPEED_FACTOR, 1 - (1 - MIN_SPEED_FACTOR) * ratio);
}

/* "Zoom out" effect: how zoomed in the picture starts. */
const ZOOM_OUT_START = 25;

/* Picks (once per picture) a point on an actual detail to zoom on: a pixel
   that is neither transparent nor the background color (read from the corner),
   rather than the center, which is often empty on sprites. */
function getZoomFocus(img) {
  if (img.zoomFocus) return img.zoomFocus;
  let focus = { x: 0.5, y: 0.5 };
  try {
    const size = 64;
    const c = document.createElement('canvas');
    c.width = size;
    c.height = size;
    const ctx = c.getContext('2d');
    ctx.drawImage(img, 0, 0, size, size);
    const d = ctx.getImageData(0, 0, size, size).data;
    const bg = [d[0], d[1], d[2], d[3]];
    const candidates = [];
    for (let y = 4; y < size - 4; y++) {
      for (let x = 4; x < size - 4; x++) {
        const i = (y * size + x) * 4;
        if (d[i + 3] < 128) continue;
        const diff = Math.abs(d[i] - bg[0]) + Math.abs(d[i + 1] - bg[1]) + Math.abs(d[i + 2] - bg[2]) + Math.abs(d[i + 3] - bg[3]);
        if (diff > 60) candidates.push({ x: x / size, y: y / size });
      }
    }
    if (candidates.length) focus = candidates[Math.floor(Math.random() * candidates.length)];
  } catch (e) {
    /* unreadable picture: keep the center */
  }
  img.zoomFocus = focus;
  return focus;
}

/* Draws the guessed picture letterboxed into the canvas (sprites keep their
   proportions and stay crisp), with the chosen effect at a given progress
   (0 = round start, 1 = fully revealed). */
function drawGuessFrame(img, canvas, effect, progress) {
  const w = canvas.width;
  const h = canvas.height;
  const fit = Math.min(w / img.naturalWidth, h / img.naturalHeight);
  const dw = img.naturalWidth * fit;
  const dh = img.naturalHeight * fit;
  const dx = (w - dw) / 2;
  const dy = (h - dh) / 2;
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, w, h);

  if (effect === 'pixel' && progress < 1) {
    const blocks = Math.round(4 + (48 - 4) * progress);
    const tiny = document.createElement('canvas');
    tiny.width = Math.max(1, Math.min(blocks, img.naturalWidth));
    tiny.height = Math.max(1, Math.round(tiny.width * (dh / dw)));
    const tctx = tiny.getContext('2d');
    tctx.imageSmoothingEnabled = true;
    tctx.drawImage(img, 0, 0, tiny.width, tiny.height);
    ctx.drawImage(tiny, dx, dy, dw, dh);
  } else if (effect === 'zoom' && progress < 1) {
    // zoom around a detail of the picture, which stays in place while zooming out
    const zoom = ZOOM_OUT_START - (ZOOM_OUT_START - 1) * progress;
    const focus = getZoomFocus(img);
    ctx.drawImage(img, dx + focus.x * dw * (1 - zoom), dy + focus.y * dh * (1 - zoom), dw * zoom, dh * zoom);
  } else {
    ctx.drawImage(img, dx, dy, dw, dh);
  }
}

const GUESS_FLASH_MS = 1000;

function startGuessImageReveal(entry, duration) {
  const canvas = el.guessPictureCanvas;
  canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
  /* "1 second" duration: the whole effect plays within the flash window */
  const visibleMs = clipChallenge ? GUESS_FLASH_MS : duration;
  const loader = new Image();
  loader.crossOrigin = 'anonymous';
  loader.onload = () => {
    const tick = () => {
      const elapsed = Math.max(0, Date.now() - roundStartTime);
      if (clipChallenge && elapsed >= visibleMs) {
        canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
        clearInterval(guessRevealIntervalId);
        return;
      }
      const progress = Math.min(1, elapsed / visibleMs);
      drawGuessFrame(loader, canvas, visualSubMode, progress);
      if (!clipChallenge && (progress >= 1 || visualSubMode === 'normal')) clearInterval(guessRevealIntervalId);
    };
    tick();
    guessRevealIntervalId = setInterval(tick, 100);
  };
  loader.src = entry.image;
}

function getUniqueGuessNames() {
  const seen = new Set();
  const result = [];
  currentPool.forEach((e) => {
    if (seen.has(e.name)) return;
    seen.add(e.name);
    result.push(e);
  });
  return result;
}

function updateGuessSuggestions(query) {
  const q = query.trim().toLowerCase();
  const matches = getUniqueGuessNames()
    .filter((e) => !q || e.name.toLowerCase().includes(q))
    .sort((a, b) => a.name.localeCompare(b.name))
    .slice(0, 40);

  el.guessSuggestions.innerHTML = '';
  matches.forEach((e) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'suggestion-btn';
    btn.dataset.name = e.name;
    btn.textContent = e.name;
    btn.addEventListener('click', () => onGuessAnswerChosen(e.name));
    el.guessSuggestions.appendChild(btn);
  });
}

el.guessTextInput.addEventListener('input', () => updateGuessSuggestions(el.guessTextInput.value));
el.guessTextInput.addEventListener('keydown', (e) => {
  if (e.key !== 'Enter') return;
  const firstBtn = el.guessSuggestions.querySelector('.suggestion-btn');
  if (firstBtn) onGuessAnswerChosen(firstBtn.dataset.name);
});

function getDescribeKindLabel(kind) {
  const keys = { character: 'image_subject_character', object: 'image_subject_object', location: 'guess_kind_location', game: 'describe_kind_game' };
  return keys[kind] ? t(keys[kind]) : '';
}

function renderGuessAnswer(entry) {
  const describing = answerMode === 'describe';
  el.guessPictureWrap.hidden = describing;
  el.describeBox.hidden = !describing;
  if (describing) {
    el.describeKind.textContent = getDescribeKindLabel(entry.kind);
    el.describeText.textContent = uiLang === 'fr' && entry.text_fr ? entry.text_fr : entry.text;
  }
  el.answersGrid.hidden = true;
  el.textAnswer.hidden = true;
  el.visualAnswersGrid.hidden = true;
  el.gameAnswer.hidden = true;

  if (!writeTitleMode) {
    el.guessChoicesGrid.hidden = false;
    el.guessTextAnswer.hidden = true;
    const others = shuffle(getUniqueGuessNames().filter((e) => e.name !== entry.name));
    const decoys = [...others.filter((e) => e.kind === entry.kind), ...others.filter((e) => e.kind !== entry.kind)]
      .slice(0, getAnswerCount() - 1);
    const options = shuffle([entry, ...decoys]);
    el.guessChoicesGrid.innerHTML = '';
    options.forEach((opt) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'answer-btn';
      btn.dataset.name = opt.name;
      btn.textContent = opt.name;
      btn.addEventListener('click', () => onGuessAnswerChosen(opt.name));
      el.guessChoicesGrid.appendChild(btn);
    });
  } else {
    el.guessChoicesGrid.hidden = true;
    el.guessTextAnswer.hidden = false;
    el.guessTextInput.value = '';
    el.guessTextInput.disabled = false;
    updateGuessSuggestions('');
    el.guessTextInput.focus();
  }
}

function onGuessAnswerChosen(name) {
  if (answerLocked) return;
  revealGuessAnswer(name);
}

function startGuessRound() {
  answerLocked = false;
  clearTimers();

  const entry = guessPlaylist[currentIndex];
  el.replayClipBtn.hidden = true;
  el.progressLabel.textContent = t('live_track', { index: currentIndex + 1, total: guessPlaylist.length });
  updateLiveScore();
  el.gameHint.hidden = true;
  el.revealMessage.hidden = true;
  el.revealCorrectTitle.hidden = true;

  renderGuessAnswer(entry);

  const duration = getGuessRoundDurationMs();
  const now = Date.now();
  if (!roundStartTime) roundStartTime = now;
  const elapsed = Math.max(now - roundStartTime, 0);
  const remaining = Math.max(duration - elapsed, 0);
  roundAnswered = false;
  saveGameState();

  if (remaining <= 0) {
    revealGuessAnswer(null);
    return;
  }

  resetTimerBar(remaining, elapsed);
  if (answerMode === 'guess') startGuessImageReveal(entry, duration);
  roundTimeoutId = setTimeout(() => revealGuessAnswer(null), remaining);

  const warningRemaining = duration * WARNING_FRACTION - elapsed;
  if (warningRemaining <= 0) el.hpFill.classList.add('warning');
  else warningTimeoutId = setTimeout(() => el.hpFill.classList.add('warning'), warningRemaining);

  const criticalRemaining = duration * CRITICAL_FRACTION - elapsed;
  if (criticalRemaining <= 0) el.hpFill.classList.add('critical');
  else criticalTimeoutId = setTimeout(() => el.hpFill.classList.add('critical'), criticalRemaining);
}

function revealGuessAnswer(selectedName) {
  if (answerLocked) return;
  answerLocked = true;
  clearTimers();

  const entry = guessPlaylist[currentIndex];
  const correct = selectedName === entry.name;
  let pointsEarned = 0;
  if (correct) {
    score++;
    comboStreak++;
    pointsEarned = Math.round(BASE_POINTS_PER_CORRECT * getGuessSpeedFactor() * getComboMultiplier());
    totalPoints += pointsEarned;
  } else {
    comboStreak = 0;
  }
  roundAnswered = true;
  updateLiveScore();
  updateComboDisplay();

  if (answerMode === 'guess') {
    const fullReveal = new Image();
    fullReveal.crossOrigin = 'anonymous';
    fullReveal.onload = () => drawGuessFrame(fullReveal, el.guessPictureCanvas, 'normal', 1);
    fullReveal.src = entry.image;
  }

  const noAnswerGiven = selectedName === null;
  if (!writeTitleMode) {
    el.guessChoicesGrid.querySelectorAll('.answer-btn').forEach((btn) => {
      btn.disabled = true;
      if (btn.dataset.name === entry.name) btn.classList.add('correct');
      else if (noAnswerGiven || btn.dataset.name === selectedName) btn.classList.add('wrong');
    });
  } else {
    el.guessTextInput.disabled = true;
  }

  if (correct) {
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

  if (!correct) {
    el.revealCorrectTitle.textContent = entry.name;
    el.revealCorrectTitle.hidden = false;
  } else {
    el.revealCorrectTitle.hidden = true;
  }

  revealAdvanceTimeoutId = setTimeout(() => {
    currentIndex++;
    roundStartTime = 0;
    roundAnswered = false;
    if (currentIndex >= guessPlaylist.length) {
      finishGame();
      return;
    }
    if (pauseRequested) {
      pauseRequested = false;
      isPaused = true;
      el.progressLabel.textContent = t('live_track', { index: currentIndex + 1, total: guessPlaylist.length });
      el.pauseBtn.textContent = t('btn_resume');
      el.pauseBtn.classList.remove('queued');
      el.pauseBtn.classList.add('paused');
      el.guessPictureWrap.hidden = true;
      el.describeBox.hidden = true;
      el.guessChoicesGrid.hidden = true;
      el.guessTextAnswer.hidden = true;
      el.pauseOverlay.hidden = false;
    } else {
      startCurrentRound();
    }
  }, REVEAL_PAUSE_MS);
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

  if (showsImageChoices()) {
    el.answersGrid.hidden = true;
    el.textAnswer.hidden = true;
    el.visualAnswersGrid.hidden = false;
    renderVisualAnswers(track);
  } else if (writeTitleMode) {
    el.answersGrid.hidden = true;
    el.visualAnswersGrid.hidden = true;
    el.textAnswer.hidden = false;
    renderTextAnswer();
  } else {
    el.answersGrid.hidden = false;
    el.visualAnswersGrid.hidden = true;
    el.textAnswer.hidden = true;
    renderChoiceAnswers(track);
  }
}

function showsImageChoices() {
  return answerMode === 'visual' && !writeTitleMode;
}

function getEffectiveRoundDurationMs() {
  if (mpActive && mpSettings && mpSettings.durationMs) return mpSettings.durationMs;
  return getRoundDurationMs();
}

/* Pixelated sub-mode: draw the image tiny, then blow it back up with
   smoothing off, instead of hand-rolling a blur filter. */
function drawPixelated(imgEl, canvas, blocks = 10) {
  const w = canvas.width;
  const h = canvas.height;
  const tiny = document.createElement('canvas');
  tiny.width = blocks;
  tiny.height = Math.max(1, Math.round(blocks * (h / w)));
  const tctx = tiny.getContext('2d');
  tctx.imageSmoothingEnabled = true;
  tctx.drawImage(imgEl, 0, 0, tiny.width, tiny.height);
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, w, h);
  ctx.drawImage(tiny, 0, 0, w, h);
}

function renderVisualAnswers(track) {
  const imagePool = currentPool.filter((tr) => !!tr.image);
  const decoys = shuffle(imagePool.filter((tr) => tr.title !== track.title)).slice(0, getAnswerCount() - 1);
  const options = shuffle([track, ...decoys]);
  const durationMs = getEffectiveRoundDurationMs();

  el.visualAnswersGrid.innerHTML = '';
  el.visualAnswersGrid.classList.toggle('many', options.length > 4);
  options.forEach((opt) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'visual-answer-btn';
    btn.dataset.title = opt.title;

    if (visualSubMode === 'pixel') {
      const canvas = document.createElement('canvas');
      canvas.width = 320;
      canvas.height = 240;
      btn.appendChild(canvas);
      const loader = new Image();
      loader.crossOrigin = 'anonymous';
      loader.onload = () => drawPixelated(loader, canvas, 10);
      loader.src = opt.image;
    } else if (visualSubMode === 'zoom') {
      const wrap = document.createElement('div');
      wrap.className = 'visual-zoom-wrap';
      const img = document.createElement('img');
      img.src = opt.image;
      img.alt = getDisplayTitle(opt);
      img.loading = 'lazy';
      img.style.transition = 'none';
      // zoom on a random area (not always the middle), then zoom out
      img.style.transformOrigin = `${20 + Math.random() * 60}% ${20 + Math.random() * 60}%`;
      img.style.transform = `scale(${ZOOM_OUT_START})`;
      wrap.appendChild(img);
      btn.appendChild(wrap);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          img.style.transition = `transform ${Math.max(1, durationMs - 500)}ms linear`;
          img.style.transform = 'scale(1)';
        });
      });
    } else {
      const img = document.createElement('img');
      img.src = opt.image;
      img.alt = getDisplayTitle(opt);
      img.loading = 'lazy';
      btn.appendChild(img);
    }

    const caption = document.createElement('span');
    caption.className = 'visual-answer-caption';
    caption.textContent = getDisplayTitle(opt);
    btn.appendChild(caption);

    btn.addEventListener('click', () => onTitleChosen(opt.title));
    el.visualAnswersGrid.appendChild(btn);
  });
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

let suggestionActiveIndex = -1;

function updateTextSuggestions(query) {
  suggestionActiveIndex = -1;
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

    btn.addEventListener('mouseenter', () => {
      setSuggestionActive(Array.prototype.indexOf.call(el.answerSuggestions.children, btn));
    });
    btn.addEventListener('click', () => onTitleChosen(track.title));
    el.answerSuggestions.appendChild(btn);
  });
}

/* ---------- Keyboard navigation through the suggestions list (Up/Down + Enter) ---------- */

function setSuggestionActive(index) {
  const buttons = el.answerSuggestions.querySelectorAll('.suggestion-btn');
  if (buttons.length === 0) {
    suggestionActiveIndex = -1;
    return;
  }
  suggestionActiveIndex = ((index % buttons.length) + buttons.length) % buttons.length;
  buttons.forEach((btn, i) => {
    btn.classList.toggle('active', i === suggestionActiveIndex);
  });
  buttons[suggestionActiveIndex].scrollIntoView({ block: 'nearest' });
}

el.answerTextInput.addEventListener('input', () => {
  updateTextSuggestions(el.answerTextInput.value);
});

el.answerTextInput.addEventListener('keydown', (e) => {
  const buttons = el.answerSuggestions.querySelectorAll('.suggestion-btn');

  if (e.key === 'ArrowDown') {
    e.preventDefault();
    if (buttons.length > 0) setSuggestionActive(suggestionActiveIndex + 1);
    return;
  }

  if (e.key === 'ArrowUp') {
    e.preventDefault();
    if (buttons.length > 0) setSuggestionActive(suggestionActiveIndex - 1);
    return;
  }

  if (e.key !== 'Enter') return;
  /* Submit the highlighted suggestion (via Up/Down), or the first one shown
     for the typed query if none has been highlighted yet. */
  const target = suggestionActiveIndex >= 0 ? buttons[suggestionActiveIndex] : buttons[0];
  if (target) onTitleChosen(target.dataset.title);
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
  clearInterval(guessRevealIntervalId);
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
    comboStreak++;
    pointsEarned = Math.round(getPointsPerCorrectAnswer() * getSpeedFactor() * getComboMultiplier());
    totalPoints += pointsEarned;
  } else {
    comboStreak = 0;
  }
  roundAnswered = true;
  saveGameState();
  updateLiveScore();
  updateComboDisplay();

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

  if (showsImageChoices()) {
    el.visualAnswersGrid.hidden = false;
    el.answersGrid.hidden = true;
    el.textAnswer.hidden = true;
    markButtons(el.visualAnswersGrid.querySelectorAll('.visual-answer-btn'), track.title, selectedTitle, 'title');
  } else if (writeTitleMode) {
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
      startCurrentRound();
    }
  }, REVEAL_PAUSE_MS);
}

/* ---------- Results screen ---------- */

function finishGame() {
  clearGameState();
  el.mpFinalLeaderboard.hidden = true;
  el.guessPictureWrap.hidden = true;
  el.describeBox.hidden = true;
  el.guessChoicesGrid.hidden = true;
  el.guessTextAnswer.hidden = true;
  if (player && typeof player.stopVideo === 'function') {
    player.stopVideo();
  }
  const total = isGuessLike() ? guessPlaylist.length : playlist.length;
  el.finalScore.textContent = score;
  el.finalTotal.textContent = total;
  el.finalPoints.textContent = totalPoints;

  const ratio = score / total;
  let commentKey;
  if (ratio === 1) commentKey = 'result_perfect';
  else if (ratio >= 0.7) commentKey = 'result_great';
  else if (ratio >= 0.4) commentKey = 'result_ok';
  else commentKey = 'result_bad';
  el.scoreComment.textContent = t(commentKey);

  restoreMixSetupMode();
  showScreen('results');
}

/* ---------- Multiplayer: session persistence, so a crash/closed tab can
   rejoin the same in-progress room (the server keeps the player's score
   under the same clientId until they explicitly leave). ---------- */

const MP_SESSION_KEY = 'ostquiz-mp-session';

function saveMpSession() {
  if (!mpRoom) return;
  try {
    localStorage.setItem(MP_SESSION_KEY, JSON.stringify({ code: mpRoom.code, name: el.mpNameInput.value.trim() || 'Player' }));
  } catch (e) {
    /* localStorage unavailable, ignore */
  }
}

function clearMpSession() {
  try {
    localStorage.removeItem(MP_SESSION_KEY);
  } catch (e) {
    /* localStorage unavailable, ignore */
  }
}

function loadMpSession() {
  try {
    const raw = localStorage.getItem(MP_SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
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
      mpSyncMode = false;
      el.mpSyncToggle.textContent = t('mp_sync_off');
      el.mpSyncToggle.classList.remove('selected');
      saveMpSession();
      mpShowLobby();
      break;
    case 'joined':
      mpRoom = { code: msg.code, clientId: msg.clientId, hostId: msg.hostId };
      mpIsHost = msg.hostId === msg.clientId;
      mpSyncMode = !!msg.syncMode;
      el.mpSyncToggle.textContent = mpSyncMode ? t('mp_sync_on') : t('mp_sync_off');
      el.mpSyncToggle.classList.toggle('selected', mpSyncMode);
      saveMpSession();
      if (msg.drawing) {
        mpShowLobby(); // the server follows up with the current drawing phase
      } else if (msg.started) {
        /* Joining a room whose game is already running: catch up directly
           instead of showing a lobby the player would never leave. */
        mpApplySettings(msg.settings);
        selectedGames = new Set(msg.selectedGames || []);
        playlist = (msg.trackIds || []).map((id) => allTracks.find((tr) => tr.id === id)).filter(Boolean);
        currentPool = getFilteredPool();
        currentIndex = -1;
        score = 0;
        totalPoints = 0;
        comboStreak = 0;
        mpActive = true;
        beginMpGame();
      } else {
        if (Array.isArray(msg.selectedGames) && msg.selectedGames.length) {
          selectedGames = new Set(msg.selectedGames);
          renderGameMenu();
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
      if (typeof drawRenderScoreboard === 'function') drawRenderScoreboard();
      break;
    case 'error':
      mpShowLobbyError(t(`mp_err_${msg.message}`) !== `mp_err_${msg.message}` ? t(`mp_err_${msg.message}`) : msg.message);
      if (msg.message === 'room_not_found') {
        clearMpSession();
        el.mpResumeSessionBtn.hidden = true;
      }
      break;
    case 'gameStarting':
      mpApplySettings(msg.settings);
      selectedGames = new Set(msg.selectedGames || []);
      playlist = (msg.trackIds || []).map((id) => allTracks.find((tr) => tr.id === id)).filter(Boolean);
      currentPool = getFilteredPool();
      currentIndex = -1;
      score = 0;
      totalPoints = 0;
      comboStreak = 0;
      mpActive = true;
      beginMpGame();
      break;
    case 'round':
      if (msg.resumed) mpHandleResume(msg);
      else mpHandleRound(msg);
      break;
    case 'reveal':
      mpHandleReveal(msg);
      break;
    case 'paused':
      mpHandlePaused(msg);
      break;
    case 'syncMode':
      mpSyncMode = !!msg.enabled;
      el.mpSyncToggle.textContent = mpSyncMode ? t('mp_sync_on') : t('mp_sync_off');
      el.mpSyncToggle.classList.toggle('selected', mpSyncMode);
      break;
    case 'lobbySettings':
      if (!mpIsHost) mpApplyLobbySettingsPreview(msg);
      break;
    case 'gameOver':
      mpPlayers = msg.players || mpPlayers;
      mpHandleGameOver();
      break;
    default:
      if (String(msg.type).startsWith('draw') && typeof drawHandleMessage === 'function') drawHandleMessage(msg);
      break;
  }
}

/* ---------- Multiplayer: lobby UI ---------- */

function mpShowJoinCreateForm() {
  el.mpJoinCreate.hidden = false;
  el.mpLobby.hidden = true;
}

/* ---------- Lobby settings preview: the host's setup choices (games, mode,
   Défi/Handicap) are broadcast live to the room so guests can see what will
   be played before the host hits Start, instead of finding out after. ---------- */

let mpLobbySettingsDebounceId = null;

function mpBroadcastLobbySettings() {
  if (!mpRoom || !mpIsHost || mpActive) return;
  mpSend({
    type: 'lobbySettings',
    selectedGames: Array.from(selectedGames),
    selectedMode,
    customCount: el.customCount.value,
    answerMode,
    settings: {
      durationMs: getRoundDurationMs(),
      answerCount: getAnswerCount(),
      writeTitleMode,
      guessGameMode,
      handicapShowGameLabel,
      handicapGameHint,
      clipChallenge,
      visualSubMode,
      draw: typeof drawSettings === 'object' ? drawSettings : null,
    },
  });
}

function mpQueueLobbySettingsBroadcast() {
  clearTimeout(mpLobbySettingsDebounceId);
  mpLobbySettingsDebounceId = setTimeout(mpBroadcastLobbySettings, 30);
}

document.addEventListener('click', () => {
  if (mpRoom && mpIsHost && !mpActive) mpQueueLobbySettingsBroadcast();
});
document.addEventListener('input', () => {
  if (mpRoom && mpIsHost && !mpActive) mpQueueLobbySettingsBroadcast();
});

function mpApplyLobbySettingsPreview(msg) {
  selectedGames = new Set(msg.selectedGames || []);
  selectedMode = msg.selectedMode || 'all';
  el.modeMenu.querySelectorAll('.menu-option').forEach((btn) => {
    btn.classList.toggle('selected', btn.dataset.mode === selectedMode);
  });
  if (msg.customCount) el.customCount.value = msg.customCount;

  answerMode = ['visual', 'draw'].includes(msg.answerMode) ? msg.answerMode : 'text';

  const s = msg.settings || {};
  visualSubMode = ['pixel', 'zoom'].includes(s.visualSubMode) ? s.visualSubMode : 'normal';
  if (s.draw && typeof drawApplySettings === 'function') drawApplySettings(s.draw);
  syncModeUI();
  writeTitleMode = !!s.writeTitleMode;
  guessGameMode = false; // option removed from the Rules box
  handicapShowGameLabel = !!s.handicapShowGameLabel;
  handicapGameHint = !!s.handicapGameHint;
  clipChallenge = !!s.clipChallenge;
  answerCountOverride = s.answerCount && s.answerCount !== 4 ? s.answerCount : null;
  timeChallenge = Object.keys(ROUND_DURATIONS_BY_KEY).find((k) => ROUND_DURATIONS_BY_KEY[k] === s.durationMs) || null;

  syncModifierButtons();

  renderGameMenu();
  updateTotalCount();
  updateTimeEstimate();
  updateScoreMultiplierDisplay();
  updateMainTitle();
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

el.mpResumeSessionBtn.addEventListener('click', async () => {
  const saved = loadMpSession();
  if (!saved) return;
  mpShowLobbyError('');
  el.mpNameInput.value = saved.name;
  try {
    await mpConnect();
    mpSend({ type: 'join', code: saved.code, name: saved.name, clientId: mpClientId });
  } catch (e) {
    mpShowLobbyError(t('mp_err_connect'));
  }
});

el.mpSyncToggle.addEventListener('click', () => {
  if (!mpIsHost) return;
  mpSend({ type: 'setSyncMode', enabled: !mpSyncMode });
});

{
  const savedMpSession = loadMpSession();
  if (savedMpSession) {
    el.mpResumeSessionBtn.hidden = false;
    el.mpNameInput.value = savedMpSession.name;
  }
}

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
  if (answerMode === 'draw') {
    drawStartMultiplayer();
    return;
  }
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
      answerMode,
      visualSubMode,
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
  clearMpSession();
  el.mpResumeSessionBtn.hidden = true;
  mpShowJoinCreateForm();
});

function mpLeaveRoom() {
  mpSend({ type: 'leave' });
  if (mpSocket) {
    mpSocket.close();
    mpSocket = null;
  }
  mpActive = false;
  mpPaused = false;
  el.pauseOverlay.hidden = true;
  mpRoom = null;
  mpIsHost = false;
  mpPlayers = [];
  clearMpSession();
  el.mpResumeSessionBtn.hidden = true;
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
    clipChallenge, answerCountOverride, timeChallenge, answerMode, visualSubMode,
    selectedGames: new Set(selectedGames),
  };

  writeTitleMode = !!s.writeTitleMode;
  guessGameMode = false; // option removed from the Rules box
  handicapShowGameLabel = !!s.handicapShowGameLabel;
  handicapGameHint = !!s.handicapGameHint;
  clipChallenge = !!s.clipChallenge;
  answerMode = s.answerMode === 'visual' ? 'visual' : 'text';
  visualSubMode = ['pixel', 'zoom'].includes(s.visualSubMode) ? s.visualSubMode : 'normal';
  syncModeUI();
  updateMainTitle();
  answerCountOverride = s.answerCount && s.answerCount !== 4 ? s.answerCount : null;
  timeChallenge = null; // duration is taken directly from settings.durationMs in mpHandleRound
  mpSettings = s;
}

function mpRestorePreGameModifiers() {
  if (!mpPreGameModifiers) return;
  ({ writeTitleMode, guessGameMode, handicapShowGameLabel, handicapGameHint, clipChallenge, answerCountOverride, timeChallenge, answerMode, visualSubMode } = mpPreGameModifiers);
  selectedGames = new Set(mpPreGameModifiers.selectedGames);
  syncModeUI();
  renderGameMenu();
  updateTotalCount();
  updateMainTitle();
  mpPreGameModifiers = null;
}

async function beginMpGame() {
  pauseRequested = false;
  isPaused = false;
  mpPaused = false;
  el.pauseBtn.hidden = !mpIsHost;
  el.pauseBtn.textContent = t('btn_pause');
  el.pauseBtn.classList.remove('queued', 'paused');
  el.pauseOverlay.hidden = true;
  el.pauseResumeBtn.hidden = false;
  el.answersGrid.hidden = false;
  el.textAnswer.hidden = true;
  el.gameAnswer.hidden = true;
  updateComboDisplay();
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

/* ---------- Multiplayer pause: server-driven, freezes timer + audio for
   everyone at once (host-triggered, or automatic in sync mode when a player
   disconnects). Resume shifts the round's startTime forward by the pause
   duration and re-broadcasts it, so the timer/audio restart in sync without
   touching whoever had already answered before the pause. ---------- */

function mpHandlePaused(msg) {
  mpPaused = true;
  if (player && typeof player.pauseVideo === 'function') player.pauseVideo();
  el.hpFill.style.transition = 'none';
  el.pauseOverlay.hidden = false;
  el.pauseOverlay.querySelector('p').textContent =
    msg.reason === 'sync' ? t('mp_pause_sync_wait') : t('mp_pause_manual');
  el.pauseResumeBtn.hidden = !(mpIsHost && msg.reason === 'manual');
  el.pauseBtn.textContent = t('btn_resume');
  el.pauseBtn.classList.add('paused');
}

function mpHandleResume(msg) {
  mpPaused = false;
  el.pauseOverlay.hidden = true;
  el.pauseBtn.textContent = t('btn_pause');
  el.pauseBtn.classList.remove('paused');

  roundStartTime = msg.startTime;
  const duration = msg.durationMs || 15000;
  const elapsed = Math.max(0, Date.now() - msg.startTime);
  const remaining = Math.max(0, duration - elapsed);

  if (answerLocked) {
    /* This player had already answered (or timed out) before the pause:
       nothing left to resume for them, just wait for the reveal broadcast. */
    return;
  }

  resetTimerBar(remaining, elapsed);
  el.replayClipBtn.hidden = !clipChallenge;
  const track = playlist[currentIndex];
  if (!track) return;
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
    comboStreak++;
    pointsEarned = Math.round(getPointsPerCorrectAnswer() * getSpeedFactor() * getComboMultiplier());
  } else {
    comboStreak = 0;
  }
  mpAnsweredCorrect = correct;
  mpAnsweredPoints = pointsEarned;
  updateComboDisplay();

  mpSend({ type: 'answer', index: currentIndex, correct, points: pointsEarned });

  function markSelected(buttons, dataKey) {
    buttons.forEach((btn) => {
      btn.disabled = true;
      if (btn.dataset[dataKey] === (dataKey === 'title' ? selectedTitle : selectedGameId)) {
        btn.classList.add('mp-selected');
      }
    });
  }

  if (showsImageChoices()) {
    markSelected(el.visualAnswersGrid.querySelectorAll('.visual-answer-btn'), 'title');
  } else if (writeTitleMode) {
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

  if (showsImageChoices()) {
    markButtons(el.visualAnswersGrid.querySelectorAll('.visual-answer-btn'), track.title, 'title');
  } else if (writeTitleMode) {
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
    comboStreak = 0;
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
  updateComboDisplay();

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
  mpPaused = false;
  el.pauseOverlay.hidden = true;
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
