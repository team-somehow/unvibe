import { interpolate, useCurrentFrame, useVideoConfig } from 'remotion'
import { Captions, ReelAudio, Scene, Sfx, buildTimeline, useCue, useScene, type Manifest } from './audio'
import manifest from './audio/index.json'
import { CLAMP, EASE, EASE_OUT, GlowDefs, Say, Svg, Tag, fmt, lerp, prog, rgba, springAt } from './kit-databases'
import { C, Fade, Stage, TranscriptCard, mono, sans, serif } from './primitives'
import script from './scripts/index.json'

const T = buildTimeline(script, manifest as unknown as Manifest)
export const INDEX_REEL_FRAMES = T.total

const ROWS = 12
const TARGET = 9

// ---------------------------------------------------------------------------------------------
// 1. Hook: one migration line, 1.8 s → 4 ms
function Hook() {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const card = useCue('migration', 40)
  const orders = useCue('orders', 97)
  const went = useCue('went', 118)
  const secs = useCue('seconds', 153)
  const four = useCue('four', 176)
  const why = useCue('why', 243)
  const drop = prog(frame, four - 6, four + 10, EASE)
  const fill = prog(frame, went - 6, secs + 4, (t) => 1 - Math.pow(1 - t, 1.6))
  const ms = drop > 0 ? lerp(1800, 4, drop) : 1800 * fill
  const p = springAt(frame, orders - 8, fps, 15)
  const fast = drop > 0.5
  const color = fast ? C.green : C.red
  const hl = prog(frame, why - 6, why + 8)
  const BAR_W = 760
  return (
    <>
      <Say from={4} top={180} size={76}>Why did Claude add this index?</Say>
      <TranscriptCard
        from={card - 10}
        top={430}
        tool="Update(migrations/0042_orders_index.sql)"
        lines={[
          { t: '+ CREATE INDEX idx_orders_user_id', kind: 'add' },
          { t: '+   ON orders (user_id);', kind: 'add' },
        ]}
      />
      {/* "here's why": the new line glows */}
      <div style={{ position: 'absolute', top: 520, left: 96, width: 888, height: 112, borderRadius: 14, border: `3px solid ${C.yellow}`, opacity: hl, boxShadow: `0 0 40px ${rgba(C.yellow, 0.35)}` }} />
      <div style={{ position: 'absolute', top: 820, left: 110, width: BAR_W, opacity: p, transform: `translateY(${(1 - p) * 30}px)` }}>
        <div style={{ fontFamily: mono, fontSize: 30, color: C.grey, textAlign: 'center' }}>GET /users/42/orders</div>
        <div style={{ fontFamily: sans, fontWeight: 600, fontSize: 168, lineHeight: 1.1, letterSpacing: -5, textAlign: 'center', color, fontVariantNumeric: 'tabular-nums', textShadow: `0 0 70px ${rgba(color, 0.35)}` }}>
          {ms >= 1000 ? `${(ms / 1000).toFixed(1)}s` : `${Math.round(ms)}ms`}
        </div>
        <div style={{ position: 'relative', height: 36, marginTop: 20, borderRadius: 18, background: rgba(C.white, 0.06), border: `2px solid ${C.dim}` }}>
          <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: Math.max(10, (ms / 2000) * BAR_W), borderRadius: 18, background: color, boxShadow: `0 0 40px ${rgba(color, 0.5)}` }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 12, fontFamily: mono, fontSize: 28, color: C.grey }}>
          <span>0</span>
          <span>2 s</span>
        </div>
      </div>
      <Sfx t={T} name="whoosh" at={four - 8} volume={0.4} />
      <Sfx t={T} name="success" at={four + 8} volume={0.35} />
    </>
  )
}

// ---------------------------------------------------------------------------------------------
// 2. Full scan: check every row
function FullScan() {
  const frame = useCurrentFrame()
  const start = useCue('every', 40)
  const end = Math.max(start + 40, useCue('forty-two', start + 90) - 4)
  const idx = Math.floor(interpolate(frame, [start, end], [0, TARGET], CLAMP))
  const found = frame >= end + 2
  return (
    <>
      <Say from={0} top={160} size={66} color={C.yellow}>
        Without an index,
        <br />
        Postgres checks every row
      </Say>
      <div style={{ position: 'absolute', top: 400, left: 110, width: 570, display: 'flex', flexDirection: 'column', gap: 14 }}>
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
                justifyContent: 'space-between', padding: '0 26px', fontFamily: mono, fontSize: 29,
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
      <div style={{ position: 'absolute', top: 640, left: 700, width: 190, textAlign: 'center', fontFamily: sans }}>
        <div style={{ fontSize: 120, fontWeight: 600, color: found ? C.green : C.yellow, fontVariantNumeric: 'tabular-nums' }}>{frame < start ? 0 : Math.min(idx + 1, TARGET + 1)}</div>
        <div style={{ fontSize: 30, color: C.grey }}>rows checked</div>
      </div>
      <Fade from={end + 4} style={{ top: 1366, left: 70, right: 190, textAlign: 'center', fontFamily: serif, fontStyle: 'italic', fontSize: 54, color: C.white }}>
        Full table scan: O(n)
      </Fade>
      <Sfx t={T} name="scan" at={start} volume={0.3} />
    </>
  )
}

// ---------------------------------------------------------------------------------------------
// 3. Tree walk: compare at each node, prune half the tree, follow the pointer to the row
type Node = { id: string; x: number; y: number; label: string; w: number }
const NODES: Node[] = [
  { id: 'r', x: 540, y: 420, label: '50', w: 140 },
  { id: 'a', x: 300, y: 590, label: '25', w: 140 },
  { id: 'b', x: 780, y: 590, label: '75', w: 140 },
  { id: 'a1', x: 175, y: 760, label: '3 · 12', w: 190 },
  { id: 'a2', x: 418, y: 760, label: '42 · 48', w: 190 },
  { id: 'b1', x: 662, y: 760, label: '61 · 66', w: 190 },
  { id: 'b2', x: 895, y: 760, label: '77 · 88', w: 170 },
]
const EDGES: [string, string][] = [['r', 'a'], ['r', 'b'], ['a', 'a1'], ['a', 'a2'], ['b', 'b1'], ['b', 'b2']]
const PATH = ['r', 'a', 'a2']
const PRUNE_AT: Record<string, number> = { b: 1, b1: 1, b2: 1, a1: 2 }

function TreeWalk() {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const sorted = useCue('sorted', 76)
  const s0 = useCue('root', 161)
  const s1 = useCue('walks', s0 + 30)
  const s2 = useCue('contain', s1 + 40)
  const s3 = useCue('forty-two', s2 + 15)
  const draw = prog(frame, sorted - 14, sorted + 22, EASE_OUT)
  const step = frame < s0 ? -1 : frame < s1 ? 0 : frame < s2 ? 1 : 2
  const stepAt = [s0, s1, s2]
  const found = frame >= s3
  const ptr = prog(frame, s3 + 2, s3 + 18, EASE_OUT)
  const rowHit = prog(frame, s3 + 14, s3 + 24)
  const at = (id: string) => NODES.find((n) => n.id === id)!
  const pruned = (id: string) => {
    const k = PRUNE_AT[id] ?? (id === 'b' ? 1 : 99)
    return k <= 2 ? prog(frame, stepAt[k] - 2, stepAt[k] + 12) : 0
  }
  const cmp = [
    { at: s1, text: '42 < 50', x: 330, y: 495 },
    { at: s2, text: '42 ≥ 25', x: 455, y: 665 },
  ]
  const ROW_Y = 930
  return (
    <>
      <Say from={0} top={170} size={66} color={C.blue}>With the index, it walks a tree</Say>
      <Svg>
        <GlowDefs />
        {EDGES.map(([f, t], i) => {
          const a = at(f)
          const b = at(t)
          const len = Math.hypot(b.x - a.x, b.y - a.y - 80)
          const lit = PATH.indexOf(t) > 0 && PATH.indexOf(t) <= step
          const dim = Math.max(pruned(t), pruned(f))
          return (
            <line key={i} x1={a.x} y1={a.y + 40} x2={b.x} y2={b.y - 40} stroke={lit ? C.yellow : C.grey} strokeWidth={lit ? 6 : 3}
              strokeDasharray={len} strokeDashoffset={len * (1 - draw)} opacity={1 - 0.75 * dim} filter={lit ? 'url(#kglow)' : undefined} />
          )
        })}
        {NODES.map((n, i) => {
          const pi = PATH.indexOf(n.id)
          const lit = pi >= 0 && pi <= step
          const hit = n.id === 'a2' && found
          const s = Math.min(1, Math.max(0, draw * 7 - i * 0.7))
          const dim = pruned(n.id)
          const color = hit ? C.green : lit ? C.yellow : C.blue
          const pop = lit ? springAt(frame, stepAt[pi], fps, 10) : 1
          return (
            <g key={n.id} transform={`translate(${n.x} ${n.y}) scale(${s * (lit ? 0.92 + 0.08 * pop : 1)})`} opacity={1 - 0.75 * dim} filter={lit ? 'url(#kglow)' : undefined}>
              <rect x={-n.w / 2} y={-40} width={n.w} height={80} rx={16} fill={hit ? 'rgba(131,193,103,0.18)' : lit ? 'rgba(244,211,94,0.1)' : '#000'} stroke={dim > 0.5 ? C.dim : color} strokeWidth={lit ? 6 : 3} />
              <text textAnchor="middle" dy={11} fill={dim > 0.5 ? C.grey : color} style={{ fontFamily: mono, fontSize: 32 }}>{n.label}</text>
            </g>
          )
        })}
        {/* pointer from the leaf to the actual row */}
        <g opacity={ptr}>
          <rect x={415.5} y={804} width={5} height={Math.max(1, (ROW_Y - 18 - 804) * ptr)} rx={2.5} fill={C.green} filter="url(#kglow)" />
          <path d={`M 418 ${ROW_Y - 4} l -14 -22 l 28 0 z`} fill={C.green} opacity={ptr > 0.9 ? 1 : 0} />
        </g>
      </Svg>
      {cmp.map((c) => {
        const p = springAt(frame, c.at, fps, 13)
        return (
          <div key={c.text} style={{ position: 'absolute', left: c.x - 90, top: c.y - 30, width: 180, textAlign: 'center', opacity: Math.min(1, p * 1.5), transform: `scale(${0.7 + 0.3 * p})` }}>
            <span style={{ fontFamily: mono, fontSize: 30, color: C.yellow, background: '#000', padding: '4px 12px', borderRadius: 10, border: `2px solid ${rgba(C.yellow, 0.6)}` }}>{c.text}</span>
          </div>
        )
      })}
      <div style={{ position: 'absolute', left: 440, top: 836, fontFamily: sans, fontSize: 28, color: C.green, opacity: ptr }}>points to the row</div>
      <div style={{ position: 'absolute', top: ROW_Y, left: 110, width: 760, opacity: prog(frame, s3 - 4, s3 + 8) }}>
        <div
          style={{
            height: 68, borderRadius: 14, border: `3px solid ${rowHit > 0.5 ? C.green : C.dim}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '0 28px', fontFamily: mono, fontSize: 30, color: rowHit > 0.5 ? C.green : C.white, background: rgba(C.green, 0.14 * rowHit), boxShadow: `0 0 ${40 * rowHit}px ${rgba(C.green, 0.4)}`,
          }}
        >
          <span>order #1049</span>
          <span>user_id 42</span>
        </div>
      </div>
      <div style={{ position: 'absolute', top: 1140, left: 70, width: 820, textAlign: 'center', fontFamily: sans, opacity: prog(frame, s0 - 6, s0 + 6) }}>
        <span style={{ fontSize: 120, fontWeight: 600, color: found ? C.green : C.yellow, fontVariantNumeric: 'tabular-nums', textShadow: `0 0 50px ${rgba(found ? C.green : C.yellow, 0.35)}` }}>{Math.max(1, step + 1)}</span>
        <span style={{ fontSize: 36, color: C.grey, marginLeft: 22 }}>{step < 1 ? 'step' : 'steps'} to find user 42</span>
      </div>
      <Sfx t={T} name="tick" at={s0} volume={0.5} />
      <Sfx t={T} name="success" at={s3} volume={0.35} />
    </>
  )
}

// ---------------------------------------------------------------------------------------------
// 4. Payoff: a million rows. The scan crawls through all of them; the tree only grows 20 levels deep.
const COL = { x: 90, y: 400, w: 360, h: 690 }
const FAN = { cx: 700, top: 420, bottom: 1060, half: 175 }
const LEVELS = 20
const TARGET_T = 0.3711 // where user 42 sits among the leaves
// The fan zooms out as it gains levels: `span` is the (continuous) number of levels on screen minus one
const levelY = (k: number, span: number) => FAN.top + (k / span) * (FAN.bottom - FAN.top)
const levelHalf = (k: number, span: number) => FAN.half * Math.sqrt(Math.min(1, k / span))
const nodeX = (k: number, j: number, span: number) => FAN.cx - levelHalf(k, span) + ((j + 0.5) / 2 ** k) * 2 * levelHalf(k, span)
const pathX = (k: number, span: number) => nodeX(k, Math.min(2 ** k - 1, Math.floor(TARGET_T * 2 ** k)), span)

function Payoff() {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const { durationInFrames } = useScene()
  const at = useCue('At', 86)
  const million = useCue('million', 96)
  const twenty = useCue('twenty', 136)
  const million2 = Math.max(twenty + 30, useCue('million.', 186))
  const panelsIn = prog(frame, 0, 16, EASE_OUT)
  // the table grows to a million rows, then the scan reads through it
  const grow = prog(frame, million - 6, million + 14)
  const rows = Math.round(Math.exp(lerp(Math.log(12), Math.log(1_000_000), grow)))
  const read = frame < million ? 12 : Math.round(Math.exp(lerp(Math.log(12), Math.log(1_000_000), prog(frame, million, million2, (t) => t))))
  const scanning = frame >= million && frame < million2
  const scanDone = frame >= million2
  const pitch = Math.max(5, COL.h / rows)
  const scroll = scanning ? ((frame - million) * 26) % pitch : 0
  // the tree gains levels; the search path follows one level at a time
  const lf = 3 + (LEVELS - 3) * prog(frame, million - 2, twenty + 2, EASE)
  const span = lf - 1
  const levels = Math.min(LEVELS, Math.ceil(lf - 0.001))
  const treeDone = frame >= twenty + 2
  const ding = springAt(frame, twenty + 2, fps, 10)
  const takeaway = springAt(frame, durationInFrames - 58, fps, 16)

  const stripes = Math.min(140, Math.floor(COL.h / pitch) + 2)
  return (
    <>
      <Say from={0} out={at - 10} top={190} size={72}>Three steps vs. the whole table</Say>
      <Say from={at - 4} top={190} size={72}>At a million orders</Say>
      <Tag color={C.red} style={{ top: 340, left: COL.x, width: COL.w, textAlign: 'center', opacity: panelsIn }}>Full scan</Tag>
      <Tag color={C.green} style={{ top: 340, left: FAN.cx - 200, width: 400, textAlign: 'center', opacity: panelsIn }}>Index</Tag>
      <Svg>
        <GlowDefs />
        <defs>
          <clipPath id="colclip">
            <rect x={COL.x} y={COL.y} width={COL.w} height={COL.h} rx={18} />
          </clipPath>
        </defs>
        {/* the table: one stripe per row, packing tighter as it grows */}
        <g opacity={panelsIn}>
          <rect x={COL.x} y={COL.y} width={COL.w} height={COL.h} rx={18} fill={rgba(C.red, 0.05)} stroke={scanDone ? C.red : rgba(C.red, 0.6)} strokeWidth={3} filter={scanDone ? 'url(#kglow)' : undefined} />
          <g clipPath="url(#colclip)">
            {Array.from({ length: stripes }).map((_, i) => {
              const y = COL.y + i * pitch - scroll
              return <rect key={i} x={COL.x + 16} y={y + pitch * 0.18} width={COL.w - 32} height={Math.max(1.5, pitch * 0.62)} rx={Math.min(8, pitch * 0.2)} fill={rgba(C.red, rows > 200 ? 0.28 : 0.2)} stroke={rows <= 12 ? rgba(C.red, 0.7) : 'none'} strokeWidth={2} />
            })}
            {scanning && (
              <rect x={COL.x} y={COL.y + ((frame * 37) % COL.h) - 10} width={COL.w} height={20} fill={rgba(C.yellow, 0.75)} filter="url(#kglow)" />
            )}
          </g>
        </g>
        {/* the tree: dots for the top levels, then each level is a solid band twice as wide in nodes */}
        <g opacity={panelsIn}>
          {Array.from({ length: levels }).map((_, k) => {
            const y = Math.min(FAN.bottom, levelY(k, span))
            const half = levelHalf(k, span)
            const fade = k < 3 ? 1 : Math.min(1, Math.max(0, lf - k + 0.4))
            const n = 2 ** k
            const gapX = (2 * half) / n
            const gapY = (FAN.bottom - FAN.top) / span
            const r = Math.min(13, k === 0 ? 13 : gapX * 0.32, gapY * 0.3)
            if (r >= 2.2) {
              return (
                <g key={k} opacity={fade}>
                  {k > 0 &&
                    Array.from({ length: n }).map((_, j) => (
                      <line key={`e${j}`} x1={nodeX(k - 1, Math.floor(j / 2), span)} y1={levelY(k - 1, span)} x2={nodeX(k, j, span)} y2={y} stroke={rgba(C.blue, 0.55)} strokeWidth={Math.max(1.2, r * 0.32)} />
                    ))}
                  {Array.from({ length: n }).map((_, j) => (
                    <circle key={j} cx={nodeX(k, j, span)} cy={y} r={r} fill={C.blue} />
                  ))}
                </g>
              )
            }
            return <rect key={k} x={FAN.cx - half} y={y - Math.min(3, gapY * 0.2)} width={2 * half} height={Math.max(2, Math.min(6, gapY * 0.4))} rx={3} opacity={fade} fill={rgba(C.blue, 0.35 + 0.3 * (k / LEVELS))} />
          })}
          {/* search path */}
          <polyline points={Array.from({ length: levels }).map((_, k) => `${pathX(k, span)},${Math.min(FAN.bottom, levelY(k, span))}`).join(' ')} fill="none" stroke={treeDone ? C.green : C.yellow} strokeWidth={5} strokeLinejoin="round" filter="url(#kglow)" />
          <circle cx={pathX(levels - 1, span)} cy={Math.min(FAN.bottom, levelY(levels - 1, span))} r={12 + 6 * (treeDone ? ding : 0)} fill={treeDone ? C.green : C.yellow} filter="url(#kglow)" />
          {/* base label */}
          <g opacity={prog(frame, twenty + 4, twenty + 16)}>
            <line x1={FAN.cx - FAN.half} y1={FAN.bottom + 26} x2={FAN.cx + FAN.half} y2={FAN.bottom + 26} stroke={C.grey} strokeWidth={2.5} />
            <line x1={FAN.cx - FAN.half} y1={FAN.bottom + 16} x2={FAN.cx - FAN.half} y2={FAN.bottom + 36} stroke={C.grey} strokeWidth={2.5} />
            <line x1={FAN.cx + FAN.half} y1={FAN.bottom + 16} x2={FAN.cx + FAN.half} y2={FAN.bottom + 36} stroke={C.grey} strokeWidth={2.5} />
          </g>
        </g>
      </Svg>
      <div style={{ position: 'absolute', top: FAN.bottom + 40, left: FAN.cx - 200, width: 400, textAlign: 'center', fontFamily: serif, fontStyle: 'italic', fontSize: 34, color: C.white, opacity: prog(frame, twenty + 4, twenty + 16) }}>
        2<sup style={{ fontSize: 22 }}>20</sup> ≈ a million leaves
      </div>
      {/* counters */}
      <div style={{ position: 'absolute', top: 1160, left: COL.x - 20, width: COL.w + 40, textAlign: 'center', fontFamily: sans, opacity: panelsIn }}>
        <div style={{ fontSize: 76, fontWeight: 600, lineHeight: 1, letterSpacing: -2, color: C.red, fontVariantNumeric: 'tabular-nums', textShadow: scanDone ? `0 0 50px ${rgba(C.red, 0.45)}` : undefined }}>{fmt(read)}</div>
        <div style={{ fontSize: 32, color: C.grey, marginTop: 10 }}>rows read</div>
      </div>
      <div style={{ position: 'absolute', top: 1160, left: FAN.cx - 190, width: 380, textAlign: 'center', fontFamily: sans, opacity: panelsIn }}>
        <div style={{ fontSize: 76, fontWeight: 600, lineHeight: 1, color: C.green, fontVariantNumeric: 'tabular-nums', transform: `scale(${1 + 0.12 * (treeDone ? ding : 0) * (1 - prog(frame, twenty + 14, twenty + 30))})`, textShadow: treeDone ? `0 0 50px ${rgba(C.green, 0.5)}` : undefined }}>{levels}</div>
        <div style={{ fontSize: 32, color: C.grey, marginTop: 10 }}>steps</div>
      </div>
      <div style={{ position: 'absolute', top: 1320, left: 70, right: 190, textAlign: 'center', fontFamily: serif, fontStyle: 'italic', fontSize: 62, lineHeight: 1.1, color: C.yellow, opacity: Math.min(1, takeaway * 1.4), transform: `translateY(${(1 - takeaway) * 20}px)` }}>
        Index what you filter by.
      </div>
      <Sfx t={T} name="riser" at={million - 20} volume={0.22} />
      <Sfx t={T} name="ding" at={twenty + 2} volume={0.4} />
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
