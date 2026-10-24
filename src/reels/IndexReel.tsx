import { Sequence, interpolate, useCurrentFrame } from 'remotion'
import { C, Fade, Stage, Title, TranscriptCard, mono, sans, serif, usePop, useTween } from './primitives'

const ROWS = 12
const TARGET = 9

function FullScan() {
  const frame = useCurrentFrame()
  const idx = Math.floor(interpolate(frame, [20, 110], [0, TARGET], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }))
  const found = frame >= 112
  return (
    <>
      <Title from={0} top={170} size={66} color={C.yellow}>Without it, Postgres checks every row</Title>
      <div style={{ position: 'absolute', top: 400, left: 140, width: 560, display: 'flex', flexDirection: 'column', gap: 14 }}>
        {Array.from({ length: ROWS }).map((_, i) => {
          const active = i === idx && !found
          const hit = found && i === TARGET
          const seen = i < idx || (found && i <= TARGET)
          const border = hit ? C.green : active ? C.yellow : seen ? C.grey : C.dim
          return (
            <div
              key={i}
              style={{
                height: 64, borderRadius: 14, border: `3px solid ${border}`, display: 'flex', alignItems: 'center',
                justifyContent: 'space-between', padding: '0 26px', fontFamily: mono, fontSize: 28,
                color: hit ? C.green : seen ? C.grey : C.white, background: hit ? 'rgba(131,193,103,0.12)' : active ? 'rgba(244,211,94,0.12)' : 'transparent',
                transform: active ? 'translateX(14px)' : 'none',
              }}
            >
              <span>order #{1040 + i}</span>
              <span>user_id {i === TARGET ? 42 : [7, 19, 3, 88, 12, 61, 5, 30, 77, 14, 9, 51][i]}</span>
            </div>
          )
        })}
      </div>
      <div style={{ position: 'absolute', top: 640, left: 730, width: 220, textAlign: 'center', fontFamily: sans }}>
        <div style={{ fontSize: 120, fontWeight: 600, color: found ? C.green : C.yellow, fontVariantNumeric: 'tabular-nums' }}>{Math.min(idx + 1, TARGET + 1)}</div>
        <div style={{ fontSize: 30, color: C.grey }}>rows checked</div>
      </div>
      <Fade from={118} style={{ top: 1260, left: 70, right: 70, textAlign: 'center', fontFamily: serif, fontStyle: 'italic', fontSize: 52, color: C.white }}>
        Full table scan: O(n)
      </Fade>
    </>
  )
}

const NODES = [
  { id: 'r', x: 540, y: 520, label: '50' },
  { id: 'a', x: 300, y: 760, label: '20 · 35' },
  { id: 'b', x: 780, y: 760, label: '70 · 90' },
  { id: 'a1', x: 170, y: 1000, label: '3 · 12' },
  { id: 'a2', x: 410, y: 1000, label: '42 · 48' },
  { id: 'b1', x: 670, y: 1000, label: '61 · 66' },
  { id: 'b2', x: 890, y: 1000, label: '77 · 88' },
]
const EDGES: [string, string][] = [['r', 'a'], ['r', 'b'], ['a', 'a1'], ['a', 'a2'], ['b', 'b1'], ['b', 'b2']]
const PATH = ['r', 'a', 'a2']

function TreeWalk() {
  const frame = useCurrentFrame()
  const draw = useTween(10, 45)
  const step = frame < 55 ? -1 : frame < 80 ? 0 : frame < 105 ? 1 : 2
  const at = (id: string) => NODES.find((n) => n.id === id)!
  const finale = usePop(135)
  return (
    <>
      <Title from={0} top={170} size={66} color={C.blue}>With the index, it walks a tree</Title>
      <svg viewBox="0 0 1080 1920" style={{ position: 'absolute', inset: 0 }}>
        {EDGES.map(([f, t], i) => {
          const a = at(f), b = at(t)
          const len = Math.hypot(b.x - a.x, b.y - a.y)
          const lit = PATH.indexOf(t) > 0 && PATH.indexOf(t) <= step
          return (
            <line key={i} x1={a.x} y1={a.y + 40} x2={b.x} y2={b.y - 40} stroke={lit ? C.yellow : C.grey} strokeWidth={lit ? 6 : 3}
              strokeDasharray={len} strokeDashoffset={len * (1 - draw)} />
          )
        })}
        {NODES.map((n, i) => {
          const pi = PATH.indexOf(n.id)
          const lit = pi >= 0 && pi <= step
          const hit = n.id === 'a2' && step === 2
          const s = Math.min(1, Math.max(0, (draw * 7 - i * 0.6)))
          const color = hit ? C.green : lit ? C.yellow : C.blue
          return (
            <g key={n.id} transform={`translate(${n.x} ${n.y}) scale(${s})`}>
              <rect x={-100} y={-40} width={200} height={80} rx={16} fill={hit ? 'rgba(131,193,103,0.15)' : '#000'} stroke={color} strokeWidth={lit ? 6 : 3} />
              <text textAnchor="middle" dy={11} fill={color} style={{ fontFamily: mono, fontSize: 32 }}>{n.label}</text>
            </g>
          )
        })}
      </svg>
      <div style={{ position: 'absolute', top: 1110, left: 0, right: 0, textAlign: 'center', fontFamily: sans }}>
        <span style={{ fontSize: 100, fontWeight: 600, color: step === 2 ? C.green : C.yellow }}>{Math.max(0, step + 1)}</span>
        <span style={{ fontSize: 32, color: C.grey, marginLeft: 18 }}>steps to find user 42</span>
      </div>
      <div style={{ position: 'absolute', top: 1290, left: 90, right: 90, textAlign: 'center', opacity: finale, transform: `scale(${0.9 + finale * 0.1})` }}>
        <div style={{ fontFamily: serif, fontStyle: 'italic', fontSize: 50, color: C.white, lineHeight: 1.2 }}>
          At a million orders: a million checks, or about 20.
        </div>
      </div>
    </>
  )
}

export function IndexReel() {
  return (
    <Stage>
      <Sequence durationInFrames={130}>
        <Title from={4} top={190} out={112}>Why did Claude add this index?</Title>
        <TranscriptCard
          from={18}
          top={520}
          out={112}
          tool="Update(migrations/0042_orders_index.sql)"
          lines={[
            { t: '+ CREATE INDEX idx_orders_user_id', kind: 'add' },
            { t: '+   ON orders (user_id);', kind: 'add' },
          ]}
        />
        <Fade from={70} out={112} style={{ top: 980, left: 70, right: 70, textAlign: 'center', fontSize: 36, color: C.grey }}>
          GET /users/42/orders went from 1.8s to 4ms
        </Fade>
      </Sequence>
      <Sequence from={130} durationInFrames={150}>
        <FullScan />
      </Sequence>
      <Sequence from={280} durationInFrames={170}>
        <TreeWalk />
      </Sequence>
    </Stage>
  )
}

export const INDEX_REEL_FRAMES = 450
