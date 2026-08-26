/**
 * La maquette : boîtier + composants installés, avec vue éclatée,
 * surbrillance au survol, emplacements fantômes et étiquettes.
 */

import { Html } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { memo, useEffect, useMemo, useRef, type ReactNode } from 'react'
import * as THREE from 'three'
import { BOUNDS, SLOTS, minExplodeY, type Vec3 } from './layout'
import { watchDrag, wasDragged } from './dragGuard'
import { M } from './materials'
import { CaseShell, PartModel, type PartId } from './models'
import { COMPONENTS, type ComponentId } from '@/data/components'
import { useBuild } from '@/state/useBuild'

/* ---------------------------------------------------------------- */
/*  Surbrillance : boîte translucide + arêtes                        */
/* ---------------------------------------------------------------- */

const HIGHLIGHT_COLORS = {
  hover: '#7dd3fc',
  select: '#ffd166',
  target: '#4dd0e1',
  ok: '#66d17a',
  bad: '#ff6b6b',
} as const

export type HighlightKind = keyof typeof HIGHLIGHT_COLORS

/** Objet ignoré par le lancer de rayon (donc par les clics et le survol). */
const NO_RAYCAST = () => null

function BoxHighlight({
  size,
  offset,
  kind,
  pulse = true,
}: {
  size: Vec3
  offset: Vec3
  kind: HighlightKind
  pulse?: boolean
}) {
  const g = useRef<THREE.Group>(null)
  const color = HIGHLIGHT_COLORS[kind]
  const edges = useMemo(() => new THREE.BoxGeometry(...size), [size])

  useFrame((state) => {
    if (!g.current || !pulse) return
    const k = 1 + Math.sin(state.clock.elapsedTime * 4) * 0.012
    g.current.scale.setScalar(k)
  })

  return (
    <group ref={g} position={offset}>
      {/* `raycast` neutralisé : la boîte de surbrillance est PLUS GRANDE que
          la pièce et se dresse devant elle. Sans cela, celle de la carte mère
          (5 x 30 x 24 cm) intercepte tous les clics destinés aux pièces posées
          dessus — processeur, pile CMOS, SSD — qui devenaient impossibles à
          attraper au démontage. */}
      <mesh renderOrder={2} raycast={NO_RAYCAST}>
        <boxGeometry args={size} />
        <meshBasicMaterial color={color} transparent opacity={0.07} depthWrite={false} />
      </mesh>
      <lineSegments renderOrder={3} raycast={NO_RAYCAST}>
        <edgesGeometry args={[edges]} />
        <lineBasicMaterial color={color} transparent opacity={0.95} depthTest={false} />
      </lineSegments>
    </group>
  )
}

/* ---------------------------------------------------------------- */
/*  Étiquette flottante                                              */
/* ---------------------------------------------------------------- */

function PartLabel({ id, position }: { id: ComponentId; position: Vec3 }) {
  const c = COMPONENTS[id]
  return (
    <Html position={position} center zIndexRange={[40, 0]} style={{ pointerEvents: 'none' }}>
      <div className="tag3d" style={{ borderColor: c.color }}>
        <span className="tag3d-dot" style={{ background: c.color }} />
        {c.shortName}
      </div>
    </Html>
  )
}

/* ---------------------------------------------------------------- */
/*  Un composant posé (ou en train de rejoindre) son emplacement      */
/* ---------------------------------------------------------------- */

interface PartSlotProps {
  id: PartId
  explode: number
  running: boolean
  powered: boolean
  installed: Set<ComponentId>
  highlight: HighlightKind | null
  showLabel: boolean
  interactive: boolean
  /** Animation d'insertion en cours : 0 -> arrive de loin, 1 -> en place */
  entering?: boolean
  onOver?: (id: ComponentId) => void
  onOut?: (id: ComponentId) => void
  onClick?: (id: ComponentId) => void
}

const PartSlot = memo(function PartSlot({
  id,
  explode,
  running,
  powered,
  installed,
  highlight,
  showLabel,
  interactive,
  entering,
  onOver,
  onOut,
  onClick,
}: PartSlotProps) {
  const slot = SLOTS[id]
  const b = BOUNDS[id]
  const g = useRef<THREE.Group>(null)
  const t = useRef(entering ? 0 : 1)

  const target = useMemo(() => new THREE.Vector3(), [])
  const start = useMemo(
    () =>
      new THREE.Vector3(
        slot.position[0] + slot.approach[0] * slot.approachDist,
        slot.position[1] + slot.approach[1] * slot.approachDist,
        slot.position[2] + slot.approach[2] * slot.approachDist,
      ),
    [slot],
  )

  // Plancher : une pièce écartée ne doit jamais s'enfoncer dans le sol.
  const floorY = useMemo(() => minExplodeY(id), [id])

  useFrame((_, dt) => {
    if (!g.current) return
    // position finale = emplacement + décalage de vue éclatée
    target.set(
      slot.position[0] + slot.explode[0] * explode,
      Math.max(slot.position[1] + slot.explode[1] * explode, floorY),
      slot.position[2] + slot.explode[2] * explode,
    )
    if (t.current < 1) {
      t.current = Math.min(1, t.current + dt * 2.4)
      const e = 1 - Math.pow(1 - t.current, 3) // easing out
      g.current.position.lerpVectors(start, target, e)
    } else {
      g.current.position.lerp(target, 1 - Math.pow(0.002, dt))
    }
  })

  const labelPos: Vec3 = [
    b.offset[0] + slot.labelOffset[0],
    b.offset[1] + slot.labelOffset[1],
    b.offset[2] + slot.labelOffset[2],
  ]

  return (
    <group
      ref={g}
      position={entering ? start.toArray() : slot.position}
      rotation={slot.rotation}
      onPointerOver={
        interactive
          ? (e) => {
              e.stopPropagation()
              onOver?.(id)
            }
          : undefined
      }
      onPointerOut={interactive ? () => onOut?.(id) : undefined}
      onClick={
        interactive
          ? (e) => {
              e.stopPropagation()
              // relâché après avoir fait pivoter la vue : ce n'est pas une réponse
              if (wasDragged()) return
              onClick?.(id)
            }
          : undefined
      }
    >
      <PartModel id={id} running={running} powered={powered} installed={installed} />
      {highlight && <BoxHighlight size={b.size} offset={b.offset} kind={highlight} />}
      {showLabel && <PartLabel id={id} position={labelPos} />}
    </group>
  )
})

/* ---------------------------------------------------------------- */
/*  Emplacement vide (fantôme)                                       */
/* ---------------------------------------------------------------- */

export function GhostSlot({
  id,
  kind = 'target',
  onClick,
  label,
}: {
  id: PartId
  kind?: HighlightKind
  onClick?: (id: PartId) => void
  label?: string
}) {
  const slot = SLOTS[id]
  const b = BOUNDS[id]
  const mat = kind === 'ok' ? M.ghostOk() : kind === 'bad' ? M.ghostBad() : M.ghost()
  const g = useRef<THREE.Mesh>(null)

  useFrame((state) => {
    if (!g.current) return
    const m = g.current.material as THREE.MeshStandardMaterial
    m.opacity = 0.04 + (Math.sin(state.clock.elapsedTime * 3.4) * 0.5 + 0.5) * 0.07
  })

  return (
    <group position={slot.position}>
      <mesh
        ref={g}
        position={b.offset}
        material={mat}
        onClick={(e) => {
          e.stopPropagation()
          onClick?.(id)
        }}
      >
        <boxGeometry args={b.size} />
      </mesh>
      <BoxHighlight size={b.size} offset={b.offset} kind={kind} />
      {label && (
        <Html position={b.offset} center zIndexRange={[30, 0]} style={{ pointerEvents: 'none' }}>
          <div className="tag3d tag3d-ghost">{label}</div>
        </Html>
      )}
    </group>
  )
}

/* ---------------------------------------------------------------- */
/*  Maquette complète                                                */
/* ---------------------------------------------------------------- */

export interface PcRigProps {
  /** Composants cliquables ? */
  interactive?: boolean
  /** Surbrillance forcée (exercices « trouve-le ») */
  highlights?: Partial<Record<ComponentId, HighlightKind>>
  /** Composants qui viennent d'être posés : jouent l'animation d'insertion */
  entering?: ComponentId[]
  onPartClick?: (id: ComponentId) => void
  /**
   * Le boîtier réagit-il au pointeur ?
   *
   * Trois.js ne teste QUE les objets porteurs d'un gestionnaire : couper
   * celui du boîtier rend cliquables les pièces qu'il masque — disque dur
   * et lecteur de disques, cachés derrière la façade et la cage. Le
   * démontage s'en sert, puisqu'on n'y « retire » jamais le boîtier.
   */
  casePickable?: boolean
  /**
   * Restreint les étiquettes flottantes à ces pièces.
   * La visite guidée s'en sert pour ne nommer que ce qui a déjà été
   * découvert : l'élève voit d'un coup d'œil ce qu'il lui reste à trouver.
   */
  labelOnly?: ComponentId[]
  children?: ReactNode
}

export function PcRig({
  interactive = true,
  highlights = {},
  entering = [],
  onPartClick,
  labelOnly,
  casePickable = true,
  children,
}: PcRigProps) {
  const installed = useBuild((s) => s.installed)
  const explode = useBuild((s) => s.explode)
  const hovered = useBuild((s) => s.hovered)
  const selected = useBuild((s) => s.selected)
  const running = useBuild((s) => s.running)
  const powered = useBuild((s) => s.powered)
  const panelOpen = useBuild((s) => s.panelOpen)
  const hideFront = useBuild((s) => s.hideFront)
  const labels = useBuild((s) => s.labels)
  const setBuild = useBuild((s) => s.set)

  // Surveille le pointeur pour distinguer un clic d'une rotation de vue.
  useEffect(watchDrag, [])

  const installedSet = useMemo(() => new Set(installed), [installed])
  const parts = useMemo(() => installed.filter((id): id is PartId => id !== 'case'), [installed])

  const caseHighlight = highlights.case ?? (hovered === 'case' ? 'hover' : selected === 'case' ? 'select' : null)

  return (
    <group name="pc">
      <group
        onPointerOver={
          interactive && casePickable
            ? (e) => {
                e.stopPropagation()
                setBuild({ hovered: 'case' })
              }
            : undefined
        }
        onPointerOut={interactive && casePickable ? () => setBuild({ hovered: null }) : undefined}
        onClick={
          interactive && casePickable
            ? (e) => {
                e.stopPropagation()
                if (wasDragged()) return
                onPartClick?.('case')
              }
            : undefined
        }
      >
        <CaseShell
          panelOpen={Math.max(panelOpen, explode)}
          hideFront={hideFront}
          powered={powered}
          slotCovers={
            installedSet.has('gpu')
              ? [true, false, false, true, true, true, true]
              : [true, true, true, true, true, true, true]
          }
        />
      </group>
      {caseHighlight && (
        <group position={[0, 23.5, 0]}>
          <BoxHighlight size={[22.4, 47.4, 46.4]} offset={[0, 0, 0]} kind={caseHighlight} />
        </group>
      )}

      {parts.map((id) => (
        <PartSlot
          key={id}
          id={id}
          explode={explode}
          running={running}
          powered={powered}
          installed={installedSet}
          entering={entering.includes(id)}
          highlight={highlights[id] ?? (hovered === id ? 'hover' : selected === id ? 'select' : null)}
          showLabel={labels && (!labelOnly || labelOnly.includes(id))}
          interactive={interactive}
          onOver={(x) => setBuild({ hovered: x })}
          onOut={() => setBuild({ hovered: null })}
          onClick={(x) => onPartClick?.(x)}
        />
      ))}

      {children}
    </group>
  )
}
