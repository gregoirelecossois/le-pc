/**
 * Parcours en 9 chapitres. Chaque chapitre = un exercice.
 * L'ordre est pensé pour aller du plus simple (regarder, nommer)
 * au plus exigeant (monter, câbler, démonter, refaire en temps limité).
 */

export type ChapterId =
  | 'decouverte'
  | 'nommer'
  | 'reperer'
  | 'roles'
  | 'montage'
  | 'cablage'
  | 'peripheriques'
  | 'demontage'
  | 'defi'

export interface Chapter {
  id: ChapterId
  n: number
  icon: string
  title: string
  subtitle: string
  /** Consigne affichée en début d'exercice */
  goal: string
  /** Ce que l'élève doit savoir faire à la fin */
  objective: string
  /** Chapitre à terminer pour débloquer celui-ci */
  requires: ChapterId | null
  /** XP maximum */
  xp: number
  /** Durée indicative en minutes (pour préparer la séance) */
  minutes: number
  color: string
}

export const CHAPTERS: Chapter[] = [
  {
    id: 'decouverte',
    n: 1,
    icon: '🔍',
    title: 'La visite guidée',
    subtitle: 'Ouvre la tour et fais connaissance',
    goal: "Fais glisser la vue éclatée et clique sur les composants DANS LA MACHINE pour découvrir leur fiche. Trouve-les tous !",
    objective: 'Reconnaître visuellement chaque composant et savoir où il se trouve.',
    requires: null,
    xp: 150,
    minutes: 12,
    color: '#4dd0e1',
  },
  {
    id: 'nommer',
    n: 2,
    icon: '🏷️',
    title: 'Comment ça s\'appelle ?',
    subtitle: 'Le composant tourne, tu donnes son nom',
    goal: 'Observe la pièce en 3D et choisis son nom parmi les quatre propositions.',
    objective: 'Associer une forme à un nom, sans hésiter.',
    requires: 'decouverte',
    xp: 120,
    minutes: 8,
    color: '#ff8a3d',
  },
  {
    id: 'reperer',
    n: 3,
    icon: '🎯',
    title: 'Trouve-le dans la tour',
    subtitle: 'On te donne le nom, tu cliques dessus',
    goal: 'Clique sur le composant demandé directement dans la vue éclatée.',
    objective: 'Situer chaque composant dans le boîtier.',
    requires: 'nommer',
    xp: 120,
    minutes: 8,
    color: '#66d17a',
  },
  {
    id: 'roles',
    n: 4,
    icon: '🧠',
    title: 'À quoi ça sert ?',
    subtitle: 'Relie chaque pièce à son rôle',
    goal: "Associe chaque composant à la phrase qui décrit son rôle dans l'ordinateur.",
    objective: "Expliquer avec ses mots la fonction de chaque composant.",
    requires: 'reperer',
    xp: 140,
    minutes: 10,
    color: '#a78bfa',
  },
  {
    id: 'montage',
    n: 5,
    icon: '🔧',
    title: 'Le montage',
    subtitle: 'Assemble la machine, pièce par pièce',
    goal: "Fais glisser chaque composant à sa place, dans le bon ordre. Le boîtier t'indique les emplacements libres.",
    objective: 'Monter une unité centrale complète en respectant l\'ordre logique.',
    requires: 'roles',
    xp: 220,
    minutes: 15,
    color: '#ffd166',
  },
  {
    id: 'cablage',
    n: 6,
    icon: '🔌',
    title: 'Le câblage',
    subtitle: 'Distribue le courant et les données',
    goal: 'Relie chaque câble de l\'alimentation au bon connecteur.',
    objective: 'Identifier les principaux câbles internes et leur destination.',
    requires: 'montage',
    xp: 180,
    minutes: 12,
    color: '#f97316',
  },
  {
    id: 'peripheriques',
    n: 7,
    icon: '🖥️',
    title: 'Les périphériques',
    subtitle: 'Branche tout ce qui se voit',
    goal: "Branche chaque périphérique sur la bonne prise à l'arrière, puis classe-le en entrée ou sortie.",
    objective: 'Reconnaître les prises et distinguer périphériques d\'entrée et de sortie.',
    requires: 'montage',
    xp: 170,
    minutes: 12,
    color: '#38bdf8',
  },
  {
    id: 'demontage',
    n: 8,
    icon: '🧰',
    title: 'Le démontage',
    subtitle: "L'ordre inverse, sans rien casser",
    goal: 'Retire les composants dans le bon ordre. Attention : on ne retire pas un composant qui en supporte un autre.',
    objective: 'Démonter une machine en sécurité, dans le bon ordre.',
    requires: 'cablage',
    xp: 190,
    minutes: 10,
    color: '#94a3b8',
  },
  {
    id: 'defi',
    n: 9,
    icon: '🏆',
    title: 'Le défi du technicien',
    subtitle: 'Montage complet contre la montre',
    goal: 'Monte la machine entière le plus vite possible, sans indice. Chaque erreur coûte 10 secondes.',
    objective: 'Maîtriser l\'ensemble : nom, place, rôle et ordre de montage.',
    requires: 'demontage',
    xp: 300,
    minutes: 10,
    color: '#f43f5e',
  },
]

export const CHAPTER_BY_ID = Object.fromEntries(CHAPTERS.map((c) => [c.id, c])) as Record<
  ChapterId,
  Chapter
>

/* ---------------------------------------------------------------- */
/*  Niveaux                                                          */
/* ---------------------------------------------------------------- */

export const LEVELS = [
  { xp: 0, title: 'Curieux·se', icon: '🐣' },
  { xp: 150, title: 'Apprenti·e', icon: '🔩' },
  { xp: 380, title: 'Assistant·e technicien·ne', icon: '🪛' },
  { xp: 700, title: 'Technicien·ne', icon: '🔧' },
  { xp: 1100, title: 'Technicien·ne confirmé·e', icon: '⚙️' },
  { xp: 1570, title: 'Expert·e matériel', icon: '🏅' },
]

export function levelFor(xp: number) {
  let i = 0
  for (let k = 0; k < LEVELS.length; k++) if (xp >= LEVELS[k].xp) i = k
  const current = LEVELS[i]
  const next = LEVELS[i + 1]
  const span = next ? next.xp - current.xp : 1
  const done = next ? xp - current.xp : 1
  return {
    index: i,
    ...current,
    next,
    progress: next ? Math.min(1, done / span) : 1,
    toNext: next ? next.xp - xp : 0,
  }
}
