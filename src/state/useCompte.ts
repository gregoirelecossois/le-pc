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
}

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
