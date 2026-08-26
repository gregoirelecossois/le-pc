import { BADGES } from '@/data/badges'
import { CHAPTERS } from '@/data/chapters'
import { isUnlocked, useGame } from '@/state/useGame'
import { Btn, Stars, XpBar } from './bits'
import { sheetUnlocked } from './RevisionSheet'
import { sfx } from '@/audio/sfx'

export function ChapterMap() {
  const results = useGame((s) => s.results)
  const badges = useGame((s) => s.badges)
  const openChapter = useGame((s) => s.openChapter)
  const go = useGame((s) => s.go)
  const pseudo = useGame((s) => s.pseudo)

  const doneCount = CHAPTERS.filter((c) => results[c.id]?.done).length
  // La fiche récapitule le parcours : elle n'a de sens qu'à la fin.
  const ficheOk = sheetUnlocked(results)

  return (
    <div className="map fade-up">
      <div className="map-head">
        <div>
          <h2 className="map-title">Ton parcours</h2>
          <p className="muted" style={{ margin: '4px 0 0' }}>
            {pseudo ? `${pseudo} — ` : ''}
            {doneCount} chapitre{doneCount > 1 ? 's' : ''} terminé{doneCount > 1 ? 's' : ''} sur {CHAPTERS.length}
          </p>
        </div>
        <div className="spacer" />
        <XpBar />
      </div>

      <div className="map-grid scroll">
        {CHAPTERS.map((c) => {
          const r = results[c.id]
          const unlocked = isUnlocked(c.id, results)
          return (
            <button
              key={c.id}
              className={`chapcard ${unlocked ? '' : 'locked'} ${r?.done ? 'done' : ''}`}
              style={{ '--chap': c.color } as React.CSSProperties}
              disabled={!unlocked}
              onClick={() => {
                sfx.click()
                openChapter(c.id)
              }}
            >
              <div className="chapcard-top">
                <span className="chapcard-n">{c.n}</span>
                <span className="chapcard-icon">{unlocked ? c.icon : '🔒'}</span>
                {r?.done && <Stars n={r.stars} size={15} />}
              </div>
              <div className="chapcard-title">{c.title}</div>
              <div className="chapcard-sub">{c.subtitle}</div>
              <div className="chapcard-foot">
                {unlocked ? (
                  <>
                    <span className="pill" style={{ borderColor: c.color, color: c.color }}>
                      {r?.done ? 'Rejouer' : 'Jouer'}
                    </span>
                    <span className="faint">≈ {c.minutes} min · {c.xp} XP</span>
                  </>
                ) : (
                  <span className="faint">Termine le chapitre {c.n - 1} pour débloquer</span>
                )}
              </div>
            </button>
          )
        })}
      </div>

      <div className="map-foot">
        <Btn variant="ghost" onClick={() => go('badges')}>
          🏅 Badges ({badges.length}/{BADGES.length})
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
        <div className="spacer" />
        <Btn variant="ghost" size="sm" onClick={() => go('accueil')}>
          ← Accueil
        </Btn>
      </div>
    </div>
  )
}

export function BadgesScreen() {
  const badges = useGame((s) => s.badges)
  const go = useGame((s) => s.go)

  return (
    <div className="map fade-up">
      <div className="map-head">
        <div>
          <h2 className="map-title">Tes badges</h2>
          <p className="muted" style={{ margin: '4px 0 0' }}>
            {badges.length} sur {BADGES.length} débloqués
          </p>
        </div>
      </div>

      <div className="badge-grid scroll">
        {BADGES.map((b) => {
          const got = badges.includes(b.id)
          return (
            <div key={b.id} className={`badgecard ${got ? 'got' : ''}`} style={{ '--bc': b.color } as React.CSSProperties}>
              <div className="badgecard-icon">{got ? b.icon : '🔒'}</div>
              <div className="badgecard-name">{b.name}</div>
              <div className="badgecard-how">{b.how}</div>
            </div>
          )
        })}
      </div>

      <div className="map-foot">
        <Btn variant="ghost" onClick={() => go('carte')}>
          ← Retour au parcours
        </Btn>
      </div>
    </div>
  )
}
