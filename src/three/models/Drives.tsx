/**
 * Périphériques de stockage à baie : SSD 2,5 pouces et lecteur de disques.
 *
 * Conventions d'origine locale :
 *   Ssd25         -> centre du boîtier ; connecteurs SATA vers +Z (l'arrière)
 *   OpticalDrive  -> centre du bloc ; façade et tiroir vers -Z (l'avant)
 */

import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import type * as THREE from 'three'
import { M } from '../materials'
import { labelTexture } from '../textures'
import { Grille, Screws } from './primitives'

/* ================================================================ */
/*  SSD 2,5 pouces (SATA)                                            */
/* ================================================================ */

export function Ssd25() {
  const w = 7.0 // 70 mm
  const h = 0.7 // 7 mm
  const d = 10.0 // 100 mm

  const label = labelTexture(
    {
      w: 512,
      h: 300,
      bg: '#1b1f27',
      fg: '#eef2f8',
      accent: '#c084fc',
      title: 'SSD 500 Go',
      subtitle: 'SATA III 6 Gb/s — 2,5"',
      lines: ['MODEL  SD-500-25', 'FW 1.12    7 mm'],
      barcode: true,
    },
    'ssd25',
  )

  return (
    <group name="ssd25">
      {/* Coque en aluminium brossé */}
      <mesh material={M.steel()} castShadow receiveShadow>
        <boxGeometry args={[w, h, d]} />
      </mesh>

      {/* Étiquette collée sur le dessus */}
      <mesh position={[0, h / 2 + 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[w - 0.9, d - 1.6]} />
        <meshStandardMaterial map={label} roughness={0.62} />
      </mesh>

      {/* Liseré du plan de joint des deux demi-coques */}
      <mesh position={[0, -h * 0.12, 0]}>
        <boxGeometry args={[w + 0.02, 0.06, d + 0.02]} />
        <meshStandardMaterial color="#30353d" roughness={0.7} metalness={0.5} />
      </mesh>

      {/* Connecteurs SATA : données (7 broches) puis alimentation (15) */}
      <group position={[0, -h * 0.05, d / 2 + 0.06]}>
        <mesh position={[-2.2, 0, 0]} castShadow>
          <boxGeometry args={[1.4, 0.5, 0.3]} />
          <meshStandardMaterial color="#101216" roughness={0.5} />
        </mesh>
        <mesh position={[-2.2, -0.06, 0.13]}>
          <boxGeometry args={[1.0, 0.22, 0.16]} />
          <meshStandardMaterial color="#05060a" roughness={0.95} />
        </mesh>
        <mesh position={[0.5, 0, 0]} castShadow>
          <boxGeometry args={[2.6, 0.5, 0.3]} />
          <meshStandardMaterial color="#101216" roughness={0.5} />
        </mesh>
        <mesh position={[0.5, -0.06, 0.13]}>
          <boxGeometry args={[2.2, 0.22, 0.16]} />
          <meshStandardMaterial color="#05060a" roughness={0.95} />
        </mesh>
      </group>

      {/* Vis de fixation latérales (4 sur un vrai 2,5") */}
      <Screws
        points={[
          [-w / 2 - 0.02, 0, -d / 2 + 1.4],
          [-w / 2 - 0.02, 0, d / 2 - 2.6],
          [w / 2 + 0.02, 0, -d / 2 + 1.4],
          [w / 2 + 0.02, 0, d / 2 - 2.6],
        ]}
        rotation={[0, 0, Math.PI / 2]}
        radius={0.18}
      />
    </group>
  )
}

/* ================================================================ */
/*  Lecteur de disques 5,25 pouces                                   */
/* ================================================================ */

export function OpticalDrive({ trayOpen = 0 }: { trayOpen?: number }) {
  const w = 14.6 // 146 mm
  const h = 4.15 // 41,5 mm
  const d = 17.0 // 170 mm
  const tray = useRef<THREE.Group>(null)

  // Le tiroir sort vers l'avant (-Z) ; 12 cm course maximale.
  useFrame(() => {
    if (tray.current) tray.current.position.z = -trayOpen * 12
  })

  const label = labelTexture(
    {
      w: 512,
      h: 200,
      bg: '#15181e',
      fg: '#e6ecf5',
      accent: '#38bdf8',
      title: 'DVD±RW / CD-RW',
      subtitle: 'SATA — 24x',
      lines: ['MODEL  ODD-24X-S'],
    },
    'odd',
  )

  return (
    <group name="odd">
      {/* Caisson en tôle */}
      <mesh material={M.darkSteel()} castShadow receiveShadow>
        <boxGeometry args={[w, h, d]} />
      </mesh>
      {/* Étiquette sur le dessus */}
      <mesh position={[0, h / 2 + 0.01, 1.5]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[w - 3, d - 8]} />
        <meshStandardMaterial map={label} roughness={0.66} />
      </mesh>
      {/* Aération latérale */}
      {[1, -1].map((s) => (
        <group key={s} position={[(s * w) / 2 + s * 0.02, 0, 2]} rotation={[0, (s * Math.PI) / 2, 0]}>
          <Grille width={8} height={2.6} step={0.7} hole={0.42} depth={0.1} />
        </group>
      ))}

      {/* ---- Façade + tiroir (l'ensemble coulisse) ---- */}
      <group ref={tray}>
        {/* Façade plastique, légèrement plus large que le caisson */}
        <mesh position={[0, 0, -d / 2 - 0.3]} material={M.casePlastic()} castShadow>
          <boxGeometry args={[w + 0.4, h + 0.3, 0.6]} />
        </mesh>
        {/* Fente du tiroir, moulée dans la façade */}
        <mesh position={[0, -0.35, -d / 2 - 0.62]}>
          <boxGeometry args={[w - 1.4, 0.9, 0.06]} />
          <meshStandardMaterial color="#05060a" roughness={0.95} />
        </mesh>
        {/* Bouton d'éjection + trou de secours + témoin d'activité */}
        <mesh position={[w / 2 - 1.3, 0.9, -d / 2 - 0.64]} castShadow>
          <boxGeometry args={[1.5, 0.5, 0.12]} />
          <meshStandardMaterial color="#3a4049" roughness={0.55} />
        </mesh>
        <mesh position={[w / 2 - 3.1, 0.9, -d / 2 - 0.64]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.09, 0.09, 0.1, 8]} />
          <meshStandardMaterial color="#05060a" roughness={0.95} />
        </mesh>
        <mesh position={[w / 2 - 4.3, 0.9, -d / 2 - 0.64]}>
          <boxGeometry args={[0.3, 0.18, 0.1]} />
          <meshStandardMaterial color="#2a3a2a" roughness={0.6} />
        </mesh>

        {/* Plateau, visible seulement quand le tiroir est sorti.
            Le cylindre de three.js a son axe sur Y : la cuvette et le moyeu
            se posent donc À PLAT, sans rotation. */}
        {trayOpen > 0.02 && (
          <group position={[0, -0.6, -d / 2 + 5.2]}>
            <mesh material={M.plasticBlack()} castShadow receiveShadow>
              <boxGeometry args={[w - 1.4, 0.35, 12.8]} />
            </mesh>
            {/* Cuvette d'un disque de 12 cm, creusée dans le plateau */}
            <mesh position={[0, 0.16, 0]}>
              <cylinderGeometry args={[6.05, 6.05, 0.14, 48]} />
              <meshStandardMaterial color="#0b0d11" roughness={0.88} />
            </mesh>
            {/* Moyeu d'entraînement au centre */}
            <mesh position={[0, 0.25, 0]}>
              <cylinderGeometry args={[0.85, 0.85, 0.2, 24]} />
              <meshStandardMaterial color="#4a5058" roughness={0.5} metalness={0.7} />
            </mesh>
          </group>
        )}
      </group>

      {/* ---- Connecteurs SATA à l'arrière ---- */}
      <group position={[0, -h / 2 + 0.8, d / 2 + 0.06]}>
        <mesh position={[-2.4, 0, 0]} castShadow>
          <boxGeometry args={[1.4, 0.85, 0.4]} />
          <meshStandardMaterial color="#101216" roughness={0.5} />
        </mesh>
        <mesh position={[-2.4, -0.1, 0.15]}>
          <boxGeometry args={[1.0, 0.35, 0.2]} />
          <meshStandardMaterial color="#05060a" roughness={0.95} />
        </mesh>
        <mesh position={[0.8, 0, 0]} castShadow>
          <boxGeometry args={[2.6, 0.85, 0.4]} />
          <meshStandardMaterial color="#101216" roughness={0.5} />
        </mesh>
        <mesh position={[0.8, -0.1, 0.15]}>
          <boxGeometry args={[2.2, 0.35, 0.2]} />
          <meshStandardMaterial color="#05060a" roughness={0.95} />
        </mesh>
      </group>

      {/* Vis de fixation dans la baie */}
      <Screws
        points={[
          [-w / 2 - 0.02, 0.6, -d / 2 + 3],
          [-w / 2 - 0.02, 0.6, -d / 2 + 8],
          [w / 2 + 0.02, 0.6, -d / 2 + 3],
          [w / 2 + 0.02, 0.6, -d / 2 + 8],
        ]}
        rotation={[0, 0, Math.PI / 2]}
        radius={0.2}
      />
    </group>
  )
}
