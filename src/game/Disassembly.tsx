/**
 * Chapitre 9 — Le démontage.
 *
 * On part d'une machine complète, allumée et reliée à ses périphériques.
 * L'ordre est imposé :
 *   1. ÉTEINDRE le PC          (bouton en haut, à enfoncement unique)
 *   2. DÉBRANCHER chaque fiche, une par une, en cliquant dessus à l'arrière
 *   3. RETIRER les composants  (en commençant par ce qui est posé par-dessus)
 *
 * Pas de vue éclatée ici : on démonte une machine réelle, pièce par pièce, et
 * le geste à apprendre est justement de retirer ce qui est posé par-dessus.
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
import { PERIPHERAL_BY_ID } from '@/data/peripherals'
import { ALL_INSTALLED, useBuild } from '@/state/useBuild'
import { PcRig, type HighlightKind } from '@/three/PcRig'
import { asPart } from '@/three/models'
import { boundsCenter, type CameraViewId, type Vec3 } from '@/three/layout'
import { ExerciseBar, ExerciseEnd, ExerciseIntro, useReady } from './Frame'
import { ConnectedPeripherals, DEMO_CONNECTED, portAnchor } from './periConnected'
import { useExercise } from './useExercise'
import { sfx } from '@/audio/sfx'

interface Float {
  key: number
  /** Où l'étiquette apparaît (au-dessus de la pièce, ou de la fiche) */
  pos: Vec3
  text: string
}

interface DisState {
  flash: Partial<Record<ComponentId, HighlightKind>>
  finished: boolean
  /** Le PC est-il encore sous tension ? (bouton « Éteindre ») */
  powered: boolean
  /** Toutes les fiches des périphériques ont-elles été retirées ? */
  periUnplugged: boolean
  /** Fiche mise en évidence par l'indice */
  plugFlash: string | null
  /** Étiquettes vertes « … retiré » qui montent depuis les pièces */
  floats: Float[]
}
const useDis = create<DisState>()(() => ({
  flash: {},
  finished: false,
  powered: true,
  periUnplugged: false,
  plugFlash: null,
  floats: [],
}))

let floatSeq = 1

/** Remet l'atelier au tout début (machine remontée, boutons non enfoncés). */
function restartDisassembly() {
  useDis.setState({ flash: {}, finished: false, powered: true, periUnplugged: false, plugFlash: null, floats: [] })
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

/** « Le clavier » → « le clavier », pour l'insérer dans une phrase. */
function minuscule(nom: string) {
  return nom.charAt(0).toLowerCase() + nom.slice(1)
}

/**
 * Débranche une fiche, cliquée dans la 3D.
 * Le PC doit d'abord être éteint : avant, la fiche ne bouge pas et on explique
 * pourquoi — sans compter d'erreur, c'est le bouton « Éteindre » qu'il fallait voir.
 */
export function unplugPeripheral(periId: string) {
  const b = useBuild.getState()
  const port = b.plugged[periId]
  if (!port) return
  const nom = PERIPHERAL_BY_ID[periId]?.name ?? 'Ce périphérique'
  if (useDis.getState().powered) {
    useExercise
      .getState()
      .info(
        "Éteins d'abord le PC",
        `On ne débranche pas ${minuscule(nom)} d'une machine allumée. Clique sur « Éteindre le PC », en haut de l'écran.`,
      )
    return
  }
  sfx.pick()
  const a = portAnchor(port)
  b.unplug(periId)
  useDis.setState((s) => ({
    plugFlash: s.plugFlash === periId ? null : s.plugFlash,
    floats: [...s.floats, { key: floatSeq++, pos: [a[0] + 4, a[1] + 3, a[2] + 4], text: `Fiche retirée : ${minuscule(nom)}` }],
  }))
  if (Object.keys(useBuild.getState().plugged).length === 0) useDis.setState({ periUnplugged: true })
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
      : "Il faut d'abord DÉBRANCHER chaque périphérique : clique sur chaque fiche, à l'arrière de l'unité centrale."
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
  const c = boundsCenter(id)
  useDis.setState((s) => ({
    floats: [...s.floats, { key: floatSeq++, pos: [c[0], c[1] + 8, c[2]], text: `${placedShortName(id)} retiré` }],
  }))
  b.uninstall(id)
  if (id === 'psu' || id === 'motherboard') b.set({ powered: false, running: false })

  const left = useBuild.getState().installed.filter((x) => x !== 'case')
  if (left.length === 0) useDis.setState({ finished: true })
}

/* ---------------- Étiquette « … retiré » qui monte ---------------- */

function RemovedFloat({ float, onDone }: { float: Float; onDone: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDone, 2500)
    return () => clearTimeout(t)
  }, [onDone])
  return (
    <Html position={float.pos} center zIndexRange={[60, 0]} style={{ pointerEvents: 'none' }}>
      <div className="removed-float">✅ {float.text}</div>
    </Html>
  )
}

/* ---------------- Scène ---------------- */

export function DisassemblyScene() {
  const phase = useExercise((s) => s.phase)
  const flash = useDis((s) => s.flash)
  const floats = useDis((s) => s.floats)
  const powered = useDis((s) => s.powered)
  const plugFlash = useDis((s) => s.plugFlash)

  return (
    <>
      <PcRig
        interactive={phase === 'play'}
        casePickable={false}
        highlights={flash}
        onPartClick={removePart}
      />
      {/* Allumé, les fiches répondent aussi au clic : on explique qu'il faut éteindre. */}
      {phase === 'play' && <ConnectedPeripherals onUnplug={unplugPeripheral} flash={powered ? null : plugFlash} />}
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

export function DisassemblyUi({ onView }: { onView?: (v: CameraViewId) => void }) {
  const ex = useExercise()
  const installed = useBuild((s) => s.installed)
  const finished = useDis((s) => s.finished)
  const powered = useDis((s) => s.powered)
  const periUnplugged = useDis((s) => s.periUnplugged)
  const plugged = useBuild((s) => s.plugged)
  const [result, setResult] = useState<{ stars: 0 | 1 | 2 | 3; xp: number } | null>(null)
  const ready = useReady()

  useEffect(() => {
    useDis.setState({ flash: {}, finished: false, powered: true, periUnplugged: false, plugFlash: null, floats: [] })
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

  /* Les fiches sont à l'arrière : on y tourne la caméra le temps de les débrancher,
     puis on revient dans la machine pour la suite. */
  useEffect(() => {
    if (ex.phase !== 'play') return
    if (!powered && !periUnplugged) onView?.('debranchement')
    else if (periUnplugged) onView?.('inside')
  }, [ex.phase, powered, periUnplugged, onView])

  const removable = installed.filter((id) => id !== 'case' && blockers(id, installed).length === 0)
  const step3 = !powered && periUnplugged

  const hint = () => {
    if (powered) {
      useExercise.getState().hint()
      useExercise
        .getState()
        .info('Commence par éteindre', 'Clique sur le bouton « Éteindre le PC », en haut de l\'écran.')
      return
    }
    if (!periUnplugged) {
      const next = Object.keys(plugged)[0]
      if (!next) return
      useExercise.getState().hint()
      useExercise
        .getState()
        .info(
          'Débranche les périphériques',
          `Clique sur la fiche qui clignote en jaune : celle de ${minuscule(PERIPHERAL_BY_ID[next]?.name ?? 'ce périphérique')}. Une à une, toutes les fiches doivent sortir de leur prise.`,
        )
      useDis.setState({ plugFlash: next })
      setTimeout(() => useDis.setState((s) => (s.plugFlash === next ? { plugFlash: null } : s)), 2600)
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
            <b>1️⃣ Éteindre</b> le PC (bouton en haut) — les ventilateurs s'arrêtent
          </div>
          <div>
            <b>2️⃣ Débrancher</b> chaque périphérique : clique sur chaque fiche, à l'arrière
          </div>
          <div>
            <b>3️⃣ Démonter</b> les composants, jamais un qui en supporte un autre
          </div>
        </div>
      </ExerciseIntro>

      {ex.phase === 'play' && (
        <>
          <div className="disasmbar card">
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
            <span className="disasmbar-arrow">→</span>
            <span className={`disasm-btn disasm-status ${periUnplugged ? 'pressed' : powered ? 'waiting' : ''}`}>
              🔌{' '}
              {periUnplugged
                ? 'Périphériques débranchés'
                : `Fiches à débrancher : ${Object.keys(plugged).length}`}
            </span>
          </div>

          <div className="tools card tools-thin">
            <div className="tools-legend">
              {step3 ? (
                <>
                  Reste : <b>{installed.filter((x) => x !== 'case').length}</b> pièce(s)
                </>
              ) : powered ? (
                <>Étape 1 : <b>éteindre</b> le PC</>
              ) : (
                <>Étape 2 : <b>débrancher</b> chaque fiche ({Object.keys(plugged).length} restante{Object.keys(plugged).length > 1 ? 's' : ''})</>
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
                <span>⏻</span> Commence par éteindre le PC : bouton « Éteindre le PC », en haut
              </>
            ) : (
              <>
                <span>🔌</span> Débranche maintenant les périphériques : clique sur chaque fiche
                branchée à l'arrière de l'unité centrale, une par une
              </>
            )}
          </div>
        </>
      )}
      <ExerciseEnd result={result} />
    </>
  )
}
