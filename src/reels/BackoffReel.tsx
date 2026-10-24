import { Captions, ReelAudio, Scene, buildTimeline, type Manifest } from './audio'
import manifest from './audio/backoff.json'
import { Stage, Title } from './primitives'
import script from './scripts/backoff.json'

// Placeholder: replaced by the real backoff reel
const T = buildTimeline(script, manifest as unknown as Manifest)
export const BACKOFF_REEL_FRAMES = T.total

export function BackoffReel() {
  return (
    <Stage>
      <ReelAudio t={T} />
      <Scene t={T} id="todo"><Title>backoff</Title></Scene>
      <Captions t={T} />
    </Stage>
  )
}
