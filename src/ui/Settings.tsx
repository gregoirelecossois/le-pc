import { useState } from 'react'
import { useGame, type Quality } from '@/state/useGame'
import { Btn, Modal } from './bits'

const QUALITIES: [Quality, string][] = [
  ['tresbas', 'Très basse'],
  ['bas', 'Basse'],
  ['moyen', 'Moyenne'],
  ['eleve', 'Élevée'],
]

export function SettingsButton() {
  const [open, setOpen] = useState(false)
  const sound = useGame((s) => s.sound)
  const quality = useGame((s) => s.quality)
  const setSound = useGame((s) => s.setSound)
  const setQuality = useGame((s) => s.setQuality)
  const reset = useGame((s) => s.reset)
  const [confirm, setConfirm] = useState(false)

  return (
    <>
      <button className="settings-fab" onClick={() => setOpen(true)} aria-label="Réglages" title="Réglages">
        ⚙️
      </button>

      {open && (
        <Modal onClose={() => setOpen(false)}>
          <h2 className="intro-title" style={{ marginTop: 0 }}>
            Réglages
          </h2>

          <div className="set-row">
            <div>
              <b>Sons</b>
              <p className="faint">Clics, encliquetages, réussites.</p>
            </div>
            <button className={`switch ${sound ? 'on' : ''}`} onClick={() => setSound(!sound)} aria-pressed={sound}>
              <span />
            </button>
          </div>

          <div className="set-row">
            <div>
              <b>Qualité d'affichage</b>
              <p className="faint">
                Baisse-la si la 3D saccade sur les postes de la salle : « Très basse » est la plus légère.
              </p>
            </div>
            <div className="row">
              {QUALITIES.map(([q, label]) => (
                <button key={q} className={`btn btn-sm ${quality === q ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setQuality(q)}>
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="set-row">
            <div>
              <b>Effacer ma progression</b>
              <p className="faint">Remet le parcours à zéro sur cet ordinateur.</p>
            </div>
            {confirm ? (
              <div className="row">
                <Btn
                  size="sm"
                  onClick={() => {
                    reset()
                    setConfirm(false)
                    setOpen(false)
                  }}
                >
                  Confirmer
                </Btn>
                <Btn size="sm" variant="ghost" onClick={() => setConfirm(false)}>
                  Annuler
                </Btn>
              </div>
            ) : (
              <Btn size="sm" variant="ghost" onClick={() => setConfirm(true)}>
                Effacer
              </Btn>
            )}
          </div>

          <p className="faint" style={{ fontSize: 12, marginTop: 18, lineHeight: 1.5 }}>
            Le jeu fonctionne entièrement dans le navigateur. Rien n'est envoyé
            sur Internet et aucune donnée personnelle n'est collectée.
          </p>

          <div className="row" style={{ marginTop: 18 }}>
            <Btn variant="primary" onClick={() => setOpen(false)}>
              Fermer
            </Btn>
          </div>
        </Modal>
      )}
    </>
  )
}
