// Liste de tous les mini-jeux, rangés par dossier (= type de contrôle).
// Pour ajouter un jeu : crée js/games/<dossier>/<nom>.js puis ajoute <nom> ici.
const GAME_FILES = {
  souris: ['mouche', 'crever', 'taupe', 'intrus', 'clou', 'nourris', 'cible', 'oeuf', 'lumieres', 'fil', 'bonneteau',
    'grand', 'popups', 'pommes', 'verre', 'basket', 'puzzle', 'duel', 'combien', 'trouve', 'jongle', 'peinture',
    'dessine', 'golf', 'tri', 'ordre', 'zip', 'flechettes', 'ombre', 'paire', 'boutonfuyant', 'clicdroit', 'captcha'],
  curseur: ['suis', 'labyrinthe', 'secoue', 'evite', 'tranche', 'aimant', 'lampe', 'caresse', 'pong', 'bouclier',
    'parapluie', 'chatsouris', 'equilibre', 'nettoie', 'abeille', 'laser', 'arrose', 'pousse', 'cercles', 'chatlaser',
    'berger', 'statue'],
  molette: ['ballon', 'radio', 'peche', 'route', 'focus', 'ascenseur', 'vis', 'coffre', 'toupie', 'catapulte',
    'melange', 'sousmarin', 'thermostat', 'verse', 'horloge', 'niveau'],
  clavier: ['saut', 'esquive', 'mot', 'course', 'sequence', 'panier', 'stop', 'flappy', 'radis', 'pianiste',
    'calculclavier', 'tirdecorde', 'dedale', 'serpent', 'traverse', 'boxe', 'tennis', 'muscle', 'nebouge', 'touche',
    'ninja', 'empile', 'atterris', 'invaders', 'parachute', 'gardien', 'code', 'crepe', 'sautecorde', 'lettres'],
  micro: ['bougies', 'fusee', 'chut', 'plume', 'voilier', 'moulin', 'bulle', 'pissenlit', 'reveil', 'note',
    'applaudis', 'fantome',
    // à la voix (reconnaissance de mots)
    'dresse', 'aupied', 'attrape', 'couleur', 'compte', 'animal', 'direction', 'calculvoix', 'chifoumi',
    'ouinon', 'magie', 'photo', 'contraire', 'lis'],
};

// Chargement dans l'ordre (document.write fonctionne aussi en ouvrant index.html directement)
for (const [dir, names] of Object.entries(GAME_FILES)) {
  for (const n of names) document.write(`<script src="js/games/${dir}/${n}.js?v=${WAWAWARE_VERSION}"><\/script>`);
}
