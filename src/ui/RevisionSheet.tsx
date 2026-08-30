/**
 * La leçon à emporter.
 *
 * Elle ne s'ouvre qu'une fois les neuf ateliers terminés : c'est la
 * récompense du parcours, et son contenu n'a de sens qu'après l'avoir
 * vécu. À l'écran, l'élève la relit ; le bouton en haut lui fabrique le
 * PDF à conserver (les postes de la salle n'ont pas d'imprimante).
 */

import { useState } from 'react'
import { BADGES } from '@/data/badges'
import { CHAPTERS } from '@/data/chapters'
import { COMPONENT_IDS } from '@/data/components'
import { LESSON_COMPONENTS, LESSON_PERIPHERALS, lessonShotQueue } from '@/data/lesson'
import { PERIPHERALS } from '@/data/peripherals'
import { useGame, useLevel } from '@/state/useGame'
import { ThumbnailStudio, useThumbShots } from '@/three/Thumbnails'
import { Btn, Stars } from './bits'
import { downloadPdf } from './pdf'
import { buildRevisionPdf, ink } from './sheetPdf'

const QUEUE = lessonShotQueue()

/** Tous les ateliers sont-ils terminés ? */
export function sheetUnlocked(results: ReturnType<typeof useGame.getState>['results']) {
  return CHAPTERS.every((c) => results[c.id]?.done)
}

export function RevisionSheet() {
  const go = useGame((s) => s.go)
  const pseudo = useGame((s) => s.pseudo)
  const badges = useGame((s) => s.badges)
  const results = useGame((s) => s.results)
  const xp = useGame((s) => s.xp)
  const lvl = useLevel()
  const { shots, done, total, ready } = useThumbShots()
  const [saved, setSaved] = useState(false)

  const unlocked = sheetUnlocked(results)

  /* ---- Verrou : la fiche récapitule ce que l'élève a fait ---- */

  if (!unlocked) {
    const left = CHAPTERS.filter((c) => !results[c.id]?.done)
    return (
      <div className="sheet-screen">
        <div className="sheet-bar">
          <Btn variant="ghost" onClick={() => go('carte')}>
            ← Retour au parcours
          </Btn>
        </div>
        <div className="sheet-locked card">
          <div className="sheet-locked-icon">🔒</div>
          <h2>Ta fiche de révision n'est pas encore prête</h2>
          <p>
            Elle se débloque quand les <b>{CHAPTERS.length} ateliers</b> sont terminés. C'est
            elle qui rassemble tout ce que tu auras appris, en deux leçons illustrées.
          </p>
          <div className="sheet-locked-list">
            {left.map((c) => (
              <span key={c.id} className="pill" style={{ borderColor: c.color, color: c.color }}>
                {c.n}. {c.title}
              </span>
            ))}
          </div>
          <p className="faint">
            Encore {left.length} atelier{left.length > 1 ? 's' : ''} à terminer.
          </p>
          <Btn variant="primary" size="lg" onClick={() => go('carte')}>
            Continuer le parcours →
          </Btn>
        </div>
      </div>
    )
  }

  /* ---- La leçon ---- */

  const save = () => {
    const blob = buildRevisionPdf({
      pseudo,
      xp,
      results,
      badgeCount: badges.length,
      badgeTotal: BADGES.length,
      levelTitle: lvl.title,
      shots,
    })
    const who = pseudo ? '-' + pseudo.normalize('NFD').replace(/[^a-zA-Z0-9]/g, '') : ''
    downloadPdf(blob, `lecon-le-pc${who}.pdf`)
    setSaved(true)
  }

  return (
    <div className="sheet-screen">
      {/* Le studio photo : il tourne le temps de saisir les modèles 3D. */}
      <ThumbnailStudio queue={QUEUE} />

      <div className="sheet-bar">
        <Btn variant="ghost" onClick={() => go('carte')}>
          ← Retour au parcours
        </Btn>
        <div className="spacer" />
        {!ready && (
          <span className="faint sheet-prep">
            Préparation des images… {done} / {total}
          </span>
        )}
        <Btn variant="primary" disabled={!ready} onClick={save}>
          {saved ? '✅ PDF enregistré' : '📄 Télécharger la leçon (PDF)'}
        </Btn>
      </div>

      <div className="sheet scroll">
        <header className="lesson-head">
          <h1>Les composants et les périphériques du PC</h1>
          <p>{pseudo ? `Fiche de révision de ${pseudo}` : 'Fiche de révision'} · Technologie</p>
        </header>

        {/* ---------------- Leçon 1 ---------------- */}

        <div className="lesson-banner l1">Leçon 1A — Les composants du PC</div>
        <p className="lesson-intro">
          L'unité centrale est la « tour » de l'ordinateur. À l'intérieur, chaque pièce a un
          rôle précis : voici comment les reconnaître et à quoi chacune sert.
        </p>

        <div className="lesson-cards">
          {LESSON_COMPONENTS.map((e) => {
            const img = shots[e.shot]
            return (
              <article
                key={e.id}
                className="lcard"
                // Les couleurs vives du jeu sont pensées sur fond noir : sur
                // la feuille blanche, on prend les mêmes que le PDF.
                style={{ '--c': ink(e.color) } as React.CSSProperties}
              >
                <div className="lcard-img">
                  {img ? <img src={img.url} alt="" /> : <span className="lcard-wait" />}
                </div>
                <div className="lcard-body">
                  <div className="lcard-top">
                    <h3>{e.title}</h3>
                    <span className="lcard-chip">{e.label}</span>
                  </div>
                  <p className="lcard-role">{e.role}</p>
                  <p className="lcard-memo">{e.memo}</p>
                </div>
              </article>
            )
          })}
        </div>

        {/* ---------------- Leçon 2 ---------------- */}

        <div className="lesson-banner l2">Leçon 2A — Les périphériques principaux du PC</div>
        <p className="lesson-intro">
          Un périphérique est un appareil branché AUTOUR de l'unité centrale. Il est
          d'<b>entrée</b> quand il envoie de l'information à l'ordinateur, de <b>sortie</b>{' '}
          quand il en reçoit pour te la restituer, et parfois les deux à la fois.
        </p>

        <div className="lesson-cards">
          {LESSON_PERIPHERALS.map((e) => {
            const img = shots[e.shot]
            return (
              <article key={e.id} className={`lcard k-${e.kind}`}>
                <div className="lcard-img">
                  {img ? <img src={img.url} alt="" /> : <span className="lcard-wait" />}
                </div>
                <div className="lcard-body">
                  <div className="lcard-top">
                    <h3>{e.title}</h3>
                    <span className="lcard-chip">{e.label}</span>
                  </div>
                  <p className="lcard-role">{e.role}</p>
                  <p className="lcard-memo">{e.memo}</p>
                </div>
              </article>
            )
          })}
        </div>

        {/* ---------------- Progression ---------------- */}

        <div className="lesson-banner l3">Ma progression</div>
        <div className="lesson-prog">
          <div>
            <h3>Les ateliers</h3>
            <ul>
              {CHAPTERS.map((c) => (
                <li key={c.id}>
                  <span>
                    {c.n}. {c.title}
                  </span>
                  <Stars n={results[c.id]?.stars ?? 0} size={13} />
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3>Mon bilan</h3>
            <ul>
              <li>
                <span>Niveau atteint</span>
                <b>{lvl.title}</b>
              </li>
              <li>
                <span>Expérience</span>
                <b>{xp} XP</b>
              </li>
              <li>
                <span>Badges décrochés</span>
                <b>
                  {badges.length} / {BADGES.length}
                </b>
              </li>
              <li>
                <span>Composants étudiés</span>
                <b>{COMPONENT_IDS.length}</b>
              </li>
              <li>
                <span>Périphériques étudiés</span>
                <b>{PERIPHERALS.length}</b>
              </li>
            </ul>
          </div>
        </div>

        <div className="lesson-safety">
          <b>À retenir avant de démonter une vraie machine</b>
          <p>
            On débranche la prise murale, on se décharge de l'électricité statique en touchant
            le métal du boîtier, on tient les cartes par les bords, et on ne force jamais : si
            ça ne rentre pas, c'est que ce n'est pas dans le bon sens.
          </p>
        </div>
      </div>
    </div>
  )
}
