/**
 * Chapitre 2 — Comment ça s'appelle ?
 * Une pièce tourne sur son présentoir, l'élève choisit son nom.
 */

import { useEffect, useMemo, useState } from 'react'
import { COMPONENTS, soloName, type ComponentId } from '@/data/components'
import type { PartId } from '@/three/models'
import { Showcase } from '@/three/Showcase'
import { Btn } from '@/ui/bits'
import { ExerciseBar, ExerciseEnd, ExerciseIntro, Feedback } from './Frame'
import { useExercise } from './useExercise'
import { sfx } from '@/audio/sfx'
import { create } from 'zustand'

/* ---------------- État partagé scène / interface ---------------- */

interface NamingState {
  order: PartId[]
  index: number
  revealed: boolean
}
const useNaming = create<NamingState>()(() => ({ order: [], index: 0, revealed: false }))

/** Les pièces du quiz (le boîtier est trop évident, on l'écarte). */
const POOL: PartId[] = [
  'motherboard',
  'cpu',
  'cooler',
  'ram1',
  'ssd',
  'ssd25',
  'hdd',
  'odd',
  'gpu',
  'psu',
  'fanFront',
  'cmos',
]

function shuffle<T>(a: T[]): T[] {
  const r = [...a]
  for (let i = r.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[r[i], r[j]] = [r[j], r[i]]
  }
  return r
}

/* ---------------- Scène 3D ---------------- */

export function NamingScene() {
  const order = useNaming((s) => s.order)
  const index = useNaming((s) => s.index)
  const id = order[index]
  if (!id) return null
  return <Showcase id={id} />
}

/* ---------------- Interface ---------------- */

export function NamingUi() {
  const ex = useExercise()
  const { order, index, revealed } = useNaming()
  const [result, setResult] = useState<{ stars: 0 | 1 | 2 | 3; xp: number } | null>(null)
  const [wrong, setWrong] = useState<string | null>(null)

  useEffect(() => {
    const list = shuffle(POOL)
    useNaming.setState({ order: list, index: 0, revealed: false })
    useExercise.getState().begin('nommer', list.length)
  }, [])

  const current = order[index]

  // Les 4 propositions : le bon nom + 3 leurres, mélangés.
  // `soloName` sert de bonne réponse : sur le présentoir, la pièce est
  // seule, donc « barrette 1 » ou « ventilateur avant » ne se vérifient pas.
  const choices = useMemo(() => {
    if (!current) return []
    const c = COMPONENTS[current as ComponentId]
    return shuffle([soloName(current as ComponentId), ...c.distractors])
  }, [current])

  const answer = (label: string) => {
    if (revealed || !current) return
    const c = COMPONENTS[current as ComponentId]
    const good = soloName(current as ComponentId)
    if (label === good) {
      useNaming.setState({ revealed: true })
      setWrong(null)
      useExercise.getState().good('Exact !', c.role, { part: current, onDismiss: next })
    } else {
      setWrong(label)
      useNaming.setState({ revealed: true })
      useExercise
        .getState()
        .bad('Pas tout à fait…', `C'est « ${good} ». ${c.analogy}`, { part: current, onDismiss: next })
    }
  }

  const next = () => {
    const s = useNaming.getState()
    if (s.index + 1 >= s.order.length) {
      setResult(useExercise.getState().finish())
    } else {
      useNaming.setState({ index: s.index + 1, revealed: false })
      setWrong(null)
    }
  }

  const hint = () => {
    if (!current) return
    useExercise.getState().hint()
    const c = COMPONENTS[current as ComponentId]
    useExercise.getState().info('Indice', c.analogy, { part: current })
  }

  return (
    <>
      <ExerciseBar onHint={hint} />
      <ExerciseIntro>
        <div className="intro-tips">
          <div>
            <b>🔄 La pièce tourne</b> observe-la sous tous les angles
          </div>
          <div>
            <b>💡 Indice</b> donne une comparaison, mais coûte une étoile
          </div>
        </div>
      </ExerciseIntro>

      {ex.phase === 'play' && current && (
        <div className="quiz">
          <div className="quiz-q">
            Question {index + 1} / {order.length} — comment s'appelle cette pièce ?
          </div>
          <div className="quiz-choices">
            {choices.map((label) => {
              const ok = label === soloName(current as ComponentId)
              const cls = revealed ? (ok ? 'good' : label === wrong ? 'bad' : 'dim') : ''
              return (
                <button
                  key={label}
                  className={`quiz-btn ${cls}`}
                  disabled={revealed}
                  onClick={() => {
                    sfx.click()
                    answer(label)
                  }}
                >
                  {label}
                </button>
              )
            })}
          </div>
          {revealed && (
            <div className="quiz-next">
              <Btn size="sm" variant="ghost" onClick={next}>
                Suivant →
              </Btn>
            </div>
          )}
        </div>
      )}

      <Feedback />
      <ExerciseEnd result={result} />
    </>
  )
}
