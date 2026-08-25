/**
 * Périphériques classiques et leur branchement sur la connectique arrière.
 * Sert à l'exercice 7 (« branche les périphériques ») et à la fiche de révision.
 */

export type PeripheralKind = 'entree' | 'sortie' | 'entree-sortie'

export interface Peripheral {
  id: string
  name: string
  icon: string
  kind: PeripheralKind
  /** Ce que fait le périphérique, en une phrase */
  role: string
  /** Prises acceptées (la première est la « meilleure » réponse) */
  accepts: string[]
  /** Message affiché quand c'est juste */
  ok: string
  /** Pièges fréquents : id de prise -> explication de l'erreur */
  traps?: Record<string, string>
  /** Indice */
  hint: string
}

export const KIND_LABEL: Record<PeripheralKind, string> = {
  entree: 'Entrée',
  sortie: 'Sortie',
  'entree-sortie': 'Entrée et sortie',
}

export const KIND_COLOR: Record<PeripheralKind, string> = {
  entree: '#4dd0e1',
  sortie: '#66d17a',
  'entree-sortie': '#a78bfa',
}

export const KIND_HELP: Record<PeripheralKind, string> = {
  entree: "Il envoie de l'information À l'ordinateur.",
  sortie: "Il reçoit de l'information DE l'ordinateur pour te la restituer.",
  'entree-sortie': "Il fait les deux : il envoie et il reçoit.",
}

export const PERIPHERALS: Peripheral[] = [
  {
    id: 'monitor',
    name: "L'écran",
    icon: '🖥️',
    kind: 'sortie',
    role: "Il affiche les images calculées par l'ordinateur.",
    accepts: ['hdmi-gpu', 'dp-gpu-1', 'dp-gpu-2'],
    ok: "Bien vu : quand une carte graphique est installée, l'écran se branche SUR ELLE.",
    traps: {
      'hdmi-mb':
        "Piège classique ! Cette sortie appartient à la carte mère. Elle fonctionne, mais tu perds toute la puissance de la carte graphique. Branche l'écran sur la carte graphique, en bas.",
      'dp-mb':
        "Même piège : c'est la sortie vidéo de la carte mère. Avec une carte graphique installée, on branche toujours l'écran sur la carte graphique.",
    },
    hint: "Cherche la prise vidéo sur la CARTE GRAPHIQUE, pas sur la carte mère.",
  },
  {
    id: 'keyboard',
    name: 'Le clavier',
    icon: '⌨️',
    kind: 'entree',
    role: "Il envoie à l'ordinateur les touches que tu tapes.",
    accepts: ['usb2-a', 'usb2-b', 'usb3-a', 'usb3-b', 'usb3-c'],
    ok: "Parfait. Le clavier n'a pas besoin de vitesse : une prise USB 2.0 suffit largement.",
    hint: "N'importe quelle prise USB fera l'affaire.",
  },
  {
    id: 'mouse',
    name: 'La souris',
    icon: '🖱️',
    kind: 'entree',
    role: "Elle envoie à l'ordinateur les mouvements et les clics.",
    accepts: ['usb2-a', 'usb2-b', 'usb3-a', 'usb3-b', 'usb3-c'],
    ok: 'Exact. Souris et clavier sont les deux périphériques d\'entrée de base.',
    hint: 'Une prise USB, comme le clavier.',
  },
  {
    id: 'headset',
    name: 'Le casque audio',
    icon: '🎧',
    kind: 'sortie',
    role: "Il restitue le son produit par l'ordinateur.",
    accepts: ['jack-green'],
    ok: 'Le jack VERT est la sortie son : cette couleur est une norme sur tous les PC.',
    traps: {
      'jack-pink': "Le rose, c'est l'ENTRÉE micro. Un casque qui écoute se branche sur le vert.",
      'jack-blue': "Le bleu est une entrée ligne (pour brancher une source extérieure). La sortie casque, c'est le vert.",
    },
    hint: 'Trois prises rondes de couleur : laquelle sert à faire SORTIR le son ?',
  },
  {
    id: 'micro',
    name: 'Le microphone',
    icon: '🎤',
    kind: 'entree',
    role: "Il envoie ta voix à l'ordinateur.",
    accepts: ['jack-pink'],
    ok: 'Le jack ROSE est bien l\'entrée microphone.',
    traps: {
      'jack-green': "Le vert fait SORTIR le son. Le micro, lui, fait ENTRER du son : c'est le rose.",
    },
    hint: 'Le micro fait entrer du son : cherche la prise ronde rose.',
  },
  {
    id: 'ethernet',
    name: 'Le câble réseau',
    icon: '🌐',
    kind: 'entree-sortie',
    role: "Il relie l'ordinateur au réseau : il envoie ET reçoit des données.",
    accepts: ['rj45'],
    ok: 'La prise RJ45 : plus large qu\'une prise USB, avec un petit clip qui fait CLIC.',
    hint: 'Cherche une prise rectangulaire plus large que l\'USB, avec des petites LED.',
  },
  {
    id: 'usbkey',
    name: 'La clé USB',
    icon: '💾',
    kind: 'entree-sortie',
    role: "On y lit ET on y écrit des fichiers : elle fait entrer et sortir des données.",
    accepts: ['usb3-a', 'usb3-b', 'usb3-c'],
    ok: 'Sur une prise USB 3.0 (intérieur bleu), les transferts sont 10 fois plus rapides.',
    traps: {
      'usb2-a': "Ça marche, mais ce serait dommage : la prise à intérieur BLEU (USB 3.0) est bien plus rapide.",
      'usb2-b': "Ça marche, mais la prise à intérieur BLEU (USB 3.0) transfère bien plus vite.",
    },
    hint: 'Choisis la prise USB la plus rapide : celle dont l\'intérieur est bleu.',
  },
  {
    id: 'printer',
    name: "L'imprimante",
    icon: '🖨️',
    kind: 'sortie',
    role: "Elle met sur papier ce que l'ordinateur lui envoie.",
    accepts: ['usb2-a', 'usb2-b', 'usb3-a', 'usb3-b', 'usb3-c'],
    ok: 'Une imprimante se branche en USB. Elle reçoit : c\'est un périphérique de sortie.',
    hint: 'Une prise USB suffit.',
  },
  {
    id: 'power',
    name: "Le câble d'alimentation",
    icon: '🔌',
    kind: 'entree',
    role: "Il apporte le courant 230 V depuis la prise murale.",
    accepts: ['psu-socket'],
    ok: "C'est la seule prise du PC reliée au 230 V. À côté : l'interrupteur O / I du bloc d'alimentation.",
    hint: "Cherche tout en bas, sur le bloc d'alimentation.",
  },
]

export const PERIPHERAL_BY_ID = Object.fromEntries(PERIPHERALS.map((p) => [p.id, p])) as Record<
  string,
  Peripheral
>
