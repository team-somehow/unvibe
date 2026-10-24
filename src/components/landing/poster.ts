import { buildTimeline, type Manifest, type Script } from '../../reels/audio'
import { COMPOSITIONS, type ReelKind } from '../../reels/registry'

const scripts = import.meta.glob<Script>('../../reels/scripts/*.json', { eager: true, import: 'default' })
const manifests = import.meta.glob<Manifest>('../../reels/audio/*.json', { eager: true, import: 'default' })

/**
 * A frame near the end of the reel's opening scene, when its title and first diagram are fully drawn and
 * the scene has not started to fade. Derived from the narration timeline, so it follows the reel's edits.
 */
export function posterFrame(kind: ReelKind) {
  const frames = COMPOSITIONS[kind].frames
  try {
    const script = scripts[`../../reels/scripts/${kind}.json`]
    const manifest = manifests[`../../reels/audio/${kind}.json`]
    if (script && manifest) {
      const first = buildTimeline(script, manifest).scenes[0]
      if (first) return Math.max(0, Math.min(frames - 1, first.from + first.durationInFrames - 16))
    }
  } catch {
    // fall through to a fixed fraction
  }
  return Math.min(frames - 1, Math.round(frames * 0.12))
}
