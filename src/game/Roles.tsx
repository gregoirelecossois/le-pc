/**
 * Chapitre 4 — À quoi ça sert ?
 * L'élève relie chaque composant à la phrase qui décrit son rôle.
 */

import { useEffect, useMemo, useState } from 'react'
import { COMPONENTS, type ComponentId } from '@/data/components'
import { ALL_INSTALLED, useBuild } from '@/state/useBuild'
import { PcRig } from '@/three/PcRig'
import { ExerciseBar, ExerciseEnd, ExerciseIntro, Feedback, useReady } from './Frame'
import { useExercise } from './useExercise'
import { sfx } from '@/audio/sfx'

/** Rôles reformulés en une phrase courte, pensée pour être reliée. */
const PAIRS: { id: ComponentId; role: string }[] = [
  { id: 'cpu', role: "Il exécute les calculs : c'est le cerveau de la machine." },
  { id: 'ram1', role: "Elle garde sous la main ce qui sert MAINTENANT, et s'efface à l'extinction." },
  { id: 'ssd', role: 'Il conserve les fichiers même éteint, et démarre le système très vite.' },
  { id: 'hdd', role: 'Il stocke beaucoup de données pour pas cher, avec des plateaux qui tournent.' },
  { id: 'motherboard', role: 'Elle relie tous les composants entre eux et leur distribue le courant.' },
  { id: 'psu', role: 'Il transforme le 230 V de la prise murale en courants utilisables.' },
  { id: 'gpu', role: "Elle calcule les images affichées à l'écran." },
  { id: 'cooler', role: 'Il évacue la chaleur du processeur pour éviter la surchauffe.' },
  { id: 'fanFront', role: "Il fait entrer de l'air frais dans le boîtier." },
  { id: 'cmos', role: "Elle garde l'heure et les réglages quand le PC est débranché." },
]

function shuffle<T>(a: T[]): T[] {
  const r = [...a]
  for (let i = r.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[r[i], r[j]] = [r[j], r[i]]
  }
  return r
}

/* ---------------- Scène : la machine tourne en fond ---------------- */

export function RolesScene() {
  return <PcRig interactive={false} />
}

/* ---------------- Interface ---------------- */

export function RolesUi() {
  const ex = useExercise()
  const [names, setNames] = useState<ComponentId[]>([])
  const [roles, setRoles] = useState<{ id: ComponentId; role: string }[]>([])
  const [pickedName, setPickedName] = useState<ComponentId | null>(null)
  const [pickedRole, setPickedRole] = useState<ComponentId | null>(null)
  const [solved, setSolved] = useState<ComponentId[]>([])
  const [wrongPair, setWrongPair] = useState<ComponentId | null>(null)
  const [result, setResult] = useState<{ stars: 0 | 1 | 2 | 3; xp: number } | null>(null)
  const ready = useReady()

  useEffect(() => {
    setNames(shuffle(PAIRS.map((p) => p.id)))
    setRoles(shuffle(PAIRS))
    useExercise.getState().begin('roles', PAIRS.length)
    useBuild.getState().resetBuild(ALL_INSTALLED)
    useBuild.getState().set({ explode: 0.28, labels: false, running: true, powered: true })
  }, [])

  // Une paire est complète : on vérifie
  useEffect(() => {
    if (!pickedName || !pickedRole) return
    const ok = pickedName === pickedRole
    const c = COMPONENTS[pickedName]
    if (ok) {
      sfx.snap()
      setSolved((s) => [...s, pickedName])
      useExercise.getState().good('Bien relié !', c.analogy)
    } else {
      setWrongPair(pickedRole)
      useExercise
        .getState()
        .bad(
          'Ce rôle ne correspond pas',
          `${c.name} : ${c.role}`,
        )
      setTimeout(() => setWrongPair(null), 900)
    }
    setPickedName(null)
    setPickedRole(null)
  }, [pickedName, pickedRole])

  useEffect(() => {
    if (ready && solved.length === PAIRS.length && !result && ex.phase === 'play') {
      setResult(useExercise.getState().finish())
    }
  }, [ready, solved.length, result, ex.phase])

  const remaining = useMemo(() => PAIRS.filter((p) => !solved.includes(p.id)), [solved])

  const hint = () => {
    const p = remaining[0]
    if (!p) return
    useExercise.getState().hint()
    useExercise.getState().info(`Indice — ${COMPONENTS[p.id].shortName}`, COMPONENTS[p.id].analogy)
    setPickedName(p.id)
  }

  return (
    <>
      <ExerciseBar onHint={hint} />
      <ExerciseIntro>
        <div className="intro-tips">
          <div>
            <b>👆 Clique</b> sur un composant à gauche…
          </div>
          <div>
            <b>👉 puis</b> sur le rôle qui lui correspond à droite
          </div>
        </div>
      </ExerciseIntro>

      {ex.phase === 'play' && (
        <div className="match">
          <div className="match-col">
            <h3 className="match-h">Les composants</h3>
            {names.map((id) => {
              const c = COMPONENTS[id]
              const done = solved.includes(id)
              return (
                <button
                  key={id}
                  className={`match-item name ${done ? 'done' : ''} ${pickedName === id ? 'picked' : ''}`}
                  style={{ '--c': c.color } as React.CSSProperties}
                  disabled={done}
                  onClick={() => {
                    sfx.click()
                    setPickedName(id)
                  }}
                >
                  <span className="match-dot" />
                  {c.shortName}
                  {c.acronym && <em>{c.acronym}</em>}
                </button>
              )
            })}
          </div>

          <div className="match-col wide">
            <h3 className="match-h">Leur rôle</h3>
            {roles.map((p) => {
              const done = solved.includes(p.id)
              return (
                <button
                  key={p.id}
                  className={`match-item role ${done ? 'done' : ''} ${pickedRole === p.id ? 'picked' : ''} ${
                    wrongPair === p.id ? 'wrong shake' : ''
                  }`}
                  style={{ '--c': COMPONENTS[p.id].color } as React.CSSProperties}
                  disabled={done}
                  onClick={() => {
                    sfx.click()
                    setPickedRole(p.id)
                  }}
                >
                  {p.role}
                </button>
              )
            })}
          </div>
        </div>
      )}

      <Feedback />
      <ExerciseEnd result={result} />
    </>
  )
}
