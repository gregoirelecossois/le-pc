/**
 * Processeur, ventirad, barrettes de mémoire, SSD M.2, pile CMOS.
 *
 * Conventions d'origine locale :
 *   Cpu        -> centre du boîtier de la puce
 *   Cooler     -> face de contact avec le processeur, la tour part vers +X
 *   RamStick   -> tranche de contacts (le bas), la barrette part vers +X
 *   Ssd        -> centre du module
 *   CmosBattery-> centre de la pile
 */

import { useMemo } from 'react'
import { Instance, Instances } from '@react-three/drei'
import type { Vec3 } from '../layout'
import { M } from '../materials'
import { labelTexture } from '../textures'
import { FanUnit, Fins, GoldFingers } from './primitives'

/* ================================================================ */
/*  Processeur                                                       */
/* ================================================================ */

export function Cpu({ size = 4.0 }: { size?: number }) {
  const pads = useMemo(() => {
    const arr: Vec3[] = []
    const n = 17
    const step = (size - 0.7) / n
    for (let i = 0; i < n; i++)
      for (let j = 0; j < n; j++) {
        if (i > 5 && i < 11 && j > 5 && j < 11) continue
        arr.push([0, (-n / 2 + i + 0.5) * step, (-n / 2 + j + 0.5) * step])
      }
    return arr
  }, [size])

  return (
    <group name="cpu">
      {/* Substrat vert-noir */}
      <mesh position={[-0.15, 0, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.16, size, size]} />
        <meshStandardMaterial color="#12331f" roughness={0.55} metalness={0.15} />
      </mesh>

      {/* Contacts dorés en dessous */}
      <Instances limit={pads.length} position={[-0.235, 0, 0]}>
        <boxGeometry args={[0.03, 0.11, 0.11]} />
        <meshStandardMaterial color="#d9ad4a" metalness={1} roughness={0.26} envMapIntensity={1.6} />
        {pads.map((p, i) => (
          <Instance key={i} position={p} />
        ))}
      </Instances>

      {/* Capot métallique (IHS) : embase + plateau, comme sur un vrai CPU */}
      <mesh position={[-0.02, 0, 0]} material={M.ihs()} castShadow>
        <boxGeometry args={[0.1, size - 0.25, size - 0.25]} />
      </mesh>
      <mesh position={[0.11, 0, 0]} material={M.ihs()} castShadow>
        <boxGeometry args={[0.17, size - 1.05, size - 0.75]} />
      </mesh>

      {/* Gravure laser sur le capot */}
      <mesh position={[0.2, 0.35, 0]}>
        <boxGeometry args={[0.01, 0.5, size - 1.6]} />
        <meshStandardMaterial color="#8f959e" roughness={0.7} metalness={0.8} />
      </mesh>
      <mesh position={[0.2, -0.4, 0]}>
        <boxGeometry args={[0.01, 0.3, size - 2.2]} />
        <meshStandardMaterial color="#8f959e" roughness={0.7} metalness={0.8} />
      </mesh>

      {/* Triangle doré = repère d'orientation (à faire correspondre au socket) */}
      <mesh position={[-0.06, -size / 2 + 0.42, -size / 2 + 0.42]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.26, 0.26, 0.05, 3]} />
        <meshStandardMaterial color="#e8c766" metalness={0.95} roughness={0.3} />
      </mesh>

      {/* Encoches latérales de détrompage */}
      {[1, -1].map((s) => (
        <mesh key={s} position={[-0.15, (s * size) / 2, size * 0.22]}>
          <boxGeometry args={[0.18, 0.3, 0.5]} />
          <meshStandardMaterial color="#0a1a10" roughness={0.7} />
        </mesh>
      ))}
    </group>
  )
}

/* ================================================================ */
/*  Ventirad (ventilateur + radiateur)                               */
/* ================================================================ */

export function Cooler({ fanSpeed = 0 }: { fanSpeed?: number }) {
  const finCount = 52
  const finSpacing = 0.19
  const stackStart = 2.2
  const stackLen = (finCount - 1) * finSpacing
  const stackCenter = stackStart + stackLen / 2
  const finSize: [number, number, number] = [0.05, 11.6, 4.6]

  const pipeZ = [-1.55, -0.55, 0.55, 1.55]

  return (
    <group name="cooler">
      {/* Semelle cuivrée en contact avec le processeur */}
      <mesh position={[0.22, 0, 0]} material={M.copper()} castShadow receiveShadow>
        <boxGeometry args={[0.44, 4.4, 4.4]} />
      </mesh>
      {/* Bloc de jonction en aluminium */}
      <mesh position={[0.75, 0, 0]} material={M.aluminium()} castShadow>
        <boxGeometry args={[0.62, 4.0, 4.6]} />
      </mesh>

      {/* Équerres de fixation traversant vers la carte mère */}
      {[1, -1].map((s) => (
        <mesh key={s} position={[0.5, s * 3.1, 0]} material={M.steel()} castShadow>
          <boxGeometry args={[0.22, 2.6, 1.1]} />
        </mesh>
      ))}

      {/* Caloducs en cuivre traversant les ailettes */}
      {pipeZ.map((z) => (
        <group key={z}>
          <mesh position={[stackCenter, 1.2, z]} rotation={[0, 0, Math.PI / 2]} material={M.copper()} castShadow>
            <cylinderGeometry args={[0.3, 0.3, stackLen + 2.4, 12]} />
          </mesh>
          <mesh position={[stackCenter, -1.2, z]} rotation={[0, 0, Math.PI / 2]} material={M.copper()} castShadow>
            <cylinderGeometry args={[0.3, 0.3, stackLen + 2.4, 12]} />
          </mesh>
        </group>
      ))}

      {/* Tour d'ailettes */}
      <Fins
        count={finCount}
        spacing={finSpacing}
        size={finSize}
        axis="x"
        position={[stackCenter, 0, 0]}
      />

      {/* Capot supérieur : plaque plastique noire, comme sur un vrai ventirad,
          percée par les extrémités des caloducs */}
      <mesh position={[stackStart + stackLen + 0.42, 0, 0]} castShadow>
        <boxGeometry args={[0.5, 11.9, 4.9]} />
        <meshStandardMaterial color="#3c424b" roughness={0.38} metalness={0.55} />
      </mesh>
      <mesh position={[stackStart + stackLen + 0.7, 0, 0]}>
        <boxGeometry args={[0.06, 9.2, 3.4]} />
        <meshStandardMaterial color="#575e69" roughness={0.28} metalness={0.85} />
      </mesh>

      {/* Ventilateur plaqué sur la face avant de la tour */}
      <group position={[stackCenter - 0.4, 0, -3.6]}>
        <CoolerFan speed={fanSpeed} />
      </group>

      {/* Câble 4 broches vers le connecteur CPU_FAN */}
      <mesh position={[stackCenter - 0.4, -5.6, -2.4]} rotation={[0, 0, 0.2]}>
        <boxGeometry args={[0.28, 2.6, 0.2]} />
        <meshStandardMaterial color="#0b0c0f" roughness={0.85} />
      </mesh>
    </group>
  )
}

/** Ventilateur du ventirad : même modèle que les ventilateurs de boîtier. */
function CoolerFan({ speed }: { speed: number }) {
  return <FanUnit size={12} thickness={2.5} blades={9} speed={speed} frameColor="#1a1d22" />
}

/* ================================================================ */
/*  Barrette de mémoire vive                                         */
/* ================================================================ */

export function RamStick({ accent = '#2f6bd0' }: { accent?: string }) {
  const len = 13.35 // 133,35 mm
  const pcbH = 3.1
  const spreaderH = 4.2

  return (
    <group name="ram">
      {/* PCB */}
      <mesh position={[pcbH / 2, 0, 0]} material={M.pcbBlack()} castShadow receiveShadow>
        <boxGeometry args={[pcbH, len, 0.13]} />
      </mesh>

      {/* Contacts dorés + encoche détrompeuse décentrée */}
      <group position={[0.16, 0, 0]}>
        <GoldFingers length={len - 0.5} height={0.32} thickness={0.16} pitch={0.13} notches={[0.42]} axis="y" />
      </group>
      {/* L'encoche elle-même, bien visible */}
      <mesh position={[0.16, -len * 0.08, 0]}>
        <boxGeometry args={[0.5, 0.2, 0.2]} />
        <meshStandardMaterial color="#05060a" roughness={0.9} />
      </mesh>

      {/* Puces mémoire (8 par face) */}
      {[0.09, -0.09].map((zSide) =>
        Array.from({ length: 8 }).map((_, i) => (
          <mesh
            key={`${zSide}-${i}`}
            position={[pcbH * 0.55, -len / 2 + 1.1 + i * 1.55, zSide]}
            castShadow
          >
            <boxGeometry args={[1.5, 1.05, 0.1]} />
            <meshStandardMaterial color="#0b0d10" roughness={0.42} metalness={0.2} />
          </mesh>
        )),
      )}

      {/* Dissipateur (heatspreader) en aluminium anodisé */}
      {[0.28, -0.28].map((zSide) => (
        <mesh key={zSide} position={[spreaderH / 2 + 0.35, 0, zSide]} castShadow receiveShadow>
          <boxGeometry args={[spreaderH, len - 0.3, 0.16]} />
          <meshStandardMaterial color={accent} metalness={0.85} roughness={0.3} envMapIntensity={1.3} />
        </mesh>
      ))}
      {/* Crête supérieure dentelée */}
      <Instances limit={12} position={[spreaderH + 0.45, 0, 0]}>
        <boxGeometry args={[0.5, 0.55, 0.72]} />
        <meshStandardMaterial color={accent} metalness={0.85} roughness={0.32} />
        {Array.from({ length: 12 }).map((_, i) => (
          <Instance key={i} position={[0, -len / 2 + 0.9 + i * 1.05, 0]} />
        ))}
      </Instances>
    </group>
  )
}

/* ================================================================ */
/*  SSD au format M.2 2280                                           */
/* ================================================================ */

export function Ssd() {
  const len = 8.0 // 80 mm
  const w = 2.2 // 22 mm
  const label = labelTexture(
    {
      w: 512,
      h: 140,
      bg: '#101418',
      fg: '#e8edf5',
      accent: '#7c5cff',
      title: 'NVMe SSD 1 To',
      subtitle: 'PCIe Gen4 x4  —  7000 Mo/s',
      lines: ['M.2 2280', 'S/N 4821-77-C'],
      barcode: true,
    },
    'ssd',
  )

  return (
    <group name="ssd">
      {/* PCB */}
      <mesh material={M.pcbBlack()} castShadow receiveShadow>
        <boxGeometry args={[0.22, w, len]} />
      </mesh>

      {/* Contacts + détrompeur M-key */}
      <group position={[0, 0, len / 2 + 0.1]}>
        <GoldFingers length={w - 0.5} height={0.42} thickness={0.2} pitch={0.11} notches={[0.2]} axis="y" />
      </group>

      {/* Contrôleur + puces NAND */}
      <mesh position={[0.2, 0, len / 2 - 1.6]} castShadow>
        <boxGeometry args={[0.2, w - 0.7, 1.1]} />
        <meshStandardMaterial color="#0a0c10" roughness={0.4} metalness={0.25} />
      </mesh>
      {[0.6, -1.1].map((z, i) => (
        <mesh key={i} position={[0.2, 0, z]} castShadow>
          <boxGeometry args={[0.18, w - 0.6, 1.35]} />
          <meshStandardMaterial color="#0d1014" roughness={0.44} metalness={0.2} />
        </mesh>
      ))}

      {/* Étiquette collée */}
      <mesh position={[0.32, 0, -0.4]}>
        <boxGeometry args={[0.02, w - 0.25, len - 2.6]} />
        <meshStandardMaterial map={label} roughness={0.65} />
      </mesh>

      {/* Encoche de vissage */}
      <mesh position={[0, 0, -len / 2 + 0.15]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.22, 0.22, 0.24, 10]} />
        <meshStandardMaterial color="#c9a227" metalness={1} roughness={0.3} />
      </mesh>
    </group>
  )
}

/* ================================================================ */
/*  Pile CMOS                                                        */
/* ================================================================ */

export function CmosBattery() {
  return (
    <group name="cmos" rotation={[0, 0, Math.PI / 2]}>
      <mesh castShadow receiveShadow>
        <cylinderGeometry args={[0.98, 0.98, 0.32, 26]} />
        <meshStandardMaterial color="#c8ccd2" metalness={1} roughness={0.22} envMapIntensity={1.5} />
      </mesh>
      <mesh position={[0, 0.17, 0]}>
        <cylinderGeometry args={[0.72, 0.72, 0.03, 24]} />
        <meshStandardMaterial color="#e2e5ea" metalness={0.9} roughness={0.35} />
      </mesh>
      <mesh position={[0, 0.19, 0]}>
        <boxGeometry args={[0.9, 0.02, 0.22]} />
        <meshStandardMaterial color="#5b6068" roughness={0.6} metalness={0.5} />
      </mesh>
    </group>
  )
}
