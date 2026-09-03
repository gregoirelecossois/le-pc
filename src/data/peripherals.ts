/**
 * Les périphériques : ce qu'on branche AUTOUR de l'unité centrale.
 *
 * Sert au chapitre 7 (identification puis branchement) et à la fiche de
 * révision. Chaque entrée décrit à la fois l'objet (nom, rôle, leurres du
 * quiz) et son câble (fiche, prise visée, pièges classiques).
 */

import type { PeripheralModelId } from '@/three/models/PeripheralParts'
import type { PlugKind } from '@/three/models/Plugs'

export type PeripheralKind = 'entree' | 'sortie' | 'entree-sortie'

export interface Peripheral {
  id: PeripheralModelId
  name: string
  icon: string
  kind: PeripheralKind
  /** Ce que fait le périphérique, en une phrase */
  role: string
  /** Noms faux mais plausibles, pour le quiz d'identification */
  distractors: string[]
  /** Fiche qui termine son câble */
  plug: PlugKind
  /** Couleur du manchon (jack vert / rose) */
  plugColor?: string
  /** Nom de la fiche, annoncé avant le branchement */
  plugName: string
  /** Comment on reconnaît cette fiche */
  plugHint: string
  /** Prises acceptées (la première est la meilleure réponse) */
  accepts: string[]
  /** Message affiché quand c'est juste */
  ok: string
  /** Pièges fréquents : id de prise -> explication de l'erreur */
  traps?: Record<string, string>
  /**
   * Prises où la fiche entrerait, mais qui ne sont pas le bon choix.
   * On ne compte pas d'erreur : on explique et on laisse recommencer.
   */
  tolerated?: Record<string, string>
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
  'entree-sortie': 'Il fait les deux : il envoie et il reçoit.',
}

const USB_A = ['usb2-a', 'usb2-b', 'usb3-a', 'usb3-b', 'usb3-c']

/** Les deux prises noires, USB 2.0. */
const USB2 = ['usb2-a', 'usb2-b']

/** Les trois prises bleues, USB 3.0. */
const USB3 = ['usb3-a', 'usb3-b', 'usb3-c']

/** Piège commun à toutes les fiches USB rectangulaires. */
const USBC_TRAP = {
  usbc: "Cette prise-là est l'USB-C : elle est petite et ovale. Ta fiche est rectangulaire, elle n'y entrera jamais.",
}

/**
 * Clavier et souris : les prises bleues sont refusées, en expliquant pourquoi.
 *
 * Ça marcherait, et on le dit — un clavier fonctionne parfaitement sur de l'USB 3. Les
 * refuser sert deux fois :
 *
 *  - **pédagogiquement**, c'est la bonne habitude : un clavier envoie quelques octets par
 *    frappe, la vitesse ne lui sert à rien. On réserve les prises rapides à ce qui
 *    transfère vraiment. C'est un réflexe de technicien, pas une règle arbitraire ;
 *  - **très concrètement**, il n'y a que TROIS prises bleues et la clé USB en exige une.
 *    Un élève qui branchait clavier, souris et manette dessus se retrouvait dans une
 *    impasse : arrivé à la clé, plus une seule prise bleue libre — une prise occupée
 *    n'est plus aimantée — et l'atelier devenait impossible à terminer.
 *
 * `tolerated` et non `traps` : ce n'est pas une faute, aucune erreur n'est comptée. On
 * explique, et on laisse recommencer.
 */
function reserverLesBleues(texte: string): Record<string, string> {
  return Object.fromEntries(USB3.map((p) => [p, texte]))
}

export const PERIPHERALS: Peripheral[] = [
  {
    id: 'monitor',
    name: "L'écran",
    icon: '🖥️',
    kind: 'sortie',
    role: "Il affiche les images calculées par l'ordinateur.",
    distractors: ['La tablette graphique', 'Le scanner', 'La webcam'],
    plug: 'hdmi',
    plugName: 'une fiche HDMI',
    plugHint: 'Une fiche plate et large, dont deux angles sont coupés en biais.',
    accepts: ['hdmi-gpu'],
    ok: "Bien vu : quand une carte graphique est installée, l'écran se branche SUR ELLE, en bas de la machine.",
    traps: {
      'hdmi-mb':
        "Piège classique ! Cette sortie appartient à la carte mère. Elle fonctionne, mais tu perds toute la puissance de la carte graphique. L'écran se branche en bas, sur la carte graphique.",
      'dp-mb':
        "Deux erreurs d'un coup : c'est une prise DisplayPort (ta fiche HDMI n'y entre pas) ET elle appartient à la carte mère.",
    },
    tolerated: {
      'dp-gpu-1':
        "Tu es sur la bonne carte, mais cette prise est un DisplayPort : plus haute, avec un coin coupé. Une fiche HDMI n'y entre pas.",
      'dp-gpu-2':
        "Bonne carte, mauvaise prise : c'est un DisplayPort. Cherche la prise HDMI, entre les deux DisplayPort.",
    },
    hint: "Cherche la prise HDMI sur la CARTE GRAPHIQUE, tout en bas de la connectique — pas sur la carte mère.",
  },
  {
    id: 'keyboard',
    name: 'Le clavier',
    icon: '⌨️',
    kind: 'entree',
    role: "Il envoie à l'ordinateur les touches que tu tapes.",
    distractors: ['La télécommande', 'La calculatrice', 'La tablette graphique'],
    plug: 'usb-a',
    plugName: 'une fiche USB-A',
    plugHint: "Le rectangle métallique classique. Il ne se branche que dans un sens : la languette vers le bas.",
    accepts: USB2,
    ok: "Parfait. Le clavier n'a aucun besoin de vitesse : une prise noire lui suffit, et les bleues restent libres.",
    traps: USBC_TRAP,
    tolerated: reserverLesBleues(
      "Ça fonctionnerait, un clavier marche très bien sur une prise bleue. Mais il envoie " +
        'quelques octets à chaque frappe : la vitesse ne lui sert à rien. Et il n\'y a que ' +
        'trois prises bleues — garde-les pour ce qui transfère vraiment, une clé USB ou un ' +
        'disque externe. Prends une prise noire.',
    ),
    hint: "Une prise USB noire (USB 2.0) : le clavier n'a pas besoin des bleues, plus rapides.",
  },
  {
    id: 'mouse',
    name: 'La souris',
    icon: '🖱️',
    kind: 'entree',
    role: "Elle envoie à l'ordinateur les mouvements de ta main et tes clics.",
    distractors: ['Le pavé tactile', 'La télécommande', 'Le stylet'],
    plug: 'usb-a',
    plugName: 'une fiche USB-A',
    plugHint: 'La même fiche rectangulaire que le clavier.',
    accepts: USB2,
    ok: 'Exact. Souris et clavier sont les deux périphériques d’entrée de base de tout ordinateur — et tous deux se contentent d’une prise noire.',
    traps: USBC_TRAP,
    tolerated: reserverLesBleues(
      'Ça fonctionnerait, mais une souris envoie encore moins de données qu’un clavier : ' +
        'la vitesse ne lui sert à rien non plus. Les trois prises bleues sont précieuses, ' +
        'réserve-les à ce qui transfère beaucoup. Prends une prise noire, comme pour le clavier.',
    ),
    hint: 'Une prise USB noire, exactement comme le clavier.',
  },
  {
    id: 'gamepad',
    name: 'La manette de jeu',
    icon: '🎮',
    kind: 'entree',
    role: "Elle envoie à l'ordinateur tes appuis sur les boutons et les joysticks.",
    distractors: ['Le volant de jeu', 'La télécommande', 'Le casque de réalité virtuelle'],
    plug: 'usb-a',
    plugName: 'une fiche USB-A',
    plugHint: 'Encore une fiche USB rectangulaire : la plupart des périphériques passent par là.',
    accepts: USB_A,
    ok: "Une manette filaire est un périphérique d'entrée : elle envoie, elle ne reçoit rien à afficher.",
    traps: USBC_TRAP,
    hint: 'Comme le clavier et la souris : une prise USB.',
  },
  {
    id: 'speaker',
    name: "L'enceinte",
    icon: '🔊',
    kind: 'sortie',
    role: "Elle transforme le signal de l'ordinateur en son que tu entends.",
    distractors: ['Le microphone', 'Le casque audio', 'La carte son'],
    plug: 'jack',
    plugColor: '#7bd17b',
    plugName: 'un jack 3,5 mm VERT',
    plugHint: 'Un petit cylindre métallique à anneaux noirs, avec un manchon vert.',
    accepts: ['jack-green'],
    ok: 'Le jack VERT est la sortie son. Cette couleur est une norme : on la retrouve sur tous les PC.',
    traps: {
      'jack-pink': "Le rose, c'est l'ENTRÉE micro. Une enceinte, elle, reçoit du son : c'est le vert.",
      'jack-blue':
        "Le bleu est une entrée ligne, pour brancher une source extérieure. La sortie vers les enceintes, c'est le vert.",
    },
    hint: "Trois prises rondes de couleur : laquelle fait SORTIR le son ? La fiche a la même couleur que la prise.",
  },
  {
    id: 'micro',
    name: 'Le microphone',
    icon: '🎤',
    kind: 'entree',
    role: "Il transforme ta voix en signal électrique et l'envoie à l'ordinateur.",
    distractors: ["L'enceinte", 'La webcam', 'La lampe de bureau'],
    plug: 'jack',
    plugColor: '#e8a0bd',
    plugName: 'un jack 3,5 mm ROSE',
    plugHint: 'Le même petit cylindre que l’enceinte, mais son manchon est rose.',
    accepts: ['jack-pink'],
    ok: "Le jack ROSE est l'entrée microphone. Fiche rose, prise rose : le code couleur fait tout le travail.",
    traps: {
      'jack-green': "Le vert fait SORTIR le son. Le micro, lui, fait ENTRER du son : c'est le rose.",
      'jack-blue': "Le bleu est une entrée ligne (platine, instrument). Pour un micro, c'est le rose.",
    },
    hint: 'Le micro fait entrer du son : cherche la prise ronde rose.',
  },
  {
    id: 'box',
    name: 'La box internet',
    icon: '🌐',
    kind: 'entree-sortie',
    role: "Elle relie l'ordinateur à Internet : les données partent ET arrivent par elle.",
    distractors: ["L'imprimante", 'Le disque dur externe', "L'onduleur"],
    plug: 'rj45',
    plugName: 'une fiche RJ45',
    plugHint: "Une fiche transparente, plus large qu'une USB, avec un petit clip qui fait CLIC.",
    accepts: ['rj45'],
    ok: 'La prise RJ45 : rectangulaire, plus large que l’USB, avec ses petites LED qui clignotent quand ça circule.',
    traps: {
      'usb2-a': "Trop petit : la fiche RJ45 est nettement plus large qu'une prise USB.",
      'usb3-a': "Trop petit : la fiche RJ45 est nettement plus large qu'une prise USB.",
    },
    hint: "Cherche la prise rectangulaire la plus large, avec des petites LED : c'est l'Ethernet.",
  },
  {
    id: 'usbkey',
    name: 'La clé USB',
    icon: '💾',
    kind: 'entree-sortie',
    role: 'On y lit ET on y écrit des fichiers : elle fait entrer et sortir des données.',
    distractors: ['La carte mémoire SD', 'Le disque dur externe', 'Le lecteur de cartes'],
    plug: 'usb-a',
    plugName: 'une fiche USB-A (intégrée à la clé)',
    plugHint: "Ici, pas de câble : la fiche fait partie de l'objet.",
    accepts: ['usb3-a', 'usb3-b', 'usb3-c'],
    ok: "Sur une prise USB 3.0 (intérieur BLEU), les transferts sont bien plus rapides qu'en USB 2.0.",
    tolerated: {
      'usb2-a': "Ça marcherait… mais ce serait dommage : la prise à intérieur BLEU (USB 3.0) est bien plus rapide.",
      'usb2-b': "Ça marcherait… mais la prise à intérieur BLEU (USB 3.0) transfère bien plus vite.",
    },
    traps: USBC_TRAP,
    hint: "Choisis la prise USB la plus rapide : celle dont l'intérieur est bleu.",
  },
  {
    id: 'power',
    name: "Le câble d'alimentation",
    icon: '🔌',
    kind: 'entree',
    role: "Il apporte le courant 230 V de la prise murale jusqu'au bloc d'alimentation.",
    distractors: ['Le câble réseau', 'Le câble HDMI', 'La rallonge USB'],
    plug: 'c13',
    plugName: 'une fiche secteur C13',
    plugHint: "La plus grosse fiche du lot, noire, avec trois trous et deux angles coupés.",
    accepts: ['psu-socket'],
    ok: "C'est la seule prise du PC reliée au 230 V. Juste à côté : l'interrupteur O / I du bloc d'alimentation.",
    traps: {
      rj45: "Beaucoup trop gros ! Et surtout : jamais de 230 V sur une prise de données.",
    },
    hint: "Cherche tout en bas, sur le bloc d'alimentation : une grosse prise noire à trois trous.",
  },
]

export const PERIPHERAL_BY_ID = Object.fromEntries(PERIPHERALS.map((p) => [p.id, p])) as Record<
  string,
  Peripheral
>
