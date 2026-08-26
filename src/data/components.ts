/**
 * Catalogue pédagogique des composants d'une unité centrale ATX moderne.
 * Chaque fiche est écrite pour un élève de cycle 4 (5e -> 3e).
 */

export type ComponentId =
  | 'case'
  | 'psu'
  | 'motherboard'
  | 'cpu'
  | 'cooler'
  | 'ram1'
  | 'ram2'
  | 'gpu'
  | 'ssd'
  | 'ssd25'
  | 'hdd'
  | 'odd'
  | 'fanFront'
  | 'fanRear'
  | 'cmos'

export type Category =
  | 'structure'
  | 'calcul'
  | 'memoire'
  | 'stockage'
  | 'energie'
  | 'refroidissement'
  | 'affichage'

export interface PcComponent {
  id: ComponentId
  /** Nom complet affiché dans les fiches */
  name: string
  /** Nom court pour les étiquettes 3D et les boutons */
  shortName: string
  /** Sigle usuel (CPU, RAM, GPU...) */
  acronym?: string
  category: Category
  /** Une phrase : à quoi ça sert */
  role: string
  /** L'analogie qui fait comprendre en 3 secondes */
  analogy: string
  /** 2 à 4 précisions concrètes */
  details: string[]
  /** Le geste réel à connaître avant de démonter une vraie machine */
  handling: string
  /** Anecdote / ordre de grandeur */
  funFact: string
  /** Ordre de montage (1 = en premier) */
  installOrder: number
  /** Ce qui doit déjà être en place pour pouvoir l'installer */
  requires: ComponentId[]
  /** Message pédagogique si l'élève tente de l'installer trop tôt */
  requiresHint?: string
  /** Mauvaises réponses plausibles pour les QCM */
  distractors: string[]
  /** Couleur d'accent de la fiche */
  color: string
}

export const CATEGORY_LABEL: Record<Category, string> = {
  structure: 'Structure',
  calcul: 'Calcul',
  memoire: 'Mémoire',
  stockage: 'Stockage',
  energie: 'Énergie',
  refroidissement: 'Refroidissement',
  affichage: 'Image',
}

export const CATEGORY_COLOR: Record<Category, string> = {
  structure: '#8a93a6',
  calcul: '#ff8a3d',
  memoire: '#4dd0e1',
  stockage: '#a78bfa',
  energie: '#ffd166',
  refroidissement: '#7dd3fc',
  affichage: '#66d17a',
}

export const COMPONENTS: Record<ComponentId, PcComponent> = {
  case: {
    id: 'case',
    name: 'Le boîtier (la tour)',
    shortName: 'Boîtier',
    category: 'structure',
    role: "C'est la carrosserie de l'ordinateur : il protège les composants, les maintient en place et organise la circulation de l'air.",
    analogy:
      'Le squelette et la carrosserie réunis. Sans lui, tous les composants seraient posés en vrac sur la table.',
    details: [
      "Il est en acier et en plastique, avec un panneau latéral qui s'ouvre (souvent 2 vis à l'arrière).",
      'Des picots métalliques (les entretoises) surélèvent la carte mère pour qu\'elle ne touche pas le métal.',
      "L'air frais entre par l'avant, l'air chaud sort par l'arrière et par le haut.",
    ],
    handling: 'On couche toujours la tour sur le côté avant de travailler dedans, ouverture vers le haut.',
    funFact:
      "Le format « ATX » date de 1995 : c'est pour ça qu'un boîtier d'aujourd'hui accepte encore des cartes mères conçues il y a 30 ans.",
    installOrder: 0,
    requires: [],
    distractors: ['La carte mère', "Le bloc d'alimentation", 'Le dissipateur'],
    color: '#8a93a6',
  },

  psu: {
    id: 'psu',
    name: "Le bloc d'alimentation",
    shortName: 'Alimentation',
    acronym: 'PSU',
    category: 'energie',
    role: "Il transforme le courant de la prise murale (230 V alternatif) en courants faibles et continus (12 V, 5 V, 3,3 V) utilisables par les composants.",
    analogy: 'Le cœur : il envoie l\'énergie dans tout le corps par un réseau de « veines », les câbles.',
    details: [
      "Il se visse en bas du boîtier, ventilateur tourné vers le sol (les trous d'aération sont dessous).",
      'Sa puissance se mesure en watts (W) : 500 à 750 W pour un PC de bureau classique.',
      'Il fournit des câbles différents : 24 broches pour la carte mère, 8 broches pour le processeur, PCIe pour la carte graphique, SATA pour les disques.',
    ],
    handling:
      'DANGER : on ne l\'ouvre JAMAIS, même débranché. Il contient des condensateurs qui gardent la charge électrique.',
    funFact:
      "Un bloc « 80 PLUS Bronze » perd environ 15 % de l'énergie en chaleur : c'est un petit radiateur caché dans ton PC.",
    installOrder: 1,
    requires: ['case'],
    distractors: ['Le processeur', 'Le disque dur', 'La carte graphique'],
    color: '#ffd166',
  },

  motherboard: {
    id: 'motherboard',
    name: 'La carte mère',
    shortName: 'Carte mère',
    category: 'structure',
    role: "C'est la grande plaque verte sur laquelle tout se branche. Elle relie électriquement tous les composants entre eux et leur distribue le courant.",
    analogy:
      "Le réseau routier de la ville : toutes les informations circulent sur ses pistes de cuivre pour aller d'un composant à l'autre.",
    details: [
      'Elle porte le support du processeur (le socket), les slots de mémoire, les slots PCIe et les connecteurs SATA.',
      "À l'arrière, son panneau de connectique sort du boîtier : c'est là qu'on branche clavier, souris, réseau, son.",
      'Elle se fixe avec 6 à 9 vis sur les entretoises du boîtier.',
    ],
    handling:
      "On la tient par les bords, jamais par les circuits. On se décharge de l'électricité statique en touchant le métal du boîtier avant.",
    funFact:
      'Les lignes que tu vois dessus sont de vraies pistes de cuivre : mises bout à bout, il y en a plusieurs centaines de mètres.',
    installOrder: 2,
    requires: ['case'],
    distractors: ['La carte graphique', 'La carte son', "Le circuit d'alimentation"],
    color: '#4ade80',
  },

  cpu: {
    id: 'cpu',
    name: 'Le processeur',
    shortName: 'Processeur',
    acronym: 'CPU',
    category: 'calcul',
    role: "C'est lui qui exécute les calculs et les instructions des programmes. Tout ce que fait l'ordinateur passe par lui.",
    analogy: 'Le cerveau : il reçoit les ordres, les traite et donne les résultats. Très rapide, mais il ne retient rien tout seul.',
    details: [
      "Il se pose dans le socket de la carte mère, sans forcer : un petit triangle doré doit correspondre au triangle du support.",
      'Sa vitesse se mesure en gigahertz (GHz) : 3 GHz = 3 milliards d\'opérations élémentaires par seconde.',
      'Il possède plusieurs « cœurs » (4, 6, 8...) qui travaillent en parallèle, comme plusieurs cerveaux dans la même puce.',
    ],
    handling:
      'On le prend par les côtés, jamais sous les contacts dorés. On abaisse le levier du socket : ça claque, c\'est normal.',
    funFact:
      'Un processeur moderne contient plus de 10 milliards de transistors sur une surface plus petite qu\'un timbre.',
    installOrder: 3,
    requires: ['motherboard'],
    requiresHint: "Le processeur se pose dans le socket : il faut d'abord installer la carte mère.",
    distractors: ['La mémoire vive', 'La pile CMOS', 'Le chipset'],
    color: '#ff8a3d',
  },

  cooler: {
    id: 'cooler',
    name: 'Le ventirad (refroidissement du processeur)',
    shortName: 'Ventirad',
    category: 'refroidissement',
    role: "Il évacue la chaleur produite par le processeur. Sans lui, le processeur atteindrait 100 °C en quelques secondes et se mettrait en sécurité.",
    analogy:
      "Le radiateur et le ventilateur d'une voiture : les ailettes étalent la chaleur, le ventilateur la souffle dehors.",
    details: [
      '« Ventirad » = VENTIlateur + RADiateur. Les ailettes en aluminium multiplient la surface de contact avec l\'air.',
      'Entre le processeur et le radiateur, on met une noisette de pâte thermique pour combler les micro-trous.',
      'Son câble à 4 broches se branche sur le connecteur CPU_FAN de la carte mère.',
    ],
    handling: 'On visse les 4 fixations en croix (une diagonale, puis l\'autre) pour appuyer bien à plat sur le processeur.',
    funFact:
      'Un processeur de bureau dissipe 65 à 125 W de chaleur : autant qu\'une vieille ampoule à filament.',
    installOrder: 4,
    requires: ['cpu'],
    requiresHint:
      'Le ventirad se pose SUR le processeur. Installe d\'abord le processeur, sinon tu refroidirais un support vide !',
    distractors: ['Le ventilateur du boîtier', "Le bloc d'alimentation", 'Le dissipateur du chipset'],
    color: '#7dd3fc',
  },

  ram1: {
    id: 'ram1',
    name: 'La mémoire vive (barrette 1)',
    shortName: 'Mémoire vive 1',
    acronym: 'RAM',
    category: 'memoire',
    role: "Elle stocke temporairement les programmes et les fichiers en cours d'utilisation, pour que le processeur y accède très vite.",
    analogy:
      'Ton plan de travail : plus il est grand, plus tu peux étaler de choses en même temps. Mais on le vide entièrement à chaque extinction.',
    details: [
      'Elle est VOLATILE : quand on éteint le PC, tout ce qu\'elle contient disparaît.',
      'Elle se mesure en gigaoctets (Go) : 8 ou 16 Go sur un PC actuel.',
      'La barrette a une encoche décentrée (le détrompeur) : elle ne peut entrer que dans un seul sens.',
    ],
    handling: 'On ouvre les clips, on aligne l\'encoche, puis on appuie fermement aux deux extrémités jusqu\'au CLAC.',
    funFact:
      'La RAM est environ 100 000 fois plus rapide qu\'un disque dur mécanique. C\'est pour ça qu\'on ne s\'en passe pas.',
    installOrder: 5,
    requires: ['motherboard'],
    requiresHint: 'Les barrettes se clipsent dans les slots de la carte mère : installe-la d\'abord.',
    distractors: ['Le processeur', 'Le SSD M.2', 'La carte graphique'],
    color: '#4dd0e1',
  },

  ram2: {
    id: 'ram2',
    name: 'La mémoire vive (barrette 2)',
    shortName: 'Mémoire vive 2',
    acronym: 'RAM',
    category: 'memoire',
    role: "La deuxième barrette double la quantité de mémoire ET la vitesse d'échange (mode « double canal »).",
    analogy: 'Deux barrettes = deux voies au lieu d\'une seule sur l\'autoroute des données.',
    details: [
      'On installe les barrettes par paires, dans les slots de MÊME couleur (souvent les slots 2 et 4).',
      '2 × 8 Go fonctionnent mieux qu\'une seule barrette de 16 Go.',
      'Elle se clipse exactement comme la première.',
    ],
    handling: 'Même geste : clips ouverts, encoche alignée, on pousse jusqu\'au clic des deux côtés.',
    funFact: 'Le mode double canal apporte 10 à 20 % de performance en plus, gratuitement.',
    installOrder: 6,
    requires: ['ram1'],
    requiresHint: 'Commence par la première barrette de mémoire vive.',
    distractors: ['Le processeur', 'Le disque dur', 'Le ventirad'],
    color: '#4dd0e1',
  },

  ssd: {
    id: 'ssd',
    name: 'Le SSD (M.2 NVMe)',
    shortName: 'SSD',
    category: 'stockage',
    role: "C'est la mémoire de stockage rapide : il conserve le système d'exploitation, les logiciels et les fichiers, même éteint.",
    analogy: 'Une immense clé USB ultra-rapide vissée directement sur la carte mère.',
    details: [
      'Il n\'a AUCUNE pièce mobile : c\'est de la mémoire flash, comme dans un téléphone.',
      'Le format M.2 se glisse en biais dans son connecteur puis se visse à plat : pas besoin de câble !',
      'Il démarre Windows en 10 secondes, contre plus d\'une minute avec un disque dur mécanique.',
    ],
    handling:
      'On l\'insère à environ 30°, puis on l\'abaisse et on serre la petite vis. Cette vis est minuscule : attention à ne pas la perdre.',
    funFact: 'Un SSD NVMe lit jusqu\'à 7 Go par seconde : il copierait un film HD en moins d\'une seconde.',
    installOrder: 7,
    requires: ['motherboard'],
    requiresHint: 'Le SSD M.2 se visse sur la carte mère : installe-la d\'abord.',
    distractors: ['La mémoire vive', 'Le disque dur', 'Le processeur'],
    color: '#a78bfa',
  },

  hdd: {
    id: 'hdd',
    name: 'Le disque dur',
    shortName: 'Disque dur',
    acronym: 'HDD',
    category: 'stockage',
    role: "C'est le stockage de grande capacité : moins rapide que le SSD, mais beaucoup moins cher au gigaoctet.",
    analogy: 'Le grenier ou l\'armoire d\'archives : on y range beaucoup, on y accède moins souvent.',
    details: [
      'À l\'intérieur, des plateaux magnétiques tournent à 5400 ou 7200 tours/minute sous une tête de lecture.',
      'Il se fixe dans une cage à l\'avant du boîtier et demande DEUX câbles : SATA données + SATA alimentation.',
      'C\'est le seul composant vraiment fragile aux chocs quand il fonctionne.',
    ],
    handling: 'On ne le secoue jamais et on ne le pose pas sur une surface métallique. On le visse avec 4 vis dans sa cage.',
    funFact:
      'La tête de lecture vole à 3 nanomètres de la surface : à l\'échelle d\'un avion, ce serait voler à 1 mm du sol.',
    installOrder: 8,
    requires: ['case'],
    distractors: ['Le SSD M.2', 'La mémoire vive', "Le bloc d'alimentation"],
    color: '#a78bfa',
  },

  ssd25: {
    id: 'ssd25',
    name: 'Le SSD 2,5 pouces (SATA)',
    shortName: 'SSD 2,5"',
    category: 'stockage',
    role: "C'est un SSD au format d'un petit disque : même mémoire flash que le M.2, mais dans un boîtier plat relié par deux câbles.",
    analogy:
      "Le même cerveau de stockage que le M.2, rangé dans une boîte à chaussures au lieu d'être collé à la carte mère.",
    details: [
      "Il mesure 2,5 pouces (7 cm de large), l'ancien format des disques d'ordinateur portable.",
      'Comme le disque dur, il demande DEUX câbles : SATA données + SATA alimentation.',
      "Il est 4 à 5 fois plus lent qu'un M.2 NVMe, mais toujours 10 fois plus rapide qu'un disque dur mécanique.",
    ],
    handling:
      "On le visse à plat dans son berceau, ou on le glisse dans un tiroir. Aucun risque de choc : il n'a pas de pièce mobile.",
    funFact:
      "C'est le format qu'on utilise pour redonner une seconde vie à un vieux PC : remplacer son disque dur par un SSD 2,5\" le rend spectaculairement plus rapide.",
    installOrder: 9,
    requires: ['case'],
    distractors: ['Le disque dur', 'Le SSD M.2', 'Le lecteur de disques'],
    color: '#c084fc',
  },

  odd: {
    id: 'odd',
    name: 'Le lecteur de disques (CD / DVD)',
    shortName: 'Lecteur CD/DVD',
    category: 'stockage',
    role: 'Il lit (et parfois grave) les CD, DVD et Blu-ray grâce à un rayon laser qui parcourt la surface du disque.',
    analogy: "Un tourne-disque moderne : le disque tourne, mais c'est une lumière qui lit à la place d'une aiguille.",
    details: [
      "Il occupe une baie 5,25 pouces en haut du boîtier, la seule ouverte sur l'extérieur.",
      'Un CD contient 700 Mo, un DVD 4,7 Go, un Blu-ray 25 Go.',
      "Il se branche lui aussi en SATA, exactement comme un disque dur.",
    ],
    handling:
      "S'il refuse de s'ouvrir, un trombone déplié dans le petit trou de la façade libère le tiroir à la main.",
    funFact:
      "Les ordinateurs récents n'en ont plus : tout passe par Internet ou par clé USB. C'est le composant en train de disparaître.",
    installOrder: 10,
    requires: ['case'],
    distractors: ['Le disque dur', "Le bloc d'alimentation", 'Le SSD 2,5 pouces'],
    color: '#38bdf8',
  },

  gpu: {
    id: 'gpu',
    name: 'La carte graphique',
    shortName: 'Carte graphique',
    acronym: 'GPU',
    category: 'affichage',
    role: "Elle calcule les images affichées à l'écran : bureau, vidéos, jeux 3D. C'est un ordinateur spécialisé dans le dessin.",
    analogy:
      'Un studio d\'animation entier : là où le processeur dessine image par image, elle dessine des millions de pixels en parallèle.',
    details: [
      'Elle se clipse dans le grand slot PCIe 16x, le plus long et le plus proche du processeur.',
      'Son équerre métallique se visse à l\'arrière du boîtier ; c\'est là que sort la prise de l\'écran.',
      'Les modèles puissants réclament un câble d\'alimentation PCIe supplémentaire depuis le bloc d\'alimentation.',
    ],
    handling:
      'On enlève d\'abord les caches à l\'arrière du boîtier. Pour la retirer, il faut PENSER à pousser le petit clip au bout du slot.',
    funFact:
      'Une carte graphique de PC de bureau contient souvent plus de 4 000 mini-processeurs travaillant en même temps.',
    installOrder: 11,
    requires: ['motherboard'],
    requiresHint: 'La carte graphique se clipse dans le slot PCIe : installe la carte mère d\'abord.',
    distractors: ['La carte mère', 'La carte réseau', 'Le processeur'],
    color: '#66d17a',
  },

  fanFront: {
    id: 'fanFront',
    name: 'Le ventilateur avant (admission)',
    shortName: 'Ventilo avant',
    category: 'refroidissement',
    role: "Il aspire l'air frais de la pièce vers l'intérieur du boîtier pour alimenter tous les composants en air froid.",
    analogy: 'La bouche qui inspire. Sans elle, le PC respirerait sa propre chaleur.',
    details: [
      'Il souffle vers l\'INTÉRIEUR : une petite flèche moulée sur le cadre indique le sens du flux d\'air.',
      'Il se branche sur un connecteur SYS_FAN / CHA_FAN de la carte mère.',
      'C\'est le composant qui accumule le plus de poussière : à nettoyer une fois par an.',
    ],
    handling:
      'Pour le nettoyer, on bloque les pales avec le doigt avant de souffler, sinon il produit du courant et peut abîmer la carte mère.',
    funFact: 'Un ventilateur de 120 mm déplace environ 90 m³ d\'air par heure, soit le volume d\'une petite chambre.',
    installOrder: 12,
    requires: ['case'],
    distractors: ['Le ventirad', "Le ventilateur de l'alimentation", 'Le radiateur'],
    color: '#7dd3fc',
  },

  fanRear: {
    id: 'fanRear',
    name: 'Le ventilateur arrière (extraction)',
    shortName: 'Ventilo arrière',
    category: 'refroidissement',
    role: "Il expulse l'air chaud du boîtier vers l'extérieur, juste derrière le processeur.",
    analogy: 'La bouche qui expire, et la hotte de la cuisine : elle sort l\'air chaud avant qu\'il ne stagne.',
    details: [
      'Il souffle vers l\'EXTÉRIEUR : c\'est l\'inverse du ventilateur avant.',
      'Avant + arrière créent un courant d\'air traversant, d\'avant en arrière.',
      'Si on met les deux dans le même sens, l\'air tourne en rond et le PC chauffe.',
    ],
    handling: 'On vérifie toujours le sens des flèches sur le cadre avant de visser.',
    funFact: 'Un PC bien ventilé tourne 10 à 15 °C plus frais, ce qui augmente sa durée de vie de plusieurs années.',
    installOrder: 13,
    requires: ['case'],
    distractors: ['Le ventirad', 'Le ventilateur avant', "Le bloc d'alimentation"],
    color: '#7dd3fc',
  },

  cmos: {
    id: 'cmos',
    name: 'La pile CMOS',
    shortName: 'Pile CMOS',
    category: 'energie',
    role: "Cette pile bouton alimente l'horloge et les réglages du BIOS quand l'ordinateur est débranché.",
    analogy: 'La pile d\'une montre : elle garde l\'heure à l\'ordinateur même quand il dort.',
    details: [
      'C\'est une pile plate CR2032, la même que dans beaucoup de télécommandes.',
      'Si elle est vide, l\'ordinateur perd l\'heure et affiche un message d\'erreur au démarrage.',
      'Elle dure entre 5 et 10 ans.',
    ],
    handling: 'On la retire en poussant le petit clip métallique sur le côté ; elle se soulève toute seule.',
    funFact:
      'C\'est le composant le moins cher du PC (moins d\'un euro) mais son absence empêche parfois la machine de démarrer.',
    installOrder: 14,
    requires: ['motherboard'],
    requiresHint: 'La pile se loge dans son support sur la carte mère.',
    distractors: ["Le bloc d'alimentation", 'Le chipset', 'Le buzzer'],
    color: '#ffd166',
  },
}

export const COMPONENT_IDS = Object.keys(COMPONENTS) as ComponentId[]

/* ------------------------------------------------------------------ */
/*  Pièces jumelles                                                    */
/* ------------------------------------------------------------------ */

/**
 * Deux barrettes de mémoire, ou deux ventilateurs de boîtier, sont des
 * pièces RIGOUREUSEMENT identiques. Leur seule différence est l'endroit
 * où on les monte.
 *
 * Un exercice ne doit donc jamais demander de les distinguer l'une de
 * l'autre : ce serait une question sans réponse observable.
 */
const TWINS: Partial<Record<ComponentId, ComponentId>> = {
  ram1: 'ram2',
  ram2: 'ram1',
  fanFront: 'fanRear',
  fanRear: 'fanFront',
}

/** `a` et `b` désignent-ils la même pièce, ou deux jumelles interchangeables ? */
export function sameComponent(a: ComponentId, b: ComponentId): boolean {
  return a === b || TWINS[a] === b
}

/**
 * Nom à employer quand la pièce est montrée SEULE, hors de son contexte
 * (présentoir du quiz, fenêtre de correction) : on retire le numéro de
 * barrette ou la position avant/arrière, invérifiables sur la pièce nue.
 */
const SOLO_NAMES: Partial<Record<ComponentId, { name: string; short: string }>> = {
  ram1: { name: 'La mémoire vive', short: 'Mémoire vive' },
  ram2: { name: 'La mémoire vive', short: 'Mémoire vive' },
  // même formulation que le leurre du ventirad, pour ne pas laisser croire
  // à deux pièces différentes
  fanFront: { name: 'Le ventilateur du boîtier', short: 'Ventilateur' },
  fanRear: { name: 'Le ventilateur du boîtier', short: 'Ventilateur' },
}

export function soloName(id: ComponentId): string {
  return SOLO_NAMES[id]?.name ?? COMPONENTS[id].name
}

export function soloShortName(id: ComponentId): string {
  return SOLO_NAMES[id]?.short ?? COMPONENTS[id].shortName
}

/**
 * Nom en minuscule pour l'insérer au fil d'une phrase
 * (« ce n'est pas *le processeur* »).
 *
 * Seule la PREMIÈRE lettre est abaissée : un `toLowerCase()` complet
 * écrirait « le ssd (m.2 nvme) » ou « la pile cmos ».
 */
export function lowerName(id: ComponentId): string {
  const n = soloName(id)
  return n.charAt(0).toLowerCase() + n.slice(1)
}

/** Les composants à monter dans l'exercice d'assemblage (le boîtier est déjà là). */
export const INSTALLABLE_IDS: ComponentId[] = COMPONENT_IDS.filter((id) => id !== 'case').sort(
  (a, b) => COMPONENTS[a].installOrder - COMPONENTS[b].installOrder,
)

/** Ordre de démontage = ordre inverse du montage. */
export const DISASSEMBLY_IDS: ComponentId[] = [...INSTALLABLE_IDS].reverse()
