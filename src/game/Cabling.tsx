/**
 * Chapitre 6 — Le câblage, guidé pas à pas.
 *
 * À ce stade, les connecteurs d'une vraie machine sont trop discrets pour
 * qu'on puisse demander à un élève de les retrouver seul. L'exercice montre
 * donc TOUT : ce qu'on branche, pourquoi, d'où part le câble et où il
 * arrive. L'élève clique successivement sur les DEUX extrémités.
 *
 *   Étape 1 — le repère jaune : d'où part le câble
 *   Étape 2 — le repère cyan  : où il arrive (le trajet s'affiche en fantôme)
 *
 * Se tromper de repère ne compte pas comme une faute : on ré-explique.
 */

import { useEffect, useState } from 'react'
import { create } from 'zustand'
import { CABLES, CABLE_BY_ID, CONNECTORS, type ConnectorId } from '@/data/cables'
import { ALL_INSTALLED, useBuild } from '@/state/useBuild'
import { Cable3D, ConnectorMarker, PortMarker } from '@/three/Cables'
import { PcRig } from '@/three/PcRig'
import type { CameraViewId } from '@/three/layout'
import { ExerciseBar, ExerciseEnd, ExerciseIntro, useReady } from './Frame'
import { useExercise } from './useExercise'
import { SpeakButton } from '@/ui/speak'
import { sfx } from '@/audio/sfx'

/** Où en est-on dans le branchement du câble courant ? */
type Half = 'from' | 'to'

interface CablingState {
  index: number
  half: Half
  plugged: string[]
  just: string | null
  finished: boolean
}
const useCabling = create<CablingState>()(() => ({
  index: 0,
  half: 'from',
  plugged: [],
  just: null,
  finished: false,
}))

if (import.meta.env.DEV) {
  ;(window as unknown as Record<string, unknown>).__cabling = useCabling
}

const ORDER = [...CABLES].sort((a, b) => a.order - b.order)

/* ---------------- Scène ---------------- */

export function CablingScene() {
  const phase = useExercise((s) => s.phase)
  const { index, half, plugged, just } = useCabling()
  const current = ORDER[index]
  const playing = phase === 'play' && !!current

  /**
   * Étape 1 : l'élève a trouvé le départ du câble.
   * Pas de fenêtre à fermer ici — le panneau passe simplement à l'étape 2,
   * et le trajet du câble s'affiche en fantôme.
   */
  const clickFrom = () => {
    if (!current) return
    sfx.pick()
    useCabling.setState({ half: 'to' })
  }

  /** Étape 2 : il a trouvé l'arrivée. */
  const clickTo = (id: ConnectorId) => {
    if (!current) return
    const ex = useExercise.getState()
    if (id !== current.to) {
      // Guidage complet : on ne compte pas d'erreur, on remontre.
      ex.info(
        `Pas celui-ci : ${CONNECTORS[id].label}`,
        `${current.wrongHint} Cherche le repère qui clignote en bleu.`,
      )
      return
    }
    sfx.plug()
    useBuild.getState().addCable(current.id)
    useCabling.setState((s) => ({ plugged: [...s.plugged, current.id], just: current.id }))
    ex.good(`${current.name} branché !`, `${current.carries} ${current.recognise}`, {
      onDismiss: () => {
        const s = useCabling.getState()
        if (s.index + 1 >= ORDER.length) useCabling.setState({ finished: true, just: null })
        else useCabling.setState({ index: s.index + 1, half: 'from', just: null })
      },
    })
  }

  // Les connecteurs déjà utilisés ne sont plus proposés.
  const used = new Set(plugged.map((id) => CABLE_BY_ID[id].to))

  return (
    <>
      <PcRig interactive={false} />
      {plugged.map((id) => (
        <Cable3D key={id} cable={CABLE_BY_ID[id]} animate={id === just} />
      ))}

      {playing && (
        <>
          {/* Le trajet complet, en fantôme, dès que le départ est trouvé */}
          {half === 'to' && <Cable3D cable={current} preview />}

          {/* Départ du câble */}
          <PortMarker
            position={current.from}
            radius={1.7}
            state={half === 'from' ? 'active' : 'ok'}
            label={half === 'from' ? current.fromLabel : undefined}
            onClick={half === 'from' ? clickFrom : undefined}
          />

          {/* Arrivée : le bon connecteur clignote, les autres restent visibles
              mais éteints — on apprend aussi à les distinguer. */}
          {half === 'to' &&
            (Object.keys(CONNECTORS) as ConnectorId[])
              .filter((id) => !used.has(id))
              .map((id) => (
                <ConnectorMarker
                  key={id}
                  id={id}
                  state={id === current.to ? 'idle' : 'dim'}
                  label={id === current.to ? CONNECTORS[id].label : undefined}
                  onClick={clickTo}
                />
              ))}
        </>
      )}
    </>
  )
}

/* ---------------- Interface ---------------- */

export function CablingUi({ onView }: { onView?: (v: CameraViewId) => void }) {
  const ex = useExercise()
  const { index, half, plugged, finished } = useCabling()
  const [result, setResult] = useState<{ stars: 0 | 1 | 2 | 3; xp: number } | null>(null)
  const ready = useReady()
  const current = ORDER[index]

  useEffect(() => {
    useCabling.setState({ index: 0, half: 'from', plugged: [], just: null, finished: false })
    useExercise.getState().begin('cablage', ORDER.length)
    useBuild.getState().resetBuild(ALL_INSTALLED)
    useBuild.getState().set({ explode: 0, labels: false, running: false, powered: false })
  }, [])

  // Chaque câble se joue dans le cadrage où on le voit le mieux.
  useEffect(() => {
    if (ex.phase !== 'play' || !current) return
    onView?.(current.view)
  }, [ex.phase, current, onView])

  useEffect(() => {
    if (!ready || !finished || result) return
    // On laisse le PC allumé (ventilateurs qui tournent) et la vue pivoter
    // doucement quelques secondes avant l'écran de réussite.
    // On recule et on plonge d'abord : le cadrage du câblage colle au flanc ouvert,
    // la machine s'y serait mise à tourner à moitié hors du cadre.
    onView?.('celebration')
    useBuild.getState().set({ running: true, powered: true, celebrate: true })
    sfx.boot()
    const t = setTimeout(() => {
      useBuild.getState().set({ celebrate: false })
      setResult(useExercise.getState().finish())
    }, 4600)
    return () => clearTimeout(t)
  }, [ready, finished, result, onView])

  const hint = () => {
    if (!current) return
    useExercise.getState().hint()
    useExercise
      .getState()
      .info(
        half === 'from' ? `Départ : ${current.fromLabel}` : `Arrivée : ${CONNECTORS[current.to].label}`,
        half === 'from' ? current.fromHint : current.toHint,
      )
  }

  return (
    <>
      <ExerciseBar onHint={hint} />
      <ExerciseIntro onStart={() => onView?.(ORDER[0].view)}>
        <div className="intro-tips">
          <div>
            <b>🧭 Tout est montré</b> on t'explique chaque câble avant de le brancher
          </div>
          <div>
            <b>1️⃣ Clique</b> sur le repère JAUNE : c'est d'où part le câble
          </div>
          <div>
            <b>2️⃣ Puis clique</b> sur le repère BLEU qui clignote : c'est là qu'il arrive
          </div>
        </div>
      </ExerciseIntro>

      {ex.phase === 'play' && current && (
        <div className="cablepanel card">
          <div className="cablepanel-head">
            <span className="pill" style={{ borderColor: 'var(--warn)', color: 'var(--warn)' }}>
              Câble {index + 1} / {ORDER.length}
            </span>
            <SpeakButton
              className="speakbtn-head"
              text={[
                current.name,
                current.what,
                `Ce qu'il transporte : ${current.carries}`,
                `1. ${current.fromLabel}. ${current.fromHint}`,
                `2. ${CONNECTORS[current.to].label}. ${current.toHint}`,
              ]}
            />
          </div>
          <h3 className="cablepanel-name">{current.name}</h3>
          <p className="cablepanel-role">{current.what}</p>

          <div className="cablepanel-from">
            <span>Ce qu'il transporte</span>
            <b style={{ fontSize: 12.5, fontWeight: 600, lineHeight: 1.45 }}>{current.carries}</b>
          </div>

          <ol className="cablesteps">
            <li className={half === 'from' ? 'cur' : 'ok'}>
              <span className="cablesteps-n">1</span>
              <span>
                <b>{current.fromLabel}</b>
                {current.fromHint}
              </span>
            </li>
            <li className={half === 'to' ? 'cur' : ''}>
              <span className="cablesteps-n">2</span>
              <span>
                <b>{CONNECTORS[current.to].label}</b>
                {current.toHint}
              </span>
            </li>
          </ol>

          <div className="cablepanel-done">
            {ORDER.map((c) => (
              <span key={c.id} className={`dotstep ${plugged.includes(c.id) ? 'on' : ''}`} title={c.name} />
            ))}
          </div>

          <div className="tray-foot">
            <button className="btn btn-sm btn-ghost" onClick={() => onView?.(current.view)}>
              Recadrer
            </button>
            <button className="btn btn-sm btn-ghost" onClick={() => onView?.('bottom')}>
              Vue basse
            </button>
          </div>
        </div>
      )}
      <ExerciseEnd result={result} />
    </>
  )
}
