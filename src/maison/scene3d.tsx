/**
 * Les pièces qui tournent — dans les leçons ET dans les jeux.
 *
 * Un jeu peut montrer quatre pièces à la fois (les paires, « quelle pièce… ? »). Quatre
 * canvas, ce serait quatre moteurs 3D sur un téléphone d'élève : quatre fois les
 * matériaux à compiler, quatre fois la mémoire, et un navigateur mobile qui finit par
 * en couper un. Il n'y en a donc QU'UN, posé sur toute la page (`Toile`), et chaque
 * pièce est une fenêtre découpée dedans (`View`, de drei) à l'endroit exact de sa case.
 *
 * La toile est transparente et ne reçoit aucun toucher : ce sont les boutons, dessous,
 * qui répondent. Elle passe SOUS les bandeaux collés en bas de l'écran (voir z-index
 * dans maison.css) : une fenêtre 3D ne sait pas qu'un bandeau la recouvre.
 *
 * Sans 3D (vieux téléphone, panne du moteur), tout retombe sur la photo fixe, ou sur la
 * vignette de secours : la page reste entièrement utilisable.
 */

import { Environment, Lightformer, PerspectiveCamera, View } from '@react-three/drei'
import { Canvas } from '@react-three/fiber'
import { Component, Suspense, type ReactNode } from 'react'
import * as THREE from 'three'
import { create } from 'zustand'
import { Showcase } from '@/three/Showcase'
import { PIECES, type PieceId } from './contenu'
import { Photo } from './photo'

/** Le téléphone sait-il afficher de la 3D ? Vérifié une fois, sans rien monter. */
export const WEBGL = (() => {
  try {
    const c = document.createElement('canvas')
    return !!(c.getContext('webgl2') ?? c.getContext('webgl'))
  } catch {
    return false
  }
})()

/** La 3D est-elle utilisable ? Passe à faux si le moteur tombe en cours de route. */
const useTroisD = create<{ ok: boolean }>()(() => ({ ok: WEBGL }))

/** Pour les jeux : les pièces tournent-elles ? */
export function useTroisDOk(): boolean {
  return useTroisD((s) => s.ok)
}

/** Une panne de la 3D ne doit jamais emporter la page. */
export class Garde extends Component<
  { children: ReactNode; secours?: ReactNode; onPanne?: () => void },
  { casse: boolean }
> {
  state = { casse: false }
  static getDerivedStateFromError() {
    return { casse: true }
  }
  componentDidCatch() {
    this.props.onPanne?.()
  }
  render() {
    return this.state.casse ? (this.props.secours ?? null) : this.props.children
  }
}

/** L'unique moteur 3D de la page. À monter une fois, tout en haut. */
export function Toile() {
  const ok = useTroisD((s) => s.ok)
  if (!ok) return null
  return (
    <Garde onPanne={() => useTroisD.setState({ ok: false })}>
      <Canvas
        className="toile"
        dpr={[1, 1.5]}
        gl={{
          antialias: true,
          alpha: true,
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.34,
        }}
        style={{ position: 'fixed', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}
        onCreated={({ gl }) => {
          // Le navigateur peut reprendre le moteur (mémoire, onglet en arrière-plan
          // trop longtemps) : on bascule sur les photos plutôt que de laisser des
          // cases vides.
          gl.domElement.addEventListener('webglcontextlost', () => useTroisD.setState({ ok: false }))
        }}
      >
        <View.Port />
      </Canvas>
    </Garde>
  )
}

/** Vitesse de rotation, en tours par seconde : un tour complet en sept secondes. */
const TOUR = 0.14

/** Le contenu d'une fenêtre : la pièce, sa caméra, son éclairage. */
function Decor({ piece }: { piece: PieceId }) {
  return (
    <>
      {/* Même cadrage que three/PartSpinner : `target = 17` remplit la hauteur. */}
      <PerspectiveCamera
        makeDefault
        fov={32}
        near={1}
        far={400}
        position={[8, 9, 43]}
        onUpdate={(c) => c.lookAt(0, 0, 0)}
      />
      <ambientLight intensity={1.25} />
      <Suspense fallback={null}>
        <Environment resolution={64} frames={1} background={false}>
          <Lightformer
            form="rect"
            intensity={3.4}
            position={[0, 11, 3]}
            rotation={[Math.PI / 2, 0, 0]}
            scale={[12, 8, 1]}
            color="#ffffff"
          />
          <Lightformer
            form="rect"
            intensity={2.1}
            position={[8, 2, 5]}
            rotation={[0, -Math.PI / 2, 0]}
            scale={[9, 7, 1]}
            color="#cfe4ff"
          />
        </Environment>
        <Showcase id={PIECES[piece].modele} spin={TOUR} target={17} y={0} pedestal={false} />
      </Suspense>
    </>
  )
}

/**
 * Une pièce qui tourne, dans une case de jeu.
 * Elle occupe la place d'une `Photo` (mêmes classes, même format 4/3) : un jeu passe de
 * l'une à l'autre sans que sa mise en page bouge.
 */
export function Piece3D({ piece, className = '' }: { piece: PieceId; className?: string }) {
  const ok = useTroisD((s) => s.ok)
  if (!ok) return <Photo piece={piece} className={className} />
  return (
    <span className={`photo vue3d ${className}`} aria-hidden>
      {/* `key` : changer de pièce remonte la fenêtre, donc repart d'une rotation à zéro. */}
      <View key={piece} className="vue">
        <Decor piece={piece} />
      </View>
    </span>
  )
}

/** La grande pièce qui tourne, en tête d'une carte de leçon (fond sombre). */
export function Tourne({ piece }: { piece: PieceId }) {
  const ok = useTroisD((s) => s.ok)
  return (
    <div className="scene">
      {ok ? (
        <View key={piece} className="vue">
          <Decor piece={piece} />
        </View>
      ) : (
        <Photo piece={piece} className="grande" />
      )}
    </div>
  )
}
