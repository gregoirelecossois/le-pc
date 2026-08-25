import { useState } from 'react'
import { CHAPTERS } from '@/data/chapters'
import { COMPONENT_IDS } from '@/data/components'
import { useGame } from '@/state/useGame'
import { Btn, XpBar } from './bits'
import { sfx } from '@/audio/sfx'

export function Home() {
  const pseudo = useGame((s) => s.pseudo)
  const setPseudo = useGame((s) => s.setPseudo)
  const go = useGame((s) => s.go)
  const results = useGame((s) => s.results)
  const discovered = useGame((s) => s.discovered)
  const xp = useGame((s) => s.xp)
  const [name, setName] = useState(pseudo)

  const done = CHAPTERS.filter((c) => results[c.id]?.done).length
  const started = xp > 0 || done > 0

  const start = () => {
    setPseudo(name.trim() || 'Élève')
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
          Ouvre la tour, reconnais chaque composant, remets-les à leur place —
          puis va démonter une vraie machine en classe.
        </p>

        <ul className="home-points">
          <li>
            <b>13</b> composants en 3D
          </li>
          <li>
            <b>9</b> exercices progressifs
          </li>
          <li>
            <b>12</b> badges à décrocher
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
              <div className="row" style={{ marginTop: 16 }}>
                <Btn variant="primary" size="lg" onClick={() => go('carte')}>
                  Continuer →
                </Btn>
                <Btn variant="ghost" onClick={() => go('fiche')}>
                  Fiche de révision
                </Btn>
              </div>
            </>
          ) : (
            <>
              <label className="home-label" htmlFor="pseudo">
                Ton prénom (il reste sur cet ordinateur)
              </label>
              <div className="row">
                <input
                  id="pseudo"
                  className="input"
                  value={name}
                  maxLength={24}
                  placeholder="Ex. Camille"
                  onChange={(e) => setName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && start()}
                />
                <Btn variant="primary" size="lg" onClick={start}>
                  C'est parti !
                </Btn>
              </div>
              <p className="home-privacy">
                Aucune donnée n'est envoyée sur Internet : ta progression est
                enregistrée uniquement dans ce navigateur.
              </p>
            </>
          )}
        </div>
      </div>

      <div className="home-hint">
        <span>🖱️</span> Fais tourner la machine : clic gauche pour pivoter, molette pour zoomer
      </div>
    </div>
  )
}
