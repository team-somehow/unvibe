import { createTikTokStyleCaptions, type Caption } from '@remotion/captions'
import { createContext, useContext, useMemo, type ReactNode } from 'react'
import { AbsoluteFill, Audio, Sequence, interpolate, staticFile, useCurrentFrame, useVideoConfig } from 'remotion'
import sharedManifest from './audio/shared.json'
import { C, sans } from './primitives'

export type Word = { text: string; start: number; end: number }
export type SceneAudio = { id: string; file: string | null; duration: number; minSeconds: number; leadIn: number; padAfter: number; words: Word[] }
export type Manifest = { id: string; scenes: SceneAudio[]; music: { file: string; duration: number } | null; sfx: Record<string, { file: string; duration: number | null }> }
export type ScriptScene = { id: string; text?: string; minSeconds?: number; leadIn?: number; padAfter?: number }
export type Script = { id: string; scenes: ScriptScene[] }

export type TimelineScene = SceneAudio & { from: number; durationInFrames: number; voiceFrom: number }
export type Timeline = { fps: number; total: number; scenes: TimelineScene[]; byId: Record<string, TimelineScene>; manifest: Manifest }

const FPS = 30
const TAIL_SECONDS = 0.6

// Scene lengths come from the narration: each scene lasts as long as its voice line plus padding,
// never shorter than the script's minSeconds. Before audio is generated, durations are estimated from the text.
export function buildTimeline(script: Script, manifest: Manifest): Timeline {
  let cursor = 0
  const scenes = script.scenes.map((sc) => {
    const a = manifest.scenes.find((s) => s.id === sc.id)
    const words = sc.text ? sc.text.split(/\s+/).length : 0
    const duration = a?.duration ?? words / 2.6
    const leadIn = a?.leadIn ?? sc.leadIn ?? 0.25
    const padAfter = a?.padAfter ?? sc.padAfter ?? 0.45
    const minSeconds = sc.minSeconds ?? 0
    const seconds = Math.max(minSeconds, sc.text ? leadIn + duration + padAfter : 0)
    const durationInFrames = Math.ceil(seconds * FPS)
    const scene: TimelineScene = {
      id: sc.id,
      file: a?.file ?? null,
      duration,
      minSeconds,
      leadIn,
      padAfter,
      words: a?.words ?? [],
      from: cursor,
      durationInFrames,
      voiceFrom: cursor + Math.round(leadIn * FPS),
    }
    cursor += durationInFrames
    return scene
  })
  const byId = Object.fromEntries(scenes.map((s) => [s.id, s]))
  return { fps: FPS, total: cursor + Math.round(TAIL_SECONDS * FPS), scenes, byId, manifest }
}

const SceneCtx = createContext<TimelineScene | null>(null)

/** The current scene's timing; frames inside a <Scene> are relative to its start. */
export function useScene() {
  const s = useContext(SceneCtx)
  if (!s) throw new Error('useScene must be used inside <Scene>')
  return s
}

/** Frame (relative to the scene) at which the given word index of the narration starts. */
export function useWordFrame(index: number) {
  const s = useScene()
  const w = s.words[Math.min(index, s.words.length - 1)]
  return w ? Math.round((s.leadIn + w.start) * FPS) : Math.round(s.leadIn * FPS)
}

/** Frame (relative to the scene) when the narration first says `word` (case-insensitive prefix match), or the fallback. */
export function useCue(word: string, fallback = 0) {
  const s = useScene()
  const w = s.words.find((x) => x.text.toLowerCase().replace(/[^a-z0-9$%'.-]/g, '').startsWith(word.toLowerCase()))
  return w ? Math.round((s.leadIn + w.start) * FPS) : fallback
}

export function Scene({ t, id, children, fade = 9 }: { t: Timeline; id: string; children: ReactNode; fade?: number }) {
  const s = t.byId[id]
  if (!s) throw new Error(`scene "${id}" missing from script`)
  return (
    <Sequence from={s.from} durationInFrames={s.durationInFrames} name={id}>
      <SceneCtx.Provider value={s}>
        <SceneFrame fade={fade} duration={s.durationInFrames}>
          {children}
        </SceneFrame>
      </SceneCtx.Provider>
    </Sequence>
  )
}

// Soft cross-dissolve: each scene eases in with a slight zoom and blurs out as the next one arrives
function SceneFrame({ children, fade, duration }: { children: ReactNode; fade: number; duration: number }) {
  const f = useCurrentFrame()
  const inP = interpolate(f, [0, fade], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
  const outP = interpolate(f, [duration - fade, duration], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
  const o = Math.min(inP, outP)
  const scale = 1.015 - 0.015 * inP + (1 - outP) * 0.02
  return <AbsoluteFill style={{ opacity: o, transform: `scale(${scale})`, filter: outP < 1 ? `blur(${(1 - outP) * 6}px)` : undefined }}>{children}</AbsoluteFill>
}

/** Narration for every scene plus a music bed that ducks under the voice. */
export function ReelAudio({ t, musicVolume = 0.18, duck = 0.4, voiceVolume = 1 }: { t: Timeline; musicVolume?: number; duck?: number; voiceVolume?: number }) {
  const spans = useMemo(() => t.scenes.filter((s) => s.file).map((s) => [s.voiceFrom, s.voiceFrom + Math.ceil(s.duration * FPS)] as const), [t])
  const music = t.manifest.music
  return (
    <>
      {t.scenes.map((s) =>
        s.file ? (
          <Sequence key={s.id} from={s.voiceFrom} durationInFrames={Math.ceil(s.duration * FPS) + 6} layout="none" name={`voice:${s.id}`}>
            <Audio src={staticFile(s.file)} volume={voiceVolume} />
          </Sequence>
        ) : null,
      )}
      {music && (
        <Audio
          src={staticFile(music.file)}
          loop
          volume={(f) => {
            const fadeIn = interpolate(f, [0, 20], [0, 1], { extrapolateRight: 'clamp' })
            const fadeOut = interpolate(f, [t.total - 24, t.total], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
            // distance in frames to the nearest narration span, so ducking ramps instead of jumping
            let d = Infinity
            for (const [a, b] of spans) d = Math.min(d, f < a ? a - f : f > b ? f - b : 0)
            const ducked = interpolate(d, [0, 10], [duck, 1], { extrapolateRight: 'clamp' })
            return musicVolume * fadeIn * fadeOut * ducked
          }}
        />
      )}
    </>
  )
}

const shared = sharedManifest as Manifest

/** Plays a sound effect `at` a frame (relative to the enclosing Sequence/Scene). Looks in the reel's own sfx first, then the shared library. */
export function Sfx({ t, name, at, volume = 0.5 }: { t?: Timeline; name: string; at: number; volume?: number }) {
  const fx = t?.manifest.sfx[name] ?? shared.sfx[name]
  if (!fx) return null
  const frames = Math.ceil((fx.duration ?? 2) * FPS) + 4
  return (
    <Sequence from={Math.max(0, Math.round(at))} durationInFrames={frames} layout="none" name={`sfx:${name}`}>
      <Audio src={staticFile(fx.file)} volume={volume} />
    </Sequence>
  )
}

/** TikTok-style word-by-word captions synced to the narration. Sits in the band just above the feed's caption overlay. */
export function Captions({ t, top = 1478, color = C.yellow }: { t: Timeline; top?: number; color?: string }) {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  // Pages are built per scene so a caption never straddles a scene change
  const pages = useMemo(
    () =>
      t.scenes.flatMap((s) => {
        const captions: Caption[] = s.words.map((w, i) => ({
          text: (i === 0 ? '' : ' ') + w.text,
          startMs: Math.round((s.voiceFrom / fps + w.start) * 1000),
          endMs: Math.round((s.voiceFrom / fps + w.end) * 1000),
          timestampMs: null,
          confidence: null,
        }))
        return createTikTokStyleCaptions({ captions, combineTokensWithinMilliseconds: 1100 }).pages
      }),
    [t, fps],
  )

  const ms = (frame / fps) * 1000
  const page = pages.find((p, i) => ms >= p.startMs && ms < (pages[i + 1]?.startMs ?? p.startMs + p.durationMs + 400) && ms < p.startMs + p.durationMs + 400)
  if (!page) return null
  const enter = interpolate(ms - page.startMs, [0, 120], [0, 1], { extrapolateRight: 'clamp' })
  return (
    <div style={{ position: 'absolute', top, left: 70, right: 190, display: 'flex', justifyContent: 'center', pointerEvents: 'none' }}>
      <div
        style={{
          fontFamily: sans, fontWeight: 700, fontSize: 50, lineHeight: 1.18, textAlign: 'center', color: C.white,
          textShadow: '0 4px 18px rgba(0,0,0,0.9), 0 0 2px rgba(0,0,0,1)', letterSpacing: -0.4,
          opacity: enter, transform: `translateY(${(1 - enter) * 10}px)`,
        }}
      >
        {page.tokens.map((tok, i) => {
          const active = ms >= tok.fromMs && ms < tok.toMs
          return (
            <span key={i} style={{ color: active ? color : C.white, display: 'inline-block', transform: active ? 'scale(1.06)' : 'none', whiteSpace: 'pre' }}>
              {tok.text}
            </span>
          )
        })}
      </div>
    </div>
  )
}
