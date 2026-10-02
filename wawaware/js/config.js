// Version du jeu : à changer à chaque mise en ligne. Elle force le navigateur à recharger les
// fichiers, et deux joueurs de versions différentes ne peuvent pas se retrouver dans la même salle.
const WAWAWARE_VERSION = '2026.10.02-12';

// Réglages de mise en ligne.
//
// Par défaut (chaîne vide), le jeu se connecte au serveur multijoueur qui l'a servi (lancer.bat).
// Sur le site (GitHub Pages), la page est statique : le multijoueur passe par le serveur Render.
// Pour tester une copie du site avec un serveur local : ajoute ?serveur=ws://localhost:3000/wawaware
const WAWAWARE_SERVEUR = (() => {
  try {
    const o = new URLSearchParams(location.search).get('serveur');
    if (o && /^ws:\/\/(localhost|127\.0\.0\.1)(:\d+)?(\/.*)?$/.test(o)) return o;
  } catch { /* ignore */ }
  return 'wss://retex4k.onrender.com/wawaware';
})();
