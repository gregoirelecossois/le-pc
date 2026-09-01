/**
 * Ce que montre le petit rendu 3D de la fenêtre de correction.
 *
 * C'est un store global (et non un état local) pour deux raisons :
 *  - le canvas de correction vit désormais au niveau de l'application, il
 *    ne se remonte plus à chaque chapitre → contexte WebGL toujours chaud ;
 *  - le préchargeur du lancement peut le piloter pour compiler d'avance
 *    tous les modèles.
 */

import { create } from 'zustand'
import type { PartId } from '@/three/models'
import type { PeripheralModelId } from '@/three/models/PeripheralParts'

interface FbView {
  part: PartId | 'case' | null
  peri: PeripheralModelId | null
  /** Vitesse de rotation (0 = figé quand la fenêtre est fermée) */
  spin: number
  /** Préchargement en cours : le canvas est visible (sous l'écran de chargement) */
  warming: boolean
  /** Préchargement terminé : le canvas reste monté pour toute la session */
  warmed: boolean
}

export const useFbView = create<FbView>()(() => ({
  part: null,
  peri: null,
  spin: 0,
  warming: false,
  warmed: false,
}))
