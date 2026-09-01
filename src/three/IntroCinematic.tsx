/**
 * Cinématique d'ouverture des chapitres 1 et 3.
 *
 * Au lancement : un tour complet rapide de la caméra, un éclatement rapide,
 * une seconde tout écarté, puis on recontracte et on rend la main. Pendant
 * toute la séquence, `useExercise.busy` bloque les clics et `useBuild.camLock`
 * met le recadrage automatique en retrait.
 *
 * Un garde-fou côté interface (voir Discovery / Locate) rend la main au
 * bout de quelques secondes même si la boucle d'animation ne tourne pas.
 */

import { useEffect } from 'react'
import { useThree } from '@react-three/fiber'
import { useBuild } from '@/state/useBuild'
import { useExercise } from '@/game/useExercise'

const SPIN = 0.85 // tour complet (s)
const EXP_IN = 0.5 // éclatement (s)
const HOLD = 1.0 // maintien tout écarté (s)
const EXP_OUT = 0.55 // recontraction (s)
export const INTRO_TOTAL_MS = (SPIN + EXP_IN + HOLD + EXP_OUT) * 1000

type Orbit = {
  getAzimuthalAngle: () => number
  setAzimuthalAngle: (a: number) => void
  update: () => void
}

export function IntroCinematic() {
  const controls = useThree((s) => s.controls) as unknown as Orbit | null

  useEffect(() => {
    if (!controls) return
    useBuild.getState().set({ camLock: true })

    let raf = 0
    let start = 0
    const startAz = controls.getAzimuthalAngle()
    const TOTAL = INTRO_TOTAL_MS / 1000

    const tick = (now: number) => {
      if (!start) start = now
      const T = (now - start) / 1000

      const spinP = Math.min(1, T / SPIN)
      const eased = 1 - Math.pow(1 - spinP, 2)
      controls.setAzimuthalAngle(startAz + eased * Math.PI * 2)
      controls.update()

      let e = 0
      if (T > SPIN && T <= SPIN + EXP_IN) e = (T - SPIN) / EXP_IN
      else if (T > SPIN + EXP_IN && T <= SPIN + EXP_IN + HOLD) e = 1
      else if (T > SPIN + EXP_IN + HOLD && T < TOTAL)
        e = 1 - (T - SPIN - EXP_IN - HOLD) / EXP_OUT
      useBuild.getState().set({ explode: Math.max(0, Math.min(1, e)) })

      if (T >= TOTAL) {
        useBuild.getState().set({ explode: 0, camLock: false })
        useExercise.getState().setBusy(false)
        return
      }
      raf = requestAnimationFrame(tick)
    }

    raf = requestAnimationFrame(tick)
    return () => {
      cancelAnimationFrame(raf)
      useBuild.getState().set({ camLock: false })
    }
  }, [controls])

  return null
}
