import { interpolate, useCurrentFrame, useVideoConfig } from 'remotion'
import { Captions, ReelAudio, Scene, Sfx, buildTimeline, useCue, type Manifest } from './audio'
import manifest from './audio/nplus1.json'
import { AppBox, CLAMP, CodeCard, DbCylinder, EASE_OUT, GlowDefs, Packet, Say, Svg, Tag, fmt, lerp, prog, rgba, springAt, useNthCue } from './kit-databases'
import { C, Stage, mono, sans, serif } from './primitives'
import script from './scripts/nplus1.json'

const T = buildTimeline(script, manifest as unknown as Manifest)
export const NPLUS1_REEL_FRAMES = T.total

// Deterministic author ids for the 50 posts (authors repeat, like a real feed)
const IDS = (() => {
  const out: number[] = []
  let s = 7
  for (let i = 0; i < 50; i++) {
    s = (s * 37 + 11) % 97
    out.push(i < 4 ? [7, 12, 3, 88][i] : (s % 90) + 2)
  }
  return out
})()
const AVATAR = [C.blue, C.purple, C.teal, C.white]

// ---------------------------------------------------------------------------------------------
// 1. Hook: 51 queries for 50 posts, then 2
function Hook() {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const start = useCue('making', 24) - 4
  const fiftyOne = useCue('fifty-one', 37)
  const down = useCue('down', 180)
  const qAt = (k: number) => start + (k - 1) * 0.95 // query k (1-based) fires here
  const fired = frame < start ? 0 : Math.min(51, Math.floor((frame - start) / 0.95) + 1)
  const swap = prog(frame, down - 4, down + 12, EASE_OUT)
  const counterIn = springAt(frame, start - 6, fps, 15)
  const counting = fired < 51
  const numColor = counting ? C.yellow : C.red
  const fixedGlow = prog(frame, down + 4, down + 30)

  const COLS = 5
  const TW = 124
  const TH = 50
  const GX = 20
  const GY = 14
  const X0 = 190
  const Y0 = 680

  return (
    <>
      <div style={{ position: 'absolute', top: 170, left: 0, right: 0, textAlign: 'center', fontFamily: mono, fontSize: 34, color: C.grey, opacity: prog(frame, 0, 12) }}>
        GET <span style={{ color: C.white }}>/api/feed</span>
      </div>
      <div style={{ position: 'absolute', top: 250, left: 0, right: 0, height: 260, overflow: 'hidden', opacity: counterIn }}>
        <div style={{ position: 'absolute', left: 0, right: 0, top: -swap * 260, textAlign: 'center', fontFamily: sans, fontWeight: 600, fontSize: 240, lineHeight: '260px', letterSpacing: -8, color: numColor, fontVariantNumeric: 'tabular-nums', textShadow: `0 0 90px ${rgba(numColor, 0.35)}`, opacity: 1 - swap }}>
          {fired}
        </div>
        <div style={{ position: 'absolute', left: 0, right: 0, top: (1 - swap) * 260, textAlign: 'center', fontFamily: sans, fontWeight: 600, fontSize: 240, lineHeight: '260px', letterSpacing: -8, color: C.green, textShadow: `0 0 90px ${rgba(C.green, 0.45)}`, opacity: swap }}>
          2
        </div>
      </div>
      <div style={{ position: 'absolute', top: 520, left: 0, right: 0, textAlign: 'center', fontFamily: sans, fontSize: 40, color: C.white, opacity: prog(frame, fiftyOne + 20, fiftyOne + 34) }}>
        database queries
      </div>
      <Tag color={C.grey} style={{ top: 622, left: X0, opacity: prog(frame, start, start + 10) }}>50 posts on the feed</Tag>
      <Svg>
        <GlowDefs />
        {Array.from({ length: 50 }).map((_, i) => {
          const col = i % COLS
          const row = Math.floor(i / COLS)
          const x = X0 + col * (TW + GX)
          const y = Y0 + row * (TH + GY)
          const appear = prog(frame, qAt(1) + i * 0.35, qAt(1) + i * 0.35 + 8, EASE_OUT)
          const q = qAt(i + 2)
          const filled = frame >= q + 1
          const flash = interpolate(frame, [q, q + 2, q + 12], [0, 1, 0], CLAMP)
          const color = AVATAR[IDS[i] % AVATAR.length]
          const border = lerp(0, 1, fixedGlow)
          return (
            <g key={i} opacity={appear} transform={`translate(${x} ${y + (1 - appear) * 14})`}>
              <rect width={TW} height={TH} rx={10} fill={rgba(C.white, 0.03)} stroke={border > 0.01 ? rgba(C.green, 0.25 + 0.5 * border) : C.dim} strokeWidth={2.5} />
              <circle cx={25} cy={TH / 2} r={13} fill={filled ? color : 'none'} stroke={flash > 0.01 ? C.yellow : filled ? color : C.grey} strokeWidth={flash > 0.01 ? 4 : 2.5} strokeDasharray={filled ? undefined : '4 4'} filter={flash > 0.3 ? 'url(#kglow)' : undefined} />
              <rect x={48} y={15} width={58} height={7} rx={3.5} fill={rgba(C.white, 0.35)} />
              <rect x={48} y={29} width={40} height={7} rx={3.5} fill={rgba(C.white, 0.18)} />
            </g>
          )
        })}
      </Svg>
      <div style={{ position: 'absolute', top: 1340, left: 70, right: 190, textAlign: 'center', fontFamily: sans, fontSize: 34, color: C.grey, opacity: prog(frame, fiftyOne + 30, fiftyOne + 44) * (1 - swap) }}>
        1 for the posts, <span style={{ color: C.yellow }}>+1 for each author</span>
      </div>
      <div style={{ position: 'absolute', top: 1340, left: 70, right: 190, textAlign: 'center', fontFamily: sans, fontSize: 34, color: C.green, opacity: swap }}>
        same feed, same authors
      </div>
      <Sfx t={T} name="flurry" at={start} volume={0.32} />
      <Sfx t={T} name="snap" at={down - 2} volume={0.55} />
    </>
  )
}

// ---------------------------------------------------------------------------------------------
// 2. The loop: one query for posts, then one per post
const APP_X = 230
const DB_X = 850
const WIRE_Y = 575

function useTrips() {
  const one = useCue('query', 50) - 2
  const forF = useCue('for', 131)
  const slots: [number, number][] = [[one, one + 40]]
  const slow = 20
  for (let k = 0; k < 3; k++) slots.push([forF + k * slow, forF + (k + 1) * slow])
  const t0 = forF + 3 * slow
  const span = 60
  for (let k = 0; k < 47; k++) slots.push([t0 + span * Math.pow(k / 47, 0.8), t0 + span * Math.pow((k + 1) / 47, 0.8)])
  return { slots, lapseFrom: t0, lapseTo: t0 + span }
}

function Wire({ frame, slots, lapseFrom, lapseTo }: { frame: number; slots: [number, number][]; lapseFrom: number; lapseTo: number }) {
  const ax = APP_X + 115
  const bx = DB_X - 105
  const up = WIRE_Y - 24
  const dn = WIRE_Y + 24
  const lapse = frame >= lapseFrom && frame < lapseTo
  return (
    <>
      <line x1={ax} y1={up} x2={bx} y2={up} stroke={C.dim} strokeWidth={3} strokeDasharray="10 10" />
      <line x1={ax} y1={dn} x2={bx} y2={dn} stroke={C.dim} strokeWidth={3} strokeDasharray="10 10" />
      <path d={`M ${bx - 18} ${up - 10} L ${bx - 2} ${up} L ${bx - 18} ${up + 10}`} stroke={C.grey} strokeWidth={3} fill="none" />
      <path d={`M ${ax + 18} ${dn - 10} L ${ax + 2} ${dn} L ${ax + 18} ${dn + 10}`} stroke={C.grey} strokeWidth={3} fill="none" />
      {!lapse &&
        slots.map(([a, b], i) => {
          if (frame < a || frame > b) return null
          const d = b - a
          const out = (frame - a) / (d * 0.42)
          const back = (frame - a - d * 0.58) / (d * 0.42)
          return (
            <g key={i}>
              <Packet ax={ax} ay={up} bx={bx} by={up} p={out} color={C.yellow} r={i === 0 ? 16 : 12} />
              <Packet ax={bx} ay={dn} bx={ax} by={dn} p={back} color={C.blue} r={i === 0 ? 20 : 12} />
            </g>
          )
        })}
      {lapse &&
        Array.from({ length: 7 }).map((_, i) => {
          const ph = ((frame - lapseFrom) * 0.11 + i / 7) % 1
          return (
            <g key={i}>
              <Packet ax={ax} ay={up} bx={bx} by={up} p={Math.max(0.02, ph)} color={C.yellow} r={10} trail={3} />
              <Packet ax={bx} ay={dn} bx={ax} by={dn} p={Math.max(0.02, (ph + 0.5) % 1)} color={C.blue} r={10} trail={3} />
            </g>
          )
        })}
    </>
  )
}

function Loop() {
  const frame = useCurrentFrame()
  const { slots, lapseFrom, lapseTo } = useTrips()
  const one = useCue('One', 41)
  const forF = useCue('for', 131)
  const who = useCue('who', 220)
  const thats = useCue("That's", 254)
  const oneW = useNthCue('one', 1, 276)
  const plus = useCue('plus', 291)
  const nW = useCue('N.', 299)
  const started = slots.filter(([a]) => frame >= a).length
  const inDb = slots.some(([a, b]) => frame >= a + (b - a) * 0.4 && frame <= a + (b - a) * 0.6) || (frame >= lapseFrom && frame < lapseTo)
  const hl0 = prog(frame, one - 4, one + 8) * (1 - prog(frame, forF - 12, forF))
  const hl12 = prog(frame, forF - 4, forF + 8)
  const culprit = prog(frame, thats - 6, thats + 6)
  const logOut = prog(frame, thats - 4, thats + 10)
  const counterColor = started >= 51 ? C.red : started > 1 ? C.yellow : C.blue

  const lines = slots.slice(0, started).map((_, i) => (i === 0 ? 'SELECT * FROM posts LIMIT 50' : `SELECT * FROM users WHERE id = ${IDS[i - 1]}`))
  const lastA = slots[Math.max(0, started - 1)]?.[0] ?? 0
  const slide = prog(frame, lastA, lastA + 5, EASE_OUT)
  const VISIBLE = 6
  const LH = 52

  return (
    <>
      <CodeCard
        y={150}
        size={30}
        title="feed.ts"
        rows={[
          { t: 'const posts = await getPosts()', hl: hl0, hlColor: C.blue },
          { t: 'for (const post of posts) {', hl: hl12 },
          { t: '  post.author = await getUser(post.userId)', hl: hl12, hlColor: culprit > 0.5 ? C.red : C.yellow },
          { t: '}', hl: hl12 },
        ]}
      />
      <Svg>
        <GlowDefs />
        <AppBox x={APP_X} y={WIRE_Y} lit={started > 0 && !inDb ? 0.6 : 0} />
        <DbCylinder x={DB_X} y={WIRE_Y} lit={inDb ? 1 : 0} />
        <Wire frame={frame} slots={slots} lapseFrom={lapseFrom} lapseTo={lapseTo} />
      </Svg>
      <div style={{ position: 'absolute', top: 690, left: 0, right: 0, display: 'flex', justifyContent: 'center', alignItems: 'baseline', gap: 22, fontFamily: sans, opacity: prog(frame, one - 6, one + 6) }}>
        <span style={{ fontSize: 150, fontWeight: 600, letterSpacing: -5, color: counterColor, fontVariantNumeric: 'tabular-nums', textShadow: `0 0 60px ${rgba(counterColor, 0.35)}` }}>{Math.max(1, started)}</span>
        <span style={{ fontSize: 42, color: C.grey }}>{started === 1 ? 'query' : 'queries'}</span>
      </div>
      {/* query log */}
      <div style={{ position: 'absolute', top: 910, left: 110, width: 760, height: VISIBLE * LH + 36, opacity: (1 - logOut) * prog(frame, one, one + 8), border: `2px solid ${C.dim}`, borderRadius: 22, background: '#05080C', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', left: 28, right: 28, top: 18, height: VISIBLE * LH, overflow: 'hidden' }}>
          {lines.map((l, i) => {
            const fromEnd = lines.length - 1 - i
            if (fromEnd > VISIBLE) return null
            const latest = fromEnd === 0
            const scrolling = lines.length > VISIBLE
            const y = scrolling ? (VISIBLE - 1 - fromEnd) * LH + (1 - slide) * LH : i * LH + (latest ? (1 - slide) * 18 : 0)
            const color = i === 0 ? C.blue : latest ? C.yellow : C.grey
            return (
              <div key={i} style={{ position: 'absolute', top: y, left: 0, right: 0, height: LH, lineHeight: `${LH}px`, fontFamily: mono, fontSize: 29, color, whiteSpace: 'nowrap', opacity: latest ? slide : 1 - fromEnd * 0.11 }}>
                <span style={{ color: C.dim, marginRight: 14 }}>{String(i + 1).padStart(2, '0')}</span>
                {l}
              </div>
            )
          })}
        </div>
      </div>
      {/* 1 + N */}
      <div style={{ position: 'absolute', top: 930, left: 70, right: 70, display: 'flex', justifyContent: 'center', alignItems: 'flex-start', gap: 40, fontFamily: serif, fontStyle: 'italic' }}>
        {[
          { s: '1', at: oneW, color: C.blue, sub: 'for the posts' },
          { s: '+', at: plus, color: C.white, sub: '' },
          { s: 'N', at: nW, color: C.red, sub: 'one per post' },
        ].map((g) => {
          const p = springAt(frame, g.at - 3, 30, 12)
          return (
            <div key={g.s} style={{ textAlign: 'center', opacity: Math.min(1, p * 1.4), transform: `translateY(${(1 - p) * 40}px) scale(${0.7 + 0.3 * p})` }}>
              <div style={{ fontSize: 210, lineHeight: 1, color: g.color, textShadow: `0 0 70px ${rgba(g.color, 0.4)}` }}>{g.s}</div>
              {g.sub && <div style={{ fontFamily: sans, fontStyle: 'normal', fontSize: 32, color: g.color, marginTop: 18 }}>{g.sub}</div>}
            </div>
          )
        })}
      </div>
      <Sfx t={T} name="boing" at={who + 2} volume={0.28} />
    </>
  )
}

// ---------------------------------------------------------------------------------------------
// 3. The cost: every query is a round trip, and they stack
const BARS = 51
const CH_X = 110
const CH_W = 770
const CH_Y = 360
const CH_H = 900
const MS_PX = CH_W / (BARS * 8)

function Cost() {
  const frame = useCurrentFrame()
  const round = useCue('round', 38)
  const db = useCue('database', 60)
  const eight = useCue('Eight', 83)
  const times = useCue('times', 129)
  const isW = useNthCue('is', 1, 170)
  const four = useCue('four', 182)
  const waiting = useCue('waiting', 237)

  // round-trip anatomy, then it shrinks into the corner
  const shrink = prog(frame, eight - 10, eight + 14)
  const cx = lerp(540, 690, shrink)
  const cy = lerp(780, 470, shrink)
  const sc = lerp(1, 0.58, shrink)
  const goOut = prog(frame, round - 8, round + 16)
  const goBack = prog(frame, db - 2, db + 20)
  const loopFrame = frame > eight + 14 ? ((frame - eight) % 34) / 34 : -1
  const arcDraw = prog(frame, round - 10, db + 6)

  const barAt = (i: number) => (i === 0 ? eight : times + (i - 1) * ((isW - 4 - times) / (BARS - 1)))
  const shown = Array.from({ length: BARS }).filter((_, i) => frame >= barAt(i)).length
  const total = shown * 8
  const red = prog(frame, waiting - 6, waiting + 8)
  const rowH = CH_H / BARS
  const axisIn = prog(frame, times - 6, times + 12)
  const totalIn = prog(frame, times, times + 10)

  return (
    <>
      <Say from={0} top={170} size={68}>Every query is a round trip</Say>
      <Svg>
        <GlowDefs />
        <g transform={`translate(${cx} ${cy}) scale(${sc}) translate(-540 -780)`}>
          <AppBox x={250} y={780} lit={goBack > 0.9 && shrink < 0.1 ? 0.7 : 0} />
          <DbCylinder x={830} y={780} lit={goOut > 0.9 && goBack < 0.1 ? 1 : 0} />
          <path d="M 365 760 Q 540 600 725 760" fill="none" stroke={C.yellow} strokeWidth={4} strokeDasharray="8 12" opacity={0.7} pathLength={1} style={{ strokeDasharray: `${arcDraw} 1` }} />
          <path d="M 725 800 Q 540 960 365 800" fill="none" stroke={C.blue} strokeWidth={4} opacity={0.7} pathLength={1} style={{ strokeDasharray: `${Math.max(0, arcDraw * 2 - 1)} 1` }} />
          {loopFrame < 0 ? (
            <>
              <Packet ax={365} ay={760} bx={725} by={760} p={goOut} arc={80} color={C.yellow} r={16} />
              <Packet ax={725} ay={800} bx={365} by={800} p={goBack} arc={-80} color={C.blue} r={16} />
            </>
          ) : (
            <>
              <Packet ax={365} ay={760} bx={725} by={760} p={Math.min(0.98, loopFrame * 2)} arc={80} color={C.yellow} r={16} />
              <Packet ax={725} ay={800} bx={365} by={800} p={Math.max(0.02, loopFrame * 2 - 1)} arc={-80} color={C.blue} r={16} />
            </>
          )}
          <text x={540} y={792} textAnchor="middle" fill={C.white} opacity={prog(frame, round, round + 12)} style={{ fontFamily: serif, fontStyle: 'italic', fontSize: 50 }}>
            {shrink > 0.5 ? '8 ms' : 'round trip'}
          </text>
        </g>
        {/* waterfall: each query waits for every one before it, so the area left of the staircase is pure waiting */}
        {shown > 1 && (
          <path
            d={`M ${CH_X} ${CH_Y} ` + Array.from({ length: shown }).map((_, i) => `L ${CH_X + i * 8 * MS_PX} ${CH_Y + i * rowH} L ${CH_X + i * 8 * MS_PX} ${CH_Y + (i + 1) * rowH - 5}`).join(' ') + ` L ${CH_X} ${CH_Y + shown * rowH - 5} Z`}
            fill={red > 0 ? rgba(C.red, 0.06 + 0.12 * red) : rgba(C.yellow, 0.06)}
            stroke="none"
          />
        )}
        {Array.from({ length: shown }).map((_, i) =>
          i % 5 === 0 && i > 0 ? <line key={`g${i}`} x1={CH_X} y1={CH_Y + i * rowH + rowH / 2 - 2} x2={CH_X + i * 8 * MS_PX - 6} y2={CH_Y + i * rowH + rowH / 2 - 2} stroke={rgba(red > 0.5 ? C.red : C.yellow, 0.22)} strokeWidth={2} strokeDasharray="4 8" /> : null,
        )}
        {Array.from({ length: BARS }).map((_, i) => {
          const at = barAt(i)
          const p = prog(frame, at, at + 5, EASE_OUT)
          if (p <= 0) return null
          const x = CH_X + i * 8 * MS_PX
          const y = CH_Y + i * rowH
          const fill = i === 0 ? C.yellow : red > 0.5 ? C.red : rgba(C.yellow, 0.85)
          return <rect key={i} x={x} y={y} width={Math.max(1, (8 * MS_PX - 2) * p)} height={rowH - 5} rx={3} fill={fill} filter={red > 0.5 || i === 0 ? 'url(#kglow)' : undefined} />
        })}
        {/* axis */}
        <g opacity={axisIn}>
          <line x1={CH_X} y1={CH_Y + CH_H + 20} x2={CH_X + CH_W * axisIn} y2={CH_Y + CH_H + 20} stroke={C.grey} strokeWidth={3} />
          {[0, 100, 200, 300, 400].map((ms) => (
            <g key={ms} transform={`translate(${CH_X + ms * MS_PX} ${CH_Y + CH_H + 20})`}>
              <line y1={0} y2={14} stroke={C.grey} strokeWidth={3} />
              <text y={50} textAnchor="middle" fill={C.grey} style={{ fontFamily: mono, fontSize: 28 }}>{ms}</text>
            </g>
          ))}
          <text x={CH_X} y={CH_Y + CH_H + 104} fill={C.grey} style={{ fontFamily: sans, fontSize: 28 }}>time spent waiting on the database (ms)</text>
        </g>
      </Svg>
      {/* first bar callout */}
      <div style={{ position: 'absolute', top: CH_Y - 12, left: CH_X + 30, fontFamily: sans, fontSize: 34, fontWeight: 600, color: C.yellow, opacity: prog(frame, eight, eight + 8) * (1 - prog(frame, times + 10, times + 20)) }}>
        ← one query, 8 ms
      </div>
      {/* running total */}
      <div style={{ position: 'absolute', top: 960, left: CH_X, width: 470, fontFamily: sans, opacity: totalIn }}>
        <div style={{ fontSize: 30, color: C.grey, marginBottom: 6 }}>{shown} queries × 8 ms</div>
        <div style={{ fontSize: 132, fontWeight: 600, letterSpacing: -4, lineHeight: 1, color: frame >= four - 4 ? C.red : C.yellow, fontVariantNumeric: 'tabular-nums', textShadow: `0 0 60px ${rgba(frame >= four - 4 ? C.red : C.yellow, 0.35)}` }}>
          {fmt(total)}<span style={{ fontSize: 60, marginLeft: 10 }}>ms</span>
        </div>
        <div style={{ marginTop: 10, fontFamily: serif, fontStyle: 'italic', fontSize: 52, color: C.red, opacity: red }}>of pure waiting</div>
      </div>
      <Sfx t={T} name="error" at={waiting - 2} volume={0.22} />
    </>
  )
}

// ---------------------------------------------------------------------------------------------
// 4. The fix: collect ids, one batched query
const CHIP_IDS = [7, 12, 3, 88, 41, 19, 56]

function Fix() {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const collect = useCue('collect', 45)
  const ids = useCue('IDs', 75)
  const then = useCue('then', 107)
  const one = useCue('one', 151)
  const query = useCue('query.', 173)
  const two = useCue('Two', 195)
  const same = useCue('Same', 227)

  const l1 = prog(frame, collect - 4, collect + 26)
  const l2 = prog(frame, then - 2, then + 26)
  const sqlIn = prog(frame, one - 10, one + 4)
  const goOut = prog(frame, one, query + 2)
  const goBack = prog(frame, query + 4, two - 2)
  const collapse = prog(frame, two - 4, two + 16)
  const sameIn = prog(frame, same - 4, same + 10)

  const chipRowW = 640
  return (
    <>
      <Say from={0} top={160} size={72}>
        Claude's fix: <span style={{ color: C.green }}>batch it</span>
      </Say>
      <CodeCard
        y={290}
        size={30}
        title="feed.ts"
        rows={[
          { t: 'const posts = await getPosts()', dim: true },
          { t: 'const ids = posts.map(p => p.userId)', mark: '+', reveal: l1, hl: l1 * (1 - l2), hlColor: C.green },
          { t: 'const authors = await getUsers(ids)', mark: '+', reveal: l2, hl: l2, hlColor: C.green },
        ]}
      />
      {/* ids gather into one list, which becomes the IN (...) query */}
      <div style={{ position: 'absolute', top: 548, left: 0, right: 0, height: 70 }}>
        {CHIP_IDS.map((id, i) => {
          const p = springAt(frame, ids - 14 + i * 3, fps, 14)
          const sx = [120, 860, 300, 700, 180, 560, 820][i]
          const sy = [-40, 30, 60, -50, 40, -30, 50][i]
          const tx = 540 - chipRowW / 2 + 40 + i * 82
          const x = lerp(sx, tx, p)
          const y = lerp(sy, 0, p)
          return (
            <div key={i} style={{ position: 'absolute', left: x - 36, top: y, width: 72, height: 62, borderRadius: 16, border: `3px solid ${C.blue}`, display: 'grid', placeItems: 'center', fontFamily: mono, fontSize: 30, color: C.white, background: '#000', opacity: Math.min(1, p * 2) * (1 - sqlIn) }}>
              {id}
            </div>
          )
        })}
        <div style={{ position: 'absolute', left: 540 + chipRowW / 2 - 40, top: 8, fontFamily: mono, fontSize: 34, color: C.grey, opacity: prog(frame, ids + 10, ids + 20) * (1 - sqlIn) }}>…</div>
        <div style={{ position: 'absolute', left: 0, right: 0, top: 10, textAlign: 'center', fontFamily: mono, fontSize: 30, opacity: sqlIn }}>
          <span style={{ color: C.blue }}>SELECT</span> * <span style={{ color: C.blue }}>FROM</span> users <span style={{ color: C.blue }}>WHERE</span> id <span style={{ color: C.green, fontWeight: 700 }}>IN</span> (7, 12, 3, …)
        </div>
      </div>
      <Svg>
        <GlowDefs />
        <AppBox x={250} y={735} lit={goBack >= 1 && collapse < 1 ? 0.8 : 0} />
        <DbCylinder x={790} y={735} lit={goOut >= 1 && goBack <= 0 ? 1 : 0} />
        <line x1={365} y1={711} x2={685} y2={711} stroke={C.dim} strokeWidth={3} strokeDasharray="10 10" />
        <line x1={365} y1={759} x2={685} y2={759} stroke={C.dim} strokeWidth={3} strokeDasharray="10 10" />
        <Packet ax={365} ay={711} bx={685} by={711} p={goOut} color={C.yellow} r={20} />
        <Packet ax={685} ay={759} bx={365} by={759} p={goBack} color={C.green} r={26} />
        <text x={525} y={685} textAnchor="middle" fill={C.yellow} opacity={goOut > 0 && goOut < 1 ? 1 : 0} style={{ fontFamily: sans, fontSize: 30, fontWeight: 600 }}>1 query</text>
        <text x={525} y={817} textAnchor="middle" fill={C.green} opacity={goBack > 0 && goBack < 1 ? 1 : 0} style={{ fontFamily: sans, fontSize: 30, fontWeight: 600 }}>50 authors</text>
        {/* timeline strip: 51 slivers collapse into 2 */}
        <text x={110} y={965} fill={C.grey} style={{ fontFamily: sans, fontSize: 28, fontWeight: 600, letterSpacing: 3 }}>TIME SPENT ON QUERIES</text>
        {Array.from({ length: BARS }).map((_, i) => {
          const from = 110 + i * 8 * MS_PX
          const to = 110 + Math.min(i, 1) * 8 * MS_PX
          const x = lerp(from, to, collapse)
          const color = collapse > 0.5 ? (i === 0 ? C.blue : C.green) : C.red
          return <rect key={i} x={x} y={990} width={8 * MS_PX - 2.5} height={44} rx={3} fill={color} opacity={i > 1 ? 1 - collapse * 0.999 : 1} />
        })}
        <text x={110 + 2 * 8 * MS_PX + 18 + (1 - collapse) * (BARS - 2) * 8 * MS_PX} y={1025} fill={collapse > 0.5 ? C.green : C.red} style={{ fontFamily: mono, fontSize: 30, fontWeight: 600 }} opacity={collapse > 0.02 && collapse < 0.98 ? 0 : 1}>
          {collapse > 0.5 ? '16 ms' : ''}
        </text>
      </Svg>
      <div style={{ position: 'absolute', top: 1080, left: 90, width: 400, textAlign: 'center', fontFamily: sans }}>
        <div style={{ fontSize: 140, fontWeight: 600, lineHeight: 1, letterSpacing: -4, color: collapse > 0.5 ? C.green : C.red, fontVariantNumeric: 'tabular-nums', textShadow: `0 0 60px ${rgba(collapse > 0.5 ? C.green : C.red, 0.35)}` }}>
          {collapse > 0.5 ? 2 : 51}
        </div>
        <div style={{ fontSize: 34, color: C.grey, marginTop: 12 }}>round trips</div>
      </div>
      <div style={{ position: 'absolute', top: 1080, left: 490, width: 400, textAlign: 'center', fontFamily: sans }}>
        <div style={{ fontSize: 140, fontWeight: 600, lineHeight: 1, letterSpacing: -4, color: collapse > 0.5 ? C.green : C.red, fontVariantNumeric: 'tabular-nums', textShadow: `0 0 60px ${rgba(collapse > 0.5 ? C.green : C.red, 0.35)}` }}>
          {collapse > 0.5 ? 16 : 408}
          <span style={{ fontSize: 56, marginLeft: 8 }}>ms</span>
        </div>
        <div style={{ fontSize: 34, color: C.grey, marginTop: 12 }}>waiting</div>
      </div>
      <div style={{ position: 'absolute', top: 1340, left: 70, right: 190, textAlign: 'center', fontFamily: sans, fontSize: 36, color: C.green, opacity: sameIn, transform: `translateY(${(1 - sameIn) * 14}px)` }}>
        ✓ same 50 posts, same authors
      </div>
      <Sfx t={T} name="success" at={two - 2} volume={0.4} />
    </>
  )
}

// ---------------------------------------------------------------------------------------------
// 5. Takeaway: a query inside a loop is your N + 1
function Takeaway() {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const whenever = useCue('whenever', 13)
  const spot = useCue('spot', 28)
  const nW = useCue('N', 101)
  const batch = useCue('Batch', 131)
  const unroll = prog(frame, batch - 4, batch + 18)
  const spin = (frame * 4) % 360
  const hot = prog(frame, spot, spot + 10)
  const nIn = springAt(frame, nW - 2, fps, 12)
  const bIn = springAt(frame, batch, fps, 11)
  const R = 290
  const CX = 540
  const CY = 700
  const circ = 2 * Math.PI * R
  return (
    <>
      <Say from={whenever - 6} top={180} size={76}>A query inside a loop?</Say>
      <Svg>
        <GlowDefs />
        {/* the loop: a spinning circular arrow that unrolls into one straight arrow */}
        <g opacity={1 - unroll} transform={`rotate(${spin} ${CX} ${CY})`}>
          <circle cx={CX} cy={CY} r={R} fill="none" stroke={rgba(C.red, 0.25 + 0.55 * hot)} strokeWidth={8} strokeDasharray={`${circ * 0.82} ${circ}`} filter={hot > 0.5 ? 'url(#kglow)' : undefined} />
          <path d={`M ${CX + R} ${CY - 30} l -22 34 l 44 0 z`} fill={rgba(C.red, 0.4 + 0.6 * hot)} transform={`rotate(${-0.18 * 360 + 0} ${CX} ${CY})`} />
        </g>
        <g opacity={unroll}>
          <rect x={CX - R * unroll} y={CY + 166} width={Math.max(1, 2 * R * unroll - 20)} height={8} rx={4} fill={C.green} filter="url(#kglow)" />
          <path d={`M ${CX + R * unroll + 6} ${CY + 170} l -34 -22 l 0 44 z`} fill={C.green} />
          <text x={CX} y={CY + 240} textAnchor="middle" fill={C.green} style={{ fontFamily: sans, fontSize: 34, fontWeight: 600 }}>one trip</text>
        </g>
      </Svg>
      <div style={{ position: 'absolute', top: CY - 60, left: 0, right: 0, display: 'flex', justifyContent: 'center' }}>
        <div style={{ position: 'relative', fontFamily: mono, fontSize: 40, padding: '22px 34px', borderRadius: 20, border: `3px solid ${unroll > 0.5 ? C.green : rgba(C.red, 0.4 + 0.6 * hot)}`, background: '#000', boxShadow: `0 0 ${50 * (unroll > 0.5 ? 1 : hot)}px ${rgba(unroll > 0.5 ? C.green : C.red, 0.4)}` }}>
          <div style={{ display: 'grid', justifyItems: 'center' }}>
            <span style={{ gridArea: '1 / 1', opacity: 1 - unroll, whiteSpace: 'nowrap' }}>
              <span style={{ color: C.blue }}>await</span> <span style={{ color: C.white }}>getUser(id)</span>
            </span>
            <span style={{ gridArea: '1 / 1', opacity: unroll, whiteSpace: 'nowrap' }}>
              <span style={{ color: C.blue }}>await</span> <span style={{ color: C.white }}>getUsers(ids)</span>
            </span>
          </div>
        </div>
      </div>
      <div style={{ position: 'absolute', top: 1110, left: 70, right: 70, textAlign: 'center', fontFamily: serif, fontStyle: 'italic', fontSize: 120, lineHeight: 1, color: C.red, opacity: Math.min(1, nIn * 1.3) * (1 - unroll), transform: `scale(${0.8 + 0.2 * nIn})`, textShadow: `0 0 60px ${rgba(C.red, 0.4)}` }}>
        N + 1
      </div>
      <div style={{ position: 'absolute', top: 1110, left: 70, right: 70, textAlign: 'center', fontFamily: serif, fontStyle: 'italic', fontSize: 120, lineHeight: 1, color: C.green, opacity: Math.min(1, bIn * 1.3), transform: `scale(${0.8 + 0.2 * bIn})`, textShadow: `0 0 70px ${rgba(C.green, 0.45)}` }}>
        Batch it.
      </div>
      <Sfx t={T} name="snap" at={batch - 2} volume={0.5} />
    </>
  )
}

export function NPlusOneReel() {
  return (
    <Stage>
      <ReelAudio t={T} musicVolume={0.16} duck={0.35} />
      <Scene t={T} id="hook"><Hook /></Scene>
      <Scene t={T} id="loop"><Loop /></Scene>
      <Scene t={T} id="cost"><Cost /></Scene>
      <Scene t={T} id="fix"><Fix /></Scene>
      <Scene t={T} id="takeaway"><Takeaway /></Scene>
      <Captions t={T} />
    </Stage>
  )
}

