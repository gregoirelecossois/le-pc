/**
 * Fabrique de PDF, sans aucune bibliothèque extérieure.
 *
 * Pourquoi ne pas simplement imprimer la page ?
 *
 *   1. Les postes de la salle n'ont pas d'imprimante : l'élève doit
 *      repartir avec un FICHIER.
 *   2. Le navigateur ajoute d'office, en haut et en bas de chaque feuille,
 *      le titre de l'onglet et l'adresse du site. Sur une leçon distribuée
 *      en classe, ça n'a rien à faire.
 *
 * On écrit donc le PDF nous-mêmes. C'est un format simple : une suite
 * d'objets numérotés, un tableau qui donne la position de chacun dans le
 * fichier (le « xref »), et une table des matières finale.
 *
 * Deux limites assumées :
 *   - seules les polices standard (Helvetica) sont utilisées, ce qui évite
 *     d'embarquer un fichier de police ;
 *   - les images sont des JPEG, que le PDF sait relire tels quels
 *     (filtre DCTDecode) : aucune compression à réimplémenter.
 */

/* ---------------------------------------------------------------- */
/*  Encodage du texte                                                */
/* ---------------------------------------------------------------- */

/**
 * Caractères typographiques absents du Latin-1 mais présents dans
 * l'encodage WinAnsi des polices PDF (tirets longs, apostrophes
 * courbes, œ...).
 */
const WIN_ANSI: Record<string, number> = {
  '€': 0x80,
  '‚': 0x82,
  'ƒ': 0x83,
  '„': 0x84,
  '…': 0x85,
  '†': 0x86,
  '‡': 0x87,
  'ˆ': 0x88,
  '‰': 0x89,
  'Š': 0x8a,
  '‹': 0x8b,
  'Œ': 0x8c,
  'Ž': 0x8e,
  '‘': 0x91,
  '’': 0x92,
  '“': 0x93,
  '”': 0x94,
  '•': 0x95,
  '–': 0x96,
  '—': 0x97,
  '˜': 0x98,
  '™': 0x99,
  'š': 0x9a,
  '›': 0x9b,
  'œ': 0x9c,
  'ž': 0x9e,
  'Ÿ': 0x9f,
}

/** Un octet par caractère : c'est ce qu'attend l'encodage WinAnsi. */
function bytes(s: string): Uint8Array {
  const out = new Uint8Array(s.length)
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i)
    out[i] = c < 256 ? c : (WIN_ANSI[s[i]] ?? 0x3f) // « ? » pour l'imprévu
  }
  return out
}

/** Une chaîne littérale PDF : parenthèses et antislashs protégés. */
function lit(s: string): string {
  let out = ''
  for (const ch of s) {
    if (ch === '(' || ch === ')' || ch === '\\') out += '\\' + ch
    else out += ch
  }
  return out
}

/* ---------------------------------------------------------------- */
/*  Mesure du texte                                                  */
/* ---------------------------------------------------------------- */

let measureCtx: CanvasRenderingContext2D | null = null

/**
 * Largeur d'un texte, en points.
 *
 * On la demande au navigateur avec Arial : Helvetica (la police du PDF)
 * et Arial partagent exactement les mêmes chasses, c'est la raison d'être
 * d'Arial. Les retours à la ligne calculés ici tombent donc juste.
 */
export function textWidth(s: string, size: number, bold = false): number {
  if (!measureCtx) measureCtx = document.createElement('canvas').getContext('2d')
  if (!measureCtx) return s.length * size * 0.5
  measureCtx.font = `${bold ? 'bold ' : ''}${size}px Arial, Helvetica, sans-serif`
  return measureCtx.measureText(s).width
}

/** Découpe un paragraphe en lignes qui tiennent dans `max` points. */
export function wrapText(s: string, max: number, size: number, bold = false): string[] {
  const words = s.split(/\s+/).filter(Boolean)
  const lines: string[] = []
  let line = ''
  for (const w of words) {
    const next = line ? `${line} ${w}` : w
    if (line && textWidth(next, size, bold) > max) {
      lines.push(line)
      line = w
    } else {
      line = next
    }
  }
  if (line) lines.push(line)
  return lines
}

/* ---------------------------------------------------------------- */
/*  Document                                                         */
/* ---------------------------------------------------------------- */

interface PdfImage {
  name: string
  data: Uint8Array
  w: number
  h: number
}

export interface TextOpts {
  size?: number
  bold?: boolean
  /** Couleur « #rrggbb » */
  color?: string
  /** Alignement dans une largeur donnée */
  align?: 'left' | 'center' | 'right'
  width?: number
}

const A4 = { w: 595.28, h: 841.89 }

export class PdfDoc {
  readonly width = A4.w
  readonly height = A4.h

  /** Flux de dessin des pages déjà terminées */
  private done: string[] = []
  /** Flux de la page en cours */
  private cur: string[] = []
  private images: PdfImage[] = []
  private imageByKey = new Map<string, string>()

  /* ---- Couleurs ---- */

  private static rgb(hex: string): [number, number, number] {
    const h = hex.replace('#', '')
    const n = parseInt(h.length === 3 ? h.replace(/./g, (c) => c + c) : h, 16)
    return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255]
  }

  private static fmt(n: number): string {
    return (Math.round(n * 100) / 100).toString()
  }

  /* ---- Repère : on travaille en coordonnées « écran » (y vers le bas) ---- */

  private y(v: number): number {
    return this.height - v
  }

  /* ---- Dessin ---- */

  rect(x: number, yTop: number, w: number, h: number, color: string) {
    const [r, g, b] = PdfDoc.rgb(color)
    const f = PdfDoc.fmt
    this.cur.push(
      `q ${f(r)} ${f(g)} ${f(b)} rg ${f(x)} ${f(this.y(yTop + h))} ${f(w)} ${f(h)} re f Q`,
    )
  }

  /** Rectangle aux coins arrondis (quatre courbes de Bézier). */
  roundRect(x: number, yTop: number, w: number, h: number, r: number, color: string) {
    const [rr, gg, bb] = PdfDoc.rgb(color)
    const f = PdfDoc.fmt
    const y0 = this.y(yTop + h)
    const y1 = this.y(yTop)
    const k = r * 0.5523
    const p: string[] = []
    p.push(`${f(x + r)} ${f(y0)} m`)
    p.push(`${f(x + w - r)} ${f(y0)} l`)
    p.push(`${f(x + w - r + k)} ${f(y0)} ${f(x + w)} ${f(y0 + r - k)} ${f(x + w)} ${f(y0 + r)} c`)
    p.push(`${f(x + w)} ${f(y1 - r)} l`)
    p.push(`${f(x + w)} ${f(y1 - r + k)} ${f(x + w - r + k)} ${f(y1)} ${f(x + w - r)} ${f(y1)} c`)
    p.push(`${f(x + r)} ${f(y1)} l`)
    p.push(`${f(x + r - k)} ${f(y1)} ${f(x)} ${f(y1 - r + k)} ${f(x)} ${f(y1 - r)} c`)
    p.push(`${f(x)} ${f(y0 + r)} l`)
    p.push(`${f(x)} ${f(y0 + r - k)} ${f(x + r - k)} ${f(y0)} ${f(x + r)} ${f(y0)} c`)
    this.cur.push(`q ${f(rr)} ${f(gg)} ${f(bb)} rg ${p.join(' ')} h f Q`)
  }

  /** Polygone plein (les etoiles de la progression). */
  polygon(points: [number, number][], color: string) {
    if (points.length < 3) return
    const [r, g, b] = PdfDoc.rgb(color)
    const f = PdfDoc.fmt
    const path = points
      .map(([px, py], i) => `${f(px)} ${f(this.y(py))} ${i === 0 ? 'm' : 'l'}`)
      .join(' ')
    this.cur.push(`q ${f(r)} ${f(g)} ${f(b)} rg ${path} h f Q`)
  }

  line(x1: number, y1: number, x2: number, y2: number, color: string, w = 0.7) {
    const [r, g, b] = PdfDoc.rgb(color)
    const f = PdfDoc.fmt
    this.cur.push(
      `q ${f(r)} ${f(g)} ${f(b)} RG ${f(w)} w ${f(x1)} ${f(this.y(y1))} m ${f(x2)} ${f(this.y(y2))} l S Q`,
    )
  }

  /**
   * Écrit une ligne de texte. `yTop` est le HAUT de la ligne : c'est plus
   * simple à enchaîner qu'une position de ligne de base.
   */
  text(s: string, x: number, yTop: number, opts: TextOpts = {}) {
    const size = opts.size ?? 10
    const bold = opts.bold ?? false
    const [r, g, b] = PdfDoc.rgb(opts.color ?? '#1a1d24')
    const f = PdfDoc.fmt
    let px = x
    if (opts.align && opts.width) {
      const w = textWidth(s, size, bold)
      if (opts.align === 'center') px = x + (opts.width - w) / 2
      else if (opts.align === 'right') px = x + opts.width - w
    }
    // ligne de base : environ 80 % de la hauteur de corps sous le sommet
    const base = this.y(yTop + size * 0.82)
    this.cur.push(
      `BT ${f(r)} ${f(g)} ${f(b)} rg /${bold ? 'F2' : 'F1'} ${f(size)} Tf ` +
        `1 0 0 1 ${f(px)} ${f(base)} Tm (${lit(s)}) Tj ET`,
    )
  }

  /** Paragraphe justifié à gauche. Renvoie la hauteur occupée. */
  paragraph(s: string, x: number, yTop: number, w: number, opts: TextOpts & { leading?: number } = {}) {
    const size = opts.size ?? 10
    const lead = opts.leading ?? size * 1.34
    const lines = wrapText(s, w, size, opts.bold)
    lines.forEach((l, i) => this.text(l, x, yTop + i * lead, opts))
    return lines.length * lead
  }

  /* ---- Images ---- */

  /**
   * Enregistre une image JPEG (`data:image/jpeg;base64,...`) et renvoie son
   * nom interne. La même image n'est stockée qu'une fois.
   */
  addJpeg(key: string, dataUrl: string, w: number, h: number): string {
    const known = this.imageByKey.get(key)
    if (known) return known
    const b64 = dataUrl.slice(dataUrl.indexOf(',') + 1)
    const bin = atob(b64)
    const data = new Uint8Array(bin.length)
    for (let i = 0; i < bin.length; i++) data[i] = bin.charCodeAt(i)
    const name = `Im${this.images.length + 1}`
    this.images.push({ name, data, w, h })
    this.imageByKey.set(key, name)
    return name
  }

  drawImage(name: string, x: number, yTop: number, w: number, h: number) {
    const f = PdfDoc.fmt
    this.cur.push(`q ${f(w)} 0 0 ${f(h)} ${f(x)} ${f(this.y(yTop + h))} cm /${name} Do Q`)
  }

  /* ---- Pages ---- */

  newPage() {
    this.done.push(this.cur.join('\n'))
    this.cur = []
  }

  get pageCount(): number {
    return this.done.length + 1
  }

  /* ---- Sérialisation ---- */

  build(): Blob {
    const pages = [...this.done, this.cur.join('\n')]

    // Objets : 1 catalogue, 2 arbre des pages, 3+4 polices, puis les
    // images, puis pour chaque page un objet page et un objet flux.
    const chunks: Uint8Array[] = []
    const offsets: number[] = []
    let pos = 0

    const push = (s: string | Uint8Array) => {
      const b = typeof s === 'string' ? bytes(s) : s
      chunks.push(b)
      pos += b.length
    }

    const obj = (n: number, body: string, stream?: Uint8Array) => {
      offsets[n] = pos
      push(`${n} 0 obj\n${body}\n`)
      if (stream) {
        push('stream\n')
        push(stream)
        push('\nendstream\n')
      }
      push('endobj\n')
    }

    const imgFirst = 5
    const pageFirst = imgFirst + this.images.length
    const kids = pages.map((_, i) => `${pageFirst + i * 2} 0 R`).join(' ')
    const xobjects = this.images.map((im, i) => `/${im.name} ${imgFirst + i} 0 R`).join(' ')
    const resources =
      `<< /Font << /F1 3 0 R /F2 4 0 R >> ` +
      (this.images.length ? `/XObject << ${xobjects} >> ` : '') +
      `>>`

    push('%PDF-1.4\n%âãÏÓ\n')

    obj(1, '<< /Type /Catalog /Pages 2 0 R >>')
    obj(
      2,
      `<< /Type /Pages /Count ${pages.length} /Kids [ ${kids} ] ` +
        `/MediaBox [0 0 ${PdfDoc.fmt(this.width)} ${PdfDoc.fmt(this.height)}] /Resources ${resources} >>`,
    )
    obj(3, '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>')
    obj(4, '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>')

    this.images.forEach((im, i) => {
      obj(
        imgFirst + i,
        `<< /Type /XObject /Subtype /Image /Width ${im.w} /Height ${im.h} ` +
          `/ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${im.data.length} >>`,
        im.data,
      )
    })

    pages.forEach((content, i) => {
      const pageId = pageFirst + i * 2
      obj(pageId, `<< /Type /Page /Parent 2 0 R /Contents ${pageId + 1} 0 R >>`)
      const data = bytes(content)
      obj(pageId + 1, `<< /Length ${data.length} >>`, data)
    })

    const total = offsets.length
    const xrefPos = pos
    let xref = `xref\n0 ${total}\n0000000000 65535 f \n`
    for (let n = 1; n < total; n++) {
      xref += `${String(offsets[n] ?? 0).padStart(10, '0')} 00000 n \n`
    }
    push(xref)
    push(`trailer\n<< /Size ${total} /Root 1 0 R >>\nstartxref\n${xrefPos}\n%%EOF\n`)

    return new Blob(chunks as BlobPart[], { type: 'application/pdf' })
  }
}

/** Propose le fichier au téléchargement. */
export function downloadPdf(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  // laisser le temps au navigateur d'ouvrir le flux avant de le libérer
  setTimeout(() => URL.revokeObjectURL(url), 4000)
}
