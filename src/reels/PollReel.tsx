import { useCurrentFrame } from 'remotion'
import { C, Stage, Title, Typed, sans, usePop } from './primitives'

function Option({ at, x, color, name, points }: { at: number; x: number; color: string; name: string; points: [string, boolean][] }) {
  const p = usePop(at)
  return (
    <div style={{ position: 'absolute', top: 540, left: x, width: 420, opacity: p, transform: `translateY(${(1 - p) * 40}px)`, border: `4px solid ${color}`, borderRadius: 28, padding: '32px 30px', fontFamily: sans }}>
      <div style={{ fontSize: 52, fontWeight: 600, color, marginBottom: 22 }}>{name}</div>
      {points.map(([t, good], i) => (
        <div key={t} style={{ display: 'flex', gap: 14, fontSize: 30, lineHeight: 1.35, color: C.white, marginBottom: 18 }}>
          <span style={{ color: good ? C.green : C.red, flexShrink: 0 }}>{good ? '+' : '−'}</span>
          <Typed text={t} from={at + 14 + i * 16} speed={2} caret={false} />
        </div>
      ))}
    </div>
  )
}

export function PollReel() {
  const frame = useCurrentFrame()
  const pulse = 0.5 + 0.5 * Math.sin(frame / 6)
  return (
    <Stage>
      <div style={{ position: 'absolute', top: 170, left: 0, right: 0, display: 'flex', justifyContent: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '14px 28px', borderRadius: 999, border: `2px solid ${C.yellow}`, color: C.yellow, fontSize: 30, fontFamily: sans }}>
          <span style={{ width: 18, height: 18, borderRadius: 9, background: C.yellow, opacity: 0.4 + pulse * 0.6 }} />
          Claude is waiting on you in auth-service
        </div>
      </div>
      <Title from={8} top={290} size={80}>Where should login sessions live?</Title>
      <Option at={40} x={70} color={C.red} name="Redis" points={[['Fast, in memory', true], ['Expires keys for you', true], ['One more service to run', false]]} />
      <Option at={60} x={590} color={C.blue} name="Postgres" points={[['Already in your stack', true], ['Survives restarts', true], ['Slower under heavy load', false]]} />
    </Stage>
  )
}

export const POLL_REEL_FRAMES = 240
