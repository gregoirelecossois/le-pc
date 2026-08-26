/**
 * Outil de développement uniquement (retiré du build de production).
 *
 *   window.__shot(nom)  -> capture la scène 3D
 *   window.__ui(nom)    -> capture 3D + interface, composées
 *
 * L'image est envoyée au serveur de dev qui l'écrit sur disque : cela permet
 * de vérifier le rendu sans avoir de fenêtre de navigateur affichée.
 */

import { useThree } from '@react-three/fiber'
import { useEffect } from 'react'

declare global {
  interface Window {
    __shot?: (name?: string, frames?: number) => Promise<string>
    __ui?: (name?: string, frames?: number) => Promise<string>
    __r3f?: unknown
    __mini?: unknown
  }
}

interface R3FLike {
  gl: { domElement: HTMLCanvasElement; render: (a: unknown, b: unknown) => void }
  scene: unknown
  camera: unknown
  advance: (t: number, run?: boolean) => void
  setFrameloop: (m: 'always' | 'demand' | 'never') => void
}

async function post(name: string, dataUrl: string) {
  const res = await fetch(`/__shot?name=${encodeURIComponent(name)}`, { method: 'POST', body: dataUrl })
  return res.text()
}

function renderScene(s: R3FLike, frames: number) {
  s.setFrameloop('never')
  const t0 = performance.now() / 1000
  for (let i = 0; i < frames; i++) s.advance(t0 + i * 0.016, true)
  s.gl.render(s.scene, s.camera)
}

/** Récupère toutes les règles CSS de la page sous forme de texte. */
function collectCss() {
  let css = ''
  for (const sheet of Array.from(document.styleSheets)) {
    try {
      for (const rule of Array.from(sheet.cssRules)) css += rule.cssText + '\n'
    } catch {
      /* feuille externe : ignorée */
    }
  }
  // Dans un <foreignObject>, le sélecteur :root ne correspond à rien :
  // sans cela toutes les variables CSS seraient perdues.
  return css.replace(/:root/g, '.rast-root')
}

/** Valeurs résolues des variables CSS, à recopier sur la racine du clone. */
function rootVars() {
  const cs = getComputedStyle(document.documentElement)
  const names: string[] = []
  for (const sheet of Array.from(document.styleSheets)) {
    try {
      for (const rule of Array.from(sheet.cssRules)) {
        const r = rule as CSSStyleRule
        if (!r.selectorText || !r.selectorText.includes(':root')) continue
        for (const prop of Array.from(r.style)) if (prop.startsWith('--')) names.push(prop)
      }
    } catch {
      /* ignorée */
    }
  }
  return [...new Set(names)].map((n) => n + ':' + cs.getPropertyValue(n)).join(';')
}

/**
 * `secondary` : pour un canvas annexe (la vignette des corrections).
 * Il se publie sur `window.__mini` et n'installe pas les fonctions de
 * capture, qui restent celles de la scène principale.
 */
export function DevCapture({ secondary = false }: { secondary?: boolean } = {}) {
  const store = useThree((s) => s)

  useEffect(() => {
    if (!import.meta.env.DEV) return
    if (secondary) {
      window.__mini = store
      return () => {
        if (window.__mini === store) window.__mini = undefined
      }
    }
    window.__r3f = store
    const s = store as unknown as R3FLike

    window.__shot = async (name = 'shot', frames = 40) => {
      renderScene(s, frames)
      return post(name, s.gl.domElement.toDataURL('image/png'))
    }

    window.__ui = async (name = 'ui', frames = 40) => {
      renderScene(s, frames)
      const w = window.innerWidth
      const h = window.innerHeight

      const root = document.getElementById('root')!
      const clone = root.cloneNode(true) as HTMLElement
      clone.querySelectorAll('canvas').forEach((c) => c.remove())
      // les valeurs de <input> ne sont pas sérialisées : on les fige
      const src = root.querySelectorAll('input')
      clone.querySelectorAll('input').forEach((el, i) => {
        const o = src[i] as HTMLInputElement | undefined
        if (o) el.setAttribute('value', o.value)
      })

      const xml = new XMLSerializer().serializeToString(clone)
      const svg =
        `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">` +
        `<foreignObject width="100%" height="100%">` +
        `<div xmlns="http://www.w3.org/1999/xhtml" class="rast-root" style="width:${w}px;height:${h}px;${rootVars()}">` +
        `<style>${collectCss()}` +
        // une image SVG ne joue pas les animations : sans cela tout ce qui
        // utilise .fade-up / .pop-in resterait à opacity 0
        `*{backdrop-filter:none !important;animation:none !important;transition:none !important}` +
        `</style>${xml}</div></foreignObject></svg>`

      const img = new Image()
      img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg)
      try {
        await img.decode()
      } catch (e) {
        return 'ERREUR rasterisation : ' + String(e)
      }

      const out = document.createElement('canvas')
      out.width = w
      out.height = h
      const ctx = out.getContext('2d')!
      ctx.fillStyle = '#0a0c11'
      ctx.fillRect(0, 0, w, h)
      ctx.drawImage(s.gl.domElement, 0, 0, w, h)
      ctx.drawImage(img, 0, 0)
      return post(name, out.toDataURL('image/png'))
    }
  }, [store, secondary])

  return null
}
