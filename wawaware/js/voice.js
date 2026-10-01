// Reconnaissance de la parole, avec deux moteurs :
//  - 'local' : Vosk, intégré au jeu (js/lib/vosk.js + assets/vosk/modele-fr.tar.gz).
//    Marche dans tous les navigateurs (Opera compris), sans internet. On lui donne la liste
//    des mots des jeux : il ne cherche que ceux-là, ce qui le rend bien plus fiable sur des
//    mots isolés comme « assis » ou « au pied ». Le modèle (~40 Mo) est gardé en cache après
//    le premier chargement. Nécessite d'ouvrir le jeu via http:// (lancer.bat).
//  - 'web' : reconnaissance de Chrome / Edge (service Google), utilisée en secours.
// Chaque bout de phrase reconnu est horodaté, pour qu'un mini-jeu ne lise que ce qui a été
// dit depuis son lancement.

// Opera et Brave exposent l'API web mais elle ne fonctionne pas (pas d'accès au service de Google)
const VOICE_BAD_BROWSER = /\bOPR\/|\bOpera\b/.test(navigator.userAgent) ? 'Opera'
  : navigator.brave ? 'Brave' : '';

const VOICE_ERRORS = {
  'network': 'le navigateur n\'arrive pas à joindre le service de reconnaissance (pas d\'internet, ou navigateur non compatible)',
  'not-allowed': 'accès au micro refusé pour la reconnaissance vocale (clique sur le cadenas à gauche de l\'adresse pour l\'autoriser)',
  'service-not-allowed': 'reconnaissance vocale bloquée par le navigateur',
  'audio-capture': 'aucun micro trouvé ou micro déjà utilisé par une autre application',
  'language-not-supported': 'le français n\'est pas disponible sur ce navigateur',
  'local': 'impossible de charger la reconnaissance intégrée (fichiers js/lib/vosk.js ou assets/vosk/ manquants ?)',
};

const Voice = {
  webSupported: !!(window.SpeechRecognition || window.webkitSpeechRecognition) && !VOICE_BAD_BROWSER,
  badBrowser: VOICE_BAD_BROWSER,
  backend: '',      // 'local' ou 'web'
  wanted: false,
  loading: false,
  running: false,
  listening: false, // le moteur capte vraiment le son
  error: '',
  fails: 0,
  entries: [],      // { t, text } : t = moment où la phrase a commencé à être entendue
  last: '',         // dernière phrase entendue (pour l'affichage)
  lastT: -1e9,
  session: 0,

  // Le moteur intégré a besoin de http:// (il télécharge son modèle)
  get localPossible() { return /^https?:$/.test(location.protocol); },
  get supported() { return this.localPossible || this.webSupported; },

  // Démarre le meilleur moteur disponible. audioCtx/source = le micro déjà ouvert par Input.
  async begin(audioCtx, source) {
    if (this.wanted) return;
    if (this.localPossible) {
      const ok = await this.startLocal(audioCtx, source);
      if (ok) return;
    }
    if (this.webSupported) this.start();
  },

  addHeard(entry, raw) {
    const txt = raw.replace(/\[unk\]/g, ' ').replace(/\s+/g, ' ').trim();
    if (!txt) return entry;
    if (!entry) { entry = { t: performance.now(), text: '' }; this.entries.push(entry); }
    entry.text = this.norm(txt);
    this.last = txt;
    this.lastT = performance.now();
    const old = performance.now() - 60000;
    if (this.entries.length > 50) this.entries = this.entries.filter(en => en.t > old);
    return entry;
  },

  // ----- moteur intégré (Vosk) -----
  async startLocal(audioCtx, source) {
    this.backend = 'local';
    this.wanted = true;
    this.loading = true;
    this.error = '';
    try {
      if (!window.Vosk) {
        await new Promise((resolve, reject) => {
          const s = document.createElement('script');
          s.src = 'js/lib/vosk.js';
          s.onload = resolve;
          s.onerror = reject;
          document.head.appendChild(s);
        });
      }
      const model = await Vosk.createModel('assets/vosk/modele-fr.tar.gz');
      const rec = new model.KaldiRecognizer(audioCtx.sampleRate, JSON.stringify(this.vocabulary()));
      let cur = null;
      rec.on('partialresult', (m) => { cur = this.addHeard(cur, m.result.partial || ''); });
      rec.on('result', (m) => { this.addHeard(cur, m.result.text || ''); cur = null; });
      // on envoie le son du micro au moteur, par paquets
      const node = audioCtx.createScriptProcessor(4096, 1, 1);
      node.onaudioprocess = (e) => { try { rec.acceptWaveform(e.inputBuffer); } catch { /* moteur occupé */ } };
      const mute = audioCtx.createGain();
      mute.gain.value = 0;
      source.connect(node);
      node.connect(mute).connect(audioCtx.destination);
      Object.assign(this, { model, rec, node, running: true, listening: true, loading: false });
      return true;
    } catch (err) {
      console.warn('Reconnaissance intégrée indisponible :', err);
      Object.assign(this, { error: 'local', loading: false, wanted: false, backend: '' });
      return false;
    }
  },

  // Liste des mots que le moteur intégré a le droit de reconnaître
  vocabulary() {
    const words = new Set(['bonjour', 'salut', 'test', 'allô', 'micro', 'merci', 'coucou']);
    const add = (s) => { for (const w of String(s).toLowerCase().split(/[\s']+/)) if (w && !/^\d+$/.test(w)) words.add(w); };
    Object.values(WORDS).flat().forEach(add);
    NUMBER_WORDS.flat().forEach(add);
    ['dix-sept', 'dix-huit', 'dix-neuf', 'couché', 'couchée'].forEach(add);
    for (const g of Engine.games) (g.vocab || []).forEach(add);
    return [...words, '[unk]'];
  },

  // ----- moteur web (Chrome / Edge) -----
  start() {
    if (!this.webSupported || this.running) return;
    this.backend = 'web';
    const R = window.SpeechRecognition || window.webkitSpeechRecognition;
    const rec = new R();
    rec.lang = 'fr-FR';
    rec.continuous = true;
    rec.interimResults = true;
    rec.maxAlternatives = 3;
    const session = ++this.session;
    const byIndex = new Map();

    rec.onresult = (e) => {
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const res = e.results[i];
        let entry = byIndex.get(i);
        if (!entry) {
          entry = { t: performance.now(), text: '' };
          byIndex.set(i, entry);
          this.entries.push(entry);
        }
        // on garde toutes les variantes proposées : "assis" peut sortir en "assez"...
        entry.text = Array.from(res, alt => this.norm(alt.transcript)).join(' ');
        this.last = res[0].transcript.trim();
        this.lastT = performance.now();
      }
      const old = performance.now() - 60000;
      this.entries = this.entries.filter(en => en.t > old);
    };
    rec.onaudiostart = () => { this.listening = true; this.fails = 0; };
    rec.onerror = (e) => {
      if (e.error === 'no-speech' || e.error === 'aborted') return; // silence : rien de grave
      this.error = e.error;
      console.warn('Reconnaissance vocale :', e.error);
      // erreurs définitives : inutile de relancer en boucle
      if (['not-allowed', 'service-not-allowed', 'language-not-supported'].includes(e.error)) this.wanted = false;
      if (++this.fails >= 4) this.wanted = false;
    };
    rec.onend = () => {
      if (session !== this.session) return;
      this.running = false;
      this.listening = false;
      // Chrome coupe régulièrement l'écoute : on relance (plus lentement si ça échoue)
      if (this.wanted) setTimeout(() => this.start(), 150 + this.fails * 700);
    };

    this.wanted = true;
    try { rec.start(); this.running = true; this.rec = rec; } catch (err) { this.error = String(err.message || err); }
  },

  // Message lisible sur l'état de la reconnaissance (affiché dans le menu)
  status() {
    if (!this.supported) {
      return this.badBrowser
        ? `ouvre le jeu avec lancer.bat (http://localhost:8000) pour la reconnaissance intégrée`
        : 'ouvre le jeu avec lancer.bat (http://localhost:8000), pas en double-cliquant index.html';
    }
    if (this.loading) return '⏳ chargement de la reconnaissance vocale (≈ 40 Mo, seulement la 1re fois)…';
    if (this.error && !this.wanted) return '⚠ ' + (VOICE_ERRORS[this.error] || this.error);
    if (performance.now() - this.lastT < 4000) return `« ${this.last} »`;
    if (this.error) return '⚠ ' + (VOICE_ERRORS[this.error] || this.error) + ' — nouvel essai…';
    if (this.listening) return '✅ j\'écoute… dis « assis » ou « rouge » pour tester';
    return this.wanted ? 'démarrage…' : '—';
  },

  ready() { return this.wanted && (this.backend === 'local' ? this.listening : this.webSupported); },

  // Tout ce qui a été entendu depuis l'instant t (normalisé : minuscules, sans accents)
  since(t) {
    return ' ' + this.entries.filter(en => en.t >= t).map(en => en.text).join(' ') + ' ';
  },

  norm(s) {
    return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
  },

  // Renvoie l'indice du premier groupe de mots trouvé dans le texte, ou -1.
  // groups = [['assis', 'assi', 'assez'], ['couche', 'couchez'], ...]
  match(text, groups) {
    for (let i = 0; i < groups.length; i++) {
      for (const w of groups[i]) if (text.includes(' ' + w + ' ') || (w.length >= 5 && text.includes(w))) return i;
    }
    return -1;
  },
};

// Variantes acceptées pour les mots courants (la reconnaissance se trompe souvent sur les mots isolés)
const WORDS = {
  assis: ['assis', 'assi', 'assise', 'assez', 'a si', 'a six', 'asi', 'acid', 'aussi'],
  couche: ['couche', 'couchee', 'coucher', 'couchez', 'couches', 'touche', 'douche', 'couchet'],
  aupied: ['au pied', 'aux pieds', 'au pie', 'o pied', 'oh pied', 'pied', 'pieds', 'opie', 'au piet'],
  attrape: ['attrape', 'attrapes', 'attraper', 'attrapez', 'atrape', 'a trappe', 'trappe', 'attrap'],
  saute: ['saute', 'sautes', 'sauter', 'sautez', 'saut', 'sot', 'sotte', 'so', 'seau'],
  patte: ['patte', 'pattes', 'pate', 'pat', 'donne la patte', 'la patte', 'donne'],
  gauche: ['gauche', 'gauches', 'goche', 'gosh'],
  droite: ['droite', 'droit', 'droites', 'adroite', 'a droite'],
  oui: ['oui', 'ouais', 'wi', 'ouiii', 'yes', 'si'],
  non: ['non', 'nan', 'no', 'nom', 'nom nom'],
  rouge: ['rouge', 'rouges'],
  bleu: ['bleu', 'bleue', 'bleus', 'bleues', 'bleuet'],
  vert: ['vert', 'verte', 'verre', 'vers', 'ver', 'vair'],
  jaune: ['jaune', 'jaunes', 'john', 'jone', 'jaunee'],
  stop: ['stop', 'stoppe', 'arrete', 'stoppez'],
};

const NUMBER_WORDS = [
  ['0', 'zero'], ['1', 'un', 'une'], ['2', 'deux', 'deu'], ['3', 'trois', 'troie'],
  ['4', 'quatre', 'catre', 'katre'], ['5', 'cinq', 'saint', 'sinc'], ['6', 'six', 'cis', 'sis'],
  ['7', 'sept', 'set'], ['8', 'huit', 'huitre'], ['9', 'neuf', 'noeuf'],
  ['10', 'dix', 'disse', 'diss'], ['11', 'onze'], ['12', 'douze'], ['13', 'treize'], ['14', 'quatorze'],
  ['15', 'quinze'], ['16', 'seize'], ['17', 'dix sept'], ['18', 'dix huit'], ['19', 'dix neuf'], ['20', 'vingt', 'vin', 'vint'],
];

// Cherche un nombre (en chiffres ou en lettres) dans le texte. Les grands nombres sont testés
// en premier pour que "dix sept" ne soit pas lu comme "dix".
Voice.numbers = function (text) {
  const found = new Set();
  for (let n = NUMBER_WORDS.length - 1; n >= 0; n--) {
    for (const w of NUMBER_WORDS[n]) {
      if (text.includes(' ' + w + ' ')) { found.add(n); text = text.split(' ' + w + ' ').join(' '); }
    }
  }
  return found;
};
