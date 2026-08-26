/**
 * Raccourcis d'enseignant.
 *
 * Préparer une séance, montrer un atelier au vidéoprojecteur ou vérifier
 * une correction ne doit pas obliger à rejouer tout le parcours. Un bouton
 * discret sur l'accueil, un code, et on se rend où on veut.
 *
 * Ce n'est PAS un secret protégé : c'est un garde-fou pour que la classe
 * ne saute pas les chapitres par hasard.
 */

import { useState } from 'react'
import { CHAPTERS, type ChapterId } from '@/data/chapters'
import { useGame, type Screen } from '@/state/useGame'
import { useBuild } from '@/state/useBuild'
import { useExercise } from '@/game/useExercise'
import { Btn, Modal } from './bits'
import { sfx } from '@/audio/sfx'

const CODE = 'dev35'

/* ---------------------------------------------------------------- */
/*  Le bouton discret de l'accueil                                   */
/* ---------------------------------------------------------------- */

export function DevUnlock() {
  const dev = useGame((s) => s.dev)
  const setDev = useGame((s) => s.setDev)
  const toast = useGame((s) => s.toast)
  const [open, setOpen] = useState(false)
  const [code, setCode] = useState('')
  const [wrong, setWrong] = useState(false)

  const submit = () => {
    if (code.trim().toLowerCase() !== CODE) {
      setWrong(true)
      return
    }
    setDev(true)
    setOpen(false)
    setCode('')
    setWrong(false)
    sfx.success()
    toast({ kind: 'info', icon: '🛠️', text: 'Raccourcis enseignant activés' })
  }

  // Déjà déverrouillé : le bouton 🛠️ flottant prend le relais.
  if (dev) return null

  return (
    <>
      <button
        className="devdot"
        title="Accès enseignant"
        aria-label="Accès enseignant"
        onClick={() => setOpen(true)}
      >
        ·
      </button>

      {open && (
        <Modal onClose={() => setOpen(false)}>
          <h2 className="intro-title" style={{ marginTop: 0 }}>
            Accès enseignant
          </h2>
          <p className="faint" style={{ marginTop: 0, lineHeight: 1.5 }}>
            Ce code ouvre les raccourcis de préparation : aller directement à
            n'importe quel atelier, débloquer le parcours pour une
            démonstration.
          </p>
          <div className="row" style={{ marginTop: 14 }}>
            <input
              className="input"
              autoFocus
              type="password"
              value={code}
              placeholder="Code"
              onChange={(e) => {
                setCode(e.target.value)
                setWrong(false)
              }}
              onKeyDown={(e) => e.key === 'Enter' && submit()}
            />
            <Btn variant="primary" onClick={submit}>
              Valider
            </Btn>
          </div>
          {wrong && (
            <p style={{ color: 'var(--bad)', fontSize: 13, marginBottom: 0 }}>
              Ce n'est pas le bon code.
            </p>
          )}
        </Modal>
      )}
    </>
  )
}

/* ---------------------------------------------------------------- */
/*  Le panneau de navigation, disponible partout                     */
/* ---------------------------------------------------------------- */

/** Quitte proprement l'atelier en cours avant de changer d'écran. */
function leaveExercise() {
  useExercise.getState().quit()
  useBuild.getState().resetBuild()
}

const SCREENS: { id: Screen; label: string }[] = [
  { id: 'accueil', label: 'Accueil' },
  { id: 'carte', label: 'Parcours' },
  { id: 'badges', label: 'Badges' },
  { id: 'fiche', label: 'Fiche' },
]

export function DevPanel() {
  const dev = useGame((s) => s.dev)
  const chapter = useGame((s) => s.chapter)
  const screen = useGame((s) => s.screen)
  const [open, setOpen] = useState(false)

  if (!dev) return null

  const goScreen = (id: Screen) => {
    leaveExercise()
    useGame.getState().go(id)
    setOpen(false)
  }

  const goChapter = (id: ChapterId) => {
    leaveExercise()
    useGame.getState().openChapter(id)
    setOpen(false)
  }

  return (
    <>
      <button
        className="devfab"
        title="Raccourcis enseignant"
        aria-label="Raccourcis enseignant"
        onClick={() => setOpen((v) => !v)}
      >
        🛠️
      </button>

      {open && (
        <Modal onClose={() => setOpen(false)} wide>
          <h2 className="intro-title" style={{ marginTop: 0 }}>
            🛠️ Raccourcis enseignant
          </h2>

          <div className="devgrid-label">Écrans</div>
          <div className="devgrid">
            {SCREENS.map((s) => (
              <button
                key={s.id}
                className={`devjump ${screen === s.id ? 'cur' : ''}`}
                onClick={() => goScreen(s.id)}
              >
                {s.label}
              </button>
            ))}
          </div>

          <div className="devgrid-label">Ateliers</div>
          <div className="devgrid">
            {CHAPTERS.map((c) => (
              <button
                key={c.id}
                className={`devjump ${screen === 'jeu' && chapter === c.id ? 'cur' : ''}`}
                style={{ '--c': c.color } as React.CSSProperties}
                onClick={() => goChapter(c.id)}
              >
                <span className="devjump-n">{c.n}</span>
                {c.icon} {c.title}
              </button>
            ))}
          </div>

          <div className="devgrid-label">Progression</div>
          <div className="devgrid">
            <button
              className="devjump"
              onClick={() => {
                useGame.getState().devCompleteAll()
                useGame.getState().toast({ kind: 'info', icon: '✅', text: 'Parcours marqué comme terminé' })
              }}
            >
              ✅ Tout terminer
            </button>
            <button
              className="devjump"
              onClick={() => {
                useGame.getState().reset()
                useGame.getState().setDev(true)
                setOpen(false)
              }}
            >
              ♻️ Remettre à zéro
            </button>
            <button
              className="devjump"
              onClick={() => {
                useGame.getState().setDev(false)
                setOpen(false)
              }}
            >
              🔒 Quitter le mode enseignant
            </button>
          </div>
        </Modal>
      )}
    </>
  )
}
