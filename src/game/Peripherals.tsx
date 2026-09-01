/**
 * Chapitre 7 — Les périphériques, en deux manches.
 *
 *  1. IDENTIFIER : le périphérique tourne sur son présentoir, l'élève donne
 *     son nom, puis dit s'il est en entrée, en sortie… ou les deux.
 *  2. BRANCHER : le périphérique est posé à côté de l'unité centrale, son
 *     câble sort et se termine par une vraie fiche (USB, HDMI, RJ45, jack,
 *     secteur). L'élève ATTRAPE la fiche et la dépose sur la bonne prise,
 *     à l'arrière de la machine.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { create } from 'zustand'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { PORTS, PORT_BY_ID } from '@/data/ports'
import {
  KIND_COLOR,
  KIND_HELP,
  KIND_LABEL,
  PERIPHERALS,
  type Peripheral,
  type PeripheralKind,
} from '@/data/peripherals'
import { ALL_INSTALLED, useBuild } from '@/state/useBuild'
import { PortMarker } from '@/three/Cables'
import { PcRig } from '@/three/PcRig'
import { PeriShowcase } from '@/three/Showcase'
import type { Vec3 } from '@/three/layout'
import {
  FlexCable,
  PeripheralModel,
  PERIPHERAL_MODELS,
  type PeripheralModelId,
} from '@/three/models/PeripheralParts'
import { PLUGS, Plug } from '@/three/models/Plugs'
import { Btn } from '@/ui/bits'
import { SpeakButton } from '@/ui/speak'
import { ExerciseBar, ExerciseEnd, ExerciseIntro, useReady } from './Frame'
import { useExercise } from './useExercise'
import { sfx } from '@/audio/sfx'

/* ================================================================ */
/*  Réglages de scène                                                */
/* ================================================================ */

/** Où se pose le périphérique de la manche 2, à droite de la tour. */
const SPOT: Vec3 = [40, 0, 14]

/** Hauteur du guéridon sous chaque périphérique (0 = posé au sol). */
const STAND: Record<PeripheralModelId, number> = {
  monitor: 0,
  box: 6,
  speaker: 10,
  micro: 8,
  keyboard: 15,
  mouse: 17,
  gamepad: 16,
  usbkey: 20,
  // la prise murale est un morceau de MUR : elle se pose au sol
  power: 0,
}

/**
 * Position de repos de la fiche : dans l'espace libre entre la tour et le
 * périphérique, en avant du plan de la machine pour rester bien visible.
 */
const REST: Vec3 = [17, 11, 38]

/** Distance d'aimantation, en pixels à l'écran. */
const SNAP_PX = 105

/* ================================================================ */
/*  État partagé scène / interface                                   */
/* ================================================================ */

interface PeriState {
  /** 1 = identification, 2 = branchement */
  round: 1 | 2
  /** Ordre des périphériques dans la manche en cours */
  order: Peripheral[]
  index: number
  /** Manche 1 : on nomme, puis on classe */
  step: 'name' | 'kind'
  revealed: boolean
  wrongName: string | null
  /** Manche 2 : prise visée par la fiche tenue à la main */
  snap: string | null
  wrongPort: string | null
  okPort: string | null
  /** Prise mise en évidence par l'indice */
  flashPort: string | null
  /** Périphériques déjà branchés : id -> id de la prise */
  done: Record<string, string>
  finished: boolean
}

const usePeri = create<PeriState>()(() => ({
  round: 1,
  order: [],
  index: 0,
  step: 'name',
  revealed: false,
  wrongName: null,
  snap: null,
  wrongPort: null,
  okPort: null,
  flashPort: null,
  done: {},
  finished: false,
}))

/* Mise au point du rendu 3D depuis la console, en développement. */
if (import.meta.env.DEV) {
  ;(window as unknown as Record<string, unknown>).__peri = usePeri
}

function shuffle<T>(a: T[]): T[] {
  const r = [...a]
  for (let i = r.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[r[i], r[j]] = [r[j], r[i]]
  }
  return r
}

/** Position de la prise, légèrement en retrait pour poser la fiche dessus. */
function portAnchor(id: string): Vec3 {
  const p = PORT_BY_ID[id]
  return [p.position[0], p.position[1], p.position[2] + p.size[2] / 2 + 0.2]
}

/* ================================================================ */
/*  Guéridon                                                         */
/* ================================================================ */

function Stand({ h }: { h: number }) {
  if (h <= 0) return null
  return (
    <group>
      <mesh position={[0, -0.6, 0]} receiveShadow castShadow>
        <cylinderGeometry args={[11, 11, 1.2, 36]} />
        <meshStandardMaterial color="#1b1f26" roughness={0.6} metalness={0.35} />
      </mesh>
      <mesh position={[0, -h / 2, 0]} castShadow>
        <cylinderGeometry args={[1.8, 2.6, h, 20]} />
        <meshStandardMaterial color="#12151a" roughness={0.7} metalness={0.3} />
      </mesh>
      <mesh position={[0, -h + 0.5, 0]} receiveShadow>
        <cylinderGeometry args={[7.5, 8.5, 1, 30]} />
        <meshStandardMaterial color="#171b22" roughness={0.65} metalness={0.35} />
      </mesh>
    </group>
  )
}

/* ================================================================ */
/*  Câble qui suit la fiche pendant le glisser                       */
/* ================================================================ */

function tube(a: THREE.Vector3, b: THREE.Vector3, thickness: number) {
  const d = a.distanceTo(b)
  const drop = Math.min(9, d * 0.28)
  const m1 = a.clone().lerp(b, 0.34)
  const m2 = a.clone().lerp(b, 0.7)
  m1.y -= drop
  m2.y -= drop * 0.7
  const curve = new THREE.CatmullRomCurve3([a, m1, m2, b], false, 'catmullrom', 0.5)
  return new THREE.TubeGeometry(curve, 24, thickness, 6, false)
}

/**
 * Câble souple dont une extrémité bouge.
 * La géométrie n'est refaite que si la fiche s'est vraiment déplacée :
 * inutile de reconstruire un tube 60 fois par seconde pour rien.
 */
function LiveCable({
  from,
  target,
  thickness = 0.3,
  color = '#14171c',
}: {
  from: Vec3
  target: React.RefObject<THREE.Group | null>
  thickness?: number
  color?: string
}) {
  const mesh = useRef<THREE.Mesh>(null)
  const a = useMemo(() => new THREE.Vector3(...from), [from])
  const last = useRef(new THREE.Vector3(9999, 9999, 9999))
  const geo = useMemo(() => tube(a, a.clone().add(new THREE.Vector3(0, 0, 4)), thickness), [a, thickness])

  // Nouveau périphérique : React repose la géométrie initiale (un moignon).
  // On oublie la dernière position connue pour que le tube soit refait.
  useEffect(() => {
    last.current.set(9999, 9999, 9999)
  }, [geo])

  useFrame(() => {
    const m = mesh.current
    const t = target.current
    if (!m || !t) return
    // le câble se raccroche à l'ARRIÈRE de la fiche
    const b = t.position.clone()
    b.z += 3.4
    if (b.distanceTo(last.current) < 0.35) return
    last.current.copy(b)
    const old = m.geometry
    m.geometry = tube(a, b, thickness)
    old.dispose()
  })

  return (
    <mesh ref={mesh} geometry={geo} castShadow>
      <meshStandardMaterial color={color} roughness={0.78} metalness={0.1} />
    </mesh>
  )
}

/**
 * Ce qu'on voit au bout du câble.
 * Pour la clé USB, la « fiche » est l'objet lui-même : on affiche donc la
 * clé entière, sa prise métallique posée sur l'origine du repère.
 */
function PlugHead({ peri }: { peri: Peripheral }) {
  if (peri.id === 'usbkey') {
    return (
      <group position={[0, -0.55, 1.35]}>
        <PeripheralModel id="usbkey" />
      </group>
    )
  }
  return <Plug kind={peri.plug} color={peri.plugColor} />
}

/* ================================================================ */
/*  La fiche tenue à la main                                         */
/* ================================================================ */

const v = new THREE.Vector3()
const plane = new THREE.Plane()
const ray = new THREE.Ray()

function HandPlug({
  peri,
  candidates,
  onGrab,
  handle,
}: {
  peri: Peripheral
  candidates: string[]
  onGrab: (e: { clientX: number; clientY: number }) => void
  /** Groupe suivi par le câble : il porte la position monde de la fiche */
  handle: React.RefObject<THREE.Group | null>
}) {
  const { camera, size } = useThree()
  const g = handle
  const goal = useRef(new THREE.Vector3(...REST))
  const halo = useRef<THREE.Group>(null)
  const dragging = useBuild((s) => s.handDrag)

  // Le périphérique change : la nouvelle fiche apparaît à sa place de repos
  // au lieu de venir en volant depuis la prise précédente.
  useEffect(() => {
    g.current?.position.set(...REST)
    goal.current.set(...REST)
  }, [g, peri.id])

  useFrame((_, dt) => {
    const grp = g.current
    if (!grp) return

    if (!dragging) {
      goal.current.set(...REST)
      if (usePeri.getState().snap) usePeri.setState({ snap: null })
    } else {
      const { dragNdc } = useBuild.getState()

      // Prise la plus proche du curseur, mesurée à l'écran
      let best: string | null = null
      let bestDist = Infinity
      for (const id of candidates) {
        v.set(...portAnchor(id)).project(camera)
        const dx = ((v.x - dragNdc[0]) * size.width) / 2
        const dy = ((v.y - dragNdc[1]) * size.height) / 2
        const d = Math.hypot(dx, dy)
        if (d < bestDist) {
          bestDist = d
          best = id
        }
      }
      const snapped = bestDist < SNAP_PX ? best : null
      if (usePeri.getState().snap !== snapped) usePeri.setState({ snap: snapped })

      if (snapped) {
        const a = portAnchor(snapped)
        goal.current.set(a[0], a[1], a[2] + 1.4)
      } else {
        // sinon : le curseur, projeté sur un plan face à la caméra
        camera.getWorldDirection(v)
        plane.setFromNormalAndCoplanarPoint(v, new THREE.Vector3(6, 26, 30))
        ray.origin.copy(camera.position)
        ray.direction.set(dragNdc[0], dragNdc[1], 0.5).unproject(camera).sub(camera.position).normalize()
        if (!ray.intersectPlane(plane, goal.current)) goal.current.set(...REST)
      }
    }
    grp.position.lerp(goal.current, 1 - Math.pow(0.0008, dt))
    if (halo.current) {
      const k = dragging ? 1 : 1 + Math.sin(performance.now() * 0.004) * 0.09
      halo.current.scale.setScalar(k)
    }
  })

  return (
    <group ref={g} position={REST}>
      <group
        onPointerDown={(e) => {
          e.stopPropagation()
          onGrab(e)
        }}
        onPointerOver={(e) => {
          e.stopPropagation()
          document.body.style.cursor = 'grab'
        }}
        onPointerOut={() => (document.body.style.cursor = '')}
      >
        <PlugHead peri={peri} />
        {/* Poignée invisible : une fiche fait 1 cm, impossible à viser sans aide */}
        <mesh position={[0, 0, 1.9]}>
          <boxGeometry args={[3.4, 3.4, 5.2]} />
          <meshBasicMaterial transparent opacity={0} depthWrite={false} />
        </mesh>
      </group>
      {/* Halo pulsant : c'est le seul objet de la scène qu'on peut saisir */}
      <group ref={halo}>
        <mesh position={[0, 0, 1.6]} raycast={() => null}>
          <sphereGeometry args={[2.8, 16, 12]} />
          <meshBasicMaterial
            color="#38bdf8"
            transparent
            opacity={dragging ? 0.06 : 0.16}
            depthWrite={false}
          />
        </mesh>
        <mesh position={[0, 0, 1.6]} rotation={[0, 0, 0]} raycast={() => null}>
          <torusGeometry args={[3.1, 0.12, 8, 32]} />
          <meshBasicMaterial color="#7dd3fc" transparent opacity={dragging ? 0.15 : 0.5} depthWrite={false} />
        </mesh>
      </group>
    </group>
  )
}

/* ================================================================ */
/*  Le périphérique courant, posé près de la machine                 */
/* ================================================================ */

function PeripheralStand({ id }: { id: PeripheralModelId }) {
  const h = STAND[id]
  return (
    <group position={[SPOT[0], SPOT[1] + h, SPOT[2]]}>
      <Stand h={h} />
      <PeripheralModel id={id} />
    </group>
  )
}

/** Un câble secteur est bien plus épais qu'un câble de souris. */
function cableWidth(p: Peripheral): number {
  return p.plug === 'c13' ? 0.45 : p.plug === 'hdmi' ? 0.36 : p.plug === 'rj45' ? 0.3 : 0.24
}

/** Le point d'où sort le câble, en coordonnées monde. */
function cableStart(id: PeripheralModelId): Vec3 {
  const e = PERIPHERAL_MODELS[id].cableExit
  return [SPOT[0] + e[0], SPOT[1] + STAND[id] + e[1], SPOT[2] + e[2]]
}

/* ================================================================ */
/*  Scène                                                            */
/* ================================================================ */

export function PeripheralsScene({ part = 1 }: { part?: 1 | 2 }) {
  const phase = useExercise((s) => s.phase)
  const { order, index, snap, wrongPort, okPort, flashPort, done } = usePeri()
  const current = order[index]
  const handle = useRef<THREE.Group>(null)

  /* ---- Manche 1 (chapitre « Nomme les périphériques ») : le présentoir ---- */
  if (part === 1) {
    if (!current) return null
    return <PeriShowcase id={current.id} />
  }

  /* ---- Manche 2 : le banc de branchement ---- */
  const taken = new Set(Object.values(done))
  const free = PORTS.filter((p) => !taken.has(p.id)).map((p) => p.id)

  const grab = (e: { clientX: number; clientY: number }) => {
    sfx.pick()
    useBuild.getState().set({
      handDrag: true,
      dragNdc: [(e.clientX / window.innerWidth) * 2 - 1, -(e.clientY / window.innerHeight) * 2 + 1],
    })
  }

  return (
    <>
      <PcRig interactive={false} />

      {/* Ce qui est déjà branché reste en place */}
      {Object.entries(done).map(([periId, portId]) => {
        const p = PERIPHERALS.find((x) => x.id === periId)
        if (!p) return null
        const a = portAnchor(portId)
        return (
          <group key={periId}>
            <group position={[a[0], a[1], a[2] + 0.6]}>
              <PlugHead peri={p} />
            </group>
            {p.id !== 'usbkey' && (
              /* Le câble part franchement vers la DROITE, du côté des
                 périphériques : en le laissant tomber devant la machine,
                 le faisceau finissait par masquer les prises. */
              <FlexCable
                from={[a[0], a[1], a[2] + 0.6 + PLUGS[p.plug].length]}
                to={[a[0] + 42, 1.5, a[2] + 2]}
                sag={7}
              />
            )}
          </group>
        )
      })}

      {current && (
        <>
          {/* La clé USB EST sa propre fiche : elle n'a pas de socle à part */}
          {current.id !== 'usbkey' && <PeripheralStand id={current.id} />}
          {phase === 'play' && (
            <>
              <HandPlug peri={current} candidates={free} onGrab={grab} handle={handle} />
              {PERIPHERAL_MODELS[current.id].cable > 0 && (
                <LiveCable from={cableStart(current.id)} target={handle} thickness={cableWidth(current)} />
              )}
            </>
          )}
        </>
      )}

      {/* Repères sur les prises encore libres */}
      {phase === 'play' &&
        PORTS.map((p) => {
          const used = taken.has(p.id)
          const a = portAnchor(p.id)
          const state =
            wrongPort === p.id
              ? 'bad'
              : okPort === p.id || used
                ? 'ok'
                : snap === p.id || flashPort === p.id
                  ? 'active'
                  : 'idle'
          return (
            <PortMarker
              key={p.id}
              position={[a[0], a[1], a[2] + 0.5]}
              radius={p.kind === 'jack' ? 0.85 : p.kind === 'psu' ? 1.5 : 1.05}
              state={state}
              label={snap === p.id || flashPort === p.id ? p.label : undefined}
            />
          )
        })}
    </>
  )
}

/* ================================================================ */
/*  Interface                                                        */
/* ================================================================ */

/** Manche 1 : nom + entrée/sortie ; manche 2 : un branchement par périphérique. */
const TOTAL_NAME = PERIPHERALS.length * 2
const TOTAL_PLUG = PERIPHERALS.length

export function PeripheralsUi({
  part = 1,
  onView,
}: {
  part?: 1 | 2
  onView?: (v: 'showcase' | 'branchement' | 'rear') => void
}) {
  const ex = useExercise()
  const { order, index, step, revealed, wrongName, finished, done } = usePeri()
  const [result, setResult] = useState<{ stars: 0 | 1 | 2 | 3; xp: number } | null>(null)
  const ready = useReady()
  const current = order[index]

  useEffect(() => {
    usePeri.setState({
      round: part,
      order: part === 1 ? shuffle(PERIPHERALS) : [...PERIPHERALS],
      index: 0,
      step: 'name',
      revealed: false,
      wrongName: null,
      snap: null,
      wrongPort: null,
      okPort: null,
      flashPort: null,
      done: {},
      finished: false,
    })
    useExercise.getState().begin(
      part === 1 ? 'peripheriques' : 'branchement',
      part === 1 ? TOTAL_NAME : TOTAL_PLUG,
    )
    useBuild.getState().resetBuild(ALL_INSTALLED)
    // Manche 2 : la machine est éteinte tant que le câble secteur n'est pas
    // branché — les ventilateurs ne tournent pas.
    useBuild.getState().set({
      explode: 0,
      labels: false,
      running: part === 1,
      powered: part === 1,
      handDrag: false,
      celebrate: false,
    })
  }, [part])

  // Cadrage propre à la manche.
  useEffect(() => {
    if (ex.phase !== 'play') return
    onView?.(part === 1 ? 'showcase' : 'branchement')
  }, [part, ex.phase, onView])

  // Manche 2 : dès que le câble secteur est branché, le PC s'allume.
  useEffect(() => {
    if (part !== 2) return
    if (done['power']) useBuild.getState().set({ running: true, powered: true })
  }, [part, done])

  // Fin d'atelier. En manche 2, on laisse tourner la machine et la vue
  // pivoter quelques secondes avant l'écran de réussite.
  useEffect(() => {
    if (!ready || !finished || result) return
    if (part !== 2) {
      setResult(useExercise.getState().finish())
      return
    }
    useBuild.getState().set({ running: true, powered: true, celebrate: true })
    sfx.boot()
    const t = setTimeout(() => {
      useBuild.getState().set({ celebrate: false })
      setResult(useExercise.getState().finish())
    }, 4200)
    return () => clearTimeout(t)
  }, [ready, finished, result, part])

  /* ---------------- Manche 1 : identifier ---------------- */

  const choices = useMemo(() => {
    if (!current) return []
    return shuffle([current.name, ...current.distractors])
  }, [current])

  const answerName = (label: string) => {
    if (revealed || !current) return
    const good = label === current.name
    usePeri.setState({ revealed: true, wrongName: good ? null : label })
    const next = () => usePeri.setState({ step: 'kind', revealed: false, wrongName: null })
    if (good) {
      useExercise.getState().good('Exact !', current.role, { peri: current.id, onDismiss: next })
    } else {
      useExercise
        .getState()
        .bad('Pas tout à fait…', `C'est « ${current.name} ». ${current.role}`, {
          peri: current.id,
          onDismiss: next,
        })
    }
  }

  const answerKind = (k: PeripheralKind) => {
    if (!current) return
    const s = usePeri.getState()
    const last = s.index + 1 >= s.order.length
    const next = () => {
      if (last) {
        // Dernier périphérique nommé et classé : le chapitre est terminé
        // (le branchement fait l'objet d'un chapitre à part).
        usePeri.setState({ finished: true })
      } else {
        usePeri.setState({ index: s.index + 1, step: 'name', revealed: false, wrongName: null })
      }
    }
    if (k === current.kind) {
      useExercise
        .getState()
        .good(`${KIND_LABEL[current.kind]} — exact !`, KIND_HELP[current.kind], {
          peri: current.id,
          onDismiss: next,
        })
    } else {
      useExercise
        .getState()
        .bad(
          `Non : c'est un périphérique « ${KIND_LABEL[current.kind].toLowerCase()} »`,
          `${current.role} ${KIND_HELP[current.kind]}`,
          { peri: current.id, onDismiss: next },
        )
    }
  }

  /* ---------------- Manche 2 : brancher ---------------- */

  const updateNdc = useCallback((e: PointerEvent) => {
    useBuild.getState().set({
      dragNdc: [(e.clientX / window.innerWidth) * 2 - 1, -(e.clientY / window.innerHeight) * 2 + 1],
    })
  }, [])

  const drop = useCallback(() => {
    const s = usePeri.getState()
    const ex = useExercise.getState()
    const peri = s.order[s.index]
    const port = s.snap
    useBuild.getState().set({ handDrag: false })
    usePeri.setState({ snap: null })
    if (!peri) return

    if (!port) {
      ex.info(
        'La fiche est dans le vide',
        "Amène-la sur une prise à l'arrière de l'unité centrale : le repère se colore et le nom de la prise s'affiche.",
        { peri: peri.id },
      )
      return
    }

    const label = PORT_BY_ID[port]?.label ?? 'cette prise'

    /* Bon branchement */
    if (peri.accepts.includes(port)) {
      sfx.plug()
      usePeri.setState({ okPort: port })
      ex.good(`${peri.name} — branché !`, peri.ok, {
        peri: peri.id,
        onDismiss: () => {
          const st = usePeri.getState()
          const done = { ...st.done, [peri.id]: port }
          useBuild.getState().plug(peri.id, port)
          if (st.index + 1 >= st.order.length) usePeri.setState({ done, okPort: null, finished: true })
          else usePeri.setState({ done, okPort: null, index: st.index + 1 })
        },
      })
      return
    }

    /* Ça rentrerait, mais ce n'est pas le meilleur choix : on n'accable pas */
    const soft = peri.tolerated?.[port]
    if (soft) {
      usePeri.setState({ wrongPort: port })
      ex.info('Presque !', soft, {
        peri: peri.id,
        onDismiss: () => usePeri.setState({ wrongPort: null }),
      })
      return
    }

    /* Erreur franche */
    usePeri.setState({ wrongPort: port })
    ex.bad(
      peri.traps?.[port] ? 'Attention au piège !' : `Ce n'est pas là : ${label}`,
      peri.traps?.[port] ?? `${PORT_BY_ID[port]?.hint ?? ''} ${peri.hint}`,
      { peri: peri.id, onDismiss: () => usePeri.setState({ wrongPort: null }) },
    )
  }, [])

  const handDrag = useBuild((s) => s.handDrag)
  useEffect(() => {
    if (!handDrag) return
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
  }, [handDrag, updateNdc, drop])

  /* ---------------- Indices ---------------- */

  const hint = () => {
    if (!current) return
    const exs = useExercise.getState()
    exs.hint()
    if (part === 1) {
      exs.info(
        step === 'name' ? 'Indice' : 'Entrée ou sortie ?',
        step === 'name'
          ? current.role
          : "Demande-toi dans quel SENS circule l'information : vers l'ordinateur, ou vers toi ?",
        { peri: current.id },
      )
      return
    }
    const target = current.accepts[0]
    usePeri.setState({ flashPort: target })
    setTimeout(() => usePeri.setState({ flashPort: null }), 2600)
    exs.info(`Où brancher ${current.name} ?`, `${current.hint} (${PORT_BY_ID[target]?.label ?? ''})`, {
      peri: current.id,
    })
  }

  const stepNo = step === 'name' ? 1 : 2
  // Le nom reste caché tant que la question « qui est-ce ? » n'a pas été jouée.
  const hidden = part === 1 && step === 'name' && !revealed

  // Texte lu à voix haute pour le volet courant.
  const speakText =
    current && !hidden
      ? part === 1
        ? [current.name, current.role]
        : [current.name, current.role, `Au bout du câble : ${current.plugName}.`, current.plugHint]
      : ['']

  return (
    <>
      <ExerciseBar onHint={hint} />
      <ExerciseIntro onStart={() => onView?.(part === 1 ? 'showcase' : 'branchement')}>
        {part === 1 ? (
          <div className="intro-tips">
            <div>
              <b>🔄 La pièce tourne</b> observe-la, puis choisis son nom parmi les propositions
            </div>
            <div>
              <b>➡️ Entrée ou sortie ?</b> demande-toi dans quel sens circule l'information
            </div>
          </div>
        ) : (
          <div className="intro-tips">
            <div>
              <b>🖐️ Attrape la fiche</b> au bout du câble du périphérique
            </div>
            <div>
              <b>🎯 Dépose-la</b> sur la bonne prise, à l'arrière de l'unité centrale
            </div>
            <div>
              <b>🔌 Le câble secteur en dernier</b> tant qu'il n'est pas branché, rien ne s'allume
            </div>
          </div>
        )}
      </ExerciseIntro>

      {ex.phase === 'play' && current && (
        <>
          <div className={`peri card ${part === 2 ? 'peri-wide' : ''}`}>
            <div className="peri-head">
              {/* Tant que le nom n'est pas trouvé, on ne le vend pas : ni
                  l'icône, ni le titre ne doivent trahir la réponse. */}
              <span className="peri-icon">{hidden ? '❓' : current.icon}</span>
              <div>
                <h3 className="peri-name">{hidden ? 'Manche 1 — identifier' : current.name}</h3>
                <p className="peri-role">
                  {part === 1
                    ? `Périphérique ${index + 1} / ${order.length}`
                    : `Branchement ${index + 1} / ${order.length}`}
                </p>
              </div>
              {!hidden && <SpeakButton className="speakbtn-head" text={speakText} />}
            </div>

            {part === 1 && step === 'kind' && <p className="peri-role">{current.role}</p>}

            {part === 2 && (
              <>
                <p className="peri-role" style={{ marginBottom: 12 }}>
                  {current.role}
                </p>
                <div className="peri-plug">
                  <span>Au bout du câble</span>
                  <b>{current.plugName}</b>
                  <em>{current.plugHint}</em>
                </div>
                <div className="peri-ask">
                  <b>Où la branches-tu&nbsp;?</b>
                  <span className="faint">
                    Attrape la fiche bleue et fais-la glisser sur la bonne prise.
                  </span>
                </div>
              </>
            )}

            <div className="peri-progress">
              {order.map((p, i) => (
                <span
                  key={p.id}
                  className={`dotstep ${i < index ? 'on' : ''} ${i === index ? 'cur' : ''}`}
                  title={p.name}
                />
              ))}
            </div>

            <div className="tray-foot">
              {part === 2 ? (
                <>
                  <button className="btn btn-sm btn-ghost" onClick={() => onView?.('branchement')}>
                    Vue d'ensemble
                  </button>
                  <button className="btn btn-sm btn-ghost" onClick={() => onView?.('rear')}>
                    Zoom sur les prises
                  </button>
                </>
              ) : (
                <span className="faint">Étape {stepNo} / 2</span>
              )}
            </div>
          </div>

          {part === 1 && step === 'kind' && (
            <div className="quiz kind-quiz">
              <div className="quiz-q">
                Ce périphérique est-il en entrée, en sortie, ou les deux&nbsp;?
              </div>
              <div className="kind-choices">
                {(['entree', 'sortie', 'entree-sortie'] as PeripheralKind[]).map((k) => (
                  <button
                    key={k}
                    className="kind-btn"
                    style={{ '--k': KIND_COLOR[k] } as React.CSSProperties}
                    onClick={() => {
                      sfx.click()
                      answerKind(k)
                    }}
                  >
                    <b>{KIND_LABEL[k]}</b>
                    <span>{KIND_HELP[k]}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {part === 1 && step === 'name' && (
            <div className="quiz">
              <div className="quiz-q">Quel périphérique tourne sur le présentoir&nbsp;?</div>
              <div className="quiz-choices">
                {choices.map((label) => {
                  const ok = label === current.name
                  const cls = revealed ? (ok ? 'good' : label === wrongName ? 'bad' : 'dim') : ''
                  return (
                    <button
                      key={label}
                      className={`quiz-btn ${cls}`}
                      disabled={revealed}
                      onClick={() => {
                        sfx.click()
                        answerName(label)
                      }}
                    >
                      {label}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {part === 2 && (
            <div className="hintbar">
              <span>🖐️</span> Attrape la fiche au bout du câble et dépose-la sur la bonne prise
              <Btn size="sm" variant="ghost" onClick={hint}>
                Montre-moi
              </Btn>
            </div>
          )}
        </>
      )}
      <ExerciseEnd result={result} />
    </>
  )
}
