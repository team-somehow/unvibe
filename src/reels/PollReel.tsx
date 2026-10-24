import { Easing, interpolate, useCurrentFrame } from 'remotion'
import { Captions, ReelAudio, Scene, Sfx, buildTimeline, useScene, type Manifest } from './audio'
import manifest from './audio/poll.json'
import { CheckIcon, Chip, Heading, KeyIcon, Panel, TimerRing, alpha, blend, clamp, ramp, useCues, useSpring } from './kit-breaches'
import { C, Stage, mono, sans } from './primitives'
import script from './scripts/poll.json'

// The feed draws a poll sticker over roughly y 1100-1600 of this reel, so everything here stays above y ~960
const T = buildTimeline(script, manifest as unknown as Manifest)
export const POLL_REEL_FRAMES = T.total

const REDIS = C.teal
const PG = C.purple

/* ---------------- persistent header ---------------- */

function Waiting() {
  const frame = useCurrentFrame()
  const pulse = 0.5 + 0.5 * Math.sin(frame / 7)
  return (
    <div style={{ position: 'absolute', top: 150, left: 0, right: 0, display: 'flex', justifyContent: 'center' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '12px 28px', borderRadius: 999, border: `2px solid ${alpha(C.yellow, 0.8)}`, color: C.yellow, fontSize: 30, fontFamily: sans, fontWeight: 500, background: alpha(C.yellow, 0.06) }}>
        <span style={{ position: 'relative', width: 18, height: 18 }}>
          <span style={{ position: 'absolute', inset: 0, borderRadius: 9, background: C.yellow }} />
          <span style={{ position: 'absolute', inset: -10 * pulse, borderRadius: 30, border: `2px solid ${alpha(C.yellow, 1 - pulse)}` }} />
        </span>
        Claude is waiting on you · <span style={{ fontFamily: mono, fontWeight: 400 }}>auth-service</span>
      </div>
    </div>
  )
}

/* ---------------- ask: one session, two homes ---------------- */

const BOX_Y = 760
const LEFT = { x: 90, w: 360 }
const RIGHT = { x: 510, w: 360 }

function Home({ x, w, color, name, sub, p, lit }: { x: number; w: number; color: string; name: string; sub: string; p: number; lit: number }) {
  return (
    <div style={{ position: 'absolute', left: x, top: BOX_Y, width: w, height: 170, opacity: p, transform: `translateY(${(1 - p) * 30}px) scale(${0.9 + 0.1 * p})` }}>
      <Panel x={0} y={0} w={w} h={170} color={color} glow={0.2 + lit * 0.6} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
        <div style={{ fontFamily: sans, fontWeight: 700, fontSize: 56, color, letterSpacing: -1 }}>{name}</div>
        <div style={{ fontFamily: sans, fontSize: 30, color: C.grey }}>{sub}</div>
      </Panel>
    </div>
  )
}

function Ask() {
  const frame = useCurrentFrame()
  const cue = useCues()
  const decision = cue('decision', 98)
  const where = cue('where', 137)
  const sessions = cue('sessions', 169)
  // The fork is on stage before the narration reaches the question, so the poster frame (45) shows the decision;
  // the token starts hesitating between the two homes when the question is asked
  const token = useSpring(Math.min(12, cue('session', 54) - 4), 12)
  const ask = ramp(frame, decision - 4, decision + 8)
  const paths = ramp(frame, Math.min(18, where - 6), Math.min(38, where + 18))
  const left = useSpring(Math.min(24, sessions - 14), 14)
  const right = useSpring(Math.min(30, sessions - 6), 14)
  // the session token hesitates between the two homes
  const sway = frame > sessions ? Math.sin((frame - sessions) / 9) : 0
  const tx = 480 + sway * 70
  const lit = (side: number) => Math.max(0, side * sway) * ramp(frame, sessions, sessions + 10)
  const pathD = (x: number) => `M480 600 C480 680 ${x} 680 ${x} ${BOX_Y}`
  return (
    <>
      <Heading from={4} top={250} size={74}>Where should login<br />sessions live?</Heading>
      <svg width={1080} height={1000} style={{ position: 'absolute', left: 0, top: 0 }}>
        {[LEFT.x + LEFT.w / 2, RIGHT.x + RIGHT.w / 2].map((x, i) => (
          <path key={i} d={pathD(x)} fill="none" stroke={i === 0 ? REDIS : PG} strokeWidth={5} strokeLinecap="round"
            strokeDasharray={400} strokeDashoffset={400 * (1 - paths)} opacity={0.4 + 0.6 * lit(i === 0 ? -1 : 1)} />
        ))}
      </svg>
      <div style={{ position: 'absolute', left: tx, top: 556, transform: `translate(-50%,-50%) scale(${0.7 + 0.3 * token}) rotate(${sway * 4}deg)`, opacity: token }}>
        <Chip color={C.yellow} glow={0.3 + 0.4 * ask} style={{ background: '#000' }}><KeyIcon size={36} /><span style={{ fontFamily: mono, fontWeight: 500 }}>session 7f3a…</span>
          <span style={{ fontFamily: sans, fontWeight: 700, opacity: ask, marginLeft: -4 * (1 - ask) }}>?</span></Chip>
      </div>
      <Home x={LEFT.x} w={LEFT.w} color={REDIS} name="Redis" sub="in memory" p={left} lit={lit(-1)} />
      <Home x={RIGHT.x} w={RIGHT.w} color={PG} name="Postgres" sub="on disk" p={right} lit={lit(1)} />
      <Sfx t={T} name="clock" at={where - 4} volume={0.3} />
    </>
  )
}

/* ---------------- redis ---------------- */

const KEYS = [
  { k: 'sess:7f3a…', user: 'user 42', ttl: '30d', life: 1 },
  { k: 'sess:b21c…', user: 'user 7', ttl: '2h', life: 0.6 },
  { k: 'sess:e9d0…', user: 'user 19', ttl: '0:03', life: 0.18 },
]

function ServiceRow({ y, items, from, extra, extraP, extraColor, extraLabel }: {
  y: number; items: string[]; from: number; extra?: string; extraP?: number; extraColor?: string; extraLabel?: string
}) {
  const frame = useCurrentFrame()
  return (
    <div style={{ position: 'absolute', top: y, left: 90, width: 780, display: 'flex', gap: 20 }}>
      {items.map((t, i) => {
        const p = ramp(frame, from + i * 5, from + i * 5 + 12)
        return (
          <div key={t} style={{ width: 246, height: 96, borderRadius: 18, border: `3px solid ${C.blue}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: mono, fontSize: 32, color: C.blue, opacity: p, transform: `translateY(${(1 - p) * 16}px)` }}>
            {t}
          </div>
        )
      })}
      {extra && (
        <div style={{ position: 'relative', width: 246, height: 96, borderRadius: 18, border: `3px dashed ${extraColor}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: mono, fontSize: 32, color: extraColor, opacity: extraP, transform: `scale(${0.7 + 0.3 * (extraP ?? 0)})`, background: alpha(extraColor ?? C.yellow, 0.1), boxShadow: `0 0 40px ${alpha(extraColor ?? C.yellow, 0.35 * (extraP ?? 0))}` }}>
          {extra}
          {extraLabel && <div style={{ position: 'absolute', top: -46, left: 0, right: 0, textAlign: 'center', fontFamily: sans, fontWeight: 600, fontSize: 28, color: extraColor }}>{extraLabel}</div>}
        </div>
      )}
    </div>
  )
}

function Redis() {
  const frame = useCurrentFrame()
  const cue = useCues()
  const memory = cue('memory', 88)
  const lookups = cue('lookups', 116)
  const fast = cue('fast', 146)
  const timer = cue('timer', 194)
  const clean = cue('clean', 265)
  const catchW = cue('catch', 315)
  const more = cue('more', 346)
  const panel = useSpring(cue('redis', 35) + 8, 15)
  const speed = useSpring(fast - 6, 11)
  const look = ramp(frame, lookups - 2, lookups + 4) * (1 - ramp(frame, lookups + 14, lookups + 26))
  const run = ramp(frame, timer - 6, clean + 8, (t) => t)
  const extra = useSpring(more - 8, 11)
  return (
    <>
      <Heading from={2} top={250} size={74}>Option one: <span style={{ color: REDIS }}>Redis</span></Heading>
      <div style={{ opacity: panel, transform: `translateY(${(1 - panel) * 30}px)` }}>
        <Panel x={90} y={380} w={780} h={350} color={REDIS} glow={0.25}>
          <div style={{ height: 76, display: 'flex', alignItems: 'center', padding: '0 26px', gap: 16, borderBottom: `2px solid ${C.dim}` }}>
            <svg width={44} height={30} viewBox="0 0 44 30" fill="none" stroke={REDIS} strokeWidth={3}>
              <rect x="2" y="4" width="40" height="18" rx="3" />
              {[8, 16, 24, 32].map((x) => <rect key={x} x={x} y="8" width="5" height="10" fill={REDIS} stroke="none" />)}
              <path d="M8 22v5M16 22v5M24 22v5M32 22v5" />
            </svg>
            <span style={{ fontFamily: sans, fontWeight: 600, fontSize: 34, color: REDIS, opacity: ramp(frame, memory - 6, memory + 6) }}>in memory</span>
            <div style={{ marginLeft: 'auto', opacity: speed, transform: `scale(${0.7 + 0.3 * speed})` }}>
              <Chip color={C.green} glow={speed * 0.6} size={30} style={{ padding: '6px 18px' }}>
                <svg width={22} height={30} viewBox="0 0 22 30"><path d="M13 1L2 17h8l-2 12 12-17h-8z" fill={C.green} /></svg>
                0.2 ms
              </Chip>
            </div>
          </div>
          {KEYS.map((row, i) => {
            const left = Math.max(0, row.life - run * 0.2 * (i === 2 ? 5.2 : 1))
            const gone = i === 2 ? ramp(frame, clean + 4, clean + 18) : 0
            const flash = i === 0 ? look : 0
            return (
              <div key={row.k} style={{
                position: 'absolute', left: 20, right: 20, top: 92 + i * 84, height: 72, borderRadius: 14,
                border: `3px solid ${flash > 0 ? blend(C.dim, C.yellow, flash) : C.dim}`, background: alpha(C.yellow, 0.12 * flash),
                display: 'flex', alignItems: 'center', padding: '0 20px', gap: 24, fontFamily: mono, fontSize: 31,
                opacity: 1 - gone, transform: `translateX(${gone * 60}px) scale(${1 - gone * 0.1})`,
              }}>
                <span style={{ color: C.white }}>{row.k}</span>
                <span style={{ color: C.grey, flex: 1 }}>{row.user}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, opacity: ramp(frame, timer - 8, timer + 4) }}>
                  <span style={{ color: left < 0.05 ? C.yellow : C.grey, fontSize: 28 }}>{left < 0.05 ? 'expired' : row.ttl}</span>
                  <TimerRing size={50} color={left < 0.1 ? C.yellow : REDIS} left={left} />
                </div>
              </div>
            )
          })}
        </Panel>
      </div>
      <div style={{ position: 'absolute', top: 770, left: 90, fontFamily: sans, fontWeight: 600, fontSize: 32, color: C.yellow, opacity: ramp(frame, catchW - 6, catchW + 6) }}>
        The catch
      </div>
      <ServiceRow y={830} items={['app', 'postgres']} from={catchW} extra="redis" extraP={extra} extraColor={C.yellow} />
      <div style={{ position: 'absolute', top: 770, left: 90 + 2 * 266, width: 246, textAlign: 'center', fontFamily: sans, fontWeight: 600, fontSize: 30, color: C.yellow, opacity: extra }}>+1 to run</div>
      <Sfx t={T} name="reveal" at={cue('redis', 35) - 6} volume={1} />
      <Sfx t={T} name="pop" at={clean + 4} volume={0.4} />
    </>
  )
}

/* ---------------- postgres ---------------- */

const ROWS = [
  ['7f3a…', '42', '2026-11-23'],
  ['b21c…', '7', '2026-10-24'],
  ['e9d0…', '19', '2026-10-24'],
]

function Postgres() {
  const frame = useCurrentFrame()
  const cue = useCues()
  const already = cue('already', 76)
  const restart = cue('restart', 144)
  const survive = cue('survive', 129)
  const under = cue('under', 193)
  const slower = cue('slower', 227)
  const table = useSpring(cue('postgres', 41) - 4, 15)
  const ok = useSpring(already + 6, 12)
  // restart: the table blinks off and comes back with every row intact
  const blink = frame >= survive + 2 && frame < restart + 6 ? interpolate(frame, [survive + 2, survive + 8, restart, restart + 6], [1, 0.08, 0.08, 1], clamp) : 1
  const kept = useSpring(restart + 6, 12)
  const restarting = frame >= survive + 2 && frame < restart + 6 ? 1 : 0
  const rowsOn = blink
  const load = ramp(frame, under - 6, slower + 6, Easing.in(Easing.quad))
  const ms = Math.round(interpolate(load, [0, 1], [2, 40]))
  const latColor = blend(C.green, C.yellow, load)
  return (
    <>
      <Heading from={2} top={250} size={74}>Option two: <span style={{ color: PG }}>Postgres</span></Heading>
      <ServiceRow y={380} items={['app', 'postgres']} from={already - 14} />
      <div style={{ position: 'absolute', top: 400, left: 90 + 2 * 266, width: 260, opacity: ok, transform: `scale(${0.8 + 0.2 * ok})` }}>
        <Chip color={C.green} size={28} style={{ padding: '10px 18px' }}><CheckIcon size={28} p={ok} /> nothing new</Chip>
      </div>
      <div style={{ opacity: table, transform: `translateY(${(1 - table) * 30}px)` }}>
        <Panel x={90} y={510} w={780} h={250} color={PG} glow={0.25 + kept * 0.2 * (1 - ramp(frame, restart + 30, restart + 50))}>
          <div style={{ height: 64, display: 'flex', alignItems: 'center', gap: 14, padding: '0 26px', borderBottom: `2px solid ${C.dim}`, fontFamily: mono, fontSize: 30 }}>
            <span style={{ color: C.grey }}>table</span><span style={{ color: C.white }}>sessions</span>
            <span style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10, fontFamily: sans, fontSize: 28, fontWeight: 600, color: restarting > 0 ? C.yellow : kept > 0.5 ? C.green : C.grey }}>
              {restarting > 0 && (
                <svg width={34} height={34} viewBox="-20 -20 40 40" fill="none" stroke={C.yellow} strokeWidth={4.5} strokeLinecap="round" style={{ transform: `rotate(${frame * 14}deg)` }}>
                  <path d="M-12 -7a14 14 0 1 0 8 -6" /><path d="M-4 -13l-9 -1 1 9" />
                </svg>
              )}
              {kept > 0.5 && <CheckIcon size={30} p={kept} />}
              {restarting > 0 ? 'restarting' : kept > 0.5 ? 'still there' : 'on disk'}
            </span>
          </div>
          {ROWS.map((r, i) => (
            <div key={r[0]} style={{ display: 'flex', gap: 30, padding: '0 26px', height: 58, alignItems: 'center', fontFamily: mono, fontSize: 30, color: C.white, whiteSpace: 'nowrap', opacity: rowsOn, marginTop: i === 0 ? 8 : 0 }}>
              <span style={{ width: 150 }}>{r[0]}</span>
              <span style={{ width: 170, color: C.grey }}>user {r[1]}</span>
              <span style={{ color: C.grey, marginLeft: 'auto' }}>{r[2]}</span>
            </div>
          ))}
        </Panel>
      </div>
      {/* heavy load */}
      <div style={{ position: 'absolute', top: 800, left: 90, width: 780, opacity: ramp(frame, under - 10, under) }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', fontFamily: sans }}>
          <span style={{ fontSize: 30, color: C.grey }}>login lookup, heavy load</span>
          <span style={{ fontSize: 60, fontWeight: 700, color: latColor, fontVariantNumeric: 'tabular-nums' }}>{ms} ms</span>
        </div>
        <div style={{ position: 'relative', height: 26, borderRadius: 13, background: '#11161C', marginTop: 10, overflow: 'hidden' }}>
          <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${8 + load * 88}%`, borderRadius: 13, background: latColor, boxShadow: `0 0 30px ${alpha(C.yellow, 0.4 * load)}` }} />
        </div>
        {/* request dots piling in */}
        <div style={{ position: 'relative', height: 40, marginTop: 12 }}>
          {Array.from({ length: 22 }).map((_, i) => {
            const speed = 0.9 - load * 0.55
            const x = (((frame - under) * 9 * speed + i * 37) % 780 + 780) % 780
            const show = i < 6 + load * 16
            return show ? <span key={i} style={{ position: 'absolute', left: x, top: 12 + (i % 3) * 6, width: 14, height: 14, borderRadius: 7, background: alpha(C.blue, 0.85) }} /> : null
          })}
        </div>
      </div>
      <Sfx t={T} name="reveal" at={cue('postgres', 41) - 6} volume={1} />
    </>
  )
}

/* ---------------- vote ---------------- */

const CARDS = [
  { name: 'Redis', color: REDIS, x: 90, pros: ['very fast', 'auto-expiry'], con: 'one more service' },
  { name: 'Postgres', color: PG, x: 500, pros: ['already running', 'survives restarts'], con: 'slower under load' },
]

function Vote() {
  const frame = useCurrentFrame()
  const cue = useCues()
  const { durationInFrames } = useScene()
  const tap = cue('tap', 45)
  const below = cue('below', 68)
  const arrow = useSpring(below - 8, 12)
  const bounce = Math.abs(Math.sin((frame - below) / 6)) * 14
  const pops = [useSpring(4, 15), useSpring(10, 15)]
  return (
    <>
      <Heading from={2} top={250} size={74} color={C.yellow}>Your call</Heading>
      {CARDS.map((c, ci) => {
        const p = pops[ci]
        const glow = 0.25 + 0.35 * Math.max(0, Math.sin((frame - tap) / 10 + ci * Math.PI)) * ramp(frame, tap, tap + 10)
        return (
          <div key={c.name} style={{ position: 'absolute', left: c.x, top: 380, width: 380, opacity: p, transform: `translateY(${(1 - p) * 30}px)` }}>
            <Panel x={0} y={0} w={380} h={440} color={c.color} glow={glow} style={{ padding: '30px 30px' }}>
              <div style={{ fontFamily: sans, fontWeight: 700, fontSize: 56, color: c.color, letterSpacing: -1, marginBottom: 26 }}>{c.name}</div>
              {c.pros.map((t, i) => (
                <div key={t} style={{ display: 'flex', gap: 14, alignItems: 'center', fontFamily: sans, fontSize: 32, color: C.white, marginBottom: 20, opacity: ramp(frame, 10 + ci * 6 + i * 5, 20 + ci * 6 + i * 5) }}>
                  <CheckIcon size={32} color={C.green} /> {t}
                </div>
              ))}
              <div style={{ display: 'flex', gap: 14, alignItems: 'center', fontFamily: sans, fontSize: 32, color: C.yellow, opacity: ramp(frame, 24 + ci * 6, 34 + ci * 6) }}>
                <span style={{ width: 32, textAlign: 'center', fontWeight: 700 }}>!</span> {c.con}
              </div>
            </Panel>
          </div>
        )
      })}
      <svg width={80} height={70} viewBox="0 0 80 70" style={{ position: 'absolute', left: 440, top: 850 + bounce, opacity: arrow * (1 - ramp(frame, durationInFrames - 14, durationInFrames)) }}>
        <path d="M10 10l30 24 30-24M10 36l30 24 30-24" fill="none" stroke={C.yellow} strokeWidth={7} strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <Sfx t={T} name="ding" at={tap - 2} volume={0.9} />
    </>
  )
}

export function PollReel() {
  return (
    <Stage>
      <ReelAudio t={T} voiceVolume={1.24} musicVolume={0.26} duck={0.45} />
      <Waiting />
      <Scene t={T} id="ask"><Ask /></Scene>
      <Scene t={T} id="redis"><Redis /></Scene>
      <Scene t={T} id="postgres"><Postgres /></Scene>
      <Scene t={T} id="vote"><Vote /></Scene>
      <Captions t={T} top={985} />
    </Stage>
  )
}
