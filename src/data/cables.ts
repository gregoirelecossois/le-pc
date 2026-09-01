/**
 * Câblage interne : les 7 liaisons qu'un élève doit savoir reconnaître.
 * Coordonnées MONDE (cm), cohérentes avec three/layout.ts.
 */

import { MB, MB_POINTS, SLOTS } from '@/three/layout'
import type { CameraViewId, Vec3 } from '@/three/layout'

const S = MB.surfaceX

/**
 * Point de sortie du faisceau : posé SUR le passe-fil rond du bloc
 * d'alimentation, là où les câbles sortent vraiment. Les torons partent
 * donc du bloc en le touchant, ils ne flottent plus à côté.
 *
 * Le passe-fil est sur la face avant du bloc (local z = -d/2 - 0.4, avec
 * d = 14 dans le modèle `Psu`) ; en coordonnées monde cela donne :
 */
export const PSU_OUT: Vec3 = [
  SLOTS.psu.position[0] + 0.4,
  SLOTS.psu.position[1] + 0.4,
  SLOTS.psu.position[2] - 7.9,
]

/**
 * Circuit de cheminement des câbles.
 *
 * Le faisceau longe le BORD de la carte mère, jamais sa face : il court
 * dans l'espace libre situé JUSTE DEVANT le bord avant du PCB
 * (z ≈ −5.6, au niveau de la tranche de la carte, x ≈ −5.7), là où il ne
 * touche ni la carte, ni la carte graphique, ni le disque dur, ni le
 * lecteur. Il ne remonte sur la face que sur les derniers centimètres,
 * pour rejoindre chaque connecteur.
 *
 *   MB.frontZ ≈ −2.4  (bord avant du PCB)
 *   MB.topY   ≈ 41.5  (bord haut du PCB)
 *   PCB       : x ≈ −5.9   |  connecteurs : x ≈ S + 1 ≈ −4.8
 */
const EDGE_X = -5.7 // x : au niveau de la tranche de la carte
const FRONT_Z = -5.6 // z : dans le vide devant le bord avant du PCB
const TOP_Y = 42.6 // y : juste au-dessus du bord haut du PCB
/** Sortie du bloc : on plonge vers le bas-avant, hors de la carte. */
const DIVE: Vec3 = [EDGE_X, 2.6, -3]
/** Le long du bord avant de la carte, du bas vers le haut. */
const EDGE_LOW: Vec3 = [EDGE_X, 12, FRONT_Z]
const EDGE_MID: Vec3 = [EDGE_X, 27, FRONT_Z]
const EDGE_HIGH: Vec3 = [EDGE_X, 40, FRONT_Z]

export type ConnectorId =
  | 'atx24'
  | 'eps8'
  | 'pcie8'
  | 'sataPower'
  | 'sataData'
  | 'sataMb'
  | 'frontPanel'
  | 'cpuFan'
  | 'sysFan'

export interface Connector {
  id: ConnectorId
  label: string
  position: Vec3
  /** Rayon du repère cliquable */
  radius: number
  /** Sur quel composant il se trouve (masqué si absent) */
  host: 'motherboard' | 'gpu' | 'hdd' | 'cooler' | 'case'
}

export const CONNECTORS: Record<ConnectorId, Connector> = {
  atx24: { id: 'atx24', label: 'Connecteur 24 broches', position: [S + 1.3, MB_POINTS.atx24.y, MB_POINTS.atx24.z], radius: 1.9, host: 'motherboard' },
  eps8: { id: 'eps8', label: 'Connecteur 8 broches (CPU)', position: [S + 1.2, MB_POINTS.eps8.y, MB_POINTS.eps8.z], radius: 1.5, host: 'motherboard' },
  pcie8: { id: 'pcie8', label: 'Connecteur PCIe de la carte graphique', position: [SLOTS.gpu.position[0] + 2.6, SLOTS.gpu.position[1] + 2.2, SLOTS.gpu.position[2] - 9.4], radius: 1.6, host: 'gpu' },
  sataPower: { id: 'sataPower', label: 'Alimentation du disque dur', position: [SLOTS.hdd.position[0] + 0.6, SLOTS.hdd.position[1] - 0.7, SLOTS.hdd.position[2] + 7.6], radius: 1.4, host: 'hdd' },
  sataData: { id: 'sataData', label: 'Données du disque dur', position: [SLOTS.hdd.position[0] - 2.6, SLOTS.hdd.position[1] - 0.7, SLOTS.hdd.position[2] + 7.6], radius: 1.2, host: 'hdd' },
  sataMb: { id: 'sataMb', label: 'Ports SATA de la carte mère', position: [S + 1.0, MB_POINTS.sata.y, MB_POINTS.sata.z], radius: 1.6, host: 'motherboard' },
  frontPanel: { id: 'frontPanel', label: 'Connecteur de façade (JFP1)', position: [S + 0.8, MB_POINTS.frontPanel.y, MB_POINTS.frontPanel.z], radius: 1.4, host: 'motherboard' },
  cpuFan: { id: 'cpuFan', label: 'Connecteur CPU_FAN', position: [S + 0.8, MB_POINTS.cpuFanHeader.y, MB_POINTS.cpuFanHeader.z], radius: 1.2, host: 'motherboard' },
  sysFan: { id: 'sysFan', label: 'Connecteur SYS_FAN', position: [S + 0.8, MB_POINTS.sysFanHeader.y, MB_POINTS.sysFanHeader.z], radius: 1.2, host: 'motherboard' },
}

export interface CableDef {
  id: string
  name: string
  /** Ce que le câble transporte */
  carries: string
  /** D'où il part */
  fromLabel: string
  from: Vec3
  /** Où il doit arriver */
  to: ConnectorId
  color: string
  /** Épaisseur du toron */
  thickness: number
  /** Le repère qui permet de le reconnaître dans une vraie machine */
  recognise: string
  /** Message si l'élève se trompe de destination */
  wrongHint: string
  /** Ordre d'apparition dans l'exercice */
  order: number

  /* ---- Guidage pas à pas (chapitre 6) ---- */

  /** Ce qu'on est en train de faire, annoncé avant de cliquer */
  what: string
  /** Ce qu'il faut cliquer en PREMIER (l'extrémité de départ) */
  fromHint: string
  /** Ce qu'il faut cliquer ENSUITE (le connecteur d'arrivée) */
  toHint: string
  /** Cadrage de la caméra pendant cette étape */
  view: CameraViewId
  /**
   * Points de passage (coordonnées monde) : le câble suit ce circuit au
   * lieu d'aller en ligne droite, pour contourner les composants.
   */
  waypoints?: Vec3[]
}

export const CABLES: CableDef[] = [
  {
    id: 'atx24',
    name: 'Câble 24 broches',
    carries: 'Il alimente la carte mère et tout ce qui est branché dessus.',
    fromLabel: "Bloc d'alimentation",
    from: PSU_OUT,
    to: 'atx24',
    color: '#1b1e24',
    thickness: 0.55,
    recognise: "C'est le plus gros connecteur du PC : deux rangées de 12 broches, avec un clip sur le côté.",
    wrongHint: "Ce n'est pas le bon : le 24 broches va sur le grand connecteur au bord de la carte mère, à côté de la mémoire.",
    order: 1,
    what: "On commence par le plus gros : le câble qui alimente la carte mère elle-même.",
    fromHint: "Clique sur le faisceau qui sort du bloc d'alimentation, en bas de la machine.",
    toHint: "Clique maintenant sur le grand connecteur 24 broches, sur le bord droit de la carte mère.",
    view: 'cablage',
    waypoints: [DIVE, EDGE_LOW, EDGE_MID, [EDGE_X, 30, FRONT_Z], [-5.2, 30, -3], [-4.4, 30, -1.4]],
  },
  {
    id: 'eps8',
    name: 'Câble 8 broches processeur',
    carries: "Il apporte le courant 12 V dédié au processeur.",
    fromLabel: "Bloc d'alimentation",
    from: PSU_OUT,
    to: 'eps8',
    color: '#1b1e24',
    thickness: 0.38,
    recognise: 'Un connecteur carré de 8 broches, marqué CPU ou EPS. Il passe derrière le plateau et arrive tout en haut de la carte mère.',
    wrongHint: "Attention : ce connecteur ressemble au PCIe de la carte graphique, mais il va tout en haut, près du processeur.",
    order: 2,
    what: "Le processeur consomme trop pour se contenter du 24 broches : il reçoit son propre câble 12 V.",
    fromHint: "Repars du bloc d'alimentation : clique sur le faisceau.",
    toHint: "Clique sur le connecteur 8 broches, tout en haut de la carte mère, près du ventirad.",
    view: 'cablage',
    waypoints: [
      DIVE,
      EDGE_LOW,
      EDGE_MID,
      EDGE_HIGH,
      [EDGE_X, TOP_Y, FRONT_Z],
      [EDGE_X, TOP_Y, 9],
      [-5.0, 41.5, 13],
      [-4.6, 40.4, 15],
    ],
  },
  {
    id: 'pcie8',
    name: 'Câble PCIe 8 broches',
    carries: "Il alimente la carte graphique, qui consomme trop pour le seul slot PCIe.",
    fromLabel: "Bloc d'alimentation",
    from: PSU_OUT,
    to: 'pcie8',
    color: '#22262e',
    thickness: 0.4,
    recognise: 'Marqué PCI-E ou VGA. Il se branche sur le dessus de la carte graphique.',
    wrongHint: 'Le câble PCIe se branche sur la carte graphique elle-même, pas sur la carte mère.',
    order: 3,
    what: "Même histoire pour la carte graphique : le slot PCIe ne suffit pas à l'alimenter.",
    fromHint: "Clique une nouvelle fois sur le faisceau du bloc d'alimentation.",
    toHint: "Clique sur la prise située SUR LE DESSUS de la carte graphique.",
    view: 'cablage',
    waypoints: [DIVE, EDGE_LOW, [EDGE_X, 24.5, FRONT_Z], [-3.5, 25.6, -3.5], [1.6, 25, -1.6]],
  },
  {
    id: 'sataPower',
    name: 'Alimentation SATA',
    carries: 'Elle alimente le disque dur.',
    fromLabel: "Bloc d'alimentation",
    from: PSU_OUT,
    to: 'sataPower',
    color: '#1b1e24',
    thickness: 0.3,
    recognise: 'Un connecteur plat et large, en forme de L très aplati. Souvent plusieurs sur le même câble.',
    wrongHint: "L'alimentation SATA est plus LARGE que la prise de données. Regarde bien la taille des deux prises du disque.",
    order: 4,
    what: "Au tour du disque dur : il lui faut d'abord du courant.",
    fromHint: "Clique sur le faisceau du bloc d'alimentation.",
    toHint: "Clique sur la plus LARGE des deux prises du disque dur : c'est l'alimentation SATA.",
    view: 'cablage',
    waypoints: [[EDGE_X, 2.6, -3], [-2.5, 2.1, -4.0]],
  },
  {
    id: 'sataData',
    name: 'Câble SATA de données',
    carries: 'Il transporte les données entre le disque dur et la carte mère.',
    fromLabel: 'Disque dur',
    from: [SLOTS.hdd.position[0] - 2.6, SLOTS.hdd.position[1] - 0.7, SLOTS.hdd.position[2] + 7.6],
    to: 'sataMb',
    color: '#1d3f7a',
    thickness: 0.26,
    recognise: 'Le petit câble plat, souvent rouge ou bleu, avec une prise en L de 7 broches.',
    wrongHint: 'Le câble de données part du disque et rejoint les ports SATA de la carte mère, pas le bloc d\'alimentation.',
    order: 5,
    what: "Le courant ne suffit pas : il faut aussi une route pour les données, du disque vers la carte mère.",
    fromHint: "Clique sur la prise étroite du disque dur, à côté de celle qu'on vient de brancher.",
    toHint: "Clique sur les ports SATA de la carte mère, en bas à droite.",
    view: 'cablage',
    waypoints: [[-4.6, 4, -4.5], [EDGE_X, 11, FRONT_Z], [-5.0, 14.5, -2]],
  },
  {
    id: 'frontPanel',
    name: 'Câble de façade',
    carries: "Il relie le bouton de démarrage et les LED de la façade à la carte mère.",
    fromLabel: 'Façade du boîtier',
    from: [-2.0, 12.5, -20.0],
    to: 'frontPanel',
    color: '#2b3038',
    thickness: 0.22,
    recognise: 'Plusieurs petites fiches de 2 broches marquées POWER SW, HDD LED, POWER LED, RESET SW.',
    wrongHint: "C'est le câble le plus pénible à brancher : il va sur le petit connecteur JFP1, en bas de la carte mère.",
    order: 6,
    what: "Sans ce petit câble, le bouton de démarrage de la façade ne sert à rien.",
    fromHint: "Clique sur le faisceau qui descend de la façade du boîtier.",
    toHint: "Clique sur le connecteur JFP1, tout en bas de la carte mère.",
    view: 'cablage',
    waypoints: [[-4.6, 10.5, -14], [EDGE_X, 10.5, FRONT_Z], [-5.0, 12, -1]],
  },
  {
    id: 'cpuFan',
    name: 'Câble du ventirad',
    carries: "Il alimente le ventilateur du processeur et permet à la carte mère de régler sa vitesse.",
    fromLabel: 'Ventirad',
    from: [SLOTS.cooler.position[0] + 5.5, SLOTS.cooler.position[1] - 6.0, SLOTS.cooler.position[2] - 2.4],
    to: 'cpuFan',
    color: '#15181d',
    thickness: 0.2,
    recognise: 'Une petite fiche de 4 broches, à brancher sur le connecteur marqué CPU_FAN.',
    wrongHint: 'Le ventilateur du processeur doit aller sur CPU_FAN : la carte mère surveille sa vitesse et refuse de démarrer sans lui.',
    order: 7,
    what: "Dernier câble : le ventilateur du processeur, que la carte mère doit pouvoir piloter.",
    fromHint: "Clique sur le fil qui sort du ventirad.",
    toHint: "Clique sur le connecteur CPU_FAN, juste à côté, sur la carte mère.",
    view: 'cablage',
    waypoints: [[-4.6, 33, 11], [EDGE_X, TOP_Y, 11], [-4.8, 41, 10.3]],
  },
]

export const CABLE_BY_ID = Object.fromEntries(CABLES.map((c) => [c.id, c])) as Record<string, CableDef>
