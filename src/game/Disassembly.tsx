/**
 * Chapitre 9 — Le démontage.
 *
 * On part d'une machine complète, allumée et reliée à ses périphériques.
 * L'ordre est imposé :
 *   1. ÉTEINDRE le PC          (bouton à gauche du curseur, à enfoncement unique)
 *   2. DÉBRANCHER les câbles des périphériques (bouton à droite)
 *   3. RETIRER les composants  (en commençant par ce qui est posé par-dessus)
 *
 * Retirer un composant hors de cet ordre fait recommencer l'atelier, avec
 * l'explication. Un composant retiré n'ouvre plus de fenêtre : un texte
 * vert « … retiré » monte depuis la pièce. Seul un retrait dans le mauvais
 * ordre de dépendance garde la fenêtre « Pas encore ».
 */

import { useEffect, useState } from 'react'
import { create } from 'zustand'
import { Html } from '@react-three/drei'
import { COMPONENTS, INSTALLABLE_IDS, placedShortName, type ComponentId } from '@/data/components'
import { ALL_INSTALLED, useBuild } from '@/state/useBuild'
import { PcRig, type HighlightKind } from '@/three/PcRig'
import { asPart } from '@/three/models'
import { boundsCenter } from '@/three/layout'
import { ExerciseBar, ExerciseEnd, ExerciseIntro, ExplodeSlider, useReady } from './Frame'
import { ConnectedPeripherals, DEMO_CONNECTED } from './periConnected'
import { useExercise } from './useExercise'
import { sfx } from '@/audio/sfx'

interface Float {
  key: number
  id: Exclude<ComponentId, 'case'>
  name: string
}

interface DisState {
  flash: Partial<Record<ComponentId, HighlightKind>>
  finished: boolean
  /** Le PC est-il encore sous tension ? (bouton « Éteindre ») */
  powered: boolean
  /** Les câbles des périphériques ont-ils été retirés ? (bouton « Débrancher ») */
  periUnplugged: boolean
  /** Étiquettes vertes « … retiré » qui montent depuis les pièces */
  floats: Float[]
}
const useDis = create<DisState>()(() => ({
  flash: {},
  finished: false,
  powered: true,
  periUnplugged: false,
  floats: [],
}))

let floatSeq = 1

/** Remet l'atelier au tout début (machine remontée, boutons non enfoncés). */
function restartDisassembly() {
  useDis.setState({ flash: {}, finished: false, powered: true, periUnplugged: false, floats: [] })
  useExercise.getState().begin('demontage', INSTALLABLE_IDS.length)
  useBuild.getState().resetBuild(ALL_INSTALLED)
  useBuild.getState().set({
    explode: 0,
    labels: false,
    running: true,
    powered: true,
    plugged: { ...DEMO_CONNECTED },
  })
  useExercise.getState().play()
}

/** Ce qui empêche de retirer `id` : les pièces posées dessus, encore présentes. */
export function blockers(id: ComponentId, installed: ComponentId[]): ComponentId[] {
  return installed.filter((other) => COMPONENTS[other].requires.includes(id))
}

/**
 * Tente de retirer une pièce.
 * Appelé par le clic dans la 3D et par la liste des pièces restantes.
 */
export function removePart(id: ComponentId) {
  if (id === 'case') return
  const b = useBuild.getState()
  const ex = useExercise.getState()
  const dis = useDis.getState()
  if (!b.installed.includes(id)) return

  // --- Ordre imposé : éteindre puis débrancher AVANT de démonter ---
  if (dis.powered || !dis.periUnplugged) {
    const why = dis.powered
      ? "Il faut d'abord ÉTEINDRE le PC, puis débrancher les câbles des périphériques."
      : 'Il faut d\'abord DÉBRANCHER tous les câbles des périphériques (bouton à droite du curseur).'
    ex.bad(
      'Pas encore — on recommence',
      `${why} On ne démonte jamais une machine encore sous tension ou reliée à ses périphériques : risque d'électrocution, de court-circuit, et on peut arracher une prise. On reprend depuis le début.`,
      { part: asPart(id), word: 'Pas encore', onDismiss: restartDisassembly },
    )
    return
  }

  // --- Ordre de dépendance : on garde la fenêtre « Pas encore » ---
  const stuck = blockers(id, b.installed)
  if (stuck.length) {
    const names = stuck.map((s) => placedShortName(s)).join(', ')
    useDis.setState({ flash: Object.fromEntries(stuck.map((s) => [s, 'bad'])) })
    ex.bad(
      `On ne peut pas encore retirer « ${placedShortName(id)} »`,
      `Il faut d'abord enlever : ${names}. On démonte toujours en commençant par ce qui est posé par-dessus.`,
      { part: asPart(id), word: 'Pas encore', onDismiss: () => useDis.setState({ flash: {} }) },
    )
    return
  }

  // --- Retrait : pas de fenêtre, un texte vert monte depuis la pièce ---
  sfx.pick()
  useDis.setState((s) => ({
    floats: [...s.floats, { key: floatSeq++, id, name: placedShortName(id) }],
  }))
  b.uninstall(id)
  if (id === 'psu' || id === 'motherboard') b.set({ powered: false, running: false })

  const left = useBuild.getState().installed.filter((x) => x !== 'case')
  if (left.length === 0) useDis.setState({ finished: true })
}

/* ---------------- Étiquette « … retiré » qui monte ---------------- */

function RemovedFloat({ float, onDone }: { float: Float; onDone: () => void }) {
  const c = boundsCenter(float.id)
  const pos: [number, number, number] = [c[0], c[1] + 8, c[2]]
  useEffect(() => {
    const t = setTimeout(onDone, 2500)
    return () => clearTimeout(t)
  }, [onDone])
  return (
    <Html position={pos} center zIndexRange={[60, 0]} style={{ pointerEvents: 'none' }}>
      <div className="removed-float">✅ {float.name} retiré</div>
    </Html>
  )
}

/* ---------------- Scène ---------------- */

export function DisassemblyScene() {
  const phase = useExercise((s) => s.phase)
  const flash = useDis((s) => s.flash)
  const floats = useDis((s) => s.floats)

  return (
    <>
      <PcRig
        interactive={phase === 'play'}
        casePickable={false}
        highlights={flash}
        onPartClick={removePart}
      />
      {phase === 'play' && <ConnectedPeripherals />}
      {floats.map((f) => (
        <RemovedFloat
          key={f.key}
          float={f}
          onDone={() => useDis.setState((s) => ({ floats: s.floats.filter((x) => x.key !== f.key) }))}
        />
      ))}
    </>
  )
}

/* ---------------- Interface ---------------- */

export function DisassemblyUi({ onView }: { onView?: (v: 'inside' | 'overview') => void }) {
  const ex = useExercise()
  const installed = useBuild((s) => s.installed)
  const finished = useDis((s) => s.finished)
  const powered = useDis((s) => s.powered)
  const periUnplugged = useDis((s) => s.periUnplugged)
  const [result, setResult] = useState<{ stars: 0 | 1 | 2 | 3; xp: number } | null>(null)
  const ready = useReady()

  useEffect(() => {
    useDis.setState({ flash: {}, finished: false, powered: true, periUnplugged: false, floats: [] })
    useExercise.getState().begin('demontage', INSTALLABLE_IDS.length)
    useBuild.getState().resetBuild(ALL_INSTALLED)
    useBuild.getState().set({
      explode: 0,
      labels: false,
      running: true,
      powered: true,
      plugged: { ...DEMO_CONNECTED },
    })
  }, [])

  useEffect(() => {
    const left = installed.filter((x) => x !== 'case').length
    useExercise.setState({ done: INSTALLABLE_IDS.length - left })
  }, [installed])

  useEffect(() => {
    if (ready && finished && !result) setResult(useExercise.getState().finish())
  }, [ready, finished, result])

  const removable = installed.filter((id) => id !== 'case' && blockers(id, installed).length === 0)
  const step3 = !powered && periUnplugged

  const hint = () => {
    if (powered) {
      useExercise.getState().hint()
      useExercise
        .getState()
        .info('Commence par éteindre', 'Clique sur le bouton « Éteindre le PC », à gauche du curseur de vue éclatée.')
      return
    }
    if (!periUnplugged) {
      useExercise.getState().hint()
      useExercise
        .getState()
        .info(
          'Débranche les périphériques',
          'Clique sur le bouton « Débrancher les périphériques », à droite du curseur.',
        )
      return
    }
    const next = removable[0]
    if (!next) return
    useExercise.getState().hint()
    useExercise
      .getState()
      .info(`Tu peux retirer : ${placedShortName(next)}`, COMPONENTS[next].handling, { part: asPart(next) })
    useDis.setState({ flash: { [next]: 'target' } })
    setTimeout(() => useDis.setState({ flash: {} }), 1800)
  }

  return (
    <>
      <ExerciseBar onHint={hint} />
      <ExerciseIntro onStart={() => onView?.('inside')}>
        <div className="intro-tips">
          <div>
            <b>1️⃣ Éteindre</b> le PC (bouton à gauche du curseur) — les ventilateurs s'arrêtent
          </div>
          <div>
            <b>2️⃣ Débrancher</b> tous les câbles des périphériques (bouton à droite)
          </div>
          <div>
            <b>3️⃣ Démonter</b> les composants, jamais un qui en supporte un autre
          </div>
        </div>
      </ExerciseIntro>

      {ex.phase === 'play' && (
        <>
          <ExplodeSlider
            wide
            left={
              <button
                type="button"
                className={`disasm-btn ${!powered ? 'pressed' : ''}`}
                disabled={!powered}
                title="Éteindre le PC avant toute manipulation"
                onClick={() => {
                  sfx.click()
                  useDis.setState({ powered: false })
                  useBuild.getState().set({ running: false, powered: false })
                }}
              >
                ⏻ {powered ? 'Éteindre le PC' : 'PC éteint'}
              </button>
            }
            right={
              <button
                type="button"
                className={`disasm-btn ${periUnplugged ? 'pressed' : powered ? 'waiting' : ''}`}
                disabled={powered || periUnplugged}
                title={
                  powered
                    ? "Éteins d'abord le PC"
                    : 'Débrancher tous les câbles des périphériques'
                }
                onClick={() => {
                  sfx.pick()
                  useBuild.getState().set({ plugged: {} })
                  useDis.setState({ periUnplugged: true })
                }}
              >
                🔌 {periUnplugged ? 'Périphériques débranchés' : 'Débrancher les périphériques'}
              </button>
            }
          />

          <div className="tools card tools-thin">
            <div className="tools-legend">
              {step3 ? (
                <>
                  Reste : <b>{installed.filter((x) => x !== 'case').length}</b> pièce(s)
                </>
              ) : powered ? (
                <>Étape 1 : <b>éteindre</b> le PC</>
              ) : (
                <>Étape 2 : <b>débrancher</b> les périphériques</>
              )}
            </div>
            {step3 && (
              <div className="chiplist">
                {installed
                  .filter((x) => x !== 'case')
                  .map((id) => {
                    const free = blockers(id, installed).length === 0
                    return (
                      <button
                        key={id}
                        type="button"
                        className={`chip chip-btn ${free ? 'got' : ''}`}
                        style={{ '--c': free ? COMPONENTS[id].color : '#555' } as React.CSSProperties}
                        title={free ? 'Cliquer pour la retirer' : 'Bloquée par une autre pièce'}
                        onClick={() => removePart(id)}
                      >
                        <span className="chip-dot" />
                        {placedShortName(id)}
                      </button>
                    )
                  })}
              </div>
            )}
          </div>

          <div className="hintbar">
            {step3 ? (
              <>
                <span>🧰</span> Retire les pièces dans l'ordre inverse du montage — clique dans la
                machine, ou sur son nom dans la liste
              </>
            ) : powered ? (
              <>
                <span>⏻</span> Commence par éteindre le PC : bouton à gauche du curseur
              </>
            ) : (
              <>
                <span>🔌</span> Débranche maintenant les câbles des périphériques : bouton à droite
                du curseur
              </>
            )}
          </div>
        </>
      )}
      <ExerciseEnd result={result} />
    </>
  )
}
