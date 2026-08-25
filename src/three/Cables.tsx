/**
 * Câbles internes et repères de branchement.
 */

import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { Html } from '@react-three/drei'
import { CONNECTORS, type CableDef, type ConnectorId } from '@/data/cables'
import type { Vec3 } from './layout'

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

export function Cable3D({ cable, animate = false }: { cable: CableDef; animate?: boolean }) {
  const to = CONNECTORS[cable.to].position
  const geo = useMemo(() => {
    const curve = cableCurve(cable.from, to)
    return new THREE.TubeGeometry(curve, 36, cable.thickness, 7, false)
  }, [cable, to])

  const mesh = useRef<THREE.Mesh>(null)
  const t = useRef(animate ? 0 : 1)
  useFrame((_, dt) => {
    if (!mesh.current) return
    if (t.current < 1) {
      t.current = Math.min(1, t.current + dt * 2)
      mesh.current.scale.setScalar(0.9 + t.current * 0.1)
      const m = mesh.current.material as THREE.MeshStandardMaterial
      m.opacity = t.current
    }
  })

  return (
    <mesh ref={mesh} geometry={geo} castShadow>
      <meshStandardMaterial color={cable.color} roughness={0.72} metalness={0.12} transparent />
    </mesh>
  )
}

/* ---------------------------------------------------------------- */
/*  Repère de branchement cliquable                                  */
/* ---------------------------------------------------------------- */

export function ConnectorMarker({
  id,
  state = 'idle',
  label,
  onClick,
}: {
  id: ConnectorId
  state?: 'idle' | 'active' | 'ok' | 'bad'
  label?: string
  onClick?: (id: ConnectorId) => void
}) {
  const c = CONNECTORS[id]
  const g = useRef<THREE.Group>(null)

  useFrame((s) => {
    if (!g.current) return
    const k = state === 'idle' ? 1 : 1 + Math.sin(s.clock.elapsedTime * 4.5) * 0.13
    g.current.scale.setScalar(k)
  })

  const color =
    state === 'ok' ? '#66d17a' : state === 'bad' ? '#ff6b6b' : state === 'active' ? '#ffd166' : '#4dd0e1'

  return (
    <group position={c.position}>
      <group ref={g}>
        <mesh
          onClick={(e) => {
            e.stopPropagation()
            onClick?.(id)
          }}
          onPointerOver={(e) => {
            e.stopPropagation()
            document.body.style.cursor = 'pointer'
          }}
          onPointerOut={() => (document.body.style.cursor = '')}
        >
          <sphereGeometry args={[c.radius, 18, 14]} />
          <meshBasicMaterial color={color} transparent opacity={state === 'idle' ? 0.22 : 0.36} depthWrite={false} />
        </mesh>
        <mesh>
          <sphereGeometry args={[c.radius * 0.42, 14, 10]} />
          <meshBasicMaterial color={color} transparent opacity={0.85} depthWrite={false} />
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
  state?: 'idle' | 'active' | 'ok' | 'bad'
  label?: string
  onClick?: () => void
}) {
  const g = useRef<THREE.Group>(null)
  useFrame((s) => {
    if (!g.current) return
    const k = state === 'idle' ? 1 : 1 + Math.sin(s.clock.elapsedTime * 5) * 0.14
    g.current.scale.setScalar(k)
  })
  const color =
    state === 'ok' ? '#66d17a' : state === 'bad' ? '#ff6b6b' : state === 'active' ? '#ffd166' : '#4dd0e1'

  return (
    <group position={position}>
      <group ref={g}>
        <mesh
          onClick={(e) => {
            e.stopPropagation()
            onClick?.()
          }}
          onPointerOver={(e) => {
            e.stopPropagation()
            document.body.style.cursor = 'pointer'
          }}
          onPointerOut={() => (document.body.style.cursor = '')}
        >
          <sphereGeometry args={[radius, 16, 12]} />
          <meshBasicMaterial color={color} transparent opacity={0.28} depthWrite={false} />
        </mesh>
        <mesh>
          <sphereGeometry args={[radius * 0.38, 12, 10]} />
          <meshBasicMaterial color={color} transparent opacity={0.9} depthWrite={false} />
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
