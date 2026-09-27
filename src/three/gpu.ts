/**
 * Géométrie de la carte graphique, partagée entre le modèle 3D (`Gpu`,
 * dans models/BigParts), les sorties vidéo de l'atelier de branchement
 * (data/ports) et le câblage (data/cables).
 *
 * La carte est tracée en unités de dessin avec ses propres axes : longueur
 * sur X (équerre vers -X), bord PCIe vers -Y, ventilateurs vers +Z. Dans
 * le boîtier (repère local de l'emplacement `SLOTS.gpu`), elle est à plat :
 *   - ses contacts PCIe vers la carte mère (-X local),
 *   - ses ventilateurs vers le bas (-Y local),
 *   - son équerre à l'arrière (+Z local), dans le plan des cache-slots.
 */

import * as THREE from 'three'
import { SLOTS, type Vec3 } from './layout'

/** Unités de dessin -> centimètres : 27 cm de long, 11 cm de haut, 4,5 cm d'épaisseur. */
export const GPU_SCALE = 3.16

/**
 * Rotation du dessin vers le boîtier : X (longueur) -> -Z, Y (hauteur)
 * -> +X, Z (épaisseur) -> -Y. C'est une vraie rotation (pas de miroir) :
 * les inscriptions restent lisibles.
 */
export const GPU_ROTATION = new THREE.Matrix4().makeBasis(
  new THREE.Vector3(0, 0, -1),
  new THREE.Vector3(1, 0, 0),
  new THREE.Vector3(0, -1, 0),
)

/**
 * Calage dans l'emplacement :
 *   x : le bas des contacts PCIe au fond du slot de la carte mère ;
 *   y : les contacts à la hauteur du slot ;
 *   z : l'équerre contre le panneau arrière, à la place des cache-slots.
 */
export const GPU_PLACE = new THREE.Matrix4()
  .makeTranslation(0.72, -0.356, 0.3)
  .multiply(new THREE.Matrix4().makeScale(GPU_SCALE, GPU_SCALE, GPU_SCALE))
  .multiply(GPU_ROTATION)

/** Point du dessin -> coordonnées MONDE (carte installée). */
export function gpuWorld(p: Vec3): Vec3 {
  const v = new THREE.Vector3(...p).applyMatrix4(GPU_PLACE)
  const o = SLOTS.gpu.position
  return [o[0] + v.x, o[1] + v.y, o[2] + v.z]
}

/* ---- L'équerre et ses sorties vidéo ---- */

/** Équerre : origine et rotation de son repère, en unités de dessin. */
export const GPU_BRACKET = { x: -4.35, z: 0.05 }
/**
 * Position des quatre sorties le long de l'équerre (HDMI puis 3
 * DisplayPort). Décalées vers la carte mère et un peu resserrées par
 * rapport au modèle d'origine : sinon la dernière se cachait derrière la
 * tôle du boîtier. (Plus bas, la découpe HDMI sortirait de l'équerre.)
 */
export const GPU_PORT_YS = [-1.58, -0.84, -0.1, 0.64]
/** Largeur (le long de l'équerre) et hauteur d'une sortie, en unités de dessin. */
export const GPU_PORT_W = 0.64
export const GPU_PORT_H = 0.5

/** Point du repère de l'équerre -> point du dessin. */
export function bracketToCard(px: number, py: number, pz: number): Vec3 {
  // repère de l'équerre tourné de -90° autour de Y
  return [GPU_BRACKET.x - pz, py, GPU_BRACKET.z + px]
}

/** Une sortie vidéo en coordonnées monde : centre de son blindage et taille (cm). */
export function gpuPort(index: number): { position: Vec3; size: Vec3 } {
  const py = GPU_PORT_YS[index]
  // blindage : de 0,06 à 0,13 devant l'équerre, centré en x = -0,32
  return {
    position: gpuWorld(bracketToCard(-0.32, py, 0.095)),
    size: [GPU_PORT_W * GPU_SCALE, GPU_PORT_H * GPU_SCALE, 0.07 * GPU_SCALE],
  }
}

/* ---- La prise d'alimentation 8 broches, sur la tranche supérieure ---- */

/** Centre de la face de la prise 8 broches (où s'enfiche le câble PCIe), en coordonnées monde. */
export function gpuPowerSocket(): Vec3 {
  return gpuWorld([2.9, 1.66 + 0.221, -0.04])
}
