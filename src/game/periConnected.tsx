/**
 * Périphériques déjà branchés, rendus dans la scène 3D.
 *
 * Sert au chapitre du démontage : la machine démarre reliée à son écran,
 * son clavier, sa souris et le secteur. Une fois le PC éteint, l'élève
 * débranche chaque fiche en cliquant dessus, une par une.
 */

import { useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import type * as THREE from 'three'
import { PORT_BY_ID } from '@/data/ports'
import { PERIPHERAL_BY_ID, type Peripheral } from '@/data/peripherals'
import type { Vec3 } from '@/three/layout'
import { FlexCable, PeripheralModel, USBKEY_PLUG_OFFSET } from '@/three/models/PeripheralParts'
import { PLUGS, Plug, type PlugKind } from '@/three/models/Plugs'
import { useBuild } from '@/state/useBuild'

/** Branchements présents au lancement du démontage : périphérique -> prise. */
export const DEMO_CONNECTED: Record<string, string> = {
  monitor: 'hdmi-gpu',
  keyboard: 'usb2-a',
  mouse: 'usb2-b',
  power: 'psu-socket',
}

/** Point d'ancrage de la fiche, légèrement en retrait de la prise. */
export function portAnchor(id: string): Vec3 {
  const p = PORT_BY_ID[id]
  return [p.position[0], p.position[1], p.position[2] + p.size[2] / 2 + 0.2]
}

function PlugHead({ peri }: { peri: Peripheral }) {
  if (peri.id === 'usbkey') {
    return (
      <group position={USBKEY_PLUG_OFFSET}>
        <PeripheralModel id="usbkey" />
      </group>
    )
  }
  return <Plug kind={peri.plug} color={peri.plugColor} />
}

/**
 * Zone cliquable autour de chaque fiche (largeur × hauteur).
 * Une fiche fait un centimètre : impossible à viser sans aide. Mais les deux prises
 * USB du clavier et de la souris sont superposées à 9 mm l'une de l'autre, la zone
 * ne doit donc pas déborder sur la voisine.
 */
const HIT: Record<PlugKind, [number, number]> = {
  'usb-a': [2.2, 0.86],
  hdmi: [2.8, 1.6],
  displayport: [2.8, 1.6],
  rj45: [2.2, 2],
  jack: [1.6, 1.6],
  c13: [3.8, 3],
}

/** Halo pulsant : cette fiche se débranche d'un clic. */
function UnplugTarget({
  peri,
  flash,
  onUnplug,
}: {
  peri: Peripheral
  flash: boolean
  onUnplug: (id: string) => void
}) {
  const mat = useRef<THREE.MeshBasicMaterial>(null)
  const [over, setOver] = useState(false)
  const [w, h] = HIT[peri.plug]
  const len = PLUGS[peri.plug].length

  useFrame(() => {
    if (!mat.current) return
    const pulse = 0.5 + 0.5 * Math.sin(performance.now() * 0.005)
    mat.current.opacity = over ? 0.7 : flash ? 0.35 + 0.45 * pulse : 0.25 + 0.25 * pulse
  })

  return (
    <mesh
      position={[0, 0, len / 2]}
      onPointerDown={(e) => e.stopPropagation()}
      onClick={(e) => {
        e.stopPropagation()
        document.body.style.cursor = ''
        onUnplug(peri.id)
      }}
      onPointerOver={(e) => {
        e.stopPropagation()
        setOver(true)
        document.body.style.cursor = 'pointer'
      }}
      onPointerOut={() => {
        setOver(false)
        document.body.style.cursor = ''
      }}
    >
      <boxGeometry args={[w, h, len + 0.6]} />
      <meshBasicMaterial
        ref={mat}
        color={flash ? '#ffd166' : '#38bdf8'}
        transparent
        opacity={0.2}
        depthWrite={false}
      />
    </mesh>
  )
}

export function ConnectedPeripherals({
  onUnplug,
  flash = null,
}: {
  /** Fourni : chaque fiche se débranche d'un clic. Absent : simple décor. */
  onUnplug?: (periId: string) => void
  /** Fiche mise en évidence par l'indice */
  flash?: string | null
} = {}) {
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
              {onUnplug && <UnplugTarget peri={p} flash={flash === periId} onUnplug={onUnplug} />}
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
