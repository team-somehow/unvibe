import { interpolate, interpolateColors, random, useCurrentFrame } from 'remotion'
import { Captions, ReelAudio, Scene, Sfx, buildTimeline, useCue, type Manifest } from './audio'
import manifest from './audio/backoff.json'
import { Arrow, CodeCard, Meter, Svg, clamp, easeOut, glowText, prog, rgba, useSpr } from './kit-reliability'
import { C, Stage, Title, mono, sans, serif } from './primitives'
import script from './scripts/backoff.json'

const T = buildTimeline(script, manifest as unknown as Manifest)
export const BACKOFF_REEL_FRAMES = T.total

function StatusChip({ ok, x, y, okText = '200 OK', badText = '503' }: { ok: number; x: number; y: number; okText?: string; badText?: string }) {
  const color = ok > 0.5 ? C.green : C.red
  return (
    <div
      style={{
        position: 'absolute', left: x, top: y, transform: 'translateX(-100%)', whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', gap: 12, padding: '8px 20px', borderRadius: 999,
        border: `2px solid ${color}`, color, fontFamily: mono, fontSize: 28, fontWeight: 600, background: rgba(color, 0.1), boxShadow: `0 0 24px ${rgba(color, 0.35)}`,
      }}
    >
      <span style={{ width: 14, height: 14, borderRadius: 7, background: color, boxShadow: `0 0 12px ${color}` }} />
      {ok > 0.5 ? okText : badText}
    </div>
  )
}

// ---------------------------------------------------------------- 1. Hook: a blip that wouldn't end

const PILLS = 30
const BLIP = 7
const DOWN_END = 26

function fmt(sec: number) {
  const s = Math.round(sec)
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

function Hook() {
  const frame = useCurrentFrame()
  const blip = useCue('two', 45)
  const app = useCue('app', 93)
  const ten = useCue('ten', 123)
  const claude = useCue('claude', 158)
  const retry = useCue('retry', 190)

  const strip = useSpr(4, 16)
  const spreadStart = app + 4
  const spreadEnd = ten + 10
  const redUpTo = frame < blip + 2 ? -1 : frame < spreadStart ? BLIP : Math.round(interpolate(frame, [spreadStart, spreadEnd], [BLIP, DOWN_END], clamp))
  const down = frame >= spreadStart
  const blipLabel = prog(frame, blip + 2, blip + 12) * (1 - prog(frame, spreadStart, spreadStart + 8))
  const bracket = prog(frame, spreadStart + 6, spreadEnd)
  const seconds = frame < spreadStart ? 2 : interpolate(frame, [spreadStart, spreadEnd + 6], [2, 600], { ...clamp, easing: (x) => x * x })
  const clockP = useSpr(8, 14)
  const clockColor = interpolateColors(seconds, [2, 60, 600], [C.yellow, C.red, C.red])
  const loopLabel = useSpr(retry + 10, 14)

  const px = (i: number) => 90 + i * 30

  return (
    <>
      <Title from={0} top={150} size={80}>A blip that wouldn't end</Title>
      <div style={{ position: 'absolute', left: 90, top: 292, width: 900, opacity: Math.min(1, strip) }}>
        <span style={{ fontFamily: mono, fontSize: 32, color: C.white }}>payments-api</span>
      </div>
      <div style={{ opacity: Math.min(1, strip) }}>
        <StatusChip x={990} y={284} ok={down ? 0 : 1} okText="operational" badText="outage" />
      </div>
      {Array.from({ length: PILLS }).map((_, i) => {
        const red = i >= BLIP && i <= redUpTo
        const flipAt = i === BLIP ? blip + 2 : spreadStart + ((i - BLIP) / (DOWN_END - BLIP)) * (spreadEnd - spreadStart)
        const pop = red ? interpolate(frame, [flipAt, flipAt + 3, flipAt + 9], [1, 1.25, 1], clamp) : 1
        const enter = prog(frame, 4 + i * 0.6, 14 + i * 0.6)
        return (
          <div
            key={i}
            style={{
              position: 'absolute', left: px(i) + 4, top: 370, width: 22, height: 100, borderRadius: 8,
              background: red ? C.red : rgba(C.green, 0.75), boxShadow: red ? `0 0 22px ${rgba(C.red, 0.7)}` : 'none',
              opacity: enter, transform: `scaleY(${pop * enter})`,
            }}
          />
        )
      })}
      {/* the blip */}
      <div style={{ position: 'absolute', left: px(BLIP) + 15 - 100, width: 200, top: 488, textAlign: 'center', fontFamily: sans, fontSize: 30, fontWeight: 600, color: C.yellow, opacity: blipLabel }}>
        ↑ 2s blip
      </div>
      {/* the outage */}
      <Svg>
        <path
          d={`M ${px(BLIP) + 6} 490 v 16 H ${px(BLIP) + 6 + (px(DOWN_END) - px(BLIP) + 18) * bracket} v -16`}
          fill="none" stroke={C.red} strokeWidth={4} opacity={bracket > 0 ? 1 : 0} filter="url(#kglow)"
        />
      </Svg>
      <div style={{ position: 'absolute', left: px(BLIP), width: px(DOWN_END) - px(BLIP) + 30, top: 520, textAlign: 'center', fontFamily: sans, fontSize: 32, fontWeight: 600, color: C.red, opacity: prog(frame, ten - 6, ten + 6) }}>
        ten minutes down
      </div>

      {/* stopwatch */}
      <div style={{ position: 'absolute', top: 590, left: 70, width: 940, textAlign: 'center', opacity: Math.min(1, clockP), transform: `scale(${0.8 + 0.2 * clockP})` }}>
        <div style={{ fontFamily: sans, fontWeight: 600, fontSize: 132, letterSpacing: -4, color: clockColor, fontVariantNumeric: 'tabular-nums', lineHeight: 1, textShadow: glowText(clockColor, 50, 0.35) }}>
          {fmt(seconds)}
        </div>
        <div style={{ fontFamily: sans, fontSize: 30, color: C.grey, marginTop: 6 }}>downtime</div>
      </div>

      <CodeCard
        top={810}
        from={Math.min(22, claude - 6)}
        header="Read(src/payments/client.ts)"
        size={31}
        lines={['async function charge(order) {', '  while (true) {', '    try { return await pay(order) }', '    catch { /* retry right away */ }', '  }', '}']}
        hl={[
          { line: 1, text: 'while (true)', at: retry - 6, color: C.red },
          { line: 3, text: 'catch { /* retry right away */ }', at: retry + 2, color: C.red },
        ]}
      />
      <div style={{ position: 'absolute', top: 1232, left: 70, width: 820, display: 'flex', justifyContent: 'center', opacity: Math.min(1, loopLabel), transform: `translateY(${(1 - loopLabel) * 20}px)` }}>
        <div style={{ padding: '14px 30px', borderRadius: 999, border: `3px solid ${C.red}`, background: rgba(C.red, 0.1), color: C.red, fontFamily: sans, fontSize: 34, fontWeight: 600, boxShadow: `0 0 30px ${rgba(C.red, 0.35)}` }}>
          0 ms between retries, forever
        </div>
      </div>

      <Sfx t={T} name="error" at={blip + 1} volume={0.26} />
    </>
  )
}

// ---------------------------------------------------------------- 2. Thundering herd

const CLIENTS = Array.from({ length: 24 }, (_, i) => ({ x: 150 + (i % 6) * 136, y: 790 + Math.floor(i / 6) * 76 }))
const SOLO = 2
const SRV = { x1: 200, x2: 880, y1: 300, y2: 500 }
const hitX = (i: number) => 300 + (i % 6) * 96 + Math.floor(i / 6) * 8

function Herd() {
  const frame = useCurrentFrame()
  const failed = useCue('failed', 20)
  const retried = useCue('retried', 44)
  const thousands = useCue('thousands', 100)
  const all = useCue('all', 135)
  const thunder = useCue('thundering', 202)

  // phase 1: one client in a tight loop
  const soloLaunches: number[] = []
  for (let t = failed - 14; t < thousands + 6; ) {
    soloLaunches.push(t)
    t += t < retried ? 18 : 11
  }
  // phase 2: everyone, in lockstep
  const waves: number[] = []
  for (let t = all - 8; t < thunder + 60; t += 17) waves.push(t)
  const TRAVEL = 13

  const arrivals = [...soloLaunches.map((t) => t + TRAVEL), ...waves.map((t) => t + TRAVEL)]
  const lastHit = Math.max(-999, ...arrivals.filter((a) => a <= frame))
  const sinceHit = frame - lastHit
  const crowd = prog(frame, all - 10, all + 30)
  const load = 0.42 + 0.06 * prog(frame, failed, retried) + 0.6 * crowd + (sinceHit < 8 ? 0.06 * (1 - sinceHit / 8) : 0)
  const shake = sinceHit < 6 && frame > all ? Math.sin(frame * 3.1) * 6 * (1 - sinceHit / 6) * crowd : 0
  const flash = sinceHit < 8 ? 1 - sinceHit / 8 : 0
  const others = prog(frame, thousands - 4, thousands + 18)
  const count = Math.min(soloLaunches.filter((t) => t <= frame).length, 99)
  const counterO = prog(frame, failed, failed + 8) * (1 - prog(frame, thousands, thousands + 10))
  const srv = useSpr(2, 16)

  return (
    <>
      <Title from={0} top={150} size={68} out={thunder - 16}>Every failure, retried instantly</Title>
      <Title from={thunder - 6} top={150} size={84} color={C.red}>A thundering herd</Title>

      <div
        style={{
          position: 'absolute', left: SRV.x1, top: SRV.y1, width: SRV.x2 - SRV.x1, height: SRV.y2 - SRV.y1, boxSizing: 'border-box', borderRadius: 28,
          border: `3px solid ${interpolateColors(load, [0.5, 0.9], [C.blue, C.red])}`, background: rgba(C.red, 0.04 + 0.16 * flash * crowd),
          boxShadow: `0 0 ${20 + 60 * crowd}px ${rgba(C.red, 0.15 + 0.35 * crowd)}`, opacity: Math.min(1, srv), transform: `translateX(${shake}px)`,
        }}
      >
        <div style={{ position: 'absolute', left: 30, top: 26, fontFamily: mono, fontSize: 34, color: C.white }}>payments-api</div>
        <StatusChip x={650} y={20} ok={0} />
        <Meter x={30} y={96} w={620} value={Math.min(1, load)} capacity={0.6} label="load" text={`${Math.round((load / 0.6) * 100)}%`} />
      </div>

      <RateStrip frame={frame} solo={soloLaunches.map((t) => t + TRAVEL)} waves={waves.map((t) => t + TRAVEL)} />
      <Svg>
        {/* solo client's packets */}
        {soloLaunches.map((t, k) => {
          const p = (frame - t) / TRAVEL
          if (p < 0 || p > 1.6) return null
          const c = CLIENTS[SOLO]
          const q = Math.min(1, p)
          const e = q * q
          const x = c.x + (hitX(SOLO) - c.x) * e
          const y = c.y - 26 + (SRV.y2 + 6 - (c.y - 26)) * e
          if (p <= 1) return <circle key={k} cx={x} cy={y} r={11} fill={C.yellow} filter="url(#kglow)" />
          const f = (p - 1) / 0.6
          return (
            <g key={k} opacity={1 - f} transform={`translate(${hitX(SOLO)} ${SRV.y2 + 34})`}>
              <path d="M -12 -12 L 12 12 M 12 -12 L -12 12" stroke={C.red} strokeWidth={6} strokeLinecap="round" />
            </g>
          )
        })}
        {/* lockstep waves */}
        {waves.map((t, k) =>
          CLIENTS.map((c, i) => {
            const p = (frame - t) / TRAVEL
            if (p < 0 || p > 1) return null
            const pos = (q: number) => {
              const e = q * q
              return [c.x + (hitX(i) - c.x) * e, c.y - 26 + (SRV.y2 + 6 - (c.y - 26)) * e]
            }
            const [x, y] = pos(p)
            const [x0, y0] = pos(Math.max(0, p - 0.3))
            const col = interpolateColors(p, [0, 1], [C.yellow, C.red])
            return (
              <g key={`${k}-${i}`}>
                <line x1={x0} y1={y0} x2={x} y2={y} stroke={col} strokeWidth={8} strokeLinecap="round" opacity={0.35} />
                <circle cx={x} cy={y} r={10} fill={col} />
              </g>
            )
          }),
        )}
      </Svg>

      {CLIENTS.map((c, i) => {
        const solo = i === SOLO
        const o = solo ? prog(frame, 0, 10) : others * (prog(frame, thousands + (i % 6) * 1.5 + Math.floor(i / 6) * 2, thousands + 12 + (i % 6) * 1.5 + Math.floor(i / 6) * 2) * 0.75 + 0.25 * crowd)
        const firing = waves.some((t) => frame >= t && frame < t + 5) || (solo && soloLaunches.some((t) => frame >= t && frame < t + 4))
        const color = solo ? C.yellow : C.blue
        return (
          <div
            key={i}
            style={{
              position: 'absolute', left: c.x - 24, top: c.y - 24, width: 48, height: 48, borderRadius: 14, boxSizing: 'border-box',
              border: `3px solid ${color}`, background: `linear-gradient(${rgba(color, firing ? 0.5 : 0.14)}, ${rgba(color, firing ? 0.5 : 0.14)}), #05080B`, opacity: o,
              boxShadow: firing ? `0 0 26px ${rgba(color, 0.7)}` : 'none', transform: `scale(${firing ? 1.12 : 1})`,
            }}
          />
        )
      })}

      <div style={{ position: 'absolute', left: 560, top: 560, width: 340, fontFamily: sans, opacity: counterO }}>
        <div style={{ fontSize: 30, color: C.grey }}>attempts, 0 ms apart</div>
        <div style={{ fontSize: 80, fontWeight: 700, color: C.yellow, lineHeight: 1.05, fontVariantNumeric: 'tabular-nums' }}>{count}</div>
      </div>
      <div style={{ position: 'absolute', left: 70, width: 820, top: 1050, textAlign: 'center', fontFamily: sans, fontSize: 30, color: C.grey, opacity: others }}>
        × thousands of clients
      </div>

      <Sfx t={T} name="stampede" at={thunder - 8} volume={0.7} />
    </>
  )
}

// Live chart of requests hitting the server: lockstep retries show up as tall, evenly spaced spikes
function RateStrip({ frame, solo, waves }: { frame: number; solo: number[]; waves: number[] }) {
  const X0 = 110
  const X1 = 890
  const Y0 = 1380
  const H = 200
  const span = 290
  const capY = Y0 - 70
  const pts: string[] = []
  for (let f = 0; f <= Math.min(frame, span); f += 1) {
    let r = 0.03
    for (const a of solo) r += 0.1 * Math.exp(-((f - a) ** 2) / 3)
    for (const a of waves) r += Math.exp(-((f - a) ** 2) / 4)
    pts.push(`${X0 + (f / span) * (X1 - X0)},${Y0 - Math.min(1.1, r) * H}`)
  }
  const o = prog(frame, 4, 16)
  return (
    <>
      <div style={{ position: 'absolute', left: X0, top: Y0 - H - 64, fontFamily: sans, fontSize: 28, color: C.grey, opacity: o }}>requests per second</div>
      <div style={{ position: 'absolute', left: X0, top: capY - 40, fontFamily: sans, fontSize: 28, color: C.green, opacity: o * 0.9 }}>capacity</div>
      <Svg>
        <line x1={X0} y1={Y0} x2={X1} y2={Y0} stroke={C.dim} strokeWidth={3} opacity={o} />
        <line x1={X0} y1={capY} x2={X1} y2={capY} stroke={C.green} strokeWidth={2} strokeDasharray="10 10" opacity={0.6 * o} />
        {pts.length > 1 && <polyline points={pts.join(' ')} fill="none" stroke={C.red} strokeWidth={4} strokeLinejoin="round" filter="url(#kglow)" />}
      </Svg>
    </>
  )
}

// ---------------------------------------------------------------- 3. Exponential backoff

const AX0 = 140
const PXS = 50 // pixels per second
const tx = (t: number) => AX0 + t * PXS
const AXIS_Y = 1060
const TRIES = [0, 1, 3, 7, 15]
const ARC_H = [90, 150, 230, 330]

function Backoff() {
  const frame = useCurrentFrame()
  const exp = useCue('exponential', 36)
  const back = useCue('backoff', 57)
  const wait = useCue('wait', 98)
  const cues = [useCue('one', 106), useCue('two', 133), useCue('four', 157), useCue('eight', 178)]
  const durs = [14, 16, 18, 22]

  const axis = prog(frame, back - 6, back + 16)
  const ticks = prog(frame, 6, 34, (x) => x)
  const formula = prog(frame, exp - 4, exp + 20) * 100
  const afterLabel = useSpr(back - 4, 15)
  const landed = cues.filter((c, i) => frame >= c + durs[i]).length
  const tries = frame >= wait - 2 ? 1 + landed : 0
  const doubles = prog(frame, cues[2] + 4, cues[2] + 18)

  return (
    <>
      <Title from={0} top={150} size={80}>
        Exponential <span style={{ color: C.green }}>backoff</span>
      </Title>
      <div style={{ position: 'absolute', top: 278, left: 70, width: 940, textAlign: 'center', clipPath: `inset(-20% ${100 - formula}% -20% 0)` }}>
        <span style={{ fontFamily: serif, fontStyle: 'italic', fontSize: 62, color: C.white }}>
          wait = 2<sup style={{ fontSize: 40, color: C.yellow }}>n</sup> seconds
        </span>
      </div>

      {/* before: a tight loop */}
      <div style={{ position: 'absolute', left: AX0, top: 400, width: 750, display: 'flex', justifyContent: 'space-between', fontFamily: sans, fontSize: 30, opacity: prog(frame, 2, 12) }}>
        <span style={{ color: C.red, fontWeight: 600 }}>before</span>
        <span style={{ color: C.grey }}>
          <span style={{ color: C.red, fontWeight: 600 }}>{Math.round(125 * ticks)}</span> tries in 15s
        </span>
      </div>
      <Svg>
        {Array.from({ length: 125 }).map((_, i) => {
          const x = AX0 + (i / 124) * 750
          if (i / 124 > ticks) return null
          return <line key={i} x1={x} y1={460} x2={x} y2={516} stroke={C.red} strokeWidth={2.5} opacity={0.85} />
        })}
        <line x1={AX0} y1={530} x2={AX0 + 750 * ticks} y2={530} stroke={C.dim} strokeWidth={2} />

        {/* after: the backoff timeline */}
        <Arrow x1={AX0 - 10} y1={AXIS_Y} x2={AX0 - 10 + 760 * axis} y2={AXIS_Y} p={1} color={C.grey} width={3} head={0} />
        {ARC_H.map((h, i) => {
          const a = tx(TRIES[i])
          const b = tx(TRIES[i + 1])
          const p = prog(frame, cues[i], cues[i] + durs[i], (x) => x)
          if (p <= 0) return null
          const mid = (a + b) / 2
          const d = `M ${a} ${AXIS_Y} Q ${mid} ${AXIS_Y - h * 2} ${b} ${AXIS_Y}`
          // ball rides the arc
          const u = p
          const bx = (1 - u) * (1 - u) * a + 2 * (1 - u) * u * mid + u * u * b
          const by = (1 - u) * (1 - u) * AXIS_Y + 2 * (1 - u) * u * (AXIS_Y - h * 2) + u * u * AXIS_Y
          return (
            <g key={i}>
              <path d={d} fill="none" stroke={C.green} strokeWidth={4} pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - p} filter="url(#kglow)" opacity={0.95} />
              {p < 1 && <circle cx={bx} cy={by} r={12} fill={C.white} filter="url(#kglow)" />}
            </g>
          )
        })}
        {TRIES.map((t, i) => {
          const at = i === 0 ? wait - 2 : cues[i - 1] + durs[i - 1]
          const p = interpolate(frame, [at, at + 4, at + 10], [0, 1.4, 1], clamp)
          if (p <= 0) return null
          const fail = i < TRIES.length - 1
          return (
            <g key={i} transform={`translate(${tx(t)} ${AXIS_Y}) scale(${p})`}>
              <circle r={15} fill="#000" stroke={i === 0 ? C.red : C.yellow} strokeWidth={4} />
              {fail && i === 0 && <path d="M -6 -6 L 6 6 M 6 -6 L -6 6" stroke={C.red} strokeWidth={4} strokeLinecap="round" />}
            </g>
          )
        })}
      </Svg>
      <div style={{ position: 'absolute', left: AX0, top: 596, width: 750, display: 'flex', justifyContent: 'space-between', fontFamily: sans, fontSize: 30, opacity: Math.min(1, afterLabel) }}>
        <span style={{ color: C.green, fontWeight: 600 }}>after</span>
        <span style={{ color: C.grey }}>
          <span style={{ color: C.green, fontWeight: 600 }}>{tries}</span> {tries === 1 ? 'try' : 'tries'} in 15s
        </span>
      </div>
      {ARC_H.map((h, i) => {
        const p = sprAt(frame, cues[i] + 2)
        const mid = (tx(TRIES[i]) + tx(TRIES[i + 1])) / 2
        return (
          <div
            key={i}
            style={{
              position: 'absolute', left: mid - 60, width: 120, top: AXIS_Y - h - 58, textAlign: 'center', fontFamily: sans, fontWeight: 700, fontSize: 34 + i * 4,
              color: C.yellow, opacity: Math.min(1, p), transform: `translateY(${(1 - p) * 14}px)`, textShadow: glowText(C.yellow, 20, 0.4),
            }}
          >
            {2 ** i}s
          </div>
        )
      })}
      {TRIES.map((t, i) => (
        <div key={i} style={{ position: 'absolute', left: tx(t) - 40, width: 80, top: AXIS_Y + 28, textAlign: 'center', fontFamily: mono, fontSize: 28, color: C.grey, opacity: axis }}>
          {t}{i === TRIES.length - 1 ? 's' : ''}
        </div>
      ))}

      <div style={{ position: 'absolute', left: 70, width: 820, top: 1170, textAlign: 'center', fontFamily: serif, fontStyle: 'italic', fontSize: 58, color: C.white, opacity: doubles, transform: `translateY(${(1 - doubles) * 16}px)` }}>
        Each wait <span style={{ color: C.yellow }}>doubles</span>.
      </div>
      {cues.map((c, i) => (
        <Sfx key={i} t={T} name="tick" at={c + durs[i] - 1} volume={1} />
      ))}
    </>
  )
}

// spring progress without a hook, for use inside loops
function sprAt(frame: number, at: number) {
  const x = Math.max(0, frame - at)
  return 1 - Math.exp(-x / 4) * Math.cos(x / 3.2)
}

// ---------------------------------------------------------------- 4. Jitter

const JX0 = 130
const JX1 = 890
const TMAX = 9
const jx = (t: number) => JX0 + (t / TMAX) * (JX1 - JX0)
const BASE = 1250
const PITCH = 30
const DOT = 24
const CAP = 6
const N = 12
const ROUNDS = [
  { t: 1, bins: [2, 3, 4] },
  { t: 3, bins: [6, 7, 8, 9, 10, 11, 12] },
  { t: 7, bins: [15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26] },
]
const clientX = (i: number) => 200 + i * 60
const CLIENT_Y = 520

// Precompute every dot's synchronized spot (one tall column) and its jittered spot (a bell-ish spread, never over capacity)
const DOTS = ROUNDS.flatMap((r, ri) => {
  const fill: Record<number, number> = {}
  return Array.from({ length: N }, (_, i) => {
    const u = (random(`a${ri}-${i}`) + random(`b${ri}-${i}`)) / 2
    let idx = Math.min(r.bins.length - 1, Math.floor(u * r.bins.length))
    for (let k = 0; (fill[r.bins[idx]] ?? 0) >= CAP - 1 && k < r.bins.length; k++) idx = (idx + 1) % r.bins.length
    const bin = r.bins[idx]
    const level = fill[bin] ?? 0
    fill[bin] = level + 1
    return {
      ri, i,
      sx: jx(r.t), sy: BASE - (i + 0.5) * PITCH,
      jx: jx(bin / 3), jy: BASE - (level + 0.5) * PITCH,
      delay: Math.floor(random(`d${ri}${i}`) * 16),
    }
  })
})

function Jitter() {
  const frame = useCurrentFrame()
  const waits = useCue('waits', 33)
  const together = useCue('together', 112)
  const they = useCue('they', 90)
  const rnd = useCue('random', 144)
  const recovers = useCue('recovers', 217)

  const drops = [waits + 6, they, together - 6]
  const jStart = rnd + 4
  const capY = BASE - CAP * PITCH
  const chart = prog(frame, 4, 24)
  const jittered = prog(frame, jStart, jStart + 40)
  const healthy = prog(frame, recovers - 8, recovers + 10)
  const spikesIn = prog(frame, drops[0] + 10, drops[0] + 30)
  const load = interpolate(frame, [0, drops[0] + 8, drops[0] + 30, jStart, jStart + 40, recovers], [0.2, 0.25, 0.99, 0.99, 0.5, 0.42], clamp)

  return (
    <>
      <Title from={0} top={150} size={74} out={rnd - 14}>Same wait, same spike</Title>
      <Title from={rnd - 4} top={150} size={74} color={C.green}>Jitter spreads them out</Title>

      {/* eased in, so it doesn't collide with the outgoing formula during the cross-dissolve */}
      <div style={{ position: 'absolute', inset: 0, opacity: prog(frame, 3, 15), transform: `translateY(${(1 - prog(frame, 3, 15)) * 14}px)` }}>
        <div style={{ position: 'absolute', left: 130, top: 270, width: 760 }}>
          <div style={{ position: 'absolute', left: 0, top: 6, fontFamily: mono, fontSize: 30, color: C.white }}>payments-api</div>
          <StatusChip x={760} y={0} ok={healthy > 0.5 || frame < drops[0] + 20 ? 1 : 0} />
        </div>
        <Meter x={130} y={330} w={760} value={load} capacity={0.6} label="load" />
      </div>

      <div style={{ position: 'absolute', left: 130, top: 452, fontFamily: sans, fontSize: 28, color: C.grey, opacity: chart }}>12 clients</div>
      {Array.from({ length: N }).map((_, i) => {
        const fired = DOTS.some((d) => d.i === i && frame >= drops[d.ri] + i * 1.2 && frame < drops[d.ri] + i * 1.2 + 6)
        return (
          <div
            key={i}
            style={{
              position: 'absolute', left: clientX(i) - 14, top: CLIENT_Y - 14, width: 28, height: 28, borderRadius: 8, boxSizing: 'border-box',
              border: `3px solid ${C.blue}`, background: fired ? C.blue : rgba(C.blue, 0.15), opacity: chart, boxShadow: fired ? `0 0 18px ${C.blue}` : 'none',
            }}
          />
        )
      })}

      <Svg>
        {/* axis + capacity */}
        <line x1={JX0} y1={BASE} x2={JX0 + (JX1 - JX0) * chart} y2={BASE} stroke={C.grey} strokeWidth={3} />
        <line
          x1={JX0} y1={capY} x2={JX0 + (JX1 - JX0) * chart} y2={capY} strokeWidth={3} strokeDasharray="14 10"
          stroke={interpolateColors(healthy, [0, 1], [C.red, C.green])} opacity={0.9} filter="url(#kglow)"
        />
        {DOTS.map((d, k) => {
          const start = drops[d.ri] + d.i * 1.2
          if (frame < start) return null
          const fall = prog(frame, start, start + 16, (x) => x * x)
          const cx0 = clientX(d.i)
          let x = cx0 + (d.sx - cx0) * fall
          let y = CLIENT_Y + (d.sy - CLIENT_Y) * fall
          const jp = prog(frame, jStart + d.delay, jStart + d.delay + 22, easeOut)
          if (jp > 0) {
            x = d.sx + (d.jx - d.sx) * jp
            y = d.sy + (d.jy - d.sy) * jp - Math.sin(jp * Math.PI) * 40
          }
          const over = y < capY - 2
          const color = jp >= 1 ? interpolateColors(healthy, [0, 1], [C.blue, C.green]) : over ? C.red : C.yellow
          return <rect key={k} x={x - DOT / 2} y={y - DOT / 2} width={DOT} height={DOT} rx={5} fill={color} opacity={0.95} />
        })}
      </Svg>
      <div style={{ position: 'absolute', left: 430, width: 260, top: capY - 46, textAlign: 'center', fontFamily: sans, fontSize: 28, fontWeight: 600, color: interpolateColors(healthy, [0, 1], [C.red, C.green]), opacity: chart }}>
        server capacity
      </div>
      {[0, 1, 3, 7].map((t) => (
        <div key={t} style={{ position: 'absolute', left: jx(t) - 40, width: 80, top: BASE + 16, textAlign: 'center', fontFamily: mono, fontSize: 28, color: C.grey, opacity: chart }}>
          {t}s
        </div>
      ))}
      <div style={{ position: 'absolute', left: 70, width: 820, top: 1316, textAlign: 'center', fontFamily: sans, fontSize: 30, color: C.grey, opacity: spikesIn * (1 - jittered) }}>
        everyone retries at the same instant
      </div>
      <div style={{ position: 'absolute', left: 70, width: 820, top: 1316, textAlign: 'center', fontFamily: sans, fontSize: 30, color: C.green, opacity: jittered }}>
        each wait × random(0.5 – 1.5)
      </div>

      <Sfx t={T} name="patter" at={jStart} volume={1} />
      <Sfx t={T} name="recover" at={recovers - 8} volume={0.5} />
    </>
  )
}

// ---------------------------------------------------------------- 5. The whole fix

function Rule({ y, at, color, icon, title, sub }: { y: number; at: number; color: string; icon: string; title: string; sub: string }) {
  const p = useSpr(at, 14)
  const frame = useCurrentFrame()
  if (frame < at) return null
  return (
    <div style={{ position: 'absolute', left: 90, top: y, width: 800, display: 'flex', alignItems: 'center', gap: 30, opacity: Math.min(1, p), transform: `translateX(${(1 - p) * -40}px)` }}>
      <div
        style={{
          width: 96, height: 96, borderRadius: 48, border: `4px solid ${color}`, color, display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: mono, fontSize: 36, fontWeight: 700, background: rgba(color, 0.12), boxShadow: `0 0 34px ${rgba(color, 0.45)}`, flex: 'none',
        }}
      >
        {icon}
      </div>
      <div style={{ fontFamily: sans }}>
        <div style={{ fontSize: 52, fontWeight: 600, color: C.white, lineHeight: 1.1 }}>{title}</div>
        <div style={{ fontSize: 32, color: C.grey, marginTop: 4 }}>{sub}</div>
      </div>
    </div>
  )
}

function Payoff() {
  const cap = useCue('cap', 17)
  const forever = useCue('forever', 76)
  const back = useCue('back', 105)
  const add = useCue('add', 126)
  const know = useCue('know', 153)

  return (
    <>
      <Title from={0} top={150} size={74}>Claude's new retry loop</Title>
      <CodeCard
        top={262}
        from={2}
        stagger={3}
        header="Update(src/payments/client.ts)"
        size={31}
        lines={[
          'for (let n = 0; n < 5; n++) {',
          '  try { return await pay(order) }',
          '  catch {',
          '    const wait = 2 ** n * 1000',
          '    const jitter = 0.5 + Math.random()',
          '    await sleep(wait * jitter)',
          '  }',
          '}',
          "throw new Error('payments down')",
        ]}
        hl={[
          { line: 0, text: 'n < 5', at: cap - 4, color: C.yellow },
          { line: 8, text: "throw new Error('payments down')", at: forever - 10, color: C.yellow, until: back - 6 },
          { line: 3, text: '2 ** n', at: back - 2, color: C.green },
          { line: 4, text: '0.5 + Math.random()', at: add, color: C.blue },
          { line: 8, text: "throw new Error('payments down')", at: know, color: C.yellow },
        ]}
      />
      <Rule y={835} at={back - 2} color={C.green} icon="×2" title="Back off" sub="wait 1s, 2s, 4s, 8s" />
      <Rule y={975} at={add - 2} color={C.blue} icon="±" title="Add jitter" sub="random waits, never in sync" />
      <Rule y={1115} at={know - 2} color={C.yellow} icon="5" title="Know when to quit" sub="cap the retries, then fail loudly" />

    </>
  )
}

export function BackoffReel() {
  return (
    <Stage>
      <ReelAudio t={T} voiceVolume={1.75} musicVolume={0.37} duck={0.38} />
      <Scene t={T} id="hook"><Hook /></Scene>
      <Scene t={T} id="herd"><Herd /></Scene>
      <Scene t={T} id="backoff"><Backoff /></Scene>
      <Scene t={T} id="jitter"><Jitter /></Scene>
      <Scene t={T} id="payoff"><Payoff /></Scene>
      <Captions t={T} />
    </Stage>
  )
}
