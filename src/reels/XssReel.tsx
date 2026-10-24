import type { ReactNode } from 'react'
import { Easing, interpolate, useCurrentFrame, useVideoConfig } from 'remotion'
import { Captions, ReelAudio, Scene, Sfx, buildTimeline, useCue, type Manifest } from './audio'
import manifest from './audio/xss.json'
import { C, Fade, Stage, Title, mono, sans, serif, useTween } from './primitives'
import { AttackerIcon, BlockedIcon, BoltIcon, BrowserCard, ClaudeChip, CodeLine, CookieIcon, DbCylinder, GlowDefs, Panel, PersonIcon, ShieldIcon, Tag, springAt } from './kit-input'
import script from './scripts/xss.json'

const T = buildTimeline(script, manifest as unknown as Manifest)
export const XSS_REEL_FRAMES = T.total

// Illustrative, non-functional payload: the point is "a tag that runs on error", not a working exploit
const BIO_TEXT = "hi! I'm new here"
const PAYLOAD = '<img src=x onerror="steal(cookie)">'
const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const
const ease = Easing.inOut(Easing.cubic)
const prog = (frame: number, a: number, b: number, easing: (t: number) => number = ease) => interpolate(frame, [a, Math.max(a + 1, b)], [0, 1], { ...clamp, easing })
const lerp = (a: number, b: number, t: number) => a + (b - a) * t
const rgba = (hex: string, a: number) => {
  const n = parseInt(hex.slice(1), 16)
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`
}

/** The attacker's profile card: avatar, name, then a bio area the scene fills. */
function ProfileCard({ top, border, glow = 0, p, children }: { top: number; border: string; glow?: number; p: number; children: ReactNode }) {
  return (
    <div
      style={{
        position: 'absolute', top, left: 190, width: 700, boxSizing: 'border-box', borderRadius: 28, padding: '30px 36px 34px', background: '#0A0E13',
        border: `3px solid ${border}`, boxShadow: `0 0 ${20 + 50 * glow}px ${rgba(border, 0.2 + 0.25 * glow)}`, opacity: Math.min(1, p), transform: `translateY(${(1 - p) * 40}px) scale(${0.95 + 0.05 * p})`,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 22 }}>
        <div style={{ width: 92, height: 92, borderRadius: 46, border: `4px solid ${C.purple}`, background: rgba(C.purple, 0.18), display: 'grid', placeItems: 'center', fontFamily: sans, fontWeight: 700, fontSize: 44, color: C.purple }}>N</div>
        <div>
          <div style={{ fontFamily: sans, fontWeight: 700, fontSize: 40, color: C.white }}>new_user_42</div>
          <div style={{ fontFamily: sans, fontSize: 28, color: C.grey }}>joined today · bio</div>
        </div>
      </div>
      <div style={{ height: 2, background: C.dim, margin: '24px 0 22px' }} />
      {children}
    </div>
  )
}

// Scene 1 — hook: an innocent-looking bio whose source is a script tag
function Hook() {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const steal = useCue('steal', 79)
  const everyone = useCue('everyone', 115)
  const views = useCue('views', 139)
  const claude = useCue('Claude', 169)
  const card = springAt(frame, fps, 8, 15)
  // x-ray: a scan line wipes across the bio and shows its source
  const scan = prog(frame, steal - 12, steal + 12)
  const danger = scan > 0.5
  const chip = springAt(frame, fps, claude - 2, 15)
  const people = [260, 400, 540, 680, 820]
  return (
    <>
      <Title from={4} top={150} size={74}>
        A bio that steals your session
      </Title>
      <ProfileCard top={300} border={danger ? C.red : C.purple} glow={danger ? 1 : 0} p={card}>
        <div style={{ position: 'relative', height: 132 }}>
          <div style={{ position: 'absolute', inset: 0, fontFamily: sans, fontSize: 40, color: C.white, lineHeight: 1.3, clipPath: `inset(-10% -10% -10% ${scan * 100}%)` }}>
            {BIO_TEXT}
          </div>
          <div style={{ position: 'absolute', inset: 0, fontFamily: mono, fontSize: 29, lineHeight: 1.45, color: C.white, clipPath: `inset(-10% ${100 - scan * 100}% -10% -10%)` }}>
            {BIO_TEXT} <span style={{ color: C.red, textShadow: '0 0 16px rgba(252,98,85,0.6)' }}>{PAYLOAD}</span>
          </div>
          {scan > 0 && scan < 1 && <div style={{ position: 'absolute', top: -8, bottom: -8, left: `${scan * 100}%`, width: 4, background: C.red, boxShadow: '0 0 24px 6px rgba(252,98,85,0.7)' }} />}
        </div>
      </ProfileCard>
      {/* everyone who views it */}
      <svg viewBox="0 0 1080 1920" style={{ position: 'absolute', inset: 0 }}>
        {people.map((x, i) => {
          const hit = prog(frame, views - 2 + i * 4, views + 10 + i * 4)
          return <line key={i} x1={540} y1={700} x2={x} y2={836} stroke={C.red} strokeWidth={3} opacity={0.8 * hit} pathLength={1} style={{ strokeDasharray: `${hit} 1` }} />
        })}
      </svg>
      {people.map((x, i) => {
        const p = springAt(frame, fps, Math.min(everyone - 6, 20) + i * 3, 13)
        const hit = frame >= views + 8 + i * 4
        return (
          <div key={i} style={{ opacity: Math.min(1, p * 1.4) }}>
            <PersonIcon x={x} y={890} size={92} color={hit ? C.red : C.white} glow={hit} />
            {hit && <CookieIcon x={x + 38} y={846} size={40} opacity={prog(frame, views + 8 + i * 4, views + 14 + i * 4)} />}
          </div>
        )
      })}
      <Fade from={views + 14} style={{ top: 990, left: 190, width: 700, textAlign: 'center', fontFamily: sans, fontWeight: 700, fontSize: 44, color: C.red }}>
        Looks like text. Runs like code.
      </Fade>
      <ClaudeChip top={1110} left={190} width={700} p={chip}>
        Claude caught this in your comments feature
      </ClaudeChip>
      <Sfx t={T} name="pop" at={8} volume={0.6} />
      <Sfx t={T} name="glitch" at={steal - 4} volume={0.32} />
      <Sfx t={T} name="error" at={views + 8} volume={0.13} />
    </>
  )
}

// Scene 2 — inject: dangerouslySetInnerHTML turns a bio string into real DOM
function Inject() {
  const frame = useCurrentFrame()
  const dang = useCue('dangerously', 43)
  const became = useCue('became', 170)
  const hl = interpolate(frame, [dang - 4, dang + 6, dang + 60], [0, 1, 0.5], clamp)
  const morph = useTween(became - 30, became - 4)
  const fire = prog(frame, became - 2, became + 10)
  return (
    <>
      <Title from={9} top={150} size={74} color={C.yellow}>
        The one dangerous prop
      </Title>
      <Panel from={6} top={290} color={C.dim}>
        <div style={{ fontFamily: mono, fontSize: 33, lineHeight: 1.6, whiteSpace: 'pre' }}>
          <span style={{ color: C.white }}>{'<div '}</span>
          <span style={{ color: C.red, borderRadius: 8, padding: '2px 4px', background: rgba(C.red, 0.2 * hl), boxShadow: `0 0 0 2px ${rgba(C.red, 0.9 * hl)}, 0 0 ${30 * hl}px ${rgba(C.red, 0.5 * hl)}` }}>dangerouslySetInnerHTML</span>
        </div>
        <CodeLine toks={[{ t: '  ={{ __html: ', c: C.grey }, { t: 'bio', c: C.purple }, { t: ' }} />', c: C.grey }]} style={{ fontSize: 33, lineHeight: 1.6 }} />
      </Panel>
      {/* the stored string */}
      <div style={{ position: 'absolute', top: 520, left: 160, width: 760, fontFamily: sans, fontSize: 28, color: C.grey, textAlign: 'center', opacity: prog(frame, 10, 22) }}>stored bio string</div>
      <div style={{ position: 'absolute', top: 562, left: 160, width: 760, boxSizing: 'border-box', border: `3px solid ${C.purple}`, borderRadius: 16, padding: '18px 24px', fontFamily: mono, fontSize: 29, lineHeight: 1.45, color: C.white, background: '#0A0E13', opacity: prog(frame, 10, 22) * (1 - 0.35 * morph) }}>
        <span style={{ color: C.grey }}>"</span>
        {BIO_TEXT} <span style={{ color: C.red }}>{PAYLOAD}</span>
        <span style={{ color: C.grey }}>"</span>
      </div>
      <svg viewBox="0 0 1080 1920" style={{ position: 'absolute', inset: 0 }}>
        <line x1={540} y1={690} x2={540} y2={772} stroke={C.yellow} strokeWidth={4} strokeDasharray="8 8" opacity={morph} />
        <path d="M 526 766 L 540 786 L 554 766 Z" fill={C.yellow} opacity={morph} />
      </svg>
      <div style={{ position: 'absolute', top: 712, left: 572, fontFamily: sans, fontSize: 28, color: C.yellow, opacity: morph }}>rendered as HTML</div>
      {/* what the browser builds from it */}
      <div style={{ opacity: morph, transform: `translateY(${(1 - morph) * 30}px)` }}>
        <BrowserCard x={190} y={810} w={700} h={316} color={fire > 0.5 ? C.red : C.dim} glow={fire > 0.5}>
          <div style={{ fontFamily: sans, fontSize: 36, color: C.white, padding: '4px 10px 0' }}>{BIO_TEXT}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 18, marginTop: 18, padding: '0 10px', whiteSpace: 'nowrap' }}>
            {/* a broken image: src=x fails to load, so onerror runs */}
            <svg viewBox="0 0 60 60" style={{ width: 60, height: 60, flexShrink: 0 }}>
              <rect x={4} y={8} width={52} height={44} rx={6} fill="none" stroke={C.grey} strokeWidth={4} strokeDasharray="6 5" />
              <path d="M 20 22 L 40 42 M 40 22 L 20 42" stroke={C.grey} strokeWidth={4} strokeLinecap="round" />
            </svg>
            <span style={{ fontFamily: mono, fontSize: 30, color: C.grey }}>image fails to load</span>
            <span style={{ fontFamily: sans, fontSize: 34, color: C.yellow }}>→</span>
            <span style={{ fontFamily: mono, fontSize: 30, color: C.yellow }}>onerror</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: 22 }}>
            <Tag color={C.red} glow={fire > 0.5} size={36} style={{ opacity: 0.3 + 0.7 * fire, transform: `scale(${0.9 + 0.1 * fire})`, padding: '12px 30px' }}>
              <BoltIcon size={38} color={C.red} />
              steal(cookie) runs
            </Tag>
          </div>
        </BrowserCard>
      </div>
      <Sfx t={T} name="typing" at={8} volume={0.4} />
      <Sfx t={T} name="glitch" at={became - 2} volume={0.32} />
    </>
  )
}

// Scene 3 — spread: stored once, runs in every visitor, cookies fly to the attacker
function Spread() {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const run = useCue('runs', 53)
  const cookieCue = useCue('cookie', 161)
  const attackerCue = useCue('attacker', 187)
  const db = springAt(frame, fps, 6, 14)
  const reach = (i: number) => prog(frame, run - 6 + i * 8, run + 10 + i * 8)
  const fly = (i: number) => prog(frame, cookieCue - 14 + i * 6, cookieCue + 14 + i * 6, (t) => t)
  const browsers = [190, 435, 680]
  const BW = 210
  const BY = 640
  const att = { x: 540, y: 1120 }
  const attIn = springAt(frame, fps, cookieCue - 20, 14)
  const stolen = browsers.filter((_, i) => fly(i) >= 1).length
  const hitGlow = prog(frame, attackerCue - 4, attackerCue + 6)
  return (
    <>
      <Title from={9} top={150} size={74} color={C.red}>
        Stored once, runs everywhere
      </Title>
      <svg viewBox="0 0 1080 1920" style={{ position: 'absolute', inset: 0 }}>
        <GlowDefs />
        <g opacity={db}>
          <DbCylinder x={540} y={390} w={150} h={150} color={C.red} glow />
        </g>
        {browsers.map((bx, i) => {
          const p = reach(i)
          const cx = bx + BW / 2
          return (
            <g key={i}>
              <line x1={540} y1={470} x2={cx} y2={BY} stroke={C.dim} strokeWidth={3} strokeDasharray="8 10" opacity={db} />
              {p > 0 && p < 1 && <circle cx={lerp(540, cx, p)} cy={lerp(470, BY, p)} r={12} fill={C.red} filter="url(#kglow)" />}
            </g>
          )
        })}
      </svg>
      <div style={{ position: 'absolute', top: 480, left: 0, right: 0, textAlign: 'center', fontFamily: sans, fontSize: 28, color: C.red, opacity: db }}>database</div>
      {browsers.map((bx, i) => {
        const r = reach(i)
        return (
          <div key={i} style={{ opacity: r }}>
            <BrowserCard x={bx} y={BY} w={BW} h={190} color={C.red} glow={r > 0.6}>
              <div style={{ fontFamily: sans, fontSize: 28, color: C.grey, textAlign: 'center' }}>visitor {i + 1}</div>
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 20, marginTop: 14 }}>
                <BoltIcon size={44} color={C.red} glow />
                <CookieIcon size={52} opacity={fly(i) > 0 ? 0.25 : 1} />
              </div>
            </BrowserCard>
          </div>
        )
      })}
      {/* cookies in flight */}
      {browsers.map((bx, i) => {
        const p = fly(i)
        if (p <= 0 || p >= 1) return null
        const x = lerp(bx + BW / 2 + 32, att.x, p)
        const y = lerp(BY + 120, att.y - 40, p) - Math.sin(p * Math.PI) * 40
        return <CookieIcon key={i} x={x} y={y} size={56} glow />
      })}
      {/* attacker */}
      <div style={{ opacity: Math.min(1, attIn * 1.4), transform: `scale(${0.8 + 0.2 * attIn})`, transformOrigin: `${att.x}px ${att.y}px` }}>
        <AttackerIcon x={att.x} y={att.y} size={150} glow={hitGlow > 0.5} />
      </div>
      <div style={{ position: 'absolute', top: att.y + 88, left: 190, width: 700, textAlign: 'center', fontFamily: sans, fontSize: 34, fontWeight: 600, color: C.red, opacity: attIn }}>
        attacker <span style={{ color: C.yellow, fontVariantNumeric: 'tabular-nums' }}>· {stolen} {stolen === 1 ? 'session' : 'sessions'} stolen</span>
      </div>
      <Sfx t={T} name="hop" at={run - 4} volume={0.35} />
      <Sfx t={T} name="swipe" at={cookieCue - 14} volume={0.38} />
      <Sfx t={T} name="swipe" at={cookieCue - 2} volume={0.38} />
    </>
  )
}

// Scene 4 — escape: render the bio as text; React turns < > into harmless characters
function Escape() {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const rendered = useCue('rendered', 18)
  const brackets = useCue('brackets', 113)
  const tag = useCue('tag', 142)
  const harmless = useCue('harmless', 175)
  const conv = prog(frame, brackets - 8, brackets + 12)
  const card = springAt(frame, fps, tag - 14, 15)
  const safe = prog(frame, harmless - 6, harmless + 6)
  const shield = springAt(frame, fps, harmless, 12)
  return (
    <>
      <Title from={9} top={150} size={74} color={C.green}>
        Claude&rsquo;s fix: plain text
      </Title>
      <Panel from={Math.min(rendered - 12, 14)} top={290} color={C.green} glow="rgba(131,193,103,0.16)">
        <CodeLine toks={[{ t: '- ', c: C.red }, { t: 'dangerouslySetInnerHTML={{ __html: bio }}', c: C.red }]} style={{ fontSize: 30, lineHeight: 1.7, background: 'rgba(252,98,85,0.08)', borderRadius: 8, padding: '2px 10px' }} />
        <CodeLine toks={[{ t: '+ ', c: C.green }, { t: '<div>', c: C.white }, { t: '{bio}', c: C.purple }, { t: '</div>', c: C.white }]} style={{ fontSize: 30, lineHeight: 1.7, background: 'rgba(131,193,103,0.08)', borderRadius: 8, padding: '2px 10px' }} />
      </Panel>
      {/* the brackets get escaped */}
      <div style={{ position: 'absolute', top: 520, left: 70, right: 70, display: 'flex', justifyContent: 'center', gap: 110, opacity: prog(frame, brackets - 14, brackets - 6) }}>
        {[
          ['<', '&lt;'],
          ['>', '&gt;'],
        ].map(([a, b]) => (
          <div key={a} style={{ display: 'flex', alignItems: 'center', gap: 22, fontFamily: mono }}>
            <span style={{ fontSize: 96, color: C.red, opacity: 1 - 0.6 * conv, lineHeight: 1 }}>{a}</span>
            <span style={{ fontSize: 50, color: C.yellow, opacity: conv }}>→</span>
            <span style={{ fontSize: 60, color: C.green, opacity: conv, transform: `translateX(${(1 - conv) * -20}px)`, textShadow: '0 0 24px rgba(131,193,103,0.5)' }}>{b}</span>
          </div>
        ))}
      </div>
      {/* the same profile, now showing its bio as literal characters */}
      <ProfileCard top={700} border={safe > 0.5 ? C.green : C.dim} glow={safe} p={card}>
        <div style={{ fontFamily: mono, fontSize: 29, lineHeight: 1.45, color: safe > 0.5 ? C.white : C.grey }}>
          {BIO_TEXT} <span style={{ color: safe > 0.5 ? C.green : C.grey }}>{PAYLOAD}</span>
        </div>
      </ProfileCard>
      <div style={{ position: 'absolute', top: 1170, left: 190, width: 700, display: 'flex', justifyContent: 'center', opacity: Math.min(1, shield * 1.4), transform: `scale(${0.85 + 0.15 * shield})` }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 16, padding: '14px 32px', border: `3px solid ${C.green}`, borderRadius: 999, fontFamily: sans, fontWeight: 600, fontSize: 40, color: C.green, background: 'rgba(131,193,103,0.1)' }}>
          <ShieldIcon size={44} check={1} />
          just text, no script runs
        </span>
      </div>
      <Sfx t={T} name="pop" at={brackets - 6} volume={0.6} />
      <Sfx t={T} name="shield" at={harmless} volume={0.16} />
    </>
  )
}

// Scene 5 — defense in depth: HttpOnly + CSP around the escaped text
function Defense() {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const http = useCue('HttpOnly', 30)
  const scripts = useCue('scripts', 79)
  const content = useCue('content', 136)
  const backup = useCue('backup', 195)
  const blocked = prog(frame, scripts - 2, scripts + 8)
  const ring = (at: number) => springAt(frame, fps, at, 14)
  const CX = 540
  const CY = 1056
  const rings = [
    { r: 82, color: C.teal, label: 'escaped text', at: 14 },
    { r: 142, color: C.green, label: 'HttpOnly cookie', at: http },
    { r: 202, color: C.blue, label: 'CSP', at: content },
  ]
  // a stray script bounces off the outer layer
  const atk = prog(frame, backup - 22, backup - 4, (t) => t)
  const bounce = prog(frame, backup - 4, backup + 14, Easing.out(Easing.cubic))
  const hitX = CX - Math.sqrt(202 * 202 - 60 * 60) - 16
  const ax = atk < 1 ? lerp(110, hitX, atk) : lerp(hitX, 130, bounce)
  const ay = atk < 1 ? lerp(CY - 60, CY - 60, atk) : lerp(CY - 60, CY + 120, bounce)
  return (
    <>
      <Title from={9} top={150} size={74} color={C.green}>
        Two more locks
      </Title>
      <Panel from={Math.min(http - 10, 16)} top={280} color={C.green} glow="rgba(131,193,103,0.14)" pad="24px 32px">
        <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
          <CookieIcon size={64} />
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: mono, fontWeight: 600, fontSize: 34, color: C.green }}>Set-Cookie: …; HttpOnly</div>
            <div style={{ fontFamily: sans, fontSize: 28, color: C.grey, marginTop: 4 }}>JavaScript can&rsquo;t read it</div>
          </div>
        </div>
        <div style={{ marginTop: 16, display: 'flex', alignItems: 'center', gap: 16, fontFamily: mono, fontSize: 30, height: 48 }}>
          <span style={{ color: blocked > 0.5 ? C.red : C.grey }}>document.cookie</span>
          <span style={{ color: C.grey }}>→</span>
          <BlockedIcon size={40} opacity={blocked} />
          <span style={{ color: C.red, opacity: blocked }}>blocked</span>
        </div>
      </Panel>
      <Panel from={content - 10} top={560} color={C.blue} glow="rgba(88,196,221,0.14)" pad="24px 32px">
        <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
          <ShieldIcon size={64} color={C.blue} check={0} fill={0.15} />
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: mono, fontWeight: 600, fontSize: 32, color: C.blue }}>Content-Security-Policy</div>
            <div style={{ fontFamily: sans, fontSize: 28, color: C.grey, marginTop: 4 }}>blocks injected &amp; off-site scripts</div>
          </div>
        </div>
      </Panel>
      {/* layers */}
      <svg viewBox="0 0 1080 1920" style={{ position: 'absolute', inset: 0 }}>
        <GlowDefs />
        {rings.map((g, i) => {
          const p = ring(g.at)
          return (
            <g key={i} opacity={Math.min(1, p * 1.3)}>
              <circle cx={CX} cy={CY} r={g.r * (0.7 + 0.3 * p)} fill={rgba(g.color, 0.05)} stroke={g.color} strokeWidth={5} filter={i === 2 && bounce > 0 && bounce < 1 ? 'url(#kglow)' : undefined} />
            </g>
          )
        })}
        {atk > 0 && bounce < 1 && <circle cx={ax} cy={ay} r={14} fill={C.red} opacity={1 - bounce} filter="url(#kglow)" />}
      </svg>
      <CookieIcon x={CX} y={CY + 6} size={84} opacity={Math.min(1, ring(14) * 1.4)} />
      {rings.map((g, i) => {
        const p = ring(g.at)
        return (
          <div key={i} style={{ position: 'absolute', left: CX - 160, width: 320, top: CY - g.r * (0.7 + 0.3 * p) - 20, textAlign: 'center', opacity: Math.min(1, p * 1.4) }}>
            <span style={{ fontFamily: sans, fontSize: 28, fontWeight: 600, color: g.color, background: '#000', padding: '2px 12px', whiteSpace: 'nowrap' }}>{g.label}</span>
          </div>
        )
      })}
      <Fade from={backup + 2} style={{ top: 1290, left: 70, right: 190, textAlign: 'center', fontFamily: serif, fontStyle: 'italic', fontSize: 48, color: C.white }}>
        Layers, so one slip isn&rsquo;t game over
      </Fade>
      <Sfx t={T} name="shield" at={scripts} volume={0.16} />
      <Sfx t={T} name="pop" at={content - 8} volume={0.6} />
      <Sfx t={T} name="tick" at={backup - 4} volume={0.85} />
    </>
  )
}

// Scene 6 — takeaway
function Takeaway() {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const html = useCue('HTML', 77)
  const pop = springAt(frame, fps, 10, 13)
  const stamp = springAt(frame, fps, html - 6, 11)
  const check = prog(frame, html, html + 12)
  return (
    <>
      <div style={{ position: 'absolute', top: 620, left: 70, right: 70, textAlign: 'center', opacity: pop, transform: `scale(${0.9 + pop * 0.1})` }}>
        <div style={{ fontFamily: serif, fontStyle: 'italic', fontSize: 92, lineHeight: 1.1, color: C.white }}>
          User content is <span style={{ color: C.green }}>text</span>.
        </div>
        <div style={{ fontFamily: serif, fontStyle: 'italic', fontSize: 92, lineHeight: 1.1, color: C.white, marginTop: 8 }}>
          Never <span style={{ color: C.red }}>HTML</span>.
        </div>
      </div>
      <div style={{ opacity: Math.min(1, stamp * 1.4), transform: `scale(${0.6 + stamp * 0.4}) rotate(${(1 - stamp) * -12}deg)`, transformOrigin: '540px 1070px' }}>
        <ShieldIcon x={540} y={1070} size={140} check={check} glow />
      </div>
      <Sfx t={T} name="shield" at={html - 4} volume={0.2} />
    </>
  )
}

export function XssReel() {
  return (
    <Stage>
      <ReelAudio t={T} voiceVolume={0.88} musicVolume={0.17} duck={0.5} />
      <Scene t={T} id="hook"><Hook /></Scene>
      <Scene t={T} id="inject"><Inject /></Scene>
      <Scene t={T} id="spread"><Spread /></Scene>
      <Scene t={T} id="escape"><Escape /></Scene>
      <Scene t={T} id="defense"><Defense /></Scene>
      <Scene t={T} id="takeaway"><Takeaway /></Scene>
      <Captions t={T} />
    </Stage>
  )
}
