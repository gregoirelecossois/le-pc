/**
 * Chapitre 3 — Trouve-le dans la tour.
 * On donne un nom, l'élève clique sur la bonne pièce dans la vue éclatée.
 */

import { useEffect, useState } from 'react'
import { create } from 'zustand'
import { COMPONENTS, type ComponentId } from '@/data/components'
import { ALL_INSTALLED, useBuild } from '@/state/useBuild'
import { PcRig, type HighlightKind } from '@/three/PcRig'
import { ExerciseBar, ExerciseEnd, ExerciseIntro, Feedback, useReady } from './Frame'
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
  'hdd',
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
    if (id === target) {
      sfx.snap()
      ex.good('Trouvé !', COMPONENTS[target].role)
      useLocate.setState({ flash: { [target]: 'ok' }, locked: true })
      setTimeout(next, 1400)
    } else {
      ex.bad(
        `Non, ça c'est ${COMPONENTS[id].name.toLowerCase()}`,
        `Cherche plutôt : ${COMPONENTS[target].name}. ${COMPONENTS[target].analogy}`,
      )
      useLocate.setState({ flash: { [id]: 'bad' }, locked: true })
      setTimeout(() => useLocate.setState({ flash: {}, locked: false }), 1300)
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
  const explode = useBuild((s) => s.explode)
  const setBuild = useBuild((s) => s.set)
  const [result, setResult] = useState<{ stars: 0 | 1 | 2 | 3; xp: number } | null>(null)
  const ready = useReady()

  useEffect(() => {
    const list = shuffle(POOL)
    useLocate.setState({ order: list, index: 0, flash: {}, locked: false, finished: false })
    useExercise.getState().begin('reperer', list.length)
    useBuild.getState().resetBuild(ALL_INSTALLED)
    useBuild.getState().set({ explode: 0.62, labels: false, running: true, powered: true })
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
            <b>🎚️ Le curseur</b> écarte les pièces si tu n'arrives pas à cliquer
          </div>
          <div>
            <b>🖱️ Clic droit</b> déplace la vue, molette pour zoomer
          </div>
        </div>
      </ExerciseIntro>

      {ex.phase === 'play' && target && (
        <>
          <div className="tools card tools-thin">
            <label className="tools-row">
              <span>Vue éclatée</span>
              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={explode}
                onChange={(e) => setBuild({ explode: +e.target.value })}
              />
            </label>
          </div>

          <div className="prompt card">
            <div className="prompt-label">Clique sur…</div>
            <div className="prompt-name" style={{ color: COMPONENTS[target].color }}>
              {COMPONENTS[target].name}
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
