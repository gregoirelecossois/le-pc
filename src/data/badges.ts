/** Récompenses débloquées en cours de partie. */

export type BadgeId =
  | 'explorateur'
  | 'nomenclature'
  | 'oeil-de-lynx'
  | 'pedagogue'
  | 'monteur'
  | 'electricien'
  | 'connecteur'
  | 'demonteur'
  | 'chrono'
  | 'sans-indice'
  | 'perfectionniste'
  | 'certifie'

export interface Badge {
  id: BadgeId
  icon: string
  name: string
  how: string
  color: string
}

export const BADGES: Badge[] = [
  { id: 'explorateur', icon: '🔭', name: 'Explorateur', how: 'Consulter toutes les fiches composants', color: '#4dd0e1' },
  { id: 'nomenclature', icon: '🏷️', name: 'Sans hésiter', how: 'Réussir « Comment ça s\'appelle ? » sans aucune faute', color: '#ff8a3d' },
  { id: 'oeil-de-lynx', icon: '👁️', name: 'Œil de lynx', how: 'Réussir « Trouve-le dans la tour » sans aucune faute', color: '#66d17a' },
  { id: 'pedagogue', icon: '🧠', name: 'Pédagogue', how: 'Relier tous les rôles sans erreur', color: '#a78bfa' },
  { id: 'monteur', icon: '🔧', name: 'Monteur', how: 'Terminer un montage complet', color: '#ffd166' },
  { id: 'electricien', icon: '⚡', name: 'Électricien', how: 'Câbler la machine sans erreur', color: '#f97316' },
  { id: 'connecteur', icon: '🔌', name: 'Branché', how: 'Brancher tous les périphériques du premier coup', color: '#38bdf8' },
  { id: 'demonteur', icon: '🧰', name: 'Démonteur prudent', how: 'Démonter dans le bon ordre sans erreur', color: '#94a3b8' },
  { id: 'chrono', icon: '⏱️', name: 'Contre la montre', how: 'Terminer le défi en moins de 3 minutes', color: '#f43f5e' },
  { id: 'sans-indice', icon: '🕶️', name: 'Sans filet', how: 'Terminer un chapitre sans demander d\'indice', color: '#c084fc' },
  { id: 'perfectionniste', icon: '⭐', name: 'Perfectionniste', how: 'Obtenir 3 étoiles à tous les chapitres', color: '#fbbf24' },
  { id: 'certifie', icon: '🏅', name: 'Technicien·ne certifié·e', how: 'Terminer les 9 chapitres', color: '#22d3ee' },
]

export const BADGE_BY_ID = Object.fromEntries(BADGES.map((b) => [b.id, b])) as Record<BadgeId, Badge>
