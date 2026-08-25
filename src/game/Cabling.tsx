/**
 * Chapitre 6 — Le câblage.
 * L'élève choisit un câble, puis clique sur le connecteur qui lui correspond.
 */

import { useEffect, useState } from 'react'
import { create } from 'zustand'
import { CABLES, CABLE_BY_ID, CONNECTORS, type ConnectorId } from '@/data/cables'
import { ALL_INSTALLED, useBuild } from '@/state/useBuild'
import { Cable3D, ConnectorMarker } from '@/three/Cables'
import { PcRig } from '@/three/PcRig'
import { ExerciseBar, ExerciseEnd, ExerciseIntro, Feedback, useReady } from './Frame'
import { useExercise } from './useExercise'
import { sfx } from '@/audio/sfx'

interface CablingState {
  index: number
  plugged: string[]
  wrong: ConnectorId | null
  just: string | null
  finished: boolean
}
const useCabling = create<CablingState>()(() => ({
  index: 0,
  plugged: [],
  wrong: null,
  just: null,
  finished: false,
}))

const ORDER = [...CABLES].sort((a, b) => a.order - b.order)

/* ---------------- Scène ---------------- */

export function CablingScene() {
  const phase = useExercise((s) => s.phase)
  const { index, plugged, wrong, just } = useCabling()
  const current = ORDER[index]

  const click = (id: ConnectorId) => {
    if (!current) return
    const ex = useExercise.getState()
    if (id === current.to) {
      sfx.plug()
      ex.good(`${current.name} branché !`, current.recognise)
      useCabling.setState((s) => ({
        plugged: [...s.plugged, current.id],
        just: current.id,
        wrong: null,
      }))
      setTimeout(() => {
        const s = useCabling.getState()
        if (s.index + 1 >= ORDER.length) useCabling.setState({ finished: true, just: null })
        else useCabling.setState({ index: s.index + 1, just: null })
      }, 1200)
    } else {
      ex.bad(`Ce n'est pas là`, `${current.wrongHint} (tu as visé : ${CONNECTORS[id].label}.)`)
      useCabling.setState({ wrong: id })
      setTimeout(() => useCabling.setState({ wrong: null }), 1100)
    }
  }

  // On ne propose que les connecteurs encore libres, plus celui qui vient d'être fait
  const used = new Set(plugged.map((id) => CABLE_BY_ID[id].to))

  return (
    <>
      <PcRig interactive={false} />
      {plugged.map((id) => (
        <Cable3D key={id} cable={CABLE_BY_ID[id]} animate={id === just} />
      ))}
      {phase === 'play' &&
        current &&
        (Object.keys(CONNECTORS) as ConnectorId[])
          .filter((id) => !used.has(id))
          .map((id) => (
            <ConnectorMarker
              key={id}
              id={id}
              state={wrong === id ? 'bad' : 'idle'}
              onClick={click}
            />
          ))}
    </>
  )
}

/* ---------------- Interface ---------------- */

export function CablingUi({ onView }: { onView?: (v: 'inside' | 'overview' | 'bottom') => void }) {
  const ex = useExercise()
  const { index, plugged, finished } = useCabling()
  const [result, setResult] = useState<{ stars: 0 | 1 | 2 | 3; xp: number } | null>(null)
  const ready = useReady()

  useEffect(() => {
    useCabling.setState({ index: 0, plugged: [], wrong: null, just: null, finished: false })
    useExercise.getState().begin('cablage', ORDER.length)
    useBuild.getState().resetBuild(ALL_INSTALLED)
    useBuild.getState().set({ explode: 0, labels: false, running: false, powered: false })
  }, [])

  useEffect(() => {
    if (!ready || !finished || result) return
    useBuild.getState().set({ running: true, powered: true })
    sfx.boot()
    const t = setTimeout(() => setResult(useExercise.getState().finish()), 1400)
    return () => clearTimeout(t)
  }, [ready, finished, result])

  const current = ORDER[index]

  const hint = () => {
    if (!current) return
    useExercise.getState().hint()
    useExercise.getState().info(`Où va « ${current.name} » ?`, CONNECTORS[current.to].label)
  }

  return (
    <>
      <ExerciseBar onHint={hint} />
      <ExerciseIntro onStart={() => onView?.('inside')}>
        <div className="intro-tips">
          <div>
            <b>🔵 Les bulles bleues</b> sont les connecteurs disponibles
          </div>
          <div>
            <b>👆 Clique</b> sur celui qui correspond au câble demandé
          </div>
          <div>
            <b>🔎 Tourne la machine</b> pour voir les connecteurs cachés
          </div>
        </div>
      </ExerciseIntro>

      {ex.phase === 'play' && current && (
        <>
          <div className="cablepanel card">
            <div className="cablepanel-head">
              <span className="pill" style={{ borderColor: 'var(--warn)', color: 'var(--warn)' }}>
                Câble {index + 1} / {ORDER.length}
              </span>
            </div>
            <h3 className="cablepanel-name">{current.name}</h3>
            <p className="cablepanel-role">{current.carries}</p>
            <div className="cablepanel-from">
              <span>Part de</span>
              <b>{current.fromLabel}</b>
            </div>
            <div className="cablepanel-ask">Sur quel connecteur va-t-il&nbsp;?</div>

            <div className="cablepanel-done">
              {ORDER.map((c) => (
                <span key={c.id} className={`dotstep ${plugged.includes(c.id) ? 'on' : ''}`} title={c.name} />
              ))}
            </div>

            <div className="tray-foot">
              <button className="btn btn-sm btn-ghost" onClick={() => onView?.('inside')}>
                Vue intérieure
              </button>
              <button className="btn btn-sm btn-ghost" onClick={() => onView?.('bottom')}>
                Vue basse
              </button>
            </div>
          </div>
        </>
      )}

      <Feedback />
      <ExerciseEnd result={result} />
    </>
  )
}
