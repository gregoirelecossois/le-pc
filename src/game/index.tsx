/** Aiguillage : à chaque chapitre son exercice (scène 3D + interface). */

import type { ChapterId } from '@/data/chapters'
import type { CameraViewId } from '@/three/layout'
import { AssemblyScene, AssemblyUi } from './Assembly'
import { CablingScene, CablingUi } from './Cabling'
import { DisassemblyScene, DisassemblyUi } from './Disassembly'
import { DiscoveryScene, DiscoveryUi } from './Discovery'
import { LocateScene, LocateUi } from './Locate'
import { NamingScene, NamingUi } from './Naming'
import { PeripheralsScene, PeripheralsUi } from './Peripherals'
import { RolesScene, RolesUi } from './Roles'

/** Vue caméra au démarrage de chaque chapitre. */
export const CHAPTER_VIEW: Record<ChapterId, CameraViewId> = {
  decouverte: 'overview',
  nommer: 'showcase',
  reperer: 'overview',
  roles: 'lineup',
  montage: 'inside',
  cablage: 'cablage',
  peripheriques: 'showcase',
  demontage: 'inside',
  defi: 'inside',
}

/**
 * Décalage horizontal du sujet, pour ne pas le cacher derrière le panneau
 * de l'exercice (positif = la machine se place à droite).
 */
export const CHAPTER_OFFSET: Partial<Record<ChapterId, number>> = {
  cablage: 0.1,
  montage: 0.08,
  defi: 0.08,
  demontage: 0.06,
}

/**
 * Chapitres dont le cadrage est FIXE.
 *
 * « À quoi ça sert ? » aligne quatre pièces devant la caméra : laisser
 * pivoter la vue les ferait se chevaucher, et le premier clic-glissé
 * couperait le recadrage automatique.
 */
export const LOCKED_VIEW: ChapterId[] = ['roles']

export function GameScene({ chapter }: { chapter: ChapterId }) {
  switch (chapter) {
    case 'decouverte':
      return <DiscoveryScene />
    case 'nommer':
      return <NamingScene />
    case 'reperer':
      return <LocateScene />
    case 'roles':
      return <RolesScene />
    case 'montage':
      return <AssemblyScene />
    case 'cablage':
      return <CablingScene />
    case 'peripheriques':
      return <PeripheralsScene />
    case 'demontage':
      return <DisassemblyScene />
    case 'defi':
      return <AssemblyScene showGhosts={false} />
  }
}

export function GameUi({
  chapter,
  onView,
}: {
  chapter: ChapterId
  onView: (v: CameraViewId) => void
}) {
  switch (chapter) {
    case 'decouverte':
      return <DiscoveryUi onView={onView} />
    case 'nommer':
      return <NamingUi />
    case 'reperer':
      return <LocateUi />
    case 'roles':
      return <RolesUi />
    case 'montage':
      return <AssemblyUi onView={onView} />
    case 'cablage':
      return <CablingUi onView={onView} />
    case 'peripheriques':
      return <PeripheralsUi onView={onView} />
    case 'demontage':
      return <DisassemblyUi onView={onView} />
    case 'defi':
      return <AssemblyUi challenge onView={onView} />
  }
}
