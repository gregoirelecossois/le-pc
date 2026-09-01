/**
 * Carte graphique, bloc d'alimentation, disque dur, ventilateurs de boîtier.
 * Toutes ces pièces ont pour origine locale le centre de leur boîte englobante.
 */

import { Instance, Instances } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { useRef } from 'react'
import * as THREE from 'three'
import { M, ledMaterial } from '../materials'
import { labelTexture } from '../textures'
import { FanUnit, GoldFingers, Grille, Screws } from './primitives'
import { PORTS, type Port } from '@/data/ports'
import { SLOTS, type Vec3 } from '../layout'

/* ================================================================ */
/*  Carte graphique                                                  */
/* ================================================================ */

/** Prise vidéo sur l'équerre de la carte graphique (repère local). */
function BracketPort({ port, origin }: { port: Port; origin: Vec3 }) {
  const p: Vec3 = [
    port.position[0] - origin[0],
    port.position[1] - origin[1],
    port.position[2] - origin[2],
  ]
  const [sx, sy, sz] = port.size
  return (
    <group position={p}>
      <mesh castShadow>
        <boxGeometry args={[sx, sy, sz]} />
        <meshStandardMaterial color="#9aa1ab" metalness={1} roughness={0.42} />
      </mesh>
      <mesh position={[0, 0, sz / 2 + 0.02]}>
        <boxGeometry args={[sx * 0.8, sy * 0.6, 0.06]} />
        <meshStandardMaterial color={port.color} roughness={0.92} />
      </mesh>
    </group>
  )
}

export function Gpu({
  fanSpeed = 0,
  worldOrigin = SLOTS.gpu.position,
  ledOn = false,
}: {
  fanSpeed?: number
  /** Position monde du centre de la carte : sert à placer les prises de l'équerre */
  worldOrigin?: Vec3
  ledOn?: boolean
}) {
  const fanA = useRef<THREE.Group>(null)
  const fanB = useRef<THREE.Group>(null)
  useFrame((_, dt) => {
    if (!fanSpeed) return
    const d = dt * fanSpeed * Math.PI * 2
    if (fanA.current) fanA.current.rotation.y += d
    if (fanB.current) fanB.current.rotation.y -= d
  })

  const label = labelTexture(
    { w: 512, h: 128, bg: '#0d1016', fg: '#d8e0ec', accent: '#66d17a', title: 'GeForce RTX', subtitle: '8 Go GDDR6' },
    'gpu',
  )

  return (
    <group name="gpu">
      {/* ---- PCB (plan horizontal, épaisseur sur Y) ---- */}
      <mesh position={[-1.1, 1.1, -0.3]} material={M.pcbBlue()} castShadow receiveShadow>
        <boxGeometry args={[9.0, 0.2, 24.0]} />
      </mesh>

      {/* ---- Contacts PCIe 16x ---- */}
      <group position={[-5.62, 0.75, 8.3]} rotation={[0, 0, 0]}>
        <GoldFingers length={8.6} height={0.42} thickness={0.2} pitch={0.12} notches={[0.16]} axis="z" />
      </group>
      <mesh position={[-5.5, 0.95, 8.3]} material={M.pcbBlue()}>
        <boxGeometry args={[0.5, 0.62, 8.9]} />
      </mesh>

      {/* ---- Plaque arrière (backplate) ---- */}
      <mesh position={[-0.9, 1.5, -0.6]} material={M.darkSteel()} castShadow>
        <boxGeometry args={[9.6, 0.22, 24.6]} />
      </mesh>
      <mesh position={[-0.9, 1.63, -0.6]}>
        <boxGeometry args={[6.5, 0.02, 12]} />
        <meshStandardMaterial map={label} roughness={0.6} metalness={0.2} />
      </mesh>

      {/* ---- Radiateur : ailettes empilées sous le PCB ---- */}
      <Instances limit={34} position={[0.2, -0.72, -1.6]} castShadow>
        <boxGeometry args={[9.4, 2.1, 0.07]} />
        <meshStandardMaterial color="#8f959d" metalness={1} roughness={0.44} />
        {Array.from({ length: 34 }).map((_, i) => (
          <Instance key={i} position={[0, 0, -8.5 + i * 0.52]} />
        ))}
      </Instances>
      {/* Caloducs */}
      {[-2.2, 0.4, 2.8].map((x) => (
        <mesh key={x} position={[x, -0.45, -1.6]} rotation={[Math.PI / 2, 0, 0]} material={M.copper()} castShadow>
          <cylinderGeometry args={[0.26, 0.26, 15.5, 10]} />
        </mesh>
      ))}

      {/* ---- Carénage plastique + 2 ventilateurs tournés vers le bas ---- */}
      {/* joues latérales + dessous : les ailettes ne dépassent plus */}
      {[
        [0, -2.0, -0.8, 11.0, 0.4, 24.4],
        [5.3, -0.55, -0.8, 0.4, 3.3, 24.4],
        [-5.3, -0.55, -0.8, 0.4, 3.3, 24.4],
        [0, -0.7, -13.0, 11.0, 3.0, 0.4],
      ].map((b, i) => (
        <mesh key={i} position={[b[0], b[1], b[2]]} castShadow receiveShadow>
          <boxGeometry args={[b[3], b[4], b[5]]} />
          <meshStandardMaterial color="#1a1d23" roughness={0.5} metalness={0.3} />
        </mesh>
      ))}
      {/* ---- 2 ventilateurs axiaux, soufflant vers le bas (-Y) ---- */}
      {[
        [-6.2, fanA],
        [4.4, fanB],
      ].map(([z, ref], i) => (
        <group key={i} position={[0, -2.05, z as number]}>
          {/* Cerclage de l'ouverture : un vrai « trou » dans le carénage */}
          <mesh castShadow receiveShadow>
            <cylinderGeometry args={[4.5, 4.5, 1.4, 32, 1, true]} />
            <meshStandardMaterial color="#15181d" roughness={0.6} metalness={0.3} side={THREE.DoubleSide} />
          </mesh>
          {/* Jonc de renfort sur le bord inférieur */}
          <mesh position={[0, -0.62, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[4.42, 0.16, 8, 44]} />
            <meshStandardMaterial color="#0c0e11" roughness={0.7} metalness={0.4} />
          </mesh>

          {/* Rotor : moyeu + 9 pales, tourne autour de Y */}
          <group ref={ref as React.RefObject<THREE.Group>}>
            <mesh castShadow>
              <cylinderGeometry args={[1.45, 1.35, 1.0, 22]} />
              <meshStandardMaterial color="#0f1216" roughness={0.45} metalness={0.4} />
            </mesh>
            <mesh position={[0, 0.52, 0]}>
              <cylinderGeometry args={[1.45, 1.45, 0.1, 22]} />
              <meshStandardMaterial color="#1c2026" roughness={0.5} metalness={0.5} />
            </mesh>
            {Array.from({ length: 9 }).map((_, b) => {
              const a = (b / 9) * Math.PI * 2
              return (
                <group key={b} rotation={[0, a, 0]}>
                  {/* pale : longue sur X (radiale), inclinée pour le pas */}
                  <mesh position={[2.75, 0, 0]} rotation={[0.5, 0, 0]} material={M.fanBlade()} castShadow>
                    <boxGeometry args={[3.1, 0.12, 1.9]} />
                  </mesh>
                </group>
              )
            })}
          </group>
        </group>
      ))}

      {/* ---- Bandeau lumineux latéral ---- */}
      <mesh position={[4.9, 0.4, -0.8]} material={ledMaterial(ledOn ? '#66d17a' : '#1b2a1f', ledOn ? 2.4 : 0)}>
        <boxGeometry args={[0.16, 0.6, 14]} />
      </mesh>

      {/* ---- Connecteur d'alimentation PCIe 8 broches ---- */}
      <group position={[2.6, 1.9, -9.4]}>
        <mesh castShadow>
          <boxGeometry args={[2.3, 0.9, 1.1]} />
          <meshStandardMaterial color="#101216" roughness={0.45} />
        </mesh>
        <Instances limit={8} position={[0, 0.5, 0]}>
          <boxGeometry args={[0.4, 0.1, 0.4]} />
          <meshStandardMaterial color="#05060a" roughness={0.95} />
          {Array.from({ length: 8 }).map((_, i) => (
            <Instance key={i} position={[-0.9 + (i % 4) * 0.55, 0, (Math.floor(i / 4) - 0.5) * 0.45]} />
          ))}
        </Instances>
      </group>

      {/* ---- Équerre de fixation + sorties vidéo ---- */}
      <mesh position={[-1.6, 0, 12.6]} material={M.steel()} castShadow>
        <boxGeometry args={[9.8, 3.9, 0.16]} />
      </mesh>
      <mesh position={[-5.9, 0, 12.6]} material={M.steel()} castShadow>
        <boxGeometry args={[1.1, 4.6, 0.16]} />
      </mesh>
      {PORTS.filter((p) => p.host === 'gpu').map((p) => (
        <BracketPort key={p.id} port={p} origin={worldOrigin} />
      ))}
      {/* Grille d'échappement de l'équerre */}
      <group position={[2.6, 0, 12.68]}>
        <Grille width={4.6} height={3.2} step={0.7} hole={0.42} depth={0.1} />
      </group>
    </group>
  )
}

/* ================================================================ */
/*  Bloc d'alimentation                                              */
/* ================================================================ */

export function Psu({ fanSpeed = 0, showCables = true }: { fanSpeed?: number; showCables?: boolean }) {
  const w = 15
  const h = 8.6
  const d = 14

  const label = labelTexture(
    {
      w: 512,
      h: 320,
      bg: '#12151a',
      fg: '#e6ebf2',
      accent: '#ffd166',
      title: '650 W',
      subtitle: '80 PLUS Bronze',
      lines: ['+12V  54A', '+5V  20A   +3,3V  20A', 'AC INPUT 200-240V ~ 4A 50/60Hz'],
      barcode: true,
    },
    'psu',
  )

  return (
    <group name="psu">
      {/* Caisson */}
      <mesh material={M.darkSteel()} castShadow receiveShadow>
        <boxGeometry args={[w, h, d]} />
      </mesh>

      {/* Étiquette sur le dessus */}
      <mesh position={[0, h / 2 + 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[w - 2.6, d - 3]} />
        <meshStandardMaterial map={label} roughness={0.68} />
      </mesh>

      {/* Ventilateur 120 mm sous le caisson : il aspire l'air par le dessous */}
      <group position={[0, -h / 2 + 0.62, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <FanUnit size={12.2} thickness={1.0} blades={11} speed={fanSpeed} frameColor="#101216" />
      </group>
      {/* Grille de protection affleurant la tôle */}
      <group position={[0, -h / 2 + 0.06, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <Instances limit={7}>
          <torusGeometry args={[1, 0.05, 5, 26]} />
          <meshStandardMaterial color="#6b7178" metalness={1} roughness={0.4} />
          {Array.from({ length: 7 }).map((_, i) => (
            <Instance key={i} scale={[0.85 + i * 0.82, 0.85 + i * 0.82, 1]} />
          ))}
        </Instances>
      </group>

      {/* Face arrière : grille + prise secteur + interrupteur */}
      <group position={[0, 0, d / 2 + 0.02]}>
        <group position={[2.6, 0, 0.04]}>
          <Grille width={8.4} height={6.6} step={0.85} hole={0.55} depth={0.16} color="#0c0e11" />
        </group>
        {/* Prise C13 */}
        <group position={[-4.6, 1.2, 0.35]}>
          <mesh castShadow>
            <boxGeometry args={[2.7, 2.5, 0.7]} />
            <meshStandardMaterial color="#0d0f13" roughness={0.55} />
          </mesh>
          <mesh position={[0, 0, 0.36]}>
            <boxGeometry args={[2.2, 1.9, 0.12]} />
            <meshStandardMaterial color="#05060a" roughness={0.95} />
          </mesh>
          {[-0.62, 0, 0.62].map((x, i) => (
            <mesh key={i} position={[x, i === 1 ? 0.5 : -0.25, 0.42]}>
              <boxGeometry args={[0.2, 0.55, 0.1]} />
              <meshStandardMaterial color="#8d939c" metalness={1} roughness={0.35} />
            </mesh>
          ))}
        </group>
        {/* Interrupteur O / I */}
        <group position={[-4.6, -2.3, 0.3]}>
          <mesh castShadow>
            <boxGeometry args={[2.0, 1.2, 0.55]} />
            <meshStandardMaterial color="#15181d" roughness={0.5} />
          </mesh>
          <mesh position={[0.35, 0, 0.3]} rotation={[0.25, 0, 0]}>
            <boxGeometry args={[1.1, 0.9, 0.2]} />
            <meshStandardMaterial color="#2a2e35" roughness={0.6} />
          </mesh>
        </group>
      </group>

      {/* Passe-fil : le « cercle » d'où sortent tous les câbles vers l'avant.
          Bien visible, c'est le point de départ de l'exercice de câblage. */}
      {showCables && (
        <group position={[0, 0, -d / 2 - 0.3]}>
          {/* collerette caoutchouc */}
          <mesh rotation={[Math.PI / 2, 0, 0]} castShadow>
            <cylinderGeometry args={[2.3, 2.5, 1.0, 20]} />
            <meshStandardMaterial color="#0a0b0e" roughness={0.9} />
          </mesh>
          {/* jonc clair sur le pourtour, pour lire le cercle de loin */}
          <mesh position={[0, 0, -0.55]} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[2.35, 0.16, 8, 28]} />
            <meshStandardMaterial color="#3a3f47" roughness={0.6} metalness={0.4} />
          </mesh>
          {/* amorce de faisceau qui dépasse du trou */}
          <mesh position={[0, 0, -0.8]} rotation={[Math.PI / 2, 0, 0]} castShadow>
            <cylinderGeometry args={[1.5, 1.7, 1.4, 14]} />
            <meshStandardMaterial color="#0a0b0e" roughness={0.88} />
          </mesh>
        </group>
      )}

      {/* Vis de fixation à l'arrière */}
      <Screws
        points={[
          [-w / 2 + 1.1, h / 2 - 1.1, d / 2 + 0.1],
          [w / 2 - 1.1, h / 2 - 1.1, d / 2 + 0.1],
          [-w / 2 + 1.1, -h / 2 + 1.1, d / 2 + 0.1],
          [w / 2 - 1.1, -h / 2 + 1.1, d / 2 + 0.1],
        ]}
        rotation={[Math.PI / 2, 0, 0]}
      />
    </group>
  )
}

/* ================================================================ */
/*  Disque dur 3,5"                                                  */
/* ================================================================ */

export function Hdd() {
  const w = 10.16
  const h = 2.61
  const d = 14.7

  const label = labelTexture(
    {
      w: 512,
      h: 340,
      bg: '#d8dbe0',
      fg: '#1a1d22',
      accent: '#3a6ea5',
      title: '1 To  7200 tr/min',
      subtitle: 'SATA 6 Gb/s  —  3,5 pouces',
      lines: ['MODEL  HDX-1000-7K', 'FW 2.04    MADE IN MALAYSIA'],
      barcode: true,
    },
    'hdd',
  )

  return (
    <group name="hdd">
      {/* Corps en aluminium moulé */}
      <mesh material={M.steel()} castShadow receiveShadow>
        <boxGeometry args={[w, h, d]} />
      </mesh>
      {/* Capot supérieur + étiquette */}
      <mesh position={[0, h / 2 + 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[w - 0.5, d - 0.6]} />
        <meshStandardMaterial map={label} roughness={0.6} metalness={0.15} />
      </mesh>
      {/* Vis du capot */}
      <Screws
        points={[
          [-w / 2 + 0.6, h / 2 + 0.03, -d / 2 + 0.6],
          [w / 2 - 0.6, h / 2 + 0.03, -d / 2 + 0.6],
          [-w / 2 + 0.6, h / 2 + 0.03, d / 2 - 0.6],
          [w / 2 - 0.6, h / 2 + 0.03, d / 2 - 0.6],
          [0, h / 2 + 0.03, 0],
        ]}
        radius={0.2}
      />

      {/* Carte électronique en dessous */}
      <mesh position={[0, -h / 2 - 0.09, 0.4]} material={M.pcbBlack()} castShadow>
        <boxGeometry args={[w - 1.4, 0.18, d - 3.4]} />
      </mesh>

      {/* Connecteurs SATA (données + alimentation) à l'arrière */}
      <group position={[0, -h / 2 + 0.55, d / 2 + 0.12]}>
        {/* données : 7 broches */}
        <mesh position={[-2.6, 0, 0]} castShadow>
          <boxGeometry args={[1.4, 0.85, 0.4]} />
          <meshStandardMaterial color="#101216" roughness={0.5} />
        </mesh>
        <mesh position={[-2.6, -0.1, 0.15]}>
          <boxGeometry args={[1.0, 0.35, 0.2]} />
          <meshStandardMaterial color="#05060a" roughness={0.95} />
        </mesh>
        {/* alimentation : 15 broches */}
        <mesh position={[0.6, 0, 0]} castShadow>
          <boxGeometry args={[2.6, 0.85, 0.4]} />
          <meshStandardMaterial color="#101216" roughness={0.5} />
        </mesh>
        <mesh position={[0.6, -0.1, 0.15]}>
          <boxGeometry args={[2.2, 0.35, 0.2]} />
          <meshStandardMaterial color="#05060a" roughness={0.95} />
        </mesh>
      </group>
    </group>
  )
}

/* ================================================================ */
/*  Ventilateur de boîtier                                           */
/* ================================================================ */

export function CaseFan({
  speed = 0,
  /** +1 : souffle vers +Z (extraction arrière) ; -1 : souffle vers -Z */
  direction = 1,
  showArrow = true,
}: {
  speed?: number
  direction?: 1 | -1
  showArrow?: boolean
}) {
  return (
    <group name="caseFan">
      <FanUnit size={12} thickness={2.5} blades={9} speed={speed} showArrow={showArrow} arrowDir={direction} />
      {/* Câble 3 broches */}
      <mesh position={[-5.4, -5.4, 0]} rotation={[0, 0, 0.6]} castShadow>
        <boxGeometry args={[0.28, 2.2, 0.22]} />
        <meshStandardMaterial color="#0b0c0f" roughness={0.85} />
      </mesh>
    </group>
  )
}
