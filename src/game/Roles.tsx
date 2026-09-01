/**
 * Chapitre 4 — À quoi ça sert ?
 *
 * On lit le RÔLE en grand, et on désigne le composant qui l'assure parmi
 * quatre pièces qui tournent côte à côte. C'est l'inverse du chapitre 2 :
 * là on partait de l'objet pour retrouver son nom, ici on part de la
 * fonction pour retrouver l'objet.
 */

import { useEffect, useMemo, useState } from 'react'
import { create } from 'zustand'
import { Html } from '@react-three/drei'
import { useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { COMPONENTS, lowerName, soloShortName, type ComponentId } from '@/data/components'
import { ALL_INSTALLED, useBuild } from '@/state/useBuild'
import { Showcase } from '@/three/Showcase'
import { CAMERA_VIEWS } from '@/three/layout'
import { asPart } from '@/three/models'
import { glowTexture } from '@/three/textures'
import { ExerciseBar, ExerciseEnd, ExerciseIntro, useReady } from './Frame'
import { useExercise } from './useExercise'
import { sfx } from '@/audio/sfx'

/** Rôles reformulés en une phrase courte, pensée pour être lue en grand. */
const PAIRS: { id: ComponentId; role: string }[] = [
  { id: 'cpu', role: "Il exécute les calculs : c'est le cerveau de la machine." },
  {
    id: 'ram1',
    role: "C'est la mémoire qui garde sous la main ce qui sert MAINTENANT, et s'efface à l'extinction du PC.",
  },
  {
    id: 'ssd',
    role: "Il conserve les fichiers même éteint et démarre le système très vite : c'est le SSD au format M.2 NVMe, le plus récent et le plus rapide.",
  },
  { id: 'hdd', role: 'Il stocke beaucoup de données pour pas cher, avec des plateaux qui tournent.' },
  {
    id: 'ssd25',
    role: 'Un disque qui stocke les données, sans pièce mobile, dans un boîtier plat relié par deux câbles.',
  },
  { id: 'odd', role: 'Il lit les CD et les DVD avec un rayon laser.' },
  { id: 'motherboard', role: 'Elle relie tous les composants entre eux et leur distribue le courant.' },
  { id: 'psu', role: 'Il transforme le 230 V de la prise murale en courants utilisables.' },
  { id: 'gpu', role: "Elle calcule les images affichées à l'écran." },
  {
    id: 'cooler',
    role: "C'est un ventilateur posé sur un dissipateur thermique : il évacue la chaleur du processeur pour éviter la surchauffe.",
  },
  { id: 'fanFront', role: "Il brasse l'air du boîtier : le frais entre, le chaud ressort." },
  { id: 'cmos', role: "Elle garde l'heure et les réglages quand le PC est débranché." },
]

const ROLE_BY_ID = Object.fromEntries(PAIRS.map((p) => [p.id, p.role])) as Record<ComponentId, string>

function shuffle<T>(a: T[]): T[] {
  const r = [...a]
  for (let i = r.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[r[i], r[j]] = [r[j], r[i]]
  }
  return r
}

/* ---------------- État partagé scène / interface ---------------- */

interface RolesState {
  /** Ordre de passage des questions */
  order: ComponentId[]
  index: number
  /** Les quatre pièces proposées pour la question en cours */
  choices: ComponentId[]
  /** Réponse donnée : on montre alors la bonne et la mauvaise */
  answered: ComponentId | null
  finished: boolean
}

const useRoles = create<RolesState>()(() => ({
  order: [],
  index: 0,
  choices: [],
  answered: null,
  finished: false,
}))

/** Trois leurres tirés parmi les autres composants du chapitre. */
function makeChoices(good: ComponentId): ComponentId[] {
  const others = shuffle(PAIRS.map((p) => p.id).filter((id) => id !== good)).slice(0, 3)
  return shuffle([good, ...others])
}

function ask(index: number) {
  const { order } = useRoles.getState()
  useRoles.setState({ index, choices: makeChoices(order[index]), answered: null })
}

function answer(id: ComponentId) {
  const s = useRoles.getState()
  if (s.answered) return
  const good = s.order[s.index]
  const ex = useExercise.getState()
  useRoles.setState({ answered: id })

  const next = () => {
    const cur = useRoles.getState()
    if (cur.index + 1 >= cur.order.length) useRoles.setState({ finished: true })
    else ask(cur.index + 1)
  }

  if (id === good) {
    sfx.snap()
    ex.good('Bien vu !', COMPONENTS[good].analogy, { part: asPart(good), onDismiss: next })
  } else {
    ex.bad(
      `Non, ce n'est pas ${lowerName(id)}`,
      `C'était ${lowerName(good)}. ${COMPONENTS[good].analogy}`,
      { part: asPart(good), onDismiss: next },
    )
  }
}

/* ---------------- Scène : les quatre pièces alignées ---------------- */

/** Hauteur de la rangée de pièces, et des noms juste dessous. */
const ROW_Y = 34
const NAME_Y = 21

/**
 * Quatre colonnes réparties sur la largeur RÉELLEMENT visible.
 *
 * On mesure ce que la caméra `lineup` embrasse à sa distance : sur un
 * écran peu large (4/3, fenêtre étroite), un écart fixe couperait les
 * pièces des extrémités.
 */
function useColumns() {
  const width = useThree((s) => s.size.width)
  const height = useThree((s) => s.size.height)
  const fov = useThree((s) => (s.camera as THREE.PerspectiveCamera).fov)
  return useMemo(() => {
    const v = CAMERA_VIEWS.lineup
    const dist = Math.hypot(
      v.position[0] - v.target[0],
      v.position[1] - v.target[1],
      v.position[2] - v.target[2],
    )
    const halfH = dist * Math.tan(((fov / 2) * Math.PI) / 180)
    const halfW = halfH * (width / Math.max(height, 1))
    // marge pour la moitié d'une pièce + un peu d'air
    const spread = Math.max(16, Math.min(39, halfW - 10))
    const size = Math.min(14, spread * 0.62)
    return { columns: [-spread, -spread / 3, spread / 3, spread], size }
  }, [width, height, fov])
}

/**
 * Halo de survol : une lueur bleue DOUCE, placée BIEN DERRIÈRE la pièce.
 *
 * Le panneau (face caméra) est reculé d'environ deux fois la taille de la
 * pièce : le test de profondeur masque alors tout ce qui est caché par la
 * pièce, et il ne reste que l'auréole autour de sa silhouette — le halo
 * ne « traverse » plus jamais le composant.
 */
function PieceHalo({ size }: { size: number }) {
  const tex = useMemo(() => glowTexture(), [])
  return (
    <sprite
      position={[0, 0, -size * 2]}
      scale={[size * 4.2, size * 4.2, 1]}
      raycast={() => null}
      renderOrder={-1}
    >
      <spriteMaterial
        map={tex}
        color="#8fd6ff"
        transparent
        opacity={0.95}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </sprite>
  )
}

export function RolesScene() {
  const phase = useExercise((s) => s.phase)
  const { choices, answered, order, index } = useRoles()
  const { columns, size } = useColumns()
  const [hover, setHover] = useState<ComponentId | null>(null)
  if (phase !== 'play' || choices.length < 4) return null
  const good = order[index]

  return (
    <>
      {/* Un seul éclairage pour toute la rangée : les présentoirs coupent
          le leur, sinon quatre pièces feraient douze lampes ponctuelles.
          Portée courte : au-delà, la lumière viendrait blanchir le sol. */}
      <pointLight position={[0, 40, 46]} intensity={2.2} distance={78} decay={0} color="#ffffff" />
      <pointLight position={[-46, 40, 34]} intensity={1.5} distance={72} decay={0} color="#bcd8ff" />
      <pointLight position={[46, 30, 30]} intensity={1.3} distance={72} decay={0} color="#ffd9b0" />

      {choices.map((id, i) => {
        const part = asPart(id)
        if (!part) return null
        const state = !answered ? '' : id === good ? 'good' : id === answered ? 'bad' : 'dim'
        return (
          <group key={id}>
            {/* La pièce elle-même est cliquable : c'est le geste naturel.
                L'inclinaison est posée AUTOUR du présentoir, donc en dehors
                de la rotation : on regarde toujours la pièce d'un peu au-
                dessus, et une pièce plate ne disparaît plus par la tranche
                à chaque demi-tour. */}
            <group position={[columns[i], ROW_Y, 0]} rotation={[-0.34, 0, 0]}>
              <group
                onClick={() => !answered && answer(id)}
                onPointerOver={(e) => {
                  e.stopPropagation()
                  if (answered) return
                  setHover(id)
                  document.body.style.cursor = 'pointer'
                }}
                onPointerOut={() => {
                  setHover((h) => (h === id ? null : h))
                  document.body.style.cursor = ''
                }}
              >
                {hover === id && !answered && <PieceHalo size={size} />}
                <Showcase id={part} y={0} target={size} spin={0.15} lights={false} pedestal={false} />
              </group>
            </group>
            {/* Le nom est ancré SOUS sa pièce : les deux restent alignés
                quelle que soit la taille de la fenêtre. */}
            <Html position={[columns[i], NAME_Y, 0]} center zIndexRange={[45, 0]}>
              <button
                className={`rolechoice ${state}`}
                style={{ '--c': COMPONENTS[id].color } as React.CSSProperties}
                disabled={!!answered}
                onClick={() => {
                  sfx.click()
                  answer(id)
                }}
              >
                {soloShortName(id)}
              </button>
            </Html>
          </group>
        )
      })}
    </>
  )
}

/* ---------------- Interface ---------------- */

export function RolesUi() {
  const ex = useExercise()
  const { order, index, finished } = useRoles()
  const [result, setResult] = useState<{ stars: 0 | 1 | 2 | 3; xp: number } | null>(null)
  const ready = useReady()

  useEffect(() => {
    const list = shuffle(PAIRS.map((p) => p.id))
    useRoles.setState({
      order: list,
      index: 0,
      choices: makeChoices(list[0]),
      answered: null,
      finished: false,
    })
    useExercise.getState().begin('roles', list.length)
    useBuild.getState().resetBuild(ALL_INSTALLED)
    useBuild.getState().set({ explode: 0, labels: false, running: true, powered: true })
  }, [])

  useEffect(() => {
    if (ready && finished && !result) setResult(useExercise.getState().finish())
  }, [ready, finished, result])

  const current = order[index]
  const role = useMemo(() => (current ? ROLE_BY_ID[current] : ''), [current])

  const hint = () => {
    if (!current) return
    useExercise.getState().hint()
    useExercise.getState().info('Indice', COMPONENTS[current].analogy)
  }

  return (
    <>
      <ExerciseBar onHint={hint} />
      <ExerciseIntro>
        <div className="intro-tips">
          <div>
            <b>📖 Lis la phrase</b> elle décrit ce que fait UNE des quatre pièces
          </div>
          <div>
            <b>👆 Clique</b> sur la bonne pièce, ou sur son nom
          </div>
        </div>
      </ExerciseIntro>

      {ex.phase === 'play' && current && (
        <div className="rolequiz">
          <div className="rolequiz-label">
            Question {index + 1} / {order.length} — quelle pièce fait ça&nbsp;?
          </div>
          <p className="rolequiz-role">{role}</p>
        </div>
      )}
      <ExerciseEnd result={result} />
    </>
  )
}
