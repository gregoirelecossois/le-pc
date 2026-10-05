/**
 * La photo fixe d'une pièce. Fichier à part : les jeux et la scène 3D s'en servent
 * tous les deux, la seconde comme solution de repli.
 */

import { useThumbShots } from '@/three/Thumbnails'
import { PIECES, photoDe, type PieceId } from './contenu'

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
