import { C, Fade, Stage, Title, Typed, sans, serif, usePop } from './primitives'

export type SessionReelProps = { prompt: string; repo: string; concepts: string[] }

function Concept({ at, i, text }: { at: number; i: number; text: string }) {
  const p = usePop(at)
  const colors = [C.blue, C.yellow, C.green, C.purple]
  const color = colors[i % colors.length]
  return (
    <div style={{ opacity: p, transform: `translateX(${(1 - p) * 60}px)`, display: 'flex', alignItems: 'center', gap: 24, border: `3px solid ${color}`, borderRadius: 22, padding: '22px 28px', background: '#000' }}>
      <span style={{ width: 54, height: 54, borderRadius: 27, border: `3px solid ${color}`, color, display: 'grid', placeItems: 'center', fontSize: 28, fontWeight: 600, flexShrink: 0 }}>{i + 1}</span>
      <span style={{ fontSize: 36, color: C.white }}>{text}</span>
    </div>
  )
}

export function SessionReel({ prompt, repo, concepts }: SessionReelProps) {
  return (
    <Stage>
      <Fade from={0} style={{ top: 180, left: 0, right: 0, textAlign: 'center', fontSize: 30, color: C.grey, fontFamily: sans }}>
        Your session in {repo}, just now
      </Fade>
      <div style={{ position: 'absolute', top: 280, left: 90, right: 90, fontFamily: serif, fontStyle: 'italic', fontSize: 60, lineHeight: 1.15, color: C.white, textAlign: 'center' }}>
        “<Typed text={prompt} from={10} speed={1.2} />”
      </div>
      <Title from={90} top={720} size={54} color={C.yellow}>What Claude did that's worth knowing</Title>
      <div style={{ position: 'absolute', top: 880, left: 90, right: 90, display: 'flex', flexDirection: 'column', gap: 22, fontFamily: sans }}>
        {concepts.map((c, i) => (
          <Concept key={c} at={120 + i * 18} i={i} text={c} />
        ))}
      </div>
    </Stage>
  )
}

export const SESSION_REEL_FRAMES = 300
