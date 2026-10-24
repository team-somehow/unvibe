import { interpolate, useCurrentFrame } from 'remotion'
import { Captions, ReelAudio, Scene, Sfx, buildTimeline, useCue, useScene, type Manifest } from './audio'
import manifest from './audio/index.json'
import { C, Fade, Stage, Title, TranscriptCard, mono, sans, serif, usePop, useTween } from './primitives'
import script from './scripts/index.json'

const T = buildTimeline(script, manifest as unknown as Manifest)
export const INDEX_REEL_FRAMES = T.total

const ROWS = 12
const TARGET = 9

function Hook() {
  const frame = useCurrentFrame()
  const card = useCue('migration', 40)
  const drop = useCue('four', 150)
  const ms = interpolate(frame, [drop - 30, drop + 10], [1800, 4], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
  const p = usePop(drop - 34)
  return (
    <>
      <Title from={4} top={190}>Why did Claude add this index?</Title>
      <TranscriptCard
        from={card - 10}
        top={470}
        tool="Update(migrations/0042_orders_index.sql)"
        lines={[
          { t: '+ CREATE INDEX idx_orders_user_id', kind: 'add' },
          { t: '+   ON orders (user_id);', kind: 'add' },
        ]}
      />
      <div style={{ position: 'absolute', top: 900, left: 0, right: 0, textAlign: 'center', opacity: p, transform: `scale(${0.9 + p * 0.1})` }}>
        <div style={{ fontFamily: mono, fontSize: 30, color: C.grey }}>GET /users/42/orders</div>
        <div style={{ fontFamily: sans, fontWeight: 600, fontSize: 150, letterSpacing: -4, color: ms < 100 ? C.green : C.red, fontVariantNumeric: 'tabular-nums', textShadow: `0 0 60px ${ms < 100 ? 'rgba(131,193,103,0.35)' : 'rgba(252,98,85,0.3)'}` }}>
          {ms >= 1000 ? `${(ms / 1000).toFixed(1)}s` : `${Math.round(ms)}ms`}
        </div>
      </div>
      <Sfx t={T} name="pop" at={card - 10} volume={0.35} />
      <Sfx t={T} name="whoosh" at={drop - 30} volume={0.4} />
      <Sfx t={T} name="success" at={drop + 8} volume={0.35} />
    </>
  )
}

function FullScan() {
  const frame = useCurrentFrame()
  const start = useCue('every', 40)
  const end = Math.max(start + 40, useCue('forty-two', start + 90) - 4)
  const idx = Math.floor(interpolate(frame, [start, end], [0, TARGET], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }))
  const found = frame >= end + 2
  return (
    <>
      <Title from={0} top={170} size={66} color={C.yellow}>Without it, Postgres checks every row</Title>
      <div style={{ position: 'absolute', top: 400, left: 120, width: 560, display: 'flex', flexDirection: 'column', gap: 14 }}>
        {Array.from({ length: ROWS }).map((_, i) => {
          const active = i === idx && !found && frame >= start
          const hit = found && i === TARGET
          const seen = (frame >= start && i < idx) || (found && i <= TARGET)
          const border = hit ? C.green : active ? C.yellow : seen ? C.grey : C.dim
          return (
            <div
              key={i}
              style={{
                height: 64, borderRadius: 14, border: `3px solid ${border}`, display: 'flex', alignItems: 'center',
                justifyContent: 'space-between', padding: '0 26px', fontFamily: mono, fontSize: 28,
                color: hit ? C.green : seen ? C.grey : C.white,
                background: hit ? 'rgba(131,193,103,0.14)' : active ? 'rgba(244,211,94,0.14)' : 'transparent',
                boxShadow: active ? `0 0 30px rgba(244,211,94,0.35)` : hit ? '0 0 40px rgba(131,193,103,0.4)' : 'none',
                transform: active ? 'translateX(14px)' : 'none',
              }}
            >
              <span>order #{1040 + i}</span>
              <span>user_id {i === TARGET ? 42 : [7, 19, 3, 88, 12, 61, 5, 30, 77, 14, 9, 51][i]}</span>
            </div>
          )
        })}
      </div>
      <div style={{ position: 'absolute', top: 640, left: 700, width: 200, textAlign: 'center', fontFamily: sans }}>
        <div style={{ fontSize: 120, fontWeight: 600, color: found ? C.green : C.yellow, fontVariantNumeric: 'tabular-nums' }}>{frame < start ? 0 : Math.min(idx + 1, TARGET + 1)}</div>
        <div style={{ fontSize: 30, color: C.grey }}>rows checked</div>
      </div>
      <Fade from={end + 4} style={{ top: 1362, left: 70, right: 70, textAlign: 'center', fontFamily: serif, fontStyle: 'italic', fontSize: 52, color: C.white }}>
        Full table scan: O(n)
      </Fade>
      <Sfx t={T} name="scan" at={start} volume={0.3} />
      <Sfx t={T} name="ding" at={end + 2} volume={0.35} />
    </>
  )
}

const NODES = [
  { id: 'r', x: 540, y: 520, label: '50' },
  { id: 'a', x: 300, y: 760, label: '20 · 35' },
  { id: 'b', x: 780, y: 760, label: '70 · 90' },
  { id: 'a1', x: 170, y: 1000, label: '3 · 12' },
  { id: 'a2', x: 410, y: 1000, label: '42 · 48' },
  { id: 'b1', x: 650, y: 1000, label: '61 · 66' },
  { id: 'b2', x: 870, y: 1000, label: '77 · 88' },
]
const EDGES: [string, string][] = [['r', 'a'], ['r', 'b'], ['a', 'a1'], ['a', 'a2'], ['b', 'b1'], ['b', 'b2']]
const PATH = ['r', 'a', 'a2']

function TreeWalk() {
  const frame = useCurrentFrame()
  const draw = useTween(6, 45)
  const s0 = useCue('root', 90)
  const s1 = useCue('walks', s0 + 40)
  const s2 = useCue('forty-two', s1 + 40)
  const step = frame < s0 ? -1 : frame < s1 ? 0 : frame < s2 ? 1 : 2
  const at = (id: string) => NODES.find((n) => n.id === id)!
  return (
    <>
      <Title from={0} top={170} size={66} color={C.blue}>With the index, it walks a tree</Title>
      <svg viewBox="0 0 1080 1920" style={{ position: 'absolute', inset: 0 }}>
        <defs>
          <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="8" result="b" />
            <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>
        {EDGES.map(([f, t], i) => {
          const a = at(f), b = at(t)
          const len = Math.hypot(b.x - a.x, b.y - a.y)
          const lit = PATH.indexOf(t) > 0 && PATH.indexOf(t) <= step
          return (
            <line key={i} x1={a.x} y1={a.y + 40} x2={b.x} y2={b.y - 40} stroke={lit ? C.yellow : C.grey} strokeWidth={lit ? 6 : 3}
              strokeDasharray={len} strokeDashoffset={len * (1 - draw)} filter={lit ? 'url(#glow)' : undefined} />
          )
        })}
        {NODES.map((n, i) => {
          const pi = PATH.indexOf(n.id)
          const lit = pi >= 0 && pi <= step
          const hit = n.id === 'a2' && step === 2
          const s = Math.min(1, Math.max(0, draw * 7 - i * 0.6))
          const color = hit ? C.green : lit ? C.yellow : C.blue
          return (
            <g key={n.id} transform={`translate(${n.x} ${n.y}) scale(${s})`} filter={lit ? 'url(#glow)' : undefined}>
              <rect x={-100} y={-40} width={200} height={80} rx={16} fill={hit ? 'rgba(131,193,103,0.18)' : '#000'} stroke={color} strokeWidth={lit ? 6 : 3} />
              <text textAnchor="middle" dy={11} fill={color} style={{ fontFamily: mono, fontSize: 32 }}>{n.label}</text>
            </g>
          )
        })}
      </svg>
      <div style={{ position: 'absolute', top: 1110, left: 0, right: 0, textAlign: 'center', fontFamily: sans }}>
        <span style={{ fontSize: 100, fontWeight: 600, color: step === 2 ? C.green : C.yellow }}>{Math.max(0, step + 1)}</span>
        <span style={{ fontSize: 32, color: C.grey, marginLeft: 18 }}>steps to find user 42</span>
      </div>
      <Sfx t={T} name="tick" at={s0} volume={0.5} />
      <Sfx t={T} name="tick" at={s1} volume={0.5} />
      <Sfx t={T} name="success" at={s2} volume={0.35} />
    </>
  )
}

function Payoff() {
  const { durationInFrames } = useScene()
  const million = useCue('million', 50)
  const twenty = useCue('twenty', 90)
  const grow = useTween(million - 6, million + 24)
  const small = usePop(twenty - 4)
  const end = usePop(durationInFrames - 40)
  return (
    <>
      <Title from={0} top={190} size={72}>At a million orders</Title>
      <div style={{ position: 'absolute', top: 470, left: 90, right: 190, fontFamily: sans }}>
        <div style={{ fontSize: 32, color: C.grey, marginBottom: 14 }}>full scan</div>
        <div style={{ height: 84, width: `${grow * 100}%`, borderRadius: 16, background: C.red, boxShadow: '0 0 50px rgba(252,98,85,0.35)' }} />
        <div style={{ marginTop: 14, fontSize: 64, fontWeight: 600, color: C.red, fontVariantNumeric: 'tabular-nums' }}>{Math.round(grow * 1_000_000).toLocaleString('en-US')} rows</div>
        <div style={{ fontSize: 32, color: C.grey, margin: '70px 0 14px' }}>with the index</div>
        <div style={{ height: 84, width: 84 * small, borderRadius: 16, background: C.green, boxShadow: '0 0 50px rgba(131,193,103,0.45)' }} />
        <div style={{ marginTop: 14, fontSize: 64, fontWeight: 600, color: C.green, opacity: small }}>~20 steps</div>
      </div>
      <div style={{ position: 'absolute', top: 1220, left: 90, right: 190, textAlign: 'center', opacity: end, fontFamily: serif, fontStyle: 'italic', fontSize: 48, color: C.yellow, lineHeight: 1.2 }}>
        Index what you filter by.
      </div>
      <Sfx t={T} name="riser" at={million - 20} volume={0.25} />
      <Sfx t={T} name="pop" at={twenty - 4} volume={0.4} />
    </>
  )
}

export function IndexReel() {
  return (
    <Stage>
      <ReelAudio t={T} musicVolume={0.2} />
      <Scene t={T} id="hook"><Hook /></Scene>
      <Scene t={T} id="scan"><FullScan /></Scene>
      <Scene t={T} id="tree"><TreeWalk /></Scene>
      <Scene t={T} id="payoff"><Payoff /></Scene>
      <Captions t={T} />
    </Stage>
  )
}
