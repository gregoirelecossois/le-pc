/**
 * Le décor : caméra, lumières, environnement, sol.
 *
 * L'environnement est fabriqué avec des « Lightformer » (des panneaux
 * lumineux virtuels) plutôt qu'avec une image HDRI téléchargée : le rendu
 * reste réaliste et le jeu fonctionne sans Internet.
 */

import { Environment, Lightformer, OrbitControls } from '@react-three/drei'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Suspense, useEffect, useRef, type ReactNode } from 'react'
import * as THREE from 'three'
import { CAMERA_VIEWS, type CameraViewId } from './layout'
import { useGame } from '@/state/useGame'
import { DevCapture } from './DevCapture'

/* ---------------------------------------------------------------- */
/*  Déplacement doux de la caméra vers une vue préréglée              */
/* ---------------------------------------------------------------- */

const tmpPos = new THREE.Vector3()
const tmpTarget = new THREE.Vector3()

function CameraRig({
  view,
  seq,
  controls,
  enabled,
}: {
  view: CameraViewId
  /**
   * Numéro de la demande de cadrage.
   *
   * Sans lui, redemander la vue COURANTE ne relançait rien : après avoir
   * fait pivoter la machine à la souris, le bouton « Recadrer » restait
   * sans effet puisque l'identifiant de vue, lui, n'avait pas changé.
   */
  seq: number
  controls: React.RefObject<any>
  enabled: boolean
}) {
  const { camera } = useThree()
  const goal = useRef({ pos: new THREE.Vector3(), target: new THREE.Vector3(), active: false })

  useEffect(() => {
    const v = CAMERA_VIEWS[view]
    goal.current.pos.set(...v.position)
    goal.current.target.set(...v.target)
    goal.current.active = true
  }, [view, seq])

  useFrame((_, dt) => {
    if (!goal.current.active || !controls.current) return
    const k = 1 - Math.pow(0.0016, dt)
    tmpPos.copy(camera.position).lerp(goal.current.pos, k)
    camera.position.copy(tmpPos)
    tmpTarget.copy(controls.current.target).lerp(goal.current.target, k)
    controls.current.target.copy(tmpTarget)
    controls.current.update()
    if (
      camera.position.distanceTo(goal.current.pos) < 0.4 &&
      controls.current.target.distanceTo(goal.current.target) < 0.4
    ) {
      goal.current.active = false
    }
  })

  // Un geste de l'élève interrompt le déplacement automatique
  useEffect(() => {
    const c = controls.current
    if (!c) return
    const stop = () => (goal.current.active = false)
    c.addEventListener('start', stop)
    return () => c.removeEventListener('start', stop)
  }, [controls, enabled])

  return null
}

/**
 * Décale le sujet dans l'image sans bouger la caméra.
 * Sert à l'écran d'accueil : la tour se place à droite, le texte à gauche.
 */
function ViewOffset({ x }: { x: number }) {
  const { camera, size } = useThree()
  useEffect(() => {
    const cam = camera as THREE.PerspectiveCamera
    if (!x) cam.clearViewOffset()
    else cam.setViewOffset(size.width, size.height, -x * size.width, 0, size.width, size.height)
    cam.updateProjectionMatrix()
    return () => {
      cam.clearViewOffset()
      cam.updateProjectionMatrix()
    }
  }, [camera, size.width, size.height, x])
  return null
}

/* ---------------------------------------------------------------- */
/*  Éclairage                                                        */
/* ---------------------------------------------------------------- */

function Lights({ quality }: { quality: 'bas' | 'moyen' | 'eleve' }) {
  const shadows = quality !== 'bas'
  const mapSize = quality === 'eleve' ? 2048 : 1024

  return (
    <>
      <ambientLight intensity={1.15} />

      {/* Lumière principale, trois-quarts avant gauche */}
      <directionalLight
        position={[70, 90, 55]}
        intensity={2.7}
        color="#fff6e8"
        castShadow={shadows}
        shadow-mapSize={[mapSize, mapSize]}
        shadow-bias={-0.0009}
        shadow-normalBias={0.35}
      >
        <orthographicCamera attach="shadow-camera" args={[-60, 60, 70, -30, 20, 260]} />
      </directionalLight>

      {/* Contre-jour froid, décolle les pièces du fond */}
      <directionalLight position={[-60, 45, -70]} intensity={1.15} color="#9ec8ff" />
      {/* Rebond au sol */}
      <directionalLight position={[10, -30, 30]} intensity={0.45} color="#5b6b85" />
      {/* Éclairage d'appoint DANS le boîtier : sans lui l'intérieur reste noir */}
      <pointLight position={[26, 30, 4]} intensity={1.5} distance={130} decay={0} color="#dbe8ff" />
      <pointLight position={[10, 12, -12]} intensity={0.7} distance={90} decay={0} color="#cddcf5" />
      <pointLight position={[6, 38, 26]} intensity={0.6} distance={90} decay={0} color="#ffe9cc" />
      {/* Éclaire le panneau arrière : sans lui, l'exercice sur les
          périphériques se joue dans le noir. */}
      <pointLight position={[2, 30, 74]} intensity={0.62} distance={150} decay={0} color="#e8f0ff" />
    </>
  )
}

/** Panneaux lumineux : ce sont eux qui donnent les reflets sur le métal. */
function StudioEnvironment({ quality }: { quality: 'bas' | 'moyen' | 'eleve' }) {
  return (
    <Environment resolution={quality === 'eleve' ? 256 : 128} frames={1} background={false}>
      <color attach="background" args={['#101318']} />
      {/* Grand panneau au-dessus : reflet allongé sur les surfaces brossées */}
      <Lightformer form="rect" intensity={3.2} position={[0, 12, 0]} rotation={[Math.PI / 2, 0, 0]} scale={[14, 8, 1]} color="#ffffff" />
      {/* Panneaux latéraux */}
      <Lightformer form="rect" intensity={2.4} position={[9, 3, 4]} rotation={[0, -Math.PI / 2, 0]} scale={[10, 7, 1]} color="#cfe4ff" />
      <Lightformer form="rect" intensity={1.5} position={[-9, 2, -3]} rotation={[0, Math.PI / 2, 0]} scale={[10, 6, 1]} color="#8fb6e8" />
      {/* Traits lumineux qui glissent sur les arêtes */}
      <Lightformer form="rect" intensity={4} position={[3, 6, -9]} rotation={[0, 0, Math.PI / 4]} scale={[1, 9, 1]} color="#ffffff" />
      <Lightformer form="rect" intensity={2.6} position={[-5, 5, 8]} rotation={[0, Math.PI, 0]} scale={[8, 4, 1]} color="#ffe8c8" />
      {/* Sol sombre pour éviter les reflets laiteux par en dessous */}
      <Lightformer form="rect" intensity={0.35} position={[0, -8, 0]} rotation={[-Math.PI / 2, 0, 0]} scale={[16, 16, 1]} color="#20242c" />
    </Environment>
  )
}

/* ---------------------------------------------------------------- */
/*  Sol                                                              */
/* ---------------------------------------------------------------- */

function Ground({ shadows }: { shadows: boolean }) {
  return (
    <>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.85, 0]} receiveShadow={shadows}>
        <planeGeometry args={[900, 900]} />
        <meshStandardMaterial color="#0f1116" roughness={0.92} metalness={0.05} />
      </mesh>
      {/* Cercle plus clair sous la machine : l'atelier est éclairé au-dessus */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.8, 0]}>
        <circleGeometry args={[95, 48]} />
        <meshStandardMaterial color="#171a21" roughness={0.85} metalness={0.1} transparent opacity={0.9} />
      </mesh>
    </>
  )
}

/* ---------------------------------------------------------------- */
/*  Canvas                                                           */
/* ---------------------------------------------------------------- */

export interface StageProps {
  children: ReactNode
  view?: CameraViewId
  /** Incrémenté à chaque demande de cadrage, même vers la vue courante */
  viewSeq?: number
  /** Bloque l'orbite pendant un glisser-déposer */
  controlsEnabled?: boolean
  /** Rotation lente automatique (écran d'accueil) */
  autoRotate?: boolean
  /** Décale le sujet dans l'image (-1 .. 1). Positif = vers la droite. */
  frameOffset?: number
  /** Rendu à l'arrêt (économise la batterie sur les écrans de menu) */
  frameloop?: 'always' | 'demand'
  onPointerMissed?: () => void
}

export function Stage({
  children,
  view = 'overview',
  viewSeq = 0,
  controlsEnabled = true,
  autoRotate = false,
  frameOffset = 0,
  onPointerMissed,
}: StageProps) {
  const quality = useGame((s) => s.quality)
  const controls = useRef<any>(null)
  const shadows = quality !== 'bas'

  return (
    <Canvas
      shadows={shadows ? 'soft' : false}
      dpr={quality === 'eleve' ? [1, 2] : quality === 'moyen' ? [1, 1.5] : 1}
      gl={{
        antialias: quality !== 'bas',
        powerPreference: 'high-performance',
        // en développement : permet la capture du canvas pour vérifier le rendu
        preserveDrawingBuffer: import.meta.env.DEV,
        toneMapping: THREE.ACESFilmicToneMapping,
        toneMappingExposure: 1.32,
      }}
      camera={{ fov: 34, near: 1, far: 900, position: [...CAMERA_VIEWS.overview.position] }}
      onPointerMissed={onPointerMissed}
    >
      <color attach="background" args={['#0a0c11']} />
      <fog attach="fog" args={['#0a0c11', 190, 460]} />

      <Suspense fallback={null}>
        <Lights quality={quality} />
        <StudioEnvironment quality={quality} />
        <Ground shadows={shadows} />
        {children}
      </Suspense>

      <OrbitControls
        ref={controls}
        enabled={controlsEnabled}
        target={[...CAMERA_VIEWS.overview.target]}
        autoRotate={autoRotate}
        autoRotateSpeed={0.55}
        enableDamping
        dampingFactor={0.08}
        rotateSpeed={0.75}
        zoomSpeed={0.9}
        panSpeed={0.7}
        minDistance={26}
        maxDistance={230}
        minPolarAngle={0.15}
        maxPolarAngle={Math.PI / 2 + 0.28}
        makeDefault
      />
      <CameraRig view={view} seq={viewSeq} controls={controls} enabled={controlsEnabled} />
      <ViewOffset x={frameOffset} />
      {import.meta.env.DEV && <DevCapture />}
    </Canvas>
  )
}
