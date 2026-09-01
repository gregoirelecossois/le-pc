/**
 * Périphériques déjà branchés, rendus dans la scène 3D.
 *
 * Sert au chapitre du démontage : la machine démarre reliée à son écran,
 * son clavier, sa souris et le secteur ; le bouton « Débrancher les
 * périphériques » vide `useBuild.plugged` et tout disparaît.
 */

import { PORT_BY_ID } from '@/data/ports'
import { PERIPHERAL_BY_ID, type Peripheral } from '@/data/peripherals'
import type { Vec3 } from '@/three/layout'
import { FlexCable, PeripheralModel } from '@/three/models/PeripheralParts'
import { PLUGS, Plug } from '@/three/models/Plugs'
import { useBuild } from '@/state/useBuild'

/** Branchements présents au lancement du démontage : périphérique -> prise. */
export const DEMO_CONNECTED: Record<string, string> = {
  monitor: 'hdmi-gpu',
  keyboard: 'usb2-a',
  mouse: 'usb2-b',
  power: 'psu-socket',
}

/** Point d'ancrage de la fiche, légèrement en retrait de la prise. */
function portAnchor(id: string): Vec3 {
  const p = PORT_BY_ID[id]
  return [p.position[0], p.position[1], p.position[2] + p.size[2] / 2 + 0.2]
}

function PlugHead({ peri }: { peri: Peripheral }) {
  if (peri.id === 'usbkey') {
    return (
      <group position={[0, -0.55, 1.35]}>
        <PeripheralModel id="usbkey" />
      </group>
    )
  }
  return <Plug kind={peri.plug} color={peri.plugColor} />
}

export function ConnectedPeripherals() {
  const plugged = useBuild((s) => s.plugged)

  return (
    <>
      {Object.entries(plugged).map(([periId, portId]) => {
        const p = PERIPHERAL_BY_ID[periId]
        if (!p || !PORT_BY_ID[portId]) return null
        const a = portAnchor(portId)
        return (
          <group key={periId}>
            <group position={[a[0], a[1], a[2] + 0.6]}>
              <PlugHead peri={p} />
            </group>
            {p.id !== 'usbkey' && (
              <FlexCable
                from={[a[0], a[1], a[2] + 0.6 + PLUGS[p.plug].length]}
                to={[a[0] + 42, 1.5, a[2] + 2]}
                sag={7}
              />
            )}
          </group>
        )
      })}
    </>
  )
}
