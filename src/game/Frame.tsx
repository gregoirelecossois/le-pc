/**
 * Habillage commun à tous les exercices :
 * barre du haut, consigne de départ, bandeau de retour, écran de fin.
 */

import { useEffect, useState, type ReactNode } from 'react'
import { CHAPTER_BY_ID } from '@/data/chapters'
import { useGame } from '@/state/useGame'
import { useBuild } from '@/state/useBuild'
import { Btn, Counter, Modal, Stars, fmtTime } from '@/ui/bits'
import { PartSpinner } from '@/three/PartSpinner'
import { useExercise } from './useExercise'
import { sfx } from '@/audio/sfx'

/**
 * Vrai seulement à partir du deuxième rendu.
 *
 * Les effets de mise en place (begin / resetBuild) s'exécutent APRÈS le
 * premier rendu : sans ce garde, la condition de fin serait évaluée avec
 * l'état laissé par l'exercice précédent — et l'exercice se terminerait
 * immédiatement.
 */
export function useReady() {
  const [ready, setReady] = useState(false)
  useEffect(() => setReady(true), [])
  return ready
}

/* ---------------------------------------------------------------- */
/*  Chronomètre                                                      */
/* ---------------------------------------------------------------- */

function useTicker() {
  const phase = useExercise((s) => s.phase)
  useEffect(() => {
    if (phase !== 'play') return
    const id = window.setInterval(() => useExercise.getState().tick(0.25), 250)
    return () => window.clearInterval(id)
  }, [phase])
}

/* ---------------------------------------------------------------- */
/*  Barre du haut                                                    */
/* ---------------------------------------------------------------- */

export function ExerciseBar({
  extra,
  showTimer = true,
  onHint,
}: {
  extra?: ReactNode
  showTimer?: boolean
  onHint?: () => void
}) {
  useTicker()
  const ex = useExercise()
  const go = useGame((s) => s.go)
  const ch = ex.chapter ? CHAPTER_BY_ID[ex.chapter] : null
  if (!ch) return null

  return (
    <div className="exbar">
      <Btn
        variant="ghost"
        size="sm"
        onClick={() => {
          useExercise.getState().quit()
          useBuild.getState().resetBuild()
          go('carte')
        }}
      >
        ← Quitter
      </Btn>

      <div className="exbar-title">
        <span className="exbar-icon">{ch.icon}</span>
        <span>
          <b>{ch.title}</b>
          <em>Chapitre {ch.n}</em>
        </span>
      </div>

      <div className="exbar-progress">
        <div className="exbar-track">
          <div
            className="exbar-fill"
            style={{ width: `${ex.total ? (ex.done / ex.total) * 100 : 0}%`, background: ch.color }}
          />
        </div>
        <span className="exbar-count">
          {ex.done} / {ex.total}
        </span>
      </div>

      <div className="spacer" />
      {extra}
      {showTimer && <Counter icon="⏱️" value={fmtTime(ex.elapsed)} label="" />}
      <Counter icon="❌" value={ex.mistakes} label="erreur(s)" tone={ex.mistakes ? 'var(--bad)' : undefined} />
      {onHint && (
        <Btn size="sm" variant="ghost" onClick={onHint} title="Un coup de pouce (coûte des étoiles)">
          💡 Indice
        </Btn>
      )}
    </div>
  )
}

/* ---------------------------------------------------------------- */
/*  Consigne de départ                                               */
/* ---------------------------------------------------------------- */

export function ExerciseIntro({ children, onStart }: { children?: ReactNode; onStart?: () => void }) {
  const ex = useExercise()
  const go = useGame((s) => s.go)
  const ch = ex.chapter ? CHAPTER_BY_ID[ex.chapter] : null
  if (ex.phase !== 'intro' || !ch) return null

  return (
    <Modal>
      <div className="intro-head" style={{ borderColor: ch.color }}>
        <span className="intro-icon">{ch.icon}</span>
        <div>
          <div className="intro-n" style={{ color: ch.color }}>
            Chapitre {ch.n}
          </div>
          <h2 className="intro-title">{ch.title}</h2>
        </div>
      </div>

      <p className="intro-goal">{ch.goal}</p>
      {children}

      <div className="intro-obj">
        <b>Objectif</b>
        {ch.objective}
      </div>

      <div className="modal-actions">
        <Btn
          variant="primary"
          size="lg"
          onClick={() => {
            useExercise.getState().play()
            onStart?.()
          }}
        >
          Commencer
        </Btn>
        <Btn
          variant="ghost"
          onClick={() => {
            useExercise.getState().quit()
            useBuild.getState().resetBuild()
            go('carte')
          }}
        >
          Plus tard
        </Btn>
      </div>
    </Modal>
  )
}

/* ---------------------------------------------------------------- */
/*  Bandeau de retour (bien / pas bien)                              */
/* ---------------------------------------------------------------- */

const FB_LABEL = {
  ok: { icon: '✅', word: 'Bravo' },
  bad: { icon: '💡', word: 'Presque' },
  info: { icon: 'ℹ️', word: 'À savoir' },
} as const

/**
 * Fenêtre de correction, au centre de l'écran.
 *
 * Elle remplace l'ancien bandeau qui s'effaçait tout seul : un élève lent
 * n'avait pas le temps de le lire. Ici on montre la pièce concernée en 3D,
 * une phrase d'explication, et rien ne bouge tant que « J'ai compris »
 * n'a pas été cliqué.
 */
export function Feedback() {
  const fb = useExercise((s) => s.feedback)
  const clear = useExercise((s) => s.clearFeedback)

  // La touche Entrée (ou Espace) ferme aussi : plus rapide au clavier.
  useEffect(() => {
    if (!fb) return
    const h = (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'Escape') {
        e.preventDefault()
        clear()
      }
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [fb, clear])

  if (!fb) return null
  const l = FB_LABEL[fb.kind]

  return (
    <div className="modal-back fb-back" onClick={clear}>
      <div
        key={fb.seq}
        className={`fb card pop-in fb-${fb.kind}`}
        role="alertdialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
      >
        {(fb.part || fb.peri) && (
          <div className="fb-view">
            <PartSpinner id={fb.part} peri={fb.peri} />
          </div>
        )}

        <div className="fb-body">
          <div className="fb-kind">
            <span className="fb-icon">{l.icon}</span>
            {l.word}
          </div>
          <h2 className="fb-title">{fb.title}</h2>
          {fb.text && <p className="fb-text">{fb.text}</p>}

          <Btn variant={fb.kind === 'bad' ? 'gold' : 'primary'} size="lg" className="fb-go" onClick={clear}>
            J'ai compris
          </Btn>
        </div>
      </div>
    </div>
  )
}

/* ---------------------------------------------------------------- */
/*  Écran de fin                                                     */
/* ---------------------------------------------------------------- */

export function ExerciseEnd({ result }: { result: { stars: 0 | 1 | 2 | 3; xp: number } | null }) {
  const ex = useExercise()
  const go = useGame((s) => s.go)
  const openChapter = useGame((s) => s.openChapter)
  const results = useGame((s) => s.results)
  const ch = ex.chapter ? CHAPTER_BY_ID[ex.chapter] : null
  // La dernière correction passe d'abord : sans cela le bilan viendrait
  // se poser par-dessus une fenêtre que l'élève est en train de lire.
  const pending = !!ex.feedback

  useEffect(() => {
    if (ex.phase === 'done' && !pending) sfx.badge()
  }, [ex.phase, pending])

  if (ex.phase !== 'done' || pending || !ch || !result) return null

  const nextIdx = ch.n // les chapitres sont numérotés à partir de 1
  const next = Object.values(CHAPTER_BY_ID).find((c) => c.n === nextIdx + 1)
  const nextUnlocked = next && (!next.requires || results[next.requires]?.done)

  const msg =
    result.stars === 3
      ? 'Parfait, sans la moindre erreur !'
      : result.stars === 2
        ? 'Très bien. Encore un essai pour la troisième étoile ?'
        : 'Terminé ! Rejoue pour améliorer ton score.'

  return (
    <Modal>
      <div className="end-head">
        <Stars n={result.stars} size={44} />
        <h2 className="end-title">{msg}</h2>
      </div>

      <div className="end-stats">
        <div>
          <b>+{result.xp}</b>
          <span>XP gagnés</span>
        </div>
        <div>
          <b>{fmtTime(ex.elapsed)}</b>
          <span>temps</span>
        </div>
        <div>
          <b>{ex.mistakes}</b>
          <span>erreur{ex.mistakes > 1 ? 's' : ''}</span>
        </div>
        <div>
          <b>{ex.hints}</b>
          <span>indice{ex.hints > 1 ? 's' : ''}</span>
        </div>
      </div>

      <div className="end-learn">
        <b>Ce que tu sais faire maintenant</b>
        {ch.objective}
      </div>

      <div className="modal-actions">
        {next && nextUnlocked && (
          <Btn
            variant="primary"
            size="lg"
            onClick={() => {
              useBuild.getState().resetBuild()
              openChapter(next.id)
            }}
          >
            Chapitre suivant : {next.title} →
          </Btn>
        )}
        <Btn
          variant="ghost"
          onClick={() => {
            useBuild.getState().resetBuild()
            go('carte')
          }}
        >
          Retour au parcours
        </Btn>
      </div>
    </Modal>
  )
}

/* ---------------------------------------------------------------- */
/*  Curseur de vue éclatée                                           */
/* ---------------------------------------------------------------- */

/**
 * Le réglage le plus utilisé des ateliers, donc le plus visible :
 * une large réglette posée en haut, au centre de l'écran.
 *
 * Il vivait auparavant dans le panneau de gauche, minuscule et perdu
 * au milieu des autres outils. Les ateliers démarrent maintenant sur la
 * machine MONTÉE : c'est l'élève qui écarte les pièces quand il en a
 * besoin, et le geste doit donc sauter aux yeux.
 */
export function ExplodeSlider() {
  const explode = useBuild((s) => s.explode)
  const setBuild = useBuild((s) => s.set)

  return (
    <div className="explodebar card">
      <div className="explodebar-head">
        <span className="explodebar-icon">🎚️</span>
        <b>Vue éclatée</b>
        <span className="explodebar-pct">{Math.round(explode * 100)} %</span>
      </div>
      <input
        type="range"
        min={0}
        max={1}
        step={0.01}
        value={explode}
        aria-label="Écarter les pièces de la machine"
        onChange={(e) => setBuild({ explode: +e.target.value })}
      />
      <div className="explodebar-ends">
        <span>Machine montée</span>
        <span>Pièces écartées</span>
      </div>
    </div>
  )
}
