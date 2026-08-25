import { useEffect, useState } from 'react'
import { Stage } from './three/Stage'
import { PcRig } from './three/PcRig'
import { boundsCenter, SLOTS, type CameraViewId } from './three/layout'
import { ALL_INSTALLED, useBuild } from './state/useBuild'
import { useGame } from './state/useGame'
import { setSoundEnabled } from './audio/sfx'
import { Home } from './ui/Home'
import { BadgesScreen, ChapterMap } from './ui/ChapterMap'
import { RevisionSheet } from './ui/RevisionSheet'
import { Toasts } from './ui/bits'
import { SettingsButton } from './ui/Settings'
import { CHAPTER_OFFSET, CHAPTER_VIEW, GameScene, GameUi } from './game'
import { useExercise } from './game/useExercise'

// Accès aux stores depuis la console, en développement seulement.
// Exposé ici (et pas dans chaque store) pour être certain de viser
// les instances de modules réellement utilisées par l'application.
if (import.meta.env.DEV) {
  ;(window as unknown as Record<string, unknown>).__app = {
    build: useBuild,
    game: useGame,
    ex: useExercise,
    slots: SLOTS,
    boundsCenter,
  }
}

export default function App() {
  const screen = useGame((s) => s.screen)
  const chapter = useGame((s) => s.chapter)
  const sound = useGame((s) => s.sound)
  const dragging = useBuild((s) => s.dragging)
  const [view, setView] = useState<CameraViewId>('overview')

  useEffect(() => setSoundEnabled(sound), [sound])

  // Hors exercice, on montre simplement la machine complète et allumée.
  useEffect(() => {
    if (screen === 'jeu') return
    const b = useBuild.getState()
    b.resetBuild(ALL_INSTALLED)
    b.set({ explode: 0, labels: false, running: true, powered: true, panelOpen: 1 })
    setView(screen === 'accueil' ? 'overview' : 'inside')
  }, [screen])

  // Chaque chapitre démarre sur le cadrage qui lui convient.
  useEffect(() => {
    if (screen === 'jeu' && chapter) setView(CHAPTER_VIEW[chapter])
  }, [screen, chapter])

  const inGame = screen === 'jeu' && chapter

  return (
    <div className="app">
      <div className="canvas-layer">
        <Stage
          view={view}
          controlsEnabled={!dragging}
          autoRotate={screen === 'accueil'}
          frameOffset={
            screen === 'accueil' ? 0.2 : inGame && chapter ? (CHAPTER_OFFSET[chapter] ?? 0) : 0
          }
          onPointerMissed={() => {
            if (screen === 'jeu') useBuild.getState().set({ selected: null })
          }}
        >
          {inGame ? <GameScene chapter={chapter} /> : <PcRig interactive={false} />}
        </Stage>
      </div>

      <div className="ui-layer">
        {screen === 'accueil' && <Home />}
        {screen === 'carte' && <ChapterMap />}
        {screen === 'badges' && <BadgesScreen />}
        {screen === 'fiche' && <RevisionSheet />}
        {inGame && <GameUi chapter={chapter} onView={setView} />}
      </div>

      <SettingsButton />
      <Toasts />
    </div>
  )
}
