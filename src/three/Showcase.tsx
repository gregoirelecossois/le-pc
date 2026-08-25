/**
 * Présentoir : une seule pièce, centrée, mise à l'échelle et posée
 * sur un socle tournant. Utilisé par les exercices de nommage.
 */

import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import type * as THREE from 'three'
import { BOUNDS, type Vec3 } from './layout'
import { PartModel, type PartId } from './models'

/**
 * Orientation de présentation.
 *
 * Dans le boîtier, une barrette de mémoire est debout et une carte mère est
 * verticale : ce n'est pas sous cet angle qu'on les reconnaît. Ici on
 * présente chaque pièce comme sur une photo de catalogue.
 */
const DISPLAY_ROTATION: Partial<Record<PartId, Vec3>> = {
  motherboard: [0, -Math.PI / 2, 0],
  cpu: [0, -Math.PI / 2, 0],
  cooler: [0, 0, Math.PI / 2],
  ram1: [0, 0, Math.PI / 2],
  ram2: [0, 0, Math.PI / 2],
  ssd: [0, -Math.PI / 2, 0],
  gpu: [-0.5, Math.PI / 2, 0],
  hdd: [-0.45, 0, 0],
  cmos: [0, -Math.PI / 2, 0],
}

export function Showcase({
  id,
  spin = 0.16,
  target = 17,
  y = 22,
}: {
  id: PartId
  /** tours par seconde */
  spin?: number
  /** taille visée de la plus grande dimension, en unités monde */
  target?: number
  y?: number
}) {
  const g = useRef<THREE.Group>(null)
  const b = BOUNDS[id]
  // Les petites pièces ne sont pas agrandies à l'infini : une pile bouton
  // gonflée à la taille d'une carte mère ne serait plus reconnaissable.
  const scale = Math.min(target / Math.max(b.size[0], b.size[1], b.size[2]), 4)
  const rot = DISPLAY_ROTATION[id] ?? [0, 0, 0]

  useFrame((_, dt) => {
    if (g.current) g.current.rotation.y += dt * spin * Math.PI * 2
  })

  return (
    <group position={[0, y, 0]}>
      <group ref={g} scale={scale}>
        <group rotation={rot}>
          <group position={[-b.offset[0], -b.offset[1], -b.offset[2]]}>
            <PartModel id={id} running powered />
          </group>
        </group>
      </group>

      {/* Éclairage « photo de produit » : la pièce doit rester lisible
          quelle que soit son orientation */}
      <pointLight position={[18, 14, 34]} intensity={2.4} distance={140} decay={0} color="#ffffff" />
      <pointLight position={[-26, 8, 18]} intensity={1.3} distance={140} decay={0} color="#bcd8ff" />
      <pointLight position={[6, -14, -26]} intensity={1.1} distance={140} decay={0} color="#ffd9b0" />

      {/* Socle discret */}
      <mesh position={[0, -target * 0.72, 0]} receiveShadow>
        <cylinderGeometry args={[target * 0.42, target * 0.48, 0.7, 48]} />
        <meshStandardMaterial color="#171b22" roughness={0.55} metalness={0.4} />
      </mesh>
      <mesh position={[0, -target * 0.72 + 0.38, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[target * 0.4, 0.06, 8, 60]} />
        <meshBasicMaterial color="#4dd0e1" transparent opacity={0.55} />
      </mesh>
    </group>
  )
}
