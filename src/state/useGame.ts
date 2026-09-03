/**
 * Progression de l'élève.
 *
 * Deux modes, et c'est le `Store` de l'Atelier informatique (public/atelier/) qui
 * tranche tout seul :
 *
 * - **Sans compte** — clé USB, double-clic, `file://`, build hors-ligne, ou simplement
 *   élève non connecté : tout reste dans le navigateur du poste, rien ne part sur
 *   Internet. C'est le comportement historique, inchangé.
 * - **Avec compte** — l'élève connecté retrouve sa progression de poste en poste,
 *   exactement comme celle des six ateliers. Pas de second écran de connexion : les
 *   deux applications sont publiées sur la même origine, la session est déjà là.
 *
 * Le basculement est entièrement porté par `safeStorage` ci-dessous ; le reste du
 * fichier ignore lequel des deux modes est actif.
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
 * Clé de la progression.
 *
 * Le préfixe `pc_` n'est pas décoratif : c'est LUI qui autorise le serveur de l'Atelier
 * à stocker la clé (liste `PREFIXES`, jumelée entre `api/server.js` et
 * `scripts/store.js` là-bas). Une clé sans préfixe connu est refusée, pas ignorée.
 */
const CLE = 'pc_progression'

/** Nom d'avant le partage de comptes. Repris une fois, pour ne perdre aucune partie. */
const CLE_HERITEE = 'le-pc-progression'

/** Le Store de l'Atelier s'il a été chargé (public/atelier/store.js), sinon null. */
function atelier(): {
  get(k: string): string | null
  set(k: string, v: string): void
  del(k: string): void
} | null {
  if (typeof window === 'undefined') return null
  return (window as unknown as Record<string, unknown>).Store as never
}

/**
 * Stockage tolérant aux pannes.
 *
 * Trois niveaux de repli, du plus capable au plus dégradé :
 *   1. le `Store` de l'Atelier — qui gère lui-même le mode compte ET le mode local ;
 *   2. `localStorage` en direct, si le script de l'Atelier n'a pas été chargé ;
 *   3. une Map en mémoire — ouvert par double-clic (`file://`) ou en navigation privée,
 *      `localStorage` peut lever : la partie tourne, seule la sauvegarde est perdue.
 */
const memory = new Map<string, string>()
const safeStorage = {
  getItem: (k: string) => {
    const S = atelier()
    if (S) {
      const v = S.get(k)
      if (v != null) return v
      /* Reprise de l'ancienne clé : un élève qui avait déjà joué sur ce poste avant le
         partage de comptes ne repart pas de zéro. On efface la vieille clé aussitôt
         recopiée — sinon elle ressusciterait le jour où la nouvelle est légitimement
         vide (compte réinitialisé par le professeur, par exemple). */
      try {
        const vieux = window.localStorage.getItem(CLE_HERITEE)
        if (vieux) {
          S.set(k, vieux)
          window.localStorage.removeItem(CLE_HERITEE)
          return vieux
        }
      } catch {
        /* localStorage indisponible : rien à reprendre, ce n'est pas une erreur. */
      }
      return null
    }
    try {
      return window.localStorage.getItem(k)
    } catch {
      return memory.get(k) ?? null
    }
  },
  setItem: (k: string, v: string) => {
    /* Le serveur refuse toute valeur de plus de 4096 octets (VALEUR_MAX). On est très
       en dessous, mais la progression grossit à chaque chapitre ajouté : mieux vaut le
       voir en console au moment où ça se joue que par une sauvegarde qui disparaît. */
    if (import.meta.env.DEV && v.length > 3500) {
      console.warn(
        `[progression] ${v.length} octets : la limite serveur est 4096. ` +
          `Découper la clé « ${CLE} » avant d'ajouter d'autres chapitres.`,
      )
    }
    const S = atelier()
    if (S) {
      S.set(k, v)
      return
    }
    try {
      window.localStorage.setItem(k, v)
    } catch {
      memory.set(k, v)
    }
  },
  removeItem: (k: string) => {
    const S = atelier()
    if (S) {
      S.del(k)
      return
    }
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
      name: CLE,
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

/**
 * Le Store de l'Atelier démarre sur son cache local, puis interroge le serveur. Quand la
 * réponse arrive et qu'elle change quelque chose, il émet `store:maj` — une seule fois,
 * à l'amorçage. Sans cette relecture, un élève qui a joué sur un autre poste verrait ici
 * son ancienne progression, et l'écraserait au premier chapitre terminé.
 */
if (typeof document !== 'undefined') {
  document.addEventListener('store:maj', () => {
    void useGame.persist.rehydrate()
  })
}

/* Accès depuis la console en développement. */
if (import.meta.env.DEV) {
  ;(window as unknown as Record<string, unknown>).__game = useGame
}
