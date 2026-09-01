/**
 * Chapitre 1 — La visite guidée.
 *
 * L'élève écarte la vue éclatée et clique sur les composants DANS la
 * machine pour les découvrir. La liste de gauche ne sert qu'à suivre ce
 * qu'il reste à trouver : cliquer un « ??? » ne découvre rien.
 */

import { useEffect, useState } from 'react'
import { create } from 'zustand'
import { COMPONENTS, COMPONENT_IDS, type ComponentId } from '@/data/components'
import { useGame } from '@/state/useGame'
import { ALL_INSTALLED, useBuild } from '@/state/useBuild'
import { PcRig, type HighlightKind } from '@/three/PcRig'
import { IntroCinematic, INTRO_TOTAL_MS } from '@/three/IntroCinematic'
import { asPart } from '@/three/models'
import type { CameraViewId } from '@/three/layout'
import { InfoCard } from '@/ui/InfoCard'
import { Btn } from '@/ui/bits'
import { ExerciseBar, ExerciseEnd, ExerciseIntro, ExplodeSlider } from './Frame'
import { useExercise } from './useExercise'
import { sfx } from '@/audio/sfx'

/**
 * Les fiches trouvées PENDANT CETTE PARTIE.
 * On ne se base pas sur `discovered` du profil : sinon, rejouer le chapitre
 * serait terminé d'avance.
 */
const useFound = create<{ found: ComponentId[] }>()(() => ({ found: [] }))

/** Surbrillance temporaire du coup de pouce « Montre-m'en une ». */
const useHint = create<{ flash: Partial<Record<ComponentId, HighlightKind>> }>()(() => ({ flash: {} }))

/**
 * Enregistre une découverte. Renvoie `true` si c'est la PREMIÈRE fois :
 * l'appelant présente alors la pièce en grand avant d'ouvrir sa fiche.
 */
function markFound(id: ComponentId) {
  useGame.getState().discover(id)
  const { found } = useFound.getState()
  if (found.includes(id)) return false
  useFound.setState({ found: [...found, id] })
  useExercise.setState({ done: found.length + 1 })
  return true
}

/* ---------------- Scène 3D ---------------- */

/**
 * Un clic sur une pièce de la maquette.
 *
 * Première rencontre : on montre la pièce qui tourne, avec son nom et son
 * rôle. La fiche détaillée n'arrive qu'ensuite, quand l'élève a cliqué sur
 * « J'ai compris ». Une pièce déjà connue ouvre directement sa fiche.
 */
export function discoverPart(id: ComponentId) {
  sfx.pick()
  const setBuild = useBuild.getState().set
  if (markFound(id)) {
    const c = COMPONENTS[id]
    useExercise.getState().good(c.name, c.acronym ? `On dit aussi « ${c.acronym} ». ${c.role}` : c.role, {
      part: id === 'case' ? 'case' : asPart(id),
      step: 0, // la progression est tenue par `markFound`
      onDismiss: () => setBuild({ selected: id }),
    })
  } else {
    setBuild({ selected: id })
  }
}

export function DiscoveryScene() {
  const phase = useExercise((s) => s.phase)
  const busy = useExercise((s) => s.busy)
  const found = useFound((s) => s.found)
  const flash = useHint((s) => s.flash)
  return (
    <>
      <PcRig
        interactive={phase === 'play' && !busy}
        onPartClick={discoverPart}
        highlights={flash}
        // seules les pièces déjà trouvées portent leur nom en 3D
        labelOnly={found}
      />
      {phase === 'play' && <IntroCinematic />}
    </>
  )
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
    useHint.setState({ flash: {} })
    useExercise.getState().begin('decouverte', COMPONENT_IDS.length)
    useBuild.getState().resetBuild(ALL_INSTALLED)
    // On part TOUJOURS de la machine montée : c'est ainsi qu'elle se
    // présente en vrai, et c'est à l'élève d'écarter les pièces.
    useBuild.getState().set({ explode: 0, labels: true, running: true, powered: true })
  }, [])

  // Fin automatique quand tout est découvert
  useEffect(() => {
    if (ex.phase === 'play' && found.length >= COMPONENT_IDS.length && !result) {
      setResult(useExercise.getState().finish())
    }
  }, [found.length, ex.phase, result])

  // Garde-fou : la cinématique d'intro rend la main même si l'animation cale.
  useEffect(() => {
    if (!ex.busy) return
    const t = setTimeout(() => {
      if (useExercise.getState().busy) {
        useExercise.getState().setBusy(false)
        useBuild.getState().set({ camLock: false, explode: 0 })
      }
    }, INTRO_TOTAL_MS + 900)
    return () => clearTimeout(t)
  }, [ex.busy])

  const remaining = COMPONENT_IDS.filter((id) => !found.includes(id))

  return (
    <>
      <ExerciseBar showTimer={false} />

      <ExerciseIntro
        onStart={() => {
          useExercise.getState().setBusy(true)
          onView('overview')
        }}
      >
        <div className="intro-tips">
          <div>
            <b>🖱️ Clic gauche</b> pivoter autour de la machine
          </div>
          <div>
            <b>🎚️ Le curseur du haut</b> écarte les pièces pour voir dedans
          </div>
          <div>
            <b>👆 Clique</b> sur une pièce de la machine pour la découvrir
          </div>
          <div>
            <b>🏷️ Les noms</b> n'apparaissent que sur les pièces déjà trouvées
          </div>
        </div>
      </ExerciseIntro>

      {ex.phase === 'play' && ex.busy && (
        <div className="hintbar">
          <span>🎬</span> Petit tour d'horizon de la machine…
        </div>
      )}

      {ex.phase === 'play' && !ex.busy && (
        <>
          <ExplodeSlider />

          {/* Panneau de gauche : outils de vue + liste des composants */}
          <div className="tools card">
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
            {/* Une pièce ne se découvre qu'en cliquant dessus DANS la machine.
                Les « ??? » sont donc inertes : ils indiquent ce qui reste à
                trouver, ils ne le donnent pas. Une fois trouvée, la pastille
                rouvre la fiche. */}
            <div className="chiplist scroll">
              {COMPONENT_IDS.map((id) => {
                const c = COMPONENTS[id]
                const got = found.includes(id)
                return (
                  <button
                    key={id}
                    className={`chip ${got ? 'got' : 'unknown'} ${selected === id ? 'sel' : ''}`}
                    style={{ '--c': got ? c.color : '#4a515c' } as React.CSSProperties}
                    disabled={!got}
                    title={got ? 'Revoir la fiche' : 'À trouver dans la machine'}
                    onClick={() => {
                      sfx.click()
                      setBuild({ selected: id })
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
          {selected && <InfoCard id={selected} onClose={() => setBuild({ selected: null })} />}

          {!selected && (
            <div className="hintbar">
              <span>👆</span> Clique sur une pièce de la machine pour découvrir sa fiche
              {remaining.length > 0 && (
                <Btn
                  size="sm"
                  variant="ghost"
                  // Le coup de pouce DÉSIGNE la pièce, il ne la découvre pas :
                  // c'est toujours à l'élève de cliquer dessus.
                  onClick={() => {
                    const target = remaining[0]
                    setBuild({ explode: Math.max(explode, 0.45) })
                    useHint.setState({ flash: { [target]: 'target' } })
                    setTimeout(() => useHint.setState({ flash: {} }), 2600)
                  }}
                >
                  Montre-m'en une
                </Btn>
              )}
            </div>
          )}
        </>
      )}
      <ExerciseEnd result={result} />
    </>
  )
}
