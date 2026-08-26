/**
 * Câbles internes et repères de branchement.
 */

import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { Html } from '@react-three/drei'
import { CONNECTORS, type CableDef, type ConnectorId } from '@/data/cables'
import type { Vec3 } from './layout'

/**
 * Les deux états de « cliquabilité » d'un repère.
 *
 * On PERMUTE ces deux fonctions, on ne remet jamais la propriété à
 * `undefined` : react-three-fiber ne sait pas restaurer la méthode
 * d'origine d'un objet three.js, si bien qu'un repère rendu une fois
 * inerte le restait pour toujours. C'est exactement ce qui arrivait au
 * faisceau du bloc d'alimentation : il devenait inerte pendant la
 * deuxième moitié du câble 1, et le câble 2 ne pouvait plus démarrer.
 */
const HIT = THREE.Mesh.prototype.raycast
const NO_HIT: THREE.Mesh['raycast'] = () => null

/* ---------------------------------------------------------------- */
/*  Un câble : courbe souple entre deux points                       */
/* ---------------------------------------------------------------- */

/**
 * Construit une courbe qui « tombe » entre les deux extrémités,
 * comme un vrai câble qui n'est pas tendu.
 */
function cableCurve(from: Vec3, to: Vec3) {
  const a = new THREE.Vector3(...from)
  const b = new THREE.Vector3(...to)
  const dist = a.distanceTo(b)
  const sag = Math.min(6, dist * 0.22)

  const m1 = a.clone().lerp(b, 0.3)
  const m2 = a.clone().lerp(b, 0.7)
  // le câble s'écarte vers le plateau (x négatif) et retombe
  m1.y -= sag
  m1.x -= dist * 0.1
  m2.y -= sag * 0.6
  m2.x -= dist * 0.05

  return new THREE.CatmullRomCurve3([a, m1, m2, b], false, 'catmullrom', 0.4)
}

export function Cable3D({
  cable,
  animate = false,
  preview = false,
}: {
  cable: CableDef
  animate?: boolean
  /** Tracé fantôme : montre le trajet AVANT de brancher (guidage) */
  preview?: boolean
}) {
  const to = CONNECTORS[cable.to].position
  const geo = useMemo(() => {
    const curve = cableCurve(cable.from, to)
    return new THREE.TubeGeometry(curve, 36, cable.thickness, 7, false)
  }, [cable, to])

  const mesh = useRef<THREE.Mesh>(null)
  const t = useRef(animate ? 0 : 1)
  useFrame((state, dt) => {
    if (!mesh.current) return
    if (preview) {
      const m = mesh.current.material as THREE.MeshStandardMaterial
      m.opacity = 0.22 + (Math.sin(state.clock.elapsedTime * 3.2) * 0.5 + 0.5) * 0.2
      return
    }
    if (t.current < 1) {
      t.current = Math.min(1, t.current + dt * 2)
      mesh.current.scale.setScalar(0.9 + t.current * 0.1)
      const m = mesh.current.material as THREE.MeshStandardMaterial
      m.opacity = t.current
    }
  })

  return (
    <mesh ref={mesh} geometry={geo} castShadow={!preview} raycast={NO_HIT}>
      <meshStandardMaterial
        color={preview ? '#4dd0e1' : cable.color}
        roughness={0.72}
        metalness={0.12}
        transparent
        depthWrite={!preview}
        opacity={preview ? 0.3 : 1}
      />
    </mesh>
  )
}

/* ---------------------------------------------------------------- */
/*  Repère de branchement cliquable                                  */
/* ---------------------------------------------------------------- */

export type MarkerState = 'idle' | 'active' | 'ok' | 'bad' | 'dim'


const MARKER_COLOR: Record<MarkerState, string> = {
  idle: '#4dd0e1',
  active: '#ffd166',
  ok: '#66d17a',
  bad: '#ff6b6b',
  dim: '#7b8496',
}

const MARKER_OPACITY: Record<MarkerState, number> = {
  idle: 0.22,
  active: 0.4,
  ok: 0.34,
  bad: 0.36,
  dim: 0.1,
}

export function ConnectorMarker({
  id,
  state = 'idle',
  label,
  onClick,
}: {
  id: ConnectorId
  state?: MarkerState
  label?: string
  onClick?: (id: ConnectorId) => void
}) {
  const c = CONNECTORS[id]
  const g = useRef<THREE.Group>(null)

  useFrame((s) => {
    if (!g.current) return
    const k =
      state === 'idle' || state === 'dim' ? 1 : 1 + Math.sin(s.clock.elapsedTime * 4.5) * 0.16
    g.current.scale.setScalar(k)
  })

  const color = MARKER_COLOR[state]

  return (
    <group position={c.position}>
      <group ref={g}>
        <mesh
          raycast={onClick ? HIT : NO_HIT}
          onClick={(e) => {
            e.stopPropagation()
            onClick?.(id)
          }}
          onPointerOver={(e) => {
            e.stopPropagation()
            if (onClick) document.body.style.cursor = 'pointer'
          }}
          onPointerOut={() => (document.body.style.cursor = '')}
        >
          <sphereGeometry args={[c.radius, 18, 14]} />
          <meshBasicMaterial color={color} transparent opacity={MARKER_OPACITY[state]} depthWrite={false} />
        </mesh>
        <mesh raycast={NO_HIT}>
          <sphereGeometry args={[c.radius * 0.42, 14, 10]} />
          <meshBasicMaterial
            color={color}
            transparent
            opacity={state === 'dim' ? 0.35 : 0.85}
            depthWrite={false}
          />
        </mesh>
      </group>
      {label && (
        <Html position={[0, c.radius + 1.2, 0]} center zIndexRange={[35, 0]} style={{ pointerEvents: 'none' }}>
          <div className="tag3d" style={{ borderColor: color }}>
            {label}
          </div>
        </Html>
      )}
    </group>
  )
}

/* ---------------------------------------------------------------- */
/*  Repère sur une prise arrière (périphériques)                      */
/* ---------------------------------------------------------------- */

export function PortMarker({
  position,
  radius = 1.1,
  state = 'idle',
  label,
  onClick,
}: {
  position: Vec3
  radius?: number
  state?: MarkerState
  label?: string
  onClick?: () => void
}) {
  const g = useRef<THREE.Group>(null)
  useFrame((s) => {
    if (!g.current) return
    const k =
      state === 'idle' || state === 'dim' ? 1 : 1 + Math.sin(s.clock.elapsedTime * 5) * 0.16
    g.current.scale.setScalar(k)
  })
  const color = MARKER_COLOR[state]

  return (
    <group position={position}>
      <group ref={g}>
        <mesh
          raycast={onClick ? HIT : NO_HIT}
          onClick={(e) => {
            e.stopPropagation()
            onClick?.()
          }}
          onPointerOver={(e) => {
            e.stopPropagation()
            if (onClick) document.body.style.cursor = 'pointer'
          }}
          onPointerOut={() => (document.body.style.cursor = '')}
        >
          <sphereGeometry args={[radius, 16, 12]} />
          <meshBasicMaterial color={color} transparent opacity={MARKER_OPACITY[state]} depthWrite={false} />
        </mesh>
        <mesh raycast={NO_HIT}>
          <sphereGeometry args={[radius * 0.38, 12, 10]} />
          <meshBasicMaterial
            color={color}
            transparent
            opacity={state === 'dim' ? 0.4 : 0.9}
            depthWrite={false}
          />
        </mesh>
      </group>
      {label && (
        <Html position={[0, radius + 0.9, 0]} center zIndexRange={[35, 0]} style={{ pointerEvents: 'none' }}>
          <div className="tag3d" style={{ borderColor: color }}>
            {label}
          </div>
        </Html>
      )}
    </group>
  )
}
