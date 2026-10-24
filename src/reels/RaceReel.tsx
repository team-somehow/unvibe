import type { ReactNode } from 'react'
import { interpolate, useCurrentFrame } from 'remotion'
import { Captions, ReelAudio, Scene, Sfx, buildTimeline, useCue, useScene, type Manifest } from './audio'
import manifest from './audio/race.json'
import { Arrow, CodeCard, Padlock, Pill, Svg, Token, clamp, glowText, prog, rgba, useSpr } from './kit-reliability'
import { C, Stage, Title, mono, sans, serif } from './primitives'
import script from './scripts/race.json'

const T = buildTimeline(script, manifest as unknown as Manifest)
export const RACE_REEL_FRAMES = T.total

// Request A is always blue, request B always purple
const A = C.blue
const B = C.purple

function Badge({ x, y, color, label, at, r = 26 }: { x: number; y: number; color: string; label: string; at: number; r?: number }) {
  const p = useSpr(at, 14)
  return (
    <div
      style={{
        position: 'absolute', left: x - r, top: y - r, width: r * 2, height: r * 2, borderRadius: r, background: color, color: '#000',
        display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: sans, fontWeight: 700, fontSize: r * 1.1,
        opacity: Math.min(1, p), transform: `scale(${p})`, boxShadow: `0 0 26px ${rgba(color, 0.6)}`,
      }}
    >
      {label}
    </div>
  )
}

// ---------------------------------------------------------------- 1. Hook

const BTN = { x: 270, y: 838 }

function Hook() {
  const frame = useCurrentFrame()
  const tap = useCue('double', 12)
  const wallet = useCue('hundred-dollar', 58)
  const spent = useCue('spent', 88)
  const sixty = useCue('sixty', 110)
  const claude = useCue('claude', 131)

  const phone = useSpr(2, 16)
  const card = useSpr(8, 16)
  const press = (t: number) => interpolate(frame, [t, t + 3, t + 9], [1, 0.9, 1], clamp)
  const btnScale = Math.min(press(tap), press(tap + 7))
  const landA = tap + 30
  const landB = tap + 38
  const walletPulse = interpolate(frame, [wallet - 4, wallet + 6, wallet + 30], [0, 1, 0.35], clamp)
  const total = prog(frame, spent - 4, spent + 10)
  // has vs spent: the wallet's $100 is on screen from the start, each charge fills the spent bar
  const barsIn = useSpr(12, 16)
  const has = prog(frame, 14, 36)
  const spentAmt = 80 * prog(frame, landA, landA + 10) + 80 * prog(frame, spent - 2, sixty + 16)
  const over = prog(frame, sixty + 4, sixty + 22)
  const claudeP = useSpr(claude - 2, 15)
  const spentRed = prog(frame, spent - 2, spent + 8)

  const ripple = (t: number) => {
    const p = prog(frame, t, t + 18, (x) => 1 - (1 - x) ** 2)
    if (frame < t || frame > t + 20) return null
    return <circle cx={BTN.x} cy={BTN.y} r={40 + 110 * p} fill="none" stroke={C.white} strokeWidth={4} opacity={0.85 * (1 - p)} />
  }

  return (
    <>
      <Title from={0} top={150} size={80}>Double-tap, double spend</Title>

      {/* phone */}
      <div
        style={{
          position: 'absolute', left: 110, top: 330, width: 320, height: 600, borderRadius: 54, border: `4px solid ${C.dim}`,
          background: '#06090D', opacity: Math.min(1, phone), transform: `translateY(${(1 - phone) * 40}px)`, boxSizing: 'border-box', padding: '64px 26px 0',
          fontFamily: sans,
        }}
      >
        <div style={{ position: 'absolute', top: 18, left: 120, width: 72, height: 14, borderRadius: 7, background: C.dim }} />
        <div style={{ fontSize: 34, fontWeight: 600, color: C.white }}>Checkout</div>
        <div style={{ marginTop: 28, border: `2px solid ${C.dim}`, borderRadius: 20, padding: '18px 20px', display: 'flex', justifyContent: 'space-between', fontSize: 30 }}>
          <span style={{ color: C.white }}>Sneakers</span>
          <span style={{ color: C.yellow, fontWeight: 600 }}>$80</span>
        </div>
        <div style={{ marginTop: 22, display: 'flex', justifyContent: 'space-between', fontSize: 28, color: C.grey, padding: '0 6px' }}>
          <span>Total</span>
          <span style={{ color: C.white }}>$80</span>
        </div>
      </div>
      <div
        style={{
          position: 'absolute', left: BTN.x - 120, top: BTN.y - 46, width: 240, height: 92, borderRadius: 24, background: C.blue, color: '#000',
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: sans, fontSize: 38, fontWeight: 700,
          opacity: Math.min(1, phone), transform: `scale(${btnScale})`, boxShadow: `0 0 ${frame > tap - 2 && frame < tap + 20 ? 50 : 18}px ${rgba(C.blue, 0.55)}`,
        }}
      >
        Pay $80
      </div>
      <Svg>
        {ripple(tap)}
        {ripple(tap + 7)}
      </Svg>

      {/* wallet */}
      <div
        style={{
          position: 'absolute', left: 500, top: 340, width: 390, height: 210, boxSizing: 'border-box', borderRadius: 28,
          border: `3px solid ${rgba(C.yellow, 0.5 + 0.5 * walletPulse)}`, background: rgba(C.yellow, 0.04 + 0.08 * walletPulse),
          boxShadow: `0 0 ${60 * walletPulse}px ${rgba(C.yellow, 0.4 * walletPulse)}`, padding: '26px 32px', fontFamily: sans,
          opacity: Math.min(1, card), transform: `translateY(${(1 - card) * 30}px)`,
        }}
      >
        <div style={{ fontSize: 28, color: C.grey, letterSpacing: 3 }}>WALLET</div>
        <div style={{ fontSize: 104, fontWeight: 600, color: C.yellow, lineHeight: 1.05, letterSpacing: -3, fontVariantNumeric: 'tabular-nums' }}>$100</div>
      </div>

      {/* two charges land */}
      {[{ at: landA, y: 610, c: A, l: 'A' }, { at: landB, y: 700, c: B, l: 'B' }].map((r) => (
        <ChargeRow key={r.l} at={r.at} y={r.y} color={r.c} label={r.l} red={spentRed} />
      ))}
      <Token x1={BTN.x} y1={BTN.y - 40} x2={560} y2={610} from={tap + 4} dur={26} arc={120} color={A} linger={0} font={36}>A</Token>
      <Token x1={BTN.x} y1={BTN.y - 40} x2={560} y2={700} from={tap + 11} dur={27} arc={110} color={B} linger={0} font={36}>B</Token>

      <div style={{ position: 'absolute', left: 500, top: 760, width: 390, opacity: total, fontFamily: sans }}>
        <div style={{ height: 3, background: rgba(C.red, 0.6), marginBottom: 14 }} />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <span style={{ fontSize: 30, color: C.grey }}>spent</span>
          <span style={{ fontSize: 60, fontWeight: 700, color: C.red, textShadow: glowText(C.red, 30, 0.6 * total), fontVariantNumeric: 'tabular-nums' }}>
            ${Math.round(80 + 80 * prog(frame, spent, sixty))}
          </span>
        </div>
      </div>

      {/* has vs spent */}
      <div style={{ position: 'absolute', left: 110, top: 990, width: 780, fontFamily: sans, opacity: Math.min(1, barsIn), transform: `translateY(${(1 - barsIn) * 24}px)` }}>
        <div style={{ fontSize: 30, color: C.grey }}>has</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 8 }}>
          <div style={{ height: 56, width: Math.max(1, 480 * has), borderRadius: 14, background: rgba(C.yellow, 0.85) }} />
          <span style={{ fontSize: 38, fontWeight: 600, color: C.yellow, opacity: has }}>$100</span>
        </div>
        <div style={{ fontSize: 30, color: C.grey, marginTop: 26 }}>spent</div>
        <div style={{ position: 'relative', height: 56, marginTop: 8 }}>
          <div style={{ position: 'absolute', left: 0, top: 0, height: 56, width: 768, borderRadius: 14, border: `2px dashed ${C.dim}`, boxSizing: 'border-box' }} />
          <div style={{ position: 'absolute', left: 0, top: 0, height: 56, width: 4.8 * Math.min(100, spentAmt), borderRadius: spentAmt > 100 ? '14px 0 0 14px' : 14, background: rgba(C.red, 0.75) }} />
          <div
            style={{
              position: 'absolute', left: 480, top: 0, height: 56, width: 4.8 * Math.max(0, spentAmt - 100), borderRadius: '0 14px 14px 0', background: C.red,
              boxShadow: `0 0 ${50 * over}px ${rgba(C.red, 0.7)}`,
            }}
          />
          <span style={{ position: 'absolute', left: Math.max(16, 4.8 * spentAmt - 120), top: 4, width: 104, textAlign: 'right', fontSize: 38, fontWeight: 700, color: '#000', opacity: Math.min(1, spentAmt / 40), fontVariantNumeric: 'tabular-nums' }}>${Math.round(spentAmt)}</span>
        </div>
      </div>
      <Svg>
        <line x1={590} y1={1010} x2={590} y2={1236} stroke={C.white} strokeWidth={3} strokeDasharray="10 10" opacity={0.6 * has} />
      </Svg>
      <div style={{ position: 'absolute', left: 110, width: 768, top: 1238, textAlign: 'right', fontFamily: sans, fontSize: 32, fontWeight: 600, color: C.red, opacity: over }}>
        +$60 that never existed
      </div>

      <div style={{ position: 'absolute', top: 1318, left: 70, width: 820, display: 'flex', justifyContent: 'center', opacity: Math.min(1, claudeP), transform: `translateY(${(1 - claudeP) * 20}px)` }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 14, padding: '14px 28px', borderRadius: 999, border: `2px solid ${C.dim}`, background: '#0A0E13', fontFamily: sans, fontSize: 32, color: C.white }}>
          <span style={{ color: C.green }}>⏺</span> Claude caught this in <span style={{ fontFamily: mono, fontSize: 30, color: C.blue }}>wallet-service</span>
        </div>
      </div>

      <Sfx t={T} name="tap" at={tap - 1} volume={0.9} />
      <Sfx t={T} name="cash" at={landA - 2} volume={0.45} />
    </>
  )
}

function ChargeRow({ at, y, color, label, red }: { at: number; y: number; color: string; label: string; red: number }) {
  const p = useSpr(at, 14)
  const frame = useCurrentFrame()
  if (frame < at) return null
  return (
    <div
      style={{
        position: 'absolute', left: 500, top: y - 38, width: 390, height: 76, boxSizing: 'border-box', borderRadius: 18,
        border: `2px solid ${rgba(red > 0.5 ? C.red : color, 0.7)}`, background: rgba(C.red, 0.06 + 0.06 * red),
        display: 'flex', alignItems: 'center', gap: 16, padding: '0 22px', fontFamily: sans, opacity: Math.min(1, p), transform: `translateX(${(1 - p) * -30}px)`,
      }}
    >
      <span style={{ width: 40, height: 40, borderRadius: 20, background: color, color: '#000', fontWeight: 700, fontSize: 28, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>{label}</span>
      <span style={{ fontSize: 30, color: C.grey, flex: 1 }}>charge</span>
      <span style={{ fontSize: 40, fontWeight: 700, color: C.red }}>−$80</span>
    </div>
  )
}

// ---------------------------------------------------------------- 2. The race

const LA = 580 // lane A centre y
const LB = 1140 // lane B centre y
const ROW = { y1: 820, y2: 900 }
const AX = { read: 205, calc: 460, write: 715 }
const BX = { read: 245, calc: 500, write: 755 }

function RowBox({ value, flash = 0, tag, tagColor, at = 4, border = C.blue, glow = 0, x1 = 90, x2 = 880, valueX = 480, valueColor = C.yellow, children }: {
  value: string; flash?: number; tag?: string; tagColor?: string; at?: number; border?: string; glow?: number; x1?: number; x2?: number; valueX?: number; valueColor?: string; children?: ReactNode
}) {
  const p = useSpr(at, 16)
  return (
    <div
      style={{
        position: 'absolute', left: x1, top: ROW.y1, width: x2 - x1, height: ROW.y2 - ROW.y1, boxSizing: 'border-box', borderRadius: 20,
        border: `3px solid ${border}`, background: rgba(border, 0.07 + 0.1 * glow + 0.2 * flash), boxShadow: `0 0 ${50 * glow + 60 * flash}px ${rgba(flash > 0.05 ? C.red : border, 0.5 * Math.max(glow, flash))}`,
        opacity: Math.min(1, p), transform: `scaleX(${0.9 + 0.1 * p})`, fontFamily: sans,
      }}
    >
      <span style={{ position: 'absolute', left: 22, top: 20, fontFamily: mono, fontSize: 28, color: C.grey }}>balance</span>
      <span style={{ position: 'absolute', left: valueX - x1, top: 6, fontSize: 52, fontWeight: 700, color: valueColor, fontVariantNumeric: 'tabular-nums', transform: 'translateX(-50%)', textShadow: glowText(valueColor, 24, 0.4) }}>
        {value}
        {tag && <span style={{ fontSize: 28, fontWeight: 600, color: tagColor, marginLeft: 10, verticalAlign: 'middle' }}>{tag}</span>}
      </span>
      {children}
    </div>
  )
}

function Race() {
  const frame = useCurrentFrame()
  const read = useCue('read', 78)
  const sub = useCue('subtract', 117)
  const write = useCue('write', 163)
  const lanes = prog(frame, 6, 28)
  const time = prog(frame, 14, 50)

  const rA = prog(frame, read - 8, read + 6)
  const rB = prog(frame, read - 4, read + 10)
  const wA = prog(frame, write + 2, write + 14)
  const wB = prog(frame, write + 8, write + 20)
  const landA = write + 18
  const landB = write + 24
  const value = frame < landA ? '$100' : '$20'
  const tag = frame < landA ? undefined : frame < landB ? 'by A' : 'by B'
  const tagColor = frame < landB ? A : B
  const flash = interpolate(frame, [landB, landB + 4, landB + 20], [0, 1, 0], clamp)
  // a "now" line sweeping through time, so you can see A and B interleave
  const nowX = interpolate(frame, [20, read - 8, read + 6, sub - 8, sub + 6, write - 8, write + 8], [110, 110, 225, 225, 480, 480, 735], clamp)
  const nowO = prog(frame, 16, 30) * 0.5

  return (
    <>
      <Title from={9} top={150} size={78}>Two requests, one row</Title>
      <CodeCard
        top={270}
        left={130}
        width={700}
        from={2}
        size={30}
        lines={['const bal = await getBalance(id)', 'await setBalance(id, bal - 80)']}
        hl={[
          { line: 0, at: read - 6, color: C.yellow, until: sub - 4 },
          { line: 1, at: sub - 2, color: C.yellow },
        ]}
      />
      <Svg>
        <line x1={nowX} y1={520} x2={nowX} y2={1290} stroke={C.white} strokeWidth={2} strokeDasharray="4 10" opacity={nowO} />
        <line x1={90} y1={LA} x2={90 + 790 * lanes} y2={LA} stroke={rgba(A, 0.35)} strokeWidth={3} />
        <line x1={90} y1={LB} x2={90 + 790 * lanes} y2={LB} stroke={rgba(B, 0.35)} strokeWidth={3} />
        <Arrow x1={90} y1={1300} x2={880} y2={1300} p={time} color={C.dim} width={3} head={14} />
        <Arrow x1={AX.read} y1={ROW.y1 - 2} x2={AX.read} y2={LA + 44} p={rA} color={C.yellow} glow />
        <Arrow x1={BX.read} y1={ROW.y2 + 2} x2={BX.read} y2={LB - 44} p={rB} color={C.yellow} glow />
        <Arrow x1={AX.write} y1={LA + 44} x2={AX.write} y2={ROW.y1 - 2} p={wA} color={A} glow />
        <Arrow x1={BX.write} y1={LB - 44} x2={BX.write} y2={ROW.y2 + 2} p={wB} color={B} glow />
      </Svg>
      <div style={{ position: 'absolute', left: 820, top: 1312, fontFamily: sans, fontSize: 28, color: C.grey, opacity: time }}>time</div>

      <LaneLabel x={90} y={470} color={A} at={8}>Request A</LaneLabel>
      <LaneLabel x={90} y={1206} color={B} at={14}>Request B</LaneLabel>

      <RowBox value={value} tag={tag} tagColor={tagColor} flash={flash} />

      <Token x1={AX.read} y1={ROW.y1} x2={AX.read} y2={LA + 40} from={read - 6} dur={14} color={C.yellow} linger={0}>$100</Token>
      <Token x1={BX.read} y1={ROW.y2} x2={BX.read} y2={LB - 40} from={read - 2} dur={14} color={C.yellow} linger={0}>$100</Token>
      <Pill x={AX.read} y={LA} w={230} color={A} at={read + 6}><span style={{ color: C.grey }}>read</span><span style={{ color: C.yellow }}>$100</span></Pill>
      <Pill x={BX.read} y={LB} w={230} color={B} at={read + 10}><span style={{ color: C.grey }}>read</span><span style={{ color: C.yellow }}>$100</span></Pill>

      <Pill x={AX.calc} y={LA} w={236} color={A} at={sub} family={mono} font={32}>100−80=20</Pill>
      <Pill x={BX.calc} y={LB} w={236} color={B} at={sub + 5} family={mono} font={32}>100−80=20</Pill>

      <Pill x={AX.write} y={LA} w={230} color={A} at={write - 2}><span style={{ color: C.grey }}>write</span><span style={{ color: C.white }}>$20</span></Pill>
      <Pill x={BX.write} y={LB} w={230} color={B} at={write + 4}><span style={{ color: C.grey }}>write</span><span style={{ color: C.white }}>$20</span></Pill>
      <Token x1={AX.write} y1={LA + 40} x2={AX.write} y2={ROW.y1} from={write + 4} dur={14} color={A} linger={0}>$20</Token>
      <Token x1={BX.write} y1={LB - 40} x2={BX.write} y2={ROW.y2} from={write + 10} dur={14} color={B} linger={0}>$20</Token>

    </>
  )
}

function LaneLabel({ x, y, color, at, children }: { x: number; y: number; color: string; at: number; children: ReactNode }) {
  const p = useSpr(at, 15)
  return (
    <div style={{ position: 'absolute', left: x, top: y, display: 'flex', alignItems: 'center', gap: 14, fontFamily: sans, fontSize: 36, fontWeight: 600, color, opacity: Math.min(1, p), transform: `translateX(${(1 - p) * -24}px)` }}>
      <span style={{ width: 18, height: 18, borderRadius: 9, background: color, boxShadow: `0 0 16px ${color}` }} />
      {children}
    </div>
  )
}

// ---------------------------------------------------------------- 3. Lost update

function Lost() {
  const frame = useCurrentFrame()
  const over = useCue('overwrites', 33)
  const two = useCue('two', 83)
  const bal = useCue('balance', 114)
  const once = useCue('once', 145)
  const lost = useCue('lost', 172)

  const slot = useSpr(0, 18)
  const rise = prog(frame, over - 20, over, (x) => x * x * x)
  const hit = frame >= over
  const eject = prog(frame, over, over + 26, (x) => 1 - (1 - x) ** 3)
  const shake = hit ? Math.sin((frame - over) * 2.2) * 10 * Math.max(0, 1 - (frame - over) / 14) : 0
  const flash = interpolate(frame, [over, over + 3, over + 18], [0, 1, 0], clamp)
  const lostP = useSpr(lost - 2, 12)
  const neq = useSpr(once + 6, 12)

  return (
    <>
      <Title from={9} top={150} size={78}>The second write wins</Title>
      <div style={{ position: 'absolute', top: 300, left: 0, right: 0, textAlign: 'center', fontFamily: mono, fontSize: 30, color: C.grey, opacity: slot }}>wallet.balance</div>
      <div
        style={{
          position: 'absolute', left: 340, top: 352, width: 400, height: 176, boxSizing: 'border-box', borderRadius: 30, border: `4px solid ${C.blue}`,
          background: rgba(hit ? C.red : C.blue, 0.06 + 0.25 * flash), boxShadow: `0 0 ${30 + 70 * flash}px ${rgba(flash > 0.05 ? C.red : C.blue, 0.35 + 0.3 * flash)}`,
          opacity: Math.min(1, slot), transform: `translateX(${shake}px)`,
        }}
      />
      {/* A's value: sits in the slot, then gets knocked out */}
      <ValueChip
        x={540 + 250 * eject} y={440 + 210 * eject} rot={16 * eject} color={hit ? C.red : A} label="A" opacity={1 - 0.45 * eject} strike={eject}
      />
      {/* B's value rises into the slot */}
      <ValueChip x={540 + shake} y={hit ? 440 : 760 - 320 * rise} rot={0} color={B} label="B" opacity={frame < over - 22 ? 0 : 1} />
      <div style={{ position: 'absolute', left: 640, top: 722, width: 290, textAlign: 'center', fontFamily: sans, fontSize: 32, fontWeight: 600, color: C.red, opacity: prog(frame, over + 18, over + 30) }}>
        A's update: gone
      </div>

      {/* ledger */}
      <div style={{ position: 'absolute', left: 90, top: 820, width: 340, fontFamily: sans }}>
        <Fly at={two - 2}><div style={{ fontSize: 30, color: C.grey, marginBottom: 14 }}>charged</div></Fly>
        <Fly at={two}><LedgerRow color={A} l="A" v="−$80" /></Fly>
        <Fly at={two + 7}><LedgerRow color={B} l="B" v="−$80" /></Fly>
        <Fly at={two + 16}>
          <div style={{ borderTop: `3px solid ${C.dim}`, marginTop: 16, paddingTop: 10, fontSize: 64, fontWeight: 700, color: C.red, textShadow: glowText(C.red, 30, 0.5) }}>−$160</div>
        </Fly>
      </div>
      <div style={{ position: 'absolute', left: 540, top: 820, width: 340, fontFamily: sans }}>
        <Fly at={bal - 2}><div style={{ fontSize: 30, color: C.grey, marginBottom: 14 }}>balance</div></Fly>
        <Fly at={bal + 2}>
          <div style={{ fontSize: 44, fontWeight: 600, color: C.white, height: 70, display: 'flex', alignItems: 'center' }}>
            $100 <span style={{ color: C.grey, margin: '0 14px' }}>→</span> $20
          </div>
        </Fly>
        <Fly at={once - 4}>
          <div style={{ fontSize: 30, color: C.yellow, height: 70, display: 'flex', alignItems: 'center' }}>dropped once</div>
        </Fly>
        <Fly at={once + 2}>
          <div style={{ borderTop: `3px solid ${C.dim}`, marginTop: 16, paddingTop: 10, fontSize: 64, fontWeight: 700, color: C.yellow }}>−$80</div>
        </Fly>
      </div>
      <div style={{ position: 'absolute', left: 430, width: 110, top: 1032, textAlign: 'center', fontFamily: sans, fontSize: 80, fontWeight: 600, color: C.red, opacity: Math.min(1, neq), transform: `scale(${neq})`, textShadow: glowText(C.red, 30, 0.6) }}>≠</div>

      <div
        style={{
          position: 'absolute', top: 1250, left: 70, width: 820, textAlign: 'center', fontFamily: serif, fontStyle: 'italic', fontSize: 92, color: C.red,
          opacity: Math.min(1, lostP), transform: `scale(${0.85 + 0.15 * lostP})`, textShadow: glowText(C.red, 50, 0.55),
        }}
      >
        Lost update
      </div>

      <Sfx t={T} name="glitch" at={over - 1} volume={0.3} />
    </>
  )
}

function ValueChip({ x, y, rot, color, label, opacity, strike = 0 }: { x: number; y: number; rot: number; color: string; label: string; opacity: number; strike?: number }) {
  return (
    <div
      style={{
        position: 'absolute', left: x - 140, top: y - 56, width: 280, height: 112, boxSizing: 'border-box', borderRadius: 24, background: '#05080B',
        border: `4px solid ${color}`, boxShadow: `0 0 36px ${rgba(color, 0.5)}`, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 18,
        fontFamily: sans, opacity, transform: `rotate(${rot}deg)`,
      }}
    >
      <span style={{ width: 46, height: 46, borderRadius: 23, background: color, color: '#000', fontWeight: 700, fontSize: 28, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>{label}</span>
      <span style={{ fontSize: 64, fontWeight: 700, color: C.white }}>$20</span>
      {strike > 0 && <div style={{ position: 'absolute', left: 20, top: 52, height: 6, width: 236 * strike, background: C.red, borderRadius: 3 }} />}
    </div>
  )
}

function LedgerRow({ color, l, v }: { color: string; l: string; v: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 16, height: 70 }}>
      <span style={{ width: 40, height: 40, borderRadius: 20, background: color, color: '#000', fontWeight: 700, fontSize: 28, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>{l}</span>
      <span style={{ fontSize: 44, fontWeight: 600, color: C.red }}>{v}</span>
    </div>
  )
}

function Fly({ at, children }: { at: number; children: ReactNode }) {
  const p = useSpr(at, 15)
  return <div style={{ opacity: Math.min(1, Math.max(0, p)), transform: `translateY(${(1 - p) * 18}px)` }}>{children}</div>
}

// ---------------------------------------------------------------- 4. The fix: row lock

const KA = 612 // lane A y
const KB = 1112 // lane B y
const LROW = { x1: 160, x2: 880 }

function Lock() {
  const frame = useCurrentFrame()
  const update = useCue('update', 62)
  const locks = useCue('locks', 116)
  const bArrives = useCue('b', 159)
  const wait = useCue('wait', 175)
  const then = useCue('then', 205)
  const reads = useCue('reads', 222)
  const declined = useCue('declined', 259)
  const request = useCue('request', 92)
  const aWrite = Math.round((wait + then) / 2) + 4
  const unlock = then

  const closed = frame < locks - 2 ? 0 : frame < unlock ? prog(frame, locks - 2, locks + 4) : 1 - prog(frame, unlock, unlock + 8)
  const lockP = useSpr(locks - 8, 14)
  const lockedGlow = frame >= locks && frame < unlock + 6 ? 1 - prog(frame, unlock, unlock + 8) : 0
  const rA = prog(frame, locks + 2, locks + 14)
  const bAsk = prog(frame, bArrives + 4, bArrives + 14)
  const waiting = frame >= wait - 4 && frame < reads
  const waitLine = prog(frame, wait - 4, reads - 6, (x) => x)
  const wA = prog(frame, aWrite + 4, aWrite + 16)
  const rB = prog(frame, reads - 2, reads + 10)
  const value = frame < aWrite + 18 ? '$100' : '$20'
  const valueColor = frame < aWrite + 18 ? C.yellow : C.green
  const dots = '.'.repeat(1 + (Math.floor(frame / 7) % 3))
  const decl = prog(frame, declined - 4, declined + 6)

  return (
    <>
      <Title from={9} top={150} size={74} color={C.green}>Claude's fix: lock the row</Title>
      <CodeCard
        top={262}
        from={6}
        header="Update(src/wallet/charge.ts)"
        size={32}
        lines={['SELECT balance FROM wallets', '  WHERE id = $1 FOR UPDATE;']}
        hl={[{ line: 1, text: 'FOR UPDATE', at: update - 14, color: C.yellow }]}
      />

      <Badge x={112} y={KA} color={A} label="A" at={request - 4} r={30} />
      <Badge x={112} y={KB} color={B} label="B" at={bArrives - 6} r={30} />

      <RowBox value={value} valueColor={valueColor} at={request - 8} x1={LROW.x1} x2={LROW.x2} valueX={560} border={lockedGlow > 0.01 ? C.yellow : C.blue} glow={lockedGlow}>
        <div style={{ position: 'absolute', right: 26, top: 4, opacity: Math.min(1, lockP) }}>
          <div style={{ position: 'relative', width: 60, height: 66 }}>
            <Padlock x={30} y={33} size={50} closed={closed} color={closed > 0.5 ? C.yellow : C.grey} glow={lockedGlow} />
          </div>
        </div>
      </RowBox>

      <div style={{ position: 'absolute', left: 600, width: 280, top: ROW.y2 + 12, textAlign: 'right', fontFamily: sans, fontSize: 28, fontWeight: 600, color: C.yellow, opacity: lockedGlow * prog(frame, locks, locks + 10) }}>
        locked by A
      </div>
      <Svg>
        <Arrow x1={330} y1={ROW.y1 - 2} x2={330} y2={KA + 44} p={rA} color={C.yellow} glow />
        {/* B asks to read, but the row is locked */}
        <Arrow x1={330} y1={KB - 44} x2={330} y2={ROW.y2 + 8} p={bAsk * (frame < unlock ? 0.82 : 1)} color={C.yellow} dashed head={frame < unlock ? 0 : 16} />
        {frame >= bArrives + 12 && frame < unlock && <line x1={300} y1={ROW.y2 + 30} x2={360} y2={ROW.y2 + 30} stroke={C.red} strokeWidth={6} strokeLinecap="round" opacity={0.9} />}
        <line x1={482} y1={KB} x2={482 + (586 - 482) * waitLine} y2={KB} stroke={C.yellow} strokeWidth={4} strokeDasharray="10 10" strokeDashoffset={-frame * 1.5} opacity={waiting || frame >= reads ? 0.9 : 0} />
        <Arrow x1={660} y1={KA + 44} x2={660} y2={ROW.y1 - 2} p={wA} color={A} glow />
        <Arrow x1={720} y1={ROW.y2 + 2} x2={720} y2={KB - 44} p={rB} color={C.yellow} glow />
        <Arrow x1={720} y1={KB + 44} x2={720} y2={1206} p={decl} color={C.dim} width={3} head={12} />
      </Svg>

      <Token x1={330} y1={ROW.y1} x2={330} y2={KA + 40} from={locks + 2} dur={12} color={C.yellow} linger={0}>$100</Token>
      <Pill x={330} y={KA} w={300} color={A} at={locks + 12} glow={lockedGlow * 0.6}>
        <span style={{ position: 'relative', width: 34, height: 40, display: 'inline-block' }}><Padlock x={17} y={20} size={30} closed={1} color={C.yellow} /></span>
        <span style={{ color: C.grey }}>read</span><span style={{ color: C.yellow }}>$100</span>
      </Pill>

      <Pill x={330} y={KB} w={300} color={waiting ? C.yellow : B} at={bArrives - 2}>
        {frame < wait - 4 ? <span style={{ color: C.grey }}>read?</span> : frame < reads ? <span style={{ color: C.yellow }}>waiting{dots}</span> : <span style={{ color: C.grey }}>got the lock</span>}
      </Pill>

      <Pill x={660} y={KA} w={330} color={A} at={aWrite}>
        <span style={{ color: C.grey }}>write</span><span style={{ color: C.white }}>$20</span><span style={{ color: C.green, fontSize: 30 }}>· unlock</span>
      </Pill>
      <Token x1={660} y1={KA + 40} x2={660} y2={ROW.y1} from={aWrite + 6} dur={12} color={A} linger={0}>$20</Token>

      <Token x1={720} y1={ROW.y2} x2={720} y2={KB - 40} from={reads} dur={12} color={C.green} linger={0}>$20</Token>
      <Pill x={720} y={KB} w={260} color={B} at={reads + 10}>
        <span style={{ color: C.grey }}>read</span><span style={{ color: C.green }}>$20</span>
      </Pill>
      <Pill x={610} y={1252} w={540} h={88} color={C.yellow} at={declined - 2} glow={decl * 0.5} font={34}>
        declined <span style={{ color: C.grey, fontWeight: 500 }}>· $20 &lt; $80</span>
      </Pill>

      <Sfx t={T} name="lock" at={locks - 2} volume={0.38} />
      <Sfx t={T} name="declined" at={declined - 2} volume={0.42} />
    </>
  )
}

// ---------------------------------------------------------------- 5. Idempotency + takeaway

const SRV = { x1: 130, x2: 890, y1: 590, y2: 810 }

function Payoff() {
  const frame = useCurrentFrame()
  const { durationInFrames } = useScene()
  const idem = useCue('idempotency', 20)
  const key = useCue('key', 39)
  const retried = useCue('retried', 64)
  const tap = useCue('tap', 78)
  const twice = useCue('twice', 101)
  const read = useCue('read', 142)
  const lock = useCue('lock', 194)

  const srv = useSpr(idem - 6, 16)
  const stored = key + 26
  const lookup = tap + 18
  const rowGlow = interpolate(frame, [stored, stored + 6, stored + 24], [0, 1, 0.25], clamp) + interpolate(frame, [lookup, lookup + 4, lookup + 26], [0, 1, 0], clamp)
  const back = lookup + 4
  const dimDiagram = 1 - 0.65 * prog(frame, read - 10, read + 6)
  const l1 = useSpr(read - 4, 15)
  const l2 = useSpr(lock - 4, 13)
  const lockClosed = prog(frame, lock + 4, lock + 12)
  const endGlow = prog(frame, durationInFrames - 50, durationInFrames - 20)

  return (
    <>
      <Title from={9} top={150} size={76}>Plus an idempotency key</Title>
      <div style={{ position: 'absolute', inset: 0, opacity: dimDiagram }}>
        <TapCard x={270} y={400} at={idem - 2} title="tap 1" color={A} keyGlow={prog(frame, key - 4, key + 6)} />
        <TapCard x={730} y={400} at={retried - 2} title="tap 2 · retry" color={B} keyGlow={prog(frame, retried, retried + 8)} />

        <div
          style={{
            position: 'absolute', left: SRV.x1, top: SRV.y1, width: SRV.x2 - SRV.x1, height: SRV.y2 - SRV.y1, boxSizing: 'border-box', borderRadius: 28,
            border: `3px solid ${C.dim}`, background: '#070A0E', padding: '22px 30px', fontFamily: sans, opacity: Math.min(1, srv), transform: `translateY(${(1 - srv) * 30}px)`,
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontFamily: mono, fontSize: 32, color: C.white }}>POST /pay</span>
            <span style={{ fontSize: 28, color: C.grey }}>seen keys</span>
          </div>
          <div
            style={{
              marginTop: 22, height: 90, borderRadius: 18, border: `2px dashed ${frame >= stored ? 'transparent' : C.dim}`, display: 'flex', alignItems: 'center',
              padding: '0 24px', gap: 18, background: rgba(C.yellow, 0.1 * Math.min(1, rowGlow)), boxShadow: `inset 0 0 0 ${frame >= stored ? 3 : 0}px ${rgba(C.yellow, 0.4 + 0.6 * Math.min(1, rowGlow))}, 0 0 ${40 * Math.min(1, rowGlow)}px ${rgba(C.yellow, 0.4)}`,
            }}
          >
            {frame >= stored ? (
              <>
                <span style={{ fontFamily: mono, fontSize: 34, color: C.yellow }}>7f3a</span>
                <span style={{ color: C.grey, fontSize: 32 }}>→</span>
                <span style={{ fontSize: 34, color: C.white, fontWeight: 600 }}>charge #1</span>
                <span style={{ marginLeft: 'auto', fontSize: 34, color: C.red, fontWeight: 700 }}>−$80</span>
              </>
            ) : (
              <span style={{ fontSize: 28, color: C.dim }}>empty</span>
            )}
          </div>
        </div>

        <Svg>
          <Arrow x1={270} y1={472} x2={330} y2={SRV.y1 - 4} p={prog(frame, key + 2, key + 18)} color={A} glow />
          <Arrow x1={730} y1={472} x2={670} y2={SRV.y1 - 4} p={prog(frame, tap, tap + 16)} color={B} glow />
        </Svg>
        <Token x1={270} y1={472} x2={330} y2={SRV.y1 - 10} from={key + 4} dur={18} color={A} linger={0} font={28}>7f3a</Token>
        <Token x1={730} y1={472} x2={670} y2={SRV.y1 - 10} from={tap + 2} dur={16} color={B} linger={0} font={28}>7f3a</Token>
        <Token x1={640} y1={SRV.y1 + 40} x2={760} y2={500} from={back} dur={16} color={C.green} linger={10} font={28}>#1</Token>
        <Pill x={500} y={890} w={640} h={84} color={C.green} at={twice - 4} glow={0.6} font={34}>
          same result back · no second charge
        </Pill>
      </div>

      <div style={{ position: 'absolute', top: 1010, left: 70, width: 820, textAlign: 'center', fontFamily: serif, fontStyle: 'italic', fontSize: 66, color: C.white, opacity: Math.min(1, l1), transform: `translateY(${(1 - l1) * 20}px)` }}>
        Read, then write?
      </div>
      <div style={{ position: 'absolute', top: 1110, left: 70, width: 820, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 24, opacity: Math.min(1, l2), transform: `scale(${0.88 + 0.12 * l2})` }}>
        <div style={{ position: 'relative', width: 76, height: 84 }}>
          <Padlock x={38} y={44} size={70} closed={lockClosed} color={C.green} glow={0.6 + 0.4 * endGlow} />
        </div>
        <span style={{ fontFamily: serif, fontStyle: 'italic', fontSize: 84, color: C.green, textShadow: glowText(C.green, 30 + 30 * endGlow, 0.5) }}>Lock the row first.</span>
      </div>

      <Sfx t={T} name="lock" at={lock + 4} volume={0.45} />
    </>
  )
}

function TapCard({ x, y, at, title, color, keyGlow }: { x: number; y: number; at: number; title: string; color: string; keyGlow: number }) {
  const p = useSpr(at, 15)
  const frame = useCurrentFrame()
  if (frame < at) return null
  return (
    <div
      style={{
        position: 'absolute', left: x - 170, top: y - 72, width: 340, height: 144, boxSizing: 'border-box', borderRadius: 24, border: `3px solid ${color}`,
        background: rgba(color, 0.07), display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8,
        opacity: Math.min(1, p), transform: `scale(${0.85 + 0.15 * p})`, fontFamily: sans,
      }}
    >
      <span style={{ fontSize: 34, fontWeight: 600, color }}>{title}</span>
      <span
        style={{
          fontFamily: mono, fontSize: 30, color: C.yellow, padding: '2px 14px', borderRadius: 10, background: rgba(C.yellow, 0.12 * keyGlow),
          boxShadow: `0 0 ${24 * keyGlow}px ${rgba(C.yellow, 0.5 * keyGlow)}`,
        }}
      >
        key 7f3a
      </span>
    </div>
  )
}

export function RaceReel() {
  return (
    <Stage>
      <ReelAudio t={T} voiceVolume={0.9} musicVolume={0.23} duck={0.5} />
      <Scene t={T} id="hook"><Hook /></Scene>
      <Scene t={T} id="race"><Race /></Scene>
      <Scene t={T} id="lost"><Lost /></Scene>
      <Scene t={T} id="lock"><Lock /></Scene>
      <Scene t={T} id="payoff"><Payoff /></Scene>
      <Captions t={T} />
    </Stage>
  )
}
