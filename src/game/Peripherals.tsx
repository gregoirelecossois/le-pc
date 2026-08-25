/**
 * Chapitre 7 — Les périphériques.
 * Pour chaque périphérique : trouver la bonne prise à l'arrière,
 * puis dire s'il s'agit d'une entrée, d'une sortie, ou des deux.
 */

import { useEffect, useState } from 'react'
import { create } from 'zustand'
import { PORTS } from '@/data/ports'
import { KIND_COLOR, KIND_HELP, KIND_LABEL, PERIPHERALS, type PeripheralKind } from '@/data/peripherals'
import { ALL_INSTALLED, useBuild } from '@/state/useBuild'
import { PortMarker } from '@/three/Cables'
import { PcRig } from '@/three/PcRig'
import { ExerciseBar, ExerciseEnd, ExerciseIntro, Feedback, useReady } from './Frame'
import { useExercise } from './useExercise'
import { sfx } from '@/audio/sfx'

type Step = 'plug' | 'classify'

interface PeriState {
  index: number
  step: Step
  wrongPort: string | null
  okPort: string | null
  used: string[]
  finished: boolean
}
const usePeri = create<PeriState>()(() => ({
  index: 0,
  step: 'plug',
  wrongPort: null,
  okPort: null,
  used: [],
  finished: false,
}))

/* ---------------- Scène ---------------- */

export function PeripheralsScene() {
  const phase = useExercise((s) => s.phase)
  const { index, step, wrongPort, okPort, used } = usePeri()
  const current = PERIPHERALS[index]

  const click = (portId: string) => {
    if (!current || step !== 'plug') return
    const ex = useExercise.getState()
    if (current.accepts.includes(portId)) {
      sfx.plug()
      ex.good('Bien branché !', current.ok)
      usePeri.setState({ okPort: portId, wrongPort: null })
      setTimeout(() => usePeri.setState({ step: 'classify', okPort: null }), 1100)
    } else {
      const trap = current.traps?.[portId]
      const p = PORTS.find((x) => x.id === portId)
      ex.bad(
        trap ? 'Attention au piège !' : `Pas ici : c'est ${p?.label ?? 'une autre prise'}`,
        trap ?? `${current.hint} (${p?.hint ?? ''})`,
      )
      usePeri.setState({ wrongPort: portId })
      setTimeout(() => usePeri.setState({ wrongPort: null }), 1100)
    }
  }

  return (
    <>
      <PcRig interactive={false} />
      {phase === 'play' &&
        current &&
        step === 'plug' &&
        PORTS.map((p) => (
          <PortMarker
            key={p.id}
            position={[p.position[0] + 0.4, p.position[1], p.position[2] + 1.6]}
            radius={p.kind === 'jack' ? 0.75 : 1.0}
            state={wrongPort === p.id ? 'bad' : okPort === p.id ? 'ok' : used.includes(p.id) ? 'idle' : 'idle'}
            onClick={() => click(p.id)}
          />
        ))}
    </>
  )
}

/* ---------------- Interface ---------------- */

export function PeripheralsUi({ onView }: { onView?: (v: 'rear') => void }) {
  const ex = useExercise()
  const { index, step, finished } = usePeri()
  const [result, setResult] = useState<{ stars: 0 | 1 | 2 | 3; xp: number } | null>(null)
  const ready = useReady()

  useEffect(() => {
    usePeri.setState({ index: 0, step: 'plug', wrongPort: null, okPort: null, used: [], finished: false })
    useExercise.getState().begin('peripheriques', PERIPHERALS.length)
    useBuild.getState().resetBuild(ALL_INSTALLED)
    useBuild.getState().set({ explode: 0, labels: false, running: true, powered: true })
  }, [])

  useEffect(() => {
    if (ready && finished && !result) setResult(useExercise.getState().finish())
  }, [ready, finished, result])

  const current = PERIPHERALS[index]

  const classify = (k: PeripheralKind) => {
    if (!current) return
    const ex = useExercise.getState()
    if (k === current.kind) {
      ex.good(`${KIND_LABEL[current.kind]} — exact !`, KIND_HELP[current.kind])
    } else {
      ex.bad(
        `Non, c'est un périphérique « ${KIND_LABEL[current.kind].toLowerCase()} »`,
        `${current.role} ${KIND_HELP[current.kind]}`,
      )
    }
    setTimeout(
      () => {
        const s = usePeri.getState()
        if (s.index + 1 >= PERIPHERALS.length) usePeri.setState({ finished: true })
        else usePeri.setState({ index: s.index + 1, step: 'plug' })
      },
      k === current.kind ? 1200 : 2600,
    )
  }

  const hint = () => {
    if (!current) return
    useExercise.getState().hint()
    useExercise.getState().info(`Indice — ${current.name}`, current.hint)
  }

  return (
    <>
      <ExerciseBar onHint={hint} />
      <ExerciseIntro onStart={() => onView?.('rear')}>
        <div className="intro-tips">
          <div>
            <b>🔙 On regarde l'arrière</b> de l'unité centrale
          </div>
          <div>
            <b>👆 Clique</b> sur la prise qui convient au périphérique demandé
          </div>
          <div>
            <b>🧭 Puis</b> dis si c'est une entrée, une sortie… ou les deux
          </div>
        </div>
      </ExerciseIntro>

      {ex.phase === 'play' && current && (
        <div className="peri card">
          <div className="peri-head">
            <span className="peri-icon">{current.icon}</span>
            <div>
              <h3 className="peri-name">{current.name}</h3>
              <p className="peri-role">{current.role}</p>
            </div>
          </div>

          {step === 'plug' ? (
            <div className="peri-ask">
              <b>Où le branches-tu&nbsp;?</b>
              <span className="faint">Clique sur la bonne prise à l'arrière de la machine.</span>
            </div>
          ) : (
            <div className="peri-classify">
              <b>C'est un périphérique…</b>
              <div className="peri-kinds">
                {(['entree', 'sortie', 'entree-sortie'] as PeripheralKind[]).map((k) => (
                  <button
                    key={k}
                    className="peri-kind"
                    style={{ '--k': KIND_COLOR[k] } as React.CSSProperties}
                    onClick={() => {
                      sfx.click()
                      classify(k)
                    }}
                  >
                    <b>{KIND_LABEL[k]}</b>
                    <span>{KIND_HELP[k]}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="peri-progress">
            {PERIPHERALS.map((p, i) => (
              <span key={p.id} className={`dotstep ${i < index ? 'on' : ''} ${i === index ? 'cur' : ''}`} />
            ))}
          </div>

          <div className="tray-foot">
            <button className="btn btn-sm btn-ghost" onClick={() => onView?.('rear')}>
              Revenir à la vue arrière
            </button>
          </div>
        </div>
      )}

      <Feedback />
      <ExerciseEnd result={result} />
    </>
  )
}
