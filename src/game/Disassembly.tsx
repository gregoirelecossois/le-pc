/**
 * Chapitre 8 — Le démontage.
 * On part d'une machine complète : l'élève clique sur la pièce à retirer.
 * Une pièce ne peut sortir que si rien ne repose dessus.
 */

import { useEffect, useState } from 'react'
import { create } from 'zustand'
import { COMPONENTS, INSTALLABLE_IDS, soloShortName, type ComponentId } from '@/data/components'
import { ALL_INSTALLED, useBuild } from '@/state/useBuild'
import { PcRig, type HighlightKind } from '@/three/PcRig'
import { asPart } from '@/three/models'
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

/**
 * Tente de retirer une pièce.
 *
 * Appelé par le clic dans la 3D, mais aussi par la liste des pièces restantes :
 * une pile CMOS ou un processeur enfoui reste ainsi accessible même quand la
 * vue ne se prête pas au clic.
 */
export function removePart(id: ComponentId) {
  if (id === 'case') return
  const b = useBuild.getState()
  const ex = useExercise.getState()
  if (!b.installed.includes(id)) return
  const stuck = blockers(id, b.installed)

  if (stuck.length) {
    const names = stuck.map((s) => soloShortName(s)).join(', ')
    useDis.setState({ flash: Object.fromEntries(stuck.map((s) => [s, 'bad'])) })
    ex.bad(
      `${soloShortName(id)} est encore bloqué`,
      `Il faut d'abord enlever : ${names}. On démonte toujours en commençant par ce qui est posé par-dessus.`,
      { part: asPart(id), onDismiss: () => useDis.setState({ flash: {} }) },
    )
    return
  }

  sfx.pick()
  ex.good(`${soloShortName(id)} retiré`, COMPONENTS[id].handling, { part: asPart(id) })
  b.uninstall(id)
  if (id === 'psu' || id === 'motherboard') b.set({ powered: false, running: false })

  const left = useBuild.getState().installed.filter((x) => x !== 'case')
  if (left.length === 0) useDis.setState({ finished: true })
}

/* ---------------- Scène ---------------- */

export function DisassemblyScene() {
  const phase = useExercise((s) => s.phase)
  const flash = useDis((s) => s.flash)

  return (
    <PcRig
      interactive={phase === 'play'}
      casePickable={false}
      highlights={flash}
      onPartClick={removePart}
    />
  )
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
    useExercise
      .getState()
      .info(`Tu peux retirer : ${soloShortName(next)}`, COMPONENTS[next].handling, { part: asPart(next) })
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
                    <button
                      key={id}
                      type="button"
                      className={`chip chip-btn ${free ? 'got' : ''}`}
                      style={{ '--c': free ? COMPONENTS[id].color : '#555' } as React.CSSProperties}
                      title={free ? 'Cliquer pour la retirer' : 'Bloquée par une autre pièce'}
                      onClick={() => removePart(id)}
                    >
                      <span className="chip-dot" />
                      {soloShortName(id)}
                    </button>
                  )
                })}
            </div>
          </div>

          <div className="hintbar">
            <span>🧰</span> Retire les pièces dans l'ordre inverse du montage — clique dans la machine,
            ou sur son nom dans la liste
          </div>
        </>
      )}

      <Feedback />
      <ExerciseEnd result={result} />
    </>
  )
}
