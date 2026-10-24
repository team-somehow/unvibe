import { Captions, ReelAudio, Scene, buildTimeline, type Manifest } from './audio'
import manifest from './audio/xss.json'
import { Stage, Title } from './primitives'
import script from './scripts/xss.json'

// Placeholder: replaced by the real xss reel
const T = buildTimeline(script, manifest as unknown as Manifest)
export const XSS_REEL_FRAMES = T.total

export function XssReel() {
  return (
    <Stage>
      <ReelAudio t={T} />
      <Scene t={T} id="todo"><Title>xss</Title></Scene>
      <Captions t={T} />
    </Stage>
  )
}
