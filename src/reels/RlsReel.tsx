import { Captions, ReelAudio, Scene, buildTimeline, type Manifest } from './audio'
import manifest from './audio/rls.json'
import { Stage, Title } from './primitives'
import script from './scripts/rls.json'

// Placeholder: replaced by the real rls reel
const T = buildTimeline(script, manifest as unknown as Manifest)
export const RLS_REEL_FRAMES = T.total

export function RlsReel() {
  return (
    <Stage>
      <ReelAudio t={T} />
      <Scene t={T} id="todo"><Title>rls</Title></Scene>
      <Captions t={T} />
    </Stage>
  )
}
