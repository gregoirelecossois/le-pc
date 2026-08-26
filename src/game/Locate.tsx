/**
 * Chapitre 3 — Trouve-le dans la tour.
 * On donne un nom, l'élève clique sur la bonne pièce dans la vue éclatée.
 */

import { useEffect, useState } from 'react'
import { create } from 'zustand'
import { COMPONENTS, lowerName, sameComponent, soloName, type ComponentId } from '@/data/components'
import { ALL_INSTALLED, useBuild } from '@/state/useBuild'
import { PcRig, type HighlightKind } from '@/three/PcRig'
import { asPart } from '@/three/models'
import { ExerciseBar, ExerciseEnd, ExerciseIntro, ExplodeSlider, Feedback, useReady } from './Frame'
import { useExercise } from './useExercise'
import { sfx } from '@/audio/sfx'

interface LocateState {
  order: ComponentId[]
  index: number
  flash: Partial<Record<ComponentId, HighlightKind>>
  locked: boolean
  finished: boolean
}
const useLocate = create<LocateState>()(() => ({
  order: [],
  index: 0,
  flash: {},
  locked: false,
  finished: false,
}))

const POOL: ComponentId[] = [
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
  'fanRear',
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

/* ---------------- Scène ---------------- */

export function LocateScene() {
  const phase = useExercise((s) => s.phase)
  const { order, index, flash, locked } = useLocate()
  const target = order[index]

  const onPartClick = (id: ComponentId) => {
    if (locked || !target) return
    const ex = useExercise.getState()
    // `sameComponent` accepte la jumelle : les deux barrettes de mémoire
    // (comme les deux ventilateurs) sont des pièces identiques, on ne peut
    // pas demander de les distinguer l'une de l'autre.
    if (sameComponent(id, target)) {
      sfx.snap()
      useLocate.setState({ flash: { [id]: 'ok' }, locked: true })
      ex.good('Trouvé !', COMPONENTS[target].role, { part: asPart(target), onDismiss: next })
    } else {
      useLocate.setState({ flash: { [id]: 'bad' }, locked: true })
      ex.bad(
        `Ça, c'est ${lowerName(id)}`,
        `Cherche plutôt : ${soloName(target)}. ${COMPONENTS[target].analogy}`,
        {
          part: asPart(target),
          onDismiss: () => useLocate.setState({ flash: {}, locked: false }),
        },
      )
    }
  }

  return <PcRig interactive={phase === 'play' && !locked} highlights={flash} onPartClick={onPartClick} />
}

function next() {
  const s = useLocate.getState()
  useLocate.setState({ flash: {}, locked: false })
  if (s.index + 1 >= s.order.length) useLocate.setState({ finished: true })
  else useLocate.setState({ index: s.index + 1 })
}

/* ---------------- Interface ---------------- */

export function LocateUi() {
  const ex = useExercise()
  const { order, index, finished } = useLocate()
  const [result, setResult] = useState<{ stars: 0 | 1 | 2 | 3; xp: number } | null>(null)
  const ready = useReady()

  useEffect(() => {
    const list = shuffle(POOL)
    useLocate.setState({ order: list, index: 0, flash: {}, locked: false, finished: false })
    useExercise.getState().begin('reperer', list.length)
    useBuild.getState().resetBuild(ALL_INSTALLED)
    // Machine montée au départ : le curseur du haut est là pour l'ouvrir.
    useBuild.getState().set({ explode: 0, labels: false, running: true, powered: true })
  }, [])

  useEffect(() => {
    if (ready && finished && !result) setResult(useExercise.getState().finish())
  }, [ready, finished, result])

  const target = order[index]

  const hint = () => {
    if (!target) return
    useExercise.getState().hint()
    useLocate.setState({ flash: { [target]: 'target' } })
    setTimeout(() => useLocate.setState({ flash: {} }), 1800)
  }

  return (
    <>
      <ExerciseBar onHint={hint} />
      <ExerciseIntro>
        <div className="intro-tips">
          <div>
            <b>🎚️ Le curseur du haut</b> écarte les pièces si tu n'arrives pas à cliquer
          </div>
          <div>
            <b>🖱️ Clic droit</b> déplace la vue, molette pour zoomer
          </div>
        </div>
      </ExerciseIntro>

      {ex.phase === 'play' && target && (
        <>
          <ExplodeSlider />

          <div className="prompt card">
            <div className="prompt-label">Clique sur…</div>
            <div className="prompt-name" style={{ color: COMPONENTS[target].color }}>
              {soloName(target)}
            </div>
            <div className="prompt-sub">
              {index + 1} / {order.length}
            </div>
          </div>
        </>
      )}

      <Feedback />
      <ExerciseEnd result={result} />
    </>
  )
}
