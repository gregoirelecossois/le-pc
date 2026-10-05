/**
 * Qui travaille, où il en est, et ce que voit le professeur.
 *
 * PAS DE COMPTE. À la maison, un mot de passe oublié est un devoir non fait : l'élève
 * tape son prénom, choisit sa classe, et c'est parti. Cette page n'utilise donc ni
 * `window.Store` ni la session de l'Atelier — rien de ce qu'elle écrit ne touche à la
 * progression du jeu.
 *
 * Deux endroits gardent l'avancée :
 *  - le téléphone (localStorage), pour reprendre là où on s'était arrêté ;
 *  - le serveur de l'Atelier (POST /api/devoir/passage), pour le tableau du professeur.
 *
 * Le serveur n'apprend que l'ÉTAT : étapes faites, score. Chaque envoi le redit en
 * entier, si bien qu'un envoi perdu (réseau de téléphone, tunnel, mode avion) n'a
 * aucune conséquence : le suivant le remplace. `aEnvoyer` reste vrai tant que le
 * serveur n'a pas répondu, et la page réessaie à chaque occasion.
 *
 * SANS CODE DANS LE LIEN (`?c=…`), la page fonctionne en « entraînement » : rien ne
 * part, et c'est dit à l'élève. C'est aussi ce qui permet de l'essayer sans serveur.
 *
 * LA PAGE D'ENTRÉE. Les élèves arrivent normalement par atelier-informatique/maison.html,
 * la même page toute l'année, où ils ont donné leur prénom et leur classe une fois. Elle
 * vit sur le même domaine (gregoirelecossois.github.io) et range l'élève dans
 * `maison_eleve_v1` : cette page le relit, et ne redemande rien. En retour, elle écrit
 * son avancée dans `maison_avancees_v1`, pour que la tuile de la page d'entrée la montre.
 * Ouverte directement, sans passer par l'entrée, elle garde son propre accueil.
 */

import { create } from 'zustand'
import { DEVOIR, MISSIONS, SCORE_MAX, pointsDuJeu } from './contenu'

/** La même règle que le serveur : des lettres, et ce qui les relie. */
export const PRENOM_OK = /^\p{L}[\p{L} '’-]{0,23}$/u

const CLE = 'pc_maison_v1'
/** Partagées avec la page d'entrée (atelier-informatique/maison.html). */
const CLE_ELEVE = 'maison_eleve_v1'
const CLE_AVANCEES = 'maison_avancees_v1'

/** Ce que le téléphone retient. */
interface Sauvegarde {
  /** Tiré au hasard à l'inscription : la clé de reprise côté serveur */
  id: string
  prenom: string
  classe: string
  /** Meilleur score par mission ; -1 = pas encore faite */
  scores: number[]
  aEnvoyer: boolean
}

export type EtatEnvoi = 'entrainement' | 'envoye' | 'attente' | 'refuse'

interface Suivi extends Sauvegarde {
  inscrit: boolean
  envoi: EtatEnvoi
  inscrire: (prenom: string, classe: string) => void
  terminer: (mission: number, score: number) => void
  changerDEleve: () => void
  renvoyer: () => void
}

/* ---- La page d'entrée ---- */

/** Ce que la page d'entrée a rangé sur ce téléphone. */
interface Entree {
  /** Tiré au hasard une fois par téléphone, le même pour tous les travaux */
  appareil: string
  prenom: string
  classe: string
  code: string
  /** L'adresse de la page d'entrée, pour y revenir */
  entree: string
}

function memeOrigine(adresse: string): boolean {
  try {
    return new URL(adresse).origin === location.origin
  } catch {
    return false
  }
}

function lireEntree(): Entree | null {
  try {
    const e = JSON.parse(localStorage.getItem(CLE_ELEVE) ?? 'null') as Partial<Entree> | null
    if (!e || typeof e.prenom !== 'string' || !PRENOM_OK.test(e.prenom) || typeof e.classe !== 'string' || !e.classe) {
      return null
    }
    return {
      appareil: /^[A-Za-z0-9-]{16,64}$/.test(String(e.appareil ?? '')) ? String(e.appareil) : '',
      prenom: e.prenom,
      classe: e.classe,
      code: String(e.code ?? ''),
      // Seulement une page du même site : c'est un lien qu'on affiche.
      entree: memeOrigine(String(e.entree ?? '')) ? String(e.entree) : '',
    }
  } catch {
    return null
  }
}

/* ---- Le lien ---- */

const config = (window as unknown as { ATELIER_CONFIG?: { api?: string } }).ATELIER_CONFIG
/** Adresse du serveur de l'Atelier ('' = aucun). */
export const API = String(config?.api ?? '').replace(/\/+$/, '')
/** L'élève donné par la page d'entrée, s'il y est passé. */
export const ENTREE = lireEntree()
/** Code de l'établissement, porté par le lien que le professeur a distribué — ou, à
 *  défaut, gardé par la page d'entrée. */
export const CODE = ((new URLSearchParams(location.search).get('c') ?? '').trim() || ENTREE?.code || '').toLowerCase()
/** Le professeur verra-t-il ce travail ? */
export const SUIVI_ACTIF = !!API && /^[a-z0-9]{6,16}$/.test(CODE)

/* ---- Le téléphone ---- */

function lire(): Sauvegarde | null {
  try {
    const s = JSON.parse(localStorage.getItem(CLE) ?? 'null') as Sauvegarde | null
    if (!s || typeof s.id !== 'string' || !Array.isArray(s.scores)) return null
    // Une mission ajoutée ou retirée depuis : on garde ce qui correspond encore.
    const scores = MISSIONS.map((_, i) => (Number.isFinite(s.scores[i]) ? Number(s.scores[i]) : -1))
    return { id: s.id, prenom: String(s.prenom ?? ''), classe: String(s.classe ?? ''), scores, aEnvoyer: !!s.aEnvoyer }
  } catch {
    return null // stockage bloqué (navigation privée) : on travaille en mémoire
  }
}

function ecrire(s: Sauvegarde | null) {
  try {
    if (s) localStorage.setItem(CLE, JSON.stringify(s))
    else localStorage.removeItem(CLE)
  } catch {
    /* tant pis : l'avancée tiendra jusqu'à la fermeture de l'onglet */
  }
}

function nouvelId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID()
  // http:// ou très vieux navigateur : randomUUID n'existe pas partout
  const o = new Uint8Array(16)
  crypto.getRandomValues(o)
  return Array.from(o, (b) => b.toString(16).padStart(2, '0')).join('')
}

/** « léa », « LÉA », « jean-noël » → « Léa », « Jean-Noël ». */
export function prenomPropre(brut: string): string {
  return brut
    .normalize('NFC')
    .replace(/\s+/g, ' ')
    .trim()
    .toLocaleLowerCase('fr')
    .replace(/(^|[ '’-])(\p{L})/gu, (_, sep: string, l: string) => sep + l.toLocaleUpperCase('fr'))
}


/* ---- Les nombres ---- */

export function etapesFaites(scores: number[]): number {
  return scores.filter((s) => s >= 0).length
}

export function scoreTotal(scores: number[]): number {
  return scores.reduce((n, s) => n + Math.max(0, s), 0)
}

/** 3 étoiles : tout juste. 2 : au moins 6 sur 10. 1 : la mission est faite. */
export function etoiles(score: number, max: number): number {
  if (score >= max) return 3
  return score / max >= 0.6 ? 2 : 1
}

/* ---- Le serveur ---- */

let enCours = false
let aRefaire = false

async function envoyer() {
  if (!SUIVI_ACTIF) return
  if (enCours) {
    aRefaire = true // un envoi part déjà : celui-ci redira l'état le plus récent juste après
    return
  }
  const s = useSuivi.getState()
  if (!s.inscrit) return
  enCours = true
  try {
    const r = await fetch(`${API}/api/devoir/passage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      // l'élève peut fermer l'onglet juste après sa dernière réponse
      keepalive: true,
      body: JSON.stringify({
        c: CODE,
        id: s.id,
        appareil: ENTREE?.appareil || undefined,
        devoir: DEVOIR,
        prenom: s.prenom,
        classe: s.classe,
        etape: etapesFaites(s.scores),
        etapes: MISSIONS.length,
        score: scoreTotal(s.scores),
        max: SCORE_MAX,
      }),
    })
    if (r.ok) {
      useSuivi.setState({ envoi: 'envoye', aEnvoyer: false })
    } else if (r.status >= 500 || r.status === 429) {
      useSuivi.setState({ envoi: 'attente' }) // le serveur peine : on réessaiera
    } else {
      // 400 / 404 : lien périmé, classe supprimée… Réessayer n'y changera rien.
      useSuivi.setState({ envoi: 'refuse', aEnvoyer: false })
    }
  } catch {
    useSuivi.setState({ envoi: 'attente' }) // pas de réseau
  } finally {
    enCours = false
    persister()
    if (aRefaire) {
      aRefaire = false
      void envoyer()
    }
  }
}

function persister() {
  const s = useSuivi.getState()
  if (!s.inscrit) return
  ecrire({ id: s.id, prenom: s.prenom, classe: s.classe, scores: s.scores, aEnvoyer: s.aEnvoyer })
  if (ENTREE) {
    // Pour la tuile de la page d'entrée : où j'en suis, en quatre nombres.
    try {
      const a = (JSON.parse(localStorage.getItem(CLE_AVANCEES) ?? 'null') ?? {}) as Record<string, unknown>
      a[DEVOIR] = { etape: etapesFaites(s.scores), etapes: MISSIONS.length, score: scoreTotal(s.scores), max: SCORE_MAX }
      localStorage.setItem(CLE_AVANCEES, JSON.stringify(a))
    } catch {
      /* stockage bloqué : la tuile dira « Nouveau », sans conséquence */
    }
  }
}

/* ---- L'état ---- */

/** « Léa » et « LÉA » : le même élève ; « Léa » puis « Tom » : un autre. */
const memeEleve = (a: { prenom: string; classe: string }, b: { prenom: string; classe: string }) =>
  a.prenom.toLocaleLowerCase('fr') === b.prenom.toLocaleLowerCase('fr') && a.classe === b.classe

/* Passé par la page d'entrée : c'est ELLE qui dit qui est l'élève. Si quelqu'un d'autre
   s'y est déclaré depuis (« Ce n'est pas toi ? »), l'avancée gardée ici n'est pas la
   sienne : il repart de zéro, et la ligne du précédent reste chez le professeur. */
const garde = lire()
const depart: Sauvegarde | null = ENTREE
  ? garde && memeEleve(garde, ENTREE)
    ? { ...garde, prenom: ENTREE.prenom }
    : { id: nouvelId(), prenom: prenomPropre(ENTREE.prenom), classe: ENTREE.classe, scores: MISSIONS.map(() => -1), aEnvoyer: true }
  : garde
if (ENTREE && depart) ecrire(depart)

export const useSuivi = create<Suivi>()((set, get) => ({
  id: depart?.id ?? '',
  prenom: depart?.prenom ?? '',
  classe: depart?.classe ?? '',
  scores: depart?.scores ?? MISSIONS.map(() => -1),
  // Au retour sur la page, on redit toujours l'état au serveur : c'est sans risque
  // (l'envoi est rejouable), et cela rattrape un élève qui avait commencé en
  // entraînement, sans le code, avant d'ouvrir le bon lien.
  aEnvoyer: SUIVI_ACTIF && !!depart,
  inscrit: !!depart,
  envoi: SUIVI_ACTIF ? 'attente' : 'entrainement',

  inscrire: (prenom, classe) => {
    set({
      id: nouvelId(),
      prenom: prenomPropre(prenom),
      classe,
      scores: MISSIONS.map(() => -1),
      inscrit: true,
      aEnvoyer: SUIVI_ACTIF,
      envoi: SUIVI_ACTIF ? 'attente' : 'entrainement',
    })
    persister()
    // dès l'inscription : le professeur voit que l'élève a ouvert le travail
    void envoyer()
  },

  terminer: (mission, score) => {
    const max = pointsDuJeu(MISSIONS[mission].jeu)
    const scores = [...get().scores]
    // On garde le MEILLEUR essai : refaire une mission ne peut pas faire baisser le score.
    scores[mission] = Math.max(scores[mission], Math.min(Math.max(0, score), max))
    set({ scores, aEnvoyer: SUIVI_ACTIF, envoi: SUIVI_ACTIF ? 'attente' : 'entrainement' })
    persister()
    void envoyer()
  },

  changerDEleve: () => {
    ecrire(null)
    set({ id: '', prenom: '', classe: '', scores: MISSIONS.map(() => -1), inscrit: false, aEnvoyer: false })
  },

  renvoyer: () => {
    if (get().aEnvoyer) void envoyer()
  },
}))

// Ouvert depuis la page d'entrée : sa tuile passe de « Nouveau » à « 0 / 5 » dès maintenant.
if (ENTREE) persister()

// Un envoi resté en attente repart dès que le réseau revient, ou que l'élève rouvre la page.
if (SUIVI_ACTIF) {
  window.addEventListener('online', () => useSuivi.getState().renvoyer())
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') useSuivi.getState().renvoyer()
  })
  if (depart) setTimeout(() => useSuivi.getState().renvoyer(), 800)
}
