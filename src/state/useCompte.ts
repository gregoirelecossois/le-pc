/**
 * Le compte élève, quand il y en a un.
 *
 * Pont mince vers le `Store` de l'Atelier informatique (public/atelier/store.js), le
 * même que celui des six ateliers. Il n'y a rien à installer ni à configurer ici : le
 * script est chargé par index.html, et il décide seul s'il y a un serveur, une session,
 * ou rien du tout.
 *
 * Renvoie `null` dans TOUS les cas où le jeu doit se comporter comme avant :
 * hors-ligne, `file://`, clé USB, ou simplement élève non connecté.
 */

import { useEffect, useState } from 'react'

export interface Eleve {
  prenom: string
  nom: string
  classe: string | null
}

interface StoreAtelier {
  eleve(): (Eleve & Record<string, unknown>) | null
  surEtat(cb: (etat: string) => void): void
  enLigne(): boolean
  get(k: string): string | null
  del(k: string): void
}

/** Clé d'instruction posée par le tableau de bord enseignant. Cf. lireDeblocage(). */
const CLE_DEBLOCAGE = 'pc_debloquer'

function store(): StoreAtelier | null {
  if (typeof window === 'undefined') return null
  return ((window as unknown as Record<string, unknown>).Store as StoreAtelier) ?? null
}

/**
 * Un serveur de comptes est-il seulement joignable depuis cette copie du jeu ?
 *
 * Faux hors-ligne, en `file://` et sur clé USB — auquel cas rien ne peut sortir du poste,
 * et c'est ce qu'on doit écrire à l'élève. Vrai ne veut pas dire connecté : c'est la
 * différence entre « la progression PEUT suivre l'élève » et « elle le suit ».
 */
export function comptesDisponibles(): boolean {
  const S = store()
  return !!S && S.enLigne()
}

/** Lecture ponctuelle, hors composant React (ex. au moment d'un enregistrement). */
export function eleveConnecte(): Eleve | null {
  const S = store()
  if (!S) return null
  const e = S.eleve()
  return e ? { prenom: e.prenom, nom: e.nom, classe: e.classe ?? null } : null
}

/**
 * Déclare au tableau de bord enseignant où en est l'élève EN CE MOMENT.
 *
 * Les six ateliers sont reconnus par leur nom de fichier ; « Le PC » vit ailleurs, il
 * doit donc se présenter. `store.js` appelle cette fonction à chaque battement (45 s) et
 * n'en retient que `atelier`, `niveau` et `mission` — le reste serait ignoré.
 *
 * `atelier: 'pc'` doit correspondre à une entrée de `window.APPS_LIEES` côté atelier,
 * sinon le tableau de bord ignore la présence. `niveau` porte le numéro de chapitre :
 * c'est ce que le professeur lit, « chapitre 4/10 ».
 */
export function declarerPresence(chapitreCourant: () => number): void {
  if (typeof window === 'undefined') return
  ;(window as unknown as Record<string, unknown>).ATELIER_POSITION = () => ({
    atelier: 'pc',
    niveau: chapitreCourant(),
    mission: 0,
  })
}

/**
 * Le professeur a-t-il demandé d'ouvrir des chapitres à cet élève ?
 *
 * Le tableau de bord n'écrit JAMAIS dans la progression du jeu : il y déposerait des
 * `results` inventés, avec des étoiles et des scores qu'il faudrait fabriquer, et il
 * devrait pour cela connaître le modèle de données d'ici — qui a déjà changé une fois
 * (le chapitre 7 scindé en deux, migration v1 → v2). Il dépose donc un simple nombre,
 * et c'est CE fichier qui décide de ce que « débloquer jusqu'au chapitre N » veut dire.
 *
 * Renvoie le numéro demandé, ou 0. L'instruction est effacée par appliquerDeblocage()
 * une fois honorée : la suppression remonte au serveur comme n'importe quelle clé.
 */
export function lireDeblocage(): number {
  const S = store()
  if (!S) return 0
  const n = parseInt(S.get(CLE_DEBLOCAGE) || '', 10)
  return Number.isFinite(n) && n > 0 ? n : 0
}

/** Efface l'instruction : elle a été honorée, elle ne doit pas se rejouer à chaque visite. */
export function oublierDeblocage(): void {
  store()?.del(CLE_DEBLOCAGE)
}

/**
 * Version réactive. Le Store démarre sur son cache puis interroge le serveur : le profil
 * peut donc arriver APRÈS le premier rendu, et il repart à null si la session expire en
 * pleine séance. On s'abonne plutôt que de lire une fois.
 */
export function useCompte(): Eleve | null {
  const [eleve, setEleve] = useState<Eleve | null>(() => eleveConnecte())

  useEffect(() => {
    const S = store()
    if (!S) return
    /* surEtat rappelle immédiatement, puis à chaque changement d'état. */
    S.surEtat(() => setEleve(eleveConnecte()))
  }, [])

  return eleve
}
