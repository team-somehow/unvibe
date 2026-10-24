import { interpolate, useCurrentFrame, useVideoConfig } from 'remotion'
import { Captions, ReelAudio, Scene, Sfx, buildTimeline, useCue, type Manifest } from './audio'
import manifest from './audio/xss.json'
import { C, Fade, Stage, Title, mono, sans, serif, useTween } from './primitives'
import { BrowserCard, CodeLine, DbCylinder, GlowDefs, Panel, Tag, springAt, travel } from './kit-input'
import script from './scripts/xss.json'

const T = buildTimeline(script, manifest as unknown as Manifest)
export const XSS_REEL_FRAMES = T.total

// Illustrative, non-functional payload: the point is "a tag that runs on error", not a working exploit
const PAYLOAD_L = '<img src=x onerror='
const PAYLOAD_R = '"steal(cookie)">'

// Scene 1 — hook: a cute profile bio that is secretly a weapon
function Hook() {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const bio = useCue('bio', 20)
  const steal = useCue('steal', bio + 20)
  const pop = springAt(frame, fps, bio - 6, 13)
  const danger = frame >= steal
  return (
    <>
      <Title from={4} top={150} size={66}>
        A bio that steals your session
      </Title>
      <div style={{ position: 'absolute', top: 500, left: 150, right: 150, opacity: pop, transform: `translateY(${(1 - pop) * 40}px) scale(${0.94 + pop * 0.06})` }}>
        <div
          style={{
            border: `3px solid ${danger ? C.red : C.purple}`,
            borderRadius: 26,
            padding: '34px 36px',
            background: '#0A0E13',
            boxShadow: danger ? '0 0 60px rgba(252,98,85,0.4)' : '0 0 44px rgba(154,114,172,0.3)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 24 }}>
            <div style={{ width: 86, height: 86, borderRadius: 999, background: danger ? C.red : C.purple, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 44 }}>
              {danger ? '\u{1F608}' : '\u{1F642}'}
            </div>
            <div>
              <div style={{ fontFamily: sans, fontWeight: 700, fontSize: 40, color: C.white }}>new_user_42</div>
              <div style={{ fontFamily: sans, fontSize: 28, color: C.grey }}>bio</div>
            </div>
          </div>
          <div style={{ fontFamily: mono, fontSize: 30, lineHeight: 1.5, color: danger ? C.red : C.grey, wordBreak: 'break-all' }}>
            {PAYLOAD_L}
            {PAYLOAD_R}
          </div>
        </div>
      </div>
      <Fade from={steal + 6} style={{ top: 1070, left: 70, right: 70, textAlign: 'center', fontFamily: sans, fontWeight: 600, fontSize: 40, color: C.red }}>
        Looks like text. Runs like code.
      </Fade>
      <Fade from={steal + 20} style={{ top: 1200, left: 70, right: 70, textAlign: 'center', fontFamily: serif, fontStyle: 'italic', fontSize: 40, color: C.white }}>
        Claude caught it in your comments feature
      </Fade>
      <Sfx t={T} name="pop" at={bio - 4} volume={0.4} />
      <Sfx t={T} name="glitch" at={steal} volume={0.4} />
    </>
  )
}

// Scene 2 — inject: dangerouslySetInnerHTML turns a bio string into real DOM
function Inject() {
  const dang = useCue('dangerously', 40)
  const became = useCue('became', dang + 40)
  const morph = useTween(became - 4, became + 26)
  return (
    <>
      <Title from={0} top={140} size={58} color={C.yellow}>
        The one dangerous prop
      </Title>
      <Panel from={6} top={340} color={C.dim}>
        <CodeLine
          toks={[
            { t: '<div ', c: C.white },
            { t: 'dangerouslySetInnerHTML', c: C.red },
          ]}
          style={{ fontSize: 31, lineHeight: 1.6 }}
        />
        <CodeLine
          toks={[
            { t: '  ={{ __html: ', c: C.grey },
            { t: 'bio', c: C.purple },
            { t: ' }} />', c: C.grey },
          ]}
          style={{ fontSize: 31, lineHeight: 1.6 }}
        />
      </Panel>
      {/* bio string morphs into a rendered element */}
      <div style={{ position: 'absolute', top: 640, left: 90, right: 90 }}>
        <div style={{ fontFamily: sans, fontSize: 28, color: C.grey, marginBottom: 14, textAlign: 'center' }}>stored bio string</div>
        <div
          style={{
            border: `3px solid ${C.purple}`,
            borderRadius: 16,
            padding: '20px 22px',
            fontFamily: mono,
            fontSize: 28,
            color: C.white,
            background: '#0A0E13',
            opacity: 1 - morph * 0.4,
            wordBreak: 'break-all',
          }}
        >
          <span style={{ color: C.grey }}>"</span>
          {PAYLOAD_L}
          <span style={{ color: C.red }}>{PAYLOAD_R}</span>
          <span style={{ color: C.grey }}>"</span>
        </div>
      </div>
      <div style={{ position: 'absolute', top: 880, left: 0, right: 0, textAlign: 'center', fontFamily: sans, fontSize: 60, color: C.yellow, opacity: morph }}>
        {'↓'}
      </div>
      <div style={{ position: 'absolute', top: 980, left: 90, right: 90, opacity: morph, transform: `scale(${0.92 + morph * 0.08})` }}>
        <div style={{ fontFamily: sans, fontSize: 28, color: C.grey, marginBottom: 14, textAlign: 'center' }}>becomes a real element on the page</div>
        <div style={{ border: `3px solid ${C.red}`, borderRadius: 16, padding: '24px 22px', background: 'rgba(252,98,85,0.1)', boxShadow: '0 0 40px rgba(252,98,85,0.3)', textAlign: 'center' }}>
          <Tag color={C.red} glow size={32}>
            {'⚡'} onerror fires {'→'} runs the script
          </Tag>
        </div>
      </div>
      <Sfx t={T} name="typing" at={6} volume={0.3} />
      <Sfx t={T} name="glitch" at={became - 2} volume={0.35} />
    </>
  )
}

// Scene 3 — spread: stored once, runs in every visitor, cookies fly to the attacker
function Spread() {
  const frame = useCurrentFrame()
  const run = useCue('runs', 40)
  const cookieCue = useCue('cookie', run + 40)
  const attackerCue = useCue('attacker', cookieCue + 10)
  // three browsers reached in sequence
  const reach = (i: number) => interpolate(frame, [run + i * 8, run + 16 + i * 8], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
  // cookie flight to attacker
  const fly = (i: number) => interpolate(frame, [cookieCue + i * 6, cookieCue + 30 + i * 6], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
  const browsers = [
    { x: 70, y: 760 },
    { x: 350, y: 760 },
    { x: 630, y: 760 },
  ]
  const attacker = { x: 540, y: 1300 }
  return (
    <>
      <Title from={0} top={140} size={58} color={C.red}>
        Stored once, runs everywhere
      </Title>
      <svg viewBox="0 0 1080 1920" style={{ position: 'absolute', inset: 0 }}>
        <GlowDefs />
        <DbCylinder x={540} y={430} w={150} h={150} color={C.red} glow />
        {/* db -> each browser */}
        {browsers.map((b, i) => {
          const p = reach(i)
          const pt = travel(540, 500, b.x + 130, b.y, p)
          return (
            <g key={i}>
              <line x1={540} y1={500} x2={b.x + 130} y2={b.y} stroke={C.dim} strokeWidth={2} strokeDasharray="8 10" />
              {p > 0 && p < 1 && <circle cx={pt.x} cy={pt.y} r={12} fill={C.red} filter="url(#kglow)" />}
            </g>
          )
        })}
        {/* cookies flying to attacker */}
        {browsers.map((b, i) => {
          const p = fly(i)
          if (p <= 0) return null
          const pt = travel(b.x + 130, b.y + 120, attacker.x, attacker.y - 30, p)
          return <text key={`c${i}`} x={pt.x} y={pt.y} fontSize={46} textAnchor="middle" opacity={p < 1 ? 1 : 0}>{'\u{1F36A}'}</text>
        })}
      </svg>
      {/* db label */}
      <div style={{ position: 'absolute', top: 560, left: 0, right: 0, textAlign: 'center', fontFamily: sans, fontSize: 26, color: C.red }}>database</div>
      {/* visitor browsers */}
      {browsers.map((b, i) => (
        <div key={i} style={{ opacity: reach(i) }}>
          <BrowserCard x={b.x} y={b.y} w={260} h={190} color={C.red} glow={reach(i) > 0.6}>
            <div style={{ fontFamily: sans, fontSize: 24, color: C.grey, textAlign: 'center' }}>visitor {i + 1}</div>
            <div style={{ fontFamily: mono, fontSize: 36, textAlign: 'center', marginTop: 18 }}>{'⚡'}</div>
            <div style={{ fontFamily: mono, fontSize: 22, color: C.red, textAlign: 'center', marginTop: 10 }}>cookie {'\u{1F36A}'}</div>
          </BrowserCard>
        </div>
      ))}
      {/* attacker */}
      <div style={{ position: 'absolute', top: 1235, left: 390, right: 390, textAlign: 'center', opacity: interpolate(frame, [cookieCue - 6, cookieCue + 8], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }) }}>
        <div style={{ border: `3px solid ${C.red}`, borderRadius: 18, padding: '20px 10px', background: 'rgba(252,98,85,0.12)', boxShadow: attackerCue && frame >= attackerCue ? '0 0 50px rgba(252,98,85,0.5)' : 'none' }}>
          <div style={{ fontSize: 48 }}>{'\u{1F608}'}</div>
          <div style={{ fontFamily: sans, fontWeight: 600, fontSize: 30, color: C.red, marginTop: 6 }}>attacker</div>
        </div>
      </div>
      <Sfx t={T} name="hop" at={run} volume={0.4} />
      <Sfx t={T} name="swipe" at={cookieCue} volume={0.4} />
      <Sfx t={T} name="swipe" at={cookieCue + 12} volume={0.3} />
    </>
  )
}

// Scene 4 — escape: React turns < > into harmless text
function Escape() {
  const frame = useCurrentFrame()
  const react = useCue('React', 40)
  const brackets = useCue('brackets', react + 10)
  const harmless = useCue('harmless', brackets + 30)
  const conv = useTween(brackets - 2, brackets + 24)
  const safe = frame >= harmless - 6
  return (
    <>
      <Title from={0} top={140} size={58} color={C.green}>
        React escapes it
      </Title>
      {/* before */}
      <div style={{ position: 'absolute', top: 400, left: 90, right: 90 }}>
        <div style={{ fontFamily: sans, fontSize: 26, color: C.grey, marginBottom: 12, textAlign: 'center' }}>rendered as text, the brackets convert</div>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 50 }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontFamily: mono, fontSize: 90, color: C.red, opacity: 1 - conv }}>{'<'}</div>
            <div style={{ fontFamily: mono, fontSize: 44, color: C.green, opacity: conv, marginTop: -90 }}>&amp;lt;</div>
          </div>
          <div style={{ fontFamily: sans, fontSize: 70, color: C.yellow, alignSelf: 'center' }}>{'→'}</div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontFamily: mono, fontSize: 90, color: C.red, opacity: 1 - conv }}>{'>'}</div>
            <div style={{ fontFamily: mono, fontSize: 44, color: C.green, opacity: conv, marginTop: -90 }}>&amp;gt;</div>
          </div>
        </div>
      </div>
      {/* the tag as inert text */}
      <Panel from={brackets} top={720} color={safe ? C.green : C.dim} glow={safe ? 'rgba(131,193,103,0.18)' : undefined}>
        <div style={{ fontFamily: sans, fontSize: 26, color: C.grey, marginBottom: 14 }}>what the visitor sees:</div>
        <div style={{ fontFamily: mono, fontSize: 30, lineHeight: 1.5, color: safe ? C.green : C.white, wordBreak: 'break-all' }}>
          &amp;lt;img src=x onerror=...&amp;gt;
        </div>
        <div style={{ fontFamily: sans, fontSize: 28, color: safe ? C.green : C.grey, marginTop: 18 }}>
          {safe ? 'just characters — the browser never runs it' : ''}
        </div>
      </Panel>
      <Fade from={harmless + 2} style={{ top: 1150, left: 70, right: 70, textAlign: 'center' }}>
        <span style={{ display: 'inline-block', padding: '16px 34px', border: `3px solid ${C.green}`, borderRadius: 999, fontFamily: sans, fontWeight: 600, fontSize: 40, color: C.green, background: 'rgba(131,193,103,0.1)' }}>
          {'\u{1F6E1}'} no script runs
        </span>
      </Fade>
      <Sfx t={T} name="pop" at={brackets} volume={0.35} />
      <Sfx t={T} name="shield" at={harmless} volume={0.4} />
    </>
  )
}

// Scene 5 — defense in depth: HttpOnly + CSP
function Defense() {
  const frame = useCurrentFrame()
  const http = useCue('HttpOnly', 10)
  const scripts = useCue('scripts', http + 20)
  const policy = useCue('policy', scripts + 40)
  const blocked = frame >= scripts
  return (
    <>
      <Title from={0} top={140} size={58} color={C.green}>
        Two more locks
      </Title>
      {/* HttpOnly cookie, script hand blocked */}
      <Panel from={6} top={380} color={C.green} glow="rgba(131,193,103,0.14)">
        <div style={{ display: 'flex', alignItems: 'center', gap: 22 }}>
          <div style={{ fontSize: 60 }}>{'\u{1F36A}'}</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: mono, fontWeight: 600, fontSize: 36, color: C.green }}>Set-Cookie: HttpOnly</div>
            <div style={{ fontFamily: sans, fontSize: 28, color: C.grey, marginTop: 6 }}>JavaScript can&rsquo;t read it</div>
          </div>
        </div>
        <div style={{ marginTop: 22, display: 'flex', alignItems: 'center', gap: 16, fontFamily: mono, fontSize: 30 }}>
          <span style={{ color: blocked ? C.red : C.grey }}>document.cookie</span>
          <span style={{ fontSize: 40 }}>{blocked ? '\u{1F6AB}' : '⋯'}</span>
          <span style={{ color: blocked ? C.red : C.grey }}>{blocked ? 'blocked' : ''}</span>
        </div>
      </Panel>
      {/* CSP */}
      <Panel from={policy - 10} top={740} color={C.blue} glow="rgba(88,196,221,0.14)">
        <div style={{ display: 'flex', alignItems: 'center', gap: 22 }}>
          <div style={{ fontSize: 56 }}>{'\u{1F6E1}'}</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: mono, fontWeight: 600, fontSize: 34, color: C.blue }}>Content-Security-Policy</div>
            <div style={{ fontFamily: sans, fontSize: 28, color: C.grey, marginTop: 6 }}>blocks injected &amp; off-site scripts</div>
          </div>
        </div>
      </Panel>
      <Fade from={policy + 6} style={{ top: 1120, left: 70, right: 70, textAlign: 'center', fontFamily: serif, fontStyle: 'italic', fontSize: 42, color: C.white }}>
        Layers, so one slip isn&rsquo;t game over
      </Fade>
      <Sfx t={T} name="shield" at={scripts} volume={0.35} />
      <Sfx t={T} name="pop" at={policy} volume={0.35} />
    </>
  )
}

// Scene 6 — takeaway
function Takeaway() {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const html = useCue('HTML', 30)
  const pop = springAt(frame, fps, 10, 13)
  const stamp = springAt(frame, fps, html - 4, 11)
  return (
    <>
      <div style={{ position: 'absolute', top: 660, left: 70, right: 70, textAlign: 'center', opacity: pop, transform: `scale(${0.9 + pop * 0.1})` }}>
        <div style={{ fontFamily: serif, fontStyle: 'italic', fontSize: 92, lineHeight: 1.1, color: C.white }}>
          User content is <span style={{ color: C.green }}>text</span>.
        </div>
        <div style={{ fontFamily: serif, fontStyle: 'italic', fontSize: 92, lineHeight: 1.1, color: C.white, marginTop: 8 }}>
          Never <span style={{ color: C.red }}>HTML</span>.
        </div>
      </div>
      <div style={{ position: 'absolute', top: 1010, left: 0, right: 0, textAlign: 'center', opacity: stamp, transform: `scale(${0.6 + stamp * 0.4}) rotate(${(1 - stamp) * -12}deg)` }}>
        <span style={{ fontSize: 110 }}>{'\u{1F6E1}'}</span>
      </div>
      <Sfx t={T} name="shield" at={html - 2} volume={0.45} />
    </>
  )
}

export function XssReel() {
  return (
    <Stage>
      <ReelAudio t={T} musicVolume={0.14} />
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
