/**
 * Petite vue 3D autonome : une seule pièce qui tourne sur son présentoir.
 *
 * Sert aux fenêtres de correction, qui vivent dans la couche d'interface —
 * en dehors du grand canvas du jeu. Elle a donc son propre contexte WebGL,
 * volontairement léger (pas d'ombres, environnement minuscule).
 */

import { Environment, Lightformer } from '@react-three/drei'
import { Canvas } from '@react-three/fiber'
import { Suspense } from 'react'
import * as THREE from 'three'
import { DevCapture } from './DevCapture'
import { PeriShowcase, Showcase } from './Showcase'
import type { PartId } from './models'
import type { PeripheralModelId } from './models/PeripheralParts'

/** Montre soit une pièce interne (`id`), soit un périphérique (`peri`). */
export function PartSpinner({ id, peri }: { id?: PartId | null; peri?: PeripheralModelId | null }) {
  return (
    <Canvas
      dpr={[1, 1.75]}
      gl={{
        antialias: true,
        // en développement : permet la capture pour vérifier le rendu
        preserveDrawingBuffer: import.meta.env.DEV,
        toneMapping: THREE.ACESFilmicToneMapping,
        toneMappingExposure: 1.34,
      }}
      // Sans OrbitControls la caméra vise l'origine : la pièce est donc
      // présentée en y = 0, et non à la hauteur du présentoir du chapitre 2.
      // La distance est réglée pour que `target = 17` remplisse la hauteur
      // de la vignette, qui est large mais basse.
      camera={{ fov: 32, near: 1, far: 400, position: [8, 9, 43] }}
      // La fenêtre est déjà cliquable : la 3D n'a rien à intercepter.
      style={{ pointerEvents: 'none' }}
    >
      <color attach="background" args={['#0c0f15']} />
      <ambientLight intensity={1.25} />
      <Suspense fallback={null}>
        {/* Deux panneaux suffisent à faire briller le métal */}
        <Environment resolution={64} frames={1} background={false}>
          <Lightformer
            form="rect"
            intensity={3.4}
            position={[0, 11, 3]}
            rotation={[Math.PI / 2, 0, 0]}
            scale={[12, 8, 1]}
            color="#ffffff"
          />
          <Lightformer
            form="rect"
            intensity={2.1}
            position={[8, 2, 5]}
            rotation={[0, -Math.PI / 2, 0]}
            scale={[9, 7, 1]}
            color="#cfe4ff"
          />
        </Environment>
        {peri ? (
          <PeriShowcase id={peri} spin={0.2} target={19} y={0} pedestal={false} />
        ) : id ? (
          <Showcase id={id} spin={0.2} target={17} y={0} pedestal={false} />
        ) : null}
        {import.meta.env.DEV && <DevCapture secondary />}
      </Suspense>
    </Canvas>
  )
}
