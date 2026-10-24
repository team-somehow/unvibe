import { useMemo, type CSSProperties, type ReactNode } from 'react'
import { AbsoluteFill, Audio, Sequence, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion'
import { EXAMPLE_LESSON, lessonTimeline, parseLesson, type GeneratedLesson, type LessonScene } from '../../shared/lesson'
import { mono, sans, serif } from './primitives'

export type GeneratedReelProps = { lesson: GeneratedLesson }

const CLAMP = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const
const INK = '#eee9df'
const MUTED = '#a6a19b'
const CORAL = '#ed987b'
const ACCENTS: Record<LessonScene['kind'], string> = { hook: CORAL, code: '#a6c9ac', concept: '#a7bce1', tradeoff: '#e4c176', recap: CORAL }
const LABELS: Record<LessonScene['kind'], string> = {
  hook: 'The moment',
  code: 'Inside the code',
  concept: 'The idea',
  tradeoff: 'The trade-off',
  recap: 'Take it with you',
}

function fade(frame: number, from = 0, length = 14) {
  return interpolate(frame, [from, from + length], [0, 1], CLAMP)
}

function Enter({ children, at = 0, style }: { children: ReactNode; at?: number; style?: CSSProperties }) {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const p = spring({ frame: frame - at, fps, config: { damping: 22, stiffness: 110, mass: 0.8 } })
  return <div style={{ opacity: fade(frame, at), transform: `translateY(${(1 - p) * 35}px)`, ...style }}>{children}</div>
}

function Background({ accent, frame }: { accent: string; frame: number }) {
  return (
    <AbsoluteFill style={{ background: '#0c0d0e', overflow: 'hidden' }}>
      <AbsoluteFill
        style={{
          backgroundImage: 'linear-gradient(#ffffff05 1px, transparent 1px), linear-gradient(90deg, #ffffff05 1px, transparent 1px)',
          backgroundSize: '88px 88px',
          transform: `translateY(${(frame * 0.07) % 88}px)`,
        }}
      />
      <div
        style={{
          position: 'absolute',
          width: 850,
          height: 850,
          right: -420,
          top: 180,
          borderRadius: '50%',
          background: accent,
          opacity: 0.07,
          filter: 'blur(130px)',
        }}
      />
      {[0, 1, 2].map((n) => (
        <div
          key={n}
          style={{
            position: 'absolute',
            width: 640 + n * 150,
            height: 640 + n * 150,
            right: -410 - n * 75,
            top: 345 - n * 75,
            border: `1px solid ${accent}18`,
            borderRadius: '50%',
            transform: `rotateX(20deg) rotateY(-28deg) rotateZ(${frame * 0.04}deg)`,
          }}
        />
      ))}
    </AbsoluteFill>
  )
}

function SourceQuote({ scene, accent }: { scene: LessonScene; accent: string }) {
  if (!scene.evidence) return null
  return (
    <Enter
      at={22}
      style={{
        marginTop: 34,
        padding: '24px 30px',
        borderLeft: `3px solid ${accent}`,
        background: '#ffffff05',
        borderRadius: '0 18px 18px 0',
      }}
    >
      <div style={{ color: accent, fontSize: 22, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 12 }}>
        From the selected session
      </div>
      <div
        style={{
          color: '#cac5bd',
          fontFamily: mono,
          fontSize: scene.evidence.length > 260 ? 26 : 30,
          lineHeight: 1.45,
          whiteSpace: 'pre-wrap',
          overflowWrap: 'anywhere',
        }}
      >
        {scene.evidence}
      </div>
    </Enter>
  )
}

function CodeCard({ scene, accent }: { scene: LessonScene; accent: string }) {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const allLines = (scene.code ?? scene.evidence ?? scene.body).split('\n')
  const lines = allLines.slice(0, 12).map((line) => (line.length > 56 ? `${line.slice(0, 53)}…` : line))
  const shortened = allLines.some((line) => line.length > 56)
  const size = Math.max(23, Math.min(35, 764 / (Math.max(26, ...lines.map((line) => line.length)) * 0.61)))
  const focus = Math.min(lines.length - 1, Math.max(0, Math.floor((frame / fps - 1) / 1.15)))
  const tilt = interpolate(frame, [0, 40], [-5, 0], CLAMP)
  return (
    <Enter at={10} style={{ marginTop: 42, perspective: 1600 }}>
      <div
        style={{
          border: '1px solid #ffffff21',
          borderRadius: 24,
          background: '#131617',
          overflow: 'hidden',
          boxShadow: '0 35px 80px #0006',
          transform: `rotateY(${tilt}deg) rotateX(${-tilt / 2}deg)`,
          transformOrigin: 'left center',
        }}
      >
        <div
          style={{
            height: 76,
            padding: '0 26px',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            borderBottom: '1px solid #ffffff13',
            background: '#ffffff03',
          }}
        >
          {['#bd7069', '#c5a56f', '#7eab89'].map((color) => (
            <span key={color} style={{ display: 'block', width: 12, height: 12, background: color, borderRadius: '50%' }} />
          ))}
          <span
            style={{
              fontFamily: mono,
              color: MUTED,
              marginLeft: 18,
              fontSize: 22,
              whiteSpace: 'nowrap',
              textOverflow: 'ellipsis',
              overflow: 'hidden',
            }}
          >
            {scene.sourceLabel ?? 'Session excerpt'}
          </span>
          <span style={{ color: accent, fontSize: 19, marginLeft: 'auto' }}>{scene.language ?? 'code'}</span>
        </div>
        <div style={{ padding: '27px 0 30px', fontFamily: mono, fontSize: size, lineHeight: 1.65 }}>
          {lines.map((line, i) => {
            const added = /^\s*\+/.test(line)
            const removed = /^\s*-/.test(line)
            const lit = i === focus
            const color = added ? '#b9d5b6' : removed ? '#e7a097' : '#e2dfd7'
            return (
              <div
                key={i}
                style={{
                  display: 'flex',
                  padding: '0 26px',
                  minHeight: size * 1.65,
                  background: lit ? `${accent}11` : added ? '#a6c9ac07' : removed ? '#ed987b07' : 'transparent',
                  boxShadow: lit ? `inset 3px 0 ${accent}` : undefined,
                  opacity: fade(frame, 14 + i * 2, 8),
                }}
              >
                <span style={{ color: '#626969', width: 48, flexShrink: 0, fontSize: size * 0.85, userSelect: 'none' }}>
                  {String(i + 1).padStart(2, '0')}
                </span>
                <span style={{ color, whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', minWidth: 0 }}>{line || ' '}</span>
              </div>
            )
          })}
        </div>
        {(allLines.length > lines.length || shortened) && (
          <div style={{ padding: '0 26px 24px', color: MUTED, fontSize: 22 }}>
            Excerpt{allLines.length > lines.length ? ` · first ${lines.length} of ${allLines.length} lines` : ''}
            {shortened ? ' · long lines shortened' : ''}
          </div>
        )}
      </div>
    </Enter>
  )
}

function IdeaCards({ items, accent, compact = false }: { items: string[]; accent: string; compact?: boolean }) {
  const frame = useCurrentFrame()
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, marginTop: 38 }}>
      {items.map((item, i) => {
        const p = fade(frame, 18 + i * 12)
        return (
          <Enter key={i} at={18 + i * 12}>
            <div
              style={{
                padding: compact ? '24px 28px' : '30px 32px',
                display: 'flex',
                alignItems: 'flex-start',
                gap: 26,
                border: '1px solid #ffffff17',
                background: `linear-gradient(110deg, ${accent}0b, #ffffff03)`,
                borderRadius: 21,
              }}
            >
              <div
                style={{
                  width: 43,
                  height: 43,
                  display: 'grid',
                  placeItems: 'center',
                  border: `1px solid ${accent}77`,
                  borderRadius: '50%',
                  color: accent,
                  fontFamily: mono,
                  fontSize: 21,
                  flexShrink: 0,
                  transform: `scale(${0.8 + p * 0.2})`,
                }}
              >
                {String(i + 1).padStart(2, '0')}
              </div>
              <div style={{ fontSize: compact ? 31 : item.length > 105 ? 34 : 38, lineHeight: 1.35, color: INK }}>{item}</div>
            </div>
          </Enter>
        )
      })}
    </div>
  )
}

function LessonChapter({
  lesson,
  scene,
  index,
  total,
  frames,
}: {
  lesson: GeneratedLesson
  scene: LessonScene
  index: number
  total: number
  frames: number
}) {
  const frame = useCurrentFrame()
  const accent = ACCENTS[scene.kind]
  const opacity = index === 0 ? 1 : fade(frame, 0, 10)
  const out = interpolate(frame, [frames - 8, frames], [1, 0], CLAMP)
  const isCode = scene.kind === 'code' || !!scene.code
  const bodySize = scene.body.length > 300 ? 35 : scene.body.length > 180 ? 39 : 44
  return (
    <AbsoluteFill style={{ color: INK, fontFamily: sans, opacity: opacity * (index === total - 1 ? 1 : out) }}>
      <Background accent={accent} frame={frame} />
      <div style={{ position: 'absolute', top: 112, left: 74, right: 142, display: 'flex', alignItems: 'center', gap: 14 }}>
        <svg width="35" height="35" viewBox="0 0 35 35" fill="none" aria-hidden="true">
          <path d="M5 5h10v25H5zM20 5h10v25H20z" fill={accent} />
          <path d="M15 8l5-3v25l-5-3z" fill={accent} opacity=".45" />
        </svg>
        <span style={{ color: '#c4bfb7', fontSize: 25, maxWidth: 610, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {lesson.repo}
        </span>
        <span style={{ fontFamily: mono, color: MUTED, fontSize: 22, marginLeft: 'auto' }}>
          {String(index + 1).padStart(2, '0')} / {String(total).padStart(2, '0')}
        </span>
      </div>
      <div style={{ position: 'absolute', top: 220, left: 74, right: 142 }}>
        <Enter>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 15,
              color: accent,
              letterSpacing: 3,
              textTransform: 'uppercase',
              fontSize: 23,
              fontWeight: 600,
            }}
          >
            <span style={{ width: 28, height: 2, background: accent }} />
            {LABELS[scene.kind]}
          </div>
          <div
            style={{
              marginTop: 25,
              fontFamily: serif,
              fontSize: scene.title.length > 65 ? 77 : scene.title.length > 40 ? 88 : 106,
              fontWeight: 400,
              letterSpacing: -2.8,
              lineHeight: 1.04,
              textWrap: 'balance',
            }}
          >
            {scene.title}
          </div>
        </Enter>

        {scene.kind === 'hook' && !isCode ? (
          <>
            <Enter
              at={12}
              style={{
                marginTop: 50,
                padding: '30px 34px',
                border: '1px solid #ed987b44',
                borderRadius: 24,
                background: '#ed987b08',
                boxShadow: '0 25px 60px #0004',
              }}
            >
              <div style={{ color: accent, fontFamily: mono, fontSize: 22, marginBottom: 16 }}>› your prompt</div>
              <div style={{ color: '#e6e1d9', fontSize: lesson.prompt.length > 200 ? 34 : 42, lineHeight: 1.3 }}>{lesson.prompt}</div>
            </Enter>
            <Enter at={26} style={{ marginTop: 36, color: MUTED, fontSize: bodySize, lineHeight: 1.4 }}>
              {scene.body}
            </Enter>
            {scene.bullets && <IdeaCards items={scene.bullets.slice(0, 2)} accent={accent} compact />}
          </>
        ) : isCode ? (
          <>
            <CodeCard scene={scene} accent={accent} />
            <Enter at={22} style={{ marginTop: 34, fontSize: bodySize - 3, lineHeight: 1.4, color: '#c4bfb7' }}>
              {scene.body}
            </Enter>
          </>
        ) : scene.kind === 'recap' ? (
          <>
            <Enter at={12} style={{ marginTop: 34, fontSize: bodySize, lineHeight: 1.4, color: '#c4bfb7' }}>
              {scene.body}
            </Enter>
            <IdeaCards items={scene.bullets ?? lesson.takeaways} accent={accent} compact={(scene.bullets ?? lesson.takeaways).length > 3} />
          </>
        ) : (
          <>
            <Enter at={12} style={{ marginTop: 43, fontSize: bodySize, lineHeight: 1.42, color: '#d1cbc3' }}>
              {scene.body}
            </Enter>
            {scene.bullets && (
              <IdeaCards items={scene.bullets} accent={accent} compact={scene.bullets.length > 3 || scene.body.length > 180} />
            )}
            <SourceQuote scene={scene} accent={accent} />
          </>
        )}
      </div>
      <div style={{ position: 'absolute', bottom: 435, left: 74, right: 142 }}>
        <div style={{ display: 'flex', gap: 7 }}>
          {lesson.scenes.map((_, i) => (
            <div key={i} style={{ height: 3, background: '#ffffff15', borderRadius: 2, flex: 1, overflow: 'hidden' }}>
              <div
                style={{
                  height: '100%',
                  width: `${i < index ? 100 : i > index ? 0 : Math.min(100, (frame / (frames - 1)) * 100)}%`,
                  background: accent,
                }}
              />
            </div>
          ))}
        </div>
        <div style={{ marginTop: 18, display: 'flex', gap: 10, color: '#817e78', fontSize: 21, alignItems: 'center' }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: accent }} />
          {lesson.source.kind === 'claude-code' ? 'From your Claude Code session' : 'From your selected session text'}
          <span style={{ marginLeft: 'auto', fontFamily: mono }}>{Math.ceil((frames - frame) / 30)}s</span>
        </div>
      </div>
    </AbsoluteFill>
  )
}

/** All wording and code comes from the validated lesson; no canned technical explanation is selected. */
export function GeneratedReel({ lesson = EXAMPLE_LESSON }: Partial<GeneratedReelProps>) {
  const validated = useMemo(() => parseLesson(lesson), [lesson])
  const { fps } = useVideoConfig()
  const timeline = useMemo(() => lessonTimeline(validated, fps), [validated, fps])
  return (
    <AbsoluteFill style={{ background: '#0c0d0e', overflow: 'hidden' }}>
      {validated.narration && <Audio src={validated.narration.audioUrl} />}
      {timeline.map(({ scene, from, frames }, index) => (
        <Sequence key={scene.id} name={scene.title} from={from} durationInFrames={frames}>
          <LessonChapter lesson={validated} scene={scene} index={index} total={timeline.length} frames={frames} />
        </Sequence>
      ))}
    </AbsoluteFill>
  )
}
