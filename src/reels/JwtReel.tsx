import { Eye, KeyRound, LockOpen, Server, ShieldCheck } from 'lucide-react'
import { Easing, interpolate, useCurrentFrame } from 'remotion'
import { Captions, ReelAudio, Scene, Sfx, buildTimeline, useCue, useScene, type Manifest } from './audio'
import manifest from './audio/jwt.json'
import { Arrow, CodeCard, Label, Pill, Pop, Scramble, SerifLine, boxGlow, fn, jitter, kw, lerp, mixColor, pl, rgba, scrambleText, str, textGlow, useP, useSpr } from './kit-auth'
import { C, Stage, Title, mono, sans } from './primitives'
import script from './scripts/jwt.json'

const T = buildTimeline(script, manifest as unknown as Manifest)
export const JWT_REEL_FRAMES = T.total

const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const

// A real HS256 token: {"alg":"HS256","typ":"JWT"} . {"sub":"42","role":"user","email":"mira@devmail.io"} . HMAC
const H = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9'
const P = 'eyJzdWIiOiI0MiIsInJvbGUiOiJ1c2VyIiwiZW1haWwiOiJtaXJhQGRldm1haWwuaW8ifQ'
const S = 'e_sh5fDznFQQonpiz85SA5diXN3OCVuockwgUuiHqEk'
// HMAC of the same header with role "admin": what the server computes for a tampered token
const S2 = 'F-mOUSaK21v--3b9goP8cURKC3bE26NGnNQb_qQKWCQ'
const HC = C.teal
const PC = C.purple
const SC = C.blue
const TOKEN_LEN = H.length + P.length + S.length + 2

// Content below y 800 lives in x 70-890 (the feed's action rail covers the right edge), so it centres on x 480
const COL = { left: 70, width: 820 }

function TokenText({ n, hlPayload = 0, dots = 0 }: { n: number; hlPayload?: number; dots?: number }) {
  const parts: [string, string][] = [[H, HC], [P, PC], [S, SC]]
  let left = n
  const out = []
  for (let i = 0; i < 3; i++) {
    const [t, c] = parts[i]
    const k = Math.max(0, Math.min(t.length, left))
    left -= t.length
    out.push(
      <span key={i} style={{ color: c, background: i === 1 && hlPayload > 0 ? rgba(PC, 0.24 * hlPayload) : undefined, textShadow: i === 1 ? textGlow(PC, hlPayload * 0.8) : undefined, borderRadius: 6 }}>
        {t.slice(0, k)}
      </span>,
    )
    if (i < 2 && left > 0) {
      out.push(
        <span key={`d${i}`} style={{ color: mixColor(C.white, C.yellow, dots), display: 'inline-block', transform: `scale(${1 + dots * 0.9})`, textShadow: textGlow(C.yellow, dots), margin: `0 ${dots * 6}px` }}>
          .
        </span>,
      )
      left -= 1
    }
  }
  return <>{out}</>
}

function TokenCard({ y, n, hlPayload, dots, opacity = 1 }: { y: number; n: number; hlPayload?: number; dots?: number; opacity?: number }) {
  const frame = useCurrentFrame()
  return (
    <div style={{ position: 'absolute', top: y, left: 70, right: 70, opacity, background: '#090D12', border: `2px solid ${C.dim}`, borderRadius: 26, padding: '24px 32px 26px' }}>
      <div style={{ fontFamily: mono, fontSize: 28, color: C.grey, marginBottom: 8 }}>
        Authorization: <span style={{ color: C.white }}>Bearer</span>
      </div>
      <div style={{ fontFamily: mono, fontSize: 32, lineHeight: 1.45, wordBreak: 'break-all', minHeight: 186 }}>
        <TokenText n={n} hlPayload={hlPayload} dots={dots} />
        {n < TOKEN_LEN && n > 0 && <span style={{ color: C.blue, opacity: Math.floor(frame / 6) % 2 ? 1 : 0.3 }}>▍</span>}
      </div>
    </div>
  )
}

function Hook() {
  const frame = useCurrentFrame()
  const tok = useCue('token', 20)
  const anyone = useCue('anyone', 55)
  const read = useCue('read', 82)
  const claude = useCue('claude', 97)
  const route = useCue('admin', 155)

  const n = Math.round(interpolate(frame, [tok - 10, tok + 24], [0, TOKEN_LEN], { ...clamp, easing: Easing.out(Easing.quad) }))
  const hl = useP(anyone, 16)
  const json = useSpr(read - 6, 15)
  const lines = [
    { src: P.slice(0, 16), t: '{ "sub": "42",' },
    { src: P.slice(16, 36), t: '  "role": "user",' },
    { src: P.slice(36, 66), t: '  "email": "mira@devmail.io" }' },
  ]
  return (
    <>
      <Title from={2} top={150} size={84}>
        Your login token
        <br />
        <span style={{ color: C.yellow }}>isn't secret.</span>
      </Title>
      <TokenCard y={392} n={n} hlPayload={hl} />
      <Arrow x1={480} y1={648} x2={480} y2={706} at={read - 10} dur={10} color={PC} width={4} head={14} />
      <div
        style={{
          position: 'absolute', top: 716, ...COL, opacity: Math.min(1, json), transform: `translateY(${(1 - json) * 24}px)`,
          border: `3px solid ${PC}`, borderRadius: 24, padding: '22px 30px', background: '#07060B', boxShadow: boxGlow(PC, 0.6 * json),
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
          <Eye size={30} color={PC} strokeWidth={2.4} />
          <Label color={PC}>payload, decoded</Label>
          <span style={{ fontFamily: sans, fontSize: 28, color: C.grey, marginLeft: 'auto' }}>no key needed</span>
        </div>
        {lines.map((l, i) => (
          <div key={i} style={{ fontFamily: mono, fontSize: 34, lineHeight: 1.45, color: C.white, whiteSpace: 'pre' }}>
            <Scramble source={l.src} text={l.t} at={read - 4 + i * 5} dur={20} />
          </div>
        ))}
      </div>
      <CodeCard
        y={1074}
        size={31}
        at={claude - 2}
        tool="Read(src/routes/admin.ts)"
        lines={[
          { at: claude + 6, segs: [kw('const '), pl('token = '), fn('bearer'), pl('(req)')] },
          { at: claude + 12, hl: route - 6, segs: [kw('const '), pl('user = jwt.'), fn('decode'), pl('(token)')] },
          { at: claude + 18, segs: [kw('if '), pl('(user.role === '), str("'admin'"), pl(') '), fn('next'), pl('()')] },
        ]}
      />
      <Sfx t={T} name="decode" at={read - 4} volume={0.45} />
    </>
  )
}

function Parts() {
  const frame = useCurrentFrame()
  const three = useCue('three', 39)
  const chunks = useCue('chunks', 47)
  const first = useCue('first', 78)
  const base = useCue('base', 107)
  const encoded = useCue('encoded', 148)
  const not = useCue('not', 172)

  const dots = interpolate(frame, [three - 4, three + 6, chunks + 6, chunks + 14], [0, 1, 1, 0], clamp)
  const cardOut = useP(chunks + 4, 10)
  const focus = useP(first, 14)
  const rows = [
    { name: 'header', c: HC, src: H, dec: '{"alg":"HS256","typ":"JWT"}', y: 312, at: chunks + 12 },
    { name: 'payload', c: PC, src: P, dec: '{"sub":"42","role":"user",\n "email":"mira@devmail.io"}', y: 450, at: chunks + 18 },
    { name: 'signature', c: SC, src: S, dec: null, y: 634, at: chunks + 24 },
  ]
  const lock = useSpr(encoded - 4, 11)
  const baseP = useP(base - 2, 10)
  return (
    <>
      <Title from={2} top={150} size={80}>A JWT is three chunks</Title>
      {cardOut < 1 && <TokenCard y={318} n={TOKEN_LEN} dots={dots} opacity={1 - cardOut} />}
      {rows.map((r, i) => {
        const isSig = r.dec === null
        const glow = isSig ? 0 : focus
        return (
          <Pop key={r.name} at={r.at} rise={0} from={0.97} style={{ top: r.y, left: 70, width: 940 }}>
            <div
              style={{
                border: `3px solid ${isSig ? r.c : mixColor(r.c, C.yellow, focus * 0.55)}`, borderRadius: 22, padding: '14px 26px 16px', background: '#06090D',
                opacity: isSig ? 1 - focus * 0.6 : 1, boxShadow: boxGlow(C.yellow, glow * 0.45),
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Label color={r.c}>{r.name}</Label>
                {!isSig && <Pill color={C.yellow} style={{ fontSize: 26, padding: '2px 16px', opacity: baseP }}>base64</Pill>}
              </div>
              <div style={{ fontFamily: mono, fontSize: 32, lineHeight: 1.42, color: C.white, wordBreak: 'break-all', whiteSpace: 'pre-wrap', marginTop: 4 }}>
                {r.dec ? <Scramble source={r.src} text={r.dec} at={base + 2 + i * 6} dur={26} seed={r.name} style={{ color: frame > base + 2 + i * 6 ? C.white : r.c }} /> : <span style={{ color: r.c }}>{r.src}</span>}
              </div>
            </div>
          </Pop>
        )
      })}
      <div style={{ position: 'absolute', top: 836, left: 70, right: 190, display: 'flex', justifyContent: 'center', opacity: Math.min(1, lock), transform: `scale(${0.6 + 0.4 * lock}) rotate(${(1 - lock) * -12}deg)` }}>
        <LockOpen size={92} color={C.yellow} strokeWidth={2} style={{ filter: `drop-shadow(0 0 18px ${rgba(C.yellow, 0.6)})` }} />
      </div>
      <div style={{ position: 'absolute', top: 966, left: 70, right: 190, height: 100 }}>
        <SerifLine at={encoded - 2} size={76} color={C.yellow} style={{ left: 0, right: 0, textAlign: 'center' }}>
          Encoded,<span style={{ color: frame >= not - 2 ? C.white : 'transparent' }}> not encrypted.</span>
        </SerifLine>
      </div>
      <Pop at={not + 10} rise={14} style={{ top: 1098, left: 70, right: 190, textAlign: 'center', fontFamily: sans, fontSize: 36, lineHeight: 1.35, color: C.grey }}>
        Anyone can reverse base64. No key required.
      </Pop>
    </>
  )
}

// Quadratic bezier point, for dots flowing along an arrow
function qp(x1: number, y1: number, x2: number, y2: number, bend: number, t: number) {
  const mx = (x1 + x2) / 2 - (y2 - y1) * bend
  const my = (y1 + y2) / 2 + (x2 - x1) * bend
  const u = 1 - t
  return [u * u * x1 + 2 * u * t * mx + t * t * x2, u * u * y1 + 2 * u * t * my + t * t * y2]
}

function Sign() {
  const frame = useCurrentFrame()
  const admin = useCue('admin', 65)
  const signature = useCue('signature', 119)
  const fingerprint = useCue('fingerprint', 155)
  const those = useCue('those', 181)
  const secret = useCue('secret', 232)
  const only = useCue('only', 247)
  const server = useCue('server', 263)

  const pulse = interpolate(frame, [admin - 4, admin + 6, admin + 30], [0, 1, 0.25], clamp)
  const machine = useSpr(signature - 6, 14)
  const busy = interpolate(frame, [those, those + 20, only + 4, only + 30], [0, 1, 1, 0.35], clamp)
  const key = useSpr(secret - 6, 13)
  const keyIn = useP(secret + 6, 14)
  const out = useP(only - 2, 18)
  const filled = frame >= only + 2
  const box = useP(server - 6, 26)
  const slot = useP(signature, 12)
  const MX = 560
  const MY = 700
  const flows = [
    { x1: 280, y1: 470, x2: MX - 90, y2: MY - 74, bend: -0.12, c: HC },
    { x1: 730, y1: 470, x2: MX + 90, y2: MY - 74, bend: 0.12, c: PC },
  ]
  return (
    <>
      <Title from={2} top={150} size={74}>
        What stops you making
        <br />
        yourself <span style={{ color: C.red }}>admin</span>?
      </Title>
      <Pop at={4} rise={10} style={{ top: 386, left: 110 }}>
        <Pill color={HC} style={{ fontFamily: mono, fontWeight: 500, fontSize: 32 }}>{'{"alg":"HS256"}'}</Pill>
      </Pop>
      <Pop at={admin - 2} out={signature - 8} rise={18} style={{ top: 482, left: 590, display: 'flex', alignItems: 'center', gap: 14, fontFamily: mono, fontSize: 36, color: C.red, textShadow: textGlow(C.red, 0.6) }}>
        <span style={{ color: C.grey }}>user</span> → admin?
      </Pop>
      <Pop at={8} rise={10} style={{ top: 386, left: 548 }}>
        <Pill color={PC} glow={pulse} style={{ fontFamily: mono, fontWeight: 500, fontSize: 32 }}>
          <span>
            {'{"role":"'}
            <span style={{ color: mixColor(C.purple, C.yellow, pulse), textShadow: textGlow(C.yellow, pulse) }}>user</span>
            {'"}'}
          </span>
        </Pill>
      </Pop>
      {flows.map((f, i) => (
        <Arrow key={i} {...f} at={fingerprint - 4} dur={18} color={f.c} width={4} />
      ))}
      <svg viewBox="0 0 1080 1920" style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
        {flows.flatMap((f, i) =>
          [0, 1, 2].map((k) => {
            const t = interpolate(frame, [those - 6 + k * 7, those + 14 + k * 7], [0, 1], { ...clamp, easing: Easing.in(Easing.quad) })
            if (t <= 0 || t >= 1) return null
            const [x, y] = qp(f.x1, f.y1, f.x2, f.y2, f.bend, t)
            return <circle key={`${i}${k}`} cx={x} cy={y} r={11} fill={f.c} style={{ filter: `drop-shadow(0 0 10px ${f.c})` }} />
          }),
        )}
      </svg>
      {/* server-only boundary around the key and the HMAC */}
      <div
        style={{
          position: 'absolute', left: 64, top: 596, width: 820, height: 214, borderRadius: 28, border: `3px dashed ${rgba(C.blue, 0.9 * box)}`,
          clipPath: `inset(0 ${(1 - box) * 100}% 0 0)`, background: rgba(C.blue, 0.04 * box),
        }}
      />
      <div style={{ position: 'absolute', left: 88, top: 752, display: 'flex', alignItems: 'center', gap: 10, opacity: box }}>
        <Server size={28} color={C.blue} strokeWidth={2.4} />
        <Label color={C.blue}>server only</Label>
      </div>
      <div
        style={{
          position: 'absolute', left: MX - 200, top: MY - 70, width: 400, height: 140, borderRadius: 24, border: `3px solid ${C.blue}`, background: '#061017',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', opacity: Math.min(1, machine), transform: `scale(${0.85 + 0.15 * machine})`,
          boxShadow: boxGlow(C.blue, 0.3 + busy * 0.9),
        }}
      >
        <div style={{ fontFamily: mono, fontSize: 38, color: C.white, letterSpacing: 1 }}>HMAC-SHA256</div>
        <div style={{ fontFamily: sans, fontSize: 28, color: C.grey, marginTop: 4 }}>fingerprint machine</div>
      </div>
      <div style={{ position: 'absolute', left: lerp(84, 96, keyIn), top: MY - 34, opacity: Math.min(1, key) * (1 - keyIn * 0.15), transform: `translateX(${(1 - key) * -60}px)` }}>
        <Pill color={C.yellow} glow={key * 0.8} style={{ padding: '10px 20px', fontSize: 30 }}>
          <KeyRound size={30} strokeWidth={2.4} /> secret
        </Pill>
      </div>
      <Arrow x1={300} y1={MY} x2={MX - 206} y2={MY} at={secret + 4} dur={10} color={C.yellow} width={4} head={14} />
      <Arrow x1={MX} y1={MY + 74} x2={MX - 80} y2={880} at={only - 6} dur={12} color={SC} width={4} />
      <div
        style={{
          position: 'absolute', top: 894, ...COL, borderRadius: 22, padding: '14px 26px 18px', background: '#050A10',
          border: `3px ${filled ? 'solid' : 'dashed'} ${filled ? SC : rgba(SC, 0.6)}`, boxShadow: boxGlow(SC, out * 0.9),
          opacity: slot,
        }}
      >
        <Label color={SC}>signature</Label>
        <div style={{ fontFamily: mono, fontSize: 30, color: SC, marginTop: 6, minHeight: 44, textShadow: textGlow(SC, out * 0.6) }}>
          {frame < only ? <span style={{ color: C.grey }}>?</span> : scrambleText('', S, interpolate(frame, [only, only + 18], [0, 1], clamp), frame, 'sig')}
        </div>
      </div>
      <Pop at={only + 10} rise={10} style={{ top: 1072, left: 70, right: 190, textAlign: 'center', fontFamily: mono, fontSize: 32, color: C.white }}>
        HMAC(<span style={{ color: HC }}>header</span>.<span style={{ color: PC }}>payload</span>, <span style={{ color: C.yellow }}>secret</span>)
      </Pop>
      <Sfx t={T} name="seal" at={only + 4} volume={0.55} />
    </>
  )
}

function Tamper() {
  const frame = useCurrentFrame()
  const change = useCue('change', 5)
  const fp = useCue('fingerprint', 47)
  const breaks = useCue('breaks', 64)
  const rejects = useCue('rejects', 107)
  const ifc = useCue('if', 139)

  const delStart = change + 6
  const typeStart = delStart + 10
  const del = Math.floor(interpolate(frame, [delStart, delStart + 8], [0, 4], clamp))
  const typed = Math.floor(interpolate(frame, [typeStart, typeStart + 12], [0, 5], clamp))
  const role = frame < typeStart ? 'user'.slice(0, 4 - del) : 'admin'.slice(0, typed)
  const editing = frame >= delStart && frame < typeStart + 16
  const redRole = frame >= typeStart
  const recompute = interpolate(frame, [fp - 6, breaks - 2], [0, 1], clamp)
  const neq = useSpr(breaks, 10)
  const shake = frame >= breaks && frame < breaks + 10 ? jitter(frame, 'sh', 7) : 0
  const stamp = useSpr(rejects - 2, 11, 0.8)
  const dimAll = useP(ifc - 4, 12)
  const fade = 1 - dimAll * 0.55
  const broken = frame >= breaks
  return (
    <>
      <Title from={2} top={150} size={84}>Change one letter</Title>
      <div style={{ position: 'absolute', top: 290, left: 70, right: 70, display: 'flex', justifyContent: 'center', opacity: fade }}>
        <div style={{ border: `3px solid ${redRole ? C.red : PC}`, borderRadius: 24, padding: '18px 40px', background: '#07060B', fontFamily: mono, fontSize: 46, color: C.white, boxShadow: boxGlow(redRole ? C.red : PC, 0.5) }}>
          {'"role": "'}
          <span style={{ color: redRole ? C.red : C.white, textShadow: redRole ? textGlow(C.red, 0.8) : 'none' }}>{role}</span>
          {editing && <span style={{ color: C.yellow, opacity: Math.floor(frame / 4) % 2 ? 1 : 0.2 }}>▍</span>}
          {'"'}
        </div>
      </div>
      <div style={{ position: 'absolute', top: 440, left: 70, width: 940, opacity: fade, transform: `translateX(${shake}px)` }}>
        <Pop at={fp - 14} rise={14}>
          <div style={{ width: 940, border: `3px solid ${SC}`, borderRadius: 20, padding: '12px 26px 14px', background: '#050A10' }}>
            <Label color={C.grey}>signature on the token</Label>
            <div style={{ fontFamily: mono, fontSize: 33, color: SC, marginTop: 4 }}>{S}</div>
          </div>
        </Pop>
        <div style={{ position: 'absolute', top: 120, left: 0, width: 940, textAlign: 'center', fontFamily: sans, fontWeight: 600, fontSize: 96, lineHeight: 1, color: C.red, opacity: Math.min(1, neq), transform: `scale(${0.4 + 0.6 * neq})`, textShadow: textGlow(C.red, 1) }}>
          ≠
        </div>
        <Pop at={fp - 8} rise={14} style={{ top: 222 }}>
          <div style={{ width: 940, border: `3px solid ${broken ? C.red : C.dim}`, borderRadius: 20, padding: '12px 26px 14px', background: '#0C0606', boxShadow: boxGlow(C.red, neq * 0.6) }}>
            <Label color={C.grey}>server recomputes it</Label>
            <div style={{ fontFamily: mono, fontSize: 33, color: broken ? C.red : C.white, marginTop: 4 }}>{scrambleText(S, S2, recompute, frame, 'rc')}</div>
          </div>
        </Pop>
      </div>
      <div
        style={{
          position: 'absolute', top: 870, left: 70, width: 820, display: 'flex', justifyContent: 'center',
          opacity: Math.min(1, stamp) * (1 - dimAll * 0.35), transform: `scale(${1.6 - 0.6 * Math.min(1.05, stamp)}) rotate(-5deg)`,
        }}
      >
        <div style={{ border: `8px solid ${C.red}`, borderRadius: 26, padding: '14px 54px 18px', textAlign: 'center', boxShadow: boxGlow(C.red, 0.9), background: rgba(C.red, 0.06) }}>
          <div style={{ fontFamily: sans, fontWeight: 700, fontSize: 112, lineHeight: 1, color: C.red, letterSpacing: -2 }}>401</div>
          <div style={{ fontFamily: sans, fontWeight: 700, fontSize: 32, letterSpacing: 6, color: C.red, marginTop: 6 }}>UNAUTHORIZED</div>
        </div>
      </div>
      <div style={{ position: 'absolute', top: 1196, left: 70, right: 190, height: 90 }}>
        <SerifLine at={ifc - 2} size={76} color={C.yellow} style={{ left: 0, right: 0, textAlign: 'center', textShadow: textGlow(C.yellow, 0.5) }}>
          …if it checks.
        </SerifLine>
      </div>
      <Sfx t={T} name="crack" at={breaks - 1} volume={0.6} />
      <Sfx t={T} name="error" at={rejects} volume={0.4} />
    </>
  )
}

// A tiny token (three coloured segments) travelling along the request track. Forged tokens carry a red payload.
function Packet({ start, forged, blocked, y, gate }: { start: number; forged?: boolean; blocked?: boolean; y: number; gate: number }) {
  const frame = useCurrentFrame()
  const t = frame - start
  if (t < 0) return null
  let x: number
  let o: number
  if (blocked) {
    const inP = interpolate(t, [0, 20], [0, 1], { ...clamp, easing: Easing.out(Easing.quad) })
    const back = interpolate(t, [20, 34], [0, 1], { ...clamp, easing: Easing.out(Easing.cubic) })
    x = lerp(84, gate - 118, inP) - back * 80
    o = interpolate(t, [28, 42], [1, 0], clamp)
  } else {
    x = interpolate(t, [0, 44], [84, 776], { ...clamp, easing: Easing.inOut(Easing.sin) })
    o = interpolate(t, [36, 46], [1, 0], clamp)
  }
  const passed = x > gate - 40
  const hit = blocked && t > 18
  const ring = hit ? C.red : forged && passed ? C.red : passed ? C.green : C.dim
  const s = interpolate(t, [0, 6], [0.6, 1], clamp)
  return (
    <div
      style={{
        position: 'absolute', left: x, top: y - 28, width: 108, height: 56, opacity: o, transform: `scale(${s}) translateX(${hit && t < 26 ? jitter(frame, 'pk', 5) : 0}px)`,
        display: 'flex', gap: 5, padding: 7, borderRadius: 14, border: `3px solid ${ring}`, background: '#05080C', boxShadow: boxGlow(ring, passed || hit ? 0.8 : 0),
      }}
    >
      <div style={{ flex: 2, borderRadius: 5, background: HC }} />
      <div style={{ flex: 3, borderRadius: 5, background: forged ? C.red : PC }} />
      <div style={{ flex: 2, borderRadius: 5, background: SC }} />
    </div>
  )
}

function Fix() {
  const frame = useCurrentFrame()
  const never = useCue('never', 34)
  const did = useCue('did', 51)
  const added = useCue('added', 92)
  const verification = useCue('verification', 102)
  const every = useCue('every', 129)
  const took = useCue('took', 173)
  const email = useCue('email', 182)
  const out = useCue('out', 193)

  const FY = 676
  const GATE = 480
  const track = useSpr(2, 16)
  const swap = useP(verification - 2, 12)
  const breach = interpolate(frame, [did - 2, did + 4, did + 26, did + 40], [0, 1, 1, 0], clamp)
  const gateGlow = interpolate(frame, [every, every + 10], [0.4, 1], clamp)
  const kill = useP(out - 4, 16)
  const warn = useP(email - 4, 8)
  const card = useSpr(took - 26, 15)
  const routeColor = mixColor(C.grey, C.red, breach)
  return (
    <>
      <Title from={2} top={150} size={74}>
        Verify, don't just <span style={{ color: C.red }}>decode</span>
      </Title>
      <CodeCard
        y={262}
        w={940}
        size={33}
        at={2}
        tool="Update(src/routes/admin.ts)"
        lines={[
          { at: never - 8, kind: 'del', segs: [kw('const '), pl('user = jwt.'), fn('decode'), pl('(token)')] },
          { at: added - 4, kind: 'add', segs: [kw('const '), pl('user = jwt.'), fn('verify'), pl('(token, SECRET)')] },
        ]}
      />
      {/* the request path into the admin route, with the check in the middle */}
      <div style={{ position: 'absolute', inset: 0, opacity: Math.min(1, track) }}>
        <div style={{ position: 'absolute', top: FY - 2, left: 84, width: 806, height: 4, borderRadius: 2, background: `linear-gradient(90deg, ${C.dim} 0%, ${C.dim} 50%, ${mixColor(C.dim, C.green, swap)} 50%)` }} />
        <div style={{ position: 'absolute', top: FY - 104, left: 84, fontFamily: sans, fontSize: 30, color: C.grey }}>every request</div>
        <div style={{ position: 'absolute', top: FY - 104, left: 890 - 300, width: 300, textAlign: 'right', fontFamily: sans, fontSize: 30, fontWeight: breach > 0.5 ? 700 : 400, color: routeColor, textShadow: textGlow(C.red, breach * 0.8) }}>
          admin route
        </div>
        <div style={{ position: 'absolute', top: FY + 44, left: 890 - 300, width: 300, textAlign: 'right', fontFamily: sans, fontWeight: 600, fontSize: 28, color: C.red, opacity: breach, textShadow: textGlow(C.red, 0.6) }}>
          forged admin, let in
        </div>
        <div style={{ position: 'absolute', top: FY + 92, left: GATE - 160, width: 320, height: 44, textAlign: 'center', fontFamily: mono, fontSize: 34 }}>
          <span style={{ position: 'absolute', left: 0, right: 0, color: C.grey, opacity: 1 - swap }}>decode()</span>
          <span style={{ position: 'absolute', left: 0, right: 0, color: C.green, opacity: swap, textShadow: textGlow(C.green, gateGlow * 0.6) }}>verify()</span>
        </div>
      </div>
      {/* before: a forged admin token walks straight through decode() */}
      <Packet start={did - 42} forged y={FY} gate={GATE} />
      <Packet start={did - 6} y={FY} gate={GATE} />
      {/* after: verify() lets real tokens through and bounces the forged one */}
      {[0, 1, 2, 3].map((i) => (
        <Packet key={i} start={every - 6 + i * 11} forged={i === 1} blocked={i === 1} y={FY} gate={GATE} />
      ))}
      {/* the gate is drawn over the packets so they read as passing through it */}
      <div style={{ position: 'absolute', inset: 0, opacity: Math.min(1, track) }}>
        <div
          style={{
            position: 'absolute', top: FY - 78, left: GATE - 8, width: 16, height: 156, borderRadius: 8,
            background: swap > 0 ? rgba(C.green, swap) : 'transparent', border: `3px dashed ${mixColor(C.grey, C.green, swap)}`, boxShadow: boxGlow(C.green, swap * gateGlow * 1.2),
          }}
        />
      </div>
      <div
        style={{
          position: 'absolute', top: 874, ...COL, opacity: Math.min(1, card), transform: `translateY(${(1 - card) * 26}px)`,
          border: `3px solid ${PC}`, borderRadius: 24, padding: '18px 30px 20px', background: '#07060B',
        }}
      >
        <Label color={PC}>payload</Label>
        <div style={{ fontFamily: mono, fontSize: 34, lineHeight: 1.45, color: C.white, marginTop: 6 }}>
          <div style={{ whiteSpace: 'pre' }}>{'{ "sub": "42",'}</div>
          <div style={{ whiteSpace: 'pre' }}>{kill > 0.5 ? '  "role": "user" }' : '  "role": "user",'}</div>
          <div style={{ height: 50 * (1 - kill), overflow: 'hidden' }}>
            <div
              style={{
                whiteSpace: 'pre', color: mixColor(C.white, C.red, warn), textShadow: textGlow(C.red, warn * 0.7), opacity: 1 - kill,
                transform: `translateX(${-kill * 120}px)`, textDecoration: warn > 0.5 ? 'line-through' : 'none', textDecorationColor: C.red,
              }}
            >
              {'  "email": "mira@devmail.io" }'}
            </div>
          </div>
        </div>
      </div>
      <Pop at={out + 8} rise={12} style={{ top: 1150, left: 70, right: 190, textAlign: 'center', fontFamily: sans, fontSize: 34, color: C.grey, lineHeight: 1.35 }}>
        Private data stays on the server.
      </Pop>
      <Sfx t={T} name="success" at={verification} volume={0.4} />
    </>
  )
}

function Takeaway() {
  const { durationInFrames } = useScene()
  const signed = useCue('signed', 5)
  const proof = useCue('tamper-proof', 43)
  const not = useCue('not', 77)
  const shield = useSpr(proof - 2, 11)
  const eye = useSpr(not - 2, 11)
  const glyph = useSpr(0, 16)
  const end = useP(durationInFrames - 30, 30)
  const segs = [
    { w: 170, c: HC },
    { w: 290, c: PC, icon: 'eye' },
    { w: 200, c: SC, icon: 'shield' },
  ]
  return (
    <>
      <div style={{ position: 'absolute', top: 360, left: 70, right: 190, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 20, opacity: Math.min(1, glyph), transform: `scale(${0.9 + 0.1 * glyph})` }}>
        {segs.map((s, i) => {
          const p = s.icon === 'shield' ? shield : s.icon === 'eye' ? eye : 0
          const ic = s.icon === 'shield' ? C.green : C.yellow
          return (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
              <div style={{ position: 'relative', width: s.w, height: 84, borderRadius: 18, background: rgba(s.c, 0.2), border: `4px solid ${p > 0 ? mixColor(s.c, ic, Math.min(1, p)) : s.c}`, boxShadow: boxGlow(ic, p * 0.9) }}>
                {s.icon && (
                  <div style={{ position: 'absolute', left: '50%', top: -128, transform: `translateX(-50%) scale(${p})`, opacity: Math.min(1, p) }}>
                    {s.icon === 'shield' ? (
                      <ShieldCheck size={96} color={C.green} strokeWidth={2} style={{ filter: `drop-shadow(0 0 16px ${rgba(C.green, 0.7)})` }} />
                    ) : (
                      <Eye size={96} color={C.yellow} strokeWidth={2} style={{ filter: `drop-shadow(0 0 16px ${rgba(C.yellow, 0.7)})` }} />
                    )}
                  </div>
                )}
              </div>
              {i < 2 && <div style={{ width: 14, height: 14, borderRadius: 7, background: C.white }} />}
            </div>
          )
        })}
      </div>
      <div style={{ position: 'absolute', top: 560, left: 70, right: 190, height: 220 }}>
        <SerifLine at={signed - 2} size={92} style={{ left: 0, right: 0, textAlign: 'center' }}>Signed means</SerifLine>
        <SerifLine at={proof - 2} size={92} color={C.green} style={{ left: 0, right: 0, top: 104, textAlign: 'center', textShadow: textGlow(C.green, 0.5) }}>
          tamper-proof.
        </SerifLine>
      </div>
      <div style={{ position: 'absolute', top: 836, left: 70, right: 190, height: 120 }}>
        <SerifLine at={not - 2} size={92} color={C.yellow} style={{ left: 0, right: 0, textAlign: 'center', textShadow: textGlow(C.yellow, 0.5) }}>
          Not secret.
        </SerifLine>
      </div>
      <div style={{ position: 'absolute', top: 1040, left: 70, right: 190, display: 'flex', justifyContent: 'center', opacity: useP(not + 18, 16) * (1 - end * 0.3) }}>
        <Pill color={C.green} style={{ fontFamily: mono, fontWeight: 500, fontSize: 32 }}>
          jwt.verify() on every request
        </Pill>
      </div>
      <Sfx t={T} name="ding" at={proof} volume={0.35} />
    </>
  )
}

export function JwtReel() {
  return (
    <Stage>
      <ReelAudio t={T} musicVolume={0.2} />
      <Scene t={T} id="hook"><Hook /></Scene>
      <Scene t={T} id="parts"><Parts /></Scene>
      <Scene t={T} id="sign"><Sign /></Scene>
      <Scene t={T} id="tamper"><Tamper /></Scene>
      <Scene t={T} id="fix"><Fix /></Scene>
      <Scene t={T} id="takeaway"><Takeaway /></Scene>
      <Captions t={T} />
    </Stage>
  )
}
