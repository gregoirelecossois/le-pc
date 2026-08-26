/**
 * Distingue un CLIC d'un GLISSER dans la scène 3D.
 *
 * Faire pivoter la machine se fait avec le bouton gauche enfoncé. Or
 * three.js déclenche `onClick` au relâchement, même si le pointeur a
 * parcouru la moitié de l'écran : sans ce garde-fou, tourner autour du
 * boîtier et relâcher au-dessus d'une pièce compte comme une réponse.
 *
 * On mesure donc le trajet du pointeur entre l'appui et le relâchement.
 * Au-delà du seuil, le clic qui suit est ignoré.
 */

/** Tolérance en pixels : un doigt ou une souris bougent toujours un peu. */
const SEUIL = 7

let startX = 0
let startY = 0
let dragged = false
let listening = 0

function onDown(e: PointerEvent) {
  startX = e.clientX
  startY = e.clientY
  dragged = false
}

function onMove(e: PointerEvent) {
  // aucun bouton enfoncé : simple survol, ce n'est pas un glisser
  if (e.buttons === 0) return
  if (Math.hypot(e.clientX - startX, e.clientY - startY) > SEUIL) dragged = true
}

/**
 * Active la surveillance ; renvoie la fonction d'arrêt.
 * Plusieurs appelants peuvent l'utiliser : on compte les références.
 */
export function watchDrag(): () => void {
  if (listening === 0) {
    // capture : on veut la position AVANT que three.js ne traite l'événement
    window.addEventListener('pointerdown', onDown, true)
    window.addEventListener('pointermove', onMove, true)
  }
  listening++
  return () => {
    listening--
    if (listening === 0) {
      window.removeEventListener('pointerdown', onDown, true)
      window.removeEventListener('pointermove', onMove, true)
    }
  }
}

/** Le geste qui vient de se terminer était-il un déplacement de vue ? */
export function wasDragged(): boolean {
  return dragged
}
