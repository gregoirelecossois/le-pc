/**
 * Connectique arrière de l'unité centrale.
 * Sert à la fois au modèle 3D (dessin des prises) et à l'exercice
 * « branche les périphériques ».
 *
 * Coordonnées MONDE, en centimètres (voir three/layout.ts).
 */

import { MB } from '@/three/layout'
import type { Vec3 } from '@/three/layout'

export type PortKind =
  | 'usb2'
  | 'usb3'
  | 'usbc'
  | 'hdmi'
  | 'displayport'
  | 'rj45'
  | 'jack'
  | 'psu'

export interface Port {
  id: string
  kind: PortKind
  /** Nom affiché à l'élève */
  label: string
  /** Explication courte */
  hint: string
  /** Sur quel élément la prise se trouve */
  host: 'motherboard' | 'gpu' | 'psu'
  position: Vec3
  /** Taille apparente de la prise [largeur X, hauteur Y, profondeur Z] */
  size: Vec3
  color: string
  /** Couleur du liseré intérieur (repère normalisé : USB 3 bleu, jack vert...) */
  inner?: string
}

const S = MB.surfaceX
const IOZ = 22.35

/** Décalage en X depuis la surface de la carte mère (hauteur des prises). */
const x = (offset: number) => S + offset

export const PORTS: Port[] = [
  /* ---- Panneau de connectique de la carte mère ---- */
  {
    id: 'usb2-a',
    kind: 'usb2',
    label: 'USB 2.0',
    hint: "Prise USB classique : clavier, souris, imprimante, clé USB.",
    host: 'motherboard',
    position: [x(1.0), 40.4, IOZ],
    size: [1.5, 0.72, 1.5],
    color: '#111318',
    inner: '#1d2129',
  },
  {
    id: 'usb2-b',
    kind: 'usb2',
    label: 'USB 2.0',
    hint: "Prise USB classique : clavier, souris, imprimante, clé USB.",
    host: 'motherboard',
    position: [x(1.0), 39.5, IOZ],
    size: [1.5, 0.72, 1.5],
    color: '#111318',
    inner: '#1d2129',
  },
  {
    id: 'hdmi-mb',
    kind: 'hdmi',
    label: 'HDMI (carte mère)',
    hint: "Sortie vidéo du chipset graphique intégré au processeur. Inutilisée quand une carte graphique est installée !",
    host: 'motherboard',
    position: [x(1.05), 38.0, IOZ],
    size: [1.6, 0.65, 1.5],
    color: '#14171c',
    inner: '#2b313a',
  },
  {
    id: 'dp-mb',
    kind: 'displayport',
    label: 'DisplayPort (carte mère)',
    hint: "Autre sortie vidéo intégrée. Même remarque : la carte graphique prend le relais.",
    host: 'motherboard',
    position: [x(1.05), 36.9, IOZ],
    size: [1.6, 0.7, 1.5],
    color: '#14171c',
    inner: '#2b313a',
  },
  {
    id: 'usb3-a',
    kind: 'usb3',
    label: 'USB 3.0',
    hint: 'USB rapide, reconnaissable à son intérieur bleu. Idéal pour un disque externe.',
    host: 'motherboard',
    position: [x(1.0), 35.4, IOZ],
    size: [1.5, 0.72, 1.5],
    color: '#111318',
    inner: '#2f6fd0',
  },
  {
    id: 'usb3-b',
    kind: 'usb3',
    label: 'USB 3.0',
    hint: 'USB rapide, reconnaissable à son intérieur bleu.',
    host: 'motherboard',
    position: [x(1.0), 34.5, IOZ],
    size: [1.5, 0.72, 1.5],
    color: '#111318',
    inner: '#2f6fd0',
  },
  {
    id: 'usbc',
    kind: 'usbc',
    label: 'USB-C',
    hint: "Petite prise ovale réversible : elle se branche dans les deux sens.",
    host: 'motherboard',
    position: [x(0.95), 33.3, IOZ],
    size: [1.0, 0.42, 1.5],
    color: '#111318',
    inner: '#22262e',
  },
  {
    id: 'usb3-c',
    kind: 'usb3',
    label: 'USB 3.0',
    hint: 'USB rapide, intérieur bleu.',
    host: 'motherboard',
    position: [x(1.0), 32.2, IOZ],
    size: [1.5, 0.72, 1.5],
    color: '#111318',
    inner: '#2f6fd0',
  },
  {
    id: 'rj45',
    kind: 'rj45',
    label: 'Ethernet (RJ45)',
    hint: "Prise réseau filaire : elle relie l'ordinateur à la box ou au réseau du collège.",
    host: 'motherboard',
    position: [x(1.3), 30.6, IOZ],
    size: [1.9, 1.5, 1.6],
    color: '#0e1015',
    inner: '#e0b73a',
  },
  {
    id: 'jack-green',
    kind: 'jack',
    label: 'Jack vert (sortie son)',
    hint: 'Sortie audio : casque ou enceintes. Le vert est une norme, on la retrouve sur tous les PC.',
    host: 'motherboard',
    position: [x(0.55), 28.6, IOZ],
    size: [0.9, 0.9, 1.3],
    color: '#7bd17b',
  },
  {
    id: 'jack-pink',
    kind: 'jack',
    label: 'Jack rose (entrée micro)',
    hint: 'Entrée audio : microphone.',
    host: 'motherboard',
    position: [x(0.55), 27.5, IOZ],
    size: [0.9, 0.9, 1.3],
    color: '#e8a0bd',
  },
  {
    id: 'jack-blue',
    kind: 'jack',
    label: 'Jack bleu (entrée ligne)',
    hint: "Entrée audio pour une source extérieure (platine, instrument).",
    host: 'motherboard',
    position: [x(0.55), 26.4, IOZ],
    size: [0.9, 0.9, 1.3],
    color: '#8fb8e8',
  },

  /* ---- Sorties vidéo de la carte graphique ---- */
  {
    id: 'dp-gpu-1',
    kind: 'displayport',
    label: 'DisplayPort (carte graphique)',
    hint: "LA bonne sortie vidéo quand une carte graphique est installée.",
    host: 'gpu',
    position: [x(1.6), 21.4, 21.9],
    size: [1.7, 0.75, 1.4],
    color: '#101318',
    inner: '#2b313a',
  },
  {
    id: 'hdmi-gpu',
    kind: 'hdmi',
    label: 'HDMI (carte graphique)',
    hint: "Sortie vidéo de la carte graphique : c'est ici qu'on branche l'écran.",
    host: 'gpu',
    position: [x(1.6), 20.3, 21.9],
    size: [1.7, 0.7, 1.4],
    color: '#101318',
    inner: '#2b313a',
  },
  {
    id: 'dp-gpu-2',
    kind: 'displayport',
    label: 'DisplayPort (carte graphique)',
    hint: 'Deuxième sortie : on peut brancher un second écran.',
    host: 'gpu',
    position: [x(1.6), 19.2, 21.9],
    size: [1.7, 0.75, 1.4],
    color: '#101318',
    inner: '#2b313a',
  },

  /* ---- Bloc d'alimentation ---- */
  {
    id: 'psu-socket',
    kind: 'psu',
    label: "Prise secteur (C13)",
    hint: "L'arrivée du courant 230 V depuis la prise murale. Juste à côté : l'interrupteur O / I.",
    host: 'psu',
    position: [-3.6, 6.2, 22.6],
    size: [2.6, 2.4, 1.2],
    color: '#0d0f13',
  },
]

export const PORT_BY_ID = Object.fromEntries(PORTS.map((p) => [p.id, p])) as Record<string, Port>

/** Prises accessibles seulement si la carte graphique est montée. */
export const GPU_PORT_IDS = PORTS.filter((p) => p.host === 'gpu').map((p) => p.id)
