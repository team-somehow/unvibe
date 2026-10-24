import { Cpu, Gauge, Lock, LockOpen, Sparkles, Table2, User, X } from 'lucide-react'
import type { ReactNode } from 'react'
import { Easing, interpolate, random, useCurrentFrame } from 'remotion'
import { Captions, ReelAudio, Scene, Sfx, buildTimeline, useCue, useWordFrame, type Manifest } from './audio'
import manifest from './audio/hashing.json'
import { Arrow, CodeCard, Label, Pill, Pop, SerifLine, boxGlow, fmt, fn, jitter, kw, lerp, mixColor, pl, rgba, scrambleText, textGlow, useP, useSpr } from './kit-auth'
import { C, Stage, Title, mono, sans, serif } from './primitives'
import script from './scripts/hashing.json'

const T = buildTimeline(script, manifest as unknown as Manifest)
export const HASHING_REEL_FRAMES = T.total

const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const

// sha256("hunter2"), the real thing
const HUNTER = 'f52fbd32b2b3b86ff88ef6c490628285f482af15ddcb29541f94bcf526a3f6c7'
const SHORT = `${HUNTER.slice(0, 8)}…${HUNTER.slice(-4)}`
const BC = [
  { pre: '$2b$12$', salt: 'x7Qp', tail: '…Lr8e' },
  { pre: '$2b$12$', salt: 'M2aK', tail: '…9vTq' },
]
const FAST = C.blue // the plain hash function: neutral structure
const SLOW = C.green // bcrypt: the fix
const SALT = C.teal

function hex(seed: string, n: number) {
  let s = ''
  for (let i = 0; i < n; i++) s += '0123456789abcdef'[Math.floor(random(`${seed}-${i}`) * 16)]
  return s
}

function Hook() {
  const frame = useCurrentFrame()
  const hashing = useCue('hashing', 52)
  const passwords = useCue('passwords', 65)
  const sha = useCue('sha', 101)
  const sounds = useCue('sounds', 154)
  const isnt = useCue('isn', 192)

  const pw = useSpr(passwords - 8, 13)
  const box = useSpr(hashing - 2, 13)
  const shaGlow = interpolate(frame, [sha - 4, sha + 6, sha + 40], [0, 1, 0.45], clamp)
  const hashAt = passwords + 18
  const hashP = interpolate(frame, [hashAt, hashAt + 22], [0, 1], clamp)
  const safe = useSpr(sounds - 4, 12)
  const broken = frame >= isnt - 2
  const glitching = frame >= isnt - 6 && frame < isnt + 10
  const jx = glitching ? jitter(frame, 'gx', 14) : 0
  const flip = useP(isnt - 2, 8)
  const red = useP(isnt, 14)
  return (
    <>
      <Title from={2} top={150} size={80}>Inside your signup code</Title>
      <CodeCard
        y={276}
        w={940}
        size={33}
        at={8}
        tool="Read(src/auth/signup.ts)"
        lines={[
          { at: 18, hl: sha - 4, segs: [kw('const '), pl('hash = '), fn('sha256'), pl('(password)')] },
          { at: 24, segs: [kw('await '), pl('db.users.'), fn('insert'), pl('({ email, hash })')] },
        ]}
      />
      <div style={{ position: 'absolute', top: 568, left: 70, width: 820, display: 'flex', justifyContent: 'center', opacity: Math.min(1, pw), transform: `translateY(${(1 - pw) * -20}px)` }}>
        <Pill color={C.white} style={{ fontFamily: mono, fontWeight: 500, fontSize: 46, padding: '10px 36px' }}>hunter2</Pill>
      </div>
      <Arrow x1={480} y1={658} x2={480} y2={720} at={passwords + 2} dur={10} color={C.grey} />
      <div
        style={{
          position: 'absolute', top: 730, left: 480 - 210, width: 420, height: 116, borderRadius: 24, border: `3px solid ${broken ? mixColor(FAST, C.red, red) : FAST}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#061017', fontFamily: mono, fontSize: 48, color: C.white,
          opacity: Math.min(1, box), transform: `scale(${0.85 + 0.15 * box}) translateX(${jx * 0.4}px)`, boxShadow: boxGlow(broken ? C.red : FAST, 0.25 + shaGlow * 0.9 + red * 0.4),
        }}
      >
        SHA-256
      </div>
      <Arrow x1={480} y1={856} x2={480} y2={918} at={hashAt - 8} dur={10} color={C.grey} />
      <div style={{ position: 'absolute', top: 928, left: 70, width: 820, textAlign: 'center', opacity: hashP > 0 ? 1 : 0 }}>
        <span style={{ display: 'inline-block', fontFamily: mono, fontSize: 40, color: broken ? mixColor(C.white, C.red, red) : C.white, padding: '12px 30px', borderRadius: 16, border: `2px solid ${C.dim}`, background: '#06090D', transform: `translateX(${jx}px)`, textShadow: glitching ? `${jx * 0.3}px 0 ${C.red}, ${-jx * 0.3}px 0 ${C.blue}` : 'none' }}>
          {scrambleText('', `${HUNTER.slice(0, 20)}…`, hashP, frame, 'hk')}
        </span>
      </div>
      <div style={{ position: 'absolute', top: 1106, left: 70, width: 820, height: 96, display: 'flex', justifyContent: 'center', opacity: Math.min(1, safe), transform: `translateX(${jx}px) scale(${0.9 + 0.1 * Math.min(1, safe)})` }}>
        <div style={{ position: 'absolute', opacity: 1 - flip }}>
          <Pill color={C.green} glow={0.6} style={{ fontSize: 44, padding: '14px 34px' }}>
            <Lock size={40} strokeWidth={2.4} /> sounds safe
          </Pill>
        </div>
        <div style={{ position: 'absolute', opacity: flip }}>
          <Pill color={C.red} glow={0.9} fill={0.14} style={{ fontSize: 44, padding: '14px 34px' }}>
            <LockOpen size={40} strokeWidth={2.4} /> it isn't
          </Pill>
        </div>
      </div>
      <Sfx t={T} name="glitch" at={isnt - 6} volume={0.45} />
    </>
  )
}

function Fan({ cx, cy, r, angle, blur }: { cx: number; cy: number; r: number; angle: number; blur: number }) {
  const blades = 7
  return (
    <g transform={`translate(${cx} ${cy})`}>
      <circle r={r + 10} fill="#05080B" stroke={C.dim} strokeWidth={3} />
      <circle r={r} fill={rgba(C.grey, 0.12 * blur)} />
      <g transform={`rotate(${angle})`} opacity={1 - blur * 0.55}>
        {Array.from({ length: blades }).map((_, i) => (
          <path key={i} transform={`rotate(${(i * 360) / blades})`} d={`M 0 0 Q ${r * 0.55} ${-r * 0.42} ${r * 0.94} ${-r * 0.1} Q ${r * 0.52} ${r * 0.08} 0 0 Z`} fill={C.grey} />
        ))}
      </g>
      <circle r={r * 0.22} fill="#0B1117" stroke={C.grey} strokeWidth={3} />
    </g>
  )
}

const WORDS = ['password', '123456', 'qwerty', 'letmein', 'dragon', 'monkey', 'football', 'iloveyou', 'admin', 'welcome', 'sunshine', 'princess', 'abc123', 'trustno1', 'master', 'shadow', 'baseball', 'superman', 'hello123', 'freedom', 'starwars', 'charlie', 'batman', 'pokemon', 'summer', 'hunter1', 'passw0rd', 'qwerty1', 'zaq12wsx', 'michael']

function Gpu() {
  const frame = useCurrentFrame()
  const gpu = useCue('gpu', 83)
  const tries = useCue('tries', 100)
  const billion = useCue('billion', 118)
  const second = useCue('second', 140)

  const speed = useCue('speed', 34)
  const card = useSpr(6, 14)
  const speedAt = (f: number) =>
    interpolate(f, [gpu - 12, tries], [0, 1], { ...clamp, easing: Easing.in(Easing.quad) }) * interpolate(f, [second + 2, second + 16], [1, 0], { ...clamp, easing: Easing.out(Easing.quad) })
  // integrate fan angle and stream offset so speed changes are smooth
  let angle = 0
  let rows = 0
  let rowsEnd = 0
  for (let f = 0; f <= 180; f++) {
    const v = speedAt(f)
    if (f <= frame) {
      angle += v * 38
      rows += v * 1.25
    }
    rowsEnd += v * 1.25
  }
  const scale = rowsEnd > 0 ? Math.round(rowsEnd) / rowsEnd : 1
  const offset = rows * scale
  const MATCH = Math.round(rowsEnd) + 3
  const blur = speedAt(frame)
  const count = interpolate(frame, [tries - 2, billion + 12], [0, 1], { ...clamp, easing: Easing.out(Easing.cubic) })
  const value = count <= 0 ? 0 : Math.pow(10, lerp(0, Math.log10(2e10), count))
  const stopped = frame >= second + 16
  const matchGlow = useP(second + 14, 8)
  const stream = useP(speed + 4, 14)
  const ROW = 57
  const TOP = 922
  const first = Math.max(0, Math.floor(offset) - 1)
  return (
    <>
      <Title from={2} top={150} size={84}>
        Built for <span style={{ color: C.yellow }}>speed</span>
      </Title>
      <div style={{ position: 'absolute', top: 286, left: 170, width: 740, height: 272, opacity: Math.min(1, card), transform: `translateY(${(1 - card) * 30}px)` }}>
        <svg viewBox="0 0 740 272" style={{ position: 'absolute', inset: 0, overflow: 'visible' }}>
          <rect x={2} y={2} width={736} height={268} rx={28} fill="#070B10" stroke={mixColor(C.dim, C.red, blur * 0.7)} strokeWidth={3} style={{ filter: `drop-shadow(0 0 ${30 * blur}px ${rgba(C.red, 0.45 * blur)})` }} />
          {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
            <rect key={i} x={60 + i * 80} y={262} width={46} height={22} rx={3} fill={C.yellow} opacity={0.55} />
          ))}
          <Fan cx={220} cy={136} r={92} angle={angle} blur={blur} />
          <Fan cx={520} cy={136} r={92} angle={angle * 1.07 + 20} blur={blur} />
        </svg>
        <div style={{ position: 'absolute', left: 34, top: 22, display: 'flex', alignItems: 'center', gap: 10, fontFamily: mono, fontSize: 30, color: C.grey }}>
          <Cpu size={30} strokeWidth={2.2} /> GPU
        </div>
      </div>
      <div style={{ position: 'absolute', top: 600, left: 70, width: 940, textAlign: 'center', opacity: count > 0 ? 1 : 0 }}>
        <div style={{ fontFamily: sans, fontWeight: 700, fontSize: 104, lineHeight: 1, letterSpacing: -3, fontVariantNumeric: 'tabular-nums', color: mixColor(C.yellow, C.red, count), textShadow: textGlow(C.red, count * 0.7) }}>{fmt(value)}</div>
        <div style={{ fontFamily: sans, fontSize: 34, color: C.grey, marginTop: 10 }}>guesses every second</div>
      </div>
      <div style={{ position: 'absolute', top: 836, left: 70, width: 820, opacity: stream }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', borderBottom: `2px solid ${C.dim}`, paddingBottom: 10 }}>
          <Label>stolen hash</Label>
          <span style={{ fontFamily: mono, fontSize: 32, color: C.red }}>{SHORT}</span>
        </div>
      </div>
      <div
        style={{
          position: 'absolute', top: TOP, left: 70, width: 820, height: ROW * 8, overflow: 'hidden', opacity: stream,
          maskImage: 'linear-gradient(transparent, #000 18%, #000 82%, transparent)', WebkitMaskImage: 'linear-gradient(transparent, #000 18%, #000 82%, transparent)',
        }}
      >
        {Array.from({ length: 10 }).map((_, k) => {
          const i = first + k
          const y = (i - offset) * ROW
          const isMatch = i === MATCH
          const word = isMatch ? 'hunter2' : WORDS[i % WORDS.length]
          const h = isMatch ? SHORT : `${hex(`g${i}`, 8)}…${hex(`t${i}`, 4)}`
          const hit = isMatch && stopped
          return (
            <div
              key={i}
              style={{
                position: 'absolute', top: y + 4, left: 0, right: 0, height: ROW - 8, display: 'flex', alignItems: 'center', gap: 18, padding: '0 18px', borderRadius: 12,
                fontFamily: mono, fontSize: 32, color: hit ? C.red : C.white, background: hit ? rgba(C.red, 0.14 * matchGlow) : 'transparent', boxShadow: hit ? boxGlow(C.red, matchGlow) : 'none',
                filter: blur > 0.4 ? `blur(${(blur - 0.4) * 3}px)` : undefined,
              }}
            >
              <span style={{ width: 250 }}>"{word}"</span>
              <span style={{ color: C.grey }}>→</span>
              <span style={{ color: hit ? C.red : C.grey, flex: 1 }}>{h}</span>
              <span style={{ color: hit ? C.red : C.dim, fontFamily: sans, fontWeight: 700, fontSize: hit ? 30 : 34 }}>{hit ? 'MATCH' : '✕'}</span>
            </div>
          )
        })}
      </div>
      <Sfx t={T} name="gpu" at={gpu - 12} volume={0.4} />
    </>
  )
}

const XL = 250
const XR = 710

function Avatar({ x, name, p, cracked }: { x: number; name: string; p: number; cracked: number }) {
  const ring = mixColor(C.blue, C.red, cracked)
  return (
    <div style={{ position: 'absolute', top: 292, left: x - 120, width: 240, display: 'flex', flexDirection: 'column', alignItems: 'center', opacity: Math.min(1, p), transform: `scale(${0.8 + 0.2 * Math.min(1, p)})` }}>
      <div style={{ position: 'relative', width: 104, height: 104, borderRadius: 52, border: `3px solid ${ring}`, display: 'grid', placeItems: 'center', background: '#060A0E', boxShadow: boxGlow(C.red, cracked * 0.8) }}>
        <User size={54} color={ring} strokeWidth={2} />
        {cracked > 0 && (
          <div style={{ position: 'absolute', right: -14, top: -10, width: 44, height: 44, borderRadius: 22, background: C.red, display: 'grid', placeItems: 'center', transform: `scale(${cracked})` }}>
            <X size={30} color="#000" strokeWidth={3.4} />
          </div>
        )}
      </div>
      <div style={{ fontFamily: sans, fontSize: 32, color: cracked > 0.5 ? C.red : C.white, marginTop: 8 }}>{name}</div>
    </div>
  )
}

type PairProps = {
  av: number
  pw: number
  pwGlow: number
  salt: number
  fnP: number
  bcrypt: number
  hashP: number
  hashes: [ReactNode, ReactNode]
  hashColor: string
  hashGlow: number
  link: 'eq' | 'neq'
  linkP: number
  cracked: number
  arrowsAt: number
}

// Two users side by side: password -> hash function -> stored hash. Shared by the "twins" and "salt" scenes so they read as one diagram changing.
function Pair(p: PairProps) {
  const fnColor = mixColor(FAST, SLOW, p.bcrypt)
  const linkColor = p.link === 'eq' ? C.yellow : C.green
  return (
    <>
      <Avatar x={XL} name="alice" p={p.av} cracked={p.cracked} />
      <Avatar x={XR} name="bob" p={p.av} cracked={p.cracked} />
      {[XL, XR].map((x, i) => (
        <div key={i}>
          <div style={{ position: 'absolute', top: 470, left: x - 170, width: 340, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 10 * p.salt, opacity: Math.min(1, p.pw) }}>
            <div style={{ fontFamily: mono, fontSize: 34, color: C.white, padding: '8px 18px', borderRadius: 14, border: `3px solid ${mixColor(C.dim, C.yellow, p.pwGlow)}`, background: '#06090D', boxShadow: boxGlow(C.yellow, p.pwGlow * 0.6) }}>hunter2</div>
            {p.salt > 0 && (
              <>
                <span style={{ fontFamily: sans, fontSize: 34, color: C.grey, opacity: p.salt, width: 24 * Math.min(1, p.salt), overflow: 'hidden', textAlign: 'center' }}>+</span>
                <div style={{ fontFamily: mono, fontSize: 34, color: SALT, padding: '8px 14px', borderRadius: 14, border: `3px solid ${SALT}`, background: rgba(SALT, 0.1), boxShadow: boxGlow(SALT, 0.6), opacity: Math.min(1, p.salt), transform: `translateY(${(1 - Math.min(1, p.salt)) * -40}px)`, maxWidth: 130 * Math.min(1, p.salt), overflow: 'hidden' }}>
                  {BC[i].salt}
                </div>
              </>
            )}
          </div>
          <Arrow x1={x} y1={548} x2={x} y2={592} at={p.arrowsAt} dur={8} color={C.grey} head={12} />
          <div
            style={{
              position: 'absolute', top: 600, left: x - 130, width: 260, height: 80, borderRadius: 18, border: `3px solid ${fnColor}`, display: 'grid', placeItems: 'center',
              background: '#061017', fontFamily: mono, fontSize: 34, color: C.white, opacity: Math.min(1, p.fnP), boxShadow: boxGlow(fnColor, 0.35 + p.bcrypt * 0.4),
            }}
          >
            <span style={{ position: 'absolute', opacity: 1 - p.bcrypt }}>SHA-256</span>
            <span style={{ position: 'absolute', opacity: p.bcrypt, color: SLOW }}>bcrypt</span>
          </div>
          <Arrow x1={x} y1={688} x2={x} y2={730} at={p.arrowsAt + 6} dur={8} color={C.grey} head={12} />
          <div style={{ position: 'absolute', top: 740, left: x - 175, width: 350, display: 'flex', justifyContent: 'center', opacity: p.hashP > 0 ? 1 : 0 }}>
            <div style={{ fontFamily: mono, fontSize: 31, color: p.hashColor, padding: '10px 18px', borderRadius: 14, border: `3px solid ${p.hashGlow > 0 ? p.hashColor : C.dim}`, background: '#06090D', boxShadow: boxGlow(p.hashColor, p.hashGlow * 0.7), whiteSpace: 'pre' }}>
              {p.hashes[i]}
            </div>
          </div>
        </div>
      ))}
      <div style={{ position: 'absolute', top: 730, left: 430, width: 100, textAlign: 'center', fontFamily: sans, fontWeight: 600, fontSize: 80, lineHeight: 1, color: linkColor, opacity: Math.min(1, p.linkP), transform: `scale(${0.4 + 0.6 * Math.min(1, p.linkP)})`, textShadow: textGlow(linkColor, 0.9) }}>
        {p.link === 'eq' ? '=' : '≠'}
      </div>
    </>
  )
}

const TABLE = [
  { h: SHORT, pw: 'hunter2', match: true },
  { h: '5e884898…42d8', pw: 'password' },
  { h: '8d969eef…6c92', pw: '123456' },
  { h: '65e84be3…37c5', pw: 'qwerty' },
]

function LookupTable({ p, at, matchP, crackP, dead }: { p: number; at: number; matchP: number; crackP: number; dead: number }) {
  const frame = useCurrentFrame()
  return (
    <div style={{ position: 'absolute', top: 884, left: 70, width: 820, opacity: p, border: `2px solid ${C.dim}`, borderRadius: 24, padding: '18px 26px 14px', background: '#06090D' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
        <Table2 size={30} color={C.grey} strokeWidth={2.2} />
        <Label>precomputed table</Label>
        <span style={{ marginLeft: 'auto', fontFamily: sans, fontSize: 28, color: C.grey }}>hash → password</span>
      </div>
      {TABLE.map((r, i) => {
        const shown = frame >= at + i * 4
        const m = r.match ? matchP : 0
        const c = r.match ? mixColor(mixColor(C.white, C.yellow, matchP), C.red, crackP) : C.white
        const dz = r.match ? dead : 0
        return (
          <div
            key={i}
            style={{
              position: 'relative', display: 'flex', alignItems: 'center', height: 56, padding: '0 16px', borderRadius: 12, fontFamily: mono, fontSize: 32,
              opacity: shown ? (r.match ? 1 : 0.75) * (1 - dz * 0.5) : 0, color: dz > 0 ? mixColor(c, C.grey, dz) : c,
              background: m > 0 && dz < 1 ? rgba(crackP > 0 ? C.red : C.yellow, 0.14 * m * (1 - dz)) : 'transparent', boxShadow: m > 0 && dz < 1 ? boxGlow(crackP > 0 ? C.red : C.yellow, m * 0.7 * (1 - dz)) : 'none',
            }}
          >
            <span style={{ flex: 1 }}>{r.h}</span>
            <span>{r.pw}</span>
            {dz > 0 && <div style={{ position: 'absolute', left: 12, right: 12, top: 27, height: 3, background: C.grey, transform: `scaleX(${dz})`, transformOrigin: 'left' }} />}
          </div>
        )
      })}
    </div>
  )
}

function Twins() {
  const frame = useCurrentFrame()
  const identical = useCue('identical', 18)
  const give = useCue('give', 53)
  const identical2 = useWordFrame(4)
  const hashes = useCue('hashes', 73)
  const pre = useCue('precomputed', 112)
  const table = useCue('table', 134)
  const cracks = useCue('cracks', 144)

  const av = useSpr(4, 14)
  const pw = useSpr(10, 14)
  const pwGlow = interpolate(frame, [identical - 2, identical + 8, give, give + 12], [0, 1, 1, 0.2], clamp)
  const fnP = useSpr(give - 8, 14)
  const hashP = interpolate(frame, [identical2 - 4, identical2 + 14], [0, 1], clamp)
  const link = useSpr(hashes - 2, 11)
  const hashGlow = interpolate(frame, [hashes - 2, hashes + 8], [0, 1], clamp)
  const tableP = useP(pre - 6, 12)
  const matchP = useP(table - 2, 8)
  const crackP = useP(cracks - 2, 8)
  const cracked = useSpr(cracks + 2, 10)
  const hashText = scrambleText('', SHORT, hashP, frame, 'tw')
  const hashColor = mixColor(mixColor(C.white, C.yellow, hashGlow), C.red, crackP)
  return (
    <>
      <Title from={2} top={150} size={78}>
        Same password, <span style={{ color: C.yellow }}>same hash</span>
      </Title>
      <Pair
        av={av} pw={pw} pwGlow={pwGlow} salt={0} fnP={fnP} bcrypt={0} hashP={hashP} hashes={[hashText, hashText]} hashColor={hashColor}
        hashGlow={Math.max(hashGlow, crackP)} link="eq" linkP={link} cracked={cracked} arrowsAt={give - 4}
      />
      <Arrow x1={XL} y1={808} x2={XL} y2={876} at={table - 4} dur={8} color={C.yellow} head={12} dash="8 10" />
      <Arrow x1={XR} y1={808} x2={XR} y2={876} at={table - 4} dur={8} color={C.yellow} head={12} dash="8 10" />
      <LookupTable p={tableP} at={pre - 4} matchP={matchP} crackP={crackP} dead={0} />
      <Sfx t={T} name="impact" at={cracks} volume={0.5} />
    </>
  )
}

function Salt() {
  const frame = useCurrentFrame()
  const bcrypt = useCue('bcrypt', 30)
  const random_ = useCue('random', 79)
  const same = useCue('same', 146)
  const different = useCue('different', 174)

  const morph = useP(bcrypt - 4, 14)
  const saltP = useSpr(random_ - 2, 12)
  const remix = interpolate(frame, [same - 2, different + 2], [0, 1], clamp)
  const link = useSpr(different - 2, 10)
  const dead = useP(different + 6, 14)
  const newColor = remix >= 1 ? SLOW : C.white
  const render = (i: number) => {
    if (remix <= 0) return SHORT
    if (remix >= 1)
      return (
        <>
          <span style={{ color: C.grey }}>{BC[i].pre}</span>
          <span style={{ color: SALT }}>{BC[i].salt}</span>
          <span style={{ color: SLOW }}>{BC[i].tail}</span>
        </>
      )
    return scrambleText(SHORT, BC[i].pre + BC[i].salt + BC[i].tail, remix, frame, `s${i}`)
  }
  return (
    <>
      <Title from={2} top={150} size={78}>
        Claude switched to <span style={{ color: SLOW }}>bcrypt</span>
      </Title>
      <Pair
        av={1} pw={1} pwGlow={0} salt={saltP} fnP={1} bcrypt={morph} hashP={1} hashes={[render(0), render(1)]} hashColor={newColor}
        hashGlow={remix >= 1 ? 1 : 0} link={frame >= different - 2 ? 'neq' : 'eq'} linkP={frame >= different - 2 ? link : 1 - remix} cracked={0} arrowsAt={-20}
      />
      <LookupTable p={0.4 + remix * 0.6} at={-40} matchP={1} crackP={0} dead={dead} />
      <Pop at={different + 12} rise={10} style={{ top: 1222, left: 70, right: 190, textAlign: 'center', fontFamily: sans, fontWeight: 600, fontSize: 36, color: SLOW }}>
        No match. The table is useless.
      </Pop>
      <Sfx t={T} name="vault" at={different + 6} volume={0.5} />
    </>
  )
}

function Dial({ v, cx, cy, r }: { v: number; cx: number; cy: number; r: number }) {
  const ang = (c: number) => Math.PI + ((c - 4) / 10) * Math.PI
  const pt = (c: number, rr: number) => [cx + rr * Math.cos(ang(c)), cy + rr * Math.sin(ang(c))]
  const segs = 60
  return (
    <svg viewBox="0 0 1080 1920" style={{ position: 'absolute', inset: 0, overflow: 'visible' }}>
      {Array.from({ length: segs }).map((_, i) => {
        const a = 4 + (10 * i) / segs
        const b = 4 + (10 * (i + 1)) / segs
        const [x1, y1] = pt(a, r)
        const [x2, y2] = pt(b, r)
        const on = b <= v + 0.001
        const col = mixColor(C.red, C.green, i / segs)
        return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke={on ? col : C.dim} strokeWidth={on ? 16 : 10} strokeLinecap="butt" style={{ filter: on ? `drop-shadow(0 0 8px ${col})` : undefined }} />
      })}
      {Array.from({ length: 11 }).map((_, i) => {
        const c = 4 + i
        const [x1, y1] = pt(c, r - 26)
        const [x2, y2] = pt(c, r - (c % 2 ? 40 : 52))
        const [lx, ly] = pt(c, r + 46)
        return (
          <g key={c}>
            <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={C.grey} strokeWidth={c % 2 ? 3 : 5} />
            {c % 2 === 0 && (
              <text x={lx} y={ly + 11} textAnchor="middle" fill={Math.abs(c - v) < 0.5 ? C.white : C.grey} style={{ fontFamily: mono, fontSize: 32 }}>
                {c}
              </text>
            )}
          </g>
        )
      })}
      {(() => {
        const [nx, ny] = pt(v, r - 64)
        const col = mixColor(C.red, C.green, (v - 4) / 10)
        return (
          <g>
            <line x1={cx} y1={cy} x2={nx} y2={ny} stroke={C.white} strokeWidth={8} strokeLinecap="round" style={{ filter: `drop-shadow(0 0 10px ${col})` }} />
            <circle cx={cx} cy={cy} r={20} fill="#0B1117" stroke={col} strokeWidth={6} />
          </g>
        )
      })()}
    </svg>
  )
}

function Cost() {
  const frame = useCurrentFrame()
  const work = useCue('work', 64)
  const twelve = useCue('twelve', 84)
  const gpu = useCue('gpu', 114)
  const drops = useCue('drops', 135)
  const thousand = useCue('thousand', 220)

  const dial = useSpr(2, 15)
  const sweep = interpolate(frame, [work - 4, twelve + 4], [0, 1], { ...clamp, easing: Easing.bezier(0.3, 0, 0.1, 1) })
  const v = lerp(4, 12, sweep)
  const rounds = useP(twelve + 4, 12)
  const counter = useSpr(gpu - 8, 14)
  const fall = interpolate(frame, [drops, thousand + 4], [0, 1], { ...clamp, easing: Easing.inOut(Easing.cubic) })
  const value = Math.pow(10, lerp(Math.log10(2e10), 3, fall))
  const done = frame >= thousand + 4
  const col = mixColor(C.red, C.green, fall)
  return (
    <>
      <Title from={2} top={150} size={84}>
        <span style={{ color: SLOW }}>Slow</span> on purpose
      </Title>
      <div style={{ position: 'absolute', inset: 0, opacity: Math.min(1, dial), transform: `translateY(${(1 - dial) * 30}px)` }}>
        <Dial v={v} cx={540} cy={650} r={280} />
        <div style={{ position: 'absolute', top: 452, left: 340, width: 400, textAlign: 'center' }}>
          <Label style={{ color: C.grey }}>work factor</Label>
          <div style={{ fontFamily: sans, fontWeight: 700, fontSize: 92, lineHeight: 1.05, color: mixColor(C.red, C.green, (v - 4) / 10), fontVariantNumeric: 'tabular-nums' }}>{Math.round(v)}</div>
        </div>
        <div style={{ position: 'absolute', top: 694, left: 70, width: 940, textAlign: 'center', fontFamily: sans, fontSize: 36, color: C.white, opacity: rounds }}>
          2<sup style={{ fontSize: 22 }}>12</sup> = <span style={{ color: SLOW }}>4,096</span> rounds per hash
        </div>
      </div>
      <div style={{ position: 'absolute', top: 828, left: 70, width: 820, textAlign: 'center', opacity: Math.min(1, counter), transform: `translateY(${(1 - Math.min(1, counter)) * 20}px)` }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 12 }}>
          <Cpu size={30} color={C.grey} strokeWidth={2.2} />
          <Label>same GPU, guesses per second</Label>
        </div>
        <div style={{ fontFamily: sans, fontWeight: 700, fontSize: 100, lineHeight: 1.1, letterSpacing: -3, marginTop: 8, fontVariantNumeric: 'tabular-nums', color: col, textShadow: textGlow(col, 0.7) }}>
          {done ? '~1,000' : fmt(value)}
        </div>
      </div>
      <div style={{ position: 'absolute', top: 1050, left: 90, width: 780, height: 26, borderRadius: 13, background: '#0B1117', border: `2px solid ${C.dim}`, opacity: Math.min(1, counter), overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${Math.max(0.8, (Math.log10(value) / Math.log10(2e10)) * 100)}%`, background: col, boxShadow: `0 0 20px ${col}` }} />
      </div>
      <div style={{ position: 'absolute', top: 1086, left: 90, width: 780, display: 'flex', justifyContent: 'space-between', fontFamily: mono, fontSize: 28, color: C.grey, opacity: Math.min(1, counter) }}>
        <span>1</span>
        <span>log scale</span>
        <span>20 billion</span>
      </div>
      <Pop at={thousand - 8} rise={10} style={{ top: 1196, left: 70, right: 190, textAlign: 'center', fontFamily: sans, fontWeight: 600, fontSize: 38, color: SLOW }}>
        About twenty million times slower
      </Pop>
      <Sfx t={T} name="dial" at={work - 4} volume={0.55} />
      <Sfx t={T} name="success" at={thousand + 4} volume={0.3} />
    </>
  )
}

function Takeaway() {
  const fast = useCue('fast', 5)
  const salt = useCue('salt', 46)
  const slow = useCue('slow', 70)
  const a = useSpr(salt - 4, 12)
  const b = useSpr(slow - 4, 12)
  const card = (p: number, color: string, icon: ReactNode, title: string, sub: string) => (
    <div
      style={{
        width: 430, padding: '30px 24px 28px', borderRadius: 30, border: `3px solid ${color}`, background: rgba(color, 0.07), boxShadow: boxGlow(color, 0.7 * Math.min(1, p)),
        opacity: Math.min(1, p), transform: `translateY(${(1 - Math.min(1, p)) * 40}px) scale(${0.92 + 0.08 * Math.min(1, p)})`, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14,
      }}
    >
      {icon}
      <div style={{ fontFamily: serif, fontStyle: 'italic', fontSize: 70, color, lineHeight: 1 }}>{title}</div>
      <div style={{ fontFamily: sans, fontSize: 32, color: C.grey, textAlign: 'center', lineHeight: 1.3 }}>{sub}</div>
    </div>
  )
  return (
    <>
      <div style={{ position: 'absolute', top: 210, left: 70, right: 70, height: 120 }}>
        <SerifLine at={fast - 2} size={100} style={{ left: 0, right: 0, textAlign: 'center' }}>
          <span style={{ color: C.red, textShadow: textGlow(C.red, 0.6) }}>Fast</span> is the enemy.
        </SerifLine>
      </div>
      <div style={{ position: 'absolute', top: 400, left: 70, right: 70, display: 'flex', justifyContent: 'space-between' }}>
        {card(a, SALT, <Sparkles size={72} color={SALT} strokeWidth={1.8} />, 'Salt it', 'unique hash per user')}
        {card(b, SLOW, <Gauge size={72} color={SLOW} strokeWidth={1.8} />, 'Slow it down', 'expensive to guess')}
      </div>
      <CodeCard
        y={850}
        size={30}
        at={fast + 22}
        tool="Update(src/auth/signup.ts)"
        lines={[
          { at: fast + 30, kind: 'del', segs: [pl('hash = '), fn('sha256'), pl('(password)')] },
          { at: fast + 38, kind: 'add', segs: [pl('hash = '), kw('await '), pl('bcrypt.'), fn('hash'), pl('(password, 12)')] },
        ]}
      />
    </>
  )
}

export function HashingReel() {
  return (
    <Stage>
      <ReelAudio t={T} musicVolume={0.24} />
      <Scene t={T} id="hook"><Hook /></Scene>
      <Scene t={T} id="gpu"><Gpu /></Scene>
      <Scene t={T} id="twins"><Twins /></Scene>
      <Scene t={T} id="salt"><Salt /></Scene>
      <Scene t={T} id="cost"><Cost /></Scene>
      <Scene t={T} id="takeaway"><Takeaway /></Scene>
      <Captions t={T} />
    </Stage>
  )
}
