/**
 * Chapitre 5 — Le montage  (et chapitre 9 — Le défi, sans indice ni fantôme).
 *
 * L'élève fait glisser une pièce depuis l'établi vers le boîtier.
 * L'emplacement le plus proche du curseur s'illumine : c'est l'aimantation,
 * qui rend le geste facile à la souris tout en restant exigeant sur le CHOIX
 * de l'emplacement.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import {
  COMPONENTS,
  INSTALLABLE_IDS,
  type ComponentId,
} from '@/data/components'
import { boundsCenter, BOUNDS, SLOTS } from '@/three/layout'
import { PartModel, type PartId } from '@/three/models'
import { GhostSlot, PcRig } from '@/three/PcRig'
import { useBuild } from '@/state/useBuild'
import { Btn } from '@/ui/bits'
import { ExerciseBar, ExerciseEnd, ExerciseIntro, Feedback, useReady } from './Frame'
import { useExercise } from './useExercise'
import { sfx } from '@/audio/sfx'

/* ---------------------------------------------------------------- */
/*  Règles de montage                                                */
/* ---------------------------------------------------------------- */

/**
 * Un prérequis est satisfait s'il est déjà posé.
 * Le boîtier est toujours là : on ne le « monte » pas.
 */
export function isPresent(id: ComponentId, installed: ComponentId[]) {
  return id === 'case' || installed.includes(id)
}

/** Les pièces installables tout de suite (prérequis satisfaits). */
export function availableNow(installed: ComponentId[]): PartId[] {
  return INSTALLABLE_IDS.filter(
    (id) => !installed.includes(id) && COMPONENTS[id].requires.every((r) => isPresent(r, installed)),
  ) as PartId[]
}

/* ---------------------------------------------------------------- */
/*  Pièce tenue à la main + aimantation                              */
/* ---------------------------------------------------------------- */

const v = new THREE.Vector3()
const plane = new THREE.Plane()
const ray = new THREE.Ray()

function DraggedPart({ candidates }: { candidates: PartId[] }) {
  const { camera, size } = useThree()
  const dragging = useBuild((s) => s.dragging) as PartId | null
  const candidate = useBuild((s) => s.candidate)
  const g = useRef<THREE.Group>(null)
  const goal = useRef(new THREE.Vector3())

  useFrame((_, dt) => {
    if (!dragging || !g.current) return
    const { dragNdc } = useBuild.getState()

    // 1. Quel emplacement est le plus proche du curseur, à l'écran ?
    let best: PartId | null = null
    let bestDist = Infinity
    for (const id of candidates) {
      v.set(...boundsCenter(id)).project(camera)
      const dx = ((v.x - dragNdc[0]) * size.width) / 2
      const dy = ((v.y - dragNdc[1]) * size.height) / 2
      const d = Math.hypot(dx, dy)
      if (d < bestDist) {
        bestDist = d
        best = id
      }
    }
    const snapped = bestDist < 165 ? best : null
    if (useBuild.getState().candidate !== snapped) useBuild.getState().set({ candidate: snapped })

    // 2. Position visée : l'emplacement aimanté, sinon le curseur dans l'espace
    if (snapped) {
      goal.current.set(...SLOTS[snapped].position)
    } else {
      camera.getWorldDirection(v)
      plane.setFromNormalAndCoplanarPoint(v, new THREE.Vector3(0, 22, 0))
      ray.origin.copy(camera.position)
      ray.direction
        .set(dragNdc[0], dragNdc[1], 0.5)
        .unproject(camera)
        .sub(camera.position)
        .normalize()
      if (!ray.intersectPlane(plane, goal.current)) goal.current.set(0, 24, 0)
    }
    g.current.position.lerp(goal.current, 1 - Math.pow(0.0005, dt))
  })

  if (!dragging) return null
  const b = BOUNDS[dragging]
  const good = candidate === dragging

  return (
    <group ref={g}>
      <PartModel id={dragging} />
      <mesh position={b.offset} renderOrder={4}>
        <boxGeometry args={b.size} />
        <meshBasicMaterial
          color={candidate ? (good ? '#66d17a' : '#ffd166') : '#4dd0e1'}
          transparent
          opacity={0.07}
          depthWrite={false}
        />
      </mesh>
    </group>
  )
}

/* ---------------------------------------------------------------- */
/*  Scène                                                            */
/* ---------------------------------------------------------------- */

export function AssemblyScene({ showGhosts = true }: { showGhosts?: boolean }) {
  const installed = useBuild((s) => s.installed)
  const dragging = useBuild((s) => s.dragging)
  const candidate = useBuild((s) => s.candidate)
  const phase = useExercise((s) => s.phase)

  const free = availableNow(installed)
  const ghosts = free.filter((id) => id !== dragging)

  return (
    <>
      <PcRig interactive={false} entering={installed} />
      {phase === 'play' &&
        showGhosts &&
        ghosts.map((id) => (
          <GhostSlot
            key={id}
            id={id}
            kind={candidate === id ? (dragging === id ? 'ok' : 'bad') : 'target'}
          />
        ))}
      {phase === 'play' && dragging && <DraggedPart candidates={free} />}
    </>
  )
}

/* ---------------------------------------------------------------- */
/*  Interface                                                        */
/* ---------------------------------------------------------------- */

export function AssemblyUi({
  challenge = false,
  onView,
}: {
  challenge?: boolean
  onView?: (v: 'inside' | 'overview' | 'bottom' | 'cpuZone') => void
}) {
  const ex = useExercise()
  const installed = useBuild((s) => s.installed)
  const dragging = useBuild((s) => s.dragging)
  const [result, setResult] = useState<{ stars: 0 | 1 | 2 | 3; xp: number } | null>(null)
  const ready = useReady()
  const [flash, setFlash] = useState<ComponentId | null>(null)

  useEffect(() => {
    useExercise.getState().begin(challenge ? 'defi' : 'montage', INSTALLABLE_IDS.length)
    useBuild.getState().resetBuild(['case'])
    useBuild.getState().set({ explode: 0, labels: false, running: false, powered: false, panelOpen: 1 })
  }, [challenge])

  useEffect(() => {
    if (!ready || ex.phase !== 'play' || result) return
    if (INSTALLABLE_IDS.every((id) => installed.includes(id))) {
      // La machine est complète : on l'allume pour récompenser
      useBuild.getState().set({ running: true, powered: true })
      sfx.boot()
      setTimeout(() => setResult(useExercise.getState().finish()), 1500)
    }
  }, [ready, installed, ex.phase, result])

  /* ---- Glisser-déposer ---- */

  const updateNdc = useCallback((e: PointerEvent | React.PointerEvent) => {
    const x = (e.clientX / window.innerWidth) * 2 - 1
    const y = -(e.clientY / window.innerHeight) * 2 + 1
    useBuild.getState().set({ dragNdc: [x, y] })
  }, [])

  const drop = useCallback(() => {
    const b = useBuild.getState()
    const id = b.dragging as PartId | null
    const cand = b.candidate
    b.set({ dragging: null, candidate: null })
    if (!id) return

    const c = COMPONENTS[id]
    const ex = useExercise.getState()

    if (!cand) {
      ex.info('Repose-la sur l\'établi', "Approche la pièce de l'emplacement qui clignote dans le boîtier.")
      return
    }
    if (cand === id) {
      sfx.snap()
      if (id === 'ram1' || id === 'ram2') sfx.clip()
      if (id === 'psu' || id === 'motherboard' || id === 'hdd') sfx.screw()
      b.install(id)
      setFlash(id)
      setTimeout(() => setFlash(null), 900)
      ex.good(`${c.shortName} en place !`, c.handling)
    } else {
      ex.bad(
        `Ce n'est pas l'emplacement de « ${c.shortName} »`,
        `Ici, c'est la place de : ${COMPONENTS[cand].name}.`,
      )
    }
  }, [])

  useEffect(() => {
    if (!dragging) return
    const move = (e: PointerEvent) => updateNdc(e)
    const up = () => drop()
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
    window.addEventListener('pointercancel', up)
    return () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      window.removeEventListener('pointercancel', up)
    }
  }, [dragging, updateNdc, drop])

  const tray = INSTALLABLE_IDS.filter((id) => !installed.includes(id))
  const blocked = (id: ComponentId) => !COMPONENTS[id].requires.every((r) => isPresent(r, installed))

  const hint = () => {
    const next = availableNow(installed)[0]
    if (!next) return
    useExercise.getState().hint()
    const c = COMPONENTS[next]
    useExercise.getState().info(`Prochaine pièce : ${c.shortName}`, c.handling)
  }

  return (
    <>
      <ExerciseBar
        onHint={challenge ? undefined : hint}
        extra={
          challenge && ex.penalty > 0 ? (
            <span className="pill" style={{ borderColor: 'var(--bad)', color: 'var(--bad)' }}>
              +{ex.penalty}s de pénalité
            </span>
          ) : undefined
        }
      />

      <ExerciseIntro onStart={() => onView?.('inside')}>
        {challenge ? (
          <div className="intro-tips">
            <div>
              <b>⏱️ Chrono</b> le temps compte, chaque erreur ajoute 10 secondes
            </div>
            <div>
              <b>🚫 Pas d'indice</b> et pas d'emplacements clignotants
            </div>
          </div>
        ) : (
          <div className="intro-tips">
            <div>
              <b>🖐️ Attrape</b> une pièce dans la liste de gauche et fais-la glisser dans le boîtier
            </div>
            <div>
              <b>✨ Les zones qui clignotent</b> sont les emplacements libres
            </div>
            <div>
              <b>🔒 Les pièces grisées</b> attendent qu'une autre soit posée avant
            </div>
          </div>
        )}
      </ExerciseIntro>

      {ex.phase === 'play' && (
        <>
          <div className="tray card">
            <div className="tray-head">
              <b>L'établi</b>
              <span className="faint">{tray.length} pièce{tray.length > 1 ? 's' : ''} à poser</span>
            </div>
            <div className="tray-list scroll">
              {tray.map((id) => {
                const c = COMPONENTS[id]
                const lock = blocked(id)
                return (
                  <button
                    key={id}
                    className={`traycard ${lock ? 'lock' : ''} ${dragging === id ? 'grabbed' : ''}`}
                    style={{ '--c': c.color } as React.CSSProperties}
                    onPointerDown={(e) => {
                      if (lock) {
                        useExercise
                          .getState()
                          .info('Pas encore !', c.requiresHint ?? 'Une autre pièce doit être posée avant.')
                        return
                      }
                      e.preventDefault()
                      sfx.pick()
                      updateNdc(e)
                      useBuild.getState().set({ dragging: id, candidate: null })
                    }}
                  >
                    <span className="traycard-bar" />
                    <span className="traycard-name">{c.shortName}</span>
                    {c.acronym && <em>{c.acronym}</em>}
                    {lock && <span className="traycard-lock">🔒</span>}
                  </button>
                )
              })}
              {tray.length === 0 && <div className="faint">Tout est monté !</div>}
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

          {dragging && (
            <div className="dragbar">
              Relâche sur l'emplacement qui convient à «&nbsp;{COMPONENTS[dragging].shortName}&nbsp;»
            </div>
          )}

          {!dragging && flash && (
            <div className="okflash">✅ {COMPONENTS[flash].shortName}</div>
          )}

          {!dragging && !flash && tray.length > 0 && (
            <div className="hintbar">
              <span>🖐️</span> Attrape une pièce à gauche et amène-la dans le boîtier
              {!challenge && (
                <Btn size="sm" variant="ghost" onClick={hint}>
                  Par quoi commencer ?
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
