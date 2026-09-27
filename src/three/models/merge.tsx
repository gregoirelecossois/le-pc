/**
 * Outils des modèles détaillés (souris, manette, écran, alimentation...).
 *
 * Ces modèles comptent des dizaines, voire des centaines de petites
 * pièces : touches, stries, vis, trous de grille, traits de symboles...
 * Dessinées une à une, elles feraient ramer les postes sans carte
 * graphique. On les construit donc toutes une fois, puis on FUSIONNE
 * celles qui partagent une matière : un seul objet à dessiner par matière.
 * Les inscriptions, elles, sont toutes dessinées sur UNE image.
 */

import { useEffect } from 'react'
import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import type { Vec3 } from '../layout'

export function mergeBatch<K extends string>(keys: readonly K[]) {
  const parts = Object.fromEntries(keys.map((k) => [k, []])) as unknown as Record<K, THREE.BufferGeometry[]>
  const tint = new THREE.Color()

  /** Range une pièce dans le lot de sa matière, déjà placée. */
  const put = (m: K, g: THREE.BufferGeometry, where: THREE.Matrix4, color?: number) => {
    const geo = g.index ? g.toNonIndexed() : g
    if (geo !== g) g.dispose()
    geo.deleteAttribute('uv')
    geo.applyMatrix4(where)
    if (color !== undefined) {
      tint.set(color)
      const n = geo.attributes.position.count
      const c = new Float32Array(n * 3)
      for (let i = 0; i < n; i++) tint.toArray(c, i * 3)
      geo.setAttribute('color', new THREE.BufferAttribute(c, 3))
    }
    parts[m].push(geo)
  }

  /** Fusionne chaque lot et lui applique la mise en place finale. */
  const finish = (place: THREE.Matrix4) => {
    const out = {} as Record<K, THREE.BufferGeometry>
    for (const m of keys) {
      const merged = mergeGeometries(parts[m])
      parts[m].forEach((g) => g.dispose())
      merged.applyMatrix4(place)
      out[m] = merged
    }
    return out
  }

  return { put, finish }
}

/** Position + rotation + échelle, en une matrice. */
export function at(p: Vec3, r: Vec3 = [0, 0, 0], k: Vec3 = [1, 1, 1], order: THREE.EulerOrder = 'XYZ') {
  return new THREE.Matrix4().compose(
    new THREE.Vector3(...p),
    new THREE.Quaternion().setFromEuler(new THREE.Euler(...r, order)),
    new THREE.Vector3(...k),
  )
}

export function roundedRect(w: number, h: number, r: number) {
  const s = new THREE.Shape()
  const x = -w / 2
  const y = -h / 2
  s.moveTo(x + r, y)
  s.lineTo(x + w - r, y)
  s.quadraticCurveTo(x + w, y, x + w, y + r)
  s.lineTo(x + w, y + h - r)
  s.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
  s.lineTo(x + r, y + h)
  s.quadraticCurveTo(x, y + h, x, y + h - r)
  s.lineTo(x, y + r)
  s.quadraticCurveTo(x, y, x + r, y)
  return s
}

/** Pose un modèle sur y = 0 : toutes ses géométries descendent du même écart. */
export function sitOnFloor(geos: THREE.BufferGeometry[]) {
  let min = Infinity
  for (const g of geos) {
    g.computeBoundingBox()
    min = Math.min(min, g.boundingBox!.min.y)
  }
  for (const g of geos) g.translate(0, -min, 0)
}

/** Une inscription : un plan de `size` posé par `where`. */
export interface Label {
  size: [number, number]
  where: THREE.Matrix4
  /** Texte simple, centré dans sa case */
  text?: string
  color?: string
  font?: string
  /** Dessin sur mesure (touches à plusieurs caractères...) */
  draw?: (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) => void
}

/**
 * Toutes les inscriptions d'un modèle sur une seule texture, et un seul
 * objet pour les porter. Renvoie la géométrie (à placer comme le reste
 * du modèle) et la texture, à libérer au démontage.
 */
export function labelSheet(labels: Label[], cell: [number, number] = [512, 96]) {
  const [cw, ch] = cell
  const cols = Math.max(1, Math.min(labels.length, Math.floor(4096 / cw)))
  const rows = Math.ceil(labels.length / cols)
  const canvas = document.createElement('canvas')
  canvas.width = cw * cols
  canvas.height = ch * rows
  const ctx = canvas.getContext('2d')!
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'

  const planes = labels.map((l, i) => {
    const c = i % cols
    const r = Math.floor(i / cols)
    const x = c * cw
    const y = r * ch
    if (l.draw) l.draw(ctx, x, y, cw, ch)
    else if (l.text) {
      ctx.fillStyle = l.color ?? '#d6dce3'
      ctx.font = l.font ?? `500 ${Math.round(ch * 0.46)}px Arial`
      ctx.fillText(l.text, x + cw / 2, y + ch * 0.52, cw * 0.94)
    }
    const g = new THREE.PlaneGeometry(l.size[0], l.size[1])
    const uv = g.attributes.uv as THREE.BufferAttribute
    const u0 = c / cols
    const v1 = 1 - r / rows
    for (let k = 0; k < uv.count; k++) {
      uv.setXY(k, u0 + uv.getX(k) / cols, v1 - (1 - uv.getY(k)) / rows)
    }
    g.applyMatrix4(l.where)
    return g
  })

  const geometry = mergeGeometries(planes)
  planes.forEach((g) => g.dispose())
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.anisotropy = 4
  return { geometry, texture }
}

/** Les inscriptions d'un modèle, portées par un seul objet. */
export function LabelSheet({ geometry, texture }: { geometry: THREE.BufferGeometry; texture: THREE.Texture }) {
  // la texture n'est pas libérée avec le matériau
  useEffect(() => () => texture.dispose(), [texture])
  return (
    <mesh geometry={geometry} raycast={() => null}>
      <meshBasicMaterial map={texture} transparent depthWrite={false} />
    </mesh>
  )
}
