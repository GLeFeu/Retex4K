/* ============================================
   Navigation SPA + transitions glissées + parallax
   ============================================ */

(function () {
  'use strict';

  const views = document.querySelectorAll('.view');
  const navButtons = document.querySelectorAll('[data-view-link]');
  const navLinksWrap = document.querySelector('.nav-links');
  const navToggle = document.querySelector('.nav-toggle');
  const siteBgReveal = document.querySelector('.site-bg-reveal');

  let currentView = 'home';
  let isAnimating = false;

  // Order of views, used to decide slide direction
  const order = ['home', 'texture-packs', 'fragile-dreams'];

  function go(viewName) {
    if (viewName === currentView || isAnimating) return;
    const fromEl = document.getElementById('view-' + currentView);
    const toEl   = document.getElementById('view-' + viewName);
    if (!toEl) return;

    isAnimating = true;

    // Sortie : fromEl part en fondu vers le haut
    fromEl.style.position = 'absolute';
    fromEl.classList.add('leaving');
    fromEl.classList.remove('active');

    // Entrée : toEl apparaît en fondu depuis le bas
    toEl.classList.add('active');

    window.scrollTo(0, 0);
    updateNavActive(viewName);
    closeMobileNav();

    setTimeout(() => {
      fromEl.style.transition = 'none';
      fromEl.style.position = '';
      fromEl.classList.remove('leaving');
      void fromEl.offsetWidth;
      fromEl.style.transition = '';
      isAnimating = false;
    }, 400);

    currentView = viewName;
    history.replaceState(null, '', '#' + viewName);
    updateBgReveal(viewName);
  }

  function updateBgReveal(viewName) {
    if (!siteBgReveal) return;
    if (viewName === 'fragile-dreams') {
      siteBgReveal.classList.add('active');
      document.documentElement.style.setProperty('--particle-color', '#FF9DEB');
      document.documentElement.style.setProperty('--particle-glow', 'rgba(255, 157, 235, 0.6)');
    } else {
      siteBgReveal.classList.remove('active');
      document.documentElement.style.removeProperty('--particle-color');
      document.documentElement.style.removeProperty('--particle-glow');
    }
  }

  function updateNavActive(viewName) {
    navButtons.forEach((btn) => {
      if (!btn.closest('.nav-links')) return;
      btn.classList.toggle('active', btn.dataset.viewLink === viewName);
    });
  }

  navButtons.forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const target = btn.dataset.viewLink;
      if (target) go(target);
    });
    // Keyboard support for non-button elements (e.g. game cards with role="button")
    if (btn.tagName !== 'BUTTON' && btn.tagName !== 'A') {
      btn.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          const target = btn.dataset.viewLink;
          if (target) go(target);
        }
      });
    }
  });

  function closeMobileNav() {
    if (navLinksWrap) navLinksWrap.classList.remove('open');
  }

  if (navToggle) {
    navToggle.addEventListener('click', () => {
      navLinksWrap.classList.toggle('open');
    });
  }

  // Init from hash
  const initial = location.hash.replace('#', '');
  if (initial && order.includes(initial)) {
    document.getElementById('view-' + initial).classList.add('active');
    currentView = initial;
    updateNavActive(initial);
    updateBgReveal(initial);
  } else {
    document.getElementById('view-home').classList.add('active');
    updateNavActive('home');
  }

  // ---------- Before/After compare slider ----------
  const compareSlider = document.getElementById('compare-main-slider');
  if (compareSlider) {
    const imgBefore = document.getElementById('cmp-before');
    const imgAfter  = document.getElementById('cmp-after');
    const after     = compareSlider.querySelector('.compare-after');
    const handle    = compareSlider.querySelector('.compare-handle');
    const thumbs     = document.querySelectorAll('.compare-thumb');
    const prevBtn    = document.querySelector('.compare-arrow-ext.compare-prev');
    const nextBtn    = document.querySelector('.compare-arrow-ext.compare-next');
    const labelLeft  = compareSlider.querySelector('.compare-label-left');
    const labelRight = compareSlider.querySelector('.compare-label-right');
    let dragging    = false;
    let currentIdx  = 0;

    const slides = [
      { before: 'Capture 01 (Normal).webp', after: 'Capture 01 (4K).webp' },
      { before: 'Capture 02 (Normal).webp',  after: 'Capture 02 (4K).webp'  },
      { before: 'before_03.jpg',            after: 'after_03.jpg'          },
    ];

    function goTo(idx) {
      currentIdx = (idx + slides.length) % slides.length;
      imgBefore.src = slides[currentIdx].before;
      imgAfter.src  = slides[currentIdx].after;
      setPos(compareSlider.getBoundingClientRect().left + compareSlider.offsetWidth * 0.5);
      thumbs.forEach((t, i) => t.classList.toggle('active', i === currentIdx));
    }

    function setPos(x) {
      const rect = compareSlider.getBoundingClientRect();
      const pct  = Math.min(100, Math.max(0, (x - rect.left) / rect.width * 100));
      after.style.clipPath = `polygon(0 0, ${pct}% 0, ${pct}% 100%, 0 100%)`;
      handle.style.left    = pct + '%';
      if (labelLeft)  labelLeft.style.opacity  = pct < 18 ? '0' : '1';
      if (labelRight) labelRight.style.opacity = pct > 82 ? '0' : '1';
    }

    // ---------- Zoom dans le cadre (double-clic) ----------
    const inner   = document.getElementById('compare-inner');
    const SCALE   = 2.5;
    let isZoomed  = false;
    let panX = 0, panY = 0;
    let panDrag = false, panStart = {};

    function applyPan() {
      const rect = compareSlider.getBoundingClientRect();
      const maxX = rect.width  * (SCALE - 1) / 2;
      const maxY = rect.height * (SCALE - 1) / 2;
      panX = Math.min(maxX, Math.max(-maxX, panX));
      panY = Math.min(maxY, Math.max(-maxY, panY));
      inner.style.transform = `translate(${panX}px, ${panY}px) scale(${SCALE})`;
    }

    compareSlider.addEventListener('dblclick', e => {
      if (e.target.closest('.compare-drag') || e.target.closest('.compare-fs-btn')) return;
      isZoomed = !isZoomed;
      if (isZoomed) {
        inner.style.transition = 'transform 0.25s ease';
        applyPan();
        compareSlider.style.cursor = 'grab';
      } else {
        panX = 0; panY = 0;
        inner.style.transition = 'transform 0.25s ease';
        inner.style.transform = 'translate(0,0) scale(1)';
        compareSlider.style.cursor = 'col-resize';
      }
    });

    compareSlider.addEventListener('mousedown', e => {
      if (!isZoomed) return;
      if (e.target.closest('.compare-drag') || e.target.closest('.compare-fs-btn')) return;
      panDrag = true;
      panStart = { mx: e.clientX, my: e.clientY, px: panX, py: panY };
      inner.style.transition = 'none';
      compareSlider.style.cursor = 'grabbing';
    });

    document.addEventListener('mousemove', e => {
      if (!panDrag) return;
      panX = panStart.px + (e.clientX - panStart.mx);
      panY = panStart.py + (e.clientY - panStart.my);
      applyPan();
    });

    document.addEventListener('mouseup', () => {
      if (!panDrag) return;
      panDrag = false;
      compareSlider.style.cursor = isZoomed ? 'grab' : 'col-resize';
    });

    compareSlider.addEventListener('mousedown',  e => {
      if (!e.target.closest('.compare-drag')) return;
      dragging = true;
    });
    compareSlider.addEventListener('touchstart', e => {
      if (!e.target.closest('.compare-drag')) return;
      dragging = true;
    }, { passive: true });
    document.addEventListener('mousemove',  e => { if (dragging) setPos(e.clientX); });
    document.addEventListener('touchmove',  e => { if (dragging) setPos(e.touches[0].clientX); }, { passive: true });
    document.addEventListener('mouseup',   () => { dragging = false; });
    document.addEventListener('touchend',  () => { dragging = false; });

    prevBtn.addEventListener('click', () => goTo(currentIdx - 1));
    nextBtn.addEventListener('click', () => goTo(currentIdx + 1));

    const fsBtn = document.getElementById('compare-fs-btn');
    if (fsBtn) {
      fsBtn.addEventListener('click', () => {
        if (!document.fullscreenElement) {
          compareSlider.requestFullscreen();
        } else {
          document.exitFullscreen();
        }
      });
    }
    thumbs.forEach((t, i) => t.addEventListener('click', () => goTo(i)));

    document.addEventListener('keydown', e => {
      if (document.getElementById('view-fragile-dreams').classList.contains('active')) {
        if (e.key === 'ArrowLeft')  goTo(currentIdx - 1);
        if (e.key === 'ArrowRight') goTo(currentIdx + 1);
      }
    });
  }

  // ---------- Internationalisation ----------
  const LANGS = {
    fr: { flag: '🇫🇷', code: 'FR', name: 'Français' },
    en: { flag: '🇬🇧', code: 'EN', name: 'English' },
    es: { flag: '🇪🇸', code: 'ES', name: 'Español' },
    de: { flag: '🇩🇪', code: 'DE', name: 'Deutsch' },
    it: { flag: '🇮🇹', code: 'IT', name: 'Italiano' },
    pt: { flag: '🇵🇹', code: 'PT', name: 'Português' },
    ja: { flag: '🇯🇵', code: 'JA', name: '日本語' },
  };

  const T = {
    fr: {
      'nav.home': 'Home', 'nav.packs': 'Texture Packs', 'nav.effects': 'Effets',
      'hero.eyebrow': 'Texture Pack 4K',
      'hero.title': 'Une lumière nouvelle<br>sur des <em>mondes oubliés</em>',
      'hero.sub': 'Je retravaille les textures de jeux qui méritent d\'être revus à la lumière du jour. Pour l\'instant, un seul jeu : <em>Fragile Dreams</em>.',
      'hero.cta': 'Voir le pack', 'scroll.cue': 'Défiler',
      'project.eyebrow': 'Le projet',
      'project.title': 'Pourquoi Retex<span class="lining">4K</span>',
      'project.desc': 'Retex<span class="lining">4K</span>, c\'est un projet de retexturage en <span class="lining">4K</span>. Je commence par Fragile Dreams, un jeu qui mérite vraiment d\'être redécouvert. Je reprends ses textures en mixant upscale IA et retouches à la main, en essayant de rester fidèle à l\'ambiance d\'origine tout en y mettant un peu de ma patte. C\'est un projet perso, sur mon temps libre, donc ça avance tranquillement, mais si Fragile Dreams arrive au bout, j\'ai bien envie de continuer sur d\'autres jeux.',
      'home.feat1': 'Upscale IA + retouches manuelles, certaines textures entièrement refaites à zéro.',
      'home.feat2': 'Compatibilité testée sur Dolphin (version Europe de Fragile Dreams).',
      'home.feat3': 'Contributions et discussions sur Discord.',
      'home.feat4': 'Un doublage français de Fragile Dreams est prévu — les auditions se feront sur Discord, quand le projet approchera de la version 1.0.0.',
      'btn.discord': 'Serveur Discord', 'btn.discord.fd': 'Rejoindre le Discord', 'btn.mega': 'Télécharger sur MEGA',
      'footer.home': '© 2026 Retex4K by GLeFeu. Site non affilié aux développeurs ou éditeurs des jeux dont j\'améliore les textures.',
      'packs.eyebrow': 'Bibliothèque de Jeux Vidéo', 'packs.title': 'Choisis ton Texture Pack',
      'packs.desc': 'Chaque jeu reçoit son propre traitement, à son propre rythme.',
      'footer.packs': '© 2026 Retex4K by GLeFeu. D\'autres mondes arriveront peut-être un jour.',
      'fd.tagline': 'Un retraitement complet des textures de Farewell Ruins of the Moon',
      'stat.version': 'Version actuelle', 'stat.date': '20 juin 2026', 'stat.resolution': 'Résolution', 'stat.world': 'Texture terminé',
      'compare.eyebrow': 'Comparaison', 'compare.zoom': 'Double-clic pour zoomer', 'compare.left': 'Retex4K', 'compare.right': 'Original',
      'fd.about.eyebrow': 'À propos du pack', 'fd.about.title': 'Ce qui a changé',
      'fd.feat1': 'Toutes les textures d\'environnement retravaillées en 4K.',
      'fd.feat2': 'Certaines textures entièrement réimaginées, dans le respect de l\'ambiance originale.',
      'fd.feat3': 'Un doublage français est prévu — il arrivera après la version 1.0.0.',
      'fd.dl.title': 'Télécharger', 'fd.dl.desc': 'Le pack est disponible gratuitement sur MEGA. Les nouvelles versions sont annoncées sur le serveur Discord.',
      'fd.dl.updated': 'Dernière mise à jour',
      'fd.about.eyebrow': 'Roadmap', 'fd.about.title': 'Ce qui arrive',
      'tl.01': 'Observatory', 'tl.02': 'Azabudai Underground Station', 'tl.03': 'Azabudai Station Mall',
      'tl.04': 'Lunar Hill Fun Land', 'tl.05': 'Underground Utility Tunnels', 'tl.06': 'Kurato Kankou Hotel',
      'tl.07': 'Oikawadani Dam', 'tl.08': 'Laboratory', 'tl.09': 'Twilight Tower',
      'tl.10': 'Release finale & polish global', 'tl.post': 'Doublage français',
      'footer.fd': '© 2026 Retex4K by GLeFeu. Fragile Dreams: Farewell Ruins of the Moon n\'est pas affilié à ce site.',
    },
    en: {
      'nav.home': 'Home', 'nav.packs': 'Texture Packs', 'nav.effects': 'Effects',
      'hero.eyebrow': '4K Texture Pack',
      'hero.title': 'A new light<br>on <em>forgotten worlds</em>',
      'hero.sub': 'I rework the textures of games that deserve to be seen in a new light. For now, just one game: <em>Fragile Dreams</em>.',
      'hero.cta': 'See the pack', 'scroll.cue': 'Scroll',
      'project.eyebrow': 'The project',
      'project.title': 'Why Retex<span class="lining">4K</span>',
      'project.desc': 'Retex<span class="lining">4K</span> is a <span class="lining">4K</span> retexturing project. I start with Fragile Dreams, a game that truly deserves to be rediscovered. I rework its textures by mixing AI upscaling and manual editing, staying true to the original atmosphere while adding my own touch. It\'s a personal project done in my free time, so progress is gradual — but if Fragile Dreams is completed, I\'d love to continue with other games.',
      'home.feat1': 'AI upscale + manual retouching, some textures entirely remade from scratch.',
      'home.feat2': 'Compatibility tested on Dolphin (European version of Fragile Dreams).',
      'home.feat3': 'Contributions and discussions on Discord.',
      'home.feat4': 'A French dub of Fragile Dreams is planned — auditions will be held on Discord when the project nears version 1.0.0.',
      'btn.discord': 'Discord Server', 'btn.discord.fd': 'Join Discord', 'btn.mega': 'Download on MEGA',
      'footer.home': '© 2026 Retex4K by GLeFeu. Not affiliated with the developers or publishers of the games I retexture.',
      'packs.eyebrow': 'Game Library', 'packs.title': 'Choose your Texture Pack',
      'packs.desc': 'Each game gets its own treatment, at its own pace.',
      'footer.packs': '© 2026 Retex4K by GLeFeu. Other worlds may come someday.',
      'fd.tagline': 'A complete retexture of Farewell Ruins of the Moon',
      'stat.version': 'Current version', 'stat.date': 'June 20, 2026', 'stat.resolution': 'Resolution', 'stat.world': 'Textures completed',
      'compare.eyebrow': 'Comparison', 'compare.zoom': 'Double-click to zoom', 'compare.left': 'Retex4K', 'compare.right': 'Original',
      'fd.about.eyebrow': 'About the pack', 'fd.about.title': 'What changed',
      'fd.feat1': 'All environment textures reworked in 4K.',
      'fd.feat2': 'Some textures entirely reimagined, respecting the original atmosphere.',
      'fd.feat3': 'A French dub is planned — it will arrive after version 1.0.0.',
      'fd.dl.title': 'Download', 'fd.dl.desc': 'The pack is available for free on MEGA. New versions are announced on the Discord server.',
      'fd.dl.updated': 'Last updated',
      'fd.about.eyebrow': 'Roadmap', 'fd.about.title': 'What\'s coming',
      'tl.01': 'Observatory', 'tl.02': 'Azabudai Underground Station', 'tl.03': 'Azabudai Station Mall',
      'tl.04': 'Lunar Hill Fun Land', 'tl.05': 'Underground Utility Tunnels', 'tl.06': 'Kurato Kankou Hotel',
      'tl.07': 'Oikawadani Dam', 'tl.08': 'Laboratory', 'tl.09': 'Twilight Tower',
      'tl.10': 'Final release & global polish', 'tl.post': 'French voice dub',
      'footer.fd': '© 2026 Retex4K by GLeFeu. Fragile Dreams: Farewell Ruins of the Moon is not affiliated with this site.',
    },
    es: {
      'nav.home': 'Inicio', 'nav.packs': 'Texture Packs', 'nav.effects': 'Efectos',
      'hero.eyebrow': 'Pack de Texturas 4K',
      'hero.title': 'Una nueva luz<br>sobre <em>mundos olvidados</em>',
      'hero.sub': 'Retrabajo las texturas de juegos que merecen verse con una nueva luz. Por ahora, solo un juego: <em>Fragile Dreams</em>.',
      'hero.cta': 'Ver el pack', 'scroll.cue': 'Desplazar',
      'project.eyebrow': 'El proyecto',
      'project.title': '¿Por qué Retex<span class="lining">4K</span>?',
      'project.desc': 'Retex<span class="lining">4K</span> es un proyecto de retexturizado en <span class="lining">4K</span>. Empiezo con Fragile Dreams, un juego que merece ser redescubierto. Retrabajo sus texturas combinando upscale con IA y retoques manuales, manteniendo la atmósfera original con mi propio toque. Es un proyecto personal en mi tiempo libre — pero si Fragile Dreams llega al final, me gustaría continuar con otros juegos.',
      'home.feat1': 'Upscale con IA + retoques manuales, algunas texturas completamente rehecho desde cero.',
      'home.feat2': 'Compatibilidad probada en Dolphin (versión europea de Fragile Dreams).',
      'home.feat3': 'Contribuciones y discusiones en Discord.',
      'home.feat4': 'Se planea un doblaje francés de Fragile Dreams — las audiciones se realizarán en Discord cuando el proyecto se acerque a la versión 1.0.0.',
      'btn.discord': 'Servidor Discord', 'btn.discord.fd': 'Unirse al Discord', 'btn.mega': 'Descargar en MEGA',
      'footer.home': '© 2026 Retex4K by GLeFeu. No afiliado con los desarrolladores o editores de los juegos que retexturizo.',
      'packs.eyebrow': 'Biblioteca de Videojuegos', 'packs.title': 'Elige tu Texture Pack',
      'packs.desc': 'Cada juego recibe su propio tratamiento, a su propio ritmo.',
      'footer.packs': '© 2026 Retex4K by GLeFeu. Quizás otros mundos lleguen algún día.',
      'fd.tagline': 'Un retexturizado completo de Farewell Ruins of the Moon',
      'stat.version': 'Versión actual', 'stat.date': '20 de junio de 2026', 'stat.resolution': 'Resolución', 'stat.world': 'Texturas completadas',
      'compare.eyebrow': 'Comparación', 'compare.zoom': 'Doble clic para zoom', 'compare.left': 'Retex4K', 'compare.right': 'Original',
      'fd.about.eyebrow': 'Sobre el pack', 'fd.about.title': 'Qué cambió',
      'fd.feat1': 'Todas las texturas del entorno retrabajadas en 4K.',
      'fd.feat2': 'Algunas texturas completamente reimaginadas, respetando la atmósfera original.',
      'fd.feat3': 'Se planea un doblaje francés — llegará después de la versión 1.0.0.',
      'fd.dl.title': 'Descargar', 'fd.dl.desc': 'El pack está disponible de forma gratuita en MEGA. Las nuevas versiones se anuncian en el servidor Discord.',
      'fd.dl.updated': 'Última actualización',
      'fd.about.eyebrow': 'Hoja de ruta', 'fd.about.title': 'Lo que viene',
      'tl.01': 'Observatory', 'tl.02': 'Azabudai Underground Station', 'tl.03': 'Azabudai Station Mall',
      'tl.04': 'Lunar Hill Fun Land', 'tl.05': 'Underground Utility Tunnels', 'tl.06': 'Kurato Kankou Hotel',
      'tl.07': 'Oikawadani Dam', 'tl.08': 'Laboratory', 'tl.09': 'Twilight Tower',
      'tl.10': 'Lanzamiento final y pulido global', 'tl.post': 'Doblaje en francés',
      'footer.fd': '© 2026 Retex4K by GLeFeu. Fragile Dreams: Farewell Ruins of the Moon no está afiliado a este sitio.',
    },
    de: {
      'nav.home': 'Start', 'nav.packs': 'Texture Packs', 'nav.effects': 'Effekte',
      'hero.eyebrow': '4K Texture Pack',
      'hero.title': 'Ein neues Licht<br>auf <em>vergessene Welten</em>',
      'hero.sub': 'Ich überarbeite die Texturen von Spielen, die es verdienen, in neuem Licht gesehen zu werden. Bisher nur ein Spiel: <em>Fragile Dreams</em>.',
      'hero.cta': 'Pack ansehen', 'scroll.cue': 'Scrollen',
      'project.eyebrow': 'Das Projekt',
      'project.title': 'Warum Retex<span class="lining">4K</span>?',
      'project.desc': 'Retex<span class="lining">4K</span> ist ein <span class="lining">4K</span>-Retexturierungsprojekt. Ich beginne mit Fragile Dreams, einem Spiel, das wirklich wiederentdeckt werden sollte. Ich überarbeite die Texturen durch KI-Upscaling und manuelle Bearbeitung, um die ursprüngliche Atmosphäre zu bewahren. Es ist ein persönliches Projekt in meiner Freizeit — wenn Fragile Dreams fertig ist, würde ich gerne weitere Spiele angehen.',
      'home.feat1': 'KI-Upscale + manuelle Nachbearbeitung, einige Texturen komplett neu erstellt.',
      'home.feat2': 'Kompatibilität mit Dolphin getestet (europäische Version von Fragile Dreams).',
      'home.feat3': 'Beiträge und Diskussionen auf Discord.',
      'home.feat4': 'Eine französische Synchronisation von Fragile Dreams ist geplant — Vorsprechtermine auf Discord, wenn das Projekt Version 1.0.0 nähert.',
      'btn.discord': 'Discord-Server', 'btn.discord.fd': 'Discord beitreten', 'btn.mega': 'Auf MEGA herunterladen',
      'footer.home': '© 2026 Retex4K by GLeFeu. Nicht verbunden mit den Entwicklern oder Publishern der Spiele, die ich retexturiere.',
      'packs.eyebrow': 'Spielebibliothek', 'packs.title': 'Wähle dein Texture Pack',
      'packs.desc': 'Jedes Spiel erhält seine eigene Behandlung, in seinem eigenen Tempo.',
      'footer.packs': '© 2026 Retex4K by GLeFeu. Vielleicht kommen eines Tages andere Welten.',
      'fd.tagline': 'Eine komplette Retexturierung von Farewell Ruins of the Moon',
      'stat.version': 'Aktuelle Version', 'stat.date': '20. Juni 2026', 'stat.resolution': 'Auflösung', 'stat.world': 'Texturen abgeschlossen',
      'compare.eyebrow': 'Vergleich', 'compare.zoom': 'Doppelklick zum Zoomen', 'compare.left': 'Retex4K', 'compare.right': 'Original',
      'fd.about.eyebrow': 'Über das Pack', 'fd.about.title': 'Was sich geändert hat',
      'fd.feat1': 'Alle Umgebungstexturen in 4K überarbeitet.',
      'fd.feat2': 'Einige Texturen vollständig neu gestaltet, im Einklang mit der ursprünglichen Atmosphäre.',
      'fd.feat3': 'Eine französische Synchronisation ist geplant — sie kommt nach Version 1.0.0.',
      'fd.dl.title': 'Herunterladen', 'fd.dl.desc': 'Das Pack ist kostenlos auf MEGA verfügbar. Neue Versionen werden auf dem Discord-Server angekündigt.',
      'fd.dl.updated': 'Zuletzt aktualisiert',
      'fd.about.eyebrow': 'Fahrplan', 'fd.about.title': 'Was kommt',
      'tl.01': 'Observatory', 'tl.02': 'Azabudai Underground Station', 'tl.03': 'Azabudai Station Mall',
      'tl.04': 'Lunar Hill Fun Land', 'tl.05': 'Underground Utility Tunnels', 'tl.06': 'Kurato Kankou Hotel',
      'tl.07': 'Oikawadani Dam', 'tl.08': 'Laboratory', 'tl.09': 'Twilight Tower',
      'tl.10': 'Finale Version & globaler Feinschliff', 'tl.post': 'Französische Synchronisation',
      'footer.fd': '© 2026 Retex4K by GLeFeu. Fragile Dreams: Farewell Ruins of the Moon ist nicht mit dieser Seite verbunden.',
    },
    it: {
      'nav.home': 'Home', 'nav.packs': 'Texture Pack', 'nav.effects': 'Effetti',
      'hero.eyebrow': 'Texture Pack 4K',
      'hero.title': 'Una nuova luce<br>su <em>mondi dimenticati</em>',
      'hero.sub': 'Rielaboro le texture di giochi che meritano di essere visti sotto una nuova luce. Per ora, un solo gioco: <em>Fragile Dreams</em>.',
      'hero.cta': 'Vedi il pack', 'scroll.cue': 'Scorri',
      'project.eyebrow': 'Il progetto',
      'project.title': 'Perché Retex<span class="lining">4K</span>?',
      'project.desc': 'Retex<span class="lining">4K</span> è un progetto di retexturing in <span class="lining">4K</span>. Inizio con Fragile Dreams, un gioco che merita di essere riscoperto. Rielaboro le texture unendo upscale AI e ritocchi manuali, restando fedele all\'atmosfera originale. È un progetto personale nel mio tempo libero — se Fragile Dreams arriva al termine, mi piacerebbe continuare con altri giochi.',
      'home.feat1': 'Upscale AI + ritocchi manuali, alcune texture completamente rifatte da zero.',
      'home.feat2': 'Compatibilità testata su Dolphin (versione europea di Fragile Dreams).',
      'home.feat3': 'Contributi e discussioni su Discord.',
      'home.feat4': 'Un doppiaggio francese di Fragile Dreams è previsto — i provini si terranno su Discord quando il progetto si avvicinerà alla versione 1.0.0.',
      'btn.discord': 'Server Discord', 'btn.discord.fd': 'Unisciti a Discord', 'btn.mega': 'Scarica su MEGA',
      'footer.home': '© 2026 Retex4K by GLeFeu. Non affiliato agli sviluppatori o editori dei giochi che riprocesso.',
      'packs.eyebrow': 'Libreria di Videogiochi', 'packs.title': 'Scegli il tuo Texture Pack',
      'packs.desc': 'Ogni gioco riceve il proprio trattamento, al proprio ritmo.',
      'footer.packs': '© 2026 Retex4K by GLeFeu. Forse altri mondi arriveranno un giorno.',
      'fd.tagline': 'Un retexturing completo di Farewell Ruins of the Moon',
      'stat.version': 'Versione attuale', 'stat.date': '20 giugno 2026', 'stat.resolution': 'Risoluzione', 'stat.world': 'Texture completate',
      'compare.eyebrow': 'Confronto', 'compare.zoom': 'Doppio clic per ingrandire', 'compare.left': 'Retex4K', 'compare.right': 'Originale',
      'fd.about.eyebrow': 'Sul pack', 'fd.about.title': 'Cosa è cambiato',
      'fd.feat1': 'Tutte le texture ambientali rielaborate in 4K.',
      'fd.feat2': 'Alcune texture completamente reimmaginate, nel rispetto dell\'atmosfera originale.',
      'fd.feat3': 'Un doppiaggio francese è previsto — arriverà dopo la versione 1.0.0.',
      'fd.dl.title': 'Scarica', 'fd.dl.desc': 'Il pack è disponibile gratuitamente su MEGA. Le nuove versioni vengono annunciate sul server Discord.',
      'fd.dl.updated': 'Ultimo aggiornamento',
      'fd.about.eyebrow': 'Roadmap', 'fd.about.title': 'Cosa arriverà',
      'tl.01': 'Observatory', 'tl.02': 'Azabudai Underground Station', 'tl.03': 'Azabudai Station Mall',
      'tl.04': 'Lunar Hill Fun Land', 'tl.05': 'Underground Utility Tunnels', 'tl.06': 'Kurato Kankou Hotel',
      'tl.07': 'Oikawadani Dam', 'tl.08': 'Laboratory', 'tl.09': 'Twilight Tower',
      'tl.10': 'Release finale e rifinitura globale', 'tl.post': 'Doppiaggio francese',
      'footer.fd': '© 2026 Retex4K by GLeFeu. Fragile Dreams: Farewell Ruins of the Moon non è affiliato a questo sito.',
    },
    pt: {
      'nav.home': 'Início', 'nav.packs': 'Texture Packs', 'nav.effects': 'Efeitos',
      'hero.eyebrow': 'Pack de Texturas 4K',
      'hero.title': 'Uma nova luz<br>sobre <em>mundos esquecidos</em>',
      'hero.sub': 'Retrabalho as texturas de jogos que merecem ser vistos sob uma nova luz. Por enquanto, apenas um jogo: <em>Fragile Dreams</em>.',
      'hero.cta': 'Ver o pack', 'scroll.cue': 'Rolar',
      'project.eyebrow': 'O projeto',
      'project.title': 'Por que Retex<span class="lining">4K</span>?',
      'project.desc': 'Retex<span class="lining">4K</span> é um projeto de retexturização em <span class="lining">4K</span>. Começo com Fragile Dreams, um jogo que merece ser redescoberto. Retrabalhei suas texturas combinando upscale com IA e retoques manuais, mantendo a atmosfera original. É um projeto pessoal no meu tempo livre — se Fragile Dreams chegar ao fim, gostaria de continuar com outros jogos.',
      'home.feat1': 'Upscale com IA + retoques manuais, algumas texturas completamente refeitas do zero.',
      'home.feat2': 'Compatibilidade testada no Dolphin (versão europeia de Fragile Dreams).',
      'home.feat3': 'Contribuições e discussões no Discord.',
      'home.feat4': 'Uma dublagem francesa de Fragile Dreams está planejada — as audições serão no Discord quando o projeto se aproximar da versão 1.0.0.',
      'btn.discord': 'Servidor Discord', 'btn.discord.fd': 'Entrar no Discord', 'btn.mega': 'Baixar no MEGA',
      'footer.home': '© 2026 Retex4K by GLeFeu. Não afiliado aos desenvolvedores ou editores dos jogos que retexturizo.',
      'packs.eyebrow': 'Biblioteca de Videojogos', 'packs.title': 'Escolha o seu Texture Pack',
      'packs.desc': 'Cada jogo recebe o seu próprio tratamento, ao seu próprio ritmo.',
      'footer.packs': '© 2026 Retex4K by GLeFeu. Outros mundos talvez cheguem algum dia.',
      'fd.tagline': 'Uma retexturização completa de Farewell Ruins of the Moon',
      'stat.version': 'Versão atual', 'stat.date': '20 de junho de 2026', 'stat.resolution': 'Resolução', 'stat.world': 'Texturas concluídas',
      'compare.eyebrow': 'Comparação', 'compare.zoom': 'Duplo clique para ampliar', 'compare.left': 'Retex4K', 'compare.right': 'Original',
      'fd.about.eyebrow': 'Sobre o pack', 'fd.about.title': 'O que mudou',
      'fd.feat1': 'Todas as texturas de ambiente retrabalhadas em 4K.',
      'fd.feat2': 'Algumas texturas completamente reimaginadas, respeitando a atmosfera original.',
      'fd.feat3': 'Uma dublagem francesa está planejada — chegará após a versão 1.0.0.',
      'fd.dl.title': 'Baixar', 'fd.dl.desc': 'O pack está disponível gratuitamente no MEGA. Novas versões são anunciadas no servidor Discord.',
      'fd.dl.updated': 'Última atualização',
      'fd.about.eyebrow': 'Roadmap', 'fd.about.title': 'O que vem aí',
      'tl.01': 'Observatory', 'tl.02': 'Azabudai Underground Station', 'tl.03': 'Azabudai Station Mall',
      'tl.04': 'Lunar Hill Fun Land', 'tl.05': 'Underground Utility Tunnels', 'tl.06': 'Kurato Kankou Hotel',
      'tl.07': 'Oikawadani Dam', 'tl.08': 'Laboratory', 'tl.09': 'Twilight Tower',
      'tl.10': 'Release final e polish global', 'tl.post': 'Dublagem em francês',
      'footer.fd': '© 2026 Retex4K by GLeFeu. Fragile Dreams: Farewell Ruins of the Moon não está afiliado a este site.',
    },
    ja: {
      'nav.home': 'ホーム', 'nav.packs': 'テクスチャパック', 'nav.effects': 'エフェクト',
      'hero.eyebrow': '4Kテクスチャパック',
      'hero.title': '忘れられた世界に<br><em>新しい光を</em>',
      'hero.sub': 'もっと注目されるべきゲームのテクスチャを作り直しています。今は1つのゲームだけ：<em>Fragile Dreams</em>。',
      'hero.cta': 'パックを見る', 'scroll.cue': 'スクロール',
      'project.eyebrow': 'プロジェクト',
      'project.title': 'Retex<span class="lining">4K</span>とは',
      'project.desc': 'Retex<span class="lining">4K</span>は<span class="lining">4K</span>リテクスチャリングプロジェクトです。まずFragile Dreamsから始めます。このゲームはもっと多くの人に発見されるべき作品です。AIアップスケールと手作業の編集を組み合わせてテクスチャを作り直し、オリジナルの雰囲気を大切にしながら取り組んでいます。個人プロジェクトなのでゆっくり進んでいますが、完成したら他のゲームも続けたいと思っています。',
      'home.feat1': 'AIアップスケール＋手作業の修正、一部テクスチャはゼロから完全再制作。',
      'home.feat2': 'Dolphinでの動作確認済み（Fragile Dreamsヨーロッパ版）。',
      'home.feat3': 'Discordで貢献・議論が可能。',
      'home.feat4': 'Fragile Dreamsのフランス語吹き替えを予定 — バージョン1.0.0に近づいた頃にDiscordでオーディションを行います。',
      'btn.discord': 'Discordサーバー', 'btn.discord.fd': 'Discordに参加', 'btn.mega': 'MEGAでダウンロード',
      'footer.home': '© 2026 Retex4K by GLeFeu. リテクスチャするゲームの開発者・出版社とは無関係です。',
      'packs.eyebrow': 'ゲームライブラリ', 'packs.title': 'テクスチャパックを選ぶ',
      'packs.desc': '各ゲームには独自のペースで独自のアプローチが施されます。',
      'footer.packs': '© 2026 Retex4K by GLeFeu. いつか他の世界も訪れるかもしれません。',
      'fd.tagline': 'Farewell Ruins of the Moonの完全リテクスチャ',
      'stat.version': '現在のバージョン', 'stat.date': '2026年6月20日', 'stat.resolution': '解像度', 'stat.world': 'テクスチャ完成度',
      'compare.eyebrow': '比較', 'compare.zoom': 'ダブルクリックでズーム', 'compare.left': 'Retex4K', 'compare.right': 'オリジナル',
      'fd.about.eyebrow': 'パックについて', 'fd.about.title': '変更点',
      'fd.feat1': '全環境テクスチャを4Kにリワーク。',
      'fd.feat2': '一部テクスチャはオリジナルの雰囲気を尊重しつつ完全に再構築。',
      'fd.feat3': 'フランス語吹き替えを予定 — バージョン1.0.0以降に追加されます。',
      'fd.dl.title': 'ダウンロード', 'fd.dl.desc': 'パックはMEGAで無料配布中。新バージョンはDiscordサーバーで告知されます。',
      'fd.dl.updated': '最終更新',
      'fd.about.eyebrow': 'ロードマップ', 'fd.about.title': '今後の予定',
      'tl.01': 'Observatory', 'tl.02': 'Azabudai Underground Station', 'tl.03': 'Azabudai Station Mall',
      'tl.04': 'Lunar Hill Fun Land', 'tl.05': 'Underground Utility Tunnels', 'tl.06': 'Kurato Kankou Hotel',
      'tl.07': 'Oikawadani Dam', 'tl.08': 'Laboratory', 'tl.09': 'Twilight Tower',
      'tl.10': 'ファイナルリリース＆全体仕上げ', 'tl.post': 'フランス語吹き替え',
      'footer.fd': '© 2026 Retex4K by GLeFeu. Fragile Dreams: Farewell Ruins of the Moonはこのサイトとは無関係です。',
    },
  };

  function applyLang(code) {
    const dict = T[code];
    if (!dict) return;
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.dataset.i18n;
      if (dict[key] !== undefined) el.textContent = dict[key];
    });
    document.querySelectorAll('[data-i18n-html]').forEach(el => {
      const key = el.dataset.i18nHtml;
      if (dict[key] !== undefined) el.innerHTML = dict[key];
    });
    const l = LANGS[code];
    document.getElementById('lang-flag').textContent = l.flag;
    document.getElementById('lang-code').textContent = l.code;
    document.querySelectorAll('.lang-option').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.lang === code);
    });
    document.documentElement.lang = code;
    localStorage.setItem('lang', code);
  }

  const langBtn      = document.getElementById('lang-btn');
  const langDropdown = document.getElementById('lang-dropdown');

  langBtn.addEventListener('click', e => {
    e.stopPropagation();
    langDropdown.classList.toggle('open');
  });
  document.addEventListener('click', () => langDropdown.classList.remove('open'));

  document.querySelectorAll('.lang-option').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      applyLang(btn.dataset.lang);
      langDropdown.classList.remove('open');
    });
  });

  function detectLang() {
    const saved = localStorage.getItem('lang');
    if (saved && T[saved]) return saved;
    const browser = (navigator.language || navigator.userLanguage || 'fr').toLowerCase().split('-')[0];
    return T[browser] ? browser : 'en';
  }
  applyLang(detectLang());

  // ---------- Toggle effets visuels ----------
  const fxToggle = document.getElementById('fx-toggle');
  let fxOn = localStorage.getItem('fx') !== 'off';
  if (!fxOn) {
    document.body.classList.add('fx-off');
    if (fxToggle) fxToggle.classList.add('off');
  }
  if (fxToggle) {
    fxToggle.addEventListener('click', () => {
      fxOn = !fxOn;
      document.body.classList.toggle('fx-off', !fxOn);
      fxToggle.classList.toggle('off', !fxOn);
      localStorage.setItem('fx', fxOn ? 'on' : 'off');
    });
  }

  // ---------- Parallax on hero layers ----------
  const layers = document.querySelectorAll('[data-parallax]');

  let rafScroll = false;
  function onScroll() {
    if (rafScroll) return;
    rafScroll = true;
    requestAnimationFrame(() => {
      const sc = window.scrollY;
      layers.forEach((layer) => {
        const speed = parseFloat(layer.dataset.parallax) || 0.2;
        layer.style.transform = `translateY(${sc * speed}px)`;
      });
      rafScroll = false;
    });
  }
  window.addEventListener('scroll', onScroll, { passive: true });

  // Mouse-driven subtle parallax on hero content
  const hero = document.querySelector('.hero');
  if (hero) {
    hero.addEventListener('mousemove', (e) => {
      const x = (e.clientX / window.innerWidth - 0.5) * 2;
      const y = (e.clientY / window.innerHeight - 0.5) * 2;
      layers.forEach((layer) => {
        const depth = parseFloat(layer.dataset.depth) || 0;
        layer.style.marginLeft = `${x * depth}px`;
        layer.style.marginTop = `${y * depth}px`;
      });
    });
  }

  // ---------- Site background + particle color on card hover ----------
  const availableCard = document.querySelector('.game-card.available');
  if (availableCard) {
    availableCard.addEventListener('mouseenter', () => {
      if (siteBgReveal) siteBgReveal.classList.add('active');
      document.documentElement.style.setProperty('--particle-color', '#FF9DEB');
      document.documentElement.style.setProperty('--particle-glow', 'rgba(255, 157, 235, 0.6)');
    });
    availableCard.addEventListener('mouseleave', () => {
      if (currentView !== 'fragile-dreams') {
        if (siteBgReveal) siteBgReveal.classList.remove('active');
        document.documentElement.style.removeProperty('--particle-color');
        document.documentElement.style.removeProperty('--particle-glow');
      }
    });
  }

  // ---------- Floating ember particles ----------
  const particleField = document.querySelector('.particles');
  if (particleField) {
    const count = window.innerWidth < 640 ? 20 : 38;
    for (let i = 0; i < count; i++) {
      const p = document.createElement('div');
      p.className = 'particle';
      const size = 6 + Math.random() * 7;
      p.style.width = size + 'px';
      p.style.height = size + 'px';
      p.style.left = Math.random() * 100 + 'vw';
      p.style.top = (45 + Math.random() * 55) + 'vh';
      const driftDur = 14 + Math.random() * 18;
      p.style.setProperty('--drift-dur', driftDur + 's');
      p.style.setProperty('--flicker-dur', (8 + Math.random() * 8) + 's');
      p.style.animationDelay = (-Math.random() * driftDur) + 's';
      particleField.appendChild(p);
    }
  }

  // ---------- Water simulation (height map physique) ----------
  const waterCanvas = document.getElementById('water-canvas');
  if (waterCanvas) {
    const wctx   = waterCanvas.getContext('2d');
    const simCvs = document.createElement('canvas');
    const simCtx = simCvs.getContext('2d');
    const S      = 4;
    const DAMP   = 0.978;
    let W, H, ping, pong, imgData;

    function initWater() {
      W = Math.min(Math.ceil(window.innerWidth  / S), 480);
      H = Math.min(Math.ceil(window.innerHeight / S), 270);
      ping    = new Float32Array(W * H);
      pong    = new Float32Array(W * H);
      imgData = simCtx.createImageData(W, H);
      simCvs.width  = W;
      simCvs.height = H;
      waterCanvas.width  = window.innerWidth;
      waterCanvas.height = window.innerHeight;
    }
    initWater();
    window.addEventListener('resize', initWater);

    function splash(sx, sy, force) {
      const cx = Math.round(sx / S);
      const cy = Math.round(sy / S);
      const r  = 3;
      for (let dy = -r; dy <= r; dy++) {
        for (let dx = -r; dx <= r; dx++) {
          const nx = cx + dx, ny = cy + dy;
          if (nx > 0 && nx < W - 1 && ny > 0 && ny < H - 1)
            ping[ny * W + nx] += force;
        }
      }
    }

    function stepWater() {
      for (let y = 1; y < H - 1; y++) {
        for (let x = 1; x < W - 1; x++) {
          const i  = y * W + x;
          pong[i]  = (ping[i-1] + ping[i+1] + ping[i-W] + ping[i+W]) * 0.5 - pong[i];
          pong[i] *= DAMP;
        }
      }
      const tmp = ping; ping = pong; pong = tmp;
    }

    function renderWater() {
      const d = imgData.data;
      d.fill(0);
      for (let y = 1; y < H - 1; y++) {
        for (let x = 1; x < W - 1; x++) {
          const i     = y * W + x;
          const nx    = ping[i+1] - ping[i-1];
          const ny    = ping[i+W] - ping[i-W];
          const light = Math.max(0, Math.min(1, (-nx - ny) * 0.014 + 0.02));
          if (light < 0.015) continue;
          const pi  = i * 4;
          d[pi]     = Math.round(light * 25);
          d[pi + 1] = Math.round(light * 46);
          d[pi + 2] = Math.round(light * 76);
          d[pi + 3] = Math.round(light * 44);
        }
      }
      // Écrire sur le petit canvas, puis upscaler en doux sur le canvas affiché
      simCtx.putImageData(imgData, 0, 0);
      wctx.clearRect(0, 0, waterCanvas.width, waterCanvas.height);
      wctx.imageSmoothingEnabled = true;
      wctx.drawImage(simCvs, 0, 0, waterCanvas.width, waterCanvas.height);
    }

    const recentDrops = [];
    function dropRain() {
      const minDist = window.innerWidth * 0.18;
      let x, y, tries = 0;
      do {
        x = window.innerWidth  * (0.15 + Math.random() * 0.70);
        y = window.innerHeight * (0.15 + Math.random() * 0.70);
        tries++;
      } while (
        tries < 20 &&
        recentDrops.some(d => Math.hypot(x - d.x, y - d.y) < minDist)
      );
      recentDrops.push({ x, y });
      if (recentDrops.length > 8) recentDrops.shift();
      splash(x, y, 180 + Math.random() * 120);
      setTimeout(dropRain, 4000 + Math.random() * 2000);
    }
    dropRain();

    let waterFrame = 0;

    (function waterLoop() {
      requestAnimationFrame(waterLoop);
      if (document.hidden || !fxOn) return;
      waterFrame++;
      if (waterFrame % 2 !== 0) return;
      stepWater();
      renderWater();
    })();
  }

  // ---------- Scroll-reveal for sections ----------
  const revealEls = document.querySelectorAll('.game-card, .fd-feature-list li, .fd-gallery-item');
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.remove('reveal-hidden');
            entry.target.classList.add('reveal-visible');
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15 }
    );
    revealEls.forEach((el) => {
      el.classList.add('reveal-hidden');
      io.observe(el);
    });
  }
})();
