/**
 * Les PÉRIPHÉRIQUES, modélisés comme les composants internes :
 * écran, clavier, souris, manette, enceinte, microphone, box internet,
 * clé USB et câble d'alimentation.
 *
 * Conventions communes :
 *   - toutes les cotes sont en centimètres, à l'échelle de l'unité centrale
 *   - l'objet POSE sur le plan y = 0 et regarde vers +Z (vers le spectateur)
 *   - `CABLE_EXIT` donne le point d'où sort son câble, en coordonnées locales
 */

import { useMemo } from 'react'
import { Instance, Instances } from '@react-three/drei'
import * as THREE from 'three'
import type { Vec3 } from '../layout'
import { M } from '../materials'
import { screenTexture } from '../textures'
import { Grille, SoftBox } from './primitives'
import type { PlugKind } from './Plugs'

export type PeripheralModelId =
  | 'monitor'
  | 'keyboard'
  | 'mouse'
  | 'gamepad'
  | 'speaker'
  | 'micro'
  | 'box'
  | 'usbkey'
  | 'power'

/* ================================================================ */
/*  L'écran                                                          */
/* ================================================================ */

function Monitor({ on = true }: { on?: boolean }) {
  const tex = useMemo(() => screenTexture(), [])
  const w = 52
  const h = 30

  return (
    <group name="monitor">
      {/* Socle */}
      <mesh position={[0, 0.6, 1]} castShadow receiveShadow>
        <cylinderGeometry args={[9.5, 10.5, 1.2, 40]} />
        <meshStandardMaterial color="#20242b" roughness={0.4} metalness={0.6} />
      </mesh>
      {/* Colonne */}
      <mesh position={[0, 8, 0.4]} castShadow>
        <boxGeometry args={[4.4, 15, 2.2]} />
        <meshStandardMaterial color="#272c34" roughness={0.42} metalness={0.55} />
      </mesh>
      {/* Charnière */}
      <mesh position={[0, 15, 0.4]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[1.5, 1.5, 5.2, 18]} />
        <meshStandardMaterial color="#1a1e24" roughness={0.5} metalness={0.5} />
      </mesh>

      {/* Dalle */}
      <group position={[0, 15 + h / 2 + 1.2, 0]}>
        <SoftBox args={[w, h + 2.6, 1.7]} radius={0.35} position={[0, 0, -0.3]}>
          <meshStandardMaterial color="#15181e" roughness={0.45} metalness={0.35} />
        </SoftBox>
        {/* Image affichée */}
        <mesh position={[0, 0.7, 0.62]}>
          <planeGeometry args={[w - 2.4, h - 1.4]} />
          {on ? (
            <meshBasicMaterial map={tex} toneMapped={false} />
          ) : (
            <meshStandardMaterial color="#0b0e12" roughness={0.2} metalness={0.2} />
          )}
        </mesh>
        {/* Menton + LED de veille */}
        <mesh position={[0, -h / 2 - 0.4, 0.6]}>
          <boxGeometry args={[w - 1, 1.6, 0.1]} />
          <meshStandardMaterial color="#1b1f26" roughness={0.5} />
        </mesh>
        <mesh position={[w / 2 - 3, -h / 2 - 0.4, 0.7]}>
          <boxGeometry args={[0.5, 0.24, 0.08]} />
          <meshBasicMaterial color={on ? '#66ff9a' : '#3a1f1f'} toneMapped={false} />
        </mesh>
        {/* Connectique au dos */}
        <mesh position={[0, -h / 2 + 2, -1.15]}>
          <boxGeometry args={[9, 3, 0.6]} />
          <meshStandardMaterial color="#0e1116" roughness={0.7} />
        </mesh>
      </group>
    </group>
  )
}

/* ================================================================ */
/*  Le clavier                                                       */
/* ================================================================ */

function Keyboard() {
  const keys = useMemo(() => {
    const arr: { p: Vec3; s: number }[] = []
    const rows = [
      { n: 14, y: 0, w: 1 },
      { n: 14, y: 1, w: 1 },
      { n: 13, y: 2, w: 1 },
      { n: 12, y: 3, w: 1 },
      { n: 8, y: 4, w: 1 },
    ]
    const pitch = 1.9
    for (const r of rows) {
      for (let i = 0; i < r.n; i++) {
        const x = -((r.n - 1) / 2) * pitch + i * pitch
        const z = -4.2 + r.y * 1.9
        arr.push({ p: [x, 0, z], s: r.y === 4 && i === 4 ? 5 : 1 })
      }
    }
    return arr
  }, [])

  return (
    <group name="keyboard">
      {/* Coque, légèrement inclinée vers l'élève */}
      <group rotation={[-0.06, 0, 0]}>
        <SoftBox args={[30, 1.8, 12]} radius={0.3} position={[0, 0.9, 0]}>
          <meshStandardMaterial color="#1a1e25" roughness={0.55} metalness={0.2} />
        </SoftBox>
        {/* Plaque supérieure */}
        <mesh position={[0, 1.82, 0]}>
          <boxGeometry args={[29.2, 0.06, 11.2]} />
          <meshStandardMaterial color="#23282f" roughness={0.6} />
        </mesh>
        {/* Touches */}
        <Instances limit={keys.length} position={[0, 2.1, 0.4]} castShadow>
          <boxGeometry args={[1.55, 0.5, 1.55]} />
          <meshStandardMaterial color="#2f353e" roughness={0.7} />
          {keys.map((k, i) => (
            <Instance key={i} position={k.p} scale={[k.s, 1, 1]} />
          ))}
        </Instances>
        {/* Trois voyants (verr. num, majuscules, défilement) */}
        {[-1, 0, 1].map((i) => (
          <mesh key={i} position={[10 + i * 1.1, 1.9, -5.2]}>
            <boxGeometry args={[0.4, 0.06, 0.3]} />
            <meshBasicMaterial color={i === 0 ? '#66ff9a' : '#1e2a22'} toneMapped={false} />
          </mesh>
        ))}
      </group>
      {/* Pieds relevables, à l'arrière */}
      {[-11, 11].map((x) => (
        <mesh key={x} position={[x, 0.2, -5]}>
          <boxGeometry args={[2, 0.4, 1]} />
          <meshStandardMaterial color="#0f1216" roughness={0.8} />
        </mesh>
      ))}
    </group>
  )
}

/* ================================================================ */
/*  La souris                                                        */
/* ================================================================ */

function Mouse({ showcase = false }: { showcase?: boolean }) {
  // Coque : une sphère aplatie et allongée. Sa partie basse plonge sous la
  // semelle, qui est donc taillée à la section de la coque à cette hauteur —
  // sinon elle dépasse de partout comme une planche à roulettes.
  const r = 3.3

  return (
    <group name="mouse">
      <mesh position={[0, 1.7, 0]} scale={[1, 0.62, 1.75]} castShadow receiveShadow>
        <sphereGeometry args={[r, 30, 20]} />
        <meshStandardMaterial color="#252a33" roughness={0.6} metalness={0.05} envMapIntensity={0.6} />
      </mesh>
      {/* Semelle */}
      <mesh position={[0, 0.2, 0]} scale={[1, 1, 1.75]}>
        <cylinderGeometry args={[2.2, 2.2, 0.4, 28]} />
        <meshStandardMaterial color="#0d1013" roughness={0.9} />
      </mesh>
      {/* Fente entre les deux boutons : elle TRAVERSE la surface, sinon le
          trait reste enfoui sous la coque et la souris n'est qu'un galet. */}
      <mesh position={[0, 3.25, 3.0]}>
        <boxGeometry args={[0.16, 0.55, 4.2]} />
        <meshStandardMaterial color="#05070a" roughness={0.95} />
      </mesh>
      {/* Molette */}
      <mesh position={[0, 3.18, 2.6]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.6, 0.6, 0.64, 18]} />
        <meshStandardMaterial color="#3b4250" roughness={0.55} />
      </mesh>
      {/* Logo lumineux sur le dos de la souris */}
      <mesh position={[0, 3.62, -2.0]} rotation={[-1.1, 0, 0]}>
        <circleGeometry args={[0.75, 20]} />
        <meshBasicMaterial color="#4dd0e1" toneMapped={false} transparent opacity={0.7} />
      </mesh>
      {/* Sur le présentoir : le début du câble, sans lequel une souris vue
          de dessus ressemble à un galet. */}
      {showcase && <MouseTail />}
    </group>
  )
}

/** Amorce de câble à l'avant de la souris (présentoir seulement). */
function MouseTail() {
  const geo = useMemo(() => {
    const curve = new THREE.CatmullRomCurve3(
      [
        new THREE.Vector3(0, 1.6, 5.4),
        new THREE.Vector3(0.4, 1.2, 8.0),
        new THREE.Vector3(1.8, 0.7, 10.2),
        new THREE.Vector3(4.2, 0.5, 11.4),
      ],
      false,
      'catmullrom',
      0.5,
    )
    return new THREE.TubeGeometry(curve, 24, 0.22, 7, false)
  }, [])
  return (
    <mesh geometry={geo} castShadow>
      <meshStandardMaterial color="#14171c" roughness={0.8} />
    </mesh>
  )
}

/* ================================================================ */
/*  La manette de jeu                                                */
/* ================================================================ */

function Gamepad() {
  const face: { p: Vec3; c: string }[] = [
    { p: [0, 0, -1.1], c: '#ffd166' },
    { p: [1.1, 0, 0], c: '#ff6b6b' },
    { p: [-1.1, 0, 0], c: '#7dd3fc' },
    { p: [0, 0, 1.1], c: '#66d17a' },
  ]

  return (
    <group name="gamepad" position={[0, 3.2, 0]}>
      {/* Corps central */}
      <SoftBox args={[12, 3.4, 7.4]} radius={1.1}>
        <meshStandardMaterial color="#22262e" roughness={0.5} metalness={0.2} />
      </SoftBox>
      {/* Poignées, écartées vers le bas */}
      {[-1, 1].map((s) => (
        <group key={s} position={[s * 6.2, -2.4, 1.4]} rotation={[0.5, s * 0.35, s * 0.28]}>
          <SoftBox args={[4.2, 8.2, 4.2]} radius={1.6}>
            <meshStandardMaterial color="#1c2027" roughness={0.55} metalness={0.15} />
          </SoftBox>
        </group>
      ))}
      {/* Gâchettes */}
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * 4.2, 1.3, -3.2]} rotation={[0.5, 0, 0]} castShadow>
          <boxGeometry args={[3, 1, 1.6]} />
          <meshStandardMaterial color="#2b3038" roughness={0.5} />
        </mesh>
      ))}
      {/* Joysticks */}
      {[-3.4, 3.4].map((x) => (
        <group key={x} position={[x, 1.7, 1.6]}>
          <mesh castShadow>
            <cylinderGeometry args={[1.25, 1.35, 0.9, 20]} />
            <meshStandardMaterial color="#15181e" roughness={0.7} />
          </mesh>
          <mesh position={[0, 0.75, 0]} scale={[1, 0.55, 1]} castShadow>
            <sphereGeometry args={[1.05, 20, 14]} />
            <meshStandardMaterial color="#0e1116" roughness={0.85} />
          </mesh>
        </group>
      ))}
      {/* Croix directionnelle */}
      <group position={[-3.4, 1.75, -1.6]}>
        <mesh castShadow>
          <boxGeometry args={[2.6, 0.5, 0.9]} />
          <meshStandardMaterial color="#12151a" roughness={0.7} />
        </mesh>
        <mesh castShadow>
          <boxGeometry args={[0.9, 0.5, 2.6]} />
          <meshStandardMaterial color="#12151a" roughness={0.7} />
        </mesh>
      </group>
      {/* Les quatre boutons d'action */}
      <group position={[3.4, 1.8, -1.6]}>
        {face.map((b) => (
          <mesh key={b.c} position={b.p} castShadow>
            <cylinderGeometry args={[0.52, 0.52, 0.42, 16]} />
            <meshStandardMaterial color={b.c} roughness={0.4} metalness={0.2} />
          </mesh>
        ))}
      </group>
      {/* Bouton central lumineux */}
      <mesh position={[0, 1.75, 0.3]}>
        <cylinderGeometry args={[0.7, 0.7, 0.3, 18]} />
        <meshBasicMaterial color="#dfe8f5" toneMapped={false} />
      </mesh>
    </group>
  )
}

/* ================================================================ */
/*  L'enceinte                                                       */
/* ================================================================ */

function Speaker() {
  return (
    <group name="speaker">
      {/* Caisson */}
      <SoftBox args={[10, 17, 9]} radius={0.25} position={[0, 8.5, 0]}>
        <meshStandardMaterial color="#1b1f26" roughness={0.62} metalness={0.15} />
      </SoftBox>
      {/* Façade tissu */}
      <mesh position={[0, 8.5, 4.55]}>
        <planeGeometry args={[9.2, 16.2]} />
        <meshStandardMaterial color="#2a2f38" roughness={0.95} />
      </mesh>
      {/* Haut-parleur de graves */}
      <group position={[0, 5.4, 4.6]}>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[3.3, 3.3, 0.3, 32]} />
          <meshStandardMaterial color="#0f1216" roughness={0.8} />
        </mesh>
        <mesh position={[0, 0, 0.2]} rotation={[Math.PI / 2, 0, 0]}>
          <coneGeometry args={[2.7, 1.1, 32]} />
          <meshStandardMaterial color="#181c22" roughness={0.9} />
        </mesh>
        <mesh position={[0, 0, 0.75]}>
          <sphereGeometry args={[0.95, 18, 12]} />
          <meshStandardMaterial color="#2c323b" roughness={0.5} metalness={0.4} />
        </mesh>
      </group>
      {/* Tweeter (les aigus) */}
      <group position={[0, 13.4, 4.6]}>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[1.5, 1.5, 0.3, 24]} />
          <meshStandardMaterial color="#0f1216" roughness={0.8} />
        </mesh>
        <mesh position={[0, 0, 0.3]}>
          <sphereGeometry args={[0.85, 18, 12]} />
          <meshStandardMaterial color="#c9ced6" metalness={0.9} roughness={0.35} />
        </mesh>
      </group>
      {/* Molette de volume */}
      <mesh position={[3.6, 2.4, 4.6]} rotation={[Math.PI / 2, 0, 0]} castShadow>
        <cylinderGeometry args={[1.1, 1.1, 0.7, 20]} />
        <meshStandardMaterial color="#3a4049" roughness={0.4} metalness={0.6} />
      </mesh>
      {/* Évent bass-reflex, au dos */}
      <mesh position={[0, 3, -4.55]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[1.3, 1.3, 0.2, 20]} />
        <meshStandardMaterial color="#05070a" roughness={0.95} />
      </mesh>
    </group>
  )
}

/* ================================================================ */
/*  Le microphone                                                    */
/* ================================================================ */

function Microphone() {
  return (
    <group name="micro">
      {/* Socle lesté */}
      <mesh position={[0, 0.7, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[5.2, 6, 1.4, 36]} />
        <meshStandardMaterial color="#1a1e25" roughness={0.45} metalness={0.6} />
      </mesh>
      {/* Tige */}
      <mesh position={[0, 6, 0]} castShadow>
        <cylinderGeometry args={[0.55, 0.7, 9.5, 18]} />
        <meshStandardMaterial color="#8f959e" metalness={0.95} roughness={0.32} />
      </mesh>
      {/* Fourche de maintien */}
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * 2.2, 12.6, 0]} castShadow>
          <boxGeometry args={[0.35, 5.6, 0.9]} />
          <meshStandardMaterial color="#6f757f" metalness={0.9} roughness={0.35} />
        </mesh>
      ))}
      {/* Corps du micro */}
      <group position={[0, 13.6, 0]}>
        <mesh castShadow>
          <cylinderGeometry args={[1.9, 1.9, 5.4, 26]} />
          <meshStandardMaterial color="#22262e" roughness={0.4} metalness={0.5} />
        </mesh>
        {/* Grille : c'est ce qui fait reconnaître un micro au premier coup d'œil */}
        <mesh position={[0, 3.1, 0]} castShadow>
          <sphereGeometry args={[2.1, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
          <meshStandardMaterial color="#9aa1ab" metalness={1} roughness={0.42} wireframe />
        </mesh>
        <mesh position={[0, 3.1, 0]}>
          <sphereGeometry args={[2.0, 20, 14, 0, Math.PI * 2, 0, Math.PI / 2]} />
          <meshStandardMaterial color="#0d1014" roughness={0.9} />
        </mesh>
        {/* Voyant rouge : le micro écoute */}
        <mesh position={[0, -1.6, 1.9]}>
          <boxGeometry args={[0.6, 0.24, 0.08]} />
          <meshBasicMaterial color="#ff5a5a" toneMapped={false} />
        </mesh>
      </group>
    </group>
  )
}

/* ================================================================ */
/*  La box internet                                                  */
/* ================================================================ */

function InternetBox() {
  return (
    <group name="box">
      {/* Corps debout, aux arêtes très arrondies */}
      <SoftBox args={[16, 21, 7]} radius={1.4} position={[0, 10.5, 0]}>
        <meshStandardMaterial color="#f2f3f6" roughness={0.5} metalness={0.08} />
      </SoftBox>
      {/* Bandeau supérieur foncé */}
      <SoftBox args={[16.1, 4.4, 7.1]} radius={1.4} position={[0, 18.6, 0]}>
        <meshStandardMaterial color="#1c2027" roughness={0.45} metalness={0.2} />
      </SoftBox>
      {/* Voyants de façade */}
      {[0, 1, 2, 3].map((i) => (
        <mesh key={i} position={[-4.2 + i * 2.8, 4.4, 3.55]}>
          <circleGeometry args={[0.42, 18]} />
          <meshBasicMaterial color={['#66ff9a', '#66ff9a', '#4da3ff', '#ffd166'][i]} toneMapped={false} />
        </mesh>
      ))}
      {/* Écran d'état */}
      <mesh position={[0, 13.5, 3.55]}>
        <planeGeometry args={[9, 5]} />
        <meshBasicMaterial color="#0f2438" toneMapped={false} />
      </mesh>
      <mesh position={[0, 13.5, 3.6]}>
        <planeGeometry args={[6, 0.5]} />
        <meshBasicMaterial color="#4dd0e1" toneMapped={false} />
      </mesh>
      {/* Grille d'aération au dos */}
      <group position={[0, 12, -3.6]}>
        <Grille width={11} height={9} step={1.1} hole={0.55} depth={0.1} color="#c9ccd2" />
      </group>
      {/* Les quatre prises RJ45 jaunes, au dos : c'est là que part le câble */}
      {[0, 1, 2, 3].map((i) => (
        <group key={i} position={[-4.5 + i * 3, 3.4, -3.55]}>
          <mesh>
            <boxGeometry args={[1.9, 1.5, 0.5]} />
            <meshStandardMaterial color="#2a2f38" roughness={0.6} />
          </mesh>
          <mesh position={[0, 0, -0.28]}>
            <boxGeometry args={[1.5, 1.1, 0.1]} />
            <meshStandardMaterial color={i === 0 ? '#e0b73a' : '#0a0c10'} roughness={0.7} />
          </mesh>
        </group>
      ))}
    </group>
  )
}

/* ================================================================ */
/*  La clé USB                                                       */
/* ================================================================ */

function UsbKey() {
  return (
    <group name="usbkey">
      {/* Fiche USB-A intégrée : c'est ELLE qui fait reconnaître une clé */}
      <group position={[0, 0.55, -0.6]}>
        <mesh castShadow>
          <boxGeometry args={[1.2, 0.45, 1.5]} />
          <meshStandardMaterial color="#b9c0c9" metalness={1} roughness={0.32} />
        </mesh>
        <mesh position={[0, -0.09, -0.1]}>
          <boxGeometry args={[0.94, 0.16, 1.3]} />
          <meshStandardMaterial color="#2f6fd0" roughness={0.55} />
        </mesh>
      </group>
      {/* Corps */}
      <SoftBox args={[2.2, 1.1, 5.4]} radius={0.28} position={[0, 0.55, 2.9]}>
        <meshStandardMaterial color="#1d222a" roughness={0.42} metalness={0.3} />
      </SoftBox>
      {/* Anneau porte-clés */}
      <mesh position={[0, 0.55, 5.9]} rotation={[0, Math.PI / 2, 0]}>
        <torusGeometry args={[0.5, 0.12, 8, 18]} />
        <meshStandardMaterial color="#9aa1ab" metalness={1} roughness={0.35} />
      </mesh>
      {/* Étiquette */}
      <mesh position={[0, 1.12, 3.2]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[1.5, 2.6]} />
        <meshStandardMaterial color="#4dd0e1" roughness={0.6} />
      </mesh>
      {/* Voyant d'activité */}
      <mesh position={[0, 0.55, 5.35]}>
        <boxGeometry args={[0.4, 0.2, 0.06]} />
        <meshBasicMaterial color="#66ff9a" toneMapped={false} />
      </mesh>
    </group>
  )
}

/* ================================================================ */
/*  Le câble d'alimentation (prise murale)                           */
/* ================================================================ */

function WallOutlet({ showcase = false }: { showcase?: boolean }) {
  return (
    <group name="power">
      {/* Morceau de mur */}
      <mesh position={[0, 11, -1.2]} receiveShadow>
        <boxGeometry args={[20, 22, 1.4]} />
        <meshStandardMaterial color="#3b4049" roughness={0.95} />
      </mesh>
      {/* Plaque de la prise (norme française : 2 alvéoles + broche de terre) */}
      <SoftBox args={[8.4, 8.4, 1.1]} radius={0.5} position={[0, 12, -0.1]}>
        <meshStandardMaterial color="#eceef2" roughness={0.45} />
      </SoftBox>
      <mesh position={[0, 12, 0.5]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[3.1, 3.1, 0.35, 32]} />
        <meshStandardMaterial color="#e2e5ea" roughness={0.5} />
      </mesh>
      {/* Broche de terre */}
      <mesh position={[0, 14.4, 0.9]} rotation={[Math.PI / 2, 0, 0]} castShadow>
        <cylinderGeometry args={[0.24, 0.24, 1.2, 12]} />
        <meshStandardMaterial color="#b9bfc8" metalness={1} roughness={0.35} />
      </mesh>
      {/* Sur le présentoir : le câble et sa fiche C13, sinon on ne verrait
          qu'une prise murale — or l'objet à reconnaître est le CÂBLE. */}
      {showcase && (
        <>
          <PowerTail />
          <group position={[7.5, 2.6, 5.4]} rotation={[0, -1.1, 0]}>
            <C13Head />
          </group>
        </>
      )}

      {/* Fiche mâle enfoncée dans la prise murale */}
      <group position={[0, 11.4, 1.6]}>
        <SoftBox args={[4.6, 4.6, 2.6]} radius={0.6}>
          <meshStandardMaterial color="#14171c" roughness={0.55} />
        </SoftBox>
        {/* Les deux broches, cachées dans le mur */}
        {[-0.95, 0.95].map((x) => (
          <mesh key={x} position={[x, 0, -1.8]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.24, 0.24, 1.6, 12]} />
            <meshStandardMaterial color="#c2c8d0" metalness={1} roughness={0.3} />
          </mesh>
        ))}
      </group>
    </group>
  )
}

/** Le bout de câble qui descend de la prise murale, sur le présentoir. */
function PowerTail() {
  const geo = useMemo(() => {
    const curve = new THREE.CatmullRomCurve3(
      [
        new THREE.Vector3(0, 10.4, 2.9),
        new THREE.Vector3(1.5, 6.5, 4.4),
        new THREE.Vector3(4.5, 3.2, 5.2),
        new THREE.Vector3(7.5, 2.6, 5.4),
      ],
      false,
      'catmullrom',
      0.5,
    )
    return new THREE.TubeGeometry(curve, 26, 0.42, 8, false)
  }, [])
  return (
    <mesh geometry={geo} castShadow>
      <meshStandardMaterial color="#14171c" roughness={0.8} />
    </mesh>
  )
}

/** Tête de fiche C13, telle qu'on la voit au bout du câble d'alimentation. */
function C13Head() {
  return (
    <group>
      <mesh castShadow>
        <boxGeometry args={[2.5, 1.9, 2.0]} />
        <meshStandardMaterial color="#101317" roughness={0.55} />
      </mesh>
      <mesh position={[0, 0.62, 0]} castShadow>
        <boxGeometry args={[2.0, 0.7, 2.0]} />
        <meshStandardMaterial color="#101317" roughness={0.55} />
      </mesh>
      {[-0.7, 0, 0.7].map((x, i) => (
        <mesh key={x} position={[x, i === 1 ? 0.45 : -0.25, -1.0]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.19, 0.19, 0.12, 12]} />
          <meshStandardMaterial color="#05060a" roughness={0.95} />
        </mesh>
      ))}
    </group>
  )
}

/* ================================================================ */
/*  Registre                                                         */
/* ================================================================ */

export interface PeripheralModelSpec {
  /** Boîte englobante : dimensions et centre (pour le présentoir) */
  size: Vec3
  offset: Vec3
  /** Point de sortie du câble, en coordonnées locales */
  cableExit: Vec3
  /** Fiche qui termine le câble */
  plug: PlugKind
  /** Longueur de câble à dessiner (0 = la fiche fait corps avec l'objet) */
  cable: number
  /** Orientation de présentation sur le présentoir */
  display?: Vec3
}

export const PERIPHERAL_MODELS: Record<PeripheralModelId, PeripheralModelSpec> = {
  monitor: {
    size: [52, 49, 20],
    offset: [0, 24.5, 0],
    cableExit: [0, 18, -1.4],
    plug: 'hdmi',
    cable: 26,
    display: [0, -0.42, 0],
  },
  keyboard: {
    size: [30, 4, 12],
    offset: [0, 1.6, 0],
    cableExit: [0, 1.2, -5.6],
    plug: 'usb-a',
    cable: 20,
    display: [-0.5, 0, 0],
  },
  mouse: {
    size: [6.8, 4.0, 12.4],
    offset: [0, 1.8, 0.4],
    cableExit: [0, 1.6, 5.4],
    plug: 'usb-a',
    cable: 18,
    // légèrement basculée vers l'avant : on voit le dessus, les boutons
    // et la molette — ce qui fait reconnaître une souris
    display: [-0.4, 0, 0],
  },
  gamepad: {
    size: [17, 10, 12],
    offset: [0, 3.4, 0.6],
    cableExit: [0, 5, -3.4],
    plug: 'usb-a',
    cable: 18,
    display: [-0.5, 0, 0],
  },
  speaker: {
    size: [10, 17.4, 9.4],
    offset: [0, 8.6, 0],
    cableExit: [-3, 2.5, -4.4],
    plug: 'jack',
    cable: 20,
    display: [0, 0.5, 0],
  },
  micro: {
    size: [11, 19.5, 11],
    offset: [0, 9.5, 0],
    cableExit: [0, 1.4, -3],
    plug: 'jack',
    cable: 20,
    display: [0, 0.3, 0],
  },
  box: {
    size: [16, 21, 8],
    offset: [0, 10.5, 0],
    cableExit: [-4.5, 3.4, -3.9],
    plug: 'rj45',
    cable: 22,
    display: [0, 0.6, 0],
  },
  usbkey: {
    // la fiche fait partie de l'objet : pas de câble
    size: [2.6, 1.4, 8.6],
    offset: [0, 0.6, 2.6],
    cableExit: [0, 0.55, 0],
    plug: 'usb-a',
    cable: 0,
    display: [-0.4, 0.6, 0],
  },
  power: {
    size: [20, 23, 5],
    offset: [0, 11, 0],
    cableExit: [0, 11.4, 2.8],
    plug: 'c13',
    cable: 26,
    display: [0, 0, 0],
  },
}

export function PeripheralModel({
  id,
  on = true,
  showcase = false,
}: {
  id: PeripheralModelId
  on?: boolean
  /** Présenté seul : certains objets montrent alors leur câble */
  showcase?: boolean
}) {
  switch (id) {
    case 'monitor':
      return <Monitor on={on} />
    case 'keyboard':
      return <Keyboard />
    case 'mouse':
      return <Mouse showcase={showcase} />
    case 'gamepad':
      return <Gamepad />
    case 'speaker':
      return <Speaker />
    case 'micro':
      return <Microphone />
    case 'box':
      return <InternetBox />
    case 'usbkey':
      return <UsbKey />
    case 'power':
      return <WallOutlet showcase={showcase} />
  }
}

/* ---------------------------------------------------------------- */
/*  Câble souple entre le périphérique et sa fiche                    */
/* ---------------------------------------------------------------- */

export function FlexCable({
  from,
  to,
  color = '#14171c',
  thickness = 0.28,
  sag = 6,
}: {
  from: Vec3
  to: Vec3
  color?: string
  thickness?: number
  sag?: number
}) {
  const geo = useMemo(() => {
    const a = new THREE.Vector3(...from)
    const b = new THREE.Vector3(...to)
    const d = a.distanceTo(b)
    const drop = Math.min(sag, d * 0.3)
    const m1 = a.clone().lerp(b, 0.33)
    const m2 = a.clone().lerp(b, 0.68)
    m1.y -= drop
    m2.y -= drop * 0.75
    const curve = new THREE.CatmullRomCurve3([a, m1, m2, b], false, 'catmullrom', 0.5)
    return new THREE.TubeGeometry(curve, 30, thickness, 7, false)
  }, [from, to, thickness, sag])

  return (
    <mesh geometry={geo} castShadow>
      <meshStandardMaterial color={color} roughness={0.78} metalness={0.1} />
    </mesh>
  )
}

/** Petit socle sombre, pour poser un périphérique à hauteur des prises. */
export function Pedestal({ radius = 9, height = 1.2 }: { radius?: number; height?: number }) {
  return (
    <mesh position={[0, -height / 2, 0]} material={M.plasticBlack()} receiveShadow>
      <cylinderGeometry args={[radius, radius * 1.08, height, 36]} />
    </mesh>
  )
}
