/**
 * Présentoir : une seule pièce, centrée, mise à l'échelle et posée
 * sur un socle tournant. Utilisé par les exercices de nommage.
 */

import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import type * as THREE from 'three'
import { BOUNDS, type Vec3 } from './layout'
import { PartModel, type PartId } from './models'
import {
  PeripheralModel,
  PERIPHERAL_MODELS,
  type PeripheralModelId,
} from './models/PeripheralParts'

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
  // incliné à 40° : posé à plat, ce boîtier très mince serait vu par la
  // tranche ; debout, il disparaîtrait à chaque demi-tour
  ssd25: [-0.7, 0, 0],
  // de trois quarts : on voit la façade ET le tiroir ouvert
  odd: [-0.34, 0.42, 0],
  cmos: [0, -Math.PI / 2, 0],
}

export function Showcase({
  id,
  spin = 0.16,
  target = 17,
  y = 22,
  pedestal = true,
  lights = true,
}: {
  id: PartId
  /** tours par seconde */
  spin?: number
  /** taille visée de la plus grande dimension, en unités monde */
  target?: number
  y?: number
  /** Socle tournant sous la pièce (inutile dans une petite vignette) */
  pedestal?: boolean
  /**
   * Trois lampes d'appoint propres à la pièce.
   * À couper quand plusieurs présentoirs sont alignés : douze lampes
   * ponctuelles pour quatre pièces, c'est trop pour les machines de salle.
   */
  lights?: boolean
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
            <PartModel id={id} running powered showcase />
          </group>
        </group>
      </group>

      {/* Éclairage « photo de produit » : la pièce doit rester lisible
          quelle que soit son orientation */}
      {lights && (
        <>
          <pointLight position={[18, 14, 34]} intensity={2.4} distance={140} decay={0} color="#ffffff" />
          <pointLight position={[-26, 8, 18]} intensity={1.3} distance={140} decay={0} color="#bcd8ff" />
          <pointLight position={[6, -14, -26]} intensity={1.1} distance={140} decay={0} color="#ffd9b0" />
        </>
      )}

      {/* Socle discret */}
      {pedestal && (
        <>
          <mesh position={[0, -target * 0.72, 0]} receiveShadow>
            <cylinderGeometry args={[target * 0.42, target * 0.48, 0.7, 48]} />
            <meshStandardMaterial color="#171b22" roughness={0.55} metalness={0.4} />
          </mesh>
          <mesh position={[0, -target * 0.72 + 0.38, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[target * 0.4, 0.06, 8, 60]} />
            <meshBasicMaterial color="#4dd0e1" transparent opacity={0.55} />
          </mesh>
        </>
      )}
    </group>
  )
}

/* ---------------------------------------------------------------- */
/*  Présentoir des PÉRIPHÉRIQUES                                     */
/* ---------------------------------------------------------------- */

/**
 * Même présentoir, pour un objet extérieur à l'unité centrale (écran,
 * clavier, manette...). Le catalogue des périphériques a ses propres
 * boîtes englobantes : elles vivent dans `PERIPHERAL_MODELS`.
 */
export function PeriShowcase({
  id,
  spin = 0.16,
  target = 20,
  y = 22,
  pedestal = true,
  lights = true,
  rot: rotOverride,
}: {
  id: PeripheralModelId
  spin?: number
  target?: number
  y?: number
  pedestal?: boolean
  lights?: boolean
  /**
   * Orientation imposée, à la place de celle du catalogue.
   *
   * Sur le présentoir l'objet tourne : un angle ingrat ne dure qu'une
   * seconde. Sur une PHOTO, il dure toujours — d'où ce réglage.
   */
  rot?: Vec3
}) {
  const g = useRef<THREE.Group>(null)
  const m = PERIPHERAL_MODELS[id]
  const scale = Math.min(target / Math.max(m.size[0], m.size[1], m.size[2]), 4)
  const rot = rotOverride ?? m.display ?? [0, 0, 0]

  useFrame((_, dt) => {
    if (g.current) g.current.rotation.y += dt * spin * Math.PI * 2
  })

  return (
    <group position={[0, y, 0]}>
      <group ref={g} scale={scale}>
        <group rotation={rot}>
          <group position={[-m.offset[0], -m.offset[1], -m.offset[2]]}>
            <PeripheralModel id={id} showcase />
          </group>
        </group>
      </group>

      {lights && (
        <>
          <pointLight position={[18, 14, 34]} intensity={2.4} distance={140} decay={0} color="#ffffff" />
          <pointLight position={[-26, 8, 18]} intensity={1.3} distance={140} decay={0} color="#bcd8ff" />
          <pointLight position={[6, -14, -26]} intensity={1.1} distance={140} decay={0} color="#ffd9b0" />
        </>
      )}

      {pedestal && (
        <>
          <mesh position={[0, -target * 0.72, 0]} receiveShadow>
            <cylinderGeometry args={[target * 0.42, target * 0.48, 0.7, 48]} />
            <meshStandardMaterial color="#171b22" roughness={0.55} metalness={0.4} />
          </mesh>
          <mesh position={[0, -target * 0.72 + 0.38, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[target * 0.4, 0.06, 8, 60]} />
            <meshBasicMaterial color="#38bdf8" transparent opacity={0.55} />
          </mesh>
        </>
      )}
    </group>
  )
}
