/** Petits composants d'interface réutilisés partout. */

import { useEffect, type ReactNode } from 'react'
import { useGame, useLevel } from '@/state/useGame'
import { sfx } from '@/audio/sfx'

/* ---------------------------------------------------------------- */
/*  Étoiles                                                          */
/* ---------------------------------------------------------------- */

export function Stars({ n, size = 18 }: { n: number; size?: number }) {
  return (
    <span className="stars" style={{ fontSize: size }} aria-label={`${n} étoile${n > 1 ? 's' : ''} sur 3`}>
      {[1, 2, 3].map((i) => (
        <span key={i} className={i <= n ? 'star on' : 'star'}>
          ★
        </span>
      ))}
    </span>
  )
}

/* ---------------------------------------------------------------- */
/*  Barre d'expérience                                               */
/* ---------------------------------------------------------------- */

export function XpBar({ compact = false }: { compact?: boolean }) {
  const lvl = useLevel()
  const xp = useGame((s) => s.xp)
  return (
    <div className={`xpbar ${compact ? 'compact' : ''}`}>
      <div className="xpbar-head">
        <span className="xpbar-icon">{lvl.icon}</span>
        <span className="xpbar-title">{lvl.title}</span>
        <span className="xpbar-xp">{xp} XP</span>
      </div>
      <div className="xpbar-track">
        <div className="xpbar-fill" style={{ width: `${Math.round(lvl.progress * 100)}%` }} />
      </div>
      {!compact && lvl.next && (
        <div className="xpbar-next">Encore {lvl.toNext} XP pour devenir {lvl.next.title}</div>
      )}
    </div>
  )
}

/* ---------------------------------------------------------------- */
/*  Notifications                                                    */
/* ---------------------------------------------------------------- */

export function Toasts() {
  const toasts = useGame((s) => s.toasts)
  const drop = useGame((s) => s.dropToast)

  useEffect(() => {
    if (!toasts.length) return
    const t = setTimeout(() => drop(toasts[0].id), 2600)
    return () => clearTimeout(t)
  }, [toasts, drop])

  return (
    <div className="toasts">
      {toasts.map((t) => (
        <div key={t.id} className={`toast toast-${t.kind} pop-in`}>
          {t.icon && <span className="toast-icon">{t.icon}</span>}
          <span>{t.text}</span>
        </div>
      ))}
    </div>
  )
}

/* ---------------------------------------------------------------- */
/*  Fenêtre modale                                                   */
/* ---------------------------------------------------------------- */

export function Modal({
  children,
  onClose,
  wide = false,
  labelledBy,
}: {
  children: ReactNode
  onClose?: () => void
  wide?: boolean
  labelledBy?: string
}) {
  useEffect(() => {
    if (!onClose) return
    const h = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [onClose])

  return (
    <div className="modal-back" onClick={onClose}>
      <div
        className={`modal card pop-in ${wide ? 'wide' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  )
}

/* ---------------------------------------------------------------- */
/*  Bouton avec son                                                  */
/* ---------------------------------------------------------------- */

export function Btn({
  children,
  onClick,
  variant = '',
  size = '',
  disabled,
  title,
  className = '',
}: {
  children: ReactNode
  onClick?: () => void
  variant?: '' | 'primary' | 'gold' | 'ghost'
  size?: '' | 'lg' | 'sm'
  disabled?: boolean
  title?: string
  className?: string
}) {
  return (
    <button
      className={`btn ${variant ? `btn-${variant}` : ''} ${size ? `btn-${size}` : ''} ${className}`}
      disabled={disabled}
      title={title}
      onClick={() => {
        if (disabled) return
        sfx.click()
        onClick?.()
      }}
    >
      {children}
    </button>
  )
}

/* ---------------------------------------------------------------- */
/*  Compteurs de l'exercice en cours                                 */
/* ---------------------------------------------------------------- */

export function Counter({ icon, value, label, tone }: { icon: string; value: string | number; label: string; tone?: string }) {
  return (
    <div className="counter" style={tone ? { borderColor: tone } : undefined}>
      <span className="counter-icon">{icon}</span>
      <span className="counter-value">{value}</span>
      <span className="counter-label">{label}</span>
    </div>
  )
}

/** mm:ss */
export function fmtTime(sec: number) {
  const m = Math.floor(sec / 60)
  const s = Math.floor(sec % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}
