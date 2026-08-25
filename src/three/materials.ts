/**
 * Matériaux PBR partagés. Créés paresseusement puis mis en cache :
 * une seule instance par matériau pour tout le jeu (rendu plus rapide).
 */

import * as THREE from 'three'
import { brushedTexture, grainTexture, pcbTexture } from './textures'

const cache = new Map<string, THREE.Material>()

function mat<T extends THREE.Material>(key: string, build: () => T): T {
  let m = cache.get(key) as T | undefined
  if (!m) {
    m = build()
    cache.set(key, m)
  }
  return m
}

const std = (p: THREE.MeshStandardMaterialParameters) => new THREE.MeshStandardMaterial(p)
const phys = (p: THREE.MeshPhysicalMaterialParameters) => new THREE.MeshPhysicalMaterial(p)

export const M = {
  /* ---------- Boîtier ---------- */

  /** Tôle peinte noire mate du boîtier */
  caseSteel: () =>
    mat('caseSteel', () => {
      const r = brushedTexture(3)
      r.repeat.set(3, 3)
      return std({
        color: '#3a3f47',
        metalness: 0.78,
        roughness: 0.5,
        roughnessMap: r,
        envMapIntensity: 0.9,
      })
    }),

  /** Intérieur du boîtier, un peu plus clair pour rester lisible */
  caseInner: () =>
    mat('caseInner', () =>
      std({ color: '#464a52', metalness: 0.68, roughness: 0.6, envMapIntensity: 0.75 }),
    ),

  /** Plastique texturé de la façade */
  casePlastic: () =>
    mat('casePlastic', () => {
      const g = grainTexture(11)
      g.repeat.set(6, 6)
      return std({ color: '#26292f', metalness: 0.12, roughness: 0.76, roughnessMap: g })
    }),

  /** Panneau latéral en verre teinté */
  glass: () =>
    mat('glass', () =>
      phys({
        color: '#2a3138',
        metalness: 0,
        roughness: 0.06,
        transmission: 0.86,
        thickness: 0.4,
        ior: 1.5,
        transparent: true,
        opacity: 0.42,
        side: THREE.DoubleSide,
      }),
    ),

  /* ---------- Circuits imprimés ---------- */

  motherboardPcb: () =>
    mat('mbPcb', () => {
      const { map, rough } = pcbTexture(7)
      map.repeat.set(1, 1)
      return std({ map, roughnessMap: rough, roughness: 0.58, metalness: 0.22, envMapIntensity: 0.55 })
    }),

  /** PCB bleu foncé (carte graphique) */
  pcbBlue: () =>
    mat('pcbBlue', () => {
      const { map, rough } = pcbTexture(23, {
        base: '#101828',
        trace: '#2a3f66',
        silk: '#d6dced',
        density: 150,
        size: 512,
      })
      return std({ map, roughnessMap: rough, roughness: 0.6, metalness: 0.2 })
    }),

  /** PCB noir (RAM, SSD) */
  pcbBlack: () =>
    mat('pcbBlack', () => {
      const { map, rough } = pcbTexture(41, {
        base: '#0d0f12',
        trace: '#242a33',
        silk: '#c8cdd6',
        density: 110,
        size: 512,
      })
      return std({ map, roughnessMap: rough, roughness: 0.55, metalness: 0.25 })
    }),

  /* ---------- Métaux ---------- */

  /** Contacts dorés (CPU, barrettes, cartes PCIe) */
  gold: () =>
    mat('gold', () =>
      std({ color: '#d9ad4a', metalness: 1, roughness: 0.24, envMapIntensity: 1.5 }),
    ),

  /** Capot métallique du processeur (IHS) : nickel poli */
  ihs: () =>
    mat('ihs', () =>
      std({ color: '#c9ced6', metalness: 1, roughness: 0.16, envMapIntensity: 1.7 }),
    ),

  /** Ailettes d'aluminium brut */
  aluminium: () =>
    mat('aluminium', () =>
      std({ color: '#b9bfc7', metalness: 1, roughness: 0.34, envMapIntensity: 1.3 }),
    ),

  /** Caloducs cuivrés */
  copper: () =>
    mat('copper', () =>
      std({ color: '#b87333', metalness: 1, roughness: 0.22, envMapIntensity: 1.5 }),
    ),

  /** Acier des équerres et des cages */
  steel: () =>
    mat('steel', () =>
      std({ color: '#9aa1ab', metalness: 1, roughness: 0.38, envMapIntensity: 1.2 }),
    ),

  /** Acier sombre (capot alim, coque disque dur) */
  darkSteel: () =>
    mat('darkSteel', () =>
      std({ color: '#3a3d43', metalness: 0.95, roughness: 0.42, envMapIntensity: 1 }),
    ),

  screw: () =>
    mat('screw', () =>
      std({ color: '#8d939c', metalness: 1, roughness: 0.3, envMapIntensity: 1.2 }),
    ),

  /* ---------- Plastiques ---------- */

  /** Plastique noir brillant (connecteurs, cadres) */
  plasticBlack: () =>
    mat('plasticBlack', () =>
      std({ color: '#1e2127', metalness: 0.08, roughness: 0.44, envMapIntensity: 0.9 }),
    ),

  /** Plastique gris mat */
  plasticGrey: () =>
    mat('plasticGrey', () =>
      std({ color: '#4a4f57', metalness: 0.05, roughness: 0.72 }),
    ),

  /** Pales de ventilateur : plastique translucide légèrement laiteux */
  fanBlade: () =>
    mat('fanBlade', () =>
      std({
        color: '#c3ccd6',
        metalness: 0.05,
        roughness: 0.34,
        transparent: true,
        opacity: 0.88,
        envMapIntensity: 1.1,
      }),
    ),

  /* ---------- Repères pédagogiques ---------- */

  /** Emplacement libre en attente (fantôme clignotant) */
  ghost: () =>
    mat('ghost', () =>
      std({
        color: '#4dd0e1',
        transparent: true,
        opacity: 0.08,
        emissive: '#4dd0e1',
        emissiveIntensity: 0.6,
        depthWrite: false,
        side: THREE.DoubleSide,
      }),
    ),

  /** Emplacement validé */
  ghostOk: () =>
    mat('ghostOk', () =>
      std({
        color: '#66d17a',
        transparent: true,
        opacity: 0.14,
        emissive: '#66d17a',
        emissiveIntensity: 0.8,
        depthWrite: false,
        side: THREE.DoubleSide,
      }),
    ),

  /** Emplacement refusé */
  ghostBad: () =>
    mat('ghostBad', () =>
      std({
        color: '#ff6b6b',
        transparent: true,
        opacity: 0.16,
        emissive: '#ff6b6b',
        emissiveIntensity: 0.9,
        depthWrite: false,
        side: THREE.DoubleSide,
      }),
    ),
}

/** Couleur d'émission pour les LED / diodes de la carte mère. */
export function ledMaterial(color: string, intensity = 2.2) {
  return mat(`led-${color}-${intensity}`, () =>
    std({ color: '#101010', emissive: color, emissiveIntensity: intensity, roughness: 0.4 }),
  )
}

/** Matériau d'étiquette (texture générée) : une instance par étiquette. */
export function labelMaterial(key: string, texture: THREE.Texture) {
  return mat(`labelmat-${key}`, () =>
    std({ map: texture, roughness: 0.72, metalness: 0.02 }),
  )
}

export function disposeMaterials() {
  cache.forEach((m) => m.dispose())
  cache.clear()
}
