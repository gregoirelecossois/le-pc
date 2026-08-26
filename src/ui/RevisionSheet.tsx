/**
 * Fiche de révision imprimable.
 * C'est le document que l'élève garde — et celui qu'on emmène
 * devant la vraie unité centrale en classe.
 */

import { BADGES } from '@/data/badges'
import { CABLES } from '@/data/cables'
import { CHAPTERS } from '@/data/chapters'
import {
  CATEGORY_LABEL,
  COMPONENTS,
  DISASSEMBLY_IDS,
  INSTALLABLE_IDS,
  COMPONENT_IDS,
} from '@/data/components'
import { KIND_LABEL, PERIPHERALS } from '@/data/peripherals'
import { useGame, useLevel } from '@/state/useGame'
import { Btn, Stars } from './bits'

export function RevisionSheet() {
  const go = useGame((s) => s.go)
  const pseudo = useGame((s) => s.pseudo)
  const badges = useGame((s) => s.badges)
  const results = useGame((s) => s.results)
  const discovered = useGame((s) => s.discovered)
  const lvl = useLevel()

  const today = new Date().toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

  return (
    <div className="sheet-screen">
      <div className="sheet-bar no-print">
        <Btn variant="ghost" onClick={() => go('carte')}>
          ← Retour au parcours
        </Btn>
        <div className="spacer" />
        <Btn variant="primary" onClick={() => window.print()}>
          🖨️ Imprimer la fiche
        </Btn>
      </div>

      <div className="sheet scroll">
        <header className="sheet-head">
          <div>
            <h1>Fiche de révision — L'unité centrale</h1>
            <p className="sheet-sub">
              Les composants d'un ordinateur de bureau, leur place et leur rôle
            </p>
          </div>
          <div className="sheet-id">
            <div>
              <b>Nom :</b> {pseudo || '.'.repeat(24)}
            </div>
            <div>
              <b>Date :</b> {today}
            </div>
            <div>
              <b>Niveau :</b> {lvl.icon} {lvl.title}
            </div>
          </div>
        </header>

        {/* ------------------------------------------------ */}
        <section>
          <h2>1. Les composants de l'unité centrale</h2>
          <table className="sheet-table">
            <thead>
              <tr>
                <th>Composant</th>
                <th>Famille</th>
                <th>À quoi ça sert</th>
                <th>Où c'est placé</th>
              </tr>
            </thead>
            <tbody>
              {COMPONENT_IDS.map((id) => {
                const c = COMPONENTS[id]
                return (
                  <tr key={id}>
                    <td>
                      <b>{c.shortName}</b>
                      {c.acronym && <span className="sheet-acr"> ({c.acronym})</span>}
                    </td>
                    <td className="sheet-cat">{CATEGORY_LABEL[c.category]}</td>
                    <td>{c.role}</td>
                    <td className="sheet-small">{c.analogy}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </section>

        {/* ------------------------------------------------ */}
        <section>
          <h2>2. L'ordre de montage (et l'ordre inverse pour démonter)</h2>
          <div className="sheet-cols">
            <div>
              <h3>Montage</h3>
              <ol className="sheet-ol">
                {INSTALLABLE_IDS.map((id) => (
                  <li key={id}>{COMPONENTS[id].shortName}</li>
                ))}
              </ol>
            </div>
            <div>
              <h3>Démontage</h3>
              <ol className="sheet-ol">
                {DISASSEMBLY_IDS.map((id) => (
                  <li key={id}>{COMPONENTS[id].shortName}</li>
                ))}
              </ol>
            </div>
          </div>
          <p className="sheet-note">
            <b>Règle d'or :</b> on ne retire jamais une pièce qui en soutient une
            autre. Le ventirad avant le processeur, la carte graphique avant la
            carte mère.
          </p>
        </section>

        {/* ------------------------------------------------ */}
        <section>
          <h2>3. Les câbles internes</h2>
          <table className="sheet-table">
            <thead>
              <tr>
                <th>Câble</th>
                <th>De … vers …</th>
                <th>Comment le reconnaître</th>
              </tr>
            </thead>
            <tbody>
              {CABLES.map((c) => (
                <tr key={c.id}>
                  <td>
                    <b>{c.name}</b>
                  </td>
                  <td className="sheet-small">
                    {c.fromLabel} → {c.to === 'sataMb' ? 'Carte mère (SATA)' : c.to === 'pcie8' ? 'Carte graphique' : c.to === 'sataPower' ? 'Disque dur' : 'Carte mère'}
                  </td>
                  <td className="sheet-small">{c.recognise}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        {/* ------------------------------------------------ */}
        <section>
          <h2>4. Les périphériques</h2>
          <p className="sheet-note">
            Un périphérique d'<b>entrée</b> envoie de l'information à
            l'ordinateur. Un périphérique de <b>sortie</b> en reçoit pour te la
            restituer. Certains font les deux.
          </p>
          <table className="sheet-table">
            <thead>
              <tr>
                <th>Périphérique</th>
                <th>Type</th>
                <th>Sa fiche</th>
                <th>Où le brancher</th>
              </tr>
            </thead>
            <tbody>
              {PERIPHERALS.map((p) => (
                <tr key={p.id}>
                  <td>
                    {p.icon} <b>{p.name}</b>
                  </td>
                  <td className="sheet-cat">{KIND_LABEL[p.kind]}</td>
                  <td className="sheet-small">{p.plugName}</td>
                  <td className="sheet-small">{p.hint}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        {/* ------------------------------------------------ */}
        <section>
          <h2>5. Les gestes de sécurité</h2>
          <ul className="sheet-ul">
            <li>
              <b>Débrancher la prise murale</b> et appuyer 5 secondes sur le
              bouton de démarrage pour vider les condensateurs.
            </li>
            <li>
              <b>Se décharger de l'électricité statique</b> en touchant le métal
              du boîtier avant de toucher un composant.
            </li>
            <li>
              <b>Ne jamais ouvrir le bloc d'alimentation</b>, même débranché.
            </li>
            <li>
              <b>Tenir les cartes par les bords</b>, jamais par les circuits ni
              par les contacts dorés.
            </li>
            <li>
              <b>Ne jamais forcer.</b> Si ça ne rentre pas, c'est que ce n'est
              pas dans le bon sens : cherche le détrompeur.
            </li>
            <li>
              <b>Ranger les vis</b> dans une coupelle, en les regroupant par
              taille.
            </li>
          </ul>
        </section>

        {/* ------------------------------------------------ */}
        <section className="sheet-progress">
          <h2>6. Ma progression</h2>
          <div className="sheet-cols">
            <div>
              <h3>Chapitres</h3>
              <ul className="sheet-ul sheet-tight">
                {CHAPTERS.map((c) => {
                  const r = results[c.id]
                  return (
                    <li key={c.id}>
                      {c.n}. {c.title} —{' '}
                      {r?.done ? (
                        <>
                          <Stars n={r.stars} size={13} />
                        </>
                      ) : (
                        <span className="faint">non fait</span>
                      )}
                    </li>
                  )
                })}
              </ul>
            </div>
            <div>
              <h3>
                Badges ({badges.length}/{BADGES.length})
              </h3>
              <div className="sheet-badges">
                {BADGES.filter((b) => badges.includes(b.id)).map((b) => (
                  <span key={b.id} className="sheet-badge">
                    {b.icon} {b.name}
                  </span>
                ))}
                {badges.length === 0 && <span className="faint">Aucun badge pour l'instant.</span>}
              </div>
              <p className="sheet-note" style={{ marginTop: 12 }}>
                Fiches consultées : {discovered.length} / {COMPONENT_IDS.length}
              </p>
            </div>
          </div>
        </section>

        <footer className="sheet-foot">
          Le PC — jeu d'apprentissage du matériel informatique · Technologie, cycle 4
        </footer>
      </div>
    </div>
  )
}
