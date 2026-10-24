import { Captions, ReelAudio, Scene, buildTimeline, type Manifest } from './audio'
import manifest from './audio/secrets.json'
import { Stage, Title } from './primitives'
import script from './scripts/secrets.json'

// Placeholder: replaced by the real secrets reel
const T = buildTimeline(script, manifest as unknown as Manifest)
export const SECRETS_REEL_FRAMES = T.total

export function SecretsReel() {
  return (
    <Stage>
      <ReelAudio t={T} />
      <Scene t={T} id="todo"><Title>secrets</Title></Scene>
      <Captions t={T} />
    </Stage>
  )
}
