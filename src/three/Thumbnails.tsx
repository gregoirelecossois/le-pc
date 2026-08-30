/**
 * Photos de catalogue des pièces, prises en direct dans le moteur 3D.
 *
 * La fiche de révision montre chaque composant EN IMAGE, à côté de son
 * explication. Plutôt que d'embarquer des photos toutes faites, on
 * photographie les modèles du jeu : l'élève retrouve exactement, sur sa
 * feuille, l'objet qu'il vient de manipuler à l'écran.
 *
 * Le principe est simple : un petit rendu 3D hors écran affiche les pièces
 * l'une après l'autre et, toutes les quelques images, recopie le contenu du
 * canvas dans un JPEG. Ces JPEG partent ensuite tels quels dans le PDF.
 */

import { Environment, Lightformer } from '@react-three/drei'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Suspense, useEffect, useMemo } from 'react'
import { create } from 'zustand'
import * as THREE from 'three'
import { DevCapture } from './DevCapture'
import { PeriShowcase, Showcase } from './Showcase'
import { CaseShell } from './models'
import type { PartId } from './models'
import type { PeripheralModelId } from './models/PeripheralParts'
import type { Vec3 } from './layout'

/** Une prise de vue à réaliser. */
export type ShotId = `part:${PartId}` | `peri:${PeripheralModelId}` | 'case'

/** Une photo : le JPEG et sa taille RÉELLE en pixels. */
export interface Shot {
  url: string
  w: number
  h: number
}

interface ThumbState {
  shots: Record<string, Shot>
  /** Prise de vue en cours dans la file */
  index: number
  queue: ShotId[]
}

const useThumbs = create<ThumbState>()(() => ({ shots: {}, index: 0, queue: [] }))

/** Les images déjà prises (composant React : se met à jour toute seule). */
export function useThumbShots() {
  const shots = useThumbs((s) => s.shots)
  const index = useThumbs((s) => s.index)
  const queue = useThumbs((s) => s.queue)
  return { shots, done: index, total: queue.length, ready: queue.length > 0 && index >= queue.length }
}

/**
 * Nombre d'images laissées au moteur avant de déclencher la photo.
 *
 * La pièce vient de changer : il faut une image pour que React la monte,
 * une autre pour que les matériaux et l'environnement soient à jour. Trois
 * de plus par sécurité — l'ensemble reste imperceptible (23 pièces en
 * moins de deux secondes).
 */
const SETTLE = 5

/** Taille du studio, donc du JPEG produit. */
export const THUMB_W = 640
export const THUMB_H = 480

/**
 * Réglages propres à la photo.
 *
 * Dans le jeu, chaque objet tourne sur son présentoir : un mauvais angle
 * ne dure qu'une seconde. Ici l'image est FIXE, et deux objets se lisaient
 * mal — le clavier, vu par la tranche, et la clé USB, minuscule dans le
 * cadre.
 */
const PART_SHOT: Partial<Record<PartId, { yaw?: number }>> = {
  // La carte mère se regarde de face : c'est ainsi qu'on lit ses slots.
  motherboard: { yaw: 0 },
}

const PERI_SHOT: Partial<
  Record<PeripheralModelId, { target?: number; tilt?: number; rot?: Vec3 }>
> = {
  // `rot` impose la pose : premier angle = on bascule le dessus vers la
  // caméra, deuxième = on tourne l'objet de trois quarts.
  keyboard: { rot: [0.3, -0.5, 0] },
  mouse: { rot: [0.5, -0.6, 0], target: 17 },
  gamepad: { rot: [0.42, -0.3, 0] },
  usbkey: { rot: [0.34, 0.95, 0], target: 28 },
}

function Photographer() {
  const gl = useThree((s) => s.gl)
  const { index, queue } = useThumbs()
  const shot = queue[index]

  useFrame(() => {
    const s = useThumbs.getState()
    if (s.index >= s.queue.length) return
    // Le compteur appartient à UNE pièce : dès que la file avance, il
    // repart de zéro. Sans cela, sur une machine lente ou une image
    // retardée, la photo pouvait être prise avant que React n'ait monté la
    // pièce suivante — et l'objet précédent se retrouvait sous la mauvaise
    // étiquette.
    if (framesFor !== s.index) {
      framesFor = s.index
      frames = 0
      return
    }
    frames++
    if (frames < SETTLE) return
    const c = gl.domElement
    // La taille est relevée sur le canvas lui-même : elle dépend de la
    // densité d'écran, et le PDF doit annoncer la vraie dimension du JPEG.
    const shot: Shot = { url: c.toDataURL('image/jpeg', 0.88), w: c.width, h: c.height }
    useThumbs.setState({ shots: { ...s.shots, [s.queue[s.index]]: shot }, index: s.index + 1 })
  })

  if (!shot) return null

  // Le boîtier n'a pas de modèle « pièce » : il est le décor de tous les
  // autres. On le présente donc à part, panneau entrouvert.
  if (shot === 'case') {
    return (
      <group scale={19 / 47.4}>
        <group position={[0, -23.5, 0]}>
          <CaseShell panelOpen={0} hideFront={false} powered={false} />
        </group>
      </group>
    )
  }

  const [kind, id] = shot.split(':') as ['part' | 'peri', string]
  const shotOpts = PERI_SHOT[id as PeripheralModelId] ?? {}

  return kind === 'part' ? (
    // De trois quarts, comme une photo de catalogue : de face, une
    // alimentation ou un ventirad ne seraient qu'un rectangle noir.
    <group rotation={[0, PART_SHOT[id as PartId]?.yaw ?? -0.38, 0]}>
      <Showcase id={id as PartId} spin={0} target={17} y={0} pedestal={false} />
    </group>
  ) : (
    // Un quart de tour : de face, un clavier ou une enceinte se réduisent à
    // un rectangle. De trois quarts, on lit tout de suite l'objet.
    <group rotation={[shotOpts.tilt ?? 0, shotOpts.rot ? 0 : -0.5, 0]}>
      <PeriShowcase
        id={id as PeripheralModelId}
        spin={0}
        target={shotOpts.target ?? 19}
        rot={shotOpts.rot}
        y={0}
        pedestal={false}
      />
    </group>
  )
}

let frames = 0
/** Indice de la pièce à laquelle `frames` se rapporte. */
let framesFor = -1

/**
 * Le studio : un canvas hors écran, monté seulement le temps des photos.
 *
 * Il n'est pas caché par `display: none` — un canvas non affiché n'est pas
 * dessiné par le navigateur, et on ne photographierait qu'un carré vide.
 * Il est donc bien rendu, mais transparent et derrière tout le reste.
 */
export function ThumbnailStudio({ queue }: { queue: ShotId[] }) {
  const stable = useMemo(() => queue, [queue.join('|')]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const s = useThumbs.getState()
    // Rien à refaire si la série a déjà été photographiée.
    if (stable.every((k) => s.shots[k])) {
      useThumbs.setState({ queue: stable, index: stable.length })
      return
    }
    frames = 0
    framesFor = -1
    useThumbs.setState({ queue: stable, index: 0 })
  }, [stable])

  const { ready } = useThumbShots()
  if (ready) return null

  return (
    <div className="thumbstudio" style={{ width: THUMB_W, height: THUMB_H }} aria-hidden>
      <Canvas
        dpr={1}
        gl={{
          antialias: true,
          // indispensable : sans cela le contenu du canvas est effacé
          // avant qu'on puisse le recopier
          preserveDrawingBuffer: true,
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.28,
        }}
        camera={{ fov: 32, near: 1, far: 400, position: [10, 10, 44] }}
      >
        {/* Fond très clair : ces images finissent sur une feuille blanche. */}
        <color attach="background" args={['#eef2f8']} />
        <ambientLight intensity={1.35} />
        <Suspense fallback={null}>
          <Environment resolution={64} frames={1} background={false}>
            <Lightformer
              form="rect"
              intensity={3.6}
              position={[0, 11, 3]}
              rotation={[Math.PI / 2, 0, 0]}
              scale={[12, 8, 1]}
              color="#ffffff"
            />
            <Lightformer
              form="rect"
              intensity={2.2}
              position={[8, 2, 5]}
              rotation={[0, -Math.PI / 2, 0]}
              scale={[9, 7, 1]}
              color="#dbeaff"
            />
          </Environment>
          <pointLight position={[18, 16, 34]} intensity={2.2} distance={150} decay={0} />
          <pointLight position={[-26, 8, 18]} intensity={1.2} distance={150} decay={0} color="#cfe0ff" />
          <Photographer />
          {import.meta.env.DEV && <DevCapture secondary />}
        </Suspense>
      </Canvas>
    </div>
  )
}
