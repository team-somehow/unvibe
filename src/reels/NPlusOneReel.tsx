import { Captions, ReelAudio, Scene, buildTimeline, type Manifest } from './audio'
import manifest from './audio/nplus1.json'
import { Stage, Title } from './primitives'
import script from './scripts/nplus1.json'

// Placeholder: replaced by the real nplus1 reel
const T = buildTimeline(script, manifest as unknown as Manifest)
export const NPLUS1_REEL_FRAMES = T.total

export function NPlusOneReel() {
  return (
    <Stage>
      <ReelAudio t={T} />
      <Scene t={T} id="todo"><Title>nplus1</Title></Scene>
      <Captions t={T} />
    </Stage>
  )
}
