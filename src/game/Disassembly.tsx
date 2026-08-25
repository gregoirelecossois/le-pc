/**
 * Chapitre 8 — Le démontage.
 * On part d'une machine complète : l'élève clique sur la pièce à retirer.
 * Une pièce ne peut sortir que si rien ne repose dessus.
 */

import { useEffect, useState } from 'react'
import { create } from 'zustand'
import { COMPONENTS, INSTALLABLE_IDS, type ComponentId } from '@/data/components'
import { ALL_INSTALLED, useBuild } from '@/state/useBuild'
import { PcRig, type HighlightKind } from '@/three/PcRig'
import { ExerciseBar, ExerciseEnd, ExerciseIntro, Feedback, useReady } from './Frame'
import { useExercise } from './useExercise'
import { sfx } from '@/audio/sfx'

interface DisState {
  flash: Partial<Record<ComponentId, HighlightKind>>
  finished: boolean
}
const useDis = create<DisState>()(() => ({ flash: {}, finished: false }))

/** Ce qui empêche de retirer `id` : les pièces posées dessus, encore présentes. */
export function blockers(id: ComponentId, installed: ComponentId[]): ComponentId[] {
  return installed.filter((other) => COMPONENTS[other].requires.includes(id))
}

/* ---------------- Scène ---------------- */

export function DisassemblyScene() {
  const phase = useExercise((s) => s.phase)
  const flash = useDis((s) => s.flash)

  const onPartClick = (id: ComponentId) => {
    if (id === 'case') return
    const b = useBuild.getState()
    const ex = useExercise.getState()
    const stuck = blockers(id, b.installed)

    if (stuck.length) {
      const names = stuck.map((s) => COMPONENTS[s].shortName).join(', ')
      ex.bad(
        `On ne peut pas retirer ${COMPONENTS[id].shortName} maintenant`,
        `Il faut d'abord enlever : ${names}. On démonte toujours en commençant par ce qui est posé par-dessus.`,
      )
      useDis.setState({ flash: Object.fromEntries(stuck.map((s) => [s, 'bad'])) })
      setTimeout(() => useDis.setState({ flash: {} }), 1500)
      return
    }

    sfx.pick()
    ex.good(`${COMPONENTS[id].shortName} retiré`, COMPONENTS[id].handling)
    b.uninstall(id)
    if (id === 'psu' || id === 'motherboard') b.set({ powered: false, running: false })

    const left = useBuild.getState().installed.filter((x) => x !== 'case')
    if (left.length === 0) useDis.setState({ finished: true })
  }

  return <PcRig interactive={phase === 'play'} highlights={flash} onPartClick={onPartClick} />
}

/* ---------------- Interface ---------------- */

export function DisassemblyUi({ onView }: { onView?: (v: 'inside' | 'overview') => void }) {
  const ex = useExercise()
  const installed = useBuild((s) => s.installed)
  const explode = useBuild((s) => s.explode)
  const setBuild = useBuild((s) => s.set)
  const finished = useDis((s) => s.finished)
  const [result, setResult] = useState<{ stars: 0 | 1 | 2 | 3; xp: number } | null>(null)
  const ready = useReady()

  useEffect(() => {
    useDis.setState({ flash: {}, finished: false })
    useExercise.getState().begin('demontage', INSTALLABLE_IDS.length)
    useBuild.getState().resetBuild(ALL_INSTALLED)
    useBuild.getState().set({ explode: 0, labels: false, running: true, powered: true })
  }, [])

  useEffect(() => {
    const left = installed.filter((x) => x !== 'case').length
    useExercise.setState({ done: INSTALLABLE_IDS.length - left })
  }, [installed])

  useEffect(() => {
    if (ready && finished && !result) setResult(useExercise.getState().finish())
  }, [ready, finished, result])

  const removable = installed.filter((id) => id !== 'case' && blockers(id, installed).length === 0)

  const hint = () => {
    const next = removable[0]
    if (!next) return
    useExercise.getState().hint()
    useExercise.getState().info(`Tu peux retirer : ${COMPONENTS[next].shortName}`, COMPONENTS[next].handling)
    useDis.setState({ flash: { [next]: 'target' } })
    setTimeout(() => useDis.setState({ flash: {} }), 1800)
  }

  return (
    <>
      <ExerciseBar onHint={hint} />
      <ExerciseIntro onStart={() => onView?.('inside')}>
        <div className="intro-tips">
          <div>
            <b>👆 Clique</b> sur la pièce que tu veux retirer
          </div>
          <div>
            <b>⚠️ Règle d'or</b> on ne retire jamais une pièce qui en supporte une autre
          </div>
          <div>
            <b>🔌 Dans la vraie vie</b> on débranche la prise murale AVANT d'ouvrir
          </div>
        </div>
      </ExerciseIntro>

      {ex.phase === 'play' && (
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
            <div className="tools-sep" />
            <div className="tools-legend">
              Reste : <b>{installed.filter((x) => x !== 'case').length}</b> pièce(s)
            </div>
            <div className="chiplist">
              {installed
                .filter((x) => x !== 'case')
                .map((id) => {
                  const free = blockers(id, installed).length === 0
                  return (
                    <span
                      key={id}
                      className={`chip ${free ? 'got' : ''}`}
                      style={{ '--c': free ? COMPONENTS[id].color : '#555' } as React.CSSProperties}
                      title={free ? 'Peut être retirée' : 'Bloquée par une autre pièce'}
                    >
                      <span className="chip-dot" />
                      {COMPONENTS[id].shortName}
                    </span>
                  )
                })}
            </div>
          </div>

          <div className="hintbar">
            <span>🧰</span> Retire les pièces dans l'ordre inverse du montage
          </div>
        </>
      )}

      <Feedback />
      <ExerciseEnd result={result} />
    </>
  )
}
