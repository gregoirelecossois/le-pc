import { CATEGORY_LABEL, COMPONENTS, type ComponentId } from '@/data/components'
import { Btn } from './bits'

export function InfoCard({
  id,
  onClose,
  onNext,
  compact = false,
}: {
  id: ComponentId
  onClose?: () => void
  onNext?: () => void
  compact?: boolean
}) {
  const c = COMPONENTS[id]
  return (
    <aside className={`infocard card fade-up ${compact ? 'compact' : ''}`} style={{ '--c': c.color } as React.CSSProperties}>
      <div className="infocard-head">
        <div>
          <span className="pill" style={{ borderColor: c.color, color: c.color }}>
            {CATEGORY_LABEL[c.category]}
          </span>
          <h3 className="infocard-title">{c.name}</h3>
          {c.acronym && <span className="infocard-acronym">on dit aussi « {c.acronym} »</span>}
        </div>
        {onClose && (
          <button className="infocard-close" onClick={onClose} aria-label="Fermer la fiche">
            ×
          </button>
        )}
      </div>

      <div className="infocard-body scroll">
        <p className="infocard-role">{c.role}</p>

        <div className="infocard-analogy">
          <span>💡</span>
          <p>{c.analogy}</p>
        </div>

        <ul className="infocard-details">
          {c.details.map((d, i) => (
            <li key={i}>{d}</li>
          ))}
        </ul>

        <div className="infocard-block infocard-hands">
          <b>🔧 Sur une vraie machine</b>
          <p>{c.handling}</p>
        </div>

        <div className="infocard-block infocard-fun">
          <b>🤯 Le sais-tu ?</b>
          <p>{c.funFact}</p>
        </div>
      </div>

      {onNext && (
        <div className="infocard-foot">
          <Btn variant="primary" onClick={onNext}>
            Composant suivant →
          </Btn>
        </div>
      )}
    </aside>
  )
}
