/**
 * Petites pièces réutilisées partout : vis, ailettes, ventilateurs,
 * connecteurs, contacts dorés, grilles d'aération...
 */

import { Instance, Instances, RoundedBox } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { useMemo, useRef, type ReactNode } from 'react'
import * as THREE from 'three'
import { M } from '../materials'
import type { Vec3 } from '../layout'

/* ---------------------------------------------------------------- */
/*  Vis                                                              */
/* ---------------------------------------------------------------- */

export function Screw({
  position,
  rotation = [Math.PI / 2, 0, 0],
  radius = 0.28,
}: {
  position: Vec3
  rotation?: Vec3
  radius?: number
}) {
  return (
    <group position={position} rotation={rotation}>
      <mesh material={M.screw()} castShadow>
        <cylinderGeometry args={[radius, radius * 0.92, 0.16, 14]} />
      </mesh>
      {/* empreinte cruciforme */}
      <mesh position={[0, 0.085, 0]} material={M.plasticBlack()}>
        <boxGeometry args={[radius * 1.5, 0.03, radius * 0.34]} />
      </mesh>
      <mesh position={[0, 0.085, 0]} material={M.plasticBlack()}>
        <boxGeometry args={[radius * 0.34, 0.03, radius * 1.5]} />
      </mesh>
    </group>
  )
}

/** Plusieurs vis d'un coup (instanciées). */
export function Screws({ points, rotation = [Math.PI / 2, 0, 0], radius = 0.28 }: {
  points: Vec3[]
  rotation?: Vec3
  radius?: number
}) {
  return (
    <Instances limit={Math.max(points.length, 1)} castShadow>
      <cylinderGeometry args={[radius, radius * 0.92, 0.16, 12]} />
      <meshStandardMaterial color="#8d939c" metalness={1} roughness={0.3} />
      {points.map((p, i) => (
        <Instance key={i} position={p} rotation={rotation} />
      ))}
    </Instances>
  )
}

/* ---------------------------------------------------------------- */
/*  Ailettes de dissipateur                                          */
/* ---------------------------------------------------------------- */

/**
 * Empilement d'ailettes d'aluminium.
 * `axis` = direction d'empilement, `size` = dimensions d'UNE ailette.
 */
export function Fins({
  count,
  spacing,
  size,
  axis = 'z',
  position = [0, 0, 0],
}: {
  count: number
  spacing: number
  size: [number, number, number]
  axis?: 'x' | 'y' | 'z'
  position?: Vec3
}) {
  const offsets = useMemo(() => {
    const arr: Vec3[] = []
    const total = (count - 1) * spacing
    for (let i = 0; i < count; i++) {
      const d = -total / 2 + i * spacing
      arr.push(axis === 'x' ? [d, 0, 0] : axis === 'y' ? [0, d, 0] : [0, 0, d])
    }
    return arr
  }, [count, spacing, axis])

  return (
    <group position={position}>
      <Instances limit={count} castShadow receiveShadow>
        <boxGeometry args={size} />
        <meshStandardMaterial color="#b9bfc7" metalness={1} roughness={0.34} envMapIntensity={1.3} />
        {offsets.map((o, i) => (
          <Instance key={i} position={o} />
        ))}
      </Instances>
    </group>
  )
}

/* ---------------------------------------------------------------- */
/*  Ventilateur                                                      */
/* ---------------------------------------------------------------- */

function bladeGeometry(inner: number, outer: number, thickness: number) {
  const shape = new THREE.Shape()
  const a0 = -0.34
  const a1 = 0.34
  shape.moveTo(Math.cos(a0) * inner, Math.sin(a0) * inner)
  shape.quadraticCurveTo(
    Math.cos(0.1) * (inner + outer) * 0.5,
    Math.sin(0.1) * (inner + outer) * 0.55,
    Math.cos(a1 + 0.25) * outer,
    Math.sin(a1 + 0.25) * outer,
  )
  shape.lineTo(Math.cos(a1 + 0.62) * outer, Math.sin(a1 + 0.62) * outer)
  shape.quadraticCurveTo(
    Math.cos(0.55) * (inner + outer) * 0.5,
    Math.sin(0.55) * (inner + outer) * 0.5,
    Math.cos(a1) * inner,
    Math.sin(a1) * inner,
  )
  shape.closePath()
  return new THREE.ExtrudeGeometry(shape, {
    depth: thickness,
    bevelEnabled: true,
    bevelSize: 0.06,
    bevelThickness: 0.05,
    bevelSegments: 1,
    curveSegments: 6,
  })
}

/**
 * Ventilateur complet : cadre carré, moyeu, pales inclinées.
 * L'axe de rotation est Z (le ventilateur souffle vers +Z ou -Z).
 */
export function FanUnit({
  size = 12,
  thickness = 2.5,
  blades = 9,
  speed = 0,
  frameColor = '#15171b',
  hubColor = '#22252b',
  showArrow = false,
  arrowDir = 1,
}: {
  size?: number
  thickness?: number
  blades?: number
  /** tours/seconde ; 0 = à l'arrêt */
  speed?: number
  frameColor?: string
  hubColor?: string
  showArrow?: boolean
  arrowDir?: 1 | -1
}) {
  const rotor = useRef<THREE.Group>(null)
  const half = size / 2
  const r = half - 0.35
  const hubR = size * 0.19

  const geo = useMemo(() => bladeGeometry(hubR * 0.95, r * 0.99, 0.16), [hubR, r])

  useFrame((_, dt) => {
    if (rotor.current && speed) rotor.current.rotation.z += dt * speed * Math.PI * 2 * arrowDir
  })

  const corner = half - 0.55
  return (
    <group>
      {/* Cadre : 4 montants + 4 coins */}
      {(
        [
          [0, half - 0.35, 0, size, 0.7, thickness],
          [0, -half + 0.35, 0, size, 0.7, thickness],
          [half - 0.35, 0, 0, 0.7, size - 1.4, thickness],
          [-half + 0.35, 0, 0, 0.7, size - 1.4, thickness],
        ] as const
      ).map((b, i) => (
        <mesh key={i} position={[b[0], b[1], b[2]]} castShadow receiveShadow>
          <boxGeometry args={[b[3], b[4], b[5]]} />
          <meshStandardMaterial color={frameColor} roughness={0.62} metalness={0.1} />
        </mesh>
      ))}

      {/* Trous de fixation */}
      {[
        [corner, corner],
        [-corner, corner],
        [corner, -corner],
        [-corner, -corner],
      ].map(([x, y], i) => (
        <mesh key={i} position={[x, y, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.24, 0.24, thickness + 0.05, 10]} />
          <meshStandardMaterial color="#0a0b0d" roughness={0.9} />
        </mesh>
      ))}

      {/* Rotor */}
      <group ref={rotor} position={[0, 0, 0]}>
        <mesh castShadow>
          <cylinderGeometry args={[hubR, hubR * 0.96, thickness * 0.62, 24]} />
          <meshStandardMaterial color={hubColor} roughness={0.4} metalness={0.35} />
        </mesh>
        <mesh position={[0, 0, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[hubR * 0.72, hubR * 0.72, thickness * 0.64, 20]} />
          <meshStandardMaterial color="#0f1114" roughness={0.5} />
        </mesh>
        {Array.from({ length: blades }).map((_, i) => (
          <mesh
            key={i}
            geometry={geo}
            material={M.fanBlade()}
            rotation={[0, 0, (i / blades) * Math.PI * 2]}
            position={[0, 0, -0.35]}
            castShadow
          />
        ))}
      </group>

      {/* Flèche du sens du flux d'air, moulée sur le cadre */}
      {showArrow && (
        <group position={[half - 0.35, -half + 1.6, thickness / 2 + 0.02]}>
          <mesh>
            <boxGeometry args={[0.14, 1.1, 0.05]} />
            <meshStandardMaterial color="#5d636c" roughness={0.8} />
          </mesh>
          <mesh position={[0, arrowDir > 0 ? 0.62 : -0.62, 0]} rotation={[0, 0, arrowDir > 0 ? 0 : Math.PI]}>
            <coneGeometry args={[0.3, 0.42, 3]} />
            <meshStandardMaterial color="#5d636c" roughness={0.8} />
          </mesh>
        </group>
      )}
    </group>
  )
}

/* ---------------------------------------------------------------- */
/*  Grille d'aération (nid d'abeille simplifié)                       */
/* ---------------------------------------------------------------- */

export function Grille({
  width,
  height,
  step = 0.9,
  hole = 0.62,
  depth = 0.12,
  color = '#101216',
}: {
  width: number
  height: number
  step?: number
  hole?: number
  depth?: number
  color?: string
}) {
  const points = useMemo(() => {
    const arr: Vec3[] = []
    const cols = Math.floor(width / step)
    const rows = Math.floor(height / (step * 0.87))
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const x = -width / 2 + step / 2 + c * step + (r % 2 ? step / 2 : 0)
        const y = -height / 2 + step / 2 + r * step * 0.87
        if (Math.abs(x) > width / 2 - step * 0.4) continue
        arr.push([x, y, 0])
      }
    }
    return arr
  }, [width, height, step])

  return (
    <Instances limit={Math.max(points.length, 1)}>
      <cylinderGeometry args={[hole / 2, hole / 2, depth, 6]} />
      <meshStandardMaterial color={color} roughness={0.85} metalness={0.3} />
      {points.map((p, i) => (
        <Instance key={i} position={p} rotation={[Math.PI / 2, 0, 0]} />
      ))}
    </Instances>
  )
}

/* ---------------------------------------------------------------- */
/*  Contacts dorés (tranche d'une carte / d'une barrette)             */
/* ---------------------------------------------------------------- */

export function GoldFingers({
  length,
  height = 0.5,
  thickness = 0.17,
  pitch = 0.12,
  /** position (le long de `length`) des encoches détrompeuses, en fraction 0..1 */
  notches = [],
  axis = 'y',
}: {
  length: number
  height?: number
  thickness?: number
  pitch?: number
  notches?: number[]
  axis?: 'x' | 'y' | 'z'
}) {
  const pins = useMemo(() => {
    const n = Math.floor(length / pitch)
    const arr: Vec3[] = []
    for (let i = 0; i < n; i++) {
      const t = (i + 0.5) / n
      if (notches.some((nt) => Math.abs(t - nt) < 0.022)) continue
      const d = -length / 2 + t * length
      arr.push(axis === 'x' ? [d, 0, 0] : axis === 'y' ? [0, d, 0] : [0, 0, d])
    }
    return arr
  }, [length, pitch, notches, axis])

  const size: [number, number, number] =
    axis === 'x' ? [pitch * 0.66, height, thickness] : axis === 'y' ? [thickness, pitch * 0.66, height] : [thickness, height, pitch * 0.66]

  return (
    <Instances limit={Math.max(pins.length, 1)}>
      <boxGeometry args={size} />
      <meshStandardMaterial color="#d9ad4a" metalness={1} roughness={0.24} envMapIntensity={1.5} />
      {pins.map((p, i) => (
        <Instance key={i} position={p} />
      ))}
    </Instances>
  )
}

/* ---------------------------------------------------------------- */
/*  Connecteur à broches (headers de la carte mère)                   */
/* ---------------------------------------------------------------- */

export function PinHeader({
  cols,
  rows = 2,
  pitch = 0.254,
  height = 0.55,
  base = true,
  color = '#15171b',
}: {
  cols: number
  rows?: number
  pitch?: number
  height?: number
  base?: boolean
  color?: string
}) {
  const pts = useMemo(() => {
    const arr: Vec3[] = []
    for (let r = 0; r < rows; r++)
      for (let c = 0; c < cols; c++)
        arr.push([height / 2, (r - (rows - 1) / 2) * pitch, (c - (cols - 1) / 2) * pitch])
    return arr
  }, [cols, rows, pitch, height])

  return (
    <group>
      {base && (
        <mesh position={[height * 0.16, 0, 0]}>
          <boxGeometry args={[height * 0.32, rows * pitch + 0.12, cols * pitch + 0.12]} />
          <meshStandardMaterial color={color} roughness={0.5} />
        </mesh>
      )}
      <Instances limit={Math.max(pts.length, 1)}>
        <boxGeometry args={[height, pitch * 0.32, pitch * 0.32]} />
        <meshStandardMaterial color="#c9a227" metalness={1} roughness={0.3} />
        {pts.map((p, i) => (
          <Instance key={i} position={p} />
        ))}
      </Instances>
    </group>
  )
}

/* ---------------------------------------------------------------- */
/*  Boîtier de connecteur (prise plastique type ATX / SATA / PCIe)    */
/* ---------------------------------------------------------------- */

export function ConnectorShell({
  size,
  color = '#101216',
  holes = 0,
  holeAxis = 'y',
}: {
  size: [number, number, number]
  color?: string
  holes?: number
  holeAxis?: 'y' | 'z'
}) {
  const [w, h, d] = size
  const pts = useMemo(() => {
    if (!holes) return []
    const arr: Vec3[] = []
    const span = holeAxis === 'y' ? h : d
    const step = span / holes
    for (let i = 0; i < holes; i++) {
      const o = -span / 2 + step / 2 + i * step
      arr.push(holeAxis === 'y' ? [w * 0.2, o, 0] : [w * 0.2, 0, o])
    }
    return arr
  }, [holes, holeAxis, w, h, d])

  return (
    <group>
      <mesh castShadow>
        <boxGeometry args={size} />
        <meshStandardMaterial color={color} roughness={0.42} metalness={0.1} />
      </mesh>
      {pts.length > 0 && (
        <Instances limit={pts.length}>
          <boxGeometry
            args={holeAxis === 'y' ? [w * 0.7, h / holes - 0.05, d * 0.62] : [w * 0.7, h * 0.62, d / holes - 0.05]}
          />
          <meshStandardMaterial color="#05060a" roughness={0.95} />
          {pts.map((p, i) => (
            <Instance key={i} position={p} />
          ))}
        </Instances>
      )}
    </group>
  )
}

/* ---------------------------------------------------------------- */
/*  Composants de surface (condensateurs, puces, VRM)                 */
/* ---------------------------------------------------------------- */

export function Capacitors({ points, radius = 0.38, height = 0.9 }: { points: Vec3[]; radius?: number; height?: number }) {
  return (
    <Instances limit={Math.max(points.length, 1)} castShadow>
      <cylinderGeometry args={[radius, radius, height, 12]} />
      <meshStandardMaterial color="#1c1f26" metalness={0.55} roughness={0.42} />
      {points.map((p, i) => (
        <Instance key={i} position={p} rotation={[0, 0, Math.PI / 2]} />
      ))}
    </Instances>
  )
}

export function SmdChips({ points, seed = 1 }: { points: Vec3[]; seed?: number }) {
  return (
    <Instances limit={Math.max(points.length, 1)}>
      <boxGeometry args={[0.14, 1, 1]} />
      <meshStandardMaterial color="#0c0e12" roughness={0.44} metalness={0.2} />
      {points.map((p, i) => {
        const s = 0.5 + (((i * 37 + seed * 13) % 11) / 11) * 1.2
        const s2 = 0.5 + (((i * 53 + seed * 7) % 9) / 9) * 1.1
        return <Instance key={i} position={p} scale={[1, s, s2]} />
      })}
    </Instances>
  )
}

/* ---------------------------------------------------------------- */
/*  Utilitaires                                                      */
/* ---------------------------------------------------------------- */

/** Boîte à arêtes adoucies : plus réaliste qu'un cube brut. */
export function SoftBox({
  args,
  radius = 0.08,
  children,
  ...props
}: {
  args: [number, number, number]
  radius?: number
  children?: ReactNode
} & Record<string, unknown>) {
  const r = Math.min(radius, Math.min(...args) / 2.2)
  return (
    <RoundedBox args={args} radius={r} smoothness={3} castShadow receiveShadow {...props}>
      {children}
    </RoundedBox>
  )
}
