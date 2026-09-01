/**
 * Lecture à voix haute — synthèse vocale du navigateur (Web Speech API).
 *
 * Aucun fichier son, aucune requête réseau : la voix est celle du système.
 * Elle fonctionne donc hors-ligne, y compris depuis le fichier HTML
 * autonome. La qualité et la disponibilité d'une voix française dépendent
 * du poste ; si aucune voix n'est installée, le bouton ne fait rien.
 */

import { useEffect, useState } from 'react'

function synth(): SpeechSynthesis | null {
  return typeof window !== 'undefined' && 'speechSynthesis' in window ? window.speechSynthesis : null
}

/** Voix française si le système en propose une. */
function frenchVoice(s: SpeechSynthesis): SpeechSynthesisVoice | undefined {
  const voices = s.getVoices()
  return (
    voices.find((v) => /^fr(-|_|$)/i.test(v.lang)) ??
    voices.find((v) => v.lang.toLowerCase().startsWith('fr'))
  )
}

/** Arrête toute lecture en cours. */
export function stopSpeak() {
  synth()?.cancel()
}

/**
 * Lit le texte donné. Un tableau est joint par des pauses (« . »).
 * `onEnd` est appelé quand la lecture se termine ou est interrompue.
 */
export function speak(text: string | string[], onEnd?: () => void) {
  const s = synth()
  if (!s) {
    onEnd?.()
    return
  }
  s.cancel()
  const body = (Array.isArray(text) ? text : [text])
    .map((t) => t.trim())
    .filter(Boolean)
    .join('. ')
  if (!body) {
    onEnd?.()
    return
  }
  const u = new SpeechSynthesisUtterance(body)
  u.lang = 'fr-FR'
  u.rate = 0.95
  const v = frenchVoice(s)
  if (v) u.voice = v
  u.onend = () => onEnd?.()
  u.onerror = () => onEnd?.()
  // Certains navigateurs ne chargent les voix qu'après un premier getVoices().
  if (!v && s.getVoices().length === 0) {
    s.addEventListener('voiceschanged', function once() {
      s.removeEventListener('voiceschanged', once)
      const vv = frenchVoice(s)
      if (vv) u.voice = vv
      s.speak(u)
    })
    return
  }
  s.speak(u)
}

/**
 * Petit bouton haut-parleur. Un clic lance la lecture, un clic pendant la
 * lecture l'arrête. La lecture s'arrête aussi quand le bouton disparaît.
 */
export function SpeakButton({
  text,
  className = '',
  title,
}: {
  text: string | string[]
  className?: string
  /** Libellé accessible personnalisé */
  title?: string
}) {
  const [speaking, setSpeaking] = useState(false)

  useEffect(() => () => stopSpeak(), [])

  if (!synth()) return null

  const toggle = () => {
    if (speaking) {
      stopSpeak()
      setSpeaking(false)
      return
    }
    setSpeaking(true)
    speak(text, () => setSpeaking(false))
  }

  return (
    <button
      type="button"
      className={`speakbtn ${speaking ? 'on' : ''} ${className}`}
      onClick={toggle}
      aria-label={title ?? (speaking ? 'Arrêter la lecture' : 'Lire à voix haute')}
      title={title ?? (speaking ? 'Arrêter la lecture' : 'Lire à voix haute')}
    >
      {speaking ? '⏹' : '🔊'}
    </button>
  )
}
