/**
 * Géométrie de référence de l'unité centrale.
 *
 * TOUTES LES COTES SONT EN CENTIMÈTRES et calquées sur les vraies normes :
 *  - Boîtier moyen-tour ATX          ~22 x 47 x 46 cm
 *  - Carte mère ATX                   305 x 244 mm (bord arrière vertical = 305)
 *  - Panneau de connectique arrière   158,75 x 44,45 mm
 *  - Slot PCIe 16x                    89 mm
 *  - Barrette DDR                     133,35 mm
 *  - Carte graphique double slot      267 x 112 x 40 mm
 *  - Bloc d'alimentation ATX          150 x 86 x 140 mm
 *  - Disque dur 3,5"                  147 x 101,6 x 26,1 mm
 *  - Ventilateurs                     120 mm
 *
 * Repère :  +X = vers le panneau ouvert (le spectateur)
 *           +Y = vers le haut
 *           +Z = vers l'arrière du boîtier
 */

import type { ComponentId } from '@/data/components'

export type Vec3 = [number, number, number]

/* ------------------------------------------------------------------ */
/*  Boîtier                                                            */
/* ------------------------------------------------------------------ */

export const CASE = {
  width: 22,
  height: 47,
  depth: 46,
  wall: 0.15,
  /** Position du plateau (tôle) sur lequel se visse la carte mère */
  trayX: -6.6,
  /** Hauteur des entretoises */
  standoff: 0.6,
} as const

export const CASE_MIN: Vec3 = [-CASE.width / 2, 0, -CASE.depth / 2]
export const CASE_MAX: Vec3 = [CASE.width / 2, CASE.height, CASE.depth / 2]

/** Centre géométrique du boîtier, sert de pivot caméra. */
export const CASE_CENTER: Vec3 = [0, CASE.height / 2, 0]

/* ------------------------------------------------------------------ */
/*  Carte mère                                                         */
/* ------------------------------------------------------------------ */

export const MB = {
  /** 305 mm, vertical */
  height: 30.5,
  /** 244 mm, avant-arrière */
  depth: 24.4,
  thickness: 0.16,
  /** Face avant du PCB (là où tout se monte) */
  get surfaceX() {
    return CASE.trayX + CASE.standoff + this.thickness
  },
  get pcbCenterX() {
    return CASE.trayX + CASE.standoff + this.thickness / 2
  },
  /** Bord arrière (côté panneau de connectique) */
  rearZ: 22.0,
  get frontZ() {
    return this.rearZ - this.depth
  },
  topY: 41.5,
  get bottomY() {
    return this.topY - this.height
  },
  get centerY() {
    return this.topY - this.height / 2
  },
  get centerZ() {
    return this.rearZ - this.depth / 2
  },
} as const

/** Repères locaux sur la carte mère (coordonnées monde). */
export const MB_POINTS = {
  socket: { y: 33.0, z: 14.5, size: 4.0 },
  /** 4 slots DDR, pas de 11 mm, axe long vertical */
  dimmZ: [3.6, 4.8, 6.0, 7.2] as const,
  dimmCenterY: 34.0,
  dimmLength: 13.4,
  /** Slot PCIe 16x */
  pcie16: { y: 22.5, zStart: 12.3, zEnd: 21.2 },
  /** Petit slot PCIe 1x (décoratif) */
  pcie1: { y: 18.2, zStart: 17.0, zEnd: 21.2 },
  m2: { y: 25.0, zStart: 12.5, zEnd: 20.5 },
  chipset: { y: 16.4, z: 14.5, size: 5.0 },
  cmos: { y: 20.0, z: 4.6, radius: 1.0 },
  atx24: { y: 30.0, z: -1.4, length: 5.4 },
  eps8: { y: 40.4, z: 15.0, length: 2.1 },
  sata: { y: 14.6, z: 3.2 },
  frontPanel: { y: 12.2, z: 1.6 },
  cpuFanHeader: { y: 40.4, z: 10.2 },
  sysFanHeader: { y: 12.6, z: -1.2 },
  /** Panneau de connectique arrière : 158,75 x 44,45 mm */
  io: { topY: 41.5, height: 15.9, depth: 4.0, z: 22.4 },
} as const

/* ------------------------------------------------------------------ */
/*  Emplacements (slots) : position finale de chaque composant          */
/* ------------------------------------------------------------------ */

export interface SlotDef {
  /** Position finale du centre du modèle */
  position: Vec3
  /** Rotation finale (radians) */
  rotation?: Vec3
  /**
   * Direction d'approche : le composant part de `position + approach * dist`
   * et glisse jusqu'à sa position. C'est le geste réel de montage.
   */
  approach: Vec3
  /** Distance d'approche pour l'animation d'insertion (cm) */
  approachDist: number
  /** Décalage de la vue éclatée (direction × distance max) */
  explode: Vec3
  /** Où poser l'étiquette flottante par rapport au composant */
  labelOffset: Vec3
  /** Rayon de la zone d'accroche (aimantation du glisser-déposer) */
  snapRadius: number
}

const S = MB.surfaceX

export const SLOTS: Record<Exclude<ComponentId, 'case'>, SlotDef> = {
  psu: {
    position: [1.0, 5.0, 15.5],
    approach: [0, 1, 0],
    approachDist: 14,
    // L'alimentation est déjà au ras du plancher : elle sort à plat,
    // vers le panneau ouvert et l'avant. La descendre la ferait passer
    // sous le sol (voir EXPLODE_FLOOR).
    explode: [13, 0, -24],
    labelOffset: [0, -4.5, -9],
    snapRadius: 9,
  },

  motherboard: {
    position: [MB.pcbCenterX, MB.centerY, MB.centerZ],
    approach: [1, 0, 0],
    approachDist: 16,
    explode: [11, 0, 0],
    labelOffset: [0, 0, -14],
    snapRadius: 12,
  },

  cpu: {
    position: [S + 0.55, MB_POINTS.socket.y, MB_POINTS.socket.z],
    approach: [1, 0, 0],
    approachDist: 12,
    explode: [30, 11, 1],
    labelOffset: [3, 3.2, 0],
    snapRadius: 4.5,
  },

  cooler: {
    // Ventirad tour : la base est sur le CPU, la tour d'ailettes part vers +X
    position: [S + 0.75, MB_POINTS.socket.y, MB_POINTS.socket.z],
    approach: [1, 0, 0],
    approachDist: 16,
    explode: [41, 17, 1],
    labelOffset: [7.0, 8.0, 0],
    snapRadius: 6,
  },

  ram1: {
    position: [S + 0.3, MB_POINTS.dimmCenterY, MB_POINTS.dimmZ[1]],
    approach: [1, 0, 0],
    approachDist: 10,
    explode: [25, 21, -7],
    labelOffset: [2.4, 9.6, -4.5],
    snapRadius: 3.4,
  },

  ram2: {
    position: [S + 0.3, MB_POINTS.dimmCenterY, MB_POINTS.dimmZ[3]],
    approach: [1, 0, 0],
    approachDist: 10,
    explode: [25, 21, -1],
    labelOffset: [2.4, 5.6, 4.5],
    snapRadius: 3.4,
  },

  ssd: {
    position: [S + 0.32, MB_POINTS.m2.y, (MB_POINTS.m2.zStart + MB_POINTS.m2.zEnd) / 2],
    approach: [1, 0.35, 0],
    approachDist: 9,
    explode: [21, -9, 7],
    labelOffset: [2.2, -2.2, 0],
    snapRadius: 4,
  },

  gpu: {
    // Le PCB s'enfiche dans le slot ; la carte s'étend vers +X (112 mm)
    position: [S + 6.12, MB_POINTS.pcie16.y - 0.75, 8.45],
    approach: [0, 1, 0],
    approachDist: 13,
    // La carte reste AU-DESSUS de l'alimentation, comme dans le boîtier :
    // la descendre davantage la faisait entrer dedans.
    explode: [23, -8, -3],
    labelOffset: [0, -5.0, -13],
    snapRadius: 7,
  },

  hdd: {
    position: [-1.0, 2.6, -12.0],
    approach: [1, 0, 0],
    approachDist: 12,
    // Idem : le disque dur glisse hors de sa cage, il ne plonge pas.
    explode: [22, 2, -13],
    labelOffset: [0, 3.4, -9],
    snapRadius: 7,
  },

  ssd25: {
    // Posé à plat sur le dessus de la cage à disques, comme dans un vrai
    // boîtier moderne qui garde un berceau 2,5" au-dessus de la baie 3,5".
    position: [-1.0, 5.6, -12.0],
    approach: [0, 1, 0],
    approachDist: 9,
    explode: [24, 4, -6],
    labelOffset: [0, 2.6, -7],
    snapRadius: 5,
  },

  odd: {
    // Baie 5,25" en haut de la façade : le seul emplacement ouvert sur
    // l'extérieur, au-dessus du ventilateur avant.
    position: [1.4, 41.6, -15.7],
    approach: [0, 0, -1],
    approachDist: 14,
    explode: [16, 7, -24],
    labelOffset: [0, 3.6, -6],
    snapRadius: 8,
  },

  fanFront: {
    position: [0.2, 28.0, -20.4],
    approach: [0, 0, 1],
    approachDist: 10,
    explode: [4, 7, -25],
    labelOffset: [0, 7.2, -2],
    snapRadius: 6.5,
  },

  fanRear: {
    position: [4.2, 33.5, 21.6],
    approach: [0, 0, -1],
    approachDist: 10,
    explode: [7, 9, 23],
    labelOffset: [0, 7.2, 2],
    snapRadius: 6.5,
  },

  cmos: {
    position: [S + 0.3, MB_POINTS.cmos.y, MB_POINTS.cmos.z],
    approach: [1, 0, 0],
    approachDist: 8,
    // Petite pièce noyée dans la zone chipset : on la sort franchement
    // vers le panneau ouvert (+X dominant), en la remontant et en
    // l'amenant vers l'avant pour la dégager des voisins.
    explode: [26, 6, -7],
    labelOffset: [3, 3.2, 0],
    snapRadius: 2.6,
  },
}

/* ------------------------------------------------------------------ */
/*  Établi : position des pièces en attente, hors du boîtier           */
/* ------------------------------------------------------------------ */

/**
 * Les composants non installés attendent sur un « établi » virtuel,
 * en arc de cercle devant le boîtier. Rendu par l'inventaire 3D.
 */
export function benchPosition(index: number, total: number): Vec3 {
  const spread = Math.min(total, 7)
  const col = index % spread
  const row = Math.floor(index / spread)
  const x = 26 + row * 12
  const z = (col - (spread - 1) / 2) * 9
  return [x, 6 + row * 0.5, z]
}

/* ------------------------------------------------------------------ */
/*  Caméras préréglées                                                 */
/* ------------------------------------------------------------------ */

export const CAMERA_VIEWS = {
  /** Vue trois-quarts d'ensemble */
  overview: { position: [92, 58, 84] as Vec3, target: [0, 22, 0] as Vec3 },
  /** Face au côté ouvert : on voit la carte mère de face */
  inside: { position: [82, 27, 10] as Vec3, target: [-2, 26, 8] as Vec3 },
  /** Recul pour la vue éclatée complète */
  exploded: { position: [112, 74, 98] as Vec3, target: [8, 24, 0] as Vec3 },
  /**
   * Câblage : le flanc ouvert en entier.
   * Les deux extrémités d'un câble (le bloc d'alimentation tout en bas et
   * le connecteur visé, parfois tout en haut) doivent tenir dans le cadre.
   */
  cablage: { position: [104, 30, 14] as Vec3, target: [2, 24, 4] as Vec3 },
  /** Zoom sur le socket, la mémoire et le ventirad */
  cpuZone: { position: [54, 47, 6] as Vec3, target: [-1, 33, 12] as Vec3 },
  /** Vue arrière : connectique + périphériques */
  rear: { position: [-5, 30, 100] as Vec3, target: [0, 23, 23] as Vec3 },
  /**
   * Banc de branchement : la connectique arrière à gauche, le périphérique
   * et son câble à droite. Le cadre doit contenir les deux.
   */
  branchement: { position: [6, 34, 142] as Vec3, target: [12, 25, 14] as Vec3 },
  /** Vue basse : alimentation et disque dur */
  bottom: { position: [74, 17, 50] as Vec3, target: [0, 6, 2] as Vec3 },
  /** Présentoir : une seule pièce isolée, pour les quiz */
  showcase: { position: [8, 30, 60] as Vec3, target: [0, 24, 0] as Vec3 },
  /** Quatre pièces alignées, pour le QCM « à quoi ça sert ? » */
  lineup: { position: [0, 32, 96] as Vec3, target: [0, 30, 0] as Vec3 },
  /** Établi : le boîtier à gauche, les pièces en attente à droite */
  bench: { position: [72, 44, -78] as Vec3, target: [4, 20, -6] as Vec3 },
} as const

export type CameraViewId = keyof typeof CAMERA_VIEWS

/* ------------------------------------------------------------------ */
/*  Boîtes englobantes (surbrillance, emplacements fantômes, clics)     */
/* ------------------------------------------------------------------ */

export interface Bounds {
  /** Dimensions de la boîte */
  size: Vec3
  /** Décalage du centre de la boîte par rapport à l'origine du modèle */
  offset: Vec3
}

export const BOUNDS: Record<Exclude<ComponentId, 'case'>, Bounds> = {
  motherboard: { size: [5.2, MB.height, MB.depth], offset: [2.4, 0, 0] },
  cpu: { size: [0.75, 4.2, 4.2], offset: [0, 0, 0] },
  cooler: { size: [12.8, 12.4, 8.2], offset: [5.8, 0, -1.3] },
  ram1: { size: [5.3, 13.6, 1.3], offset: [2.65, 0, 0] },
  ram2: { size: [5.3, 13.6, 1.3], offset: [2.65, 0, 0] },
  ssd: { size: [0.8, 2.6, 8.4], offset: [0.1, 0, 0] },
  hdd: { size: [10.4, 3.1, 15.2], offset: [0, 0, 0] },
  ssd25: { size: [7.2, 1.4, 10.2], offset: [0, 0, 0] },
  // façade comprise : le bloc dépasse un peu vers l'avant
  odd: { size: [15.2, 4.6, 18.2], offset: [0, 0, -0.4] },
  gpu: { size: [11.8, 4.2, 26.2], offset: [-0.2, -0.3, -0.15] },
  psu: { size: [15.2, 8.8, 14.2], offset: [0, 0, 0] },
  fanFront: { size: [12.2, 12.2, 2.8], offset: [0, 0, 0] },
  fanRear: { size: [12.2, 12.2, 2.8], offset: [0, 0, 0] },
  // Boîte de clic élargie : la pile est minuscule, on agrandit la cible.
  cmos: { size: [2.6, 2.8, 2.8], offset: [0, 0, 0] },
}

/**
 * Hauteur minimale du BAS d'une pièce en vue éclatée.
 *
 * Le sol du décor est à y = -1,85. Sans garde-fou, les pièces dont le
 * vecteur d'éclatement descend (alimentation, disque dur) s'enfoncent
 * dedans et deviennent inatteignables.
 */
export const EXPLODE_FLOOR = 0.6

/** Ordonnée minimale de l'ORIGINE du modèle pour que sa boîte reste au-dessus du sol. */
export function minExplodeY(id: Exclude<ComponentId, 'case'>): number {
  const b = BOUNDS[id]
  return EXPLODE_FLOOR + b.size[1] / 2 - b.offset[1]
}

/** Position monde du centre de la boîte englobante d'un composant installé. */
export function boundsCenter(id: Exclude<ComponentId, 'case'>): Vec3 {
  const s = SLOTS[id]
  const b = BOUNDS[id]
  return [s.position[0] + b.offset[0], s.position[1] + b.offset[1], s.position[2] + b.offset[2]]
}
