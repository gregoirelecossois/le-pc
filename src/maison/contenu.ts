/**
 * « Le PC à la maison » — le contenu des cinq missions.
 *
 * Ce travail se fait SEUL, sur un téléphone, en vingt minutes au plus, après une
 * unique séance de découverte en classe. Tout ce qui suit en découle :
 *
 *  - les textes sont réécrits court. Le catalogue du jeu (data/components) s'adresse
 *    à un élève accompagné, devant un grand écran ; ici, une phrase, un mot simple,
 *    une image mentale. Les IMAGES MENTALES, elles, sont les mêmes que dans le jeu
 *    (le cerveau, le plan de travail, l'armoire…) : l'élève retrouve ce qu'il a vu ;
 *  - douze pièces et non quinze : les deux barrettes de mémoire et les deux
 *    ventilateurs sont présentés une fois, et le SSD 2,5" est laissé de côté — deux
 *    SSD à distinguer, c'est une difficulté de lecture, pas de technologie ;
 *  - chaque mission enchaîne une leçon de trois cartes et un jeu d'un seul type :
 *    l'élève n'a jamais deux règles à comprendre à la fois.
 *
 * Les modèles 3D et les photos viennent du jeu (three/PartSpinner, three/Thumbnails).
 */

import type { PartId } from '@/three/models'
import type { ShotId } from '@/three/Thumbnails'

export type PieceId =
  | 'boitier'
  | 'carteMere'
  | 'alim'
  | 'processeur'
  | 'ventirad'
  | 'ram'
  | 'ssd'
  | 'disqueDur'
  | 'lecteur'
  | 'carteGraphique'
  | 'ventilateur'
  | 'pile'

export type Place = 'carteMere' | 'boitier'

export interface Piece {
  id: PieceId
  /** Modèle 3D du jeu qui la représente */
  modele: PartId | 'case'
  /** « Le processeur » : tel qu'on l'écrit en tête de carte et dans les réponses */
  nom: string
  /** Le même, au fil d'une phrase : « le processeur » */
  nomPhrase: string
  /** À quoi ça sert, en une phrase courte */
  role: string
  /**
   * Son travail, à l'infinitif, pour le jeu des paires. Surtout PAS « Il… » / « Elle… » :
   * le genre du pronom désignerait la bonne pièce sans qu'on ait rien compris.
   */
  roleCourt: string
  /** L'image mentale — la même que dans le jeu */
  comme: string
  /** Où elle se trouve, dit simplement */
  ou: string
  /** Sa place, pour le jeu de tri (le boîtier et la carte mère n'y figurent pas) */
  place?: Place
  /** Affiché si les images 3D ne sont pas disponibles */
  secours: string
  couleur: string
}

export const PIECES: Record<PieceId, Piece> = {
  boitier: {
    id: 'boitier',
    modele: 'case',
    nom: 'Le boîtier',
    nomPhrase: 'le boîtier',
    role: 'Il protège toutes les pièces et les tient à leur place.',
    roleCourt: "Protéger toutes les pièces",
    comme: "C'est comme la carrosserie d'une voiture.",
    ou: "C'est la grande boîte que tu vois de l'extérieur.",
    secours: '🗄️',
    couleur: '#c3cbd9',
  },
  carteMere: {
    id: 'carteMere',
    modele: 'motherboard',
    nom: 'La carte mère',
    nomPhrase: 'la carte mère',
    role: "C'est la grande plaque. Toutes les autres pièces se branchent sur elle.",
    roleCourt: "Relier toutes les pièces entre elles",
    comme: "C'est comme les routes d'une ville : tout passe par elle.",
    ou: 'Elle est vissée au fond du boîtier.',
    secours: '🟩',
    couleur: '#4ade80',
  },
  alim: {
    id: 'alim',
    modele: 'psu',
    nom: "L'alimentation",
    nomPhrase: "l'alimentation",
    role: "Elle donne de l'électricité à toutes les pièces.",
    roleCourt: "Donner l'électricité",
    comme: "C'est comme le cœur : elle envoie l'énergie partout.",
    ou: 'Elle est vissée en bas du boîtier.',
    place: 'boitier',
    secours: '🔌',
    couleur: '#ffd166',
  },
  processeur: {
    id: 'processeur',
    modele: 'cpu',
    nom: 'Le processeur',
    nomPhrase: 'le processeur',
    role: "Il fait tous les calculs. C'est lui qui commande l'ordinateur.",
    roleCourt: "Faire tous les calculs",
    comme: "C'est comme le cerveau.",
    ou: 'Il se pose sur la carte mère.',
    place: 'carteMere',
    secours: '🧠',
    couleur: '#ff8a3d',
  },
  ventirad: {
    id: 'ventirad',
    modele: 'cooler',
    nom: 'Le ventirad',
    nomPhrase: 'le ventirad',
    role: 'Il refroidit le processeur, qui chauffe beaucoup.',
    roleCourt: "Refroidir le processeur",
    comme: "C'est un ventilateur posé sur un radiateur.",
    ou: 'Il est posé juste au-dessus du processeur.',
    secours: '❄️',
    couleur: '#7dd3fc',
  },
  ram: {
    id: 'ram',
    modele: 'ram1',
    nom: 'La mémoire vive',
    nomPhrase: 'la mémoire vive',
    role: "Elle garde ce que tu utilises en ce moment. Elle se vide quand on éteint l'ordinateur.",
    roleCourt: "Garder ce que tu utilises en ce moment",
    comme: "C'est comme ta table de travail : on la range quand on a fini.",
    ou: 'Ses barrettes se clipsent sur la carte mère.',
    place: 'carteMere',
    secours: '📏',
    couleur: '#4dd0e1',
  },
  ssd: {
    id: 'ssd',
    modele: 'ssd',
    nom: 'Le SSD',
    nomPhrase: 'le SSD',
    role: "Il garde tes fichiers et tes jeux, même quand l'ordinateur est éteint. Il est très rapide.",
    roleCourt: "Garder tes fichiers, très vite",
    comme: "C'est comme une très grande clé USB.",
    ou: 'Il se visse sur la carte mère.',
    place: 'carteMere',
    secours: '⚡',
    couleur: '#a78bfa',
  },
  disqueDur: {
    id: 'disqueDur',
    modele: 'hdd',
    nom: 'Le disque dur',
    nomPhrase: 'le disque dur',
    role: "Il garde beaucoup de fichiers, même quand l'ordinateur est éteint. Il est plus lent que le SSD.",
    roleCourt: "Garder beaucoup de fichiers, lentement",
    comme: "C'est comme une grande armoire.",
    ou: 'Il se range dans le boîtier, vers l’avant.',
    place: 'boitier',
    secours: '💽',
    couleur: '#a78bfa',
  },
  lecteur: {
    id: 'lecteur',
    modele: 'odd',
    nom: 'Le lecteur de CD / DVD',
    nomPhrase: 'le lecteur de CD / DVD',
    role: 'Il lit les disques : les CD et les DVD.',
    roleCourt: "Lire les CD et les DVD",
    comme: "C'est comme le lecteur DVD du salon.",
    ou: 'Il est en haut du boîtier, son tiroir sort par devant.',
    place: 'boitier',
    secours: '💿',
    couleur: '#38bdf8',
  },
  carteGraphique: {
    id: 'carteGraphique',
    modele: 'gpu',
    nom: 'La carte graphique',
    nomPhrase: 'la carte graphique',
    role: "Elle fabrique les images que tu vois à l'écran.",
    roleCourt: "Fabriquer les images de l'écran",
    comme: "C'est comme un dessinateur très, très rapide.",
    ou: 'Elle se clipse sur la carte mère.',
    place: 'carteMere',
    secours: '🖼️',
    couleur: '#66d17a',
  },
  ventilateur: {
    id: 'ventilateur',
    modele: 'fanFront',
    nom: 'Le ventilateur',
    nomPhrase: 'le ventilateur',
    role: "Il fait entrer l'air frais dans le boîtier et sortir l'air chaud.",
    roleCourt: "Faire entrer l'air frais",
    comme: "C'est comme ouvrir la fenêtre pour faire un courant d'air.",
    ou: 'Il est vissé sur le boîtier : un devant, un derrière.',
    place: 'boitier',
    secours: '🌀',
    couleur: '#7dd3fc',
  },
  pile: {
    id: 'pile',
    modele: 'cmos',
    nom: 'La pile',
    nomPhrase: 'la pile',
    role: "Elle garde l'heure quand l'ordinateur est débranché.",
    roleCourt: "Garder l'heure",
    comme: "C'est comme la pile d'une montre.",
    ou: 'Elle est sur la carte mère.',
    place: 'carteMere',
    secours: '🔋',
    couleur: '#ffd166',
  },
}

export const PIECE_IDS = Object.keys(PIECES) as PieceId[]

/** La photo de catalogue d'une pièce (prise dans le moteur 3D du jeu). */
export function photoDe(id: PieceId): ShotId {
  const m = PIECES[id].modele
  return m === 'case' ? 'case' : (`part:${m}` as ShotId)
}

export const PHOTOS: ShotId[] = PIECE_IDS.map(photoDe)

/* ------------------------------------------------------------------ */
/*  Les jeux                                                           */
/* ------------------------------------------------------------------ */

/** Une image, trois noms : « Comment s'appelle cette pièce ? » */
export interface QNom {
  type: 'nom'
  piece: PieceId
  /** Les deux mauvaises réponses — toujours des pièces déjà vues */
  leurres: [PieceId, PieceId]
}

/** Une question, quatre images : « Quelle pièce… ? » */
export interface QImage {
  type: 'image'
  question: string
  piece: PieceId
  leurres: [PieceId, PieceId, PieceId]
}

export type Question = QNom | QImage

export interface Affirmation {
  texte: string
  vrai: boolean
  /** Ce qu'on dit après la réponse, bonne ou mauvaise */
  retour: string
  piece: PieceId
}

export type Jeu =
  | { type: 'quiz'; titre: string; consigne: string; questions: Question[] }
  | { type: 'paires'; titre: string; consigne: string; pieces: PieceId[] }
  | { type: 'vraiFaux'; titre: string; consigne: string; affirmations: Affirmation[] }
  | { type: 'tri'; titre: string; consigne: string; pieces: PieceId[] }

/** Une carte de leçon : une pièce, ou un rappel écrit. */
export type Carte =
  | { type: 'piece'; piece: PieceId }
  | { type: 'rappel'; titre: string; lignes: { piece: PieceId; texte: string }[]; phrase: string }

export interface Mission {
  id: string
  /** Emoji de la tuile, sur la carte des missions */
  icone: string
  titre: string
  /** Sous le titre : ce qu'on va apprendre */
  accroche: string
  cartes: Carte[]
  jeu: Jeu
}

export const MISSIONS: Mission[] = [
  {
    id: 'base',
    icone: '🧱',
    titre: 'Les trois grands',
    accroche: 'Le boîtier, la carte mère et l’alimentation.',
    cartes: [
      { type: 'piece', piece: 'boitier' },
      { type: 'piece', piece: 'carteMere' },
      { type: 'piece', piece: 'alim' },
    ],
    jeu: {
      type: 'quiz',
      titre: 'Qui est-ce ?',
      consigne: 'Regarde la pièce. Touche son nom.',
      questions: [
        { type: 'nom', piece: 'carteMere', leurres: ['boitier', 'alim'] },
        { type: 'nom', piece: 'alim', leurres: ['carteMere', 'boitier'] },
        { type: 'nom', piece: 'boitier', leurres: ['alim', 'carteMere'] },
        {
          type: 'image',
          question: 'Sur quelle pièce se branchent toutes les autres ?',
          piece: 'carteMere',
          leurres: ['boitier', 'alim', 'ventilateur'],
        },
      ],
    },
  },
  {
    id: 'cerveau',
    icone: '🧠',
    titre: 'Le cerveau du PC',
    accroche: 'Le processeur, le ventirad et la mémoire vive.',
    cartes: [
      { type: 'piece', piece: 'processeur' },
      { type: 'piece', piece: 'ventirad' },
      { type: 'piece', piece: 'ram' },
    ],
    jeu: {
      type: 'paires',
      titre: 'Les paires',
      consigne: 'Touche une pièce, puis touche son travail.',
      pieces: ['processeur', 'ventirad', 'ram', 'alim'],
    },
  },
  {
    id: 'fichiers',
    icone: '💾',
    titre: 'Garder les fichiers',
    accroche: 'Le SSD, le disque dur et le lecteur de CD / DVD.',
    cartes: [
      { type: 'piece', piece: 'ssd' },
      { type: 'piece', piece: 'disqueDur' },
      { type: 'piece', piece: 'lecteur' },
    ],
    jeu: {
      type: 'vraiFaux',
      titre: 'Vrai ou faux ?',
      consigne: 'Lis la phrase. Est-ce vrai ou faux ?',
      affirmations: [
        {
          texte: "Le SSD garde tes fichiers, même quand l'ordinateur est éteint.",
          vrai: true,
          retour: 'Oui. Le SSD ne perd rien quand on éteint.',
          piece: 'ssd',
        },
        {
          texte: "La mémoire vive garde tout quand on éteint l'ordinateur.",
          vrai: false,
          retour: "Non. La mémoire vive se vide quand on éteint. C'est le SSD qui garde les fichiers.",
          piece: 'ram',
        },
        {
          texte: 'Le disque dur est plus rapide que le SSD.',
          vrai: false,
          retour: "Non. C'est le SSD le plus rapide. Le disque dur est plus lent.",
          piece: 'disqueDur',
        },
        {
          texte: 'Le lecteur de CD / DVD lit des disques.',
          vrai: true,
          retour: 'Oui. Il lit les CD et les DVD.',
          piece: 'lecteur',
        },
        {
          texte: "Le processeur est le cerveau de l'ordinateur.",
          vrai: true,
          retour: 'Oui. Il fait tous les calculs.',
          piece: 'processeur',
        },
      ],
    },
  },
  {
    id: 'place',
    icone: '🧩',
    titre: 'Chacun à sa place',
    accroche: 'La carte graphique, le ventilateur, la pile… et où tout se range.',
    cartes: [
      { type: 'piece', piece: 'carteGraphique' },
      { type: 'piece', piece: 'ventilateur' },
      { type: 'piece', piece: 'pile' },
      {
        type: 'rappel',
        titre: 'Où se rangent les pièces ?',
        lignes: [
          { piece: 'carteMere', texte: 'Sur la carte mère : le processeur, la mémoire vive, le SSD, la carte graphique, la pile.' },
          { piece: 'boitier', texte: 'Dans le boîtier : l’alimentation, le disque dur, le lecteur de CD / DVD, les ventilateurs.' },
        ],
        phrase:
          'Sur la carte mère : le processeur, la mémoire vive, le SSD, la carte graphique et la pile. Dans le boîtier : l’alimentation, le disque dur, le lecteur de CD DVD et les ventilateurs.',
      },
    ],
    jeu: {
      type: 'tri',
      titre: 'À sa place !',
      consigne: 'Où se range cette pièce ?',
      pieces: ['processeur', 'alim', 'ram', 'disqueDur', 'carteGraphique', 'ventilateur'],
    },
  },
  {
    id: 'defi',
    icone: '🏆',
    titre: 'Le défi final',
    accroche: 'Huit questions sur tout ce que tu as vu.',
    cartes: [
      {
        type: 'rappel',
        titre: 'Tu connais 12 pièces !',
        lignes: [
          { piece: 'processeur', texte: 'Le processeur calcule. Le ventirad le refroidit.' },
          { piece: 'ram', texte: 'La mémoire vive se vide quand on éteint.' },
          { piece: 'ssd', texte: 'Le SSD et le disque dur gardent les fichiers.' },
          { piece: 'carteGraphique', texte: 'La carte graphique fabrique les images.' },
        ],
        phrase:
          'Le processeur calcule. Le ventirad le refroidit. La mémoire vive se vide quand on éteint. Le SSD et le disque dur gardent les fichiers. La carte graphique fabrique les images.',
      },
    ],
    jeu: {
      type: 'quiz',
      titre: 'Le défi final',
      consigne: 'Regarde la pièce. Touche son nom.',
      questions: [
        {
          type: 'image',
          question: "Quelle pièce fabrique les images de l'écran ?",
          piece: 'carteGraphique',
          leurres: ['carteMere', 'ram', 'disqueDur'],
        },
        { type: 'nom', piece: 'ram', leurres: ['ssd', 'processeur'] },
        {
          type: 'image',
          question: 'Quelle pièce refroidit le processeur ?',
          piece: 'ventirad',
          leurres: ['alim', 'ventilateur', 'pile'],
        },
        { type: 'nom', piece: 'disqueDur', leurres: ['lecteur', 'alim'] },
        {
          type: 'image',
          question: "Quelle pièce donne de l'électricité à toutes les autres ?",
          piece: 'alim',
          leurres: ['processeur', 'boitier', 'lecteur'],
        },
        { type: 'nom', piece: 'lecteur', leurres: ['disqueDur', 'boitier'] },
        {
          type: 'image',
          question: "Quelle pièce garde l'heure quand l'ordinateur est débranché ?",
          piece: 'pile',
          leurres: ['ssd', 'ram', 'carteGraphique'],
        },
        { type: 'nom', piece: 'processeur', leurres: ['pile', 'ssd'] },
      ],
    },
  },
]

/** Nombre de points à gagner dans un jeu : un par réponse. */
export function pointsDuJeu(j: Jeu): number {
  switch (j.type) {
    case 'quiz':
      return j.questions.length
    case 'paires':
      return j.pieces.length
    case 'vraiFaux':
      return j.affirmations.length
    case 'tri':
      return j.pieces.length
  }
}

export const SCORE_MAX = MISSIONS.reduce((n, m) => n + pointsDuJeu(m.jeu), 0)

/** Identifiant de ce travail côté serveur (colonne `devoir`). */
export const DEVOIR = 'pc-1'
