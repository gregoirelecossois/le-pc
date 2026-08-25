/**
 * Boîtier moyen-tour ATX.
 * Contrairement aux autres pièces, il est modélisé directement en
 * coordonnées MONDE : c'est lui qui définit le repère du jeu.
 */

import { useMemo } from 'react'
import type * as THREE from 'three'
import { Instance, Instances } from '@react-three/drei'
import { CASE, MB, MB_POINTS } from '../layout'
import type { Vec3 } from '../layout'
import { M, ledMaterial } from '../materials'
import { Grille, Screws } from './primitives'

type Rect = [x0: number, x1: number, y0: number, y1: number]

/** Génère une tôle percée à partir d'une liste de rectangles pleins. */
function PlateXY({
  rects,
  z,
  thickness = CASE.wall,
  material,
}: {
  rects: Rect[]
  z: number
  thickness?: number
  material: THREE.Material
}) {
  return (
    <>
      {rects.map(([x0, x1, y0, y1], i) => (
        <mesh
          key={i}
          position={[(x0 + x1) / 2, (y0 + y1) / 2, z]}
          material={material}
          castShadow
          receiveShadow
        >
          <boxGeometry args={[Math.abs(x1 - x0), Math.abs(y1 - y0), thickness]} />
        </mesh>
      ))}
    </>
  )
}

/** Idem, dans le plan Y-Z (panneaux latéraux). */
function PlateYZ({
  rects,
  x,
  thickness = CASE.wall,
  material,
}: {
  rects: Rect[]
  x: number
  thickness?: number
  material: THREE.Material
}) {
  return (
    <>
      {rects.map(([z0, z1, y0, y1], i) => (
        <mesh
          key={i}
          position={[x, (y0 + y1) / 2, (z0 + z1) / 2]}
          material={material}
          castShadow
          receiveShadow
        >
          <boxGeometry args={[thickness, Math.abs(y1 - y0), Math.abs(z1 - z0)]} />
        </mesh>
      ))}
    </>
  )
}

const HW = CASE.width / 2
const HD = CASE.depth / 2
const H = CASE.height

/* ---------------------------------------------------------------- */
/*  Découpes du panneau arrière                                      */
/* ---------------------------------------------------------------- */

const IO_X0 = MB.surfaceX - 0.1
const IO_X1 = MB.surfaceX + MB_POINTS.io.depth + 0.1
const IO_Y0 = MB_POINTS.io.topY - MB_POINTS.io.height
const IO_Y1 = MB_POINTS.io.topY

const FAN_X0 = -1.7
const FAN_X1 = 10.3
const FAN_Y0 = 27.5
const FAN_Y1 = 39.5

const SLOT_X0 = -5.95
const SLOT_X1 = 4.35
const SLOT_Y1 = IO_Y0 // 25,6 : les équerres commencent juste sous la connectique
const SLOT_Y0 = 11.0

const PSU_X0 = -6.6
const PSU_X1 = 8.6
const PSU_Y0 = 0.6
const PSU_Y1 = 9.4

const REAR_RECTS: Rect[] = [
  // bande basse sous l'alimentation
  [-HW, HW, 0, PSU_Y0],
  // à gauche et à droite de l'alimentation
  [-HW, PSU_X0, PSU_Y0, PSU_Y1],
  [PSU_X1, HW, PSU_Y0, PSU_Y1],
  // bande entre alimentation et équerres
  [-HW, HW, PSU_Y1, SLOT_Y0],
  // zone des équerres : tôle à gauche et à droite
  [-HW, SLOT_X0, SLOT_Y0, SLOT_Y1],
  [SLOT_X1, HW, SLOT_Y0, SLOT_Y1],
  // zone connectique + ventilateur
  [-HW, IO_X0, IO_Y0, IO_Y1],
  [IO_X1, FAN_X0, IO_Y0, IO_Y1],
  [FAN_X0, HW, IO_Y0, FAN_Y0],
  [FAN_X0, HW, FAN_Y1, IO_Y1],
  [FAN_X1, HW, FAN_Y0, FAN_Y1],
  // bande haute
  [-HW, HW, IO_Y1, H],
]

/* ---------------------------------------------------------------- */
/*  Boîtier                                                          */
/* ---------------------------------------------------------------- */

export interface CaseShellProps {
  /** Panneau latéral : 0 = fermé, 1 = totalement retiré */
  panelOpen?: number
  /** Cache le panneau vitré (mode montage) */
  hidePanel?: boolean
  /** Cache la façade pour voir l'intérieur */
  hideFront?: boolean
  powered?: boolean
  /** Cache-slots PCIe encore en place (false = retiré, la carte peut passer) */
  slotCovers?: boolean[]
}

export function CaseShell({
  panelOpen = 1,
  hidePanel = false,
  hideFront = false,
  powered = false,
  slotCovers,
}: CaseShellProps) {
  const steel = M.caseSteel()
  const inner = M.caseInner()
  const plastic = M.casePlastic()

  // Entretoises de la carte mère
  const standoffs = useMemo<Vec3[]>(() => {
    const zs = [MB.rearZ - 1.4, MB.centerZ, MB.frontZ + 1.4]
    const ys = [MB.topY - 1.3, MB.centerY + 1.5, MB.bottomY + 1.3]
    const pts: Vec3[] = []
    zs.forEach((z) => ys.forEach((y) => pts.push([CASE.trayX + CASE.standoff / 2 + 0.1, y, z])))
    return pts
  }, [])

  const covers = slotCovers ?? [true, true, true, true, true, true, true]

  return (
    <group name="case">
      {/* ---------------- Plancher ---------------- */}
      <mesh position={[0, CASE.wall / 2, 0]} material={steel} receiveShadow castShadow>
        <boxGeometry args={[CASE.width, CASE.wall, CASE.depth]} />
      </mesh>
      {/* Filtre à poussière sous l'alimentation */}
      <group position={[1.0, 0.14, 15.5]} rotation={[Math.PI / 2, 0, 0]}>
        <Grille width={13} height={12} step={0.8} hole={0.5} depth={0.1} color="#0a0b0e" />
      </group>
      {/* Pieds */}
      {(
        [
          [-HW + 2.2, -HD + 2.6],
          [HW - 2.2, -HD + 2.6],
          [-HW + 2.2, HD - 2.6],
          [HW - 2.2, HD - 2.6],
        ] as const
      ).map(([x, z], i) => (
        <mesh key={i} position={[x, -0.9, z]} castShadow>
          <cylinderGeometry args={[1.5, 1.7, 1.8, 16]} />
          <meshStandardMaterial color="#0e1013" roughness={0.85} />
        </mesh>
      ))}

      {/* ---------------- Plafond ---------------- */}
      <mesh position={[0, H - CASE.wall / 2, 0]} material={steel} castShadow receiveShadow>
        <boxGeometry args={[CASE.width, CASE.wall, CASE.depth]} />
      </mesh>
      <group position={[0, H - 0.02, 4]} rotation={[Math.PI / 2, 0, 0]}>
        <Grille width={17} height={22} step={0.95} hole={0.62} depth={0.12} color="#101216" />
      </group>

      {/* ---------------- Panneau arrière ---------------- */}
      <PlateXY rects={REAR_RECTS} z={HD - CASE.wall / 2} material={steel} />

      {/* Cerclage du ventilateur arrière */}
      <group position={[4.2, 33.5, HD - 0.1]}>
        <Instances limit={6}>
          <torusGeometry args={[1, 0.055, 5, 30]} />
          <meshStandardMaterial color="#6b7178" metalness={1} roughness={0.42} />
          {Array.from({ length: 6 }).map((_, i) => (
            <Instance key={i} scale={[0.9 + i * 0.95, 0.9 + i * 0.95, 1]} />
          ))}
        </Instances>
      </group>

      {/* Cache-slots PCIe */}
      {covers.map((present, i) =>
        present ? (
          <group key={i}>
            <mesh
              position={[(SLOT_X0 + SLOT_X1) / 2 + 0.2, SLOT_Y1 - 1.1 - i * 2.03, HD - 0.25]}
              material={steel}
              castShadow
            >
              <boxGeometry args={[10.0, 1.85, 0.12]} />
            </mesh>
            <mesh
              position={[SLOT_X1 - 0.5, SLOT_Y1 - 1.1 - i * 2.03, HD - 0.45]}
              material={M.steel()}
            >
              <boxGeometry args={[1.0, 1.85, 0.3]} />
            </mesh>
          </group>
        ) : null,
      )}
      {/* Vis de maintien des équerres */}
      <Screws
        points={covers.map((_, i): Vec3 => [SLOT_X1 - 0.5, SLOT_Y1 - 1.1 - i * 2.03, HD - 0.6])}
        rotation={[Math.PI / 2, 0, 0]}
        radius={0.24}
      />

      {/* ---------------- Façade ---------------- */}
      {!hideFront && (
        <group>
          <mesh position={[0, H / 2, -HD - 0.9]} material={plastic} castShadow receiveShadow>
            <boxGeometry args={[CASE.width + 0.6, H, 1.8]} />
          </mesh>
          {/* Grille de façade (l'air frais entre par là) */}
          <group position={[0, H / 2 + 2, -HD - 1.85]}>
            <Grille width={17} height={32} step={0.95} hole={0.6} depth={0.14} color="#0c0e11" />
          </group>
          {/* Bouton d'alimentation */}
          <group position={[HW - 3.4, H - 3.4, -HD - 1.9]}>
            <mesh castShadow>
              <cylinderGeometry args={[0.95, 0.95, 0.5, 22]} />
              <meshStandardMaterial color="#2a2e35" roughness={0.5} metalness={0.6} />
            </mesh>
            <mesh position={[0, 0, 0.28]} material={ledMaterial(powered ? '#7fd4ff' : '#1a2530', powered ? 3 : 0)}>
              <cylinderGeometry args={[0.42, 0.42, 0.12, 18]} />
            </mesh>
          </group>
          {/* Prises de façade : 2 USB + jack casque */}
          {[
            [-1.6, '#12151a'],
            [0.2, '#2f6fd0'],
          ].map(([x, c], i) => (
            <mesh key={i} position={[HW - 3.4 + (x as number), H - 6.2, -HD - 1.85]} castShadow>
              <boxGeometry args={[1.3, 0.7, 0.35]} />
              <meshStandardMaterial color={c as string} roughness={0.6} />
            </mesh>
          ))}
          <mesh position={[HW - 3.4 + 1.9, H - 6.2, -HD - 1.85]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.34, 0.34, 0.3, 14]} />
            <meshStandardMaterial color="#7bd17b" roughness={0.5} />
          </mesh>
        </group>
      )}

      {/* ---------------- Panneau droit (derrière le plateau) ---------------- */}
      <PlateYZ rects={[[-HD, HD, 0, H]]} x={-HW + CASE.wall / 2} material={steel} />

      {/* ---------------- Plateau de carte mère ---------------- */}
      <PlateYZ
        rects={[
          // le plateau, percé d'un grand passage de câbles à l'avant
          [MB.frontZ - 5.5, HD - 0.4, 0.3, H - 0.3],
          [-HD + 0.4, MB.frontZ - 8.5, 0.3, H - 0.3],
          [MB.frontZ - 8.5, MB.frontZ - 5.5, 0.3, 9.5],
          [MB.frontZ - 8.5, MB.frontZ - 5.5, H - 8.0, H - 0.3],
        ]}
        x={CASE.trayX}
        thickness={0.16}
        material={inner}
      />
      {/* Découpe derrière le socket (pour changer le ventirad sans tout démonter) */}
      <mesh position={[CASE.trayX - 0.02, MB_POINTS.socket.y, MB_POINTS.socket.z]}>
        <boxGeometry args={[0.2, 9, 9]} />
        <meshStandardMaterial color="#111318" roughness={0.9} />
      </mesh>
      {/* Entretoises */}
      <Instances limit={standoffs.length}>
        <cylinderGeometry args={[0.32, 0.32, CASE.standoff, 10]} />
        <meshStandardMaterial color="#b58b3a" metalness={1} roughness={0.4} />
        {standoffs.map((p, i) => (
          <Instance key={i} position={p} rotation={[0, 0, Math.PI / 2]} />
        ))}
      </Instances>

      {/* ---------------- Cage du disque dur ---------------- */}
      <group>
        <mesh position={[-1.0, 1.1, -12.0]} material={inner} castShadow receiveShadow>
          <boxGeometry args={[11.6, 0.16, 16]} />
        </mesh>
        {[-6.6, 4.6].map((x) => (
          <mesh key={x} position={[x, 2.6, -12.0]} material={inner} castShadow>
            <boxGeometry args={[0.16, 3.2, 16]} />
          </mesh>
        ))}
      </group>

      {/* ---------------- Panneau latéral vitré ---------------- */}
      {!hidePanel && panelOpen < 0.999 && (
        <group
          // fermé : plaqué sur le flanc — ouvert : posé à plat à côté de la tour,
          // comme on le fait vraiment quand on ouvre une machine
          position={[
            HW - CASE.wall / 2 + panelOpen * 30,
            H / 2 - panelOpen * (H / 2 - 0.6),
            -panelOpen * 4,
          ]}
          rotation={[0, 0, (panelOpen * Math.PI) / 2]}
        >
          <mesh material={M.glass()}>
            <boxGeometry args={[0.5, H - 1.4, CASE.depth - 1.4]} />
          </mesh>
          <mesh material={steel} position={[-0.25, 0, 0]}>
            <boxGeometry args={[0.35, H - 0.6, 0.9]} />
          </mesh>
        </group>
      )}
    </group>
  )
}
