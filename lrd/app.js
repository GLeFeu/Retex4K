'use strict';
/* ===== Left Right Dilemma — client =====
   3 dilemmes par manche. Charlie choisit G/D en silence.
   Les autres devinent dans quel chalet (1-8) il atterrit.
   Connexion WebSocket à /lrd sur le serveur.
   ========================================= */

/* ---------- Config ---------- */
function wsUrl() {
  const p = new URLSearchParams(location.search).get('srv');
  if (p) return p;
  if (location.hostname === 'localhost' || location.hostname === '127.0.0.1')
    return 'ws://' + location.host + '/lrd';
  return 'wss://retex4k.onrender.com/lrd';
}
const SERVER = wsUrl();

const CATS = [
  { id:'normal',  em:'🎲', label:'Normal',    desc:'Quotidien, goûts, vie' },
  { id:'fun',     em:'😂', label:'Fun',        desc:'Gênant & social' },
  { id:'18plus',  em:'🔞', label:'18+',        desc:'Pour adultes' },
  { id:'wtf',     em:'🌀', label:'WTF',        desc:'Bizarre & surréaliste' },
  { id:'extreme', em:'☠️', label:'Extrême',    desc:'Vraiment difficile' },
];
const CHALETS = ['🏠','🏡','🏘','🛖','⛺','🏕','🌲','🏔'];

/* ---------- État global ---------- */
let ws = null;
let state = {
  phase: 'accueil',  // accueil|salon|charlie_actif|charlie_attend|vote|revelation|fin
  myId: null,
  myNom: '',
  code: '',
  hote: '',
  joueurs: [],
  categories: ['normal','fun'],
  manches: 6,
  mancheActuelle: 0,
  mancheTotal: 6,
  charlieId: '',
  charlieNom: '',
  dilemmes: [],      // [{id,c,g,d}]
  picks: [],         // mes choix perso (Charlie) ['gauche'|'droite']
  monVote: 0,        // mon vote chalet (1-8)
  avecTimer: true,   // minuterie activée
  timerEnd: 0,       // timestamp fin timer
  nbVotes: 0,
  nbEligibles: 0,
  scoreGroupe: 0,
  // révélation
  revChemin: [],
  revChalet: 0,
  revVoteGroupe: 0,
  revCorrect: false,
  revVotes: {},
  revJoueurs: [],
  // fin
  finScore: 0,
  finMax: 0,
  finMessage: '',
  finJoueurs: [],
};

/* ---------- Utilitaires ---------- */
const app   = document.getElementById('app');
const toastEl = document.getElementById('toast');
let toastT;
function toast(msg, dur=1800) {
  toastEl.textContent = msg;
  toastEl.classList.add('show');
  clearTimeout(toastT);
  toastT = setTimeout(() => toastEl.classList.remove('show'), dur);
}
function esc(s) { return String(s||'').replace(/[&<>"]/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])); }
function fmt(s) { s=Math.max(0,Math.floor(s||0)); return Math.floor(s/60)+':'+String(s%60).padStart(2,'0'); }
function isHost() { return state.myId === state.hote; }
function isCharlie() { return state.myId === state.charlieId; }

/* ---------- Connexion WebSocket ---------- */
function connect() {
  if (ws) ws.close();
  ws = new WebSocket(SERVER);
  ws.addEventListener('message', e => { try { handle(JSON.parse(e.data)); } catch(_){} });
  ws.addEventListener('close', () => {
    if (!['accueil','fin'].includes(state.phase)) toast('Déconnecté, reconnexion…');
    setTimeout(reconnect, 2000);
  });
  ws.addEventListener('error', () => {});
}
function reconnect() {
  if (state.code && state.myNom) {
    connect();
    ws.addEventListener('open', () => {
      send({ t:'rejoindre', code:state.code, nom:state.myNom });
    });
  } else {
    state.phase = 'accueil';
    render();
  }
}
function send(m) { if (ws && ws.readyState===1) ws.send(JSON.stringify(m)); }

/* ---------- Gestion messages serveur ---------- */
function handle(m) {
  switch (m.t) {
    case 'bienvenue':
      state.myId = m.id;
      state.code = m.code;
      state.hote = m.hote;
      state.phase = 'salon';
      render();
      break;

    case 'salle':
      state.hote = m.hote;
      state.joueurs = m.joueurs || [];
      state.categories = m.categories || state.categories;
      state.manches = m.manches || state.manches;
      if (typeof m.avecTimer === 'boolean') state.avecTimer = m.avecTimer;
      if (state.phase !== 'accueil') render();
      break;

    case 'manche':
      state.phase = m.charlie.id === state.myId ? 'charlie_actif' : 'charlie_attend';
      state.mancheActuelle = m.num;
      state.mancheTotal = m.total;
      state.charlieId = m.charlie.id;
      state.charlieNom = m.charlie.nom;
      state.dilemmes = m.dilemmes;
      state.picks = [];
      state.monVote = 0;
      state.timerEnd = m.tDebut + m.dureeMs;
      state.scoreGroupe = 0;
      render(); startTimer();
      break;

    case 'vote_debut':
      state.phase = isCharlie() ? 'vote_charlie' : 'vote';
      state.timerEnd = m.tDebut + m.dureeMs;
      state.nbVotes = 0;
      render(); startTimer();
      break;

    case 'votes_update':
      state.nbVotes = m.nb;
      state.nbEligibles = m.total;
      document.getElementById('voteCount') && (document.getElementById('voteCount').textContent = `${m.nb} / ${m.total} ont voté`);
      break;

    case 'revelation':
      clearTimer();
      state.phase = 'revelation';
      state.revChemin = m.chemin;
      state.revChalet = m.chalet;
      state.revVoteGroupe = m.voteGroupe;
      state.revCorrect = m.correct;
      state.scoreGroupe = m.scoreGroupe;
      state.revVotes = m.votes || {};
      state.revJoueurs = m.joueurs || [];
      render();
      break;

    case 'fin':
      clearTimer();
      state.phase = 'fin';
      state.finScore = m.scoreGroupe;
      state.finMax = m.max;
      state.finMessage = m.message;
      state.finJoueurs = m.joueurs || [];
      render();
      break;

    case 'erreur':
      toast('⚠ ' + m.texte, 3000);
      break;
  }
}

/* ---------- Timer ---------- */
let timerInterval;
function startTimer() { clearTimer(); timerInterval = setInterval(tickTimer, 500); }
function clearTimer() { clearInterval(timerInterval); }
function tickTimer() {
  if (!state.avecTimer) return;
  const rem = Math.max(0, (state.timerEnd - Date.now()) / 1000);
  const bar = document.querySelector('.timer-bar i');
  const txt = document.querySelector('.timer-text');
  const total = (state.phase.startsWith('charlie') ? 45 : 90);
  if (bar) bar.style.width = (rem / total * 100) + '%';
  if (txt) txt.textContent = fmt(rem);
  if (rem <= 0) clearTimer();
}

/* ---------- Rendu principal ---------- */
function render() {
  switch (state.phase) {
    case 'accueil':      app.innerHTML = renderAccueil(); bindAccueil(); break;
    case 'salon':        app.innerHTML = renderSalon();   bindSalon();   break;
    case 'charlie_actif':app.innerHTML = renderCharlieActif(); bindCharlieActif(); break;
    case 'charlie_attend':app.innerHTML = renderCharlieAttend(); break;
    case 'vote_charlie': app.innerHTML = renderVoteCharlie(); break;
    case 'vote':         app.innerHTML = renderVote(); bindVote(); break;
    case 'revelation':   app.innerHTML = renderRevelation(); bindRevelation(); break;
    case 'fin':          app.innerHTML = renderFin(); bindFin(); break;
  }
  tickTimer();
}

/* =========== ÉCRANS =========== */

/* ---- Accueil ---- */
function renderAccueil() {
  return `<div class="screen">
    <div class="hero">
      <div class="logo-lrd"><span class="arr-l">←</span><span class="mid">LRD</span><span class="arr-r">→</span></div>
      <div style="font-family:var(--display);font-weight:800;font-size:22px;margin-top:6px">Left Right Dilemma</div>
      <p>Gauche ou droite ? Connais-tu vraiment tes amis ?</p>
    </div>
    <hr class="sep">
    <div class="fld"><label>Ton pseudo</label>
      <input class="txt" id="nomInput" maxlength="20" placeholder="Entre ton nom…" value="${esc(state.myNom)}" autocomplete="off"></div>
    <div class="join-grid">
      <div class="card" style="display:flex;flex-direction:column;gap:12px">
        <div class="eyebrow">Créer une salle</div>
        <button class="btn primary block" id="createBtn">Créer ✨</button>
      </div>
      <div class="card" style="display:flex;flex-direction:column;gap:12px">
        <div class="eyebrow">Rejoindre</div>
        <input class="txt code-input" id="codeInput" maxlength="4" placeholder="CODE" autocomplete="off">
        <button class="btn block" id="joinBtn">Rejoindre →</button>
      </div>
    </div>
    <div class="card" style="display:flex;flex-direction:column;gap:10px">
      <div class="eyebrow">Comment jouer</div>
      <p class="small muted">Chaque tour, un joueur (<b>Charlie</b>) répond en silence à 3 dilemmes en choisissant <span style="color:var(--lft);font-weight:700">← Gauche</span> ou <span style="color:var(--rgt);font-weight:700">Droite →</span>. Les autres discutent ensemble pour deviner dans quel chalet (1-8) Charlie a atterri. Score de groupe = combien vous vous connaissez.</p>
    </div>
  </div>`;
}
function bindAccueil() {
  const nomI = document.getElementById('nomInput');
  nomI.focus();
  nomI.addEventListener('input', () => { state.myNom = nomI.value.trim(); });
  document.getElementById('createBtn').onclick = () => {
    if (!state.myNom) { toast('Entre ton pseudo d\'abord'); return; }
    connect();
    ws.addEventListener('open', () => send({ t:'rejoindre', nom:state.myNom }), { once:true });
  };
  document.getElementById('joinBtn').onclick = () => {
    const code = document.getElementById('codeInput').value.trim().toUpperCase();
    if (!state.myNom) { toast('Entre ton pseudo d\'abord'); return; }
    if (code.length !== 4) { toast('Code de 4 lettres requis'); return; }
    connect();
    ws.addEventListener('open', () => send({ t:'rejoindre', code, nom:state.myNom }), { once:true });
  };
  document.getElementById('codeInput').addEventListener('keydown', e => {
    if (e.key === 'Enter') document.getElementById('joinBtn').click();
  });
}

/* ---- Salon ---- */
function renderSalon() {
  const waiting = state.joueurs.length < 2;
  const playersHtml = state.joueurs.map(j => `
    <div class="player-chip${j.id===state.hote?' host':''}">
      <div class="player-dot" style="background:${strColor(j.nom)}"></div>
      <span class="pn">${esc(j.nom)}${j.id===state.hote?' 👑':''}</span>
    </div>`).join('');

  const catsHtml = isHost() ? `
    <div class="eyebrow">Catégories</div>
    <div class="cats-grid">${CATS.map(c=>`
      <button class="cat-btn${state.categories.includes(c.id)?' on':''}" data-cat="${c.id}">
        <span>${c.em}</span>${esc(c.label)}
      </button>`).join('')}
    </div>
    <div class="rounds-row" style="margin-top:12px">
      <span class="label">Manches :</span>
      <button class="rnd-btn" id="rndMinus">−</button>
      <span class="rnd-val" id="rndVal">${state.manches}</span>
      <button class="rnd-btn" id="rndPlus">+</button>
    </div>
    <div class="timer-row">
      <span class="label">⏱ Minuterie :</span>
      <button class="toggle-btn${state.avecTimer?' on':''}" id="timerToggle">
        ${state.avecTimer ? 'Activée' : 'Désactivée'}
      </button>
    </div>` : `<p class="muted small">Seul l'hôte peut choisir les réglages.</p>`;

  return `<div class="screen">
    <div class="room-header">
      <div>
        <div class="eyebrow">Code de la salle</div>
        <div class="room-code" id="codeCopy">${esc(state.code)}</div>
      </div>
      <div class="badge">${state.joueurs.length} joueur${state.joueurs.length>1?'s':''}</div>
    </div>
    <div class="card">
      <div class="eyebrow" style="margin-bottom:10px">Joueurs</div>
      <div class="players-grid">${playersHtml}</div>
    </div>
    ${isHost() ? `<div class="card">${catsHtml}</div>` : `<div class="card">${catsHtml}</div>`}
    ${isHost() ? `<button class="btn primary block" id="startBtn" ${waiting?'disabled':''}>
      ${waiting?'En attente d\'un autre joueur…':'⚔️ Lancer la partie'}
    </button>` : `<div class="card" style="text-align:center"><span class="muted">En attente que l'hôte lance la partie…</span></div>`}
  </div>`;
}
function bindSalon() {
  document.getElementById('codeCopy')?.addEventListener('click', () => {
    navigator.clipboard?.writeText(state.code).then(()=>toast('Code copié !')).catch(()=>toast(state.code));
  });
  document.getElementById('startBtn')?.addEventListener('click', () => send({ t:'demarrer' }));
  document.getElementById('timerToggle')?.addEventListener('click', () => {
    state.avecTimer = !state.avecTimer;
    send({ t:'settings', categories:state.categories, manches:state.manches, avecTimer:state.avecTimer });
    render();
  });
  document.querySelectorAll('.cat-btn').forEach(b => {
    b.addEventListener('click', () => {
      const cat = b.dataset.cat;
      if (state.categories.includes(cat)) {
        if (state.categories.length === 1) { toast('Au moins une catégorie !'); return; }
        state.categories = state.categories.filter(c=>c!==cat);
      } else {
        state.categories = [...state.categories, cat];
      }
      send({ t:'settings', categories:state.categories, manches:state.manches, avecTimer:state.avecTimer });
      render();
    });
  });
  document.getElementById('rndMinus')?.addEventListener('click', () => {
    if (state.manches > 3) { state.manches--; send({t:'settings',categories:state.categories,manches:state.manches,avecTimer:state.avecTimer}); render(); }
  });
  document.getElementById('rndPlus')?.addEventListener('click', () => {
    if (state.manches < 20) { state.manches++; send({t:'settings',categories:state.categories,manches:state.manches,avecTimer:state.avecTimer}); render(); }
  });
}

/* ---- Charlie actif ---- */
function renderCharlieActif() {
  const done = state.picks.length;
  const allDone = done === 3;
  const progress = state.avecTimer
    ? `<div class="timer-bar"><i style="width:100%"></i></div><div class="timer-text"></div>`
    : '';

  const dilemmasHtml = state.dilemmes.map((d, i) => {
    const cat = CATS.find(c => c.id === d.c);
    const catLabel = cat ? `${cat.em} ${cat.label}` : '';

    if (i < done) {
      const pick = state.picks[i];
      const isLft = pick === 'gauche';
      return `<div class="dilemma-done-card">
        <span class="dc-num">${i+1}</span>
        <span class="dc-choice ${isLft?'lft':'rgt'}">${isLft?'← ':'→ '}${esc(isLft?d.g:d.d)}</span>
        <span class="dc-check">✓</span>
      </div>`;
    }
    if (i > done) return '';

    return `<div class="dilemma-active">
      <div class="dca-header">
        <span class="dca-cat">${esc(catLabel)}</span>
        <span class="dca-num">Dilemme ${i+1} / 3</span>
      </div>
      <div class="dilemma-split">
        <button class="split-side lft" data-dir="gauche">
          <div class="split-arrow">←</div>
          <div class="split-text">${esc(d.g)}</div>
          <div class="split-label">Gauche</div>
        </button>
        <div class="split-div"><span class="split-vs">VS</span></div>
        <button class="split-side rgt" data-dir="droite">
          <div class="split-arrow">→</div>
          <div class="split-text">${esc(d.d)}</div>
          <div class="split-label">Droite</div>
        </button>
      </div>
    </div>`;
  }).join('');

  return `<div class="screen">
    <div class="charlie-badge">
      <span class="em">🎿</span>
      <div>
        <div style="font-weight:800;font-size:17px">C'est ton tour, Charlie !</div>
        <div class="small muted">Choisis en silence. Les autres ne voient pas tes réponses.</div>
      </div>
    </div>
    <div class="row">
      <div class="eyebrow">Manche ${state.mancheActuelle} / ${state.mancheTotal}</div>
      <span class="badge">${done}/3 choix</span>
    </div>
    ${progress}
    ${dilemmasHtml}
    ${allDone ? `<div class="card" style="text-align:center;padding:20px">
      <div style="font-size:32px;margin-bottom:8px">🏔️</div>
      <div style="font-weight:800;font-size:18px">Tous tes choix sont faits !</div>
      <div class="muted small" style="margin-top:4px">Les autres vont maintenant essayer de deviner ton chemin…</div>
    </div>` : ''}
  </div>`;
}
function bindCharlieActif() {
  document.querySelectorAll('.split-side').forEach(b => {
    b.addEventListener('click', () => {
      const dir = b.dataset.dir;
      if (state.picks.length < 3) {
        // visuellement montrer le choix : highlight côté choisi, griser l'autre
        const card = b.closest('.dilemma-active');
        if (card) {
          card.querySelectorAll('.split-side').forEach(s => {
            s.classList.add(s === b ? 'picked' : 'faded');
          });
        }
        setTimeout(() => {
          state.picks.push(dir);
          send({ t:'choix', dir });
          render(); tickTimer();
        }, 220);
      }
    });
  });
}

/* ---- Attente pendant que Charlie choisit ---- */
function renderCharlieAttend() {
  const timerHtml = state.avecTimer
    ? `<div class="timer-bar"><i style="width:100%"></i></div><div class="timer-text"></div>`
    : '';
  return `<div class="screen">
    <div class="row">
      <div class="eyebrow">Manche ${state.mancheActuelle} / ${state.mancheTotal}</div>
    </div>
    ${timerHtml}
    <div class="wait-anim">
      <div class="mountain-pulse">🏔️</div>
      <div style="font-family:var(--display);font-weight:800;font-size:22px">
        <span style="background:linear-gradient(135deg,var(--a1),var(--a2));-webkit-background-clip:text;background-clip:text;color:transparent">
          ${esc(state.charlieNom)}
        </span> descend la montagne…
      </div>
      <div class="muted small">Silence ! Il/elle choisit ses dilemmes en secret.</div>
    </div>
    <div class="card">
      <div class="eyebrow" style="margin-bottom:10px">Les 3 dilemmes de cette manche</div>
      <div class="dilemma-list">${state.dilemmes.map((d,i)=>`
        <div class="dilemma-row">
          <span class="dnum">${i+1}</span>
          <div class="choices">
            <span class="opt left-opt">← ${esc(d.g)}</span>
            <span class="opt right-opt">${esc(d.d)} →</span>
          </div>
        </div>`).join('')}
      </div>
    </div>
  </div>`;
}

/* ---- Vote (phase discussion) ---- */
function renderVote() {
  const chHtml = CHALETS.map((em,i)=>`
    <button class="chalet-btn${state.monVote===i+1?' voted':''}" data-ch="${i+1}">
      ${i+1}<div class="ch-icon">${em}</div>
    </button>`).join('');
  return `<div class="screen">
    <div class="charlie-badge" style="border-color:var(--warn)">
      <span class="em">🗣</span>
      <div>
        <div style="font-weight:800;font-size:17px">Discussion ! Où est ${esc(state.charlieNom)} ?</div>
        <div class="small muted">Parlez, comparez, puis votez pour un chalet.</div>
      </div>
    </div>
    ${state.avecTimer ? `<div class="timer-bar"><i style="width:100%"></i></div><div class="timer-text"></div>` : ''}
    <div class="card">
      <div class="eyebrow" style="margin-bottom:10px">Les 3 dilemmes</div>
      <div class="dilemma-list">${state.dilemmes.map((d,i)=>`
        <div class="dilemma-row">
          <span class="dnum">${i+1}</span>
          <div class="choices">
            <span class="opt left-opt">← ${esc(d.g)}</span>
            <span class="opt right-opt">${esc(d.d)} →</span>
          </div>
        </div>`).join('')}
      </div>
    </div>
    <div class="mountain-vote card">
      <div class="mv-title">
        ${mountainLegendHtml()}
      </div>
      <div class="chalets-grid" style="margin-top:12px">${chHtml}</div>
      ${state.monVote ? `<div class="vote-count" style="color:var(--accent)">✓ Tu as voté chalet ${state.monVote} ${CHALETS[state.monVote-1]}</div>` : ''}
      <div class="vote-count" id="voteCount">${state.nbVotes} / ${state.nbEligibles} ont voté</div>
    </div>
  </div>`;
}
function mountainLegendHtml() {
  return `<div style="font-size:13px;color:var(--muted);font-weight:600">
    Chemin : <span style="color:var(--lft)">← Gauche</span> = vers les petits numéros,
    <span style="color:var(--rgt)">Droite →</span> = vers les grands
  </div>`;
}
function bindVote() {
  document.querySelectorAll('.chalet-btn').forEach(b => {
    b.addEventListener('click', () => {
      state.monVote = parseInt(b.dataset.ch);
      send({ t:'vote', chalet: state.monVote });
      render(); tickTimer();
    });
  });
}

/* ---- Vue Charlie pendant le vote ---- */
function renderVoteCharlie() {
  const picksHtml = state.picks.map((p,i) => `
    <div class="pick-badge ${p==='gauche'?'lft':'rgt'}">
      ${i+1}. ${p==='gauche'?'← Gauche':'Droite →'}
    </div>`).join('');
  const myChalet = computeChalet(state.picks);
  return `<div class="screen">
    <div class="charlie-badge">
      <span class="em">🎿</span>
      <div>
        <div style="font-weight:800;font-size:17px">Les autres discutent…</div>
        <div class="small muted">Ils essaient de deviner où tu es allé !</div>
      </div>
    </div>
    ${state.avecTimer ? `<div class="timer-bar"><i style="width:100%"></i></div><div class="timer-text"></div>` : ''}
    <div class="vote-charlie-view">
      <div class="small muted" style="margin-bottom:10px">Tes choix (secret jusqu'à la révélation)</div>
      <div class="picks-reveal">${picksHtml}</div>
      <div style="font-family:var(--display);font-weight:800;font-size:32px;margin-top:12px">
        Tu es au chalet ${myChalet} ${CHALETS[myChalet-1]}
      </div>
    </div>
    <div class="card">
      <div class="eyebrow" style="margin-bottom:10px">Les 3 dilemmes que les autres voient</div>
      <div class="dilemma-list">${state.dilemmes.map((d,i)=>`
        <div class="dilemma-row">
          <span class="dnum">${i+1}</span>
          <div class="choices">
            <span class="opt left-opt">← ${esc(d.g)}</span>
            <span class="opt right-opt">${esc(d.d)} →</span>
          </div>
        </div>`).join('')}
      </div>
    </div>
  </div>`;
}

/* ---- Révélation ---- */
function renderRevelation() {
  const correct = state.revCorrect;
  const svgHtml = buildMountainSVG(state.revChemin, state.revChalet, state.revVoteGroupe);

  const ivRows = state.revJoueurs.map(j => {
    if (j.id === state.charlieId) return `
      <div class="iv-row charlie-reveal-row">
        <span class="iv-name">🎿 ${esc(j.nom)} (Charlie)</span>
        <span class="iv-pick" style="background:var(--accent);color:#fff">Chalet ${state.revChalet} ${CHALETS[state.revChalet-1]}</span>
      </div>`;
    const vote = state.revVotes[j.id];
    const ok = vote === state.revChalet;
    return `
      <div class="iv-row ${ok?'iv-ok':'iv-bad'}">
        <span class="iv-name">${esc(j.nom)}</span>
        ${vote ? `<span class="iv-pick" style="background:${ok?'var(--good)':'var(--bad)'};color:#fff">
          ${ok?'✓':''} Chalet ${vote} ${CHALETS[vote-1]}
        </span>` : `<span class="iv-pick" style="background:var(--surface2);color:var(--muted)">N'a pas voté</span>`}
      </div>`;
  }).join('');

  return `<div class="screen">
    <div class="row">
      <div class="eyebrow">Manche ${state.mancheActuelle} / ${state.mancheTotal}</div>
      <div class="badge" style="border-color:${correct?'var(--good)':'var(--bad)'}">
        ${correct ? '✓ Bonne réponse !' : '✗ Raté'}
      </div>
    </div>
    <div class="reveal-result">
      <div class="reveal-emoji">${correct ? '🎉' : '😬'}</div>
      <div class="reveal-title">
        ${esc(state.charlieNom)} était au chalet ${state.revChalet} ${CHALETS[state.revChalet-1]}
      </div>
      <div class="muted small">
        Le groupe avait voté chalet ${state.revVoteGroupe} ${CHALETS[state.revVoteGroupe-1]}
        ${correct ? '— <b style="color:var(--good)">correct !</b>' : '— <b style="color:var(--bad)">faux</b>'}
      </div>
    </div>
    <div class="mountain-svg-wrap card">${svgHtml}</div>
    <div class="card">
      <div class="eyebrow" style="margin-bottom:10px">Le chemin de ${esc(state.charlieNom)}</div>
      <div class="dilemma-list">${state.dilemmes.map((d,i)=>{
        const p=state.revChemin[i], isL=p==='gauche';
        return `<div class="dilemma-row">
          <span class="dnum">${i+1}</span>
          <div class="choices">
            <span class="opt ${isL?'left-opt':''}">← ${esc(d.g)}</span>
            <span style="font-size:11px;color:var(--faint)">→</span>
            <span class="opt ${!isL?'right-opt':''}">  ${esc(d.d)} →</span>
          </div>
          <span class="pick-badge ${isL?'lft':'rgt'}" style="margin-left:auto;flex:none">${isL?'←':'→'}</span>
        </div>`;
      }).join('')}</div>
    </div>
    <div class="card">
      <div class="eyebrow" style="margin-bottom:10px">Votes individuels</div>
      <div class="individual-votes">${ivRows}</div>
    </div>
    <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap">
      <div><div class="score-group">Score groupe</div>
        <div class="score-big">${state.scoreGroupe}/${state.mancheActuelle}</div>
      </div>
      ${isHost() ? `<button class="btn primary" style="margin-left:auto" id="nextBtn">
        ${state.mancheActuelle >= state.mancheTotal ? 'Voir le résultat 🏆' : 'Manche suivante →'}
      </button>` : `<div class="muted small" style="margin-left:auto">En attente de l'hôte…</div>`}
    </div>
  </div>`;
}
function bindRevelation() {
  document.getElementById('nextBtn')?.addEventListener('click', () => send({ t:'suivant' }));
}

/* ---- Fin ---- */
function renderFin() {
  const podHtml = state.finJoueurs.map((j,i) => `
    <div class="pod-row">
      <span class="pod-pos">${['🥇','🥈','🥉'][i]||i+1}</span>
      <span class="pod-name">${esc(j.nom)}</span>
      <span class="pod-pts">${j.points} pts</span>
    </div>`).join('');
  return `<div class="screen">
    <div style="text-align:center;padding:16px 0 8px">
      <div style="font-size:60px">🏔️</div>
      <h2 style="font-size:28px;margin-top:10px">Partie terminée !</h2>
    </div>
    <div class="card" style="text-align:center">
      <div class="score-group">Score du groupe</div>
      <div class="score-big">${state.finScore} / ${state.finMax}</div>
      <div style="font-size:20px;font-weight:700;margin-top:8px">${esc(state.finMessage)}</div>
    </div>
    <div class="card">
      <div class="eyebrow" style="margin-bottom:12px">Meilleurs connaisseurs</div>
      <div class="podium">${podHtml}</div>
    </div>
    ${isHost() ? `<div class="row">
      <button class="btn primary" id="replayBtn">🔄 Rejouer</button>
      <button class="btn" id="quitBtn">Quitter</button>
    </div>` : `<button class="btn" id="quitBtn">Quitter</button>`}
  </div>`;
}
function bindFin() {
  document.getElementById('replayBtn')?.addEventListener('click', () => send({ t:'rejouer' }));
  document.getElementById('quitBtn')?.addEventListener('click', () => {
    state = { ...state, phase:'accueil', code:'', myId:null };
    if (ws) ws.close();
    render();
  });
}

/* =========== SVG MONTAGNE =========== */
// 3 choix binaires → 8 chalets. Arbre binaire visuel.
// Chemin : LLL=1 LLR=2 LRL=3 LRR=4 RLL=5 RLR=6 RRL=7 RRR=8
function computeChalet(picks) {
  return picks.reduce((n, c) => n * 2 + (c === 'droite' ? 1 : 0), 0) + 1;
}
function buildMountainSVG(chemin, correctChalet, voteChalet) {
  const W=700, H=230;
  // nœuds : [x, y]
  const L0 = [[350, 22]];   // départ
  const L1 = [[175, 82], [525, 82]];
  const L2 = [[87,142],[263,142],[437,142],[613,142]];
  const L3 = [44,131,219,306,394,481,569,656].map(x=>[x,200]);

  // calcul du chemin depuis les choix
  let pathNodes = null;
  if (chemin && chemin.length===3) {
    const b = chemin.map(c=>c==='droite'?1:0);
    const l1n = b[0];
    const l2n = b[0]*2+b[1];
    const l3n = b[0]*4+b[1]*2+b[2];
    pathNodes = new Set([
      `0-${0}`, `1-${l1n}`, `2-${l2n}`, `3-${l3n}`,
      `e0-${l1n}`,             // arête L0→L1
      `e1-${l2n}`,             // arête L1→L2
      `e2-${l3n}`,             // arête L2→L3
    ]);
  }

  const faint='rgba(120,100,160,.3)';
  const hlColor='#ff3e9a';
  const voteColor='#f5a623';
  let s = `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" style="overflow:visible">`;

  function edge(x1,y1,x2,y2,hl) {
    return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${hl?hlColor:faint}" stroke-width="${hl?4:1.5}" stroke-linecap="round"/>`;
  }

  // L0 → L1
  for (let i=0;i<2;i++) s+=edge(L0[0][0],L0[0][1],L1[i][0],L1[i][1], pathNodes?.has(`e0-${i}`));
  // L1 → L2
  for (let i=0;i<2;i++) for (let j=0;j<2;j++) s+=edge(L1[i][0],L1[i][1],L2[i*2+j][0],L2[i*2+j][1], pathNodes?.has(`e1-${i*2+j}`));
  // L2 → L3
  for (let i=0;i<4;i++) for (let j=0;j<2;j++) s+=edge(L2[i][0],L2[i][1],L3[i*2+j][0],L3[i*2+j][1], pathNodes?.has(`e2-${i*2+j}`));

  function circle(x,y,r,fill,stroke,sw) {
    return `<circle cx="${x}" cy="${y}" r="${r}" fill="${fill}" stroke="${stroke}" stroke-width="${sw||2}"/>`;
  }
  function text(x,y,t,col,sz,fw) {
    return `<text x="${x}" y="${y}" text-anchor="middle" dominant-baseline="central" font-size="${sz||11}" font-weight="${fw||'bold'}" fill="${col}" font-family="Bricolage Grotesque,Trebuchet MS,sans-serif">${t}</text>`;
  }

  // L0 : point de départ
  s+=circle(L0[0][0],L0[0][1],14,pathNodes?hlColor:faint,pathNodes?hlColor:faint);
  s+=text(L0[0][0],L0[0][1],'▲','#fff',13);

  // L1 : nœuds dilemme 1
  for (let i=0;i<2;i++) {
    const hl=pathNodes?.has(`1-${i}`);
    s+=circle(L1[i][0],L1[i][1],12,hl?hlColor:faint,hl?hlColor:faint);
    s+=text(L1[i][0],L1[i][1],i===0?'G':'D','#fff',11);
  }

  // L2 : nœuds dilemme 2
  for (let i=0;i<4;i++) {
    const hl=pathNodes?.has(`2-${i}`);
    s+=circle(L2[i][0],L2[i][1],11,hl?hlColor:faint,hl?hlColor:faint);
    s+=text(L2[i][0],L2[i][1],i%2===0?'G':'D','#fff',10);
  }

  // L3 : chalets
  for (let i=0;i<8;i++) {
    const [x,y]=L3[i];
    const isPath = pathNodes?.has(`3-${i}`);
    const isVote = (i+1)===voteChalet;
    const isBoth = isPath && isVote;
    const fill = isPath?hlColor:isVote?voteColor:'#1e1830';
    const stroke = isPath?hlColor:isVote?voteColor:faint;
    s+=circle(x,y,18,fill,stroke,isPath||isVote?3:1.5);
    s+=text(x,y,String(i+1),'#fff',13,'800');
    // icône en dessous
    s+=`<text x="${x}" y="${y+32}" text-anchor="middle" font-size="14">${CHALETS[i]}</text>`;
  }

  // Légende
  if (chemin && chemin.length===3) {
    s+=`<rect x="4" y="4" width="160" height="14" rx="4" fill="#ff3e9a22"/>`;
    s+=`<circle cx="14" cy="11" r="5" fill="${hlColor}"/>`;
    s+=`<text x="22" y="11" text-anchor="start" dominant-baseline="central" font-size="10" fill="${hlColor}" font-weight="bold">Chemin de ${esc(state.charlieNom)}</text>`;
    if (voteChalet !== correctChalet) {
      s+=`<rect x="4" y="20" width="180" height="14" rx="4" fill="#f5a62322"/>`;
      s+=`<circle cx="14" cy="27" r="5" fill="${voteColor}"/>`;
      s+=`<text x="22" y="27" text-anchor="start" dominant-baseline="central" font-size="10" fill="${voteColor}" font-weight="bold">Vote du groupe</text>`;
    }
  }

  s += '</svg>';
  return s;
}

/* ---- couleur stable par pseudo ---- */
const COLORS = ['#ff3e9a','#3b9eff','#1db954','#f5a623','#9d4edd','#fb8500','#4cc9f0','#ff6b6b'];
function strColor(name) {
  let h=0; for(const c of (name||'')) h=(h*31+c.charCodeAt(0))>>>0;
  return COLORS[h%COLORS.length];
}

/* ---------- Démarrage ---------- */
render();
