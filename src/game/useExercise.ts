/**
 * État de l'exercice en cours.
 *
 * C'est un store global (et non un contexte React) parce que la scène 3D
 * vit dans un arbre de rendu séparé : un store traverse cette frontière,
 * pas un contexte.
 */

import { create } from 'zustand'
import { CHAPTER_BY_ID, type ChapterId } from '@/data/chapters'
import { starsFor, useGame } from '@/state/useGame'
import { sfx } from '@/audio/sfx'

export type Phase = 'intro' | 'play' | 'done'

export interface Feedback {
  kind: 'ok' | 'bad' | 'info'
  title: string
  text?: string
  /** Identifiant pour forcer la ré-animation même si le texte est identique */
  seq: number
}

interface ExerciseState {
  chapter: ChapterId | null
  phase: Phase
  /** Nombre d'items à réussir */
  total: number
  /** Nombre d'items réussis */
  done: number
  mistakes: number
  hints: number
  startedAt: number
  elapsed: number
  /** Pénalité de temps (défi chronométré) */
  penalty: number
  feedback: Feedback | null
  /** Empêche les interactions pendant une animation */
  busy: boolean

  begin: (chapter: ChapterId, total: number) => void
  play: () => void
  tick: (dt: number) => void
  good: (title: string, text?: string, step?: number) => void
  bad: (title: string, text?: string) => void
  info: (title: string, text?: string) => void
  clearFeedback: () => void
  hint: () => void
  setBusy: (v: boolean) => void
  setTotal: (n: number) => void
  finish: () => { stars: 0 | 1 | 2 | 3; xp: number }
  quit: () => void
}

let seq = 1

export const useExercise = create<ExerciseState>()((set, get) => ({
  chapter: null,
  phase: 'intro',
  total: 0,
  done: 0,
  mistakes: 0,
  hints: 0,
  startedAt: 0,
  elapsed: 0,
  penalty: 0,
  feedback: null,
  busy: false,

  begin: (chapter, total) =>
    set({
      chapter,
      total,
      phase: 'intro',
      done: 0,
      mistakes: 0,
      hints: 0,
      elapsed: 0,
      penalty: 0,
      feedback: null,
      busy: false,
      startedAt: 0,
    }),

  play: () => set({ phase: 'play', startedAt: performance.now() }),

  tick: (dt) => {
    const s = get()
    if (s.phase !== 'play') return
    set({ elapsed: s.elapsed + dt })
  },

  setTotal: (total) => set({ total }),
  setBusy: (busy) => set({ busy }),

  good: (title, text, step = 1) => {
    sfx.good()
    set((s) => ({ done: s.done + step, feedback: { kind: 'ok', title, text, seq: seq++ } }))
  },

  bad: (title, text) => {
    sfx.error()
    set((s) => ({ mistakes: s.mistakes + 1, penalty: s.penalty + 10, feedback: { kind: 'bad', title, text, seq: seq++ } }))
  },

  info: (title, text) => set({ feedback: { kind: 'info', title, text, seq: seq++ } }),

  clearFeedback: () => set({ feedback: null }),

  hint: () => {
    sfx.click()
    set((s) => ({ hints: s.hints + 1 }))
  },

  finish: () => {
    const s = get()
    const ch = s.chapter ? CHAPTER_BY_ID[s.chapter] : null
    // Dans le défi, chaque erreur coûte 10 secondes : elles comptent
    // dans le temps final.
    const seconds = Math.round(s.elapsed + (s.chapter === 'defi' ? s.penalty : 0))
    const stars = starsFor(s.mistakes, s.hints)
    const ratio = stars === 3 ? 1 : stars === 2 ? 0.75 : 0.5
    const xp = ch ? Math.round(ch.xp * ratio) : 0

    if (s.chapter && ch) {
      const game = useGame.getState()
      game.finishChapter(s.chapter, {
        stars,
        bestScore: xp,
        mistakes: s.mistakes,
        seconds,
        hintsUsed: s.hints,
      })
      game.addXp(xp, ch.title)
    }
    set({ phase: 'done' })
    sfx.success()
    return { stars, xp }
  },

  quit: () => set({ phase: 'intro', chapter: null, feedback: null }),
}))

