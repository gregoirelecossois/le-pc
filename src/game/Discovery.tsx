/**
 * Chapitre 1 — La visite guidée.
 * L'élève écarte la vue éclatée et clique sur chaque composant
 * pour ouvrir sa fiche. Objectif : les découvrir tous les 13.
 */

import { useEffect, useState } from 'react'
import { create } from 'zustand'
import { COMPONENTS, COMPONENT_IDS, type ComponentId } from '@/data/components'
import { useGame } from '@/state/useGame'
import { ALL_INSTALLED, useBuild } from '@/state/useBuild'
import { PcRig } from '@/three/PcRig'
import type { CameraViewId } from '@/three/layout'
import { InfoCard } from '@/ui/InfoCard'
import { Btn } from '@/ui/bits'
import { ExerciseBar, ExerciseEnd, ExerciseIntro, Feedback } from './Frame'
import { useExercise } from './useExercise'
import { sfx } from '@/audio/sfx'

/**
 * Les fiches trouvées PENDANT CETTE PARTIE.
 * On ne se base pas sur `discovered` du profil : sinon, rejouer le chapitre
 * serait terminé d'avance.
 */
const useFound = create<{ found: ComponentId[] }>()(() => ({ found: [] }))

function markFound(id: ComponentId) {
  useGame.getState().discover(id)
  const { found } = useFound.getState()
  if (!found.includes(id)) {
    useFound.setState({ found: [...found, id] })
    useExercise.setState({ done: found.length + 1 })
    return true
  }
  return false
}

/* ---------------- Scène 3D ---------------- */

export function DiscoveryScene() {
  const phase = useExercise((s) => s.phase)
  const setBuild = useBuild((s) => s.set)

  const onPartClick = (id: ComponentId) => {
    sfx.pick()
    setBuild({ selected: id })
    if (markFound(id)) sfx.good()
  }

  return <PcRig interactive={phase === 'play'} onPartClick={onPartClick} />
}

/* ---------------- Interface ---------------- */

const VIEWS: { id: CameraViewId; label: string }[] = [
  { id: 'overview', label: "Vue d'ensemble" },
  { id: 'inside', label: "L'intérieur" },
  { id: 'cpuZone', label: 'Zone processeur' },
  { id: 'bottom', label: 'Bas du boîtier' },
  { id: 'rear', label: 'Arrière' },
]

export function DiscoveryUi({ onView }: { onView: (v: CameraViewId) => void }) {
  const ex = useExercise()
  const explode = useBuild((s) => s.explode)
  const selected = useBuild((s) => s.selected)
  const labels = useBuild((s) => s.labels)
  const setBuild = useBuild((s) => s.set)
  const found = useFound((s) => s.found)
  const [result, setResult] = useState<{ stars: 0 | 1 | 2 | 3; xp: number } | null>(null)

  // Mise en place de la maquette
  useEffect(() => {
    useFound.setState({ found: [] })
    useExercise.getState().begin('decouverte', COMPONENT_IDS.length)
    useBuild.getState().resetBuild(ALL_INSTALLED)
    useBuild.getState().set({ explode: 0.4, labels: true, running: true, powered: true })
  }, [])

  // Fin automatique quand tout est découvert
  useEffect(() => {
    if (ex.phase === 'play' && found.length >= COMPONENT_IDS.length && !result) {
      setResult(useExercise.getState().finish())
    }
  }, [found.length, ex.phase, result])

  const remaining = COMPONENT_IDS.filter((id) => !found.includes(id))

  return (
    <>
      <ExerciseBar showTimer={false} />

      <ExerciseIntro onStart={() => onView('overview')}>
        <div className="intro-tips">
          <div>
            <b>🖱️ Clic gauche</b> pivoter autour de la machine
          </div>
          <div>
            <b>🎚️ Le curseur</b> écarte les pièces pour voir dedans
          </div>
          <div>
            <b>👆 Clique</b> sur une pièce pour lire sa fiche
          </div>
        </div>
      </ExerciseIntro>

      {ex.phase === 'play' && (
        <>
          {/* Panneau de gauche : outils de vue + liste des composants */}
          <div className="tools card">
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

            <div className="tools-views">
              {VIEWS.map((v) => (
                <button key={v.id} className="btn btn-sm btn-ghost" onClick={() => onView(v.id)}>
                  {v.label}
                </button>
              ))}
            </div>

            <label className="tools-check">
              <input type="checkbox" checked={labels} onChange={(e) => setBuild({ labels: e.target.checked })} />
              <span>Afficher les étiquettes</span>
            </label>

            <div className="tools-sep" />

            <div className="tools-legend">
              À découvrir&nbsp;: <b>{remaining.length}</b>
            </div>
            <div className="chiplist scroll">
              {COMPONENT_IDS.map((id) => {
                const c = COMPONENTS[id]
                const got = found.includes(id)
                return (
                  <button
                    key={id}
                    className={`chip ${got ? 'got' : ''} ${selected === id ? 'sel' : ''}`}
                    style={{ '--c': c.color } as React.CSSProperties}
                    onClick={() => {
                      sfx.click()
                      setBuild({ selected: id, explode: Math.max(explode, 0.4) })
                      markFound(id)
                    }}
                  >
                    <span className="chip-dot" />
                    {got ? c.shortName : '???'}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Fiche du composant sélectionné */}
          {selected && (
            <InfoCard
              id={selected}
              onClose={() => setBuild({ selected: null })}
              onNext={
                remaining.length
                  ? () => {
                      const next = remaining[0]
                      setBuild({ selected: next, explode: Math.max(explode, 0.4) })
                      markFound(next)
                      sfx.good()
                    }
                  : undefined
              }
            />
          )}

          {!selected && (
            <div className="hintbar">
              <span>👆</span> Clique sur une pièce de la machine — ou sur un nom dans la liste
              {remaining.length > 0 && (
                <Btn
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setBuild({ selected: remaining[0], explode: Math.max(explode, 0.4) })
                    markFound(remaining[0])
                  }}
                >
                  Montre-m'en une
                </Btn>
              )}
            </div>
          )}
        </>
      )}

      <Feedback />
      <ExerciseEnd result={result} />
    </>
  )
}
