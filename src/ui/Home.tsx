import { useState } from 'react'
import { BADGES } from '@/data/badges'
import { CHAPTERS } from '@/data/chapters'
import { COMPONENT_IDS } from '@/data/components'
import { useGame } from '@/state/useGame'
import { Btn, XpBar } from './bits'
import { sheetUnlocked } from './RevisionSheet'
import { DevUnlock } from './DevKit'
import { sfx } from '@/audio/sfx'

export function Home() {
  const pseudo = useGame((s) => s.pseudo)
  const setPseudo = useGame((s) => s.setPseudo)
  const go = useGame((s) => s.go)
  const results = useGame((s) => s.results)
  const discovered = useGame((s) => s.discovered)
  const xp = useGame((s) => s.xp)
  const [name, setName] = useState(pseudo)
  const [newName, setNewName] = useState('')

  const done = CHAPTERS.filter((c) => results[c.id]?.done).length
  const ficheOk = sheetUnlocked(results)
  /** Vrai quand on repart de zéro pour un autre élève sur le même poste. */
  const [asking, setAsking] = useState(false)
  const started = (xp > 0 || done > 0) && !asking

  const start = () => {
    setPseudo(name.trim() || 'Élève')
    sfx.success()
    go('carte')
  }

  const switchUser = () => {
    // On efface la progression : sinon le nouvel élève hériterait des
    // chapitres, des XP et des badges du précédent.
    useGame.getState().reset()
    setPseudo(newName.trim() || 'Élève')
    sfx.success()
    go('carte')
  }

  return (
    <div className="home fade-up">
      <div className="home-left">
        <div className="home-badge">Technologie · collège</div>
        <h1 className="home-title">
          Le&nbsp;<span>PC</span>
        </h1>
        <p className="home-tagline">
          Ouvre la tour, reconnais chaque composant, remets-les à leur place.
        </p>

        <ul className="home-points">
          <li>
            <b>{COMPONENT_IDS.length}</b> composants en 3D
          </li>
          <li>
            <b>{CHAPTERS.length}</b> exercices progressifs
          </li>
          <li>
            <b>{BADGES.length}</b> badges à décrocher
          </li>
        </ul>

        <div className="card home-card">
          {started ? (
            <>
              <div className="home-welcome">
                Bon retour{pseudo ? `, ${pseudo}` : ''} !
              </div>
              <XpBar />
              <div className="home-stats">
                <span>
                  {done}/{CHAPTERS.length} chapitres
                </span>
                <span>
                  {discovered.length}/{COMPONENT_IDS.length} fiches découvertes
                </span>
              </div>
              <div className="modal-actions">
                <Btn variant="primary" size="lg" onClick={() => go('carte')}>
                  Continuer →
                </Btn>
                <Btn
                  variant="ghost"
                  disabled={!ficheOk}
                  title={
                    ficheOk
                      ? 'Ta leçon illustrée, à emporter'
                      : `Termine les ${CHAPTERS.length} ateliers pour débloquer ta fiche`
                  }
                  onClick={() => go('fiche')}
                >
                  {ficheOk ? '📄' : '🔒'} Fiche de révision
                </Btn>
              </div>
              {/* Poste partagé : un autre élève doit pouvoir repartir de zéro
                  sans que la progression du précédent se mélange à la sienne. */}
              <button className="home-switch" onClick={() => setAsking(true)}>
                👤 Ce n'est pas toi ? Changer d'utilisateur
              </button>
            </>
          ) : (
            <>
              <label className="home-label" htmlFor="pseudo">
                {asking ? 'Le prénom du nouvel élève' : 'Ton prénom (il reste sur cet ordinateur)'}
              </label>
              <div className="row">
                <input
                  id="pseudo"
                  className="input"
                  value={asking ? newName : name}
                  maxLength={24}
                  placeholder="Ex. Camille"
                  onChange={(e) => (asking ? setNewName : setName)(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (asking ? switchUser() : start())}
                />
                <Btn variant="primary" size="lg" onClick={asking ? switchUser : start}>
                  C'est parti !
                </Btn>
              </div>

              {asking && (
                <>
                  <p className="home-warn">
                    ⚠️ La progression de <b>{pseudo || 'l’élève précédent'}</b> ({done}/
                    {CHAPTERS.length} chapitres, {xp} XP) sera effacée de cet ordinateur.
                  </p>
                  <button
                    className="home-switch"
                    onClick={() => {
                      setNewName('')
                      setAsking(false)
                    }}
                  >
                    ← Finalement, c'est bien moi
                  </button>
                </>
              )}
              <p className="home-privacy">
                Aucune donnée n'est envoyée sur Internet : ta progression est
                enregistrée uniquement dans ce navigateur.
              </p>
            </>
          )}
        </div>
      </div>

      <DevUnlock />

      <div className="home-hint">
        <span>🖱️</span> Fais tourner la machine : clic gauche pour pivoter, molette pour zoomer
      </div>
    </div>
  )
}
