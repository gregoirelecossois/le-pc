/**
 * Fusion à l'affichage des pièces immobiles, pour les postes sans carte
 * graphique.
 *
 * La maquette compte plus de quatre cents objets : à chaque image, le
 * processeur doit les confier un par un à la carte graphique, et c'est ce
 * va-et-vient qui fait saccader les postes de la salle. Or une carte mère
 * ne se déforme pas : ses condensateurs, ses slots, ses vis restent à la
 * même place les uns par rapport aux autres. On fusionne donc, pour chaque
 * pièce, tous les objets qui partagent le même aspect (couleur, rugosité,
 * texture...) en un seul. L'image est identique, et il y a plus de deux
 * fois moins d'objets à envoyer (431 -> 187 dans la visite guidée).
 *
 * Actif en qualité « Basse » et « Très basse » (voir `isLite`).
 *
 * Ce qui tourne ou coulisse (hélices, tiroir, panneau vitré) porte
 * `userData={DYNAMIC}` : son contenu est fusionné À PART, et la fusion est
 * rangée dans le groupe animé, qu'elle suit donc dans son mouvement.
 *
 * Restent intacts : ce qui réagit lui-même au pointeur, les objets
 * instanciés, les lignes, et les objets cachés.
 */

import { useLayoutEffect, useRef, type ReactNode } from 'react'
import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'

/** À poser sur un groupe animé : il ne sera jamais fusionné. */
export const DYNAMIC = { dynamic: true } as const

const NO_RAYCAST = () => {}

/** Deux matériaux de même clé donnent exactement le même rendu. */
function materialKey(m: THREE.Material): string | null {
  if (!(m instanceof THREE.MeshStandardMaterial || m instanceof THREE.MeshBasicMaterial)) return null
  const s = m as THREE.MeshStandardMaterial & THREE.MeshBasicMaterial
  // un verre à transmission a son propre rendu : on ne le touche pas
  if ((m as THREE.MeshPhysicalMaterial).transmission > 0) return null
  return [
    m.type,
    s.color?.getHexString(),
    s.emissive?.getHexString(),
    s.emissiveIntensity,
    s.roughness,
    s.metalness,
    s.envMapIntensity,
    s.map?.uuid,
    s.roughnessMap?.uuid,
    s.metalnessMap?.uuid,
    s.normalMap?.uuid,
    s.emissiveMap?.uuid,
    s.alphaMap?.uuid,
    m.transparent,
    m.opacity,
    m.side,
    m.depthWrite,
    m.depthTest,
    m.blending,
    m.alphaTest,
    m.vertexColors,
    m.toneMapped,
    s.wireframe,
    s.flatShading,
    s.fog,
  ].join('|')
}

/** Le groupe qui porte la fusion : le groupe animé le plus proche, ou la racine. */
function holderOf(o: THREE.Object3D, root: THREE.Object3D) {
  for (let p: THREE.Object3D | null = o.parent; p && p !== root; p = p.parent) {
    if (p.userData?.dynamic) return p
  }
  return root
}

/**
 * Fusionne les objets immobiles sous `root`. Renvoie de quoi tout
 * défaire : les originaux réapparaissent et les fusions sont libérées.
 */
function batch(root: THREE.Group) {
  root.updateMatrixWorld(true)
  const groups = new Map<string, { holder: THREE.Object3D; material: THREE.Material; meshes: THREE.Mesh[] }>()

  root.traverse((o) => {
    const mesh = o as THREE.Mesh
    if (!mesh.isMesh || (mesh as THREE.InstancedMesh).isInstancedMesh || (mesh as THREE.SkinnedMesh).isSkinnedMesh) return
    if (Array.isArray(mesh.material) || mesh.geometry.morphAttributes.position) return
    // objet caché, lui ou un parent : on le laisse tel quel
    for (let p: THREE.Object3D | null = mesh; p && p !== root; p = p.parent) if (!p.visible) return
    // gestionnaires d'événements portés par l'objet lui-même
    if (((mesh as unknown as { __r3f?: { eventCount?: number } }).__r3f?.eventCount ?? 0) > 0) return
    const mk = materialKey(mesh.material)
    if (!mk) return
    const attrs = Object.keys(mesh.geometry.attributes).sort().join(',')
    const holder = holderOf(mesh, root)
    const key = `${holder.uuid}#${mk}#${attrs}#${mesh.renderOrder}`
    let g = groups.get(key)
    if (!g) groups.set(key, (g = { holder, material: mesh.material, meshes: [] }))
    g.meshes.push(mesh)
  })

  const merged: THREE.Mesh[] = []
  const hidden: { mesh: THREE.Mesh; raycast: THREE.Mesh['raycast'] }[] = []
  const m = new THREE.Matrix4()

  for (const { holder, material, meshes } of groups.values()) {
    // un objet seul n'a rien à gagner
    if (meshes.length < 2) continue
    const toLocal = new THREE.Matrix4().copy(holder.matrixWorld).invert()
    const geos = meshes.map((mesh) => {
      const g = mesh.geometry.index ? mesh.geometry.toNonIndexed() : mesh.geometry.clone()
      g.applyMatrix4(m.multiplyMatrices(toLocal, mesh.matrixWorld))
      return g
    })
    const geo = mergeGeometries(geos)
    geos.forEach((g) => g.dispose())
    if (!geo) continue
    const out = new THREE.Mesh(geo, material)
    out.name = 'lot'
    out.castShadow = meshes.some((x) => x.castShadow)
    out.receiveShadow = meshes.some((x) => x.receiveShadow)
    out.renderOrder = meshes[0].renderOrder
    holder.add(out)
    merged.push(out)
    for (const mesh of meshes) {
      hidden.push({ mesh, raycast: mesh.raycast })
      mesh.visible = false
      // le clic se fait désormais sur la fusion, qui remonte au même parent
      mesh.raycast = NO_RAYCAST
    }
  }

  return () => {
    for (const { mesh, raycast } of hidden) {
      mesh.visible = true
      mesh.raycast = raycast
    }
    for (const out of merged) {
      // le groupe animé a pu disparaître entre-temps (panneau vitré retiré)
      out.removeFromParent()
      out.geometry.dispose()
    }
  }
}

/**
 * Enveloppe une pièce. `deps` liste tout ce qui peut changer son contenu
 * (alimentation, pièces installées...) : la fusion est alors refaite.
 */
export function StaticBatch({
  enabled,
  deps,
  children,
}: {
  enabled: boolean
  deps: unknown[]
  children: ReactNode
}) {
  const root = useRef<THREE.Group>(null)

  useLayoutEffect(() => {
    if (!enabled || !root.current) return
    return batch(root.current)
  }, [enabled, ...deps]) // eslint-disable-line react-hooks/exhaustive-deps

  return <group ref={root}>{children}</group>
}
