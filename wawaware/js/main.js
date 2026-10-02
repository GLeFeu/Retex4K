// Interface HTML (menus, galerie, réglages micro) + démarrage
const INPUT_ORDER = ['souris', 'curseur', 'molette', 'clavier', 'micro'];

const store = {
  get(k, def) { try { const v = localStorage.getItem(k); return v === null ? def : v; } catch { return def; } },
  set(k, v) { try { localStorage.setItem(k, String(v)); } catch { /* stockage indisponible */ } },
};

const UI = {
  el: (id) => document.getElementById(id),
  filter: 'tous',
  previews: {},     // id du jeu -> <canvas> d'aperçu (généré une seule fois)
  previewQueue: [],

  show(name) {
    for (const n of ['menu', 'gallery', 'gameover', 'lobby', 'podium', 'settings']) this.el(n).classList.toggle('hidden', n !== name);
  },

  gameOver(score) {
    let best = Number(store.get('micromania-best', 0));
    if (!Engine.practiceId && score > best) { best = score; store.set('micromania-best', score); }
    this.el('final-score').textContent = `${score} mini-jeu${score > 1 ? 'x' : ''} réussi${score > 1 ? 's' : ''}`;
    this.el('best-score').textContent = `Record : ${best}`;
    this.show('gameover');
  },

  // Appelé à chaque image tant que le menu est affiché : jauge micro + texte entendu
  tick() {
    if (!Input.mic.enabled) return;
    this.el('mic-meter').style.width = `${Math.round(Input.mic.level * 100)}%`;
    this.el('voice-heard').textContent = Voice.status();
  },

  // ----- Galerie -----
  openGallery() {
    this.buildFilters();
    this.buildGallery();
    this.show('gallery');
  },

  buildFilters() {
    const box = this.el('gallery-filters');
    box.innerHTML = '';
    for (const key of ['tous', ...INPUT_ORDER, 'duo']) {
      const count = key === 'tous' ? Engine.games.length : key === 'duo' ? Engine.games.filter(gm => gm.duo).length : Engine.games.filter(gm => gm.input === key && !gm.duo).length;
      if (!count) continue;
      const b = document.createElement('button');
      b.textContent = key === 'tous' ? `Tous (${count})` : key === 'duo' ? `🤝 DUO (${count})` : `${INPUTS[key].icon} ${INPUTS[key].label} (${count})`;
      b.classList.toggle('on', this.filter === key);
      b.onclick = () => { this.filter = key; this.buildFilters(); this.buildGallery(); };
      box.appendChild(b);
    }
  },

  lockReason(game) {
    if (game.needsVoice) {
      if (!Voice.supported) return '🎤 ouvre le jeu via lancer.bat';
      if (Voice.loading) return '🎤 chargement…';
      if (!Voice.ready()) return Voice.error ? '🎤 erreur (voir menu)' : '🎤 micro requis';
    }
    if (game.needsMic && !Input.mic.enabled) return '🎤 micro requis';
    return '';
  },

  buildGallery() {
    const grid = this.el('gallery-grid');
    grid.innerHTML = '';
    this.previewQueue = [];
    const games = Engine.games
      .filter(gm => this.filter === 'tous' || (this.filter === 'duo' ? gm.duo : gm.input === this.filter && !gm.duo))
      .sort((a, b) => INPUT_ORDER.indexOf(a.input) - INPUT_ORDER.indexOf(b.input));

    for (const game of games) {
      const lock = this.lockReason(game);
      const card = document.createElement('div');
      card.className = 'card' + (lock ? ' locked' : '');
      card.title = lock ? 'Active le micro dans le menu' : `Jouer à « ${game.name} »`;
      const slot = document.createElement('div');
      slot.className = 'thumb';
      if (this.previews[game.id]) slot.appendChild(this.previews[game.id]);
      else this.previewQueue.push({ game, slot });
      card.appendChild(slot);
      card.insertAdjacentHTML('beforeend', `
        <div class="info">
          <div class="title">${game.icon} ${game.name}</div>
          <div class="meta">${INPUTS[game.input].icon} ${INPUTS[game.input].label} · ${game.hint}</div>
        </div>
        ${lock ? `<span class="lock">${lock}</span>` : '<span class="play">▶ JOUER</span>'}
        ${game.apercu ? '<span class="lock" style="left:auto;right:8px;top:auto;bottom:62px;background:#7b2cbf">🎨 essai de style</span>' : ''}`);
      card.onclick = async () => {
        if (lock) {
          await this.enableMic();
          this.buildGallery();
          return;
        }
        Sfx.ctx();
        this.show(null);
        Engine.startRun({ practiceId: game.id, level: Number(this.el('gallery-level').value) });
      };
      grid.appendChild(card);
    }
    this.pumpPreviews();
  },

  // Les aperçus sont dessinés quelques-uns à la fois pour ne pas figer la page
  pumpPreviews() {
    const batch = this.previewQueue.splice(0, 4);
    for (const { game, slot } of batch) {
      const cv = this.previews[game.id] || (this.previews[game.id] = Engine.preview(game));
      slot.appendChild(cv);
    }
    if (this.previewQueue.length) setTimeout(() => this.pumpPreviews(), 0);
  },

  // ----- Micro + reconnaissance vocale -----
  async enableMic() {
    const status = this.el('mic-status');
    try {
      await Input.enableMic();
      this.el('btn-mic').textContent = '🎤 Micro activé';
      this.el('btn-mic').classList.add('on');
      this.el('mic-panel').classList.remove('hidden');
      status.textContent = 'Micro activé. Règle la sensibilité si la jauge bouge sans que tu parles.';
      await Voice.begin(Sfx.ctx(), Input.mic.source);
      // la voix vient d'être prête (ou en erreur) : la galerie déverrouille ses jeux tout de suite
      if (!this.el('gallery').classList.contains('hidden')) this.buildGallery();
      if (!Voice.supported) status.textContent = 'Micro activé. Pour les jeux à la voix, ouvre le jeu avec lancer.bat.';
    } catch (err) {
      status.textContent = '⚠ ' + (err.message || 'Accès au micro refusé');
    }
  },
};

UI.el('btn-play').onclick = () => { Sfx.ctx(); UI.show(null); Engine.startRun(); };
UI.el('btn-gallery').onclick = () => { Sfx.ctx(); UI.openGallery(); };
UI.el('btn-back').onclick = () => UI.show('menu');
UI.el('btn-mic').onclick = () => UI.enableMic();
UI.el('btn-retry').onclick = () => { UI.show(null); Engine.startRun(); };
UI.el('btn-menu').onclick = () => { Engine.quit(); };
UI.el('gallery-level').oninput = (e) => { UI.el('gallery-level-val').textContent = Number(e.target.value) + 1; };

const sens = UI.el('mic-sens');
sens.value = store.get('micromania-sens', 1);
Input.mic.sensitivity = Number(sens.value);
sens.oninput = () => { Input.mic.sensitivity = Number(sens.value); store.set('micromania-sens', sens.value); };

// ----- Réglages : volumes + couleur du curseur -----
const CURSOR_COLORS = ['#ff3c6e', '#3a86ff', '#06d6a0', '#ffd400', '#9d4edd', '#fb8500', '#4cc9f0', '#ff6b9d', '#80ed99', '#e5e5e5', '#c77dff', '#1a1a1a'];

UI.cursorColor = () => store.get('wawaware-couleur', '#ff3c6e');

UI.setCursorColor = (c) => {
  store.set('wawaware-couleur', c);
  if (Net.room) Net.send({ t: 'couleur', couleur: c });
  UI.renderSwatches();
};

UI.renderSwatches = () => {
  for (const box of document.querySelectorAll('[data-swatches]')) {
    box.innerHTML = '';
    for (const c of CURSOR_COLORS) {
      const sw = document.createElement('span');
      sw.className = 'swatch' + (c === UI.cursorColor() ? ' on' : '');
      sw.style.background = c;
      sw.title = c;
      sw.onclick = () => UI.setCursorColor(c);
      box.appendChild(sw);
    }
  }
};

// curseurs de volume : présents dans les Réglages ET dans le salon multijoueur, toujours synchronisés
UI.syncVolumes = () => {
  for (const kind of ['sfx', 'music']) {
    const v = kind === 'sfx' ? Sfx.volume : Sfx.musicVolume;
    document.querySelectorAll(`[data-vol="${kind}"]`).forEach(el => { el.value = v; });
    document.querySelectorAll(`[data-vol-val="${kind}"]`).forEach(el => { el.textContent = Math.round(v * 100) + '%'; });
  }
};
document.querySelectorAll('[data-vol]').forEach(el => {
  const kind = el.dataset.vol;
  el.oninput = () => { Sfx.setVolume(kind, Number(el.value)); UI.syncVolumes(); };
  if (kind === 'sfx') el.onchange = () => Sfx.win(); // petit son pour entendre le niveau
});
UI.syncVolumes();

// nombre de cœurs : solo (réglages) et multijoueur (choisi par l'hôte)
const fillHearts = (sel, value) => {
  sel.innerHTML = '';
  for (let n = 1; n <= 9; n++) sel.add(new Option(`${n} ${'♥'.repeat(Math.min(n, 5))}${n > 5 ? '…' : ''}`, n, false, n === value));
};
UI.soloLives = () => Math.max(1, Math.min(9, Number(store.get('wawaware-coeurs', 4)) || 4));
fillHearts(UI.el('solo-coeurs'), UI.soloLives());
UI.el('solo-coeurs').onchange = (e) => store.set('wawaware-coeurs', e.target.value);
fillHearts(UI.el('sel-coeurs'), 4);
UI.el('sel-coeurs').onchange = (e) => Net.send({ t: 'options', coeurs: Number(e.target.value) });
UI.el('btn-settings').onclick = () => { Sfx.ctx(); UI.renderSwatches(); UI.show('settings'); };
UI.el('btn-settings-back').onclick = () => UI.show('menu');
UI.renderSwatches();

// ----- Salon multijoueur -----
const Lobby = {
  msg(text) { UI.el(Net.room ? 'room-msg' : 'lobby-msg').textContent = text; },

  open(code = '') {
    Sfx.ctx();
    UI.show('lobby');
    UI.syncVolumes();
    const pseudo = UI.el('pseudo');
    if (!pseudo.value) pseudo.value = store.get('wawaware-pseudo', '') || `Joueur${Math.floor(Math.random() * 90 + 10)}`;
    if (code) UI.el('code-salle').value = code;
    this.render();
    Net.wake();
    if (!Net.available()) this.msg('⚠ Le multijoueur a besoin du serveur : lance le jeu avec lancer.bat (ou depuis le site).');
  },

  async join(code) {
    const nom = UI.el('pseudo').value.trim();
    if (!nom) { this.msg('Choisis un pseudo d\'abord.'); return; }
    store.set('wawaware-pseudo', nom);
    // jusqu'à ~1 min d'essais : le serveur en ligne peut être en train de se réveiller
    let ok = false;
    for (let essai = 1; essai <= 5 && !ok; essai++) {
      this.msg(essai === 1 ? 'Connexion…' : `Le serveur se réveille, encore un instant… (essai ${essai}/5)`);
      try { await Net.connect(); ok = true; } catch { if (essai < 5) await new Promise(r => setTimeout(r, 3000)); }
    }
    if (!ok) { this.msg('⚠ Impossible de joindre le serveur multijoueur. Réessaie dans une minute.'); return; }
    this.msg('');
    Net.send({ t: 'rejoindre', nom, salle: code, couleur: UI.cursorColor(), version: `${WAWAWARE_VERSION}/${Engine.games.length}` });
  },

  leave() {
    Net.send({ t: 'quitter' });
    Net.room = null;
    history.replaceState(null, '', location.pathname);
    this.render();
  },

  render() {
    const room = Net.room;
    UI.el('lobby-join').classList.toggle('hidden', !!room);
    UI.el('lobby-room').classList.toggle('hidden', !room);
    if (!room) return;
    UI.el('room-code').textContent = room.code;
    const list = UI.el('room-players');
    list.innerHTML = '';
    for (const j of room.joueurs) {
      const li = document.createElement('li');
      if (j.id === Net.id) li.className = 'me';
      let tag = '';
      if (room.etat === 'jeu') tag = j.enJeu ? (j.vivant ? '♥'.repeat(j.vies) : '👻 éliminé') : 'attend la prochaine partie';
      li.innerHTML = `<span class="dot" style="background:${j.couleur}"></span>${room.hote === j.id ? '👑 ' : ''}<span></span><span class="tagline">${tag}</span>`;
      li.children[1].textContent = j.nom + (j.id === Net.id ? ' (toi)' : '');
      list.appendChild(li);
    }
    const host = Net.isHost(), idle = room.etat === 'salon';
    const chk = UI.el('chk-micro');
    chk.checked = room.micro;
    chk.disabled = !host || !idle;
    const selH = UI.el('sel-coeurs');
    selH.value = room.coeurs || 4;
    selH.disabled = !host || !idle;
    UI.el('btn-launch').classList.toggle('hidden', !host || !idle);
    const me = Net.me();
    let text = '';
    if (!idle) text = me && me.enJeu ? 'Partie en cours…' : 'Une partie est en cours : tu joueras à la prochaine.';
    else if (!host) text = 'En attente du lancement par l\'hôte 👑';
    else text = room.joueurs.length < 2 ? 'Partage le code ou le lien à tes amis ! (tu peux aussi lancer seul pour tester)' : `${room.joueurs.length} joueurs prêts !`;
    if (room.micro && !Input.mic.enabled) text += ' — 🎤 Active ton micro (bouton ci-dessous) pour les jeux au micro.';
    UI.el('room-msg').textContent = text;
    UI.el('btn-room-mic')?.remove();
    if (room.micro && !Input.mic.enabled) {
      const b = document.createElement('button');
      b.id = 'btn-room-mic'; b.className = 'small'; b.textContent = '🎤 Activer mon micro';
      b.onclick = async () => { await UI.enableMic(); this.render(); };
      UI.el('room-msg').after(b);
    }
  },

  showPodium(ranking) {
    const ol = UI.el('podium-list');
    ol.innerHTML = '';
    const medals = ['🥇', '🥈', '🥉'];
    for (const r of ranking) {
      const li = document.createElement('li');
      li.innerHTML = `<span class="rank">${medals[r.rang - 1] || r.rang + 'e'}</span><span class="dot" style="display:inline-block;width:16px;height:16px;border-radius:50%;border:2px solid #1a1a1a;background:${r.couleur}"></span><span></span><span class="pts">${r.score} réussi${r.score > 1 ? 's' : ''}</span>`;
      li.children[2].textContent = r.nom + (r.id === Net.id ? ' (toi)' : '');
      ol.appendChild(li);
    }
    UI.show('podium');
  },
};

Net.on('salle', (room) => {
  history.replaceState(null, '', `${location.pathname}?salle=${room.code}`);
  if (!Engine.multi) Lobby.render();
});
Net.on('erreur', (t) => Lobby.msg('⚠ ' + t));
Net.on('fin', (ranking) => Lobby.showPodium(ranking));
Net.on('deconnecte', () => {
  if (Engine.multi) { Engine.multi = null; Engine.setState('menu'); }
  if (!UI.el('lobby').classList.contains('hidden') || Engine.state === 'menu') {
    UI.show('lobby');
    Lobby.render();
    Lobby.msg('⚠ Connexion au serveur perdue.');
  }
});

UI.el('btn-multi').onclick = () => Lobby.open();
UI.el('btn-create').onclick = () => Lobby.join('');
UI.el('btn-join').onclick = () => {
  const code = UI.el('code-salle').value.trim().toUpperCase();
  if (code.length !== 4) { Lobby.msg('Le code de salle fait 4 lettres.'); return; }
  Lobby.join(code);
};
UI.el('code-salle').onkeydown = (e) => { if (e.key === 'Enter') UI.el('btn-join').click(); };
UI.el('btn-leave').onclick = () => Lobby.leave();
UI.el('btn-lobby-back').onclick = () => { if (Net.room) Lobby.leave(); UI.show('menu'); };
UI.el('btn-launch').onclick = () => { Sfx.ctx(); Net.send({ t: 'lancer' }); };
UI.el('chk-micro').onchange = (e) => Net.send({ t: 'options', micro: e.target.checked });
UI.el('btn-copy').onclick = async () => {
  const link = `${location.origin}${location.pathname}?salle=${Net.room.code}`;
  try { await navigator.clipboard.writeText(link); Lobby.msg('Lien copié : ' + link); } catch { Lobby.msg(link); }
};
UI.el('btn-podium-back').onclick = () => { UI.show('lobby'); Lobby.render(); };

UI.el('mic-status').textContent = 'Sans micro, les mini-jeux au micro sont simplement retirés.';
Engine.init();

// lien d'invitation : ?salle=ABCD ouvre directement le salon
const invite = new URLSearchParams(location.search).get('salle');
if (invite) Lobby.open(invite.toUpperCase());
