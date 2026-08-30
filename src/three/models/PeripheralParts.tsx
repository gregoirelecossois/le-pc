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

/**
 * Coque de la souris : un galet dont le nez s'affine et dont le ventre
 * est plat.
 *
 * Une sphère aplatie ne suffit pas — elle donne un caillou. On déforme
 * donc les sommets : compression en hauteur, étirement en longueur,
 * rétrécissement progressif vers l'avant, et dessous rabattu pour que
 * l'objet POSE sur la table au lieu d'y flotter.
 */
function MouseShell() {
  const geo = useMemo(() => {
    const g = new THREE.SphereGeometry(3.25, 48, 32)
    const p = g.attributes.position as THREE.BufferAttribute
    const half = 3.25 * 1.66
    for (let i = 0; i < p.count; i++) {
      let x = p.getX(i)
      let y = p.getY(i) * 0.76
      const z = p.getZ(i) * 1.66
      // 0 à l'arrière, 1 à l'avant : le nez perd trois dixièmes de largeur
      const t = Math.min(1, Math.max(0, (z + half) / (2 * half)))
      x *= 1 - 0.3 * t * t
      if (y < 0) y *= 0.3
      p.setXYZ(i, x, y, z)
    }
    g.computeVertexNormals()
    return g
  }, [])

  return (
    <mesh geometry={geo} position={[0, 0.75, 0]} castShadow receiveShadow>
      <meshStandardMaterial color="#191b1f" roughness={0.74} metalness={0.05} envMapIntensity={0.5} />
    </mesh>
  )
}

/** Hauteur du dessus de la coque à une profondeur donnée. */
function shellTop(z: number) {
  const half = 3.25 * 1.66
  const k = Math.max(0, 1 - (z / half) ** 2)
  return 0.75 + 3.25 * 0.76 * Math.sqrt(k)
}

function Mouse({ showcase = false }: { showcase?: boolean }) {
  // La ligne de séparation des deux boutons épouse le dos de la souris :
  // un trait droit passerait sous la surface au milieu et ressortirait
  // aux extrémités.
  const seam = useMemo(() => {
    const pts: THREE.Vector3[] = []
    for (let z = 4.9; z >= -2.6; z -= 0.5) pts.push(new THREE.Vector3(0, shellTop(z) - 0.03, z))
    return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 40, 0.055, 6, false)
  }, [])

  return (
    <group name="mouse">
      <MouseShell />
      <mesh geometry={seam} raycast={() => null}>
        <meshStandardMaterial color="#07090c" roughness={0.9} />
      </mesh>

      {/* Logement de la molette, creusé dans le dos */}
      <mesh position={[0, shellTop(3.15) - 0.32, 3.15]}>
        <boxGeometry args={[0.92, 0.7, 1.5]} />
        <meshStandardMaterial color="#07090c" roughness={0.95} />
      </mesh>
      {/* Molette : la seule pièce claire de l'objet, en métal strié */}
      <mesh position={[0, shellTop(3.15) - 0.2, 3.15]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.58, 0.58, 0.52, 16]} />
        <meshStandardMaterial color="#a8aeb7" metalness={0.9} roughness={0.35} />
      </mesh>

      {/* Semelle : deux patins, comme sous une vraie souris */}
      {[-3.1, 3.1].map((z) => (
        <mesh key={z} position={[0, 0.06, z]} scale={[1, 1, 0.55]}>
          <cylinderGeometry args={[1.9, 1.9, 0.12, 20]} />
          <meshStandardMaterial color="#0b0d10" roughness={0.9} />
        </mesh>
      ))}

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
        new THREE.Vector3(0, 1.3, 5.1),
        new THREE.Vector3(0.4, 1.1, 7.6),
        new THREE.Vector3(1.8, 0.7, 9.8),
        new THREE.Vector3(4.2, 0.5, 11.2),
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

/**
 * Manette filaire classique, façon Logitech F310 : corps gris-bleu,
 * poignées noires, croix directionnelle à gauche, quatre boutons de
 * couleur à droite, et les deux joysticks en bas.
 *
 * Les couleurs des quatre boutons sont normalisées depuis trente ans
 * (vert en bas, rouge à droite, bleu à gauche, jaune en haut) : c'est ce
 * qui fait reconnaître une manette d'un seul coup d'œil.
 */
function Gamepad() {
  const SHELL = '#4c5468'
  const GRIP = '#15171c'
  const face: { p: Vec3; c: string }[] = [
    { p: [0, 0, -1.15], c: '#e8b422' },
    { p: [1.15, 0, 0], c: '#c8342c' },
    { p: [-1.15, 0, 0], c: '#2f6fd0' },
    { p: [0, 0, 1.15], c: '#2f9e52' },
  ]

  return (
    <group name="gamepad" position={[0, 3.2, 0]}>
      {/* Corps central */}
      <SoftBox args={[12, 3.4, 7.4]} radius={1.1}>
        <meshStandardMaterial color={SHELL} roughness={0.52} metalness={0.14} />
      </SoftBox>
      {/* Bandeau noir du bas, où viennent se greffer les poignées */}
      <SoftBox args={[11.4, 1.5, 6.6]} radius={0.9} position={[0, -1.4, 0.5]}>
        <meshStandardMaterial color={GRIP} roughness={0.62} />
      </SoftBox>

      {/* Poignées, écartées vers le bas */}
      {[-1, 1].map((s) => (
        <group key={s} position={[s * 6.2, -2.4, 1.4]} rotation={[0.5, s * 0.35, s * 0.28]}>
          <SoftBox args={[4.2, 8.2, 4.2]} radius={1.6}>
            <meshStandardMaterial color={GRIP} roughness={0.66} />
          </SoftBox>
        </group>
      ))}

      {/* Gâchettes du dessus */}
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * 4.2, 1.3, -3.2]} rotation={[0.5, 0, 0]} castShadow>
          <boxGeometry args={[3, 1, 1.6]} />
          <meshStandardMaterial color="#2a2f38" roughness={0.5} />
        </mesh>
      ))}

      {/* Croix directionnelle, sur son plateau rond */}
      <group position={[-3.6, 1.75, -1.5]}>
        <mesh position={[0, -0.18, 0]}>
          <cylinderGeometry args={[1.85, 1.85, 0.34, 24]} />
          <meshStandardMaterial color="#3a4150" roughness={0.6} />
        </mesh>
        <mesh castShadow>
          <boxGeometry args={[2.7, 0.52, 0.95]} />
          <meshStandardMaterial color="#101318" roughness={0.7} />
        </mesh>
        <mesh castShadow>
          <boxGeometry args={[0.95, 0.52, 2.7]} />
          <meshStandardMaterial color="#101318" roughness={0.7} />
        </mesh>
      </group>

      {/* Les quatre boutons d'action */}
      <group position={[3.6, 1.75, -1.5]}>
        <mesh position={[0, -0.18, 0]}>
          <cylinderGeometry args={[1.95, 1.95, 0.34, 24]} />
          <meshStandardMaterial color="#3a4150" roughness={0.6} />
        </mesh>
        {face.map((b) => (
          <mesh key={b.c} position={b.p} castShadow>
            <cylinderGeometry args={[0.54, 0.54, 0.44, 18]} />
            <meshStandardMaterial color={b.c} roughness={0.35} metalness={0.15} />
          </mesh>
        ))}
      </group>

      {/* Joysticks, en bas et vers l'intérieur */}
      {[-2.6, 2.6].map((x) => (
        <group key={x} position={[x, 1.6, 2.1]}>
          <mesh>
            <cylinderGeometry args={[1.5, 1.6, 0.5, 22]} />
            <meshStandardMaterial color="#3a4150" roughness={0.6} />
          </mesh>
          <mesh position={[0, 0.35, 0]} castShadow>
            <cylinderGeometry args={[0.85, 1.0, 0.7, 20]} />
            <meshStandardMaterial color="#15181e" roughness={0.75} />
          </mesh>
          <mesh position={[0, 0.78, 0]} scale={[1, 0.42, 1]} castShadow>
            <sphereGeometry args={[1.02, 22, 16]} />
            <meshStandardMaterial color="#0e1116" roughness={0.88} />
          </mesh>
        </group>
      ))}

      {/* Petits boutons du milieu : mode, retour, départ */}
      {[-1.1, 0, 1.1].map((x, i) => (
        <mesh key={x} position={[x, 1.72, -1.4]} castShadow>
          <cylinderGeometry args={[0.32, 0.32, 0.28, 14]} />
          <meshStandardMaterial color={i === 1 ? '#8b929e' : '#22262e'} roughness={0.5} />
        </mesh>
      ))}
      {/* Voyant du milieu */}
      <mesh position={[0, 1.76, 0.5]}>
        <cylinderGeometry args={[0.24, 0.24, 0.26, 14]} />
        <meshBasicMaterial color="#7ef0a0" toneMapped={false} />
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

/**
 * Clé USB à connecteur rétractable, façon Verbatim PinStripe : un corps
 * noir laqué marqué d'une nervure dans la longueur, un curseur strié
 * qu'on pousse au pouce, et le connecteur USB-A sorti à l'avant.
 */
function UsbKey() {
  const BODY = '#111318'

  return (
    <group name="usbkey">
      {/* Connecteur USB-A : c'est LUI qui fait reconnaître une clé */}
      <group position={[0, 0.62, -0.85]}>
        <mesh castShadow>
          <boxGeometry args={[1.26, 0.52, 1.7]} />
          <meshStandardMaterial color="#b6bdc6" metalness={1} roughness={0.3} />
        </mesh>
        {/* Languette intérieure BLEUE : la marque de l'USB 3.0 */}
        <mesh position={[0, -0.11, 0.06]}>
          <boxGeometry args={[1.02, 0.2, 1.66]} />
          <meshStandardMaterial color="#2f6fd0" roughness={0.5} />
        </mesh>
        {/* Les deux lucarnes carrées du blindage */}
        {[-0.3, 0.3].map((x) => (
          <mesh key={x} position={[x, 0.27, -0.15]}>
            <boxGeometry args={[0.3, 0.06, 0.3]} />
            <meshStandardMaterial color="#0a0c10" roughness={0.9} />
          </mesh>
        ))}
      </group>

      {/* Corps */}
      <SoftBox args={[2.3, 1.24, 5.0]} radius={0.3} position={[0, 0.62, 2.5]}>
        <meshStandardMaterial color={BODY} roughness={0.32} metalness={0.25} />
      </SoftBox>
      {/* La nervure du dessus, qui donne son nom à la clé */}
      <SoftBox args={[1.44, 0.26, 4.3]} radius={0.11} position={[0, 1.18, 2.6]}>
        <meshStandardMaterial color="#1c2027" roughness={0.28} metalness={0.3} />
      </SoftBox>
      {/* Curseur du pouce, avec ses stries */}
      <SoftBox args={[1.5, 0.32, 1.5]} radius={0.12} position={[0, 1.2, 4.0]}>
        <meshStandardMaterial color="#23272f" roughness={0.4} />
      </SoftBox>
      {[-0.45, 0, 0.45].map((z) => (
        <mesh key={z} position={[0, 1.37, 4.0 + z]}>
          <boxGeometry args={[1.3, 0.06, 0.14]} />
          <meshStandardMaterial color="#0c0e12" roughness={0.85} />
        </mesh>
      ))}

      {/* Capuchon arrière, un rien plus large, et son œillet */}
      <SoftBox args={[2.44, 1.36, 1.7]} radius={0.34} position={[0, 0.62, 5.9]}>
        <meshStandardMaterial color="#0d0f13" roughness={0.36} metalness={0.2} />
      </SoftBox>
      <mesh position={[0, 1.16, 6.35]} rotation={[0, Math.PI / 2, 0]}>
        <torusGeometry args={[0.3, 0.09, 8, 16]} />
        <meshStandardMaterial color="#0a0c10" roughness={0.5} />
      </mesh>
    </group>
  )
}

/* ================================================================ */
/*  Le câble d'alimentation (prise murale)                           */
/* ================================================================ */

function WallOutlet({ showcase = false }: { showcase?: boolean }) {
  // Présenté seul, l'objet à reconnaître est le CÂBLE, pas le mur : on
  // montre alors le cordon complet, fiche secteur d'un côté, fiche C13 de
  // l'autre. Dans l'atelier de branchement, au contraire, la prise murale
  // explique d'où vient le 230 V.
  if (showcase) return <PowerCord />

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

      {/* Fiche mâle enfoncée dans la prise murale */}
      <group position={[0, 11.4, 1.6]}>
        <SoftBox args={[4.6, 4.6, 2.6]} radius={0.6}>
          <meshStandardMaterial color="#14171c" roughness={0.55} />
        </SoftBox>
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

/**
 * Le cordon secteur seul : fiche coudée en haut à gauche, boucle de câble,
 * fiche C13 en bas à droite. Il tient dans la même boîte englobante que la
 * prise murale, pour que le présentoir le cadre sans réglage particulier.
 */
function PowerCord() {
  const geo = useMemo(() => {
    // Une boucle lâche, comme un câble vendu enroulé.
    const curve = new THREE.CatmullRomCurve3(
      [
        new THREE.Vector3(-5.4, 18.4, 0),
        new THREE.Vector3(-7.4, 13.5, 1.2),
        new THREE.Vector3(-4.6, 8.6, 1.8),
        new THREE.Vector3(1.2, 8.0, 0.6),
        new THREE.Vector3(5.0, 11.6, -0.8),
        new THREE.Vector3(3.4, 15.6, -1.0),
        new THREE.Vector3(-1.4, 14.4, 0.2),
        new THREE.Vector3(-3.4, 9.6, 1.0),
        new THREE.Vector3(0.4, 5.4, 0.4),
        new THREE.Vector3(5.6, 4.4, -0.2),
      ],
      false,
      'catmullrom',
      0.5,
    )
    return new THREE.TubeGeometry(curve, 120, 0.45, 10, false)
  }, [])

  return (
    <group name="power">
      <mesh geometry={geo} castShadow>
        <meshStandardMaterial color="#15181d" roughness={0.72} />
      </mesh>

      {/* Fiche secteur, coudée : le câble en sort par le côté */}
      <group position={[-5.4, 20.4, 0]} rotation={[0, 0, 0.18]}>
        <SoftBox args={[5.0, 4.4, 3.4]} radius={1.1}>
          <meshStandardMaterial color="#15181d" roughness={0.55} />
        </SoftBox>
        {/* Les deux broches rondes */}
        {[-1.0, 1.0].map((x) => (
          <mesh key={x} position={[x, 2.6, 0]} castShadow>
            <cylinderGeometry args={[0.34, 0.34, 2.2, 14]} />
            <meshStandardMaterial color="#c2c8d0" metalness={1} roughness={0.3} />
          </mesh>
        ))}
        {/* Les deux languettes de terre, sur les flancs */}
        {[-1, 1].map((s) => (
          <mesh key={s} position={[s * 2.45, 0.4, 0]}>
            <boxGeometry args={[0.22, 1.8, 1.4]} />
            <meshStandardMaterial color="#9aa1ab" metalness={0.9} roughness={0.4} />
          </mesh>
        ))}
      </group>

      {/* Fiche C13, au bout du cordon */}
      <group position={[7.4, 4.0, -0.4]} rotation={[0, 0.5, -0.35]}>
        <C13Head />
      </group>
    </group>
  )
}

/**
 * Tête de fiche C13 : le petit bloc à trois trous, dont deux angles sont
 * coupés — c'est ce détrompeur qui interdit de la brancher à l'envers.
 */
function C13Head() {
  return (
    <group>
      <mesh castShadow>
        <boxGeometry args={[2.6, 1.9, 2.2]} />
        <meshStandardMaterial color="#101317" roughness={0.5} />
      </mesh>
      <mesh position={[0, 0.66, 0]} castShadow>
        <boxGeometry args={[2.0, 0.65, 2.2]} />
        <meshStandardMaterial color="#101317" roughness={0.5} />
      </mesh>
      {/* Les trois alvéoles */}
      {[-0.72, 0, 0.72].map((x, i) => (
        <mesh key={x} position={[x, i === 1 ? 0.5 : -0.3, -1.12]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.2, 0.2, 0.14, 12]} />
          <meshStandardMaterial color="#04050a" roughness={0.95} />
        </mesh>
      ))}
      {/* Manchon d'où sort le câble */}
      <mesh position={[0, -0.1, 1.5]} rotation={[Math.PI / 2, 0, 0]} castShadow>
        <cylinderGeometry args={[0.62, 0.78, 1.0, 16]} />
        <meshStandardMaterial color="#15181d" roughness={0.7} />
      </mesh>
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
