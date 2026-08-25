/**
 * Textures générées à la volée dans un <canvas>.
 * Aucun fichier externe : le jeu fonctionne hors-ligne et tient dans un seul HTML.
 */

import * as THREE from 'three'

/* --------------------------------------------------------------- */
/*  Générateur pseudo-aléatoire déterministe (même rendu à chaque   */
/*  lancement, sinon la carte mère change de dessin à chaque F5)    */
/* --------------------------------------------------------------- */

function mulberry32(seed: number) {
  let a = seed >>> 0
  return function () {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function makeCanvas(w: number, h: number) {
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  const ctx = c.getContext('2d')!
  return { c, ctx }
}

function toTexture(canvas: HTMLCanvasElement, srgb: boolean, aniso = 8) {
  const t = new THREE.CanvasTexture(canvas)
  t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace
  t.anisotropy = aniso
  t.wrapS = t.wrapT = THREE.RepeatWrapping
  t.needsUpdate = true
  return t
}

const cache = new Map<string, THREE.Texture>()
function cached(key: string, build: () => THREE.Texture) {
  let t = cache.get(key)
  if (!t) {
    t = build()
    cache.set(key, t)
  }
  return t
}

/* --------------------------------------------------------------- */
/*  Circuit imprimé (PCB)                                           */
/* --------------------------------------------------------------- */

interface PcbOptions {
  base: string
  trace: string
  silk: string
  density: number
  labels?: string[]
  size?: number
}

function drawPcb(ctx: CanvasRenderingContext2D, w: number, h: number, o: PcbOptions, seed: number) {
  const rnd = mulberry32(seed)

  // Fond : vernis épargne, légèrement irrégulier
  ctx.fillStyle = o.base
  ctx.fillRect(0, 0, w, h)
  for (let i = 0; i < 220; i++) {
    const r = 30 + rnd() * 130
    ctx.globalAlpha = 0.015 + rnd() * 0.03
    ctx.fillStyle = rnd() > 0.5 ? '#ffffff' : '#000000'
    ctx.beginPath()
    ctx.arc(rnd() * w, rnd() * h, r, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.globalAlpha = 1

  // Pistes de cuivre : trajets en escalier à 45°, comme sur une vraie carte
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  for (let i = 0; i < o.density; i++) {
    const long = rnd() > 0.75
    ctx.strokeStyle = o.trace
    ctx.globalAlpha = long ? 0.5 : 0.28 + rnd() * 0.22
    ctx.lineWidth = long ? 2.2 + rnd() * 2 : 1 + rnd() * 1.4

    let x = rnd() * w
    let y = rnd() * h
    ctx.beginPath()
    ctx.moveTo(x, y)
    const segs = 3 + Math.floor(rnd() * 7)
    for (let s = 0; s < segs; s++) {
      const len = 20 + rnd() * (long ? 220 : 90)
      const dir = Math.floor(rnd() * 8) * (Math.PI / 4)
      x += Math.cos(dir) * len
      y += Math.sin(dir) * len
      ctx.lineTo(x, y)
    }
    ctx.stroke()

    // Bus parallèles (mémoire, PCIe) : plusieurs pistes côte à côte
    if (long && rnd() > 0.45) {
      for (let k = 1; k <= 3 + Math.floor(rnd() * 4); k++) {
        ctx.globalAlpha = 0.34
        ctx.translate(0, k * (2.6 + rnd() * 1.4))
        ctx.stroke()
        ctx.setTransform(1, 0, 0, 1, 0, 0)
      }
    }
  }
  ctx.globalAlpha = 1

  // Vias : les petits trous métallisés
  for (let i = 0; i < 900; i++) {
    const x = rnd() * w
    const y = rnd() * h
    const r = 1.4 + rnd() * 1.6
    ctx.fillStyle = '#c9a227'
    ctx.globalAlpha = 0.55
    ctx.beginPath()
    ctx.arc(x, y, r, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#181818'
    ctx.globalAlpha = 0.8
    ctx.beginPath()
    ctx.arc(x, y, r * 0.42, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.globalAlpha = 1

  // Sérigraphie : contours blancs et références de composants
  ctx.strokeStyle = o.silk
  ctx.fillStyle = o.silk
  for (let i = 0; i < 46; i++) {
    ctx.globalAlpha = 0.35 + rnd() * 0.3
    ctx.lineWidth = 1.6
    const x = rnd() * w
    const y = rnd() * h
    const bw = 16 + rnd() * 90
    const bh = 12 + rnd() * 54
    ctx.strokeRect(x, y, bw, bh)
  }
  const labels = o.labels ?? []
  ctx.globalAlpha = 0.75
  for (let i = 0; i < 70; i++) {
    const px = 11 + Math.floor(rnd() * 9)
    ctx.font = `${px}px "Courier New", monospace`
    const txt =
      labels.length && rnd() > 0.45
        ? labels[Math.floor(rnd() * labels.length)]
        : `${'RCUJQD'[Math.floor(rnd() * 6)]}${Math.floor(rnd() * 90) + 10}`
    ctx.fillText(txt, rnd() * (w - 90), 14 + rnd() * (h - 20))
  }
  ctx.globalAlpha = 1
}

export function pcbTexture(
  seed = 7,
  opts: Partial<PcbOptions> = {},
): { map: THREE.Texture; rough: THREE.Texture } {
  const key = `pcb-${seed}-${JSON.stringify(opts)}`
  const map = cached(key, () => {
    const size = opts.size ?? 1024
    const { c, ctx } = makeCanvas(size, size)
    drawPcb(
      ctx,
      size,
      size,
      {
        base: opts.base ?? '#123021',
        trace: opts.trace ?? '#2f6b45',
        silk: opts.silk ?? '#e8f0e6',
        density: opts.density ?? 240,
        labels: opts.labels ?? ['CPU_FAN', 'DDR4', 'SATA', 'PCIE', 'JFP1', 'ATX', 'USB3', 'M2_1'],
      },
      seed,
    )
    return toTexture(c, true)
  })
  const rough = cached(`${key}-r`, () => {
    const size = 512
    const { c, ctx } = makeCanvas(size, size)
    const rnd = mulberry32(seed + 99)
    ctx.fillStyle = '#8a8a8a'
    ctx.fillRect(0, 0, size, size)
    for (let i = 0; i < 3000; i++) {
      ctx.globalAlpha = 0.05 + rnd() * 0.15
      ctx.fillStyle = rnd() > 0.5 ? '#ffffff' : '#404040'
      ctx.beginPath()
      ctx.arc(rnd() * size, rnd() * size, 1 + rnd() * 8, 0, Math.PI * 2)
      ctx.fill()
    }
    return toTexture(c, false)
  })
  return { map, rough }
}

/* --------------------------------------------------------------- */
/*  Tôle brossée / peinte du boîtier                                */
/* --------------------------------------------------------------- */

export function brushedTexture(seed = 3): THREE.Texture {
  return cached(`brushed-${seed}`, () => {
    const w = 512
    const h = 512
    const { c, ctx } = makeCanvas(w, h)
    const rnd = mulberry32(seed)
    ctx.fillStyle = '#7d7d7d'
    ctx.fillRect(0, 0, w, h)
    for (let i = 0; i < 5200; i++) {
      const y = rnd() * h
      const len = 30 + rnd() * 260
      ctx.globalAlpha = 0.04 + rnd() * 0.1
      ctx.strokeStyle = rnd() > 0.5 ? '#ffffff' : '#3a3a3a'
      ctx.lineWidth = 0.6 + rnd() * 1.3
      ctx.beginPath()
      ctx.moveTo(rnd() * w, y)
      ctx.lineTo(rnd() * w + len, y + (rnd() - 0.5) * 1.5)
      ctx.stroke()
    }
    ctx.globalAlpha = 1
    return toTexture(c, false)
  })
}

/** Grain fin pour les plastiques texturés (boîtier, cadres de ventilateurs). */
export function grainTexture(seed = 11): THREE.Texture {
  return cached(`grain-${seed}`, () => {
    const size = 512
    const { c, ctx } = makeCanvas(size, size)
    const rnd = mulberry32(seed)
    ctx.fillStyle = '#808080'
    ctx.fillRect(0, 0, size, size)
    const img = ctx.getImageData(0, 0, size, size)
    for (let i = 0; i < img.data.length; i += 4) {
      const n = 128 + (rnd() - 0.5) * 90
      img.data[i] = img.data[i + 1] = img.data[i + 2] = n
    }
    ctx.putImageData(img, 0, 0)
    return toTexture(c, false, 4)
  })
}

/* --------------------------------------------------------------- */
/*  Étiquettes collées (alim, disque dur, RAM, carte graphique)      */
/* --------------------------------------------------------------- */

export interface LabelSpec {
  w: number
  h: number
  bg: string
  fg: string
  title: string
  subtitle?: string
  lines?: string[]
  accent?: string
  barcode?: boolean
}

export function labelTexture(spec: LabelSpec, key: string): THREE.Texture {
  return cached(`label-${key}`, () => {
    const { c, ctx } = makeCanvas(spec.w, spec.h)
    ctx.fillStyle = spec.bg
    ctx.fillRect(0, 0, spec.w, spec.h)

    if (spec.accent) {
      ctx.fillStyle = spec.accent
      ctx.fillRect(0, 0, spec.w, spec.h * 0.16)
    }

    ctx.fillStyle = spec.fg
    ctx.textBaseline = 'top'
    ctx.font = `bold ${Math.round(spec.h * 0.15)}px Arial, sans-serif`
    ctx.fillText(spec.title, spec.w * 0.05, spec.h * 0.22)

    if (spec.subtitle) {
      ctx.font = `${Math.round(spec.h * 0.1)}px Arial, sans-serif`
      ctx.globalAlpha = 0.85
      ctx.fillText(spec.subtitle, spec.w * 0.05, spec.h * 0.42)
      ctx.globalAlpha = 1
    }

    ctx.font = `${Math.round(spec.h * 0.075)}px Arial, sans-serif`
    ctx.globalAlpha = 0.7
    ;(spec.lines ?? []).forEach((l, i) => {
      ctx.fillText(l, spec.w * 0.05, spec.h * (0.58 + i * 0.1))
    })
    ctx.globalAlpha = 1

    if (spec.barcode) {
      let x = spec.w * 0.62
      const y = spec.h * 0.56
      const rnd = mulberry32(spec.title.length * 31 + 5)
      while (x < spec.w * 0.95) {
        const bw = 1 + Math.floor(rnd() * 4)
        ctx.fillStyle = rnd() > 0.35 ? spec.fg : spec.bg
        ctx.fillRect(x, y, bw, spec.h * 0.3)
        x += bw + 1
      }
    }
    return toTexture(c, true)
  })
}

/* --------------------------------------------------------------- */
/*  Écran allumé (bureau simplifié) pour le périphérique « écran »   */
/* --------------------------------------------------------------- */

export function screenTexture(): THREE.Texture {
  return cached('screen', () => {
    const w = 1024
    const h = 600
    const { c, ctx } = makeCanvas(w, h)
    const g = ctx.createLinearGradient(0, 0, w, h)
    g.addColorStop(0, '#0f2d4a')
    g.addColorStop(0.55, '#1b5a86')
    g.addColorStop(1, '#0b1c2e')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, w, h)

    // Barre des tâches
    ctx.fillStyle = 'rgba(10,15,25,0.85)'
    ctx.fillRect(0, h - 46, w, 46)
    for (let i = 0; i < 6; i++) {
      ctx.fillStyle = ['#4da3ff', '#67d17a', '#ffb84d', '#ff7a7a', '#b58cff', '#4dd0e1'][i]
      ctx.fillRect(24 + i * 52, h - 36, 28, 26)
    }

    // Fenêtre
    ctx.fillStyle = 'rgba(240,244,250,0.95)'
    ctx.fillRect(150, 90, 560, 380)
    ctx.fillStyle = '#2b6cb0'
    ctx.fillRect(150, 90, 560, 34)
    ctx.fillStyle = '#cbd5e0'
    for (let i = 0; i < 9; i++) ctx.fillRect(178, 150 + i * 32, 380 - (i % 3) * 60, 12)

    ctx.fillStyle = '#e6edf7'
    ctx.font = 'bold 40px Arial, sans-serif'
    ctx.fillText('Le PC', 790, 120)
    ctx.font = '24px Arial, sans-serif'
    ctx.fillText('image reçue !', 790, 172)
    return toTexture(c, true)
  })
}

/** Efface le cache (utile en développement au rechargement à chaud). */
export function disposeTextures() {
  cache.forEach((t) => t.dispose())
  cache.clear()
}
