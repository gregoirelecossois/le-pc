/**
 * Carte graphique, bloc d'alimentation, disque dur, ventilateurs de boîtier.
 * Toutes ces pièces ont pour origine locale le centre de leur boîte englobante.
 */

import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { M } from '../materials'
import { labelTexture } from '../textures'
import { FanUnit, Screws } from './primitives'
import type { Vec3 } from '../layout'
import { DYNAMIC } from '../staticBatch'
import { at, LabelSheet, labelSheet, mergeBatch, roundedRect, type Label } from './merge'
import { PSU_PIN_PITCH, PSU_PLACE, PSU_SOCKET_H, PSU_SOCKETS, PSU_SX, PSU_SZ } from '../psu'
import { GPU_BRACKET, GPU_PLACE, GPU_PORT_YS } from '../gpu'

/* ================================================================ */
/*  Carte graphique                                                  */
/* ================================================================ */

/**
 * Carte graphique double ventilateur, sans éclairage : radiateur à
 * ailettes et caloducs nickelés sous une coque ajourée, deux rotors de
 * neuf pales, plaque arrière ajourée, prise d'alimentation 8 broches sur
 * la tranche, équerre avec une sortie HDMI et trois DisplayPort.
 *
 * Tracée en unités de dessin, puis mise en place dans le boîtier par
 * `GPU_PLACE` (three/gpu.ts), qui garde aussi la position des sorties
 * vidéo et de la prise 8 broches pour les ateliers.
 *
 * Adaptations au boîtier : les contacts PCIe ont la longueur d'un vrai
 * slot x16 (8,3 cm, encoche et ergot compris) et commencent à 1,7 cm de
 * l'équerre ; les sorties vidéo sont décalées vers la carte mère pour
 * rester dans l'ouverture du panneau arrière.
 */

type GpuMat = 'shell' | 'trim' | 'black' | 'metal' | 'fin' | 'dark' | 'pcb' | 'gold' | 'socket'
type RotorMat = 'blade' | 'trim' | 'black' | 'metal'

/** Centre des deux ventilateurs, en unités de dessin. */
const GPU_FANS: Vec3[] = [
  [-2.08, 0, 0.57],
  [2.08, 0, 0.57],
]

function buildGpu() {
  const { put, finish } = mergeBatch<GpuMat>(['shell', 'trim', 'black', 'metal', 'fin', 'dark', 'pcb', 'gold', 'socket'])
  const labels: Label[] = []
  const ext = (s: THREE.Shape, d: number, b = 0.03, curve = 6) =>
    new THREE.ExtrudeGeometry(s, { depth: d, bevelEnabled: b > 0, bevelSize: b, bevelThickness: b, bevelSegments: 2, curveSegments: curve, steps: 1 })
  const polygon = (pts: [number, number][]) => {
    const s = new THREE.Shape()
    pts.forEach(([x, y], i) => (i ? s.lineTo(x, y) : s.moveTo(x, y)))
    s.closePath()
    return s
  }
  const circleHole = (shape: THREE.Shape, x: number, y: number, r: number) => {
    const p = new THREE.Path()
    p.absarc(x, y, r, 0, Math.PI * 2, true)
    shape.holes.push(p)
  }
  const cube = (w: number, h: number, d: number, m: GpuMat, where: THREE.Matrix4) => put(m, new THREE.BoxGeometry(w, h, d), where)
  const cylZ = (r: number, h: number, m: GpuMat, where: THREE.Matrix4, seg = 16) =>
    put(m, new THREE.CylinderGeometry(r, r, h, seg), where.clone().multiply(at([0, 0, 0], [Math.PI / 2, 0, 0])))
  /** Vis vue de face (axe Z), avec son empreinte cruciforme. */
  const screw = (parent: THREE.Matrix4, p: Vec3) => {
    const w = parent.clone().multiply(at(p))
    cylZ(0.042, 0.016, 'metal', w, 10)
    cube(0.052, 0.009, 0.008, 'dark', w.clone().multiply(at([0, 0, 0.012])))
    cube(0.009, 0.052, 0.008, 'dark', w.clone().multiply(at([0, 0, 0.012])))
  }
  const text = (t: string, w: number, h: number, where: THREE.Matrix4, color = '#d6dce3') =>
    labels.push({ text: t, color, size: [w, h], where })
  const I = at([0, 0, 0])

  /* ---- Circuit et radiateur : les ailettes restent visibles entre les pales ---- */
  put('pcb', ext(roundedRect(8.35, 3.36, 0.12), 0.065, 0.006), at([0, 0, -0.39]))
  cube(7.95, 2.65, 0.11, 'metal', at([0, 0, -0.22]))
  for (let i = 0; i < 65; i++) cube(0.038, 2.92, 0.66, 'fin', at([-3.94 + i * 0.123, 0, 0.13]))
  for (const y of [-1.39, 1.39]) {
    for (const z of [-0.06, 0.2]) {
      const pts: Vec3[] = [[-3.5, y, z], [-1.8, y, z], [1.8, y, z], [3.6, y, z], [3.94, y * 0.88, z], [4.04, y * 0.6, z - 0.1]]
      put('metal', new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map((p) => new THREE.Vector3(...p))), 24, 0.074, 6, false), I)
    }
  }
  for (const y of [-1.55, 1.55]) cube(8.16, 0.15, 0.62, 'black', at([0, y, 0.05]))
  for (const x of [-4.14, 4.14]) cube(0.17, 3.12, 0.85, 'shell', at([x, 0, 0.12]))

  /* ---- Coque frontale ajourée : deux vraies ouvertures circulaires ---- */
  const outline: [number, number][] = [[-4.18, -1.42], [-3.91, -1.7], [3.84, -1.7], [4.22, -1.32], [4.22, 1.31], [3.86, 1.7], [-3.88, 1.7], [-4.18, 1.4]]
  const front = polygon(outline)
  for (const [x] of GPU_FANS) circleHole(front, x, 0, 1.46)
  put('shell', ext(front, 0.145, 0.025, 24), at([0, 0, 0.52]))
  for (const y of [-1.57, 1.57]) {
    cube(6.88, 0.045, 0.03, 'trim', at([0, y, 0.7]))
    for (const side of [-1, 1]) cube(0.68, 0.13, 0.06, 'trim', at([side * 3.76, y * 0.84, 0.71], [0, 0, side * Math.sign(y) * 0.62]))
  }
  for (const x of [-3.98, -0.12, 3.98]) for (const y of [-1.34, 1.34]) screw(I, [x, y, 0.714])
  // la gorge et le cerclage de chaque ventilateur (fixes : seuls les rotors tournent)
  for (const [x, y, z] of GPU_FANS) {
    const throat = new THREE.Shape()
    throat.absarc(0, 0, 1.463, 0, Math.PI * 2, false)
    circleHole(throat, 0, 0, 1.39)
    put('black', ext(throat, 0.14, 0, 32), at([x, y, z - 0.13]))
    put('trim', new THREE.TorusGeometry(1.445, 0.028, 6, 48), at([x, y, z + 0.13]))
  }

  /* ---- Tranches : bandeau supérieur, ouïes, grille terminale ---- */
  cube(6.56, 0.15, 0.27, 'shell', at([-0.64, 1.66, 0.38]))
  text('GEFORCE', 2.15, 0.28, at([-0.75, 1.743, 0.38], [-Math.PI / 2, 0, 0]), '#c8cdd1')
  for (const x of [-3.6, -3.33, -3.06, 1.16, 1.43, 1.7]) cube(0.14, 0.17, 0.23, 'dark', at([x, 1.66, -0.07]))
  const end = at([4.255, 0, 0.03], [0, Math.PI / 2, 0])
  for (let i = 0; i < 9; i++) put('dark', ext(roundedRect(0.47, 0.13, 0.05), 0.008, 0.003), end.clone().multiply(at([0, -1.08 + i * 0.27, 0])))

  /* ---- Plaque arrière, avec ses fentes, ses vis et ses marquages ---- */
  const back = polygon(outline)
  for (let i = 0; i < 9; i++) {
    const p = new THREE.Path()
    const x = 2.24 + i * 0.16
    p.moveTo(x, -0.95)
    p.lineTo(x + 0.055, -0.95)
    p.lineTo(x + 0.47, 0.95)
    p.lineTo(x + 0.415, 0.95)
    p.closePath()
    back.holes.push(p)
  }
  put('shell', ext(back, 0.08, 0.008), at([0, 0, -0.57]))
  const rear = at([0, 0, -0.584], [0, Math.PI, 0])
  for (const x of [-3.87, 0, 3.87]) for (const y of [-1.36, 1.36]) screw(rear, [x, y, 0])
  for (const x of [-1.55, -0.45]) {
    for (const y of [-0.55, 0.55]) {
      cylZ(0.105, 0.017, 'black', rear.clone().multiply(at([x, y, 0])), 16)
      screw(rear, [x, y, 0.02])
    }
  }
  text('DUAL  /  GRAPHICS', 2.5, 0.31, rear.clone().multiply(at([1.67, 0.22, 0.012])))
  text('NO RGB', 1.06, 0.14, rear.clone().multiply(at([1.68, -0.22, 0.013])), '#9ba3aa')
  for (let i = 0; i < 4; i++) cube(2.5, 0.022, 0.008, 'trim', rear.clone().multiply(at([1.43, -0.73 - i * 0.14, 0.012], [0, 0, -0.12])))

  /* ---- Contacts PCIe x16, à la taille du slot de la carte mère :
          courte section côté équerre, encoche, longue section, ergot ---- */
  for (const [x0, x1, count] of [[-3.8, -3.45, 10], [-3.39, -1.17, 69]] as const) {
    const w = x1 - x0
    cube(w, 0.43, 0.068, 'pcb', at([(x0 + x1) / 2, -1.86, -0.35]))
    for (let i = 0; i < count; i++) {
      const x = x0 + 0.018 + (i * (w - 0.036)) / (count - 1)
      for (const z of [-0.392, -0.308]) cube(0.022, 0.32, 0.008, 'gold', at([x, -1.9, z]))
    }
  }
  // l'ergot de retenue, juste après la longue section
  const dx = -2.175
  const latch = polygon([[1.17 + dx, -1.62], [1.68 + dx, -1.62], [1.68 + dx, -1.98], [1.43 + dx, -1.98], [1.31 + dx, -1.88], [1.17 + dx, -1.88]])
  put('pcb', ext(latch, 0.068, 0.005), at([0, 0, -0.384]))

  /* ---- Prise d'alimentation 8 broches, sur la tranche supérieure ---- */
  const power = at([2.9, 1.66, -0.04], [-Math.PI / 2, 0, 0])
  const inPower = (p: Vec3) => power.clone().multiply(at(p))
  cube(1.09, 0.55, 0.42, 'socket', power)
  for (let row = 0; row < 2; row++) {
    for (let col = 0; col < 4; col++) {
      const x = (col - 1.5) * 0.25
      const y = (row - 0.5) * 0.25
      put('dark', ext(polygon([[-0.105, -0.105], [0.105, -0.105], [0.105, 0.062], [0.062, 0.105], [-0.105, 0.105]]), 0.005, 0), inPower([x, y, 0.214]))
      cube(0.045, 0.045, 0.012, 'metal', inPower([x, y, 0.221]))
    }
  }
  cube(0.42, 0.085, 0.19, 'black', inPower([0, -0.316, 0.06]))

  /* ---- Équerre double slot et sorties vidéo ---- */
  const io = at([GPU_BRACKET.x, 0, GPU_BRACKET.z], [0, -Math.PI / 2, 0])
  const inIo = (p: Vec3, r: Vec3 = [0, 0, 0]) => io.clone().multiply(at(p, r))
  const portShape = (hdmi: boolean, scale = 1) => {
    const pts: [number, number][] = hdmi
      ? [[-0.25, 0.32], [0.25, 0.32], [0.25, -0.18], [0.14, -0.32], [-0.14, -0.32], [-0.25, -0.18]]
      : [[-0.25, -0.32], [0.25, -0.32], [0.25, 0.2], [0.13, 0.32], [-0.25, 0.32]]
    return polygon(pts.map(([a, b]) => [a * scale, b * scale]))
  }
  const plate = roundedRect(1.48, 3.9, 0.065)
  GPU_PORT_YS.forEach((py, i) => {
    const hole = new THREE.Path()
    portShape(i === 0, 1.04)
      .getPoints()
      .forEach((p, j) => (j ? hole.lineTo(p.x - 0.32, p.y + py) : hole.moveTo(p.x - 0.32, p.y + py)))
    plate.holes.push(hole)
  })
  // grille d'aération en face des ailettes
  for (let row = 0; row < 11; row++) for (let col = 0; col < 2; col++) circleHole(plate, 0.23 + col * 0.23, -1.42 + row * 0.28 + (col % 2) * 0.12, 0.085)
  put('metal', ext(plate, 0.065, 0.004), io)
  GPU_PORT_YS.forEach((py, i) => {
    const hdmi = i === 0
    const p = (q: Vec3) => inIo([-0.32 + q[0], py + q[1], 0.06 + q[2]])
    const rim = portShape(hdmi)
    const inner = new THREE.Path()
    portShape(hdmi, 0.82)
      .getPoints()
      .forEach((v, j) => (j ? inner.lineTo(v.x, v.y) : inner.moveTo(v.x, v.y)))
    rim.holes.push(inner)
    put('metal', ext(rim, 0.07, 0.004), p([0, 0, 0]))
    put('dark', ext(portShape(hdmi, 0.84), 0.005, 0), p([0, 0, -0.034]))
    cube(0.07, 0.43, 0.02, 'socket', p([0, 0, 0.025]))
    for (let k = 0; k < 9; k++) cube(0.024, 0.021, 0.007, 'gold', p([-0.044, -0.18 + k * 0.045, 0.04]))
    text(hdmi ? 'HDMI' : 'DP', 0.23, 0.095, p([0.48, -0.15, 0.023]))
  })
  cube(1.42, 0.08, 0.38, 'metal', inIo([0, 1.94, -0.14]))
  for (const x of [-0.47, 0.47]) put('dark', new THREE.CylinderGeometry(0.078, 0.078, 0.012, 12), inIo([x, 1.985, -0.16]))
  cube(0.34, 0.34, 0.07, 'metal', inIo([0.43, -2.08, 0.01]))
  for (const y of [-1.73, 1.73]) screw(io, [-0.05, y, 0.092])

  /* ---- Les rotors, à part : chacun tourne autour de son moyeu ---- */
  const rotor = mergeBatch<RotorMat>(['blade', 'trim', 'black', 'metal'])
  const blade = new THREE.Shape()
  blade.moveTo(0.32, -0.12)
  blade.bezierCurveTo(0.67, -0.43, 1.14, -0.5, 1.34, -0.25)
  blade.quadraticCurveTo(1.39, -0.06, 1.33, 0.17)
  blade.bezierCurveTo(1.1, 0.1, 0.83, 0.02, 0.36, 0.2)
  blade.closePath()
  for (let i = 0; i < 9; i++) {
    rotor.put('blade', ext(blade, 0.036, 0.008, 8), at([0, 0, 0.032], [0.025, 0, (i * Math.PI * 2) / 9 + 0.1]))
    const a = (i * Math.PI * 2) / 9 + 0.01
    rotor.put('trim', new THREE.BoxGeometry(0.62, 0.012, 0.018), at([0.85 * Math.cos(a), 0.85 * Math.sin(a), 0.084], [0, 0, a - 0.16]))
  }
  rotor.put('black', new THREE.CylinderGeometry(0.39, 0.39, 0.135, 24), at([0, 0, 0.13], [Math.PI / 2, 0, 0]))
  rotor.put('trim', new THREE.CylinderGeometry(0.32, 0.32, 0.018, 24), at([0, 0, 0.207], [Math.PI / 2, 0, 0]))
  rotor.put('metal', new THREE.TorusGeometry(0.275, 0.008, 4, 32), at([0, 0, 0.22]))
  const rotorLabel = labelSheet([{ text: 'DUAL', size: [0.48, 0.12], where: at([0, 0, 0.221]) }])

  const sheet = labelSheet(labels)
  sheet.geometry.applyMatrix4(GPU_PLACE)
  return {
    geo: finish(GPU_PLACE),
    labels: sheet.geometry,
    labelTex: sheet.texture,
    // dans le repère du rotor : placé et tourné par son groupe
    rotor: rotor.finish(new THREE.Matrix4()),
    rotorLabel: rotorLabel.geometry,
    rotorLabelTex: rotorLabel.texture,
  }
}

/** Position et orientation de chaque rotor dans le repère de la carte installée. */
const GPU_FAN_FRAMES = GPU_FANS.map((c) => {
  const m = GPU_PLACE.clone().multiply(new THREE.Matrix4().makeTranslation(...c))
  const position = new THREE.Vector3()
  const quaternion = new THREE.Quaternion()
  const scale = new THREE.Vector3()
  m.decompose(position, quaternion, scale)
  return { position: position.toArray() as Vec3, quaternion, scale: scale.x }
})

export function Gpu({ fanSpeed = 0 }: { fanSpeed?: number }) {
  const { geo, labels, labelTex, rotor, rotorLabel, rotorLabelTex } = useMemo(buildGpu, [])
  const fanA = useRef<THREE.Group>(null)
  const fanB = useRef<THREE.Group>(null)
  useFrame((_, dt) => {
    if (!fanSpeed) return
    const d = dt * fanSpeed * Math.PI * 2
    if (fanA.current) fanA.current.rotation.z += d
    if (fanB.current) fanB.current.rotation.z += d
  })

  return (
    <group name="gpu">
      <mesh geometry={geo.shell} castShadow receiveShadow>
        <meshStandardMaterial color="#26282b" roughness={0.49} metalness={0.35} />
      </mesh>
      <mesh geometry={geo.trim}>
        <meshStandardMaterial color="#42464b" roughness={0.4} metalness={0.65} />
      </mesh>
      <mesh geometry={geo.black} castShadow>
        <meshStandardMaterial color="#111315" roughness={0.65} metalness={0.16} />
      </mesh>
      <mesh geometry={geo.metal} castShadow>
        <meshStandardMaterial color="#9ba1a7" roughness={0.34} metalness={0.85} />
      </mesh>
      <mesh geometry={geo.fin}>
        <meshStandardMaterial color="#757e85" roughness={0.4} metalness={0.8} />
      </mesh>
      <mesh geometry={geo.dark}>
        <meshStandardMaterial color="#050608" roughness={0.8} metalness={0.1} />
      </mesh>
      <mesh geometry={geo.pcb}>
        <meshStandardMaterial color="#1c2422" roughness={0.85} metalness={0.08} />
      </mesh>
      <mesh geometry={geo.gold}>
        <meshStandardMaterial color="#c9a15b" roughness={0.28} metalness={0.78} />
      </mesh>
      <mesh geometry={geo.socket}>
        <meshStandardMaterial color="#0b0d10" roughness={0.67} metalness={0.05} />
      </mesh>
      <LabelSheet geometry={labels} texture={labelTex} />

      {/* Les deux rotors : ils tournent autour de leur moyeu */}
      {GPU_FAN_FRAMES.map((f, i) => (
        <group key={i} position={f.position} quaternion={f.quaternion} scale={f.scale}>
          <group ref={i === 0 ? fanA : fanB} userData={DYNAMIC}>
            <mesh geometry={rotor.blade} castShadow>
              <meshStandardMaterial color="#202326" roughness={0.36} metalness={0.38} />
            </mesh>
            <mesh geometry={rotor.trim}>
              <meshStandardMaterial color="#42464b" roughness={0.4} metalness={0.65} />
            </mesh>
            <mesh geometry={rotor.black}>
              <meshStandardMaterial color="#111315" roughness={0.65} metalness={0.16} />
            </mesh>
            <mesh geometry={rotor.metal}>
              <meshStandardMaterial color="#9ba1a7" roughness={0.34} metalness={0.85} />
            </mesh>
            <LabelSheet geometry={rotorLabel} texture={rotorLabelTex} />
          </group>
        </group>
      ))}
    </group>
  )
}

/* ================================================================ */
/*  Bloc d'alimentation                                              */
/* ================================================================ */

/**
 * Bloc d'alimentation ATX modulaire, sans marque : caisson en tôle, grille
 * arrière alvéolée avec la prise secteur et l'interrupteur O / I, grand
 * ventilateur à neuf pales sous sa grille, et sur la face avant les prises
 * modulaires repérées (CARTE MÈRE, CPU, PCIe, SATA) où se branchent les
 * câbles.
 *
 * Tracé en unités de dessin, ventilateur en haut et prises modulaires vers
 * +Z ; puis RETOURNÉ comme dans une vraie machine : ventilateur vers le
 * sol, prise secteur vers l'arrière (+Z local). Les inscriptions sont
 * tracées à l'envers pour se lire à l'endroit une fois le bloc retourné.
 *
 * L'échelle, le retournement et la position des prises modulaires sont
 * dans `three/psu.ts` : le câblage s'en sert pour faire partir chaque
 * câble de SA prise.
 */

type PsuMat = 'case' | 'edge' | 'plastic' | 'dark' | 'grille' | 'steel' | 'contact' | 'badge' | 'accent'

function buildPsu() {
  const { put, finish } = mergeBatch<PsuMat>(['case', 'edge', 'plastic', 'dark', 'grille', 'steel', 'contact', 'badge', 'accent'])
  const extrusion = (s: THREE.Shape, depth: number, bevel = 0, curve = 6) =>
    new THREE.ExtrudeGeometry(s, {
      depth,
      bevelEnabled: bevel > 0,
      bevelThickness: bevel,
      bevelSize: bevel,
      bevelSegments: 2,
      steps: 1,
      curveSegments: curve,
    })
  const cube = (w: number, h: number, d: number, m: PsuMat, p: Vec3, r: Vec3 = [0, 0, 0]) =>
    put(m, new THREE.BoxGeometry(w, h, d), at(p, r))
  const ring = (r: number, t: number, m: PsuMat, p: Vec3, seg = 40) =>
    put(m, new THREE.TorusGeometry(r, t, 6, seg), at(p, [Math.PI / 2, 0, 0]))

  /* ---- Le caisson : tôles séparées, pour une vraie ouverture de ventilateur ---- */
  const panel = (w: number, h: number, p: Vec3, r: Vec3) => put('case', extrusion(roundedRect(w, h, 0.065), 0.07, 0.018), at(p, r))
  panel(5.66, 3.02, [-2.7, 1.55, 0], [0, Math.PI / 2, 0])
  panel(5.66, 3.02, [2.63, 1.55, 0], [0, Math.PI / 2, 0])
  panel(5.3, 5.68, [0, 0.09, 0], [-Math.PI / 2, 0, 0])
  panel(5.3, 3.02, [0, 1.55, 2.82], [0, 0, 0])
  const top = roundedRect(5.35, 5.72, 0.09)
  const fanHole = new THREE.Path()
  fanHole.absarc(0, 0, 2.2, 0, Math.PI * 2, true)
  top.holes.push(fanHole)
  put('case', extrusion(top, 0.075, 0.014, 28), at([0, 3.02, 0], [-Math.PI / 2, 0, 0]))

  /* ---- Le dos : grille alvéolée, vrais trous hexagonaux ---- */
  const rear = roundedRect(5.3, 3.02, 0.065)
  for (let c = 0; c < 13; c++) {
    for (let row = 0; row < 10; row++) {
      const x = -2.39 + c * 0.235
      const y = -1.22 + row * 0.262 + (c % 2) * 0.131
      if (y > 1.33) continue
      const hole = new THREE.Path()
      for (let k = 0; k < 6; k++) {
        const a = (k * Math.PI) / 3
        const px = x + 0.132 * Math.cos(a)
        const py = y + 0.132 * Math.sin(a)
        if (k === 0) hole.moveTo(px, py)
        else hole.lineTo(px, py)
      }
      hole.closePath()
      rear.holes.push(hole)
    }
  }
  put('case', extrusion(rear, 0.065), at([0, 1.55, -2.9]))
  cube(5.05, 2.55, 0.025, 'dark', [0, 1.49, -2.55])

  /* ---- Le ventilateur : cadre, moyeu, grille de protection ---- */
  ring(2.105, 0.095, 'plastic', [0, 2.855, 0], 48)
  put('plastic', new THREE.CylinderGeometry(0.55, 0.55, 0.19, 28), at([0, 2.84, 0]))
  put('badge', new THREE.CylinderGeometry(0.37, 0.37, 0.014, 24), at([0, 2.944, 0]))
  for (const r of [0.62, 0.88, 1.14, 1.4, 1.66, 1.93, 2.16]) ring(r, 0.023, 'grille', [0, 3.127, 0])
  for (const a of [0, Math.PI / 2, Math.PI, (3 * Math.PI) / 2]) {
    const start = new THREE.Vector3(0.54 * Math.cos(a), 3.1, 0.54 * Math.sin(a))
    const end = new THREE.Vector3(2.28 * Math.cos(a), 3.1, 2.28 * Math.sin(a))
    put('grille', new THREE.TubeGeometry(new THREE.LineCurve3(start, end), 1, 0.034, 6, false), at([0, 0, 0]))
  }

  /* ---- Vis : quatre sur le dessus, quatre au dos ---- */
  const screw = (x: number, y: number, z: number, onTop: boolean) => {
    put('steel', new THREE.CylinderGeometry(0.071, 0.071, 0.035, 12), at([x, y, z], onTop ? [0, 0, 0] : [Math.PI / 2, 0, 0]))
    if (onTop) {
      cube(0.078, 0.007, 0.014, 'dark', [x, y + 0.02, z])
      cube(0.014, 0.007, 0.078, 'dark', [x, y + 0.021, z])
    } else {
      cube(0.078, 0.014, 0.007, 'dark', [x, y, z - 0.022])
      cube(0.014, 0.078, 0.007, 'dark', [x, y, z - 0.022])
    }
  }
  for (const x of [-2.38, 2.38]) for (const z of [-2.54, 2.54]) screw(x, 3.12, z, true)
  for (const x of [-2.42, 2.42]) for (const y of [0.27, 2.83]) screw(x, y, -2.937, false)

  /* ---- Face avant : les prises modulaires, avec leurs détrompeurs ---- */
  const socket = ({ cols, x, y }: { cols: number; x: number; y: number }) => {
    const pitch = PSU_PIN_PITCH
    const w = cols * pitch + 0.115
    const h = PSU_SOCKET_H
    const shape = roundedRect(w, h, 0.035)
    const pins: [number, number][] = []
    for (let row = 0; row < 2; row++) {
      for (let col = 0; col < cols; col++) {
        const px = (col - (cols - 1) / 2) * pitch
        const py = (row - 0.5) * pitch
        const s = 0.156
        const c = (row + col) % 2 ? 0.04 : 0
        const p = new THREE.Path()
        p.moveTo(px - s / 2, py - s / 2)
        p.lineTo(px + s / 2, py - s / 2)
        p.lineTo(px + s / 2, py + s / 2 - c)
        p.lineTo(px + s / 2 - c, py + s / 2)
        p.lineTo(px - s / 2 + c, py + s / 2)
        p.lineTo(px - s / 2, py + s / 2 - c)
        p.closePath()
        shape.holes.push(p)
        pins.push([px, py])
      }
    }
    put('plastic', extrusion(shape, 0.135, 0, 3), at([x, y, 2.895]))
    cube(w - 0.045, h - 0.045, 0.012, 'dark', [x, y, 2.907])
    for (const [px, py] of pins) cube(0.06, 0.05, 0.023, 'contact', [x + px, y + py - 0.025, 2.944])
    cube(0.24, 0.06, 0.09, 'edge', [x, y + h / 2 + 0.016, 2.99])
  }
  // prises vides : les fiches des câbles branchés sont dessinées par le
  // câblage (voir `Cable3D`)
  Object.values(PSU_SOCKETS).forEach(socket)

  /* ---- Dos : prise secteur IEC C14 et interrupteur O / I ---- */
  cube(1.4, 0.94, 0.105, 'plastic', [1.7, 0.82, -2.965])
  const inlet = new THREE.Shape()
  inlet.moveTo(-0.49, -0.3)
  inlet.lineTo(0.49, -0.3)
  inlet.lineTo(0.49, 0.12)
  inlet.lineTo(0.3, 0.31)
  inlet.lineTo(-0.3, 0.31)
  inlet.lineTo(-0.49, 0.12)
  inlet.closePath()
  put('dark', new THREE.ShapeGeometry(inlet), at([1.7, 0.82, -3.025], [0, Math.PI, 0]))
  for (const [x, y] of [[1.47, 0.73], [1.93, 0.73], [1.7, 0.99]]) cube(0.108, 0.065, 0.13, 'steel', [x, y, -3.035])
  cube(0.64, 0.86, 0.09, 'plastic', [1.7, 2.01, -2.958])
  cube(0.49, 0.68, 0.105, 'edge', [1.7, 2.01, -3.018], [0.13, 0, 0])

  /* ---- Étiquette latérale, sur le flanc qu'on voit à travers la vitre ---- */
  cube(0.018, 1.52, 3.74, 'badge', [2.723, 1.58, 0])
  cube(0.015, 0.035, 2.95, 'accent', [2.741, 0.99, 0])

  /* ---- Les inscriptions : tournées d'un demi-tour dans leur plan, elles
          se lisent à l'endroit une fois le bloc retourné ---- */
  const flip = at([0, 0, 0], [0, 0, Math.PI])
  const label = (text: string, w: number, h: number, p: Vec3, r: Vec3 = [0, 0, 0], color = '#c0c8d2'): Label => ({
    text,
    color,
    size: [w, h],
    where: at(p, r).multiply(flip),
  })
  const sheet = labelSheet([
    label('CARTE MÈRE', 2.1, 0.18, [-0.05, 2.82, 2.944]),
    label('CPU', 0.67, 0.15, [-1.23, 1.83, 2.944]),
    label('PCIe', 0.67, 0.15, [1.23, 1.83, 2.944]),
    label('SATA / PÉRIPHÉRIQUES', 2.35, 0.15, [0, 0.94, 2.944]),
    label('I', 0.14, 0.16, [1.7, 2.2, -3.09], [0, Math.PI, 0]),
    label('O', 0.14, 0.16, [1.7, 1.84, -3.09], [0, Math.PI, 0]),
    label('AC INPUT', 1.03, 0.17, [1.7, 1.44, -2.971], [0, Math.PI, 0]),
    label('MODULAR', 2.52, 0.42, [2.74, 1.83, 0], [0, Math.PI / 2, 0]),
    label('POWER SUPPLY', 2.24, 0.21, [2.741, 1.28, 0], [0, Math.PI / 2, 0]),
  ])
  sheet.geometry.applyMatrix4(PSU_PLACE)

  /* ---- Les neuf pales, à part : elles tournent autour du moyeu ---- */
  const blade = new THREE.Shape()
  blade.moveTo(0.4, -0.14)
  blade.bezierCurveTo(0.93, -0.47, 1.45, -0.54, 1.92, -0.31)
  blade.bezierCurveTo(2.01, -0.2, 1.99, 0.12, 1.85, 0.3)
  blade.bezierCurveTo(1.32, 0.05, 0.8, 0.22, 0.42, 0.32)
  blade.closePath()
  const rotor = mergeBatch(['blades'] as const)
  for (let i = 0; i < 9; i++) {
    const g = extrusion(blade, 0.043, 0.014, 5)
    g.rotateX(-Math.PI / 2)
    rotor.put('blades', g, at([0, 0, 0], [0, (i * Math.PI * 2) / 9, 0]))
  }

  return {
    geo: finish(PSU_PLACE),
    labels: sheet.geometry,
    labelTex: sheet.texture,
    // dans le repère du rotor : il est placé et retourné par son groupe
    blades: rotor.finish(new THREE.Matrix4()).blades,
  }
}

/** Centre du rotor, en unités de dessin, avant retournement. */
const PSU_ROTOR = new THREE.Vector3(0, 2.765, 0).applyMatrix4(PSU_PLACE)

export function Psu({ fanSpeed = 0 }: { fanSpeed?: number }) {
  const { geo, labels, labelTex, blades } = useMemo(buildPsu, [])
  const spin = useRef<THREE.Group>(null)
  useFrame((_, dt) => {
    if (spin.current && fanSpeed) spin.current.rotation.y += dt * fanSpeed * Math.PI * 2
  })

  return (
    <group name="psu">
      <mesh geometry={geo.case} castShadow receiveShadow>
        <meshStandardMaterial color="#252b33" roughness={0.53} metalness={0.43} />
      </mesh>
      <mesh geometry={geo.edge}>
        <meshStandardMaterial color="#12171e" roughness={0.6} metalness={0.24} />
      </mesh>
      <mesh geometry={geo.plastic} castShadow>
        <meshStandardMaterial color="#1b2027" roughness={0.7} />
      </mesh>
      <mesh geometry={geo.dark}>
        <meshStandardMaterial color="#070b10" roughness={0.95} />
      </mesh>
      <mesh geometry={geo.grille}>
        <meshStandardMaterial color="#687481" roughness={0.32} metalness={0.7} />
      </mesh>
      <mesh geometry={geo.steel}>
        <meshStandardMaterial color="#9ca6b0" roughness={0.28} metalness={0.86} />
      </mesh>
      <mesh geometry={geo.contact}>
        <meshStandardMaterial color="#bda774" roughness={0.35} metalness={0.77} />
      </mesh>
      <mesh geometry={geo.badge}>
        <meshStandardMaterial color="#151b23" roughness={0.63} />
      </mesh>
      <mesh geometry={geo.accent}>
        <meshStandardMaterial color="#56a7b8" roughness={0.5} metalness={0.25} />
      </mesh>
      <LabelSheet geometry={labels} texture={labelTex} />

      {/* Le rotor : retourné et mis à l'échelle comme le reste, il tourne
          dans son propre repère pour que les pales restent dans le cadre. */}
      <group position={PSU_ROTOR.toArray()} rotation={[Math.PI, 0, 0]} scale={[PSU_SX, PSU_SX, PSU_SZ]}>
        <group ref={spin} userData={DYNAMIC}>
          {/* pales gris clair : vues de dessous, à contre-jour, elles doivent
              se détacher du fond sombre du bloc pour qu'on les voie tourner */}
          <mesh geometry={blades}>
            <meshStandardMaterial color="#8793a3" roughness={0.46} metalness={0.12} />
          </mesh>
        </group>
      </group>
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
