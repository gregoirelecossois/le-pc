/**
 * Écran de chargement du lancement.
 *
 * Il ne se contente pas d'attendre : pendant qu'il est affiché, il fait
 * défiler une fois chaque modèle 3D dans le canvas de correction (déjà
 * monté par l'application, mais caché sous cet écran). Les shaders et les
 * textures sont ainsi compilés d'avance — ensuite, une fenêtre de
 * correction s'ouvre instantanément, sans « saut » ni temps de chargement.
 */

import { useEffect, useState, type ReactNode } from 'react'
import { INSTALLABLE_IDS } from '@/data/components'
import { PERIPHERAL_MODELS, type PeripheralModelId } from '@/three/models/PeripheralParts'
import type { PartId } from '@/three/models'
import { useFbView } from '@/game/fbView'

const PARTS = ['case', ...(INSTALLABLE_IDS as PartId[])] as (PartId | 'case')[]
const PERIS = Object.keys(PERIPHERAL_MODELS) as PeripheralModelId[]

/** Attend une image rendue (avec repli si requestAnimationFrame est gelé). */
function nextFrame() {
  return new Promise<void>((res) => {
    let done = false
    const fin = () => {
      if (!done) {
        done = true
        res()
      }
    }
    requestAnimationFrame(fin)
    setTimeout(fin, 45)
  })
}

export function Boot({ children }: { children: ReactNode }) {
  const warmed = useFbView((s) => s.warmed)
  const [pct, setPct] = useState(0)

  useEffect(() => {
    if (useFbView.getState().warmed) return
    let cancelled = false
    const steps: { part?: PartId | 'case' | null; peri?: PeripheralModelId | null }[] = [
      ...PARTS.map((p) => ({ part: p })),
      ...PERIS.map((p) => ({ peri: p })),
    ]
    useFbView.setState({ warming: true })
    const startedAt = performance.now()

    ;(async () => {
      for (let i = 0; i < steps.length; i++) {
        if (cancelled) return
        const s = steps[i]
        useFbView.setState({ part: s.part ?? null, peri: s.peri ?? null, spin: 0 })
        await nextFrame()
        await nextFrame()
        if (!cancelled) setPct(Math.round(((i + 1) / steps.length) * 100))
        // Sécurité : jamais plus de 5 s bloqué sur cet écran.
        if (performance.now() - startedAt > 5000) break
      }
      if (!cancelled) {
        useFbView.setState({ warming: false, warmed: true, part: null, peri: null, spin: 0 })
      }
    })()

    return () => {
      cancelled = true
    }
  }, [])

  return (
    <>
      {children}
      {!warmed && (
        <div className="boot">
          <div className="boot-logo">
            Le&nbsp;<span>PC</span>
          </div>
          <div className="boot-bar">
            <div className="boot-fill" style={{ width: `${pct}%` }} />
          </div>
          <p className="boot-hint">Préparation des pièces en 3D… {pct}%</p>
        </div>
      )}
    </>
  )
}
