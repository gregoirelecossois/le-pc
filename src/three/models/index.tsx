/**
 * Registre : à chaque composant du catalogue correspond un modèle 3D.
 */

import type { ComponentId } from '@/data/components'
import { CaseFan, Gpu, Hdd, Psu } from './BigParts'
import { Motherboard } from './Motherboard'
import { CmosBattery, Cooler, Cpu, RamStick, Ssd } from './SmallParts'

export type PartId = Exclude<ComponentId, 'case'>

export interface PartProps {
  /** Les ventilateurs tournent-ils ? (le PC est allumé) */
  running?: boolean
  /** Les LED sont-elles allumées ? */
  powered?: boolean
  /** État des autres composants, utile à la carte mère */
  installed?: Set<ComponentId>
}

export function PartModel({ id, running = false, powered = false, installed }: PartProps & { id: PartId }) {
  const spin = running ? 1.7 : 0
  switch (id) {
    case 'motherboard':
      return (
        <Motherboard
          cpuInstalled={!!installed?.has('cpu')}
          ramSlots={[false, !!installed?.has('ram1'), false, !!installed?.has('ram2')]}
          gpuInstalled={!!installed?.has('gpu')}
          powered={powered}
        />
      )
    case 'cpu':
      return <Cpu />
    case 'cooler':
      return <Cooler fanSpeed={spin} />
    case 'ram1':
      return <RamStick accent="#2f6bd0" />
    case 'ram2':
      return <RamStick accent="#2f6bd0" />
    case 'ssd':
      return <Ssd />
    case 'hdd':
      return <Hdd />
    case 'gpu':
      return <Gpu fanSpeed={spin * 0.8} ledOn={powered} />
    case 'psu':
      return <Psu fanSpeed={spin * 0.6} />
    case 'fanFront':
      return <CaseFan speed={spin} direction={1} />
    case 'fanRear':
      return <CaseFan speed={spin} direction={1} />
    case 'cmos':
      return <CmosBattery />
    default:
      return null
  }
}

export { CaseShell } from './CaseShell'
export * from './primitives'
