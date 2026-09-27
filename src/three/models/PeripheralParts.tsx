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

import { useEffect, useMemo } from 'react'
import * as THREE from 'three'
import { at, LabelSheet, labelSheet, mergeBatch, roundedRect, sitOnFloor, type Label } from './merge'
import type { Vec3 } from '../layout'
import { M } from '../materials'
import { SoftBox } from './primitives'
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

/**
 * Écran 16:9 sur pied, sans marque : socle plat, colonne inclinée, dalle
 * à bords fins. Allumé, il affiche un bureau : fond d'écran abstrait,
 * quatre icônes (Documents, Images, Internet, Corbeille) et le titre du
 * jeu. Au dos : aérations, renfort de fixation et connectique HDMI,
 * DisplayPort, USB et alimentation.
 *
 * Tracé en unités de dessin (8,1 de large), mis à l'échelle : 52 cm, un
 * écran de 24 pouces.
 */

/** Unités de dessin -> centimètres. */
const MONITOR_SCALE = 6.4

type MonitorMat = 'case' | 'edge' | 'rubber' | 'metal' | 'mesh' | 'dark' | 'led'

/** Le bureau affiché : dessiné une fois, sans image téléchargée. */
function desktopTexture() {
  const c = document.createElement('canvas')
  c.width = 1280
  c.height = 720
  const ctx = c.getContext('2d')!
  const bg = ctx.createLinearGradient(0, 0, 1280, 720)
  bg.addColorStop(0, '#0d1c40')
  bg.addColorStop(0.6, '#195375')
  bg.addColorStop(1, '#3998a5')
  ctx.fillStyle = bg
  ctx.fillRect(0, 0, 1280, 720)
  // fond d'écran abstrait : des vagues superposées
  const waves = ['#164674', '#1b6087', '#277d98', '#409fae', '#6cbdc5', '#a0dadb']
  waves.forEach((color, i) => {
    ctx.beginPath()
    ctx.moveTo(-100, 590 + i * 49)
    ctx.bezierCurveTo(260, 740 - i * 34, 450, 210 - i * 26, 840, 380 - i * 21)
    ctx.bezierCurveTo(1090, 480 - i * 35, 1210, 180 - i * 20, 1380, 100 - i * 30)
    ctx.lineTo(1380, 800)
    ctx.lineTo(-100, 800)
    ctx.closePath()
    ctx.fillStyle = color
    ctx.fill()
  })
  // les icônes du bureau
  const items: [string, string, number][] = [
    ['📁', 'Documents', 74],
    ['🖼️', 'Images', 219],
    ['🌐', 'Internet', 364],
    ['🗑️', 'Corbeille', 509],
  ]
  for (const [icon, name, y] of items) {
    ctx.save()
    ctx.textAlign = 'center'
    ctx.textBaseline = 'top'
    ctx.shadowColor = 'rgba(0,0,0,.48)'
    ctx.shadowBlur = 8
    ctx.shadowOffsetY = 3
    ctx.font = '66px "Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", sans-serif'
    ctx.fillStyle = '#ffffff'
    ctx.fillText(icon, 90, y)
    ctx.shadowBlur = 5
    ctx.shadowOffsetY = 2
    ctx.font = '500 23px Arial'
    ctx.fillText(name, 90, y + 78)
    ctx.restore()
  }
  ctx.textAlign = 'right'
  ctx.textBaseline = 'top'
  ctx.fillStyle = '#ffffff'
  ctx.font = '500 64px Arial'
  ctx.shadowColor = 'rgba(0,0,0,.35)'
  ctx.shadowBlur = 12
  ctx.shadowOffsetY = 3
  ctx.fillText('Le PC', 1212, 53)
  const map = new THREE.CanvasTexture(c)
  map.colorSpace = THREE.SRGBColorSpace
  map.anisotropy = 4
  return map
}

function buildMonitor() {
  const { put, finish } = mergeBatch<MonitorMat>(['case', 'edge', 'rubber', 'metal', 'mesh', 'dark', 'led'])
  const ext = (s: THREE.Shape, d: number, b: number) =>
    new THREE.ExtrudeGeometry(s, { depth: d, bevelEnabled: b > 0, bevelSize: b, bevelThickness: b, bevelSegments: 2, curveSegments: 5, steps: 1 })
  /** Plaque couchée, épaisseur vers le haut. */
  const slab = (w: number, l: number, h: number, r: number, m: MonitorMat, p: Vec3, b = 0.025) => {
    const g = ext(roundedRect(w, l, r), h, b)
    g.rotateX(-Math.PI / 2)
    put(m, g, at(p))
  }
  /** Plaque debout, épaisseur vers l'avant ; `parent` la place dans la dalle. */
  const rounded = (w: number, h: number, d: number, r: number, m: MonitorMat, where: THREE.Matrix4, b = 0.025) =>
    put(m, ext(roundedRect(w, h, r), d, b), where)
  const cube = (w: number, h: number, d: number, m: MonitorMat, where: THREE.Matrix4) => put(m, new THREE.BoxGeometry(w, h, d), where)

  /* ---- Le pied : patin, socle, colonne, articulation ---- */
  slab(2.76, 1.85, 0.025, 0.2, 'rubber', [0, 0.022, 0])
  slab(2.9, 1.97, 0.12, 0.23, 'case', [0, 0.065, 0], 0.05)
  rounded(0.63, 1.62, 0.34, 0.15, 'case', at([0, 0.98, -0.34], [-0.12, 0, 0]), 0.05)
  rounded(1.05, 0.66, 0.38, 0.19, 'edge', at([0, 1.73, -0.37]))

  /* ---- La dalle : coque, cadre fin ---- */
  const panel = at([0, 3.58, 0])
  const inPanel = (p: Vec3, r: Vec3 = [0, 0, 0]) => panel.clone().multiply(at(p, r))
  rounded(8.1, 4.7, 0.27, 0.16, 'case', inPanel([0, 0, -0.29]), 0.045)
  const front = roundedRect(8.1, 4.7, 0.13)
  const opening = new THREE.Path()
  opening.moveTo(-3.946, -2.171)
  opening.lineTo(3.946, -2.171)
  opening.lineTo(3.946, 2.271)
  opening.lineTo(-3.946, 2.271)
  opening.closePath()
  front.holes.push(opening)
  put('edge', ext(front, 0.09, 0.01), inPanel([0, 0, 0.02]))
  put('led', new THREE.SphereGeometry(0.021, 8, 6), inPanel([3.65, -2.278, 0.139]))
  for (let i = 0; i < 4; i++) cube(0.11, 0.024, 0.065, 'edge', inPanel([3.14 + i * 0.16, -2.381, 0.055]))

  /* ---- Le dos : renfort et vis de fixation, aérations, connectique ---- */
  rounded(2.07, 1.89, 0.075, 0.2, 'edge', inPanel([0, -0.4, -0.408]), 0.02)
  for (const x of [-0.52, 0.52]) {
    for (const y of [-0.91, 0.12]) {
      put('metal', new THREE.CylinderGeometry(0.042, 0.042, 0.016, 10), inPanel([x, y, -0.424], [Math.PI / 2, 0, 0]))
      cube(0.052, 0.009, 0.008, 'dark', inPanel([x, y, -0.436]))
      cube(0.009, 0.052, 0.008, 'dark', inPanel([x, y, -0.436]))
    }
  }
  for (let i = 0; i < 26; i++) cube(0.16, 0.027, 0.01, 'dark', inPanel([-2.79 + i * 0.22, 1.81, -0.339]))
  cube(2.54, 0.38, 0.042, 'edge', inPanel([-1.94, -1.59, -0.352]))
  const ports: [string, number, number][] = [
    ['HDMI', -2.79, 0.43],
    ['DP', -2.17, 0.4],
    ['USB', -1.55, 0.32],
  ]
  for (const [, x, w] of ports) {
    cube(w, 0.15, 0.027, 'mesh', inPanel([x, -1.61, -0.387]))
    cube(w - 0.062, 0.089, 0.014, 'dark', inPanel([x, -1.61, -0.409]))
  }
  put('dark', new THREE.CylinderGeometry(0.077, 0.077, 0.03, 12), inPanel([-0.99, -1.61, -0.393], [Math.PI / 2, 0, 0]))

  /* ---- Inscriptions : sous l'écran, et au-dessus de chaque prise ---- */
  const sheet = labelSheet([
    { text: 'MONITOR', size: [0.5, 0.085], where: inPanel([0, -2.278, 0.133]) },
    ...ports.map(([name, x]): Label => ({ text: name, size: [0.38, 0.085], where: inPanel([x, -1.32, -0.354], [0, Math.PI, 0]) })),
  ])

  const place = new THREE.Matrix4().makeScale(MONITOR_SCALE, MONITOR_SCALE, MONITOR_SCALE)
  sheet.geometry.applyMatrix4(place)
  const screen = new THREE.PlaneGeometry(7.86, 4.42125)
  screen.applyMatrix4(inPanel([0, 0.05, 0.125]))
  screen.applyMatrix4(place)
  const geo = finish(place)
  sitOnFloor([...Object.values(geo), screen, sheet.geometry])

  return { geo, screen, labels: sheet.geometry, labelTex: sheet.texture }
}

export function Monitor({ on = true }: { on?: boolean }) {
  const { geo, screen, labels, labelTex } = useMemo(buildMonitor, [])
  const desktop = useMemo(desktopTexture, [])
  useEffect(() => () => desktop.dispose(), [desktop])

  return (
    <group name="monitor">
      <mesh geometry={geo.case} castShadow receiveShadow>
        <meshStandardMaterial color="#262d37" roughness={0.48} metalness={0.24} />
      </mesh>
      <mesh geometry={geo.edge} castShadow>
        <meshStandardMaterial color="#131a23" roughness={0.62} metalness={0.1} />
      </mesh>
      <mesh geometry={geo.rubber}>
        <meshStandardMaterial color="#141922" roughness={0.88} />
      </mesh>
      <mesh geometry={geo.metal}>
        <meshStandardMaterial color="#a3adb8" roughness={0.3} metalness={0.85} />
      </mesh>
      <mesh geometry={geo.mesh}>
        <meshStandardMaterial color="#697787" roughness={0.4} metalness={0.6} />
      </mesh>
      <mesh geometry={geo.dark}>
        <meshStandardMaterial color="#080d15" roughness={0.88} />
      </mesh>
      {/* Voyant de veille : vert allumé, éteint sinon */}
      <mesh geometry={geo.led}>
        <meshBasicMaterial color={on ? '#66ff9a' : '#1e2a22'} toneMapped={false} />
      </mesh>
      {/* La dalle : le bureau quand l'écran est allumé, un noir mat sinon */}
      <mesh geometry={screen}>
        {on ? (
          <meshBasicMaterial map={desktop} toneMapped={false} />
        ) : (
          <meshStandardMaterial color="#0b0e12" roughness={0.2} metalness={0.2} />
        )}
      </mesh>
      <LabelSheet geometry={labels} texture={labelTex} />
    </group>
  )
}

/* ================================================================ */
/*  Le clavier                                                       */
/* ================================================================ */

/**
 * Clavier français AZERTY, disposition ISO à 105 touches : pavé de
 * fonctions, rangée des chiffres (& é " ' ( - è _ ç à), lettres A Z E R T Y,
 * touche Entrée en L sur deux rangées, bloc de navigation, flèches en T
 * inversé et pavé numérique. Trois voyants au-dessus du pavé numérique.
 *
 * Chaque touche porte sa vraie légende : toutes sont dessinées sur UNE
 * image, et toutes les touches ne font qu'un objet — sinon 105 touches
 * coûteraient 105 objets à dessiner.
 *
 * Tracé en unités de dessin (11,8 de large), mis à l'échelle : 31 cm, la
 * taille de l'ancien clavier, pour tenir sur le guéridon de l'atelier.
 */

/** Unités de dessin -> centimètres. */
const KEYBOARD_SCALE = 2.6

type KeyboardMat = 'edge' | 'case' | 'rubber' | 'cap' | 'special' | 'dark' | 'led' | 'ledOff'

function buildKeyboard() {
  const { put, finish } = mergeBatch<KeyboardMat>(['edge', 'case', 'rubber', 'cap', 'special', 'dark', 'led', 'ledOff'])
  // le plateau est très légèrement incliné vers l'élève
  const deck = at([0, 0.1, 0], [0.035, 0, 0])
  const inDeck = (p: Vec3, r: Vec3 = [0, 0, 0]) => deck.clone().multiply(at(p, r))
  const ext = (s: THREE.Shape, d: number, b: number, curve = 3) =>
    new THREE.ExtrudeGeometry(s, { depth: d, bevelEnabled: b > 0, bevelSize: b, bevelThickness: b, bevelSegments: 1, curveSegments: curve, steps: 1 })
  const slab = (w: number, l: number, h: number, r: number, m: KeyboardMat, p: Vec3, b = 0.025, curve = 3) => {
    const g = ext(roundedRect(w, l, r), h, b, curve)
    g.rotateX(-Math.PI / 2)
    put(m, g, inDeck(p))
  }

  /* ---- La coque ---- */
  slab(11.78, 3.88, 0.16, 0.16, 'edge', [0, 0.03, 0], 0.04, 6)
  slab(11.69, 3.79, 0.09, 0.15, 'case', [0, 0.205, 0], 0.035, 6)
  for (const x of [-4.6, 4.6]) for (const z of [-1.5, 1.5]) slab(0.58, 0.28, 0.035, 0.08, 'rubber', [x, -0.01, z], 0.01)
  for (const x of [-4.5, 4.5]) put('rubber', new THREE.BoxGeometry(0.46, 0.085, 0.46), inDeck([x, 0.018, -1.53], [0.2, 0, 0]))

  /* ---- Les touches, et leurs légendes ---- */
  const pitch = 0.48
  const left = -5.5
  const labels: Label[] = []
  const legend = (lines: string | string[], x: number, z: number, w: number, l: number) => {
    const arr = Array.isArray(lines) ? lines : [lines]
    if (arr.length === 0 || !arr[0]) return
    labels.push({
      size: [w * 0.86, l * 0.8],
      where: inDeck([x, 0.453, z], [-Math.PI / 2, 0, 0]),
      draw: (ctx, cx, cy) => {
        ctx.fillStyle = '#e2e8ef'
        if (arr.length === 1) {
          ctx.font = arr[0].length > 4 ? '500 34px Arial' : arr[0].length > 2 ? '500 44px Arial' : '500 72px Arial'
          ctx.fillText(arr[0], cx + 128, cy + 68, 230)
        } else {
          ctx.font = '500 43px Arial'
          ctx.fillText(arr[0], cx + 128, cy + 34, 230)
          ctx.fillText(arr[1], cx + 128, cy + 92, 230)
          if (arr[2]) {
            ctx.font = '500 28px Arial'
            ctx.fillText(arr[2], cx + 214, cy + 94, 62)
          }
        }
      },
    })
  }
  const SPECIAL = /Ctrl|Maj|Alt|Entrée|Retour|Tab|Verr|Echap|Win|Menu/
  const key = (name: string, u: number, z: number, width = 1, lines: string | string[] = name, length = 0.46) => {
    const x = left + (u + width / 2) * pitch
    const w = width * pitch - 0.052
    const l = length - 0.042
    slab(w - 0.032, l - 0.032, 0.12, 0.045, SPECIAL.test(name) ? 'special' : 'cap', [x, 0.303, z], 0.019)
    legend(lines, x, z, w, l)
  }

  // Échap et les touches de fonction, par groupes de quatre
  key('Echap', 0, -1.56, 1, 'Échap', 0.4)
  for (let i = 0; i < 12; i++) key('F' + (i + 1), 2 + i + Math.floor(i / 4) * 0.5, -1.56, 1, 'F' + (i + 1), 0.4)
  const nav = 15.65
  const num = 19.35
  ;['Impr', 'Défil', 'Pause'].forEach((s, i) => key(s, nav + i, -1.56, 1, s, 0.4))
  // les chiffres et la ponctuation de l'AZERTY traditionnel
  const digits = [['²'], ['1', '&'], ['2', 'é', '~'], ['3', '"', '#'], ['4', "'", '{'], ['5', '(', '['], ['6', '-', '|'], ['7', 'è', '`'], ['8', '_', '\\'], ['9', 'ç', '^'], ['0', 'à', '@'], ['°', ')', ']'], ['+', '=', '}']]
  digits.forEach((s, i) => key('Touche', i, -0.91, 1, s))
  key('Retour arrière', 13, -0.91, 2, '←')
  key('Tab', 0, -0.38, 1.5, 'Tab')
  ;[...'AZERTYUIOP'].forEach((s, i) => key(s, 1.5 + i, -0.38))
  key('Circonflexe', 11.5, -0.38, 1, ['¨', '^'])
  key('Dollar', 12.5, -0.38, 1, ['£', '$', '¤'])
  key('Verr Maj', 0, 0.15, 1.75, 'Verr Maj')
  ;[...'QSDFGHJKLM'].forEach((s, i) => key(s, 1.75 + i, 0.15))
  key('Pourcent', 11.75, 0.15, 1, ['%', 'ù'])
  key('Astérisque', 12.75, 0.15, 1, ['µ', '*'])
  // la touche Entrée ISO, en L sur deux rangées
  const x0 = left + 13.5 * pitch + 0.026
  const x1 = left + 15 * pitch - 0.026
  const x2 = left + 13.75 * pitch + 0.026
  const enter = new THREE.Shape()
  enter.moveTo(x0, 0.59)
  enter.lineTo(x1, 0.59)
  enter.lineTo(x1, -0.36)
  enter.lineTo(x2, -0.36)
  enter.lineTo(x2, 0.17)
  enter.lineTo(x0, 0.17)
  enter.closePath()
  const eg = ext(enter, 0.12, 0.018)
  eg.rotateX(-Math.PI / 2)
  put('special', eg, inDeck([0, 0.303, 0]))
  legend('Entrée', (x2 + x1) / 2, -0.12, (x1 - x2) * 0.93, 0.66)
  key('Maj gauche', 0, 0.68, 1.25, '⇧')
  key('Inférieur', 1.25, 0.68, 1, ['>', '<'])
  ;[...'WXCVBN'].forEach((s, i) => key(s, 2.25 + i, 0.68))
  ;[['?', ','], ['.', ';'], ['/', ':'], ['§', '!']].forEach((s, i) => key('Ponctuation', 8.25 + i, 0.68, 1, s))
  key('Maj droite', 12.25, 0.68, 2.75, '⇧')
  let u = 0
  for (const [label, width] of [['Ctrl', 1.25], ['Win', 1.25], ['Alt', 1.25], ['Espace', 6.25], ['AltGr', 1.25], ['Win', 1.25], ['Menu', 1.25], ['Ctrl', 1.25]] as const) {
    key(label, u, 1.21, width, label === 'Espace' ? [] : label)
    u += width
  }
  // bloc de navigation et flèches en T inversé
  ;['Inser', 'Début', 'Pg ↑'].forEach((s, i) => key(s, nav + i, -0.91))
  ;['Suppr', 'Fin', 'Pg ↓'].forEach((s, i) => key(s, nav + i, -0.38))
  key('Haut', nav + 1, 0.68, 1, '↑')
  ;['←', '↓', '→'].forEach((s, i) => key(s, nav + i, 1.21))
  // pavé numérique : + et Entrée sur deux rangées, 0 double
  ;['Verr Num', '/', '*', '−'].forEach((s, i) => key(s, num + i, -0.91, 1, s === 'Verr Num' ? ['Verr', 'Num'] : s))
  ;['7', '8', '9'].forEach((s, i) => key(s, num + i, -0.38))
  key('Plus', num + 3, -0.115, 1, '+', 0.99)
  ;['4', '5', '6'].forEach((s, i) => key(s, num + i, 0.15))
  ;['1', '2', '3'].forEach((s, i) => key(s, num + i, 0.68))
  key('Entrée pavé', num + 3, 0.945, 1, 'Entrée', 0.99)
  key('Zéro', num, 1.21, 2, '0')
  key('Décimal', num + 2, 1.21, 1, '.')

  /* ---- Trois voyants au-dessus du pavé numérique, et la prise USB-C ---- */
  for (let i = 0; i < 3; i++) put(i === 0 ? 'led' : 'ledOff', new THREE.SphereGeometry(0.025, 8, 6), inDeck([left + (num + 0.7 + i) * pitch, 0.323, -1.56]))
  put('dark', new THREE.BoxGeometry(0.33, 0.12, 0.025), inDeck([0, 0.25, -1.949]))

  const place = new THREE.Matrix4().makeScale(KEYBOARD_SCALE, KEYBOARD_SCALE, KEYBOARD_SCALE)
  const sheet = labelSheet(labels, [256, 128])
  sheet.geometry.applyMatrix4(place)
  const geo = finish(place)
  sitOnFloor([...Object.values(geo), sheet.geometry])
  return { geo, labels: sheet.geometry, labelTex: sheet.texture }
}

export function Keyboard() {
  const { geo, labels, labelTex } = useMemo(buildKeyboard, [])

  return (
    <group name="keyboard">
      <mesh geometry={geo.edge} castShadow receiveShadow>
        <meshStandardMaterial color="#131a23" roughness={0.62} metalness={0.1} />
      </mesh>
      <mesh geometry={geo.case}>
        <meshStandardMaterial color="#262d37" roughness={0.48} metalness={0.24} />
      </mesh>
      <mesh geometry={geo.rubber}>
        <meshStandardMaterial color="#141922" roughness={0.88} />
      </mesh>
      <mesh geometry={geo.cap} castShadow>
        <meshStandardMaterial color="#1e2631" roughness={0.54} metalness={0.08} />
      </mesh>
      <mesh geometry={geo.special} castShadow>
        <meshStandardMaterial color="#303a48" roughness={0.5} metalness={0.1} />
      </mesh>
      <mesh geometry={geo.dark}>
        <meshStandardMaterial color="#080d15" roughness={0.88} />
      </mesh>
      <mesh geometry={geo.led}>
        <meshStandardMaterial color="#6edbce" emissive="#219d9d" emissiveIntensity={0.8} />
      </mesh>
      <mesh geometry={geo.ledOff}>
        <meshStandardMaterial color="#697787" roughness={0.4} metalness={0.6} />
      </mesh>
      <LabelSheet geometry={labels} texture={labelTex} />
    </group>
  )
}

/* ================================================================ */
/*  La souris                                                        */
/* ================================================================ */

/**
 * Souris de bureau gris clair : coque en goutte d'eau plus haute à
 * l'arrière, deux boutons séparés par la fente de la molette, molette
 * caoutchoutée à flancs métalliques, deux boutons de pouce sur le flanc
 * gauche. Dessous : patins de glisse, capteur optique et quatre vis.
 *
 * Le dessus est une surface paramétrique : une même fonction donne la
 * largeur et la hauteur à chaque profondeur, si bien que la coque et les
 * deux boutons se raccordent sans marche.
 *
 * Tracée en unités de dessin, nez vers -Z (5,7 de long) ; retournée nez
 * vers +Z, là où sort le câble, et mise à l'échelle : 12 cm de long.
 */

/** Unités de dessin -> centimètres. */
const MOUSE_SCALE = 2.15

type MouseMat = 'shell' | 'button' | 'base' | 'rubber' | 'seam' | 'metal' | 'feet' | 'lens' | 'led'

function buildMouse(): Record<MouseMat, THREE.BufferGeometry> {
  const { put, finish } = mergeBatch<MouseMat>(['shell', 'button', 'base', 'rubber', 'seam', 'metal', 'feet', 'lens', 'led'])

  // t va de -1 (le nez) à 1 (le talon) ; a fait le tour, de -π/2 à π/2
  const width = (t: number) => 1.48 * Math.pow(Math.max(0, 1 - t * t), 0.3) * (1 + 0.04 * t)
  const height = (t: number) => 0.23 + 1.45 * Math.pow(Math.max(0, 1 - t * t), 0.55) * (1 + 0.26 * t)
  const point = (t: number, a: number) =>
    new THREE.Vector3(
      width(t) * Math.sin(a),
      0.21 + (height(t) - 0.21) * Math.pow(Math.max(0, Math.cos(a)), 0.65),
      2.85 * t,
    )

  /**
   * Un morceau du dessus : la coque entière (side 0) ou un bouton (side
   * -1 à gauche, 1 à droite), écarté du milieu par la fente de la molette.
   */
  const surface = (t0: number, t1: number, side: -1 | 0 | 1, m: MouseMat, offset: number, rows: number, cols: number) => {
    const pos: number[] = []
    const ind: number[] = []
    for (let i = 0; i <= rows; i++) {
      const t = t0 + ((t1 - t0) * i) / rows
      const gap = 0.033 + 0.163 * Math.exp(-Math.pow((t + 0.54) / 0.22, 8))
      const a0 = Math.asin(Math.min(0.95, gap / Math.max(width(t), 0.04)))
      for (let j = 0; j <= cols; j++) {
        const f = j / cols
        const a = side === 0 ? -Math.PI / 2 + Math.PI * f : side * (a0 + (Math.PI / 2 - a0) * f)
        const p = point(t, a)
        pos.push(p.x, p.y + offset, p.z)
      }
    }
    for (let i = 0; i < rows; i++) {
      for (let j = 0; j < cols; j++) {
        const a = i * (cols + 1) + j
        const b = a + cols + 1
        // le bouton gauche est tracé en miroir : on retourne ses faces
        if (side === -1) ind.push(a, a + 1, b, b, a + 1, b + 1)
        else ind.push(a, b, a + 1, b, b + 1, a + 1)
      }
    }
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
    g.setIndex(ind)
    g.computeVertexNormals()
    put(m, g, at([0, 0, 0]))
  }

  /* ---- Le dessus : sous-coque sombre (visible dans les fentes), coque, boutons ---- */
  surface(-0.999, 0.999, 0, 'base', -0.058, 30, 20)
  surface(-0.088, 0.999, 0, 'shell', 0, 40, 32)
  surface(-0.999, -0.1, -1, 'button', 0.004, 36, 18)
  surface(-0.999, -0.1, 1, 'button', 0.004, 36, 18)

  /* ---- La semelle, qui suit exactement le contour de la coque ---- */
  const outline: THREE.Vector2[] = []
  const n = 60
  for (let i = 0; i <= n; i++) {
    const t = -1 + (2 * i) / n
    outline.push(new THREE.Vector2(width(t), 2.85 * t))
  }
  for (let i = n; i >= 0; i--) {
    const t = -1 + (2 * i) / n
    outline.push(new THREE.Vector2(-width(t), 2.85 * t))
  }
  const flat = (s: THREE.Shape, depth: number, bevel: number) =>
    new THREE.ExtrudeGeometry(s, {
      depth,
      bevelEnabled: true,
      bevelSegments: 2,
      bevelSize: bevel,
      bevelThickness: bevel,
      steps: 1,
      curveSegments: 5,
    })
  put('base', flat(new THREE.Shape(outline), 0.13, 0.035), at([0, 0.17, 0], [Math.PI / 2, 0, 0]))
  /** Plaquette couchée sous la souris (patin, capteur...). */
  const plate = (w: number, l: number, d: number, r: number, m: MouseMat, p: Vec3) =>
    put(m, flat(roundedRect(w, l, r), d, 0.015), at(p, [Math.PI / 2, 0, 0]))

  /* ---- La molette : pneu caoutchouc, flancs métalliques, 36 stries ---- */
  const wheel = at([0, height(-0.54) - 0.15, -1.539])
  put('rubber', new THREE.CylinderGeometry(0.34, 0.34, 0.285, 32), wheel.clone().multiply(at([0, 0, 0], [0, 0, Math.PI / 2])))
  for (const x of [-0.149, 0.149]) {
    put('metal', new THREE.CylinderGeometry(0.25, 0.25, 0.018, 24), wheel.clone().multiply(at([x, 0, 0], [0, 0, Math.PI / 2])))
  }
  for (let i = 0; i < 36; i++) {
    const a = (i * 2 * Math.PI) / 36
    put('base', new THREE.BoxGeometry(0.27, 0.025, 0.029), wheel.clone().multiply(at([0, 0.343 * Math.cos(a), 0.343 * Math.sin(a)], [a, 0, 0])))
  }

  /* ---- Voyant derrière la molette ---- */
  put('led', new THREE.SphereGeometry(0.035, 12, 8), at([0, height(-0.17) + 0.013, -0.484], [0, 0, 0], [0.68, 0.3, 1.5]))

  /* ---- Deux boutons de pouce (précédent / suivant) sur le flanc gauche ---- */
  for (const z of [-0.72, -0.03]) {
    const p = point(z / 2.85, -1.28)
    put('base', new THREE.CapsuleGeometry(0.072, 0.38, 4, 10), at([p.x - 0.035, p.y + 0.02, z], [Math.PI / 2, 0, 0]))
  }

  /* ---- Dessous : patins de glisse, capteur optique, vis ---- */
  for (const z of [-2.08, 2.04]) plate(1.54, 0.37, 0.023, 0.16, 'feet', [0, 0.009, z])
  plate(0.7, 0.81, 0.023, 0.21, 'seam', [0, 0.015, -0.25])
  plate(0.29, 0.36, 0.015, 0.07, 'lens', [0, -0.02, -0.25])
  for (const [x, z] of [[-0.88, -1.7], [0.88, -1.7], [-0.88, 1.72], [0.88, 1.72]]) {
    put('seam', new THREE.CylinderGeometry(0.047, 0.047, 0.02, 10), at([x, 0.005, z]))
    put('metal', new THREE.BoxGeometry(0.062, 0.008, 0.012), at([x, -0.008, z]))
  }

  // Nez vers +Z, à l'échelle, et posée sur y = 0 (le capteur descend à
  // -0,05 en unités de dessin).
  const place = new THREE.Matrix4()
    .makeTranslation(0, 0.05 * MOUSE_SCALE, 0)
    .multiply(new THREE.Matrix4().makeScale(MOUSE_SCALE, MOUSE_SCALE, MOUSE_SCALE))
    .multiply(new THREE.Matrix4().makeRotationY(Math.PI))
  return finish(place)
}

export function Mouse({ showcase = false }: { showcase?: boolean }) {
  const geo = useMemo(buildMouse, [])

  return (
    <group name="mouse">
      <mesh geometry={geo.shell} castShadow receiveShadow>
        <meshStandardMaterial color="#a4a9b1" roughness={0.4} metalness={0.12} />
      </mesh>
      <mesh geometry={geo.button} castShadow receiveShadow>
        <meshStandardMaterial color="#b3b7be" roughness={0.36} metalness={0.09} />
      </mesh>
      <mesh geometry={geo.base} castShadow>
        <meshStandardMaterial color="#252a31" roughness={0.69} />
      </mesh>
      <mesh geometry={geo.rubber} castShadow>
        <meshStandardMaterial color="#11171d" roughness={0.94} />
      </mesh>
      <mesh geometry={geo.seam}>
        <meshStandardMaterial color="#11151b" roughness={0.64} />
      </mesh>
      <mesh geometry={geo.metal}>
        <meshStandardMaterial color="#85919f" roughness={0.25} metalness={0.75} />
      </mesh>
      <mesh geometry={geo.feet}>
        <meshStandardMaterial color="#abb3bd" roughness={0.49} />
      </mesh>
      <mesh geometry={geo.lens}>
        <meshStandardMaterial color="#184c65" roughness={0.13} metalness={0.35} />
      </mesh>
      <mesh geometry={geo.led}>
        <meshStandardMaterial color="#48bdb4" emissive="#188a86" emissiveIntensity={0.8} />
      </mesh>

      {/* Sur le présentoir : le début du câble, sans lequel une souris vue
          de dessus ressemble à un galet. */}
      {showcase && <MouseTail />}
    </group>
  )
}

/** Amorce de câble à l'avant de la souris (présentoir seulement). */
export function MouseTail() {
  const geo = useMemo(() => {
    const curve = new THREE.CatmullRomCurve3(
      [
        new THREE.Vector3(0, 0.62, 5.9),
        new THREE.Vector3(0.4, 0.5, 8.2),
        new THREE.Vector3(1.8, 0.35, 10.2),
        new THREE.Vector3(4.2, 0.3, 11.6),
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
 * Manette de console façon DualShock : coque noire à deux poignées, pavé
 * tactile au centre, croix directionnelle à gauche, quatre boutons à
 * symboles à droite, deux joysticks en bas, gâchettes et barre lumineuse
 * bleue sur la tranche du haut.
 *
 * Près de deux cents pièces (picots des joysticks, trous du haut-parleur,
 * traits des symboles...), fusionnées par matière : il reste neuf objets
 * à dessiner.
 *
 * La géométrie est tracée debout, face vers +Z, en unités de dessin
 * (8 de large) ; elle est ensuite couchée, face vers le haut, et mise à
 * l'échelle : environ 17 cm de large, comme une vraie manette.
 */

/** Unités de dessin -> centimètres. */
const GAMEPAD_SCALE = 2

type PadMat = 'back' | 'edge' | 'plastic' | 'gloss' | 'pad' | 'rubber' | 'pale' | 'led' | 'icon'

/** Contour de la coque, poignées comprises. */
function padOutline() {
  const s = new THREE.Shape()
  s.moveTo(0, 1.63)
  s.bezierCurveTo(1.1, 1.63, 1.7, 1.79, 2.65, 1.62)
  s.bezierCurveTo(3.25, 1.55, 3.65, 1.14, 3.72, 0.48)
  s.bezierCurveTo(3.84, -0.22, 4.04, -1.36, 3.9, -2.12)
  s.bezierCurveTo(3.82, -2.64, 3.25, -2.8, 2.88, -2.45)
  s.bezierCurveTo(2.56, -2.14, 2.4, -1.55, 2.04, -1.22)
  s.bezierCurveTo(1.57, -0.81, 0.74, -1.14, 0, -1.12)
  s.bezierCurveTo(-0.74, -1.14, -1.57, -0.81, -2.04, -1.22)
  s.bezierCurveTo(-2.4, -1.55, -2.56, -2.14, -2.88, -2.45)
  s.bezierCurveTo(-3.25, -2.8, -3.82, -2.64, -3.9, -2.12)
  s.bezierCurveTo(-4.04, -1.36, -3.84, -0.22, -3.72, 0.48)
  s.bezierCurveTo(-3.65, 1.14, -3.25, 1.55, -2.65, 1.62)
  s.bezierCurveTo(-1.7, 1.79, -1.1, 1.63, 0, 1.63)
  return s
}

function buildGamepad(): Record<PadMat, THREE.BufferGeometry> {
  const { put, finish } = mergeBatch<PadMat>(['back', 'edge', 'plastic', 'gloss', 'pad', 'rubber', 'pale', 'led', 'icon'])

  const extrude = (s: THREE.Shape, depth: number, bevel: number, curve: number) =>
    new THREE.ExtrudeGeometry(s, {
      depth,
      bevelEnabled: bevel > 0,
      bevelThickness: bevel,
      bevelSize: bevel,
      bevelSegments: 3,
      steps: 1,
      curveSegments: curve,
    })
  const box = (w: number, h: number, d: number, r: number, m: PadMat, where: THREE.Matrix4, b = 0.035) =>
    put(m, extrude(roundedRect(w, h, r), d, b, 5), where)
  // disque couché face vers +Z
  const disc = (r: number, h: number, m: PadMat, p: Vec3, seg = 32) =>
    put(m, new THREE.CylinderGeometry(r, r, h, seg), at(p, [Math.PI / 2, 0, 0]))
  const torus = (r: number, t: number, m: PadMat, p: Vec3, color?: number, rot: Vec3 = [0, 0, 0]) =>
    put(m, new THREE.TorusGeometry(r, t, 8, 40), at(p, rot), color)
  /** Trait fin d'un symbole : un petit tube par segment. */
  const stroke = (pts: [number, number][], m: PadMat, x: number, y: number, z: number, closed = false, color?: number) => {
    const p = pts.map(([u, v]) => new THREE.Vector3(u + x, v + y, z))
    if (closed) p.push(p[0].clone())
    for (let i = 1; i < p.length; i++) {
      put(m, new THREE.TubeGeometry(new THREE.LineCurve3(p[i - 1], p[i]), 1, 0.014, 5, false), at([0, 0, 0]), color)
    }
  }

  /* ---- Coque : dos, liseré, face ---- */
  const outline = padOutline()
  put('back', extrude(outline, 0.38, 0.25, 18), at([0, 0, -0.6]))
  put('edge', extrude(outline, 0.035, 0.26, 18), at([0, 0, -0.13]))
  put('plastic', extrude(outline, 0.36, 0.24, 18), at([0, 0, -0.055]))

  /* ---- Pavé tactile, en creux, et son liseré lumineux ---- */
  box(2.43, 1.28, 0.06, 0.18, 'edge', at([0, 0.85, 0.55]))
  box(2.29, 1.15, 0.065, 0.15, 'pad', at([0, 0.86, 0.62]))
  box(1.83, 0.035, 0.025, 0.012, 'led', at([0, 1.34, 0.72]), 0.005)

  /* ---- Les deux joysticks ---- */
  const capProfile = [[0, 0], [0.18, 0], [0.34, 0.014], [0.41, 0.06], [0.435, 0.09], [0.45, 0.045], [0.45, -0.09], [0.4, -0.14], [0, -0.14]]
    .map(([u, v]) => new THREE.Vector2(u, v))
  for (const x of [-1.32, 1.32]) {
    disc(0.72, 0.11, 'edge', [x, -0.66, 0.56])
    torus(0.64, 0.045, 'gloss', [x, -0.66, 0.64])
    put('rubber', new THREE.SphereGeometry(0.47, 28, 16), at([x, -0.66, 0.61], [0, 0, 0], [1, 1, 0.65]))
    disc(0.24, 0.36, 'gloss', [x, -0.66, 0.91], 20)
    put('rubber', new THREE.LatheGeometry(capProfile, 36), at([x, -0.66, 1.17], [Math.PI / 2, 0, 0]))
    torus(0.412, 0.04, 'plastic', [x, -0.66, 1.13])
    // les picots antidérapants sur le pourtour du chapeau
    for (let k = 0; k < 40; k++) {
      const a = (k * Math.PI) / 20
      put(
        'rubber',
        new THREE.SphereGeometry(0.013, 5, 4),
        at([x + 0.451 * Math.cos(a), -0.66 + 0.451 * Math.sin(a), 1.22], [0, 0, 0], [1, 1, 2.3]),
      )
    }
  }

  /* ---- Croix directionnelle : quatre flèches séparées ---- */
  disc(0.77, 0.065, 'back', [-2.56, 0.59, 0.57])
  const arm = new THREE.Shape()
  arm.moveTo(-0.19, 0.15)
  arm.lineTo(0.19, 0.15)
  arm.lineTo(0.22, 0.59)
  arm.quadraticCurveTo(0, 0.7, -0.22, 0.59)
  arm.closePath()
  const arrow = new THREE.Shape()
  arrow.moveTo(0, 0.54)
  arrow.lineTo(-0.08, 0.42)
  arrow.lineTo(0.08, 0.42)
  arrow.closePath()
  for (let k = 0; k < 4; k++) {
    const g = at([-2.56, 0.59, 0.61], [0, 0, (k * Math.PI) / 2])
    put('gloss', extrude(arm, 0.1, 0.04, 6), g)
    put('pale', new THREE.ShapeGeometry(arrow), g.clone().multiply(at([0, 0, 0.15])))
  }

  /* ---- Les quatre boutons à symboles : △ en haut, ○ à droite, ✕ en bas, □ à gauche ---- */
  const colors = [0x67c9b0, 0xee8991, 0x88aaf1, 0xdaa1cc]
  for (let k = 0; k < 4; k++) {
    const a = Math.PI / 2 - (k * Math.PI) / 2
    const x = 2.56 + 0.58 * Math.cos(a)
    const y = 0.59 + 0.58 * Math.sin(a)
    const z = 0.791
    disc(0.305, 0.08, 'edge', [x, y, 0.58], 28)
    disc(0.267, 0.16, 'gloss', [x, y, 0.7], 28)
    torus(0.252, 0.014, 'plastic', [x, y, 0.783])
    const c = colors[k]
    if (k === 0) stroke([[0, 0.145], [-0.15, -0.115], [0.15, -0.115]], 'icon', x, y, z, true, c)
    if (k === 1) torus(0.133, 0.014, 'icon', [x, y, z], c)
    if (k === 2) {
      stroke([[-0.11, -0.11], [0.11, 0.11]], 'icon', x, y, z, false, c)
      stroke([[-0.11, 0.11], [0.11, -0.11]], 'icon', x, y, z, false, c)
    }
    if (k === 3) stroke([[-0.115, -0.115], [0.115, -0.115], [0.115, 0.115], [-0.115, 0.115]], 'icon', x, y, z, true, c)
  }

  /* ---- Boutons Share / Options, grille du haut-parleur, bouton central ---- */
  for (const x of [-1.56, 1.56]) box(0.18, 0.39, 0.095, 0.08, 'gloss', at([x, 1.02, 0.58]), 0.025)
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 7; col++) disc(0.023, 0.01, 'edge', [(col - 3) * 0.102, 0.03 + row * 0.1, 0.556], 8)
  }
  disc(0.2, 0.09, 'edge', [0, -0.58, 0.58], 24)
  disc(0.155, 0.045, 'gloss', [0, -0.58, 0.65], 24)
  stroke([[-0.075, -0.015], [0, 0.06], [0.075, -0.015], [0.075, -0.08], [-0.075, -0.08]], 'pale', 0, -0.55, 0.68, true)

  /* ---- Boutons de tranche, gâchettes, barre lumineuse ---- */
  for (const x of [-2.53, 2.53]) {
    box(1.26, 0.38, 0.24, 0.14, 'edge', at([x, 1.72, 0.16]), 0.07)
    box(1.13, 0.3, 0.18, 0.12, 'gloss', at([x, 1.78, 0.24]), 0.06)
    box(1.13, 0.49, 0.45, 0.17, 'rubber', at([x, 1.76, -0.64], [-0.23, 0, 0]), 0.09)
  }
  box(1.86, 0.16, 0.055, 0.07, 'led', at([0, 1.54, -0.58]), 0.02)

  /* ---- Prise USB (d'où part le câble), prise casque et vis du dos ---- */
  box(0.47, 0.2, 0.055, 0.06, 'edge', at([0, 1.72, -0.06], [Math.PI / 2, 0, 0]), 0.012)
  box(0.3, 0.07, 0.025, 0.02, 'pale', at([0, 1.752, -0.065], [Math.PI / 2, 0, 0]), 0.004)
  torus(0.08, 0.025, 'pale', [0, -1.23, -0.23], undefined, [Math.PI / 2, 0, 0])
  for (const [x, y] of [[-2.8, 0.9], [2.8, 0.9], [-3.2, -1.65], [3.2, -1.65]]) {
    disc(0.085, 0.015, 'edge', [x, y, -0.86], 12)
    disc(0.05, 0.017, 'gloss', [x, y, -0.875], 12)
  }

  // Couchée face vers le haut, gâchettes vers le fond, mise à l'échelle et
  // posée sur y = 0 (le dos descend à -0,875 en unités de dessin).
  const place = new THREE.Matrix4()
    .makeTranslation(0, 0.875 * GAMEPAD_SCALE, 0)
    .multiply(new THREE.Matrix4().makeScale(GAMEPAD_SCALE, GAMEPAD_SCALE, GAMEPAD_SCALE))
    .multiply(new THREE.Matrix4().makeRotationX(-Math.PI / 2))

  return finish(place)
}

export function Gamepad() {
  const geo = useMemo(buildGamepad, [])

  return (
    <group name="gamepad">
      <mesh geometry={geo.back} castShadow receiveShadow>
        <meshStandardMaterial color="#17191e" roughness={0.75} />
      </mesh>
      <mesh geometry={geo.plastic} castShadow receiveShadow>
        <meshStandardMaterial color="#282a30" roughness={0.47} metalness={0.07} />
      </mesh>
      <mesh geometry={geo.edge} castShadow>
        <meshStandardMaterial color="#08090d" roughness={0.6} />
      </mesh>
      <mesh geometry={geo.gloss} castShadow>
        <meshStandardMaterial color="#22252b" roughness={0.27} metalness={0.1} />
      </mesh>
      <mesh geometry={geo.pad}>
        <meshStandardMaterial color="#181b22" roughness={0.82} />
      </mesh>
      <mesh geometry={geo.rubber} castShadow>
        <meshStandardMaterial color="#111318" roughness={0.86} />
      </mesh>
      <mesh geometry={geo.pale}>
        <meshStandardMaterial color="#adb3c1" roughness={0.6} />
      </mesh>
      <mesh geometry={geo.led}>
        <meshStandardMaterial color="#328bff" emissive="#1274ff" emissiveIntensity={2} roughness={0.35} />
      </mesh>
      <mesh geometry={geo.icon}>
        <meshBasicMaterial vertexColors />
      </mesh>
    </group>
  )
}

/* ================================================================ */
/*  Les enceintes                                                    */
/* ================================================================ */

/**
 * Paire d'enceintes de bureau : dans chaque caisson, un haut-parleur de
 * graves (membrane, suspension, cache-poussière) et un tweeter en dôme
 * pour les aigus. L'enceinte droite porte le volume, le voyant et la
 * prise casque ; au dos, un évent et les prises audio d'où part le câble.
 *
 * Tracée en unités de dessin (5,4 de large pour la paire), mise à
 * l'échelle : 23 cm, un caisson de 9 x 17 cm.
 */

/** Unités de dessin -> centimètres. */
const SPEAKER_SCALE = 4.2

type SpeakerMat = 'case' | 'edge' | 'rubber' | 'metal' | 'mesh' | 'dark' | 'white' | 'led' | 'cone'

function buildSpeakers() {
  const { put, finish } = mergeBatch<SpeakerMat>(['case', 'edge', 'rubber', 'metal', 'mesh', 'dark', 'white', 'led', 'cone'])
  const labels: Label[] = []
  const ext = (s: THREE.Shape, d: number, b: number) =>
    new THREE.ExtrudeGeometry(s, { depth: d, bevelEnabled: b > 0, bevelSize: b, bevelThickness: b, bevelSegments: 2, curveSegments: 6, steps: 1 })

  for (const [index, sx] of [[0, -1.62], [1, 1.62]] as const) {
    const sp = at([sx, 0, 0])
    const inSp = (p: Vec3, r: Vec3 = [0, 0, 0], k: Vec3 = [1, 1, 1]) => sp.clone().multiply(at(p, r, k))
    const cyl = (r: number, h: number, m: SpeakerMat, p: Vec3, seg = 20) =>
      put(m, new THREE.CylinderGeometry(r, r, h, seg), inSp(p, [Math.PI / 2, 0, 0]))
    const ring = (r: number, t: number, m: SpeakerMat, p: Vec3, seg = 36) => put(m, new THREE.TorusGeometry(r, t, 6, seg), inSp(p))
    const cube = (w: number, h: number, d: number, m: SpeakerMat, p: Vec3) => put(m, new THREE.BoxGeometry(w, h, d), inSp(p))

    // patins sous le caisson
    for (const px of [-0.66, 0.66]) {
      for (const pz of [-0.54, 0.54]) {
        const g = ext(roundedRect(0.33, 0.35, 0.09), 0.07, 0.018)
        g.rotateX(-Math.PI / 2)
        put('rubber', g, inSp([px, 0.045, pz]))
      }
    }
    // le caisson, percé pour les deux haut-parleurs, et son fond
    const holes = (s: THREE.Shape) => {
      for (const [y, r] of [[1.82 - 2.17, 0.82], [3.37 - 2.17, 0.355]]) {
        const h = new THREE.Path()
        h.absarc(0, y, r, 0, Math.PI * 2, true)
        s.holes.push(h)
      }
      return s
    }
    put('case', ext(holes(roundedRect(2.14, 4.06, 0.18)), 1.69, 0.035), inSp([0, 2.17, -0.88]))
    put('case', ext(roundedRect(2.12, 4.04, 0.17), 0.045, 0.02), inSp([0, 2.17, -0.946]))
    put('edge', ext(holes(roundedRect(2.04, 3.96, 0.15)), 0.065, 0.012), inSp([0, 2.17, 0.843]))

    // haut-parleur de graves : fixation, suspension, membrane, cache-poussière
    ring(0.825, 0.042, 'mesh', [0, 1.82, 0.943])
    ring(0.741, 0.075, 'rubber', [0, 1.82, 0.968])
    const cone = new THREE.LatheGeometry([[0.704, 0.951], [0.65, 0.927], [0.25, 0.827], [0.16, 0.883]].map(([u, v]) => new THREE.Vector2(u, v)), 36)
    cone.rotateX(Math.PI / 2)
    put('cone', cone, inSp([0, 1.82, 0]))
    put('edge', new THREE.SphereGeometry(0.256, 20, 12), inSp([0, 1.82, 0.852], [0, 0, 0], [1, 1, 0.59]))
    for (const a of [Math.PI / 4, (3 * Math.PI) / 4, (5 * Math.PI) / 4, (7 * Math.PI) / 4]) {
      const x = 0.86 * Math.cos(a)
      const y = 1.82 + 0.86 * Math.sin(a)
      cyl(0.042, 0.016, 'metal', [x, y, 0.967], 10)
      cube(0.052, 0.009, 0.008, 'dark', [x, y, 0.979])
      cube(0.009, 0.052, 0.008, 'dark', [x, y, 0.979])
    }
    // tweeter
    ring(0.367, 0.039, 'mesh', [0, 3.37, 0.946])
    put('rubber', new THREE.SphereGeometry(0.295, 18, 10), inSp([0, 3.37, 0.873], [0, 0, 0], [1, 1, 0.5]))
    // au dos : évent bass-reflex et plaque de connexion
    ring(0.29, 0.05, 'edge', [0, 3.37, -0.951])
    cyl(0.265, 0.015, 'dark', [0, 3.37, -0.943])
    put('edge', ext(roundedRect(0.88, 0.56, 0.07), 0.016, 0.006), inSp([0, 0.74, -0.959]))

    if (index === 1) {
      // enceinte droite : volume, voyant, prise casque, prises arrière
      cyl(0.185, 0.16, 'case', [0.44, 0.6, 0.98])
      ring(0.185, 0.017, 'mesh', [0.44, 0.6, 1.068])
      cube(0.019, 0.056, 0.01, 'white', [0.44, 0.727, 1.073])
      put('led', new THREE.SphereGeometry(0.025, 8, 6), inSp([-0.43, 0.61, 0.934]))
      ring(0.056, 0.013, 'mesh', [-0.08, 0.6, 0.934])
      cyl(0.043, 0.015, 'dark', [-0.08, 0.6, 0.936])
      labels.push({ text: 'VOL', size: [0.27, 0.072], where: inSp([0.44, 0.303, 0.924]) })
      for (const x of [-0.21, 0.21]) {
        ring(0.052, 0.015, 'mesh', [x, 0.8, -0.984])
        cyl(0.039, 0.015, 'dark', [x, 0.8, -0.982])
      }
      cube(0.29, 0.09, 0.018, 'dark', [0, 0.62, -0.993])
    } else {
      cyl(0.06, 0.023, 'dark', [0, 0.75, -0.987])
      labels.push({ text: 'L', size: [0.14, 0.1], where: inSp([0, 0.44, 0.924]) })
    }
  }

  const place = new THREE.Matrix4().makeScale(SPEAKER_SCALE, SPEAKER_SCALE, SPEAKER_SCALE)
  const sheet = labelSheet(labels)
  sheet.geometry.applyMatrix4(place)
  const geo = finish(place)
  sitOnFloor([...Object.values(geo), sheet.geometry])
  return { geo, labels: sheet.geometry, labelTex: sheet.texture }
}

export function Speaker() {
  const { geo, labels, labelTex } = useMemo(buildSpeakers, [])

  return (
    <group name="speaker">
      <mesh geometry={geo.case} castShadow receiveShadow>
        <meshStandardMaterial color="#262d37" roughness={0.48} metalness={0.24} />
      </mesh>
      <mesh geometry={geo.edge} castShadow>
        <meshStandardMaterial color="#131a23" roughness={0.62} metalness={0.1} />
      </mesh>
      <mesh geometry={geo.rubber}>
        <meshStandardMaterial color="#141922" roughness={0.88} />
      </mesh>
      <mesh geometry={geo.metal}>
        <meshStandardMaterial color="#a3adb8" roughness={0.3} metalness={0.85} />
      </mesh>
      <mesh geometry={geo.mesh}>
        <meshStandardMaterial color="#697787" roughness={0.4} metalness={0.6} />
      </mesh>
      <mesh geometry={geo.dark}>
        <meshStandardMaterial color="#080d15" roughness={0.88} />
      </mesh>
      <mesh geometry={geo.white}>
        <meshStandardMaterial color="#d2d9df" roughness={0.45} metalness={0.13} />
      </mesh>
      <mesh geometry={geo.led}>
        <meshStandardMaterial color="#6edbce" emissive="#219d9d" emissiveIntensity={0.8} />
      </mesh>
      {/* la membrane se voit des deux côtés */}
      <mesh geometry={geo.cone}>
        <meshStandardMaterial color="#52616f" roughness={0.53} metalness={0.26} side={THREE.DoubleSide} />
      </mesh>
      <LabelSheet geometry={labels} texture={labelTex} />
    </group>
  )
}

/* ================================================================ */
/*  Le microphone                                                    */
/* ================================================================ */

/**
 * Micro de bureau sur pied, sans marque : socle lesté, tige, fourche en U
 * et ses deux molettes, capsule orientable sous une grille à mailles
 * croisées. En façade, le bouton de gain, la touche muet et le voyant ;
 * au dos, une prise USB-C et une prise casque.
 *
 * La grille comptait près d'une centaine de fils : ils sont moins nombreux
 * ici (la maille reste lisible) et, comme tout le reste, fusionnés.
 *
 * Tracé en unités de dessin (4,4 de haut), mis à l'échelle : 20 cm.
 */

/** Unités de dessin -> centimètres. */
const MICRO_SCALE = 4.5

type MicroMat = 'case' | 'edge' | 'rubber' | 'mesh' | 'dark' | 'white' | 'led'

function buildMicrophone() {
  const { put, finish } = mergeBatch<MicroMat>(['case', 'edge', 'rubber', 'mesh', 'dark', 'white', 'led'])
  const Y: Vec3 = [0, 0, 0]
  const X: Vec3 = [0, 0, Math.PI / 2]
  const Z: Vec3 = [Math.PI / 2, 0, 0]
  const cyl = (r: number, h: number, m: MicroMat, where: THREE.Matrix4, seg = 24) => put(m, new THREE.CylinderGeometry(r, r, h, seg), where)
  const ring = (r: number, t: number, m: MicroMat, where: THREE.Matrix4, seg = 32) => put(m, new THREE.TorusGeometry(r, t, 5, seg), where)

  /* ---- Le pied ---- */
  cyl(1.1, 0.07, 'rubber', at([0, 0.055, 0]), 40)
  put('case', new THREE.CylinderGeometry(0.99, 1.11, 0.22, 40), at([0, 0.19, 0]))
  ring(1.03, 0.025, 'mesh', at([0, 0.27, 0], [Math.PI / 2, 0, 0]), 48)
  cyl(0.24, 0.26, 'edge', at([0, 0.42, 0], Y))
  cyl(0.13, 1.03, 'mesh', at([0, 1.025, 0], Y), 16)
  cyl(0.21, 0.22, 'case', at([0, 1.49, 0], Y))
  const fork = new THREE.CatmullRomCurve3(
    [[-0.88, 2.48], [-0.87, 1.78], [-0.66, 1.58], [0, 1.55], [0.66, 1.58], [0.87, 1.78], [0.88, 2.48]].map(([x, y]) => new THREE.Vector3(x, y, 0)),
  )
  put('case', new THREE.TubeGeometry(fork, 32, 0.092, 8, false), at([0, 0, 0]))
  for (const sign of [-1, 1]) {
    cyl(0.18, 0.18, 'edge', at([sign * 0.68, 2.5, 0], X))
    cyl(0.235, 0.1, 'case', at([sign * 0.91, 2.5, 0], X))
    ring(0.185, 0.025, 'mesh', at([sign * 0.965, 2.5, 0], [0, Math.PI / 2, 0]))
  }

  /* ---- La capsule, légèrement inclinée vers l'avant ---- */
  const mic = at([0, 2.5, 0], [-0.1, 0, 0])
  const inMic = (p: Vec3, r: Vec3 = [0, 0, 0], k: Vec3 = [1, 1, 1]) => mic.clone().multiply(at(p, r, k))
  cyl(0.56, 1.32, 'case', inMic([0, -0.24, 0]), 32)
  put('case', new THREE.SphereGeometry(0.56, 24, 12), inMic([0, -0.9, 0], [0, 0, 0], [1, 0.24, 1]))
  ring(0.554, 0.015, 'edge', inMic([0, -0.72, 0], [Math.PI / 2, 0, 0]))
  put('dark', new THREE.CapsuleGeometry(0.54, 0.67, 6, 20), inMic([0, 1.025, 0]))
  // la grille : des anneaux et des méridiens qui épousent la capsule
  const bottom = 0.39
  const top = 1.909
  const radius = (y: number, r0: number) => {
    const cap = Math.max(0, Math.abs(y - 1.025) - 0.335)
    return Math.sqrt(Math.max(0.0001, r0 * r0 - cap * cap))
  }
  for (let j = 0; j < 28; j++) {
    const y = bottom + ((top - bottom) * j) / 27
    ring(radius(y, 0.548), 0.0095, 'mesh', inMic([0, y, 0], [Math.PI / 2, 0, 0]), 32)
  }
  for (let i = 0; i < 36; i++) {
    const a = (i * Math.PI * 2) / 36
    const pts: THREE.Vector3[] = []
    for (let j = 0; j <= 16; j++) {
      const y = bottom + ((top - bottom) * j) / 16
      const r = radius(y, 0.549)
      pts.push(new THREE.Vector3(r * Math.cos(a), y, r * Math.sin(a)))
    }
    put('mesh', new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 16, 0.008, 3, false), inMic(Y))
  }
  ring(0.555, 0.045, 'case', inMic([0, 0.39, 0], [Math.PI / 2, 0, 0]))
  // façade : gain, muet, voyant
  cyl(0.155, 0.11, 'edge', inMic([0, -0.2, 0.573], Z))
  ring(0.149, 0.016, 'mesh', inMic([0, -0.2, 0.636]))
  put('white', new THREE.BoxGeometry(0.022, 0.062, 0.01), inMic([0, -0.115, 0.638]))
  cyl(0.075, 0.035, 'rubber', inMic([0, 0.16, 0.564], Z), 16)
  put('led', new THREE.SphereGeometry(0.028, 8, 6), inMic([0, -0.51, 0.555]))
  // dos : USB-C et prise casque
  const ext = (s: THREE.Shape, d: number, b: number) =>
    new THREE.ExtrudeGeometry(s, { depth: d, bevelEnabled: b > 0, bevelSize: b, bevelThickness: b, bevelSegments: 1, curveSegments: 4, steps: 1 })
  put('mesh', ext(roundedRect(0.27, 0.11, 0.052), 0.04, 0.008), inMic([0, -0.52, -0.572]))
  put('dark', ext(roundedRect(0.22, 0.07, 0.03), 0.012, 0.003), inMic([0, -0.52, -0.601]))
  ring(0.069, 0.016, 'mesh', inMic([0, -0.12, -0.57]))
  cyl(0.055, 0.02, 'dark', inMic([0, -0.12, -0.58], Z), 12)

  const place = new THREE.Matrix4().makeScale(MICRO_SCALE, MICRO_SCALE, MICRO_SCALE)
  const sheet = labelSheet([{ text: 'GAIN', size: [0.29, 0.08], where: inMic([0, -0.405, 0.574]) }])
  sheet.geometry.applyMatrix4(place)
  const geo = finish(place)
  sitOnFloor([...Object.values(geo), sheet.geometry])
  return { geo, labels: sheet.geometry, labelTex: sheet.texture }
}

export function Microphone() {
  const { geo, labels, labelTex } = useMemo(buildMicrophone, [])

  return (
    <group name="micro">
      <mesh geometry={geo.case} castShadow receiveShadow>
        <meshStandardMaterial color="#262d37" roughness={0.48} metalness={0.24} />
      </mesh>
      <mesh geometry={geo.edge}>
        <meshStandardMaterial color="#131a23" roughness={0.62} metalness={0.1} />
      </mesh>
      <mesh geometry={geo.rubber}>
        <meshStandardMaterial color="#141922" roughness={0.88} />
      </mesh>
      <mesh geometry={geo.mesh} castShadow>
        <meshStandardMaterial color="#697787" roughness={0.4} metalness={0.6} />
      </mesh>
      <mesh geometry={geo.dark}>
        <meshStandardMaterial color="#080d15" roughness={0.88} />
      </mesh>
      <mesh geometry={geo.white}>
        <meshStandardMaterial color="#d2d9df" roughness={0.45} metalness={0.13} />
      </mesh>
      <mesh geometry={geo.led}>
        <meshStandardMaterial color="#6edbce" emissive="#219d9d" emissiveIntensity={0.8} />
      </mesh>
      <LabelSheet geometry={labels} texture={labelTex} />
    </group>
  )
}

/* ================================================================ */
/*  La box internet                                                  */
/* ================================================================ */

/**
 * Box internet générique, sans marque : boîtier plat à couvercle blanc,
 * deux antennes Wi-Fi orientables, quatre voyants en façade (POWER,
 * INTERNET, Wi-Fi, LAN) et, au dos, la connectique repérée par couleur :
 * quatre prises LAN jaunes, la prise WAN bleue, la fibre verte, un port
 * USB et l'arrivée 12 V.
 *
 * EXCEPTION à la convention des périphériques : la box présente sa
 * CONNECTIQUE au spectateur (vers +Z), pas sa façade. C'est là que
 * l'élève branche le câble réseau — il part de la première prise LAN —
 * et, sur une box aussi profonde, un câble parti du dos traverserait le
 * boîtier pour rejoindre la fiche posée devant.
 *
 * Tracée en unités de dessin (5,7 de large), mise à l'échelle : 20 cm,
 * de quoi tenir sur le guéridon de l'atelier de branchement.
 * Les inscriptions sont réunies sur UNE seule texture dessinée à la
 * volée : une image, un objet à dessiner pour les douze étiquettes.
 */

/** Unités de dessin -> centimètres. */
const BOX_SCALE = 3.5

type BoxMat = 'white' | 'base' | 'black' | 'rubber' | 'silver' | 'gold' | 'paint' | 'light' | 'mark'

/** Inscriptions : en façade (tournées vers l'avant) ou au dos. */
function boxLabels(): Label[] {
  const front = (text: string, x: number): Label => ({
    text,
    color: '#aebbc7',
    size: [0.51, 0.096],
    where: at([x, 0.272, -1.959], [0, Math.PI, 0]),
  })
  // au dos, sur le bord du couvercle blanc : inscriptions foncées
  const back = (text: string, w: number, h: number, x: number): Label => ({
    text,
    color: '#4a5561',
    size: [w, h],
    where: at([x, 0.615, 1.992]),
  })
  return [
    ...['POWER', 'INTERNET', 'Wi-Fi', 'LAN'].map((t, i) => front(t, -1.2 + i * 0.72)),
    ...[0, 1, 2, 3].map((i) => back(String(i + 1), 0.18, 0.085, -1.68 + i * 0.51)),
    back('WAN', 0.38, 0.09, 0.45),
    back('FIBRE', 0.37, 0.088, 1),
    back('USB', 0.29, 0.086, 1.47),
    back('12 V', 0.27, 0.086, 1.94),
  ]
}

function buildInternetBox() {
  const { put, finish } = mergeBatch<BoxMat>(['white', 'base', 'black', 'rubber', 'silver', 'gold', 'paint', 'light', 'mark'])
  const YELLOW = 0xe2bc4c
  const BLUE = 0x368ac5
  const GREEN = 0x45a780

  /** Plaque arrondie couchée, épaisseur vers le haut. */
  const slab = (w: number, l: number, d: number, r: number, bevel: number, m: BoxMat, p: Vec3, curve = 8) =>
    put(
      m,
      new THREE.ExtrudeGeometry(roundedRect(w, l, r), {
        depth: d,
        bevelEnabled: bevel > 0,
        bevelSize: bevel,
        bevelThickness: bevel,
        bevelSegments: 3,
        steps: 1,
        curveSegments: curve,
      }),
      at(p, [-Math.PI / 2, 0, 0]),
    )
  const cube = (w: number, h: number, d: number, m: BoxMat, p: Vec3, color?: number) =>
    put(m, new THREE.BoxGeometry(w, h, d), at(p), color)

  /* ---- Le boîtier : châssis sombre, joint noir, couvercle blanc ---- */
  slab(5.65, 3.74, 0.37, 0.38, 0.08, 'base', [0, 0.16, 0])
  slab(5.68, 3.77, 0.025, 0.4, 0.07, 'black', [0, 0.51, 0])
  slab(5.55, 3.65, 0.11, 0.4, 0.15, 'white', [0, 0.64, 0])
  // patins caoutchouc et plaque signalétique, dessous
  for (const x of [-2.12, 2.12]) for (const z of [-1.3, 1.3]) slab(0.5, 0.42, 0.085, 0.17, 0.025, 'rubber', [x, 0.018, z], 4)
  slab(1.9, 1.01, 0.006, 0.07, 0, 'silver', [0, 0.073, 0], 4)

  /* ---- Les deux antennes Wi-Fi, au dos, légèrement écartées ---- */
  for (const sign of [-1, 1]) {
    const x = sign * 2.34
    put('black', new THREE.CylinderGeometry(0.17, 0.17, 0.35, 16), at([x, 0.56, 1.72], [Math.PI / 2, 0, 0]))
    const antenna = at([x, 0.61, 1.73], [0.11, 0, -sign * 0.13])
    put('base', new THREE.CylinderGeometry(0.115, 0.13, 0.36, 12), antenna.clone().multiply(at([0, 0.13, 0])))
    const blade = new THREE.ExtrudeGeometry(roundedRect(0.255, 2.53, 0.125), {
      depth: 0.125,
      bevelEnabled: true,
      bevelSegments: 3,
      bevelSize: 0.042,
      bevelThickness: 0.042,
      steps: 1,
      curveSegments: 8,
    })
    put('base', blade, antenna.clone().multiply(at([0, 1.56, -0.0625])))
    put('black', new THREE.BoxGeometry(0.11, 0.018, 0.008), antenna.clone().multiply(at([0, 2.63, -0.108])))
  }

  /* ---- Ouïes d'aération : sur le couvercle et sur les flancs ---- */
  for (const sign of [-1, 1]) {
    for (let i = 0; i < 13; i++) slab(0.035, 0.79, 0.004, 0.017, 0, 'mark', [sign * (1.21 + i * 0.085), 0.902, 0.35], 3)
    for (let i = 0; i < 11; i++) cube(0.005, 0.105, 0.033, 'black', [sign * 2.909, 0.35, -0.48 + i * 0.09])
  }

  /* ---- Le logo Wi-Fi sur le couvercle : trois arcs et un point ---- */
  for (const r of [0.22, 0.38, 0.54]) {
    const pts: THREE.Vector3[] = []
    for (let i = 0; i <= 16; i++) {
      const a = -0.78 + (1.56 * i) / 16
      pts.push(new THREE.Vector3(r * Math.sin(a), 0.912, -0.91 + r * Math.cos(a)))
    }
    put('mark', new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 20, 0.014, 5, false), at([0, 0, 0]))
  }
  put('mark', new THREE.SphereGeometry(0.039, 10, 6), at([0, 0.914, -0.92], [0, 0, 0], [1, 0.3, 1]))

  /* ---- Façade : quatre voyants et le bouton marche-arrêt ---- */
  for (let i = 0; i < 4; i++) {
    put('light', new THREE.SphereGeometry(0.034, 10, 6), at([-1.2 + i * 0.72, 0.41, -1.962], [0, 0, 0], [1, 1, 0.4]))
  }
  put('black', new THREE.CylinderGeometry(0.097, 0.097, 0.04, 20), at([2.24, 0.37, -1.948], [Math.PI / 2, 0, 0]))
  put('silver', new THREE.TorusGeometry(0.074, 0.009, 6, 20), at([2.24, 0.37, -1.974]))

  /* ---- Dos : quatre LAN jaunes, WAN bleue, fibre verte, USB, 12 V ---- */
  const ethernet = (x: number, color: number) => {
    cube(0.44, 0.34, 0.075, 'paint', [x, 0.355, 1.948], color)
    cube(0.346, 0.245, 0.012, 'black', [x, 0.352, 1.991])
    cube(0.12, 0.054, 0.014, 'black', [x, 0.21, 1.992])
    // les huit contacts dorés
    for (let i = 0; i < 8; i++) cube(0.021, 0.076, 0.016, 'gold', [x - 0.12 + i * 0.0343, 0.414, 2.002])
  }
  for (let i = 0; i < 4; i++) ethernet(-1.68 + i * 0.51, YELLOW)
  ethernet(0.45, BLUE)
  cube(0.275, 0.31, 0.07, 'paint', [1, 0.355, 1.948], GREEN)
  cube(0.18, 0.21, 0.012, 'black', [1, 0.36, 1.99])
  put('silver', new THREE.CylinderGeometry(0.05, 0.05, 0.02, 12), at([1, 0.35, 2.005], [Math.PI / 2, 0, 0]))
  cube(0.32, 0.17, 0.08, 'silver', [1.47, 0.35, 1.95])
  cube(0.272, 0.115, 0.014, 'black', [1.47, 0.35, 1.999])
  cube(0.2, 0.026, 0.017, 'paint', [1.47, 0.336, 2.009], BLUE)
  put('black', new THREE.CylinderGeometry(0.12, 0.12, 0.095, 20), at([1.94, 0.35, 1.96], [Math.PI / 2, 0, 0]))
  put('silver', new THREE.TorusGeometry(0.079, 0.013, 6, 20), at([1.94, 0.35, 2.015]))
  put('silver', new THREE.SphereGeometry(0.019, 8, 6), at([1.94, 0.35, 2.016]))
  // trou du bouton de réinitialisation
  put('black', new THREE.SphereGeometry(0.027, 8, 6), at([-2.12, 0.36, 1.956], [0, 0, 0], [1, 1, 0.3]))

  // À l'échelle et posée sur y = 0 (les patins descendent à -0,007).
  const place = new THREE.Matrix4()
    .makeTranslation(0, 0.007 * BOX_SCALE, 0)
    .multiply(new THREE.Matrix4().makeScale(BOX_SCALE, BOX_SCALE, BOX_SCALE))

  /* ---- Les inscriptions : un plan par étiquette, une seule texture ---- */
  const sheet = labelSheet(boxLabels())
  sheet.geometry.applyMatrix4(place)

  return { geo: finish(place), labels: sheet.geometry, labelTex: sheet.texture }
}

export function InternetBox() {
  const { geo, labels, labelTex } = useMemo(buildInternetBox, [])

  return (
    <group name="box">
      <mesh geometry={geo.white} castShadow receiveShadow>
        <meshStandardMaterial color="#c9cdd2" roughness={0.4} metalness={0.08} />
      </mesh>
      <mesh geometry={geo.base} castShadow receiveShadow>
        <meshStandardMaterial color="#262d35" roughness={0.59} />
      </mesh>
      <mesh geometry={geo.black}>
        <meshStandardMaterial color="#0b1016" roughness={0.68} />
      </mesh>
      <mesh geometry={geo.rubber}>
        <meshStandardMaterial color="#151a21" roughness={0.9} />
      </mesh>
      <mesh geometry={geo.silver}>
        <meshStandardMaterial color="#8e9ba9" roughness={0.3} metalness={0.8} />
      </mesh>
      <mesh geometry={geo.gold}>
        <meshStandardMaterial color="#c89a43" roughness={0.31} metalness={0.7} />
      </mesh>
      {/* cadres des prises : jaune, bleu ou vert selon le sommet */}
      <mesh geometry={geo.paint}>
        <meshStandardMaterial vertexColors roughness={0.46} />
      </mesh>
      <mesh geometry={geo.light}>
        <meshStandardMaterial color="#61dcc6" emissive="#32ba9e" emissiveIntensity={0.9} />
      </mesh>
      <mesh geometry={geo.mark}>
        <meshStandardMaterial color="#8e9fab" roughness={0.66} />
      </mesh>
      <LabelSheet geometry={labels} texture={labelTex} />
    </group>
  )
}

/* ================================================================ */
/*  La clé USB                                                       */
/* ================================================================ */

/**
 * Clé USB-A : coque moulée percée d'une attache pour un cordon, insert
 * sur le dessus, et le connecteur métallique OUVERT à l'avant — ses deux
 * lucarnes, la languette isolante et les quatre contacts dorés : c'est
 * LUI qui fait reconnaître une clé.
 *
 * Tracée en unités de dessin, connecteur vers +Z ; retournée pour que le
 * connecteur pointe vers -Z comme les autres fiches, et calée pour que
 * son bout soit en z = -1,7 (voir `USBKEY_PLUG_OFFSET`).
 */

/** Unités de dessin -> centimètres. */
const USBKEY_SCALE = 1.15

/** Hauteur du milieu du connecteur, une fois la clé posée. */
const USBKEY_CONNECTOR_Y = (0.325 - 0.022) * USBKEY_SCALE

/**
 * Position de la clé quand elle sert de fiche (atelier de branchement,
 * démontage) : le milieu du connecteur arrive à la hauteur de la prise.
 */
export const USBKEY_PLUG_OFFSET: Vec3 = [0, 0.07 - USBKEY_CONNECTOR_Y, 1.35]

type UsbKeyMat = 'shell' | 'inlay' | 'edge' | 'steel' | 'gold' | 'dark' | 'led'

function buildUsbKey() {
  const { put, finish } = mergeBatch<UsbKeyMat>(['shell', 'inlay', 'edge', 'steel', 'gold', 'dark', 'led'])
  const ext = (s: THREE.Shape, d: number, b: number) =>
    new THREE.ExtrudeGeometry(s, { depth: d, bevelEnabled: b > 0, bevelSize: b, bevelThickness: b, bevelSegments: 2, curveSegments: 6, steps: 1 })
  const flat = (g: THREE.BufferGeometry) => {
    g.rotateX(-Math.PI / 2)
    return g
  }
  const cube = (w: number, h: number, d: number, m: UsbKeyMat, p: Vec3) => put(m, new THREE.BoxGeometry(w, h, d), at(p))

  // la coque, avec son attache percée dans l'épaisseur
  const shell = roundedRect(1.48, 3.68, 0.3)
  const eye = new THREE.Path()
  eye.absellipse(0, 1.35, 0.225, 0.155, 0, Math.PI * 2, true)
  shell.holes.push(eye)
  put('shell', flat(ext(shell, 0.43, 0.065)), at([0, 0.105, -0.7]))
  put('inlay', flat(ext(roundedRect(1.2, 2.63, 0.23), 0.023, 0.028)), at([0, 0.573, -0.28]))
  put('edge', flat(ext(roundedRect(1.2, 2.46, 0.22), 0.015, 0.014)), at([0, 0.036, -0.32]))

  // le blindage métallique, ouvert à l'avant, et ses deux lucarnes
  const top = roundedRect(1.06, 1.32, 0.013)
  for (const x of [-0.255, 0.255]) {
    const p = new THREE.Path()
    p.moveTo(x - 0.111, -0.115)
    p.lineTo(x + 0.111, -0.115)
    p.lineTo(x + 0.111, 0.115)
    p.lineTo(x - 0.111, 0.115)
    p.closePath()
    top.holes.push(p)
  }
  put('steel', flat(ext(top, 0.028, 0)), at([0, 0.516, 1.75]))
  cube(1.09, 0.028, 1.32, 'steel', [0, 0.122, 1.75])
  for (const x of [-0.532, 0.532]) cube(0.027, 0.411, 1.32, 'steel', [x, 0.325, 1.75])
  const rim = roundedRect(1.09, 0.438, 0.018)
  const inside = new THREE.Path()
  inside.moveTo(-0.513, -0.191)
  inside.lineTo(0.513, -0.191)
  inside.lineTo(0.513, 0.191)
  inside.lineTo(-0.513, 0.191)
  inside.closePath()
  rim.holes.push(inside)
  put('steel', ext(rim, 0.018, 0.002), at([0, 0.325, 2.409]))

  // la languette isolante et les quatre contacts, visibles par l'ouverture
  cube(0.948, 0.129, 1.18, 'dark', [0, 0.255, 1.7])
  for (let i = 0; i < 4; i++) cube(0.107, 0.011, 0.615, 'gold', [(i - 1.5) * 0.225, 0.325, 1.977])
  cube(1.03, 0.41, 0.045, 'edge', [0, 0.325, 1.115])

  // joints de moulage et voyant
  for (const x of [-0.758, 0.758]) cube(0.009, 0.015, 2.59, 'dark', [x, 0.325, -0.51])
  put('led', new THREE.SphereGeometry(0.035, 10, 6), at([0, 0.635, 0.68], [0, 0, 0], [1, 0.38, 1]))

  // Connecteur vers -Z, à l'échelle, posée sur y = 0, bout du connecteur
  // en z = -1,7 (le bord de la prise est en z = 2,429 avant retournement).
  const place = new THREE.Matrix4()
    .makeTranslation(0, -0.022 * USBKEY_SCALE, -1.7 + 2.429 * USBKEY_SCALE)
    .multiply(new THREE.Matrix4().makeScale(USBKEY_SCALE, USBKEY_SCALE, USBKEY_SCALE))
    .multiply(new THREE.Matrix4().makeRotationY(Math.PI))
  // inscription foncée : claire, elle disparaîtrait sur l'insert
  const sheet = labelSheet([{ text: 'USB', color: '#1b2530', size: [0.74, 0.2], where: at([0, 0.636, -0.44], [-Math.PI / 2, 0, 0]) }])
  sheet.geometry.applyMatrix4(place)
  return { geo: finish(place), labels: sheet.geometry, labelTex: sheet.texture }
}

export function UsbKey() {
  const { geo, labels, labelTex } = useMemo(buildUsbKey, [])

  return (
    <group name="usbkey">
      <mesh geometry={geo.shell} castShadow receiveShadow>
        <meshStandardMaterial color="#273442" roughness={0.47} metalness={0.15} />
      </mesh>
      <mesh geometry={geo.inlay}>
        <meshStandardMaterial color="#435b6e" roughness={0.42} metalness={0.32} />
      </mesh>
      <mesh geometry={geo.edge}>
        <meshStandardMaterial color="#131a23" roughness={0.62} metalness={0.1} />
      </mesh>
      <mesh geometry={geo.steel} castShadow>
        <meshStandardMaterial color="#b9c3cd" roughness={0.28} metalness={0.82} />
      </mesh>
      <mesh geometry={geo.gold}>
        <meshStandardMaterial color="#c6a664" roughness={0.35} metalness={0.72} />
      </mesh>
      <mesh geometry={geo.dark}>
        <meshStandardMaterial color="#080d15" roughness={0.88} />
      </mesh>
      <mesh geometry={geo.led}>
        <meshStandardMaterial color="#6edbce" emissive="#219d9d" emissiveIntensity={0.8} />
      </mesh>
      <LabelSheet geometry={labels} texture={labelTex} />
    </group>
  )
}

/* ================================================================ */
/*  Le câble d'alimentation (prise murale)                           */
/* ================================================================ */

export function WallOutlet({ showcase = false }: { showcase?: boolean }) {
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
 * Le cordon secteur seul, pour le présentoir : fiche secteur CEE 7/7 (deux
 * broches rondes, contacts de terre latéraux, trou de la broche de terre
 * française) d'un côté, connecteur IEC C13 de l'autre, reliés par une
 * large boucle de câble.
 *
 * Tracé à plat, les deux fiches vers -Z ; ici redressé face à l'élève,
 * les fiches en haut. Il tient dans la même boîte englobante que la
 * prise murale, pour que le présentoir le cadre sans réglage particulier.
 */

/** Unités de dessin -> centimètres. */
const CORD_SCALE = 3.1

type CordMat = 'cable' | 'body' | 'face' | 'dark' | 'rubber' | 'metal' | 'brass'

function buildPowerCord() {
  const { put, finish } = mergeBatch<CordMat>(['cable', 'body', 'face', 'dark', 'rubber', 'metal', 'brass'])
  const ext = (s: THREE.Shape, d: number, b: number, curve = 8) =>
    new THREE.ExtrudeGeometry(s, { depth: d, bevelEnabled: b > 0, bevelSize: b, bevelThickness: b, bevelSegments: 2, curveSegments: curve, steps: 1 })

  // la boucle de câble : ses extrémités s'alignent sur les deux manchons
  const pts = [[-2.2, 0.5, -1], [-2.21, 0.35, -0.35], [-2.75, 0.14, 0.45], [-3.08, 0.14, 1.75], [-2.48, 0.14, 2.97], [-0.85, 0.14, 3.61], [1.08, 0.14, 3.5], [2.64, 0.14, 2.74], [3.05, 0.14, 1.35], [2.49, 0.24, -0.05], [2.2, 0.5, -1]]
  const curve = new THREE.CatmullRomCurve3(pts.map(([x, y, z]) => new THREE.Vector3(x, y, z)), false, 'centripetal')
  put('cable', new THREE.TubeGeometry(curve, 120, 0.085, 8, false), at([0, 0, 0]))

  // les deux extrémités, relevées et légèrement ouvertes
  const end = (x: number, angle: number) => at([x, 0.5, -1], [0.25, angle, 0], [1, 1, 1], 'YXZ')
  const mains = end(-2.2, 0.13)
  const iec = end(2.2, -0.13)
  const cyl = (r1: number, r2: number, len: number, m: CordMat, parent: THREE.Matrix4, p: Vec3, seg = 24) =>
    put(m, new THREE.CylinderGeometry(r1, r2, len, seg), parent.clone().multiply(at(p, [Math.PI / 2, 0, 0])))
  const ring = (r: number, t: number, m: CordMat, parent: THREE.Matrix4, p: Vec3) =>
    put(m, new THREE.TorusGeometry(r, t, 6, 24), parent.clone().multiply(at(p)))
  const cube = (w: number, h: number, d: number, m: CordMat, parent: THREE.Matrix4, p: Vec3) =>
    put(m, new THREE.BoxGeometry(w, h, d), parent.clone().multiply(at(p)))

  // manchons souples anti-pliure
  for (const e of [mains, iec]) {
    cyl(0.095, 0.185, 0.5, 'rubber', e, [0, 0, -0.235], 16)
    for (let i = 0; i < 6; i++) ring(0.11 + i * 0.012, 0.026, 'body', e, [0, 0, -0.04 - i * 0.075])
  }

  /* ---- La fiche secteur : corps moulé, collerette, face percée, broches ---- */
  cyl(0.34, 0.51, 0.9, 'body', mains, [0, 0, -0.92])
  ring(0.394, 0.014, 'dark', mains, [0, 0, -0.79])
  cyl(0.515, 0.515, 0.1, 'rubber', mains, [0, 0, -1.39])
  const face = new THREE.Shape()
  face.absarc(0, 0, 0.503, 0, Math.PI * 2, false)
  const earth = new THREE.Path()
  earth.absarc(0, 0.285, 0.095, 0, Math.PI * 2, true)
  face.holes.push(earth)
  const fg = ext(face, 0.025, 0, 20)
  fg.rotateY(Math.PI)
  put('face', fg, mains.clone().multiply(at([0, 0, -1.451])))
  cyl(0.092, 0.092, 0.008, 'dark', mains, [0, 0.285, -1.447], 12)
  ring(0.076, 0.012, 'brass', mains, [0, 0.285, -1.462])
  for (const x of [-0.268, 0.268]) {
    cyl(0.071, 0.071, 0.52, 'metal', mains, [x, -0.042, -1.72], 12)
    put('metal', new THREE.SphereGeometry(0.071, 12, 8), mains.clone().multiply(at([x, -0.042, -1.98])))
  }
  for (const sign of [-1, 1]) cube(0.15, 0.035, 0.37, 'metal', mains, [0, sign * 0.505, -1.26])
  for (let i = 0; i < 7; i++) for (const sign of [-1, 1]) cyl(0.014, 0.014, 0.27, 'rubber', mains, [sign * 0.407, (i - 3) * 0.05, -0.86], 6)

  /* ---- Le connecteur C13 : corps de préhension, nez femelle à trois
          logements, contacts en retrait ---- */
  put('body', ext(roundedRect(0.99, 0.68, 0.17), 0.68, 0.04), iec.clone().multiply(at([0, 0, -1.12])))
  const nose = new THREE.Shape()
  nose.moveTo(-0.46, -0.29)
  nose.lineTo(0.46, -0.29)
  nose.lineTo(0.46, 0.1)
  nose.lineTo(0.28, 0.3)
  nose.lineTo(-0.28, 0.3)
  nose.lineTo(-0.46, 0.1)
  nose.closePath()
  const slots: [number, number][] = [[-0.25, -0.074], [0.25, -0.074], [0, 0.145]]
  for (const [x, y] of slots) {
    const h = new THREE.Path()
    h.moveTo(x - 0.052, y - 0.096)
    h.lineTo(x + 0.052, y - 0.096)
    h.lineTo(x + 0.052, y + 0.096)
    h.lineTo(x - 0.052, y + 0.096)
    h.closePath()
    nose.holes.push(h)
  }
  put('face', ext(nose, 0.38, 0.007), iec.clone().multiply(at([0, 0, -1.51])))
  for (const [x, y] of slots) {
    cube(0.101, 0.188, 0.009, 'dark', iec, [x, y, -1.36])
    for (const side of [-1, 1]) cube(0.012, 0.12, 0.04, 'brass', iec, [x + side * 0.037, y, -1.393])
  }
  for (let i = 0; i < 7; i++) {
    cube(0.67, 0.018, 0.018, 'rubber', iec, [0, 0.378, -0.54 - i * 0.065])
    for (const sign of [-1, 1]) cube(0.018, 0.35, 0.018, 'rubber', iec, [sign * 0.537, 0, -0.54 - i * 0.065])
  }

  // Redressé face à l'élève, fiches en haut, puis centré dans la boîte de
  // la prise murale (20 x 23 x 5, centre à 11 cm de haut).
  const place = new THREE.Matrix4()
    .makeScale(CORD_SCALE, CORD_SCALE, CORD_SCALE)
    .multiply(new THREE.Matrix4().makeRotationX(Math.PI / 2))
  const sheet = labelSheet([{ text: 'C13', color: '#89939e', size: [0.52, 0.13], where: iec.clone().multiply(at([0, 0.389, -0.84], [-Math.PI / 2, 0, 0])) }])
  sheet.geometry.applyMatrix4(place)
  const geo = finish(place)
  const all = [...Object.values(geo), sheet.geometry]
  const box = new THREE.Box3()
  for (const g of all) {
    g.computeBoundingBox()
    box.union(g.boundingBox!)
  }
  const c = box.getCenter(new THREE.Vector3())
  for (const g of all) g.translate(-c.x, 11 - c.y, -c.z)
  return { geo, labels: sheet.geometry, labelTex: sheet.texture }
}

export function PowerCord() {
  const { geo, labels, labelTex } = useMemo(buildPowerCord, [])

  return (
    <group name="power">
      <mesh geometry={geo.cable} castShadow>
        <meshStandardMaterial color="#20262e" roughness={0.51} metalness={0.05} />
      </mesh>
      <mesh geometry={geo.body} castShadow>
        <meshStandardMaterial color="#272d35" roughness={0.55} />
      </mesh>
      <mesh geometry={geo.face}>
        <meshStandardMaterial color="#353d47" roughness={0.62} />
      </mesh>
      <mesh geometry={geo.dark}>
        <meshStandardMaterial color="#080c12" roughness={0.96} />
      </mesh>
      <mesh geometry={geo.rubber}>
        <meshStandardMaterial color="#171d24" roughness={0.76} />
      </mesh>
      <mesh geometry={geo.metal}>
        <meshStandardMaterial color="#b4bac2" roughness={0.24} metalness={0.9} />
      </mesh>
      <mesh geometry={geo.brass}>
        <meshStandardMaterial color="#9c8963" roughness={0.4} metalness={0.7} />
      </mesh>
      <LabelSheet geometry={labels} texture={labelTex} />
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
    size: [52.4, 38.3, 13.2],
    offset: [0, 19.15, 0],
    // la prise HDMI, au dos, en bas à gauche de la dalle
    cableExit: [-17.9, 12.6, -2.8],
    plug: 'hdmi',
    cable: 26,
    display: [0, -0.42, 0],
  },
  keyboard: {
    size: [30.8, 1.5, 10.3],
    offset: [0, 0.75, 0],
    // la prise du câble, au milieu de la tranche arrière
    cableExit: [0, 1.0, -5.3],
    plug: 'usb-a',
    cable: 20,
    display: [-0.5, 0, 0],
  },
  mouse: {
    size: [6.6, 3.9, 12.4],
    offset: [0, 1.9, 0],
    // au bout du nez, à ras de la semelle
    cableExit: [0, 0.6, 6.1],
    plug: 'usb-a',
    cable: 18,
    // légèrement basculée vers l'avant : on voit le dessus, les boutons
    // et la molette — ce qui fait reconnaître une souris
    display: [0.4, 0, 0],
  },
  gamepad: {
    size: [17, 4.4, 10.2],
    offset: [0, 2.1, 0.7],
    // la prise USB, au milieu de la tranche du haut
    cableExit: [0, 1.7, -3.9],
    plug: 'usb-a',
    cable: 18,
    // relevée vers l'élève : une manette si plate, vue de niveau, ne
    // montrerait que sa tranche
    display: [0.55, 0, 0],
  },
  speaker: {
    // la PAIRE d'enceintes
    size: [22.9, 17.7, 8.8],
    offset: [0, 8.85, 0.17],
    // la prise audio intérieure, au dos de l'enceinte droite
    cableExit: [5.9, 3.25, -4.4],
    plug: 'jack',
    cable: 20,
    display: [0, 0.5, 0],
  },
  micro: {
    size: [10, 19.8, 10],
    offset: [0, 9.9, 0],
    // le câble part de l'arrière du socle
    cableExit: [0, 1.0, -4.8],
    plug: 'jack',
    cable: 20,
    display: [0, 0.3, 0],
  },
  box: {
    size: [20.5, 12.1, 14.4],
    offset: [0, 6.0, 0.3],
    // la première prise LAN jaune, tournée vers l'élève
    cableExit: [-5.9, 1.27, 7.3],
    plug: 'rj45',
    cable: 22,
    display: [0, 0.6, 0],
  },
  usbkey: {
    // la fiche fait partie de l'objet : pas de câble
    size: [1.9, 0.7, 5.8],
    offset: [0, 0.35, 1.2],
    cableExit: [0, 0.35, -1.7],
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
