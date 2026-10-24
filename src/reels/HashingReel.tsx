import { Captions, ReelAudio, Scene, buildTimeline, type Manifest } from './audio'
import manifest from './audio/hashing.json'
import { Stage, Title } from './primitives'
import script from './scripts/hashing.json'

// Placeholder: replaced by the real hashing reel
const T = buildTimeline(script, manifest as unknown as Manifest)
export const HASHING_REEL_FRAMES = T.total

export function HashingReel() {
  return (
    <Stage>
      <ReelAudio t={T} />
      <Scene t={T} id="todo"><Title>hashing</Title></Scene>
      <Captions t={T} />
    </Stage>
  )
}
