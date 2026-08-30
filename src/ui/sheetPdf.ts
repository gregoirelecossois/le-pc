/**
 * La leçon, mise en page pour le papier.
 *
 * Deux leçons, une progression, et pour chaque objet la photo du modèle 3D
 * que l'élève vient de manipuler. Rien d'autre : ni date, ni adresse de
 * site, ni nom d'application — c'est une fiche de cours, pas une capture
 * d'écran.
 *
 * Tout est écrit en Helvetica (la jumelle d'Arial), corps 8,8 à 14 : au-delà
 * une fiche de révision devient un poster, en deçà elle devient illisible.
 */

import { CHAPTERS } from '@/data/chapters'
import { COMPONENT_IDS } from '@/data/components'
import { LESSON_COMPONENTS, LESSON_PERIPHERALS } from '@/data/lesson'
import { PERIPHERALS, type PeripheralKind } from '@/data/peripherals'
import type { ChapterId } from '@/data/chapters'
import type { ChapterResult } from '@/state/useGame'
import type { Shot, ShotId } from '@/three/Thumbnails'
import { PdfDoc, textWidth, wrapText } from './pdf'

/* ---------------------------------------------------------------- */
/*  Palette « papier »                                               */
/* ---------------------------------------------------------------- */

/**
 * Les couleurs de l'écran sont pensées sur fond noir : posées sur du
 * blanc, elles deviennent illisibles. On les assombrit.
 */
export function ink(hex: string, factor = 0.6): string {
  const n = parseInt(hex.replace('#', ''), 16)
  const c = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => Math.round(v * factor))
  return '#' + c.map((v) => v.toString(16).padStart(2, '0')).join('')
}

const INK = '#1b2230'
const SOFT = '#55617a'
const CARD = '#f5f8fc'
const L1 = '#1e4e8c'
const L2 = '#0f6b57'
const L3 = '#6b3fa0'

const KIND_INK: Record<PeripheralKind, string> = {
  entree: '#166b78',
  sortie: '#1f7a3d',
  'entree-sortie': '#6b3fa0',
}

/* ---------------------------------------------------------------- */
/*  Gabarit                                                          */
/* ---------------------------------------------------------------- */

const M = 42
const BOTTOM = 792
const IMG_W = 92
const IMG_H = 69
const PAD = 9

export interface SheetData {
  pseudo: string
  xp: number
  results: Partial<Record<ChapterId, ChapterResult>>
  badgeCount: number
  badgeTotal: number
  levelTitle: string
  /** Photos des modèles 3D, indexées par `ShotId` */
  shots: Record<string, Shot>
}

export function buildRevisionPdf(d: SheetData): Blob {
  const doc = new PdfDoc()
  const W = doc.width - 2 * M
  let y = M
  let page = 1
  /** Titre rappelé en haut des pages suivantes. */
  let running = ''

  /* ---- Mise en page ---- */

  const footer = () => {
    doc.text(String(page), M, BOTTOM + 16, { size: 8.5, color: '#a3adbd', align: 'center', width: W })
  }

  const newPage = () => {
    footer()
    doc.newPage()
    page++
    y = M
    if (running) {
      doc.text(running, M, y, { size: 8.6, color: '#96a1b4' })
      doc.line(M, y + 14, M + W, y + 14, '#e2e8f1')
      y += 24
    }
  }

  const need = (h: number) => {
    if (y + h > BOTTOM) newPage()
  }

  /** Bandeau de titre d'une leçon. */
  const banner = (title: string, subtitle: string, color: string) => {
    // Un bandeau seul en bas de page n'annonce rien : on l'emmene avec au
    // moins une fiche. Et la page ainsi ouverte n'a pas de rappel de titre,
    // puisque le bandeau tout neuf en tient lieu.
    running = ''
    need(210)
    running = title
    doc.roundRect(M, y, W, 30, 7, color)
    doc.text(title, M + 13, y + 8, { size: 13, bold: true, color: '#ffffff' })
    y += 37
    y += doc.paragraph(subtitle, M, y, W, { size: 9.6, color: SOFT, leading: 12.8 })
    y += 10
  }

  /** Pastille colorée, calée sur son bord DROIT. */
  const chip = (label: string, right: number, top: number, color: string) => {
    const w = textWidth(label, 7.4, true) + 13
    doc.roundRect(right - w, top, w, 12.5, 6.2, color)
    doc.text(label, right - w + 6.5, top + 2.9, { size: 7.4, bold: true, color: '#ffffff' })
  }

  const star = (cx: number, cy: number, r: number, color: string) => {
    const pts: [number, number][] = []
    for (let i = 0; i < 10; i++) {
      const a = -Math.PI / 2 + (i * Math.PI) / 5
      const rad = i % 2 === 0 ? r : r * 0.44
      pts.push([cx + Math.cos(a) * rad, cy + Math.sin(a) * rad])
    }
    doc.polygon(pts, color)
  }

  const shot = (key: ShotId, x: number, top: number) => {
    const s = d.shots[key]
    if (!s) return
    doc.drawImage(doc.addJpeg(key, s.url, s.w, s.h), x, top, IMG_W, IMG_H)
  }

  /** Une fiche : photo à gauche, nom, rôle, et une phrase à retenir. */
  const card = ({
    key,
    title,
    label,
    role,
    memo,
    accent,
  }: {
    key: ShotId | null
    title: string
    label: string
    role: string
    memo: string
    accent: string
  }) => {
    const hasImg = !!(key && d.shots[key])
    const tx = M + PAD + (hasImg ? IMG_W + 13 : 4)
    const tw = M + W - PAD - tx

    const roleLines = wrapText(role, tw, 9.6)
    const memoLines = wrapText(memo, tw, 8.8)
    const textH = PAD + 16 + roleLines.length * 12.4 + 4 + memoLines.length * 11 + PAD
    const h = Math.max(hasImg ? IMG_H + 2 * PAD : 0, textH)

    need(h + 8)
    doc.roundRect(M, y, W, h, 8, CARD)
    doc.roundRect(M, y, 4.5, h, 2.2, accent)
    if (hasImg && key) shot(key, M + PAD, y + (h - IMG_H) / 2)

    let ty = y + PAD
    doc.text(title, tx, ty, { size: 11.4, bold: true, color: accent })
    chip(label.toUpperCase(), M + W - PAD, ty + 1, accent)
    ty += 16
    roleLines.forEach((l, i) => doc.text(l, tx, ty + i * 12.4, { size: 9.6, color: INK }))
    ty += roleLines.length * 12.4 + 4
    memoLines.forEach((l, i) => doc.text(l, tx, ty + i * 11, { size: 8.8, color: SOFT }))

    y += h + 8
  }

  /* ---------------------------------------------------------------- */
  /*  En-tête                                                          */
  /* ---------------------------------------------------------------- */

  doc.roundRect(M, y, W, 58, 10, '#152238')
  doc.text('Les composants et les périphériques du PC', M + 16, y + 12, {
    size: 14,
    bold: true,
    color: '#ffffff',
  })
  doc.text(d.pseudo ? `Fiche de révision de ${d.pseudo}` : 'Fiche de révision', M + 16, y + 34, {
    size: 10,
    color: '#9fc0e8',
  })
  doc.text('Technologie', M, y + 34, { size: 9.5, color: '#7f9dc4', align: 'right', width: W - 16 })
  y += 74

  /* ---------------------------------------------------------------- */
  /*  Leçon 1 — les composants                                         */
  /* ---------------------------------------------------------------- */

  banner(
    'Leçon 1A — Les composants du PC',
    "L'unité centrale est la « tour » de l'ordinateur. À l'intérieur, chaque pièce a un rôle précis : voici comment les reconnaître et à quoi chacune sert.",
    L1,
  )

  for (const e of LESSON_COMPONENTS) {
    card({ ...e, key: e.shot, accent: ink(e.color) })
  }

  /* ---------------------------------------------------------------- */
  /*  Leçon 2 — les périphériques                                      */
  /* ---------------------------------------------------------------- */

  y += 10
  banner(
    'Leçon 2A — Les périphériques principaux du PC',
    "Un périphérique est un appareil branché AUTOUR de l'unité centrale. Il est d'ENTRÉE quand il envoie de l'information à l'ordinateur, de SORTIE quand il en reçoit pour te la restituer, et parfois les deux à la fois.",
    L2,
  )

  for (const e of LESSON_PERIPHERALS) {
    card({ ...e, key: e.shot, accent: KIND_INK[e.kind as PeripheralKind] })
  }

  y += 6
  /* ---------------------------------------------------------------- */
  /*  Ma progression                                                   */
  /* ---------------------------------------------------------------- */

  // Le bilan de l'eleve occupe sa propre page : c'est la partie qu'il
  // regardera en premier, et la seule qui lui soit personnelle.
  running = ''
  if (y > M + 40) newPage()
  banner('Ma progression', 'Ce que tu as terminé dans les ateliers.', L3)

  const colW = (W - 20) / 2
  const top = y

  doc.text('Les ateliers', M, y, { size: 10.5, bold: true, color: INK })
  y += 17
  for (const c of CHAPTERS) {
    const r = d.results[c.id]
    doc.text(`${c.n}. ${c.title}`, M, y, { size: 9.4, color: r?.done ? INK : '#96a1b4' })
    if (r?.done) {
      for (let i = 0; i < 3; i++) {
        star(M + colW - 32 + i * 11, y + 5, 4.6, i < r.stars ? '#d9a300' : '#dde4ee')
      }
    } else {
      doc.text('non fait', M + colW - 44, y, { size: 8.6, color: '#a8b2c2' })
    }
    y += 14.6
  }

  const rx = M + colW + 20
  let yr = top
  doc.text('Mon bilan', rx, yr, { size: 10.5, bold: true, color: INK })
  yr += 17
  for (const l of [
    `Niveau atteint : ${d.levelTitle}`,
    `Expérience : ${d.xp} XP`,
    `Badges décrochés : ${d.badgeCount} sur ${d.badgeTotal}`,
    `Composants étudiés : ${COMPONENT_IDS.length}`,
    `Périphériques étudiés : ${PERIPHERALS.length}`,
  ]) {
    doc.text(l, rx, yr, { size: 9.4, color: INK })
    yr += 14.6
  }

  y = Math.max(y, yr) + 14
  /* ---- Encadré de sécurité ---- */

  const safety =
    "On débranche la prise murale, on se décharge de l'électricité statique en touchant le métal du boîtier, on tient les cartes par les bords, et on ne force jamais : si ça ne rentre pas, c'est que ce n'est pas dans le bon sens."
  const safetyLines = wrapText(safety, W - 26, 8.8)
  const boxH = 24 + safetyLines.length * 11 + 10
  need(boxH)
  doc.roundRect(M, y, W, boxH, 8, '#fff5e0')
  doc.text('À retenir avant de démonter une vraie machine', M + 13, y + 9, {
    size: 9.6,
    bold: true,
    color: '#8a5a00',
  })
  safetyLines.forEach((l, i) =>
    doc.text(l, M + 13, y + 25 + i * 11, { size: 8.8, color: '#8a5a00' }),
  )


  footer()
  return doc.build()
}
