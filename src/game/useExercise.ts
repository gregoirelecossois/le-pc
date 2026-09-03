/**
 * État de l'exercice en cours.
 *
 * C'est un store global (et non un contexte React) parce que la scène 3D
 * vit dans un arbre de rendu séparé : un store traverse cette frontière,
 * pas un contexte.
 */

import { create } from 'zustand'
import { CHAPTER_BY_ID, type ChapterId } from '@/data/chapters'
import type { PartId } from '@/three/models'
import type { PeripheralModelId } from '@/three/models/PeripheralParts'
import { starsFor, useGame } from '@/state/useGame'
import { sfx } from '@/audio/sfx'

export type Phase = 'intro' | 'play' | 'done'

export interface Feedback {
  kind: 'ok' | 'bad' | 'info'
  title: string
  text?: string
  /** Remplace le mot d'en-tête par défaut (« Bravo » / « Presque » / « À savoir ») */
  word?: string
  /** Pièce montrée en 3D dans la fenêtre, si la correction porte sur une pièce (« case » = le boîtier) */
  part?: PartId | 'case' | null
  /** Périphérique montré en 3D, pour le chapitre 7 */
  peri?: PeripheralModelId | null
  /**
   * Exécuté quand l'élève ferme la fenêtre.
   * C'est lui qui fait passer à la question suivante : la correction est
   * lue à son rythme, elle ne s'efface plus toute seule au bout de 3 s.
   */
  onDismiss?: () => void
  /** Identifiant pour forcer la ré-animation même si le texte est identique */
  seq: number
}

/** Options communes à `good`, `bad` et `info`. */
export interface FeedbackOpts {
  part?: PartId | 'case' | null
  peri?: PeripheralModelId | null
  onDismiss?: () => void
  /** `good` seulement : de combien avance la progression (1 par défaut) */
  step?: number
  /** Remplace le mot d'en-tête de la fenêtre */
  word?: string
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
  good: (title: string, text?: string, opts?: FeedbackOpts) => void
  bad: (title: string, text?: string, opts?: FeedbackOpts) => void
  info: (title: string, text?: string, opts?: FeedbackOpts) => void
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

  /* ----------------------------------------------------------------
     Une correction à la fois, et elle n'est JAMAIS remplacée.

     `feedback` n'a qu'une seule place. Tant qu'une correction est ouverte,
     une seconde l'écrasait — et avec elle son `onDismiss`, qui est
     précisément ce qui fait avancer l'exercice. Un élève qui redéposait une
     pièce sans avoir fermé la fenêtre de réussite perdait donc son
     avancement : la même question lui était reposée, et sur le DERNIER item
     l'atelier ne se validait plus jamais. Signalé sur le chapitre 8, avec le
     câble d'alimentation, mais les dix chapitres partagent ce moteur.

     La fenêtre est modale : on ignore donc ce qui arrive derrière elle. C'est
     aussi ce que l'élève voit — il ne devrait pas pouvoir agir sur une scène
     qu'une fenêtre recouvre.
     ---------------------------------------------------------------- */
  good: (title, text, opts = {}) => {
    if (get().feedback) return
    sfx.good()
    set((s) => ({
      done: s.done + (opts.step ?? 1),
      feedback: {
        kind: 'ok',
        title,
        text,
        word: opts.word,
        part: opts.part,
        peri: opts.peri,
        onDismiss: opts.onDismiss,
        seq: seq++,
      },
    }))
  },

  bad: (title, text, opts = {}) => {
    if (get().feedback) return
    sfx.error()
    set((s) => ({
      mistakes: s.mistakes + 1,
      penalty: s.penalty + 10,
      feedback: {
        kind: 'bad',
        title,
        text,
        word: opts.word,
        part: opts.part,
        peri: opts.peri,
        onDismiss: opts.onDismiss,
        seq: seq++,
      },
    }))
  },

  info: (title, text, opts = {}) => {
    if (get().feedback) return
    set({
      feedback: {
        kind: 'info',
        title,
        text,
        word: opts.word,
        part: opts.part,
        peri: opts.peri,
        onDismiss: opts.onDismiss,
        seq: seq++,
      },
    })
  },

  // La suite de l'exercice est déclenchée par la fermeture de la fenêtre,
  // pas par une minuterie : l'élève avance quand il a lu.
  clearFeedback: () => {
    const done = get().feedback?.onDismiss
    set({ feedback: null })
    done?.()
  },

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

/* Mise au point depuis la console, en développement — comme __peri et __build.
   Sert notamment à rejouer un enchaînement d'exercice sans le refaire à la main. */
if (import.meta.env.DEV) {
  ;(window as unknown as Record<string, unknown>).__ex = useExercise
}

