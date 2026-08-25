/**
 * Effets sonores générés par l'API Web Audio.
 * Aucun fichier son : rien à télécharger, tout fonctionne hors-ligne.
 */

let ctx: AudioContext | null = null
let enabled = true

function ac(): AudioContext | null {
  if (typeof window === 'undefined') return null
  if (!ctx) {
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    if (!Ctor) return null
    ctx = new Ctor()
  }
  if (ctx.state === 'suspended') void ctx.resume()
  return ctx
}

export function setSoundEnabled(v: boolean) {
  enabled = v
}

interface ToneOpts {
  freq: number
  dur: number
  type?: OscillatorType
  gain?: number
  delay?: number
  /** glissando : fréquence d'arrivée */
  to?: number
}

function tone({ freq, dur, type = 'sine', gain = 0.14, delay = 0, to }: ToneOpts) {
  const c = ac()
  if (!c || !enabled) return
  const t0 = c.currentTime + delay
  const osc = c.createOscillator()
  const g = c.createGain()
  osc.type = type
  osc.frequency.setValueAtTime(freq, t0)
  if (to) osc.frequency.exponentialRampToValueAtTime(Math.max(30, to), t0 + dur)
  g.gain.setValueAtTime(0.0001, t0)
  g.gain.exponentialRampToValueAtTime(gain, t0 + 0.012)
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur)
  osc.connect(g).connect(c.destination)
  osc.start(t0)
  osc.stop(t0 + dur + 0.05)
}

/** Bruit filtré : sert aux « clac » mécaniques et aux souffles. */
function noise(dur: number, freq: number, q: number, gain = 0.2, delay = 0) {
  const c = ac()
  if (!c || !enabled) return
  const t0 = c.currentTime + delay
  const len = Math.max(1, Math.floor(c.sampleRate * dur))
  const buf = c.createBuffer(1, len, c.sampleRate)
  const data = buf.getChannelData(0)
  for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len)
  const src = c.createBufferSource()
  src.buffer = buf
  const filt = c.createBiquadFilter()
  filt.type = 'bandpass'
  filt.frequency.value = freq
  filt.Q.value = q
  const g = c.createGain()
  g.gain.setValueAtTime(gain, t0)
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur)
  src.connect(filt).connect(g).connect(c.destination)
  src.start(t0)
}

export const sfx = {
  /** Survol d'un élément cliquable */
  hover: () => tone({ freq: 880, dur: 0.05, type: 'sine', gain: 0.03 }),

  /** Clic d'interface */
  click: () => tone({ freq: 520, dur: 0.06, type: 'triangle', gain: 0.08 }),

  /** Le composant est saisi */
  pick: () => {
    tone({ freq: 320, dur: 0.09, type: 'sine', gain: 0.07, to: 440 })
  },

  /** CLAC : le composant se verrouille dans son emplacement */
  snap: () => {
    noise(0.07, 2600, 3, 0.28)
    noise(0.13, 900, 2, 0.2, 0.02)
    tone({ freq: 180, dur: 0.14, type: 'sine', gain: 0.16, delay: 0.01, to: 120 })
  },

  /** Clips de la barrette de mémoire */
  clip: () => {
    noise(0.05, 4200, 5, 0.22)
    noise(0.05, 3200, 5, 0.18, 0.07)
  },

  /** Vissage */
  screw: () => {
    for (let i = 0; i < 5; i++) noise(0.045, 1500 + i * 120, 6, 0.11, i * 0.055)
  },

  /** Mauvaise réponse / mauvais emplacement */
  error: () => {
    tone({ freq: 200, dur: 0.16, type: 'square', gain: 0.09, to: 130 })
    tone({ freq: 150, dur: 0.2, type: 'sawtooth', gain: 0.05, delay: 0.05, to: 100 })
  },

  /** Bonne réponse */
  good: () => {
    tone({ freq: 660, dur: 0.1, type: 'sine', gain: 0.11 })
    tone({ freq: 990, dur: 0.16, type: 'sine', gain: 0.09, delay: 0.07 })
  },

  /** Exercice terminé */
  success: () => {
    ;[523, 659, 784, 1047].forEach((f, i) =>
      tone({ freq: f, dur: 0.28, type: 'triangle', gain: 0.1, delay: i * 0.09 }),
    )
  },

  /** Badge débloqué */
  badge: () => {
    ;[784, 988, 1319, 1568, 2093].forEach((f, i) =>
      tone({ freq: f, dur: 0.34, type: 'sine', gain: 0.09, delay: i * 0.07 }),
    )
  },

  /** Démarrage de la machine : bip du BIOS + montée en régime des ventilateurs */
  boot: () => {
    tone({ freq: 1000, dur: 0.22, type: 'square', gain: 0.1 })
    noise(1.6, 220, 0.7, 0.1, 0.25)
    noise(1.4, 520, 0.6, 0.05, 0.3)
  },

  /** Le câble s'enclenche */
  plug: () => {
    noise(0.06, 1800, 4, 0.2)
    tone({ freq: 240, dur: 0.1, type: 'sine', gain: 0.1, delay: 0.02, to: 300 })
  },
}
