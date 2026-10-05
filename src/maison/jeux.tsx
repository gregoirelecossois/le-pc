/**
 * Les quatre petits jeux : quiz, paires, vrai ou faux, tri.
 *
 * Une seule règle de score, la même partout : UN POINT par réponse juste du premier
 * coup. Une erreur ne bloque jamais — la bonne réponse s'affiche, avec la phrase de la
 * leçon, et on continue. L'élève est seul devant son téléphone : un jeu qui se ferme
 * sur une erreur sans l'expliquer n'apprend rien.
 *
 * Aucun de ces jeux n'utilise le glisser-déposer : sur un téléphone, glisser fait
 * défiler la page une fois sur deux. Tout se fait en touchant.
 */

import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { sfx } from '@/audio/sfx'
import { SpeakButton, stopSpeak } from '@/ui/speak'
import { useThumbShots } from '@/three/Thumbnails'
import { PIECES, photoDe, type Affirmation, type Jeu, type PieceId, type Place, type Question } from './contenu'

/* ------------------------------------------------------------------ */
/*  Briques communes                                                   */
/* ------------------------------------------------------------------ */

/** Mélange une copie du tableau. */
export function melanger<T>(t: readonly T[]): T[] {
  const a = [...t]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function vibrer(ms: number) {
  try {
    navigator.vibrate?.(ms)
  } catch {
    /* pas de vibreur : sans importance */
  }
}

function juste() {
  sfx.good()
}
function faux() {
  sfx.error()
  vibrer(120)
}

/**
 * La photo d'une pièce, prise dans le moteur 3D du jeu.
 * Tant qu'elle n'est pas prête — ou si le téléphone n'a pas de 3D — une vignette de
 * secours la remplace, pour que la page reste utilisable.
 */
export function Photo({ piece, className = '' }: { piece: PieceId; className?: string }) {
  const { shots } = useThumbShots()
  const p = PIECES[piece]
  const shot = shots[photoDe(piece)]
  return shot ? (
    <img className={`photo ${className}`} src={shot.url} alt="" draggable={false} />
  ) : (
    <span className={`photo secours ${className}`} style={{ ['--teinte' as string]: p.couleur }} aria-hidden>
      {p.secours}
    </span>
  )
}

/** Les photos sont-elles là ? Sinon, un jeu « reconnais l'image » doit donner un indice écrit. */
function usePhotosPretes(): boolean {
  const { ready } = useThumbShots()
  return ready
}

/** Le bandeau qui suit chaque réponse. Le bouton est toujours au même endroit : sous le pouce. */
function Retour({
  ok,
  children,
  onSuite,
  dernier,
}: {
  ok: boolean
  children: ReactNode
  onSuite: () => void
  dernier: boolean
}) {
  return (
    <div className={`retour ${ok ? 'ok' : 'ko'}`} role="status">
      <div className="retour-tete">{ok ? '✓ Bravo !' : '✗ Pas tout à fait…'}</div>
      <div className="retour-texte">{children}</div>
      <button type="button" className="btn primaire" onClick={onSuite} autoFocus>
        {dernier ? 'Voir mon score' : 'Continuer'} →
      </button>
    </div>
  )
}

/** Avancement à l'intérieur d'un jeu : une pastille par question. */
function Pastilles({ resultats, total }: { resultats: boolean[]; total: number }) {
  return (
    <div className="pastilles" aria-label={`Question ${Math.min(resultats.length + 1, total)} sur ${total}`}>
      {Array.from({ length: total }, (_, i) => (
        <span
          key={i}
          className={
            i < resultats.length ? (resultats[i] ? 'ok' : 'ko') : i === resultats.length ? 'ici' : ''
          }
        />
      ))}
    </div>
  )
}

interface PropsJeu {
  onFini: (score: number) => void
}

/* ------------------------------------------------------------------ */
/*  Quiz : une image → trois noms, ou une question → quatre images     */
/* ------------------------------------------------------------------ */

function Quiz({ questions, consigne, onFini }: PropsJeu & { questions: Question[]; consigne: string }) {
  const [n, setN] = useState(0)
  const [resultats, setResultats] = useState<boolean[]>([])
  const [choix, setChoix] = useState<PieceId | null>(null)
  const photos = usePhotosPretes()

  const q = questions[n]
  const options = useMemo(() => melanger<PieceId>([q.piece, ...q.leurres]), [q])
  const bonne = PIECES[q.piece]
  const repondu = choix !== null

  const repondre = (id: PieceId) => {
    if (repondu) return
    stopSpeak()
    setChoix(id)
    const ok = id === q.piece
    ok ? juste() : faux()
    setResultats((r) => [...r, ok])
  }

  const suite = () => {
    if (n + 1 >= questions.length) return onFini(resultats.filter(Boolean).length)
    setChoix(null)
    setN(n + 1)
  }

  const etat = (id: PieceId) =>
    !repondu ? '' : id === q.piece ? 'bon' : id === choix ? 'mauvais' : 'eteint'

  return (
    <div className="jeu">
      <Pastilles resultats={resultats} total={questions.length} />

      {q.type === 'nom' ? (
        <>
          <div className="enonce">
            <h2>Comment s'appelle cette pièce ?</h2>
            <SpeakButton
              text={["Comment s'appelle cette pièce ?", ...options.map((o) => PIECES[o].nom)]}
              title="Écouter la question"
            />
          </div>
          <div className="vitrine">
            <Photo piece={q.piece} />
          </div>
          {/* Sans photo, l'image ne dit rien : on donne le rôle, comme une devinette. */}
          {!photos && <p className="indice">Indice : ça sert à {bonne.roleCourt.charAt(0).toLowerCase() + bonne.roleCourt.slice(1)}.</p>}
          <div className="reponses">
            {options.map((o) => (
              <button
                key={o}
                type="button"
                className={`reponse ${etat(o)}`}
                onClick={() => repondre(o)}
                disabled={repondu}
              >
                {PIECES[o].nom}
              </button>
            ))}
          </div>
        </>
      ) : (
        <>
          <div className="enonce">
            <h2>{q.question}</h2>
            <SpeakButton text={q.question} title="Écouter la question" />
          </div>
          <div className="grille-images">
            {options.map((o) => (
              <button
                key={o}
                type="button"
                className={`tuile ${etat(o)}`}
                onClick={() => repondre(o)}
                disabled={repondu}
                aria-label={PIECES[o].nom}
              >
                <Photo piece={o} />
                {/* Le nom n'apparaît qu'après la réponse — ou tout de suite, sans photo. */}
                {(repondu || !photos) && <span className="tuile-nom">{PIECES[o].nom}</span>}
              </button>
            ))}
          </div>
        </>
      )}

      {!repondu && (
        <p className="consigne">{q.type === 'nom' ? consigne : 'Touche la bonne pièce.'}</p>
      )}

      {repondu && (
        <Retour ok={choix === q.piece} onSuite={suite} dernier={n + 1 >= questions.length}>
          {choix === q.piece ? (
            <>
              C'est bien <b>{bonne.nomPhrase}</b>. {bonne.role}
            </>
          ) : (
            <>
              C'était <b>{bonne.nomPhrase}</b>. {bonne.role}
            </>
          )}
        </Retour>
      )}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Paires : chaque pièce avec ce qu'elle fait                         */
/* ------------------------------------------------------------------ */

function Paires({ pieces, consigne, onFini }: PropsJeu & { pieces: PieceId[]; consigne: string }) {
  const haut = useMemo(() => melanger(pieces), [pieces])
  const bas = useMemo(() => melanger(pieces), [pieces])
  const [piece, setPiece] = useState<PieceId | null>(null)
  const [role, setRole] = useState<PieceId | null>(null)
  const [trouvees, setTrouvees] = useState<PieceId[]>([])
  /** Pièces sur lesquelles l'élève s'est trompé au moins une fois : pas de point. */
  const [ratees, setRatees] = useState<PieceId[]>([])
  const [secousse, setSecousse] = useState(false)
  const photos = usePhotosPretes()

  const fini = trouvees.length === pieces.length

  // Dès qu'une pièce ET un rôle sont choisis, on compare.
  useEffect(() => {
    if (!piece || !role) return
    if (piece === role) {
      juste()
      setTrouvees((t) => [...t, piece])
      setPiece(null)
      setRole(null)
      return
    }
    faux()
    setRatees((r) => (r.includes(piece) ? r : [...r, piece]))
    setSecousse(true)
    const t = setTimeout(() => {
      setSecousse(false)
      setPiece(null)
      setRole(null)
    }, 650)
    return () => clearTimeout(t)
  }, [piece, role])

  const rang = (id: PieceId) => trouvees.indexOf(id) + 1

  return (
    <div className="jeu">
      <div className="enonce">
        <h2>Relie chaque pièce à son travail</h2>
        <SpeakButton
          text={['Relie chaque pièce à son travail', consigne]}
          title="Écouter la consigne"
        />
      </div>
      <p className="consigne">
        {fini
          ? 'Toutes les paires sont trouvées !'
          : piece && !role
            ? 'Maintenant, touche son travail.'
            : consigne}
      </p>

      <div className={`grille-images paires ${secousse ? 'secousse' : ''}`}>
        {haut.map((id) => {
          const ok = trouvees.includes(id)
          return (
            <button
              key={id}
              type="button"
              className={`tuile ${ok ? 'bon' : piece === id ? (secousse ? 'mauvais' : 'choisi') : ''}`}
              onClick={() => {
                if (!ok && !secousse) {
                  sfx.pick()
                  setPiece(id)
                }
              }}
              disabled={ok}
            >
              <Photo piece={id} />
              <span className="tuile-nom">{PIECES[id].nom}</span>
              {ok && <span className="lien">{rang(id)}</span>}
            </button>
          )
        })}
      </div>

      <div className={`roles ${secousse ? 'secousse' : ''}`}>
        {bas.map((id) => {
          const ok = trouvees.includes(id)
          return (
            <button
              key={id}
              type="button"
              className={`role ${ok ? 'bon' : role === id ? (secousse ? 'mauvais' : 'choisi') : ''}`}
              onClick={() => {
                if (!ok && !secousse) {
                  sfx.pick()
                  setRole(id)
                }
              }}
              disabled={ok}
            >
              {ok && <span className="lien">{rang(id)}</span>}
              <span>{PIECES[id].roleCourt}</span>
            </button>
          )
        })}
      </div>

      {!photos && !fini && <p className="indice">Lis bien le nom de chaque pièce.</p>}

      {fini && (
        <div className="retour ok" role="status">
          <div className="retour-tete">✓ Bravo !</div>
          <div className="retour-texte">
            {ratees.length === 0
              ? 'Tout juste du premier coup.'
              : `${pieces.length - ratees.length} paire${pieces.length - ratees.length > 1 ? 's' : ''} trouvée${pieces.length - ratees.length > 1 ? 's' : ''} du premier coup.`}
          </div>
          <button
            type="button"
            className="btn primaire"
            onClick={() => onFini(pieces.length - ratees.length)}
            autoFocus
          >
            Voir mon score →
          </button>
        </div>
      )}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Vrai ou faux                                                       */
/* ------------------------------------------------------------------ */

function VraiFaux({ affirmations, onFini }: PropsJeu & { affirmations: Affirmation[] }) {
  const [n, setN] = useState(0)
  const [resultats, setResultats] = useState<boolean[]>([])
  const [choix, setChoix] = useState<boolean | null>(null)
  const a = affirmations[n]
  const repondu = choix !== null

  const repondre = (v: boolean) => {
    if (repondu) return
    stopSpeak()
    setChoix(v)
    const ok = v === a.vrai
    ok ? juste() : faux()
    setResultats((r) => [...r, ok])
  }

  const suite = () => {
    if (n + 1 >= affirmations.length) return onFini(resultats.filter(Boolean).length)
    setChoix(null)
    setN(n + 1)
  }

  const etat = (v: boolean) => (!repondu ? '' : v === a.vrai ? 'bon' : v === choix ? 'mauvais' : 'eteint')

  return (
    <div className="jeu">
      <Pastilles resultats={resultats} total={affirmations.length} />
      <div className="vitrine petite">
        <Photo piece={a.piece} />
      </div>
      <div className="enonce affirmation">
        <h2>« {a.texte} »</h2>
        <SpeakButton text={a.texte} title="Écouter la phrase" />
      </div>

      <div className="deux">
        <button type="button" className={`gros vrai ${etat(true)}`} onClick={() => repondre(true)} disabled={repondu}>
          <span aria-hidden>👍</span> Vrai
        </button>
        <button type="button" className={`gros faux ${etat(false)}`} onClick={() => repondre(false)} disabled={repondu}>
          <span aria-hidden>👎</span> Faux
        </button>
      </div>

      {repondu && (
        <Retour ok={choix === a.vrai} onSuite={suite} dernier={n + 1 >= affirmations.length}>
          {a.retour}
        </Retour>
      )}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Tri : sur la carte mère, ou dans le boîtier ?                      */
/* ------------------------------------------------------------------ */

const PLACES: { id: Place; titre: string; piece: PieceId }[] = [
  { id: 'carteMere', titre: 'Sur la carte mère', piece: 'carteMere' },
  { id: 'boitier', titre: 'Dans le boîtier', piece: 'boitier' },
]

function Tri({ pieces, consigne, onFini }: PropsJeu & { pieces: PieceId[]; consigne: string }) {
  const ordre = useMemo(() => melanger(pieces), [pieces])
  const [n, setN] = useState(0)
  const [resultats, setResultats] = useState<boolean[]>([])
  const [choix, setChoix] = useState<Place | null>(null)
  const p = PIECES[ordre[n]]
  const repondu = choix !== null

  const repondre = (place: Place) => {
    if (repondu) return
    stopSpeak()
    setChoix(place)
    const ok = place === p.place
    if (ok) sfx.snap()
    else faux()
    setResultats((r) => [...r, ok])
  }

  const suite = () => {
    if (n + 1 >= ordre.length) return onFini(resultats.filter(Boolean).length)
    setChoix(null)
    setN(n + 1)
  }

  const etat = (place: Place) =>
    !repondu ? '' : place === p.place ? 'bon' : place === choix ? 'mauvais' : 'eteint'

  return (
    <div className="jeu">
      <Pastilles resultats={resultats} total={ordre.length} />
      <div className="enonce">
        <h2>{consigne}</h2>
        <SpeakButton
          text={[`${p.nom}.`, consigne, 'Sur la carte mère, ou dans le boîtier ?']}
          title="Écouter la question"
        />
      </div>
      <div className="vitrine petite">
        <Photo piece={p.id} />
      </div>
      <p className="nom-piece">{p.nom}</p>

      <div className="deux">
        {PLACES.map((pl) => (
          <button
            key={pl.id}
            type="button"
            className={`gros place ${etat(pl.id)}`}
            onClick={() => repondre(pl.id)}
            disabled={repondu}
          >
            <Photo piece={pl.piece} className="mini" />
            {pl.titre}
          </button>
        ))}
      </div>

      {repondu && (
        <Retour ok={choix === p.place} onSuite={suite} dernier={n + 1 >= ordre.length}>
          {p.ou}
        </Retour>
      )}
    </div>
  )
}

/* ------------------------------------------------------------------ */

/** Le jeu d'une mission. `key` côté appelant : un jeu rejoué repart de zéro. */
export function JeuDeMission({ jeu, onFini }: PropsJeu & { jeu: Jeu }) {
  switch (jeu.type) {
    case 'quiz':
      return <Quiz questions={jeu.questions} consigne={jeu.consigne} onFini={onFini} />
    case 'paires':
      return <Paires pieces={jeu.pieces} consigne={jeu.consigne} onFini={onFini} />
    case 'vraiFaux':
      return <VraiFaux affirmations={jeu.affirmations} onFini={onFini} />
    case 'tri':
      return <Tri pieces={jeu.pieces} consigne={jeu.consigne} onFini={onFini} />
  }
}
