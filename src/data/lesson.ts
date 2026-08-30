/**
 * Le contenu de la fiche de révision, écrit UNE fois.
 *
 * L'écran et le PDF affichent exactement la même leçon : les deux la
 * lisent ici, sinon l'un des deux finit toujours par dériver.
 *
 * Le catalogue des composants sert le JEU : il distingue les deux
 * barrettes de mémoire et les deux ventilateurs, parce qu'on les monte à
 * des endroits différents. Une LEÇON, elle, n'a pas à répéter deux fois la
 * même pièce : on les présente ensemble, et le texte explique pourquoi il
 * y en a deux.
 */

import { CATEGORY_LABEL, COMPONENTS, COMPONENT_IDS, type ComponentId } from './components'
import { KIND_LABEL, PERIPHERALS } from './peripherals'
import type { ShotId } from '@/three/Thumbnails'

export interface LessonEntry {
  /** Clé de liste, et identifiant de la photo à prendre */
  id: string
  shot: ShotId
  title: string
  /** Texte de la pastille (famille, ou entrée / sortie) */
  label: string
  role: string
  /** La phrase à retenir, préfixe compris */
  memo: string
  /** Couleur d'accent, telle qu'elle sort du jeu (à assombrir pour le papier) */
  color: string
}

/** La photo qui illustre un composant. */
export function shotOf(id: ComponentId): ShotId {
  return id === 'case' ? 'case' : (`part:${id}` as ShotId)
}

/** Composants regroupés : la seconde pièce n'a pas sa propre fiche. */
const MERGED: Partial<Record<ComponentId, LessonEntry>> = {
  ram1: {
    id: 'ram',
    shot: 'part:ram1',
    title: 'La mémoire vive (RAM)',
    label: CATEGORY_LABEL.memoire,
    role:
      "Elle stocke temporairement les programmes et les fichiers en cours d'utilisation, pour que le processeur y accède très vite. On monte deux barrettes identiques : la quantité de mémoire double, et les échanges vont plus vite (mode « double canal »).",
    memo:
      'À retenir : Ton plan de travail : plus il est grand, plus tu peux étaler de choses en même temps. Mais on le vide entièrement à chaque extinction.',
    color: COMPONENTS.ram1.color,
  },
  fanFront: {
    id: 'fans',
    shot: 'part:fanFront',
    title: 'Les ventilateurs du boîtier',
    label: CATEGORY_LABEL.refroidissement,
    role:
      "Celui de l'AVANT aspire l'air frais de la pièce, celui de l'ARRIÈRE expulse l'air chaud. À eux deux, ils créent un courant d'air traversant qui balaie tous les composants.",
    memo:
      "À retenir : Une bouche qui inspire devant, une autre qui expire derrière. Montés dans le même sens, l'air tournerait en rond et le PC chaufferait.",
    color: COMPONENTS.fanFront.color,
  },
}

/** Les pièces absorbées par une fiche groupée : elles ne s'affichent plus. */
const HIDDEN: ComponentId[] = ['ram2', 'fanRear']

/** Leçon 1A — les composants de l'unité centrale. */
export const LESSON_COMPONENTS: LessonEntry[] = COMPONENT_IDS.filter(
  (id) => !HIDDEN.includes(id),
).map((id) => {
  const merged = MERGED[id]
  if (merged) return merged
  const c = COMPONENTS[id]
  return {
    id,
    shot: shotOf(id),
    title: c.acronym ? `${c.shortName} (${c.acronym})` : c.shortName,
    label: CATEGORY_LABEL[c.category],
    role: c.role,
    memo: `À retenir : ${c.analogy}`,
    color: c.color,
  }
})

/** Leçon 2A — les périphériques. */
export const LESSON_PERIPHERALS = PERIPHERALS.map((p) => ({
  id: p.id,
  shot: `peri:${p.id}` as ShotId,
  title: p.name,
  label: KIND_LABEL[p.kind],
  role: p.role,
  memo: `Sa fiche : ${p.plugName}. ${p.plugHint}`,
  kind: p.kind,
}))

/** Toutes les photos dont la fiche a besoin. */
export function lessonShotQueue(): ShotId[] {
  return [...LESSON_COMPONENTS.map((e) => e.shot), ...LESSON_PERIPHERALS.map((e) => e.shot)]
}
