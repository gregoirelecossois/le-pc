/**
 * État de la maquette 3D en cours (non sauvegardé : il change à chaque exercice).
 */

import { create } from 'zustand'
import { COMPONENT_IDS, type ComponentId } from '@/data/components'
import type { CameraViewId } from '@/three/layout'

export interface BuildState {
  /** Composants actuellement en place dans le boîtier */
  installed: ComponentId[]
  /** Vue éclatée : 0 = tout est en place, 1 = totalement écarté */
  explode: number
  /** Composant mis en avant (fiche ouverte) */
  selected: ComponentId | null
  hovered: ComponentId | null
  /** Composant en cours de déplacement dans l'exercice de montage */
  dragging: ComponentId | null
  /** Position du curseur en coordonnées normalisées (-1..1), pendant un glisser */
  dragNdc: [number, number]
  /**
   * Un objet libre est tenu à la main (fiche d'un périphérique).
   * Comme `dragging`, il fige l'orbite de la caméra — mais il ne désigne
   * pas un composant du catalogue.
   */
  handDrag: boolean
  /** Emplacement le plus proche du curseur (aimantation) */
  candidate: ComponentId | null
  /** Emplacement à faire clignoter */
  ghost: ComponentId | null
  /** Feedback visuel du dernier dépôt : 'ok' | 'bad' | null */
  flash: { id: ComponentId; kind: 'ok' | 'bad' } | null
  /** Ventilateurs en rotation */
  running: boolean
  /** LED allumées */
  powered: boolean
  /** Panneau latéral : 0 fermé, 1 retiré */
  panelOpen: number
  hideFront: boolean
  /** Câbles branchés (exercice 6) */
  cables: string[]
  /** Périphériques branchés : id du périphérique -> id de la prise */
  plugged: Record<string, string>
  /** Vue caméra demandée */
  view: CameraViewId
  /** Étiquettes flottantes affichées */
  labels: boolean

  set: (patch: Partial<BuildState>) => void
  install: (id: ComponentId) => void
  uninstall: (id: ComponentId) => void
  setAll: (ids: ComponentId[]) => void
  isIn: (id: ComponentId) => boolean
  plug: (peripheral: string, port: string) => void
  unplug: (peripheral: string) => void
  addCable: (id: string) => void
  resetBuild: (installed?: ComponentId[]) => void
}

const BASE = {
  installed: [] as ComponentId[],
  explode: 0,
  selected: null,
  hovered: null,
  dragging: null,
  dragNdc: [0, 0] as [number, number],
  handDrag: false,
  candidate: null,
  ghost: null,
  flash: null,
  running: false,
  powered: false,
  panelOpen: 1,
  hideFront: false,
  cables: [] as string[],
  plugged: {} as Record<string, string>,
  view: 'overview' as CameraViewId,
  labels: false,
}

export const useBuild = create<BuildState>()((set, get) => ({
  ...BASE,

  set: (patch) => set(patch),

  install: (id) =>
    set((s) => (s.installed.includes(id) ? s : { installed: [...s.installed, id] })),

  uninstall: (id) => set((s) => ({ installed: s.installed.filter((x) => x !== id) })),

  setAll: (installed) => set({ installed }),

  isIn: (id) => get().installed.includes(id),

  plug: (peripheral, port) => set((s) => ({ plugged: { ...s.plugged, [peripheral]: port } })),

  unplug: (peripheral) =>
    set((s) => {
      const next = { ...s.plugged }
      delete next[peripheral]
      return { plugged: next }
    }),

  addCable: (id) => set((s) => (s.cables.includes(id) ? s : { cables: [...s.cables, id] })),

  resetBuild: (installed = []) =>
    set({ ...BASE, installed, plugged: {}, cables: [] }),
}))

/**
 * Tous les composants, boîtier compris.
 *
 * Déduit du catalogue plutôt que recopié à la main : ajouter une pièce à
 * `COMPONENTS` suffit pour qu'elle apparaisse dans la machine complète.
 */
export const ALL_INSTALLED: ComponentId[] = [...COMPONENT_IDS]

/* Accès depuis la console en développement (mise au point du rendu 3D). */
if (import.meta.env.DEV) {
  ;(window as unknown as Record<string, unknown>).__build = useBuild
}
