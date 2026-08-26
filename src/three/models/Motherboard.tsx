/**
 * Carte mère ATX.
 * Origine locale = centre du PCB. Les cotes viennent de layout.ts (en cm).
 */

import { useMemo } from 'react'
import * as THREE from 'three'
import { Instance, Instances } from '@react-three/drei'
import { MB, MB_POINTS } from '../layout'
import type { Vec3 } from '../layout'
import { M, ledMaterial } from '../materials'
import { Capacitors, ConnectorShell, GoldFingers, PinHeader, Screws, SmdChips } from './primitives'
import { PORTS, type Port } from '@/data/ports'

/* Conversion monde -> local (le modèle est centré sur lui-même) */
const lx = (worldX: number) => worldX - MB.pcbCenterX
const ly = (worldY: number) => worldY - MB.centerY
const lz = (worldZ: number) => worldZ - MB.centerZ

/** Face avant du PCB en coordonnées locales */
const SX = MB.thickness / 2

/* ---------------------------------------------------------------- */
/*  Prise du panneau arrière                                         */
/* ---------------------------------------------------------------- */

function RearPort({ port, local = true }: { port: Port; local?: boolean }) {
  const [wx, wy, wz] = port.position
  const p: Vec3 = local ? [lx(wx), ly(wy), lz(wz)] : [wx, wy, wz]
  const [sx, sy, sz] = port.size

  /**
   * Les prises audio sont RONDES.
   *
   * C'est ce qui permet de les reconnaître d'un coup d'œil sur une vraie
   * machine, avant même de lire la couleur : un trou rond entouré d'une
   * couronne verte, rose ou bleue. Dessinées comme les autres — un
   * rectangle avec une pastille — elles ne ressemblaient à rien de connu.
   */
  if (port.kind === 'jack') {
    const r = Math.min(sx, sy) / 2
    return (
      <group position={p}>
        {/* Fût métallique traversant la plaque */}
        <mesh rotation={[Math.PI / 2, 0, 0]} castShadow>
          <cylinderGeometry args={[r, r, sz, 20]} />
          <meshStandardMaterial color="#9aa1ab" metalness={1} roughness={0.42} />
        </mesh>
        {/* Couronne colorée : vert = sortie, rose = micro, bleu = entrée ligne */}
        <mesh position={[0, 0, sz / 2 + 0.02]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[r * 0.94, r * 0.94, 0.08, 20]} />
          <meshStandardMaterial color={port.color} roughness={0.5} />
        </mesh>
        {/* Le trou où entre la fiche */}
        <mesh position={[0, 0, sz / 2 + 0.07]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[r * 0.44, r * 0.44, 0.1, 16]} />
          <meshStandardMaterial color="#05070a" roughness={0.95} />
        </mesh>
      </group>
    )
  }

  return (
    <group position={p}>
      {/* Corps métallique de la prise */}
      <mesh castShadow>
        <boxGeometry args={[sx, sy, sz]} />
        <meshStandardMaterial color="#9aa1ab" metalness={1} roughness={0.42} />
      </mesh>
      {/* Cavité sombre tournée vers l'arrière (+Z) */}
      <mesh position={[0, 0, sz / 2 + 0.01]}>
        <boxGeometry args={[sx * 0.82, sy * 0.66, 0.06]} />
        <meshStandardMaterial color={port.color} roughness={0.9} />
      </mesh>
      {/* Languette intérieure colorée (USB bleu, RJ45 jaune) */}
      {port.inner && (
        <mesh position={[0, -sy * 0.12, sz / 2 + 0.03]}>
          <boxGeometry args={[sx * 0.68, sy * 0.22, 0.05]} />
          <meshStandardMaterial color={port.inner} roughness={0.6} />
        </mesh>
      )}
    </group>
  )
}

/* ---------------------------------------------------------------- */
/*  Socket du processeur (avec son levier)                           */
/* ---------------------------------------------------------------- */

function CpuSocket({ occupied }: { occupied: boolean }) {
  const y = ly(MB_POINTS.socket.y)
  const z = lz(MB_POINTS.socket.z)
  const s = MB_POINTS.socket.size

  // Grille de contacts LGA (représentée par une trame, pas 1700 broches !)
  const pads = useMemo(() => {
    const arr: Vec3[] = []
    const n = 16
    for (let i = 0; i < n; i++)
      for (let j = 0; j < n; j++) {
        if ((i > 5 && i < 10) && (j > 5 && j < 10)) continue // zone centrale vide
        arr.push([0, (-n / 2 + i + 0.5) * 0.19, (-n / 2 + j + 0.5) * 0.19])
      }
    return arr
  }, [])

  return (
    <group position={[SX, y, z]}>
      {/* Corps plastique */}
      <mesh position={[0.17, 0, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.34, s + 0.7, s + 0.7]} />
        <meshStandardMaterial color="#101216" roughness={0.5} />
      </mesh>
      {/* Fond de socket + contacts */}
      <mesh position={[0.3, 0, 0]}>
        <boxGeometry args={[0.06, s, s]} />
        <meshStandardMaterial color="#0a0c10" roughness={0.8} />
      </mesh>
      {!occupied && (
        <Instances limit={pads.length} position={[0.34, 0, 0]}>
          <boxGeometry args={[0.04, 0.11, 0.11]} />
          <meshStandardMaterial color="#c9a227" metalness={1} roughness={0.32} />
          {pads.map((p, i) => (
            <Instance key={i} position={p} />
          ))}
        </Instances>
      )}

      {/* Cadre de maintien métallique (ILM) */}
      {(
        [
          [0.38, (s + 0.9) / 2, 0, 0.12, 0.5, s + 1.4],
          [0.38, -(s + 0.9) / 2, 0, 0.12, 0.5, s + 1.4],
          [0.38, 0, (s + 0.9) / 2, 0.12, s + 0.4, 0.5],
          [0.38, 0, -(s + 0.9) / 2, 0.12, s + 0.4, 0.5],
        ] as const
      ).map((b, i) => (
        <mesh key={i} position={[b[0], b[1], b[2]]} castShadow>
          <boxGeometry args={[b[3], b[4], b[5]]} />
          <meshStandardMaterial color="#aab0b9" metalness={1} roughness={0.34} />
        </mesh>
      ))}

      {/* Levier de verrouillage */}
      <group position={[0.42, -(s + 1.3) / 2, 0]} rotation={[0, 0, occupied ? 0 : -0.9]}>
        <mesh position={[0, 0, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
          <cylinderGeometry args={[0.11, 0.11, s + 1.2, 10]} />
          <meshStandardMaterial color="#c2c8d0" metalness={1} roughness={0.3} />
        </mesh>
        <mesh position={[0.35, -0.35, (s + 1.2) / 2 - 0.2]} castShadow>
          <boxGeometry args={[0.11, 0.9, 0.4]} />
          <meshStandardMaterial color="#c2c8d0" metalness={1} roughness={0.3} />
        </mesh>
      </group>

      {/* Triangle doré : repère d'orientation du processeur */}
      <mesh position={[0.36, -s / 2 + 0.35, -s / 2 + 0.35]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.22, 0.22, 0.04, 3]} />
        <meshStandardMaterial color="#e0bb55" metalness={0.9} roughness={0.35} />
      </mesh>
    </group>
  )
}

/* ---------------------------------------------------------------- */
/*  Slot mémoire DDR                                                 */
/* ---------------------------------------------------------------- */

function DimmSlot({ z, primary, open }: { z: number; primary: boolean; open: boolean }) {
  const y = ly(MB_POINTS.dimmCenterY)
  const len = MB_POINTS.dimmLength
  const body = primary ? '#2b3038' : '#101216'

  return (
    <group position={[SX, y, lz(z)]}>
      <mesh position={[0.34, 0, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.68, len, 0.62]} />
        <meshStandardMaterial color={body} roughness={0.45} metalness={0.08} />
      </mesh>
      {/* Rainure centrale */}
      <mesh position={[0.7, 0, 0]}>
        <boxGeometry args={[0.08, len - 0.6, 0.2]} />
        <meshStandardMaterial color="#05060a" roughness={0.9} />
      </mesh>
      {/* Détrompeur : la petite bosse décentrée */}
      <mesh position={[0.7, len * 0.09, 0]}>
        <boxGeometry args={[0.1, 0.22, 0.24]} />
        <meshStandardMaterial color={body} roughness={0.5} />
      </mesh>
      {/* Clips de maintien, ouverts ou fermés */}
      {[1, -1].map((s) => (
        <group key={s} position={[0.4, (s * len) / 2 + s * 0.34, 0]} rotation={[open ? s * 0.6 : 0, 0, 0]}>
          <mesh castShadow>
            <boxGeometry args={[0.62, 0.68, 0.55]} />
            <meshStandardMaterial color="#e8e9ec" roughness={0.4} />
          </mesh>
          <mesh position={[0.42, s * 0.28, 0]}>
            <boxGeometry args={[0.3, 0.3, 0.5]} />
            <meshStandardMaterial color="#e8e9ec" roughness={0.4} />
          </mesh>
        </group>
      ))}
    </group>
  )
}

/* ---------------------------------------------------------------- */
/*  Slot PCI Express                                                 */
/* ---------------------------------------------------------------- */

function PcieSlot({
  y,
  zStart,
  zEnd,
  armored = false,
  latchOpen = false,
}: {
  y: number
  zStart: number
  zEnd: number
  armored?: boolean
  latchOpen?: boolean
}) {
  const len = zEnd - zStart
  const cz = lz((zStart + zEnd) / 2)
  return (
    <group position={[SX, ly(y), cz]}>
      <mesh position={[0.42, 0, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.84, 0.86, len]} />
        <meshStandardMaterial color={armored ? '#c8ccd2' : '#1b1e24'} metalness={armored ? 1 : 0.1} roughness={armored ? 0.3 : 0.45} />
      </mesh>
      {/* Rainure */}
      <mesh position={[0.86, 0, 0]}>
        <boxGeometry args={[0.1, 0.24, len - 0.5]} />
        <meshStandardMaterial color="#05060a" roughness={0.95} />
      </mesh>
      {/* Séparateur (détrompeur) du slot 16x */}
      <mesh position={[0.86, 0, -len / 2 + 1.15]}>
        <boxGeometry args={[0.12, 0.3, 0.28]} />
        <meshStandardMaterial color="#1b1e24" roughness={0.5} />
      </mesh>
      {/* Clip de verrouillage, à l'extrémité avant */}
      <group position={[0.5, 0, -len / 2 - 0.35]} rotation={[0, latchOpen ? -0.75 : 0, 0]}>
        <mesh castShadow>
          <boxGeometry args={[0.86, 0.8, 0.5]} />
          <meshStandardMaterial color="#e8e9ec" roughness={0.42} />
        </mesh>
      </group>
    </group>
  )
}

/* ---------------------------------------------------------------- */
/*  Dissipateur (chipset / VRM)                                      */
/* ---------------------------------------------------------------- */

function Heatsink({
  position,
  size,
  grooves = 6,
  color = '#41464e',
  grooveAxis = 'z',
}: {
  position: Vec3
  size: Vec3
  grooves?: number
  color?: string
  grooveAxis?: 'y' | 'z'
}) {
  const [w, h, d] = size
  return (
    <group position={position}>
      <mesh position={[w / 2, 0, 0]} castShadow receiveShadow>
        <boxGeometry args={[w, h, d]} />
        <meshStandardMaterial color={color} metalness={0.9} roughness={0.38} />
      </mesh>
      <Instances limit={grooves} position={[w + 0.02, 0, 0]}>
        <boxGeometry args={[0.16, grooveAxis === 'z' ? h * 0.85 : 0.22, grooveAxis === 'z' ? 0.22 : d * 0.85]} />
        <meshStandardMaterial color="#181b20" roughness={0.9} />
        {Array.from({ length: grooves }).map((_, i) => {
          const t = (i + 0.5) / grooves - 0.5
          return <Instance key={i} position={grooveAxis === 'z' ? [0, 0, t * d] : [0, t * h, 0]} />
        })}
      </Instances>
    </group>
  )
}

/* ---------------------------------------------------------------- */
/*  Ports SATA                                                       */
/* ---------------------------------------------------------------- */

function SataPorts() {
  const y = ly(MB_POINTS.sata.y)
  const z = lz(MB_POINTS.sata.z)
  return (
    <group position={[SX, y, z]}>
      {[0, 1, 2, 3].map((i) => (
        <group key={i} position={[0.42, (i % 2) * 0.95 - 0.47, Math.floor(i / 2) * 1.05 - 0.52]}>
          <mesh castShadow>
            <boxGeometry args={[0.84, 0.82, 0.92]} />
            <meshStandardMaterial color={i < 2 ? '#1d3f7a' : '#15171b'} roughness={0.45} />
          </mesh>
          <mesh position={[0.44, 0, 0]}>
            <boxGeometry args={[0.08, 0.42, 0.66]} />
            <meshStandardMaterial color="#05060a" roughness={0.95} />
          </mesh>
        </group>
      ))}
    </group>
  )
}

/* ---------------------------------------------------------------- */
/*  Carte mère complète                                              */
/* ---------------------------------------------------------------- */

export interface MotherboardProps {
  /** Le processeur est-il posé ? (change l'état du levier et masque les contacts) */
  cpuInstalled?: boolean
  /** Barrettes présentes : sert à ouvrir/fermer les clips des slots */
  ramSlots?: [boolean, boolean, boolean, boolean]
  gpuInstalled?: boolean
  /** LED d'alimentation allumée */
  powered?: boolean
}

export function Motherboard({
  cpuInstalled = false,
  ramSlots = [false, false, false, false],
  gpuInstalled = false,
  powered = false,
}: MotherboardProps) {
  const io = MB_POINTS.io
  const ioCenterY = ly(io.topY - io.height / 2)

  const standoffs = useMemo<Vec3[]>(() => {
    const zs = [MB.rearZ - 1.4, MB.centerZ, MB.frontZ + 1.4]
    const ys = [MB.topY - 1.3, MB.centerY + 1.5, MB.bottomY + 1.3]
    const pts: Vec3[] = []
    zs.forEach((z) => ys.forEach((y) => pts.push([SX + 0.1, ly(y), lz(z)])))
    return pts
  }, [])

  const smd = useMemo<Vec3[]>(() => {
    const pts: Vec3[] = []
    let s = 1
    const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647)
    for (let i = 0; i < 90; i++) {
      pts.push([SX + 0.07, ly(MB.bottomY + 1 + rnd() * (MB.height - 2)), lz(MB.frontZ + 1 + rnd() * (MB.depth - 2))])
    }
    return pts
  }, [])

  const chokes = useMemo<Vec3[]>(() => {
    const pts: Vec3[] = []
    for (let i = 0; i < 7; i++) pts.push([SX + 0.45, ly(38.6), lz(11.2 + i * 1.35)])
    for (let i = 0; i < 4; i++) pts.push([SX + 0.45, ly(35.4 - i * 1.35), lz(20.4)])
    return pts
  }, [])

  return (
    <group name="motherboard">
      {/* ---- PCB ---- */}
      <mesh material={M.motherboardPcb()} castShadow receiveShadow>
        <boxGeometry args={[MB.thickness, MB.height, MB.depth]} />
      </mesh>

      {/* Vis de fixation sur les entretoises */}
      <Screws points={standoffs} rotation={[0, 0, Math.PI / 2]} radius={0.3} />

      {/* ---- Composants de surface ---- */}
      <SmdChips points={smd} />
      <Capacitors points={chokes} radius={0.42} height={1.0} />

      {/* ---- Socket + processeur ---- */}
      <CpuSocket occupied={cpuInstalled} />

      {/* Étage d'alimentation (VRM) autour du socket */}
      <Heatsink position={[SX, ly(39.4), lz(14.6)]} size={[1.25, 2.0, 9.0]} grooves={9} />
      <Heatsink position={[SX, ly(33.2), lz(20.4)]} size={[1.25, 9.0, 1.9]} grooves={8} grooveAxis="y" />

      {/* ---- Mémoire ---- */}
      {MB_POINTS.dimmZ.map((z, i) => (
        <DimmSlot key={z} z={z} primary={i % 2 === 1} open={!ramSlots[i]} />
      ))}

      {/* ---- PCI Express ---- */}
      <PcieSlot
        y={MB_POINTS.pcie16.y}
        zStart={MB_POINTS.pcie16.zStart}
        zEnd={MB_POINTS.pcie16.zEnd}
        armored
        latchOpen={!gpuInstalled}
      />
      <PcieSlot y={MB_POINTS.pcie1.y} zStart={MB_POINTS.pcie1.zStart} zEnd={MB_POINTS.pcie1.zEnd} />

      {/* ---- Emplacement M.2 ---- */}
      <group position={[SX, ly(MB_POINTS.m2.y), 0]}>
        {/* Connecteur */}
        <mesh position={[0.2, 0, lz(MB_POINTS.m2.zEnd)]} castShadow>
          <boxGeometry args={[0.4, 2.4, 0.55]} />
          <meshStandardMaterial color="#1b1e24" roughness={0.45} />
        </mesh>
        {/* Entretoise de vissage */}
        <mesh position={[0.18, 0, lz(MB_POINTS.m2.zStart)]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.24, 0.24, 0.36, 10]} />
          <meshStandardMaterial color="#8d939c" metalness={1} roughness={0.35} />
        </mesh>
        {/* Sérigraphie du logement */}
        <mesh position={[0.09, 0, lz((MB_POINTS.m2.zStart + MB_POINTS.m2.zEnd) / 2)]}>
          <boxGeometry args={[0.02, 2.3, MB_POINTS.m2.zEnd - MB_POINTS.m2.zStart]} />
          <meshStandardMaterial color="#dfe6dc" roughness={0.85} transparent opacity={0.35} />
        </mesh>
      </group>

      {/* ---- Chipset ---- */}
      <Heatsink
        position={[SX, ly(MB_POINTS.chipset.y), lz(MB_POINTS.chipset.z)]}
        size={[0.9, MB_POINTS.chipset.size, MB_POINTS.chipset.size]}
        grooves={7}
        color="#3a3f47"
      />

      {/* ---- Connecteurs d'alimentation ---- */}
      <group position={[SX + 0.6, ly(MB_POINTS.atx24.y), lz(MB_POINTS.atx24.z)]}>
        <ConnectorShell size={[1.2, MB_POINTS.atx24.length, 0.98]} holes={12} holeAxis="y" />
      </group>
      <group position={[SX + 0.55, ly(MB_POINTS.eps8.y), lz(MB_POINTS.eps8.z)]}>
        <ConnectorShell size={[1.1, 1.0, MB_POINTS.eps8.length]} holes={4} holeAxis="z" />
      </group>

      {/* ---- SATA ---- */}
      <SataPorts />

      {/* ---- Connecteurs de façade et de ventilateurs ---- */}
      <group position={[SX, ly(MB_POINTS.frontPanel.y), lz(MB_POINTS.frontPanel.z)]}>
        <PinHeader cols={5} rows={2} pitch={0.3} height={0.6} />
      </group>
      <group position={[SX, ly(MB_POINTS.cpuFanHeader.y), lz(MB_POINTS.cpuFanHeader.z)]}>
        <PinHeader cols={4} rows={1} pitch={0.3} height={0.55} />
      </group>
      <group position={[SX, ly(MB_POINTS.sysFanHeader.y), lz(MB_POINTS.sysFanHeader.z)]}>
        <PinHeader cols={4} rows={1} pitch={0.3} height={0.55} />
      </group>

      {/* ---- Support de pile CMOS ---- */}
      <group position={[SX, ly(MB_POINTS.cmos.y), lz(MB_POINTS.cmos.z)]}>
        <mesh position={[0.1, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
          <torusGeometry args={[1.05, 0.11, 6, 20]} />
          <meshStandardMaterial color="#9aa1ab" metalness={1} roughness={0.4} />
        </mesh>
        <mesh position={[0.06, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[1.0, 1.0, 0.05, 20]} />
          <meshStandardMaterial color="#15171b" roughness={0.6} />
        </mesh>
      </group>

      {/* ---- LED de mise sous tension ---- */}
      <mesh position={[SX + 0.1, ly(13.4), lz(1.0)]} material={ledMaterial(powered ? '#66ff88' : '#1d2a1f', powered ? 3 : 0)}>
        <boxGeometry args={[0.16, 0.22, 0.34]} />
      </mesh>

      {/* ---- Panneau de connectique arrière ---- */}
      <group>
        {/* Plaque de blindage */}
        <mesh position={[SX + io.depth / 2, ioCenterY, lz(MB.rearZ + 0.65)]} castShadow>
          <boxGeometry args={[io.depth, io.height, 0.12]} />
          <meshStandardMaterial color="#8f959e" metalness={1} roughness={0.34} />
        </mesh>
        {/* Capot plastique de l'ensemble */}
        <mesh position={[SX + io.depth / 2, ioCenterY, lz(MB.rearZ - 1.4)]} castShadow receiveShadow>
          <boxGeometry args={[io.depth - 0.2, io.height - 0.6, 1.5]} />
          <meshStandardMaterial color="#181b20" roughness={0.62} metalness={0.2} />
        </mesh>
        {PORTS.filter((p) => p.host === 'motherboard').map((p) => (
          <RearPort key={p.id} port={p} />
        ))}
      </group>

      {/* ---- Tranche : contacts du bord (décoratif) ---- */}
      <group position={[SX + 0.02, ly(MB.bottomY + 0.35), 0]}>
        <GoldFingers length={MB.depth * 0.35} height={0.22} pitch={0.3} axis="z" />
      </group>
    </group>
  )
}
