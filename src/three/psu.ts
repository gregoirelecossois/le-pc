/**
 * Géométrie du bloc d'alimentation modulaire, partagée entre le modèle 3D
 * (`Psu`, dans models/BigParts) et le câblage (data/cables).
 *
 * Le bloc est tracé en unités de dessin, ventilateur en haut et prises
 * modulaires vers +Z, puis RETOURNÉ comme dans une vraie machine :
 * ventilateur vers le sol, prise secteur vers l'arrière. Les prises
 * modulaires se retrouvent sur la face avant, tournée vers l'intérieur
 * du boîtier ; c'est de là que partent les câbles.
 */

import * as THREE from 'three'
import { SLOTS, type Vec3 } from './layout'

/** Unités de dessin -> centimètres : largeur et hauteur, profondeur. */
export const PSU_SX = 2.79
export const PSU_SZ = 2.45

/**
 * Retournement + échelle, puis calage : dessous à -4,3, dos à +7.
 * L'échelle remplit exactement la découpe du panneau arrière du boîtier
 * (15,2 x 8,6 cm) ; la profondeur reste celle de l'ancien bloc (14 cm).
 */
export const PSU_PLACE = new THREE.Matrix4()
  .makeTranslation(0, 4.49, -0.1)
  .multiply(new THREE.Matrix4().makeScale(PSU_SX, PSU_SX, PSU_SZ))
  .multiply(new THREE.Matrix4().makeRotationX(Math.PI))

export type PsuSocketId = 'mb18' | 'mb10' | 'cpu1' | 'cpu2' | 'pcie1' | 'pcie2' | 'sata1' | 'sata2' | 'sata3'

/** Les prises modulaires : nombre de colonnes (2 rangées) et centre, en unités de dessin. */
export const PSU_SOCKETS: Record<PsuSocketId, { cols: number; x: number; y: number }> = {
  mb18: { cols: 9, x: -0.85, y: 2.3 },
  mb10: { cols: 5, x: 1.42, y: 2.3 },
  cpu1: { cols: 4, x: -1.86, y: 1.33 },
  cpu2: { cols: 4, x: -0.62, y: 1.33 },
  pcie1: { cols: 4, x: 0.62, y: 1.33 },
  pcie2: { cols: 4, x: 1.86, y: 1.33 },
  sata1: { cols: 3, x: -1.44, y: 0.45 },
  sata2: { cols: 3, x: 0, y: 0.45 },
  sata3: { cols: 3, x: 1.44, y: 0.45 },
}

/** Pas des broches et hauteur d'une prise, en unités de dessin. */
export const PSU_PIN_PITCH = 0.215
export const PSU_SOCKET_H = 0.54
/** Face avant des prises (z, en unités de dessin, avant retournement). */
export const PSU_SOCKET_FACE_Z = 3.03

/**
 * Une prise modulaire en coordonnées MONDE (bloc installé) : centre de sa
 * face, taille de son cadre et de son ouverture (là où entre la fiche),
 * en centimètres. La face regarde vers -Z (l'avant de la machine).
 */
export function psuSocket(id: PsuSocketId) {
  const s = PSU_SOCKETS[id]
  const c = new THREE.Vector3(s.x, s.y, PSU_SOCKET_FACE_Z).applyMatrix4(PSU_PLACE)
  const p = SLOTS.psu.position
  return {
    center: [p[0] + c.x, p[1] + c.y, p[2] + c.z] as Vec3,
    w: (s.cols * PSU_PIN_PITCH + 0.115) * PSU_SX,
    h: PSU_SOCKET_H * PSU_SX,
    /** Ouverture : les deux rangées de broches */
    innerW: s.cols * PSU_PIN_PITCH * PSU_SX,
    innerH: 2 * PSU_PIN_PITCH * PSU_SX,
  }
}

/** Longueur de la fiche qui dépasse de la prise, en cm. */
export const PSU_PLUG_DEPTH = 0.9

/** Point où le câble sort de la fiche enfichée dans une prise. */
export function psuPlugTail(id: PsuSocketId): Vec3 {
  const { center } = psuSocket(id)
  return [center[0], center[1], center[2] - PSU_PLUG_DEPTH]
}
