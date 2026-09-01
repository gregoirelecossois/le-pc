/**
 * Progression de l'élève.
 * Tout est stocké dans le navigateur (localStorage) : aucune donnée
 * ne quitte le poste, rien n'est envoyé sur Internet.
 */

import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { BADGE_BY_ID, type BadgeId } from '@/data/badges'
import { CHAPTERS, type ChapterId, levelFor } from '@/data/chapters'
import { COMPONENT_IDS, type ComponentId } from '@/data/components'
import { sfx } from '@/audio/sfx'

export type Screen = 'accueil' | 'carte' | 'jeu' | 'fiche' | 'badges'

export interface ChapterResult {
  stars: 0 | 1 | 2 | 3
  bestScore: number
  mistakes: number
  seconds: number
  hintsUsed: number
  done: boolean
}

interface GameState {
  pseudo: string
  xp: number
  screen: Screen
  chapter: ChapterId | null
  discovered: ComponentId[]
  results: Partial<Record<ChapterId, ChapterResult>>
  badges: BadgeId[]
  /** File d'attente des notifications (badge / XP) à afficher */
  toasts: { id: number; kind: 'xp' | 'badge' | 'info' | 'error'; text: string; icon?: string }[]
  sound: boolean
  quality: 'bas' | 'moyen' | 'eleve'
  showHelp: boolean
  /**
   * Raccourcis d'enseignant : accès direct à n'importe quel chapitre.
   * S'ouvre depuis l'accueil avec un code, et reste actif sur ce poste.
   */
  dev: boolean

  setPseudo: (v: string) => void
  go: (s: Screen) => void
  openChapter: (c: ChapterId) => void
  discover: (id: ComponentId) => void
  finishChapter: (c: ChapterId, r: Omit<ChapterResult, 'done'>) => void
  award: (b: BadgeId) => void
  addXp: (n: number, reason?: string) => void
  toast: (t: { kind: 'xp' | 'badge' | 'info' | 'error'; text: string; icon?: string }) => void
  dropToast: (id: number) => void
  setSound: (v: boolean) => void
  setQuality: (q: 'bas' | 'moyen' | 'eleve') => void
  setShowHelp: (v: boolean) => void
  setDev: (v: boolean) => void
  /** Marque tout le parcours comme terminé (démonstration en classe). */
  devCompleteAll: () => void
  reset: () => void
}

/**
 * Stockage tolérant aux pannes.
 *
 * Ouvert par double-clic (protocole file://) ou en navigation privée,
 * localStorage peut être indisponible : dans ce cas la partie fonctionne
 * quand même, seule la sauvegarde est perdue.
 */
const memory = new Map<string, string>()
const safeStorage = {
  getItem: (k: string) => {
    try {
      return window.localStorage.getItem(k)
    } catch {
      return memory.get(k) ?? null
    }
  },
  setItem: (k: string, v: string) => {
    try {
      window.localStorage.setItem(k, v)
    } catch {
      memory.set(k, v)
    }
  },
  removeItem: (k: string) => {
    try {
      window.localStorage.removeItem(k)
    } catch {
      memory.delete(k)
    }
  },
}

let toastSeq = 1

const EMPTY: Pick<GameState, 'xp' | 'discovered' | 'results' | 'badges'> = {
  xp: 0,
  discovered: [],
  results: {},
  badges: [],
}

export const useGame = create<GameState>()(
  persist(
    (set, get) => ({
      pseudo: '',
      screen: 'accueil',
      chapter: null,
      toasts: [],
      sound: true,
      quality: 'eleve',
      showHelp: true,
      dev: false,
      ...EMPTY,

      setPseudo: (v) => set({ pseudo: v.slice(0, 24) }),
      go: (screen) => set({ screen }),
      openChapter: (chapter) => set({ chapter, screen: 'jeu' }),
      setSound: (sound) => set({ sound }),
      setQuality: (quality) => set({ quality }),
      setShowHelp: (showHelp) => set({ showHelp }),
      setDev: (dev) => set({ dev }),

      /**
       * Écrit directement les résultats, sans passer par `finishChapter` :
       * on veut ouvrir les portes, pas distribuer des badges qui n'ont pas
       * été gagnés.
       */
      devCompleteAll: () =>
        set({
          results: Object.fromEntries(
            CHAPTERS.map((c) => [
              c.id,
              { stars: 3, bestScore: c.xp, mistakes: 0, seconds: 0, hintsUsed: 0, done: true },
            ]),
          ) as GameState['results'],
        }),

      discover: (id) => {
        if (get().discovered.includes(id)) return
        set((s) => ({ discovered: [...s.discovered, id] }))
        if (get().discovered.length >= COMPONENT_IDS.length) get().award('explorateur')
      },

      toast: (t) =>
        set((s) => ({ toasts: [...s.toasts, { id: toastSeq++, ...t }].slice(-4) })),

      dropToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),

      addXp: (n, reason) => {
        const before = levelFor(get().xp).index
        set((s) => ({ xp: s.xp + n }))
        const after = levelFor(get().xp).index
        get().toast({ kind: 'xp', text: `+${n} XP${reason ? ` — ${reason}` : ''}` })
        if (after > before) {
          const lvl = levelFor(get().xp)
          get().toast({ kind: 'badge', icon: lvl.icon, text: `Niveau atteint : ${lvl.title} !` })
        }
      },

      award: (b) => {
        if (get().badges.includes(b)) return
        set((s) => ({ badges: [...s.badges, b] }))
        const badge = BADGE_BY_ID[b]
        sfx.badge()
        get().toast({ kind: 'badge', icon: badge.icon, text: `Badge débloqué : ${badge.name} !` })
      },

      finishChapter: (c, r) => {
        const prev = get().results[c]
        const best = prev
          ? {
              ...r,
              done: true,
              stars: Math.max(prev.stars, r.stars) as 0 | 1 | 2 | 3,
              bestScore: Math.max(prev.bestScore, r.bestScore),
              seconds: Math.min(prev.seconds || Infinity, r.seconds),
            }
          : { ...r, done: true }
        set((s) => ({ results: { ...s.results, [c]: best } }))

        // Badge propre au chapitre
        const flawless = r.mistakes === 0
        const perChapter: Partial<Record<ChapterId, BadgeId>> = {
          nommer: 'nomenclature',
          reperer: 'oeil-de-lynx',
          roles: 'pedagogue',
          cablage: 'electricien',
          branchement: 'connecteur',
          demontage: 'demonteur',
        }
        const badge = perChapter[c]
        if (badge && flawless) get().award(badge)
        if (c === 'montage') get().award('monteur')
        if (c === 'defi' && r.seconds <= 180) get().award('chrono')
        if (r.hintsUsed === 0 && flawless) get().award('sans-indice')

        // Badges de fin de parcours
        const res = get().results
        if (CHAPTERS.every((ch) => res[ch.id]?.done)) get().award('certifie')
        if (CHAPTERS.every((ch) => res[ch.id]?.stars === 3)) get().award('perfectionniste')
      },

      reset: () => set({ ...EMPTY, screen: 'accueil', chapter: null, toasts: [] }),
    }),
    {
      name: 'le-pc-progression',
      version: 2,
      /**
       * v1 -> v2 : le chapitre 7 « Les périphériques » a été scindé en deux
       * (« Nomme les périphériques » = peripheriques, « Branche les
       * périphériques » = branchement). Un parcours déjà terminé sous v1
       * avait fait les deux d'un coup : on reporte la réussite sur le
       * nouveau chapitre pour ne pas re-verrouiller la suite.
       */
      migrate: (state: unknown, version: number) => {
        const s = state as GameState
        if (version < 2 && s?.results?.peripheriques?.done && !s.results.branchement) {
          s.results = { ...s.results, branchement: { ...s.results.peripheriques } }
        }
        return s
      },
      storage: createJSONStorage(() => safeStorage),
      partialize: (s) => ({
        pseudo: s.pseudo,
        xp: s.xp,
        discovered: s.discovered,
        results: s.results,
        badges: s.badges,
        sound: s.sound,
        quality: s.quality,
        showHelp: s.showHelp,
        dev: s.dev,
      }),
    },
  ),
)

/* ---------------------------------------------------------------- */
/*  Sélecteurs pratiques                                             */
/* ---------------------------------------------------------------- */

export function useLevel() {
  const xp = useGame((s) => s.xp)
  return levelFor(xp)
}

/** Un chapitre est jouable si le précédent est terminé. */
export function isUnlocked(id: ChapterId, results: GameState['results']) {
  const ch = CHAPTERS.find((c) => c.id === id)
  if (!ch || !ch.requires) return true
  return !!results[ch.requires]?.done
}

/** Étoiles obtenues en fonction des erreurs et des indices. */
export function starsFor(mistakes: number, hintsUsed: number): 0 | 1 | 2 | 3 {
  const penalty = mistakes + hintsUsed * 0.5
  if (penalty <= 0) return 3
  if (penalty <= 2) return 2
  if (penalty <= 5) return 1
  return 1
}

/* Accès depuis la console en développement. */
if (import.meta.env.DEV) {
  ;(window as unknown as Record<string, unknown>).__game = useGame
}
