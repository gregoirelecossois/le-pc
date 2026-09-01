/**
 * Séquence de fin du défi du technicien.
 *
 * La machine démarre tranquillement, la vue tourne, puis tout s'emballe :
 * accélération, plusieurs tours, coup de frein brutal avec éclatement
 * total, et on termine sur une rotation lente pour contempler. Ensuite
 * seulement `useExercise.busy` repasse à faux et l'écran de fin s'affiche.
 */

import { useEffect } from 'react'
import { useThree } from '@react-three/fiber'
import { useBuild } from '@/state/useBuild'
import { useExercise } from '@/game/useExercise'
import { sfx } from '@/audio/sfx'

const A = 2.0 // démarrage tranquille
const B = 2.2 // accélération, plusieurs tours d'un coup
const C = 0.55 // freinage brusque + éclatement total
const D = 2.8 // contemplation, rotation lente
const TOTAL = A + B + C + D

type Orbit = {
  getAzimuthalAngle: () => number
  setAzimuthalAngle: (a: number) => void
  update: () => void
}

export function ChallengeFinale() {
  const controls = useThree((s) => s.controls) as unknown as Orbit | null

  useEffect(() => {
    if (!controls) return
    useBuild.getState().set({ camLock: true })

    let raf = 0
    let start = 0
    let prev = 0
    let az = controls.getAzimuthalAngle()
    let boomed = false

    const tick = (now: number) => {
      if (!start) {
        start = now
        prev = now
      }
      const T = (now - start) / 1000
      const dt = Math.min(0.05, (now - prev) / 1000)
      prev = now

      let speed: number
      if (T < A) speed = 0.5
      else if (T < A + B) {
        const p = (T - A) / B
        speed = 0.5 + p * p * 24
      } else if (T < A + B + C) {
        const p = (T - A - B) / C
        speed = Math.max(0, 24 * (1 - p) * (1 - p))
      } else {
        speed = 0.35
      }
      az += speed * dt
      controls.setAzimuthalAngle(az)
      controls.update()

      let e = 0
      if (T >= A + B && T < A + B + C) e = (T - A - B) / C
      else if (T >= A + B + C) e = 1
      useBuild.getState().set({ explode: Math.min(1, e) })

      if (T >= A + B && !boomed) {
        boomed = true
        sfx.success()
      }

      if (T >= TOTAL) {
        useBuild.getState().set({ camLock: false })
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
