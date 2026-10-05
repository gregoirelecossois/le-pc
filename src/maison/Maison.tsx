/**
 * « Le PC à la maison » — la page que l'élève ouvre sur son téléphone.
 *
 * Un seul parcours, sans menu : je dis qui je suis → la carte des cinq missions →
 * pour chaque mission, trois cartes de leçon puis un jeu → mon score.
 *
 * La 3D vient du jeu. Les pièces tournent dans les leçons comme dans les jeux, mais un
 * SEUL moteur les dessine toutes (scene3d.tsx) : un téléphone d'élève n'a ni la carte
 * graphique ni la batterie d'un poste de salle informatique. Les photos fixes (prises
 * une fois, au chargement, par le studio de la fiche de révision) servent aux petites
 * vignettes et de repli quand la 3D manque.
 */

import { useEffect, useState, type FormEvent } from 'react'
import { sfx } from '@/audio/sfx'
import { SpeakButton, stopSpeak } from '@/ui/speak'
import { ThumbnailStudio } from '@/three/Thumbnails'
import { MISSIONS, PHOTOS, PIECES, SCORE_MAX, pointsDuJeu, type Carte, type Mission } from './contenu'
import { JeuDeMission } from './jeux'
import { Photo } from './photo'
import { Garde, Toile, Tourne, WEBGL } from './scene3d'
import {
  PRENOM_OK,
  SUIVI_ACTIF,
  chargerClasses,
  etapesFaites,
  etoiles,
  prenomPropre,
  scoreTotal,
  useSuivi,
  type EtatEnvoi,
} from './suivi'

/* ------------------------------------------------------------------ */
/*  Petites briques                                                    */
/* ------------------------------------------------------------------ */

function Etoiles({ n, grand = false }: { n: number; grand?: boolean }) {
  return (
    <span className={`etoiles ${grand ? 'grand' : ''}`} aria-label={`${n} étoile${n > 1 ? 's' : ''} sur 3`}>
      {[1, 2, 3].map((i) => (
        <span key={i} className={i <= n ? 'on' : ''} style={{ animationDelay: `${i * 0.18}s` }}>
          ★
        </span>
      ))}
    </span>
  )
}

const TEXTE_ENVOI: Record<EtatEnvoi, string> = {
  envoye: '✓ Ton professeur voit ton travail.',
  attente: '⏳ Pas de connexion : ton score partira tout seul.',
  refuse: '⚠ Ce lien ne marche plus. Demande le nouveau lien à ton professeur.',
  entrainement: 'Mode entraînement : ton score n’est pas envoyé.',
}

function Envoi() {
  const envoi = useSuivi((s) => s.envoi)
  return <p className={`envoi ${envoi}`}>{TEXTE_ENVOI[envoi]}</p>
}

/* ------------------------------------------------------------------ */
/*  1. Qui es-tu ?                                                     */
/* ------------------------------------------------------------------ */

function Accueil() {
  const inscrire = useSuivi((s) => s.inscrire)
  const [prenom, setPrenom] = useState('')
  const [classe, setClasse] = useState('')
  /** null = on attend le serveur ; [] = pas de liste, l'élève tape sa classe */
  const [classes, setClasses] = useState<string[] | null>(SUIVI_ACTIF ? null : [])
  const [essaye, setEssaye] = useState(false)

  useEffect(() => {
    if (!SUIVI_ACTIF) return
    let vivant = true
    void chargerClasses().then((c) => vivant && setClasses(c ?? []))
    return () => {
      vivant = false
    }
  }, [])

  const propre = prenomPropre(prenom)
  const prenomOk = PRENOM_OK.test(propre)
  const classeOk = classe.trim().length > 0
  const pret = prenomOk && classeOk

  const valider = (e: FormEvent) => {
    e.preventDefault()
    setEssaye(true)
    if (!pret) return
    sfx.success()
    inscrire(propre, classe.trim())
  }

  return (
    <main className="ecran accueil">
      <div className="hero">
        <Tourne piece="boitier" />
      </div>
      <h1>
        Le PC <span>à la maison</span>
      </h1>
      <p className="soustitre">5 petites missions · 20 minutes</p>

      <form className="fiche" onSubmit={valider} noValidate>
        <label htmlFor="prenom">Ton prénom</label>
        <input
          id="prenom"
          name="prenom"
          value={prenom}
          onChange={(e) => setPrenom(e.target.value)}
          autoComplete="given-name"
          autoCapitalize="words"
          autoCorrect="off"
          spellCheck={false}
          maxLength={24}
          enterKeyHint="done"
          placeholder="Écris ton prénom"
          aria-invalid={essaye && !prenomOk}
        />
        {essaye && !prenomOk && (
          <p className="erreur">Écris ton prénom avec des lettres seulement.</p>
        )}

        <span className="label" id="l-classe">
          Ta classe
        </span>
        {classes === null ? (
          <p className="attente">Chargement des classes…</p>
        ) : classes.length > 0 ? (
          <div className="classes" role="radiogroup" aria-labelledby="l-classe">
            {classes.map((c) => (
              <button
                key={c}
                type="button"
                role="radio"
                aria-checked={classe === c}
                className={`classe ${classe === c ? 'on' : ''}`}
                onClick={() => {
                  sfx.click()
                  setClasse(c)
                }}
              >
                {c}
              </button>
            ))}
          </div>
        ) : (
          <input
            id="classe"
            name="classe"
            value={classe}
            onChange={(e) => setClasse(e.target.value)}
            maxLength={12}
            autoCorrect="off"
            placeholder="Par exemple : 5e"
            aria-labelledby="l-classe"
          />
        )}
        {essaye && !classeOk && <p className="erreur">Choisis ta classe.</p>}

        <button type="submit" className={`btn primaire geant ${pret ? '' : 'pale'}`}>
          C'est parti ! →
        </button>
      </form>

      <p className="mention">
        {SUIVI_ACTIF
          ? 'Ton professeur verra ton prénom, ta classe et ton score. Rien d’autre.'
          : 'Mode entraînement : rien n’est envoyé à ton professeur.'}
      </p>
    </main>
  )
}

/* ------------------------------------------------------------------ */
/*  2. La carte des missions                                           */
/* ------------------------------------------------------------------ */

function CarteMissions({ onMission }: { onMission: (i: number) => void }) {
  const prenom = useSuivi((s) => s.prenom)
  const classe = useSuivi((s) => s.classe)
  const scores = useSuivi((s) => s.scores)
  const changerDEleve = useSuivi((s) => s.changerDEleve)
  const [demande, setDemande] = useState(false)

  const faites = etapesFaites(scores)
  const total = scoreTotal(scores)
  const fini = faites === MISSIONS.length
  /** La première mission pas encore faite : c'est elle qu'on met en avant. */
  const prochaine = scores.findIndex((s) => s < 0)

  return (
    <main className="ecran carte">
      <header className="tete">
        <div>
          <h1>{fini ? `Bravo ${prenom} !` : `Salut ${prenom} !`}</h1>
          <p className="soustitre">
            {fini
              ? 'Tu as fini les 5 missions.'
              : faites === 0
                ? 'Commence par la mission 1.'
                : `${faites} mission${faites > 1 ? 's' : ''} sur ${MISSIONS.length}. Continue !`}
          </p>
        </div>
        <div className="score" aria-label={`Score : ${total} sur ${SCORE_MAX}`}>
          <b>{total}</b>
          <span>/ {SCORE_MAX}</span>
        </div>
      </header>

      <div className="barre" aria-hidden>
        <i style={{ width: `${(faites / MISSIONS.length) * 100}%` }} />
      </div>
      <Envoi />

      <ol className="missions">
        {MISSIONS.map((m, i) => {
          const max = pointsDuJeu(m.jeu)
          const faite = scores[i] >= 0
          const ouverte = faite || i === prochaine
          return (
            <li key={m.id}>
              <button
                type="button"
                className={`mission ${faite ? 'faite' : ''} ${i === prochaine ? 'prochaine' : ''}`}
                disabled={!ouverte}
                onClick={() => {
                  sfx.click()
                  onMission(i)
                }}
              >
                <span className="mission-icone" aria-hidden>
                  {ouverte ? m.icone : '🔒'}
                </span>
                <span className="mission-texte">
                  <span className="mission-num">Mission {i + 1}</span>
                  <span className="mission-titre">{m.titre}</span>
                  <span className="mission-accroche">
                    {ouverte ? m.accroche : 'Finis la mission d’avant pour l’ouvrir.'}
                  </span>
                </span>
                <span className="mission-etat">
                  {faite ? (
                    <>
                      <Etoiles n={etoiles(scores[i], max)} />
                      <span className="mission-score">
                        {scores[i]} / {max}
                      </span>
                    </>
                  ) : i === prochaine ? (
                    <span className="jouer">Jouer ▶</span>
                  ) : null}
                </span>
              </button>
            </li>
          )
        })}
      </ol>

      {fini && total < SCORE_MAX && (
        <p className="astuce">Tu peux refaire une mission pour gagner plus d'étoiles.</p>
      )}

      <footer className="pied">
        {demande ? (
          <div className="confirme">
            <p>
              Recommencer avec un autre prénom ? Le score de {prenom} reste chez le professeur.
            </p>
            <div className="deux-btn">
              <button type="button" className="btn" onClick={() => setDemande(false)}>
                Non, je reste
              </button>
              <button type="button" className="btn danger" onClick={changerDEleve}>
                Oui, changer
              </button>
            </div>
          </div>
        ) : (
          <button type="button" className="lien-discret" onClick={() => setDemande(true)}>
            {prenom} · {classe} — Ce n'est pas toi ?
          </button>
        )}
      </footer>
    </main>
  )
}

/* ------------------------------------------------------------------ */
/*  3. Une mission : la leçon, le jeu, le bilan                        */
/* ------------------------------------------------------------------ */

function CarteLecon({ carte }: { carte: Carte }) {
  if (carte.type === 'rappel') {
    return (
      <article className="lecon rappel">
        <div className="lecon-titre">
          <h2>{carte.titre}</h2>
          <SpeakButton text={carte.phrase} title="Écouter" />
        </div>
        <ul className="rappel-lignes">
          {carte.lignes.map((l) => (
            <li key={l.piece}>
              <Photo piece={l.piece} className="mini" />
              <span>{l.texte}</span>
            </li>
          ))}
        </ul>
      </article>
    )
  }
  const p = PIECES[carte.piece]
  return (
    <article className="lecon">
      <Tourne piece={p.id} />
      <div className="lecon-titre">
        <h2 style={{ ['--teinte' as string]: p.couleur }}>{p.nom}</h2>
        <SpeakButton text={[p.nom, p.role, p.comme, p.ou]} title="Écouter la leçon" />
      </div>
      <p className="lecon-role">{p.role}</p>
      <p className="lecon-plus">
        <span aria-hidden>💡</span> {p.comme}
      </p>
      <p className="lecon-plus">
        <span aria-hidden>📍</span> {p.ou}
      </p>
    </article>
  )
}

type Phase = 'lecon' | 'jeu' | 'bilan'

function EcranMission({ index, onQuitter, onSuivante }: { index: number; onQuitter: () => void; onSuivante: () => void }) {
  const m: Mission = MISSIONS[index]
  const terminer = useSuivi((s) => s.terminer)
  const meilleur = useSuivi((s) => s.scores[index])
  const [phase, setPhase] = useState<Phase>('lecon')
  const [carte, setCarte] = useState(0)
  const [essai, setEssai] = useState(0)
  const [score, setScore] = useState(0)
  const max = pointsDuJeu(m.jeu)

  // On remonte en haut à chaque changement de carte : sur un petit écran, rester
  // au milieu de la page précédente fait rater le titre.
  useEffect(() => {
    window.scrollTo(0, 0)
    stopSpeak()
  }, [phase, carte, essai])

  const fini = (s: number) => {
    setScore(s)
    terminer(index, s)
    sfx.success()
    setPhase('bilan')
  }

  const derniere = index + 1 >= MISSIONS.length
  const nbEtoiles = etoiles(score, max)

  return (
    <main className="ecran mission-ecran">
      <header className="bandeau">
        <button type="button" className="retour-carte" onClick={onQuitter} aria-label="Revenir aux missions">
          ←
        </button>
        <div className="bandeau-titre">
          <span>Mission {index + 1}</span>
          <b>{phase === 'jeu' ? m.jeu.titre : m.titre}</b>
        </div>
        <span className={`etape-puce ${phase === 'jeu' ? 'en-jeu' : ''}`}>{phase === 'lecon' ? '📖 Leçon' : phase === 'jeu' ? '🎮 Jeu' : '⭐ Score'}</span>
      </header>

      {phase === 'lecon' && (
        <>
          <div className="points" aria-label={`Carte ${carte + 1} sur ${m.cartes.length}`}>
            {m.cartes.map((_, i) => (
              <span key={i} className={i === carte ? 'ici' : i < carte ? 'vu' : ''} />
            ))}
          </div>
          <CarteLecon carte={m.cartes[carte]} />
          <div className="actions">
            {carte > 0 && (
              <button type="button" className="btn" onClick={() => setCarte(carte - 1)} aria-label="Carte précédente">
                ←
              </button>
            )}
            {carte + 1 < m.cartes.length ? (
              <button
                type="button"
                className="btn primaire"
                onClick={() => {
                  sfx.click()
                  setCarte(carte + 1)
                }}
              >
                Suivant →
              </button>
            ) : (
              <button
                type="button"
                className="btn primaire"
                onClick={() => {
                  sfx.pick()
                  setPhase('jeu')
                }}
              >
                J'ai compris, je joue ▶
              </button>
            )}
          </div>
        </>
      )}

      {phase === 'jeu' && <JeuDeMission key={essai} jeu={m.jeu} onFini={fini} />}

      {phase === 'bilan' && (
        <section className="bilan">
          <Etoiles n={nbEtoiles} grand />
          <p className="bilan-score">
            <b>{score}</b> / {max}
          </p>
          <h2>
            {nbEtoiles === 3 ? 'Parfait !' : nbEtoiles === 2 ? 'Bien joué !' : 'Mission terminée !'}
          </h2>
          <p className="bilan-texte">
            {nbEtoiles === 3
              ? 'Tu as tout juste.'
              : meilleur > score
                ? `Ton meilleur score reste ${meilleur} sur ${max}.`
                : 'Relis la leçon et rejoue pour gagner les 3 étoiles.'}
          </p>
          <Envoi />
          <div className="actions colonne">
            {derniere ? (
              <button type="button" className="btn primaire" onClick={onQuitter}>
                Voir mon score total →
              </button>
            ) : (
              <button type="button" className="btn primaire" onClick={onSuivante}>
                Mission suivante →
              </button>
            )}
            {nbEtoiles < 3 && (
              <button
                type="button"
                className="btn"
                onClick={() => {
                  setCarte(0)
                  setEssai(essai + 1)
                  setPhase('lecon')
                }}
              >
                ↺ Relire et rejouer
              </button>
            )}
            {!derniere && (
              <button type="button" className="lien-discret" onClick={onQuitter}>
                Revenir aux missions
              </button>
            )}
          </div>
        </section>
      )}
    </main>
  )
}

/* ------------------------------------------------------------------ */

export default function Maison() {
  const inscrit = useSuivi((s) => s.inscrit)
  const [mission, setMission] = useState<number | null>(null)

  // Changer d'élève ramène à l'accueil : on ne reste pas dans la mission du précédent.
  useEffect(() => {
    if (!inscrit) setMission(null)
  }, [inscrit])

  return (
    <div className="maison">
      {/* Le studio photo : il tourne deux secondes au chargement, puis disparaît. */}
      {WEBGL && (
        <Garde>
          <ThumbnailStudio queue={PHOTOS} />
        </Garde>
      )}

      {/* L'unique moteur 3D : toutes les pièces qui tournent sont des fenêtres dedans. */}
      <Toile />

      {!inscrit ? (
        <Accueil />
      ) : mission === null ? (
        <CarteMissions onMission={setMission} />
      ) : (
        <EcranMission
          key={mission}
          index={mission}
          onQuitter={() => setMission(null)}
          onSuivante={() => setMission(mission + 1)}
        />
      )}
    </div>
  )
}
