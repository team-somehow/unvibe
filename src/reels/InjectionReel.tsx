import { Easing, interpolate, useCurrentFrame, useVideoConfig } from 'remotion'
import { Captions, ReelAudio, Scene, Sfx, buildTimeline, useCue, type Manifest } from './audio'
import manifest from './audio/injection.json'
import { C, Fade, Stage, Title, mono, sans, serif, useTween } from './primitives'
import { ClaudeChip, CodeLine, DbCylinder, GlowDefs, Padlock, Panel, Tag, Verdict, springAt } from './kit-input'
import script from './scripts/injection.json'

const T = buildTimeline(script, manifest as unknown as Manifest)
export const INJECTION_REEL_FRAMES = T.total

const PAYLOAD = "' OR '1'='1"
const USERS = ['ana@', 'raj@', 'li@', 'sam@', 'mo@', 'eve@', 'kai@', 'zoe@', 'ben@', 'ivy@', 'oli@', 'max@']
const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const
const ease = Easing.inOut(Easing.cubic)
const prog = (frame: number, a: number, b: number, easing: (t: number) => number = ease) => interpolate(frame, [a, Math.max(a + 1, b)], [0, 1], { ...clamp, easing })
const lerp = (a: number, b: number, t: number) => a + (b - a) * t

// A typewriter apostrophe (’) drawn as a path so it can fly and scale precisely. Local units: ~100 tall, centred.
const APOS = 'M 0 -50 C 22 -50 30 -32 26 -12 C 22 10 8 30 -10 46 L -16 40 C -2 24 6 8 4 -6 C -14 -6 -24 -18 -24 -30 C -24 -42 -14 -50 0 -50 Z'

// Login form geometry (absolute composition coordinates)
const CARD = { x: 190, y: 560, w: 700, h: 570 }
const FIELD = { x: 226, y: 710, w: 628, h: 84 }
const PASS = { y: 856 }
const BTN = { y: 998, h: 88 }

// Scene 1 — hook: one apostrophe flies into the login form and opens it for anyone
function Hook() {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const apos = useCue('apostrophe', 15)
  const letW = useCue('let', 43)
  const logW = useCue('log', 70)
  const claude = useCue('Claude', 120)

  const pop = springAt(frame, fps, apos - 6, 11)
  const card = springAt(frame, fps, 8, 16)
  // the apostrophe drops into the email field, then the rest of the payload types after it
  const flyAt = Math.max(letW, 46)
  const fly = prog(frame, flyAt, flyAt + 16)
  const landed = frame >= flyAt + 16
  const typeAt = flyAt + 18
  const typed = Math.max(0, Math.min(PAYLOAD.length - 1, Math.floor((frame - typeAt) * 1.5)))
  const pressAt = Math.max(logW, typeAt + 9)
  const press = interpolate(frame, [pressAt, pressAt + 3, pressAt + 9], [1, 0.94, 1], clamp)
  const openAt = pressAt + 6
  const open = prog(frame, openAt, openAt + 10)
  const banner = springAt(frame, fps, openAt + 4, 13)
  const chip = springAt(frame, fps, claude - 2, 15)
  const tx = FIELD.x + 26 + 12
  const ty = FIELD.y + FIELD.h / 2 - 4
  const ax = lerp(540, tx, fly)
  const ay = lerp(385, ty, fly) - Math.sin(fly * Math.PI) * 60
  const as = lerp(2.1, 0.34, fly) * (0.6 + 0.4 * pop)
  const caret = Math.floor(frame / 8) % 2 === 0
  const breach = open > 0.5

  return (
    <>
      <Title from={4} top={150} size={74}>
        One apostrophe broke the login
      </Title>
      {/* login form */}
      <div
        style={{
          position: 'absolute', left: CARD.x, top: CARD.y, width: CARD.w, height: CARD.h, boxSizing: 'border-box', borderRadius: 30, background: '#0A0E13',
          border: `3px solid ${breach ? C.red : C.dim}`, boxShadow: breach ? `0 0 ${60 * open}px rgba(252,98,85,${0.4 * open})` : '0 20px 60px rgba(0,0,0,0.5)',
          opacity: card, transform: `translateY(${(1 - card) * 40}px)`,
        }}
      />
      <div style={{ position: 'absolute', left: CARD.x, top: CARD.y, width: CARD.w, height: CARD.h, opacity: card, transform: `translateY(${(1 - card) * 40}px)`, fontFamily: sans }}>
        <div style={{ position: 'absolute', left: 36, top: 32, fontSize: 40, fontWeight: 600, color: C.white }}>Sign in</div>
        <Padlock x={CARD.w - 64} y={58} size={46} closed={1 - open} color={breach ? C.red : C.grey} glow={open} />
        <div style={{ position: 'absolute', left: 36, top: FIELD.y - CARD.y - 42, fontSize: 28, color: C.grey }}>email</div>
        <div style={{ position: 'absolute', left: 36, top: PASS.y - CARD.y - 42, fontSize: 28, color: C.grey }}>password</div>
      </div>
      {/* email field */}
      <div
        style={{
          position: 'absolute', left: FIELD.x, top: FIELD.y, width: FIELD.w, height: FIELD.h, boxSizing: 'border-box', borderRadius: 16, opacity: card,
          border: `3px solid ${landed ? C.red : C.dim}`, background: '#05080B', paddingLeft: 26, fontFamily: mono, fontSize: 40, lineHeight: `${FIELD.h - 6}px`, whiteSpace: 'pre',
          boxShadow: landed ? '0 0 30px rgba(252,98,85,0.25)' : 'none',
        }}
      >
        {landed ? (
          <>
            <span style={{ color: C.red, textShadow: '0 0 18px rgba(252,98,85,0.8)' }}>'</span>
            <span style={{ color: C.white }}>{PAYLOAD.slice(1, 1 + typed)}</span>
          </>
        ) : (
          <span style={{ color: C.dim }}>you@example.com</span>
        )}
        {landed && caret && !breach && <span style={{ color: C.blue }}>▍</span>}
      </div>
      {/* password field: nothing typed, and it won't matter */}
      <div style={{ position: 'absolute', left: FIELD.x, top: PASS.y, width: FIELD.w, height: FIELD.h, boxSizing: 'border-box', borderRadius: 16, opacity: card, border: `3px solid ${C.dim}`, background: '#05080B', paddingLeft: 26, fontFamily: mono, fontSize: 40, lineHeight: `${FIELD.h - 6}px`, color: C.dim }}>
        ••••••
      </div>
      {/* button */}
      <div
        style={{
          position: 'absolute', left: FIELD.x, top: BTN.y, width: FIELD.w, height: BTN.h, borderRadius: 18, opacity: card, transform: `scale(${press})`,
          background: breach ? C.red : C.blue, color: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: sans, fontSize: 38, fontWeight: 700,
          boxShadow: `0 0 ${breach ? 50 : 18}px ${breach ? 'rgba(252,98,85,0.55)' : 'rgba(88,196,221,0.4)'}`,
        }}
      >
        {breach ? 'Logged in' : 'Log in'}
      </div>
      {/* the apostrophe itself */}
      {!landed && (
        <svg viewBox="0 0 1080 1920" style={{ position: 'absolute', inset: 0, overflow: 'visible' }}>
          <GlowDefs />
          <path d={APOS} fill={C.red} opacity={Math.min(1, pop * 1.4)} transform={`translate(${ax} ${ay}) scale(${as})`} filter="url(#kglow)" />
        </svg>
      )}
      <div style={{ position: 'absolute', top: 1166, left: 190, width: 700, textAlign: 'center', fontFamily: sans, fontWeight: 700, fontSize: 46, color: C.red, opacity: Math.min(1, banner * 1.4), transform: `scale(${0.85 + 0.15 * banner})`, textShadow: '0 0 30px rgba(252,98,85,0.5)' }}>
        Logged in as anyone
      </div>
      <ClaudeChip top={1282} left={190} width={700} p={chip}>
        Claude caught this in <span style={{ fontFamily: mono, fontSize: 30, color: C.blue }}>auth/login.ts</span>
      </ClaudeChip>
      <Sfx t={T} name="impact" at={apos - 4} volume={0.36} />
      <Sfx t={T} name="whoosh" at={flyAt - 2} volume={0.3} />
      <Sfx t={T} name="typing" at={typeAt} volume={0.4} />
      <Sfx t={T} name="error" at={openAt} volume={0.13} />
    </>
  )
}

// Scene 2 — concat: whatever is typed is pasted straight into the SQL text
const QUERY = { x: 190, y: 912, w: 700 }
const SLOT_X = QUERY.x + 30 + 15 * 19.2 // where the value starts on the WHERE line (mono 32, ~19.2px per char)

function Concat() {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const email = useCue('email', 38)
  const paste = useCue('pasted', 24)
  const whatever = useCue('Whatever', 105)
  const becomes = useCue('becomes', 143)
  const field = springAt(frame, fps, 10, 15)
  const qIn = springAt(frame, fps, paste - 4, 15)
  // first a normal email, then "whatever someone types"
  const v1 = 'ana@mail.com'
  const v2 = 'whatever you type'
  const phase2 = frame >= whatever - 4
  const value = phase2 ? v2.slice(0, Math.max(0, Math.floor((frame - whatever + 2) * 1.1))) : v1.slice(0, Math.max(0, Math.floor((frame - 12) * 1.2)))
  const fly = prog(frame, paste + 6, paste + 26)
  const inQuery = frame >= paste + 24
  const merge = prog(frame, becomes - 2, becomes + 14)
  const hlEmail = interpolate(frame, [email - 4, email + 4, email + 40], [0, 1, 0.35], clamp)
  const slotColor = merge > 0.5 ? C.teal : C.yellow
  const chipX = lerp(540, SLOT_X + (v1.length * 19.2) / 2, fly)
  const chipY = lerp(720, QUERY.y + 20 + 51 + 26, fly)
  return (
    <>
      <Title from={9} top={150} size={74} color={C.yellow}>
        Your query trusts the input
      </Title>
      <Panel from={6} top={290} color={C.dim}>
        <CodeLine toks={[{ t: 'db.query(', c: C.white }]} style={{ fontSize: 33, lineHeight: 1.7 }} />
        <CodeLine toks={[{ t: '  "SELECT * FROM users WHERE email = ', c: C.teal }, { t: "'", c: C.yellow }, { t: '"', c: C.teal }]} style={{ fontSize: 33, lineHeight: 1.7 }} />
        <div style={{ fontFamily: mono, fontSize: 33, lineHeight: 1.7, whiteSpace: 'pre' }}>
          <span style={{ color: C.grey }}>{'  + '}</span>
          <span style={{ color: C.red, borderRadius: 8, padding: '2px 4px', background: `rgba(252,98,85,${0.2 * hlEmail})`, boxShadow: `0 0 0 2px rgba(252,98,85,${0.9 * hlEmail})` }}>email</span>
          <span style={{ color: C.grey }}>{' + '}</span>
          <span style={{ color: C.teal }}>{'"\'"'}</span>
        </div>
        <CodeLine toks={[{ t: ')', c: C.white }]} style={{ fontSize: 33, lineHeight: 1.7 }} />
      </Panel>
      {/* what the user typed */}
      <div style={{ position: 'absolute', top: 636, left: 190, fontFamily: sans, fontSize: 28, color: C.grey, opacity: field }}>what the user typed</div>
      <div style={{ position: 'absolute', top: 678, left: 190, width: 700, height: 84, boxSizing: 'border-box', borderRadius: 16, border: `3px solid ${phase2 ? C.yellow : C.dim}`, background: '#05080B', paddingLeft: 26, fontFamily: mono, fontSize: 38, lineHeight: '78px', color: C.white, whiteSpace: 'pre', opacity: field, transform: `translateY(${(1 - field) * 30}px)` }}>
        {value}
        {Math.floor(frame / 8) % 2 === 0 && <span style={{ color: C.blue }}>▍</span>}
      </div>
      {/* dashed arrow: input → query */}
      <svg viewBox="0 0 1080 1920" style={{ position: 'absolute', inset: 0 }}>
        <line x1={540} y1={772} x2={540} y2={852} stroke={C.yellow} strokeWidth={4} strokeDasharray="8 8" opacity={qIn * 0.8} />
        <path d="M 526 846 L 540 866 L 554 846 Z" fill={C.yellow} opacity={qIn * 0.8} />
      </svg>
      {/* what the database runs */}
      <div style={{ position: 'absolute', top: QUERY.y - 40, left: QUERY.x, fontFamily: sans, fontSize: 28, color: C.grey, opacity: qIn }}>what the database runs</div>
      <div
        style={{
          position: 'absolute', top: QUERY.y, left: QUERY.x, width: QUERY.w, boxSizing: 'border-box', borderRadius: 20, padding: '20px 30px', background: '#0A0E13',
          border: `3px solid ${merge > 0.5 ? C.red : C.dim}`, boxShadow: merge > 0.5 ? `0 0 ${50 * merge}px rgba(252,98,85,0.3)` : 'none',
          fontFamily: mono, fontSize: 32, lineHeight: 1.6, whiteSpace: 'pre', opacity: qIn, transform: `translateY(${(1 - qIn) * 30}px)`,
        }}
      >
        <div style={{ color: C.teal }}>SELECT * FROM users</div>
        <div>
          <span style={{ color: C.teal }}>WHERE email = '</span>
          <span style={{ color: slotColor, borderRadius: 6, background: `rgba(244,211,94,${0.14 * (1 - merge)})`, boxShadow: `0 0 0 2px rgba(244,211,94,${0.7 * (1 - merge)})`, opacity: inQuery ? 1 : 0 }}>{inQuery ? value : v1}</span>
          <span style={{ color: C.teal }}>'</span>
        </div>
      </div>
      {/* the value travelling from the input into the SQL */}
      {fly > 0 && fly < 1 && (
        <div style={{ position: 'absolute', left: chipX, top: chipY, transform: 'translate(-50%, -50%)' }}>
          <Tag color={C.yellow} size={32} glow style={{ padding: '6px 16px' }}>{v1}</Tag>
        </div>
      )}
      <Fade from={becomes + 6} style={{ top: 1150, left: 190, width: 700, textAlign: 'center', fontFamily: serif, fontStyle: 'italic', fontSize: 52, color: C.yellow, lineHeight: 1.2 }}>
        Input becomes part of the code
      </Fade>
      <Sfx t={T} name="typing" at={12} volume={0.4} />
      <Sfx t={T} name="whoosh" at={paste + 4} volume={0.3} />
      <Sfx t={T} name="typing" at={whatever} volume={0.4} />
      <Sfx t={T} name="pop" at={becomes} volume={0.6} />
    </>
  )
}

// Scene 3 — payload: the exploit slides in and the WHERE clause evaluates always-true
function Payload() {
  const frame = useCurrentFrame()
  const slide = useTween(16, 44)
  const whereCue = useCue('WHERE', 90)
  const falseCue = useCue('False', whereCue + 30)
  const trueCue = useCue('true', falseCue + 8)
  const alwaysCue = useCue('Always', trueCue + 10)
  return (
    <>
      <Title from={9} top={150} size={74} color={C.red}>
        The classic payload
      </Title>
      {/* payload sliding into the field */}
      <div style={{ position: 'absolute', top: 330, left: 160, width: 760 }}>
        <div style={{ textAlign: 'center', fontFamily: sans, fontSize: 28, color: C.grey, marginBottom: 12 }}>typed into the email box</div>
        <div
          style={{
            border: `3px solid ${C.red}`, borderRadius: 18, padding: '20px 26px', background: '#0A0E13', fontFamily: mono, fontSize: 44, color: C.red,
            overflow: 'hidden', boxShadow: '0 0 40px rgba(252,98,85,0.3)', textAlign: 'center',
          }}
        >
          <span style={{ display: 'inline-block', transform: `translateX(${(1 - slide) * -620}px)`, whiteSpace: 'pre' }}>{PAYLOAD}</span>
        </div>
      </div>
      {/* the resulting WHERE clause */}
      <Panel from={whereCue - 10} top={600} left={160} right={160} color={C.dim}>
        <div style={{ fontFamily: mono, fontSize: 36, lineHeight: 1.5, color: C.white, textAlign: 'center', whiteSpace: 'nowrap' }}>
          <span style={{ color: C.teal }}>WHERE email = </span>
          <span style={{ color: C.grey }}>''</span>
          <span style={{ color: C.yellow }}> OR </span>
          <span style={{ color: C.red, background: 'rgba(252,98,85,0.16)', padding: '0 6px', borderRadius: 6 }}>'1'='1'</span>
        </div>
      </Panel>
      {/* evaluation: the blank email is false, but 1 = 1 is always true */}
      <div style={{ position: 'absolute', top: 820, left: 190, width: 700, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Verdict label={<span>email = ''</span>} value={false} reveal={falseCue} frame={frame} width={300} falseColor={C.grey} />
        <div style={{ fontFamily: mono, fontSize: 48, color: C.yellow }}>OR</div>
        <Verdict label={<span>'1' = '1'</span>} value={true} reveal={trueCue} frame={frame} width={300} trueColor={C.yellow} />
      </div>
      {/* always true: that's the bug */}
      <div style={{ position: 'absolute', top: 1100, left: 190, width: 700, textAlign: 'center', opacity: interpolate(frame, [alwaysCue, alwaysCue + 10], [0, 1], clamp), transform: `scale(${interpolate(frame, [alwaysCue, alwaysCue + 10], [0.85, 1], clamp)})` }}>
        <div style={{ display: 'inline-block', padding: '20px 44px', border: `4px solid ${C.red}`, borderRadius: 20, background: 'rgba(252,98,85,0.12)', boxShadow: '0 0 50px rgba(252,98,85,0.45)' }}>
          <span style={{ fontFamily: sans, fontWeight: 700, fontSize: 60, color: C.red }}>always TRUE</span>
        </div>
      </div>
      <Fade from={alwaysCue + 14} style={{ top: 1300, left: 190, width: 700, textAlign: 'center', fontFamily: serif, fontStyle: 'italic', fontSize: 54, color: C.white }}>
        The filter can never fail
      </Fade>
      <Sfx t={T} name="whoosh" at={14} volume={0.3} />
      <Sfx t={T} name="tick" at={falseCue} volume={0.85} />
      <Sfx t={T} name="tick" at={trueCue} volume={0.85} />
      <Sfx t={T} name="impact" at={alwaysCue} volume={0.3} />
    </>
  )
}

// Scene 4 — leak: every row matches, the whole table pours out of the database
const GRID = { x: 190, w: 700, cols: 4, top: 640, rowH: 80 }

function Leak() {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const hands = useCue('hands', 70)
  const db = springAt(frame, fps, 6, 14)
  const count = Math.round(12408 * prog(frame, hands - 4, hands + 50, (t) => 1 - Math.pow(1 - t, 2)))
  const colW = (GRID.w - 16 * (GRID.cols - 1)) / GRID.cols
  return (
    <>
      <Title from={9} top={150} size={74} color={C.red}>
        Every row matches
      </Title>
      <svg viewBox="0 0 1080 1920" style={{ position: 'absolute', inset: 0 }}>
        <GlowDefs />
        <g opacity={db} transform={`translate(0 ${(1 - db) * 30})`}>
          <DbCylinder x={540} y={410} w={200} h={210} color={C.red} glow />
        </g>
      </svg>
      <div style={{ position: 'absolute', top: 528, left: 0, right: 0, textAlign: 'center', fontFamily: mono, fontSize: 28, color: C.red, opacity: db }}>users</div>
      {USERS.map((u, i) => {
        const p = prog(frame, hands - 6 + i * 3, hands + 10 + i * 3, Easing.out(Easing.cubic))
        const col = i % GRID.cols
        const row = Math.floor(i / GRID.cols)
        const tx = GRID.x + col * (colW + 16)
        const ty = GRID.top + row * GRID.rowH
        const x = lerp(540 - colW / 2, tx, p)
        const y = lerp(450, ty, p)
        return (
          <div
            key={u}
            style={{
              position: 'absolute', left: x, top: y, width: colW, height: 62, boxSizing: 'border-box', opacity: Math.min(1, p * 2.5), transform: `scale(${0.6 + 0.4 * p})`,
              border: `3px solid ${C.red}`, borderRadius: 14, display: 'grid', placeItems: 'center', fontFamily: mono, fontSize: 30, color: C.red,
              background: 'rgba(252,98,85,0.1)', boxShadow: '0 0 24px rgba(252,98,85,0.25)',
            }}
          >
            {u}
          </div>
        )
      })}
      <div style={{ position: 'absolute', top: 920, left: 190, width: 700, textAlign: 'center', fontFamily: sans, opacity: prog(frame, hands - 6, hands + 4) }}>
        <div style={{ fontSize: 150, fontWeight: 600, lineHeight: 1, letterSpacing: -5, color: C.red, fontVariantNumeric: 'tabular-nums', textShadow: '0 0 60px rgba(252,98,85,0.4)' }}>
          {count.toLocaleString('en-US')}
        </div>
        <div style={{ fontSize: 36, color: C.grey, marginTop: 12 }}>rows returned</div>
      </div>
      <Fade from={hands + 40} style={{ top: 1250, left: 190, width: 700, textAlign: 'center', fontFamily: sans, fontWeight: 600, fontSize: 46, color: C.red }}>
        The whole user table walks out
      </Fade>
      <Sfx t={T} name="leak" at={hands - 4} volume={0.12} />
    </>
  )
}

// Scene 5 — fix: the query holds a placeholder, the value travels on a separate channel
function Fix() {
  const frame = useCurrentFrame()
  const sep = useCue('separately', 150)
  const pure = useCue('pure', sep + 28)
  const travelP = useTween(sep - 30, sep + 6)
  // payload rides the data channel to the $1 slot (clamped so the chip stays inside the dashed box)
  const px = interpolate(travelP, [0, 1], [16, 296], clamp)
  const arrived = frame >= sep + 4
  return (
    <>
      <Title from={9} top={150} size={74} color={C.green}>
        Claude&rsquo;s fix: parameters
      </Title>
      <Panel from={6} top={300} color={C.green} glow="rgba(131,193,103,0.18)">
        <CodeLine toks={[{ t: '- ', c: C.red }, { t: '...email = ', c: C.grey }, { t: "'\" + email + \"'", c: C.red }]} style={{ fontSize: 32, lineHeight: 1.7, background: 'rgba(252,98,85,0.08)', borderRadius: 8, padding: '2px 10px' }} />
        <CodeLine toks={[{ t: '+ ', c: C.green }, { t: '...WHERE email = ', c: C.teal }, { t: '$1', c: C.yellow }, { t: ', ', c: C.grey }, { t: '[email]', c: C.green }]} style={{ fontSize: 32, lineHeight: 1.7, background: 'rgba(131,193,103,0.08)', borderRadius: 8, padding: '2px 10px' }} />
      </Panel>
      {/* two channels: query text vs data */}
      <div style={{ position: 'absolute', top: 560, left: 190, width: 700 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 40 }}>
          <div style={{ fontFamily: sans, fontSize: 30, fontWeight: 600, color: C.teal, width: 110 }}>query</div>
          <div style={{ flex: 1, border: `3px solid ${C.teal}`, borderRadius: 16, padding: '18px 22px', fontFamily: mono, fontSize: 34, color: C.white, background: '#0A0E13' }}>
            WHERE email = <span style={{ color: arrived ? C.green : C.yellow, background: arrived ? 'rgba(131,193,103,0.16)' : 'rgba(244,211,94,0.14)', padding: '0 8px', borderRadius: 6 }}>$1</span>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ fontFamily: sans, fontSize: 30, fontWeight: 600, color: C.green, width: 110 }}>data</div>
          <div style={{ flex: 1, position: 'relative', height: 80, border: `3px dashed ${C.green}`, borderRadius: 16, background: 'rgba(131,193,103,0.05)' }}>
            <div style={{ position: 'absolute', top: 10, left: px }}>
              <Tag color={arrived ? C.green : C.red} size={30} glow style={{ whiteSpace: 'nowrap' }}>{PAYLOAD}</Tag>
            </div>
          </div>
        </div>
      </div>
      <Fade from={sep + 8} style={{ top: 870, left: 190, width: 700, textAlign: 'center' }}>
        <span style={{ display: 'inline-block', padding: '16px 34px', border: `3px solid ${C.green}`, borderRadius: 999, fontFamily: sans, fontWeight: 600, fontSize: 40, color: C.green, background: 'rgba(131,193,103,0.1)' }}>
          treated as a value, not SQL
        </span>
      </Fade>
      <Fade from={pure} style={{ top: 1010, left: 190, width: 700, textAlign: 'center', fontFamily: sans }}>
        <div style={{ fontSize: 150, fontWeight: 600, lineHeight: 1, letterSpacing: -5, color: C.green, textShadow: '0 0 60px rgba(131,193,103,0.45)' }}>0</div>
        <div style={{ fontSize: 36, color: C.grey, marginTop: 12 }}>rows returned</div>
      </Fade>
      <Sfx t={T} name="whoosh" at={sep - 30} volume={0.28} />
      <Sfx t={T} name="success" at={sep + 4} volume={0.32} />
    </>
  )
}

// Scene 6 — takeaway
function Takeaway() {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const code = useCue('code', 66)
  const pop = springAt(frame, fps, 10, 13)
  const lockIn = springAt(frame, fps, 24, 12)
  const shut = prog(frame, code - 4, code + 6)
  return (
    <>
      <div style={{ position: 'absolute', top: 600, left: 70, right: 70, textAlign: 'center', opacity: pop, transform: `scale(${0.9 + pop * 0.1})` }}>
        <div style={{ fontFamily: serif, fontStyle: 'italic', fontSize: 96, lineHeight: 1.1, color: C.white }}>
          Input is <span style={{ color: C.green }}>data</span>,
        </div>
        <div style={{ fontFamily: serif, fontStyle: 'italic', fontSize: 96, lineHeight: 1.1, color: C.white, marginTop: 8 }}>
          never <span style={{ color: C.red }}>code</span>.
        </div>
      </div>
      <div style={{ opacity: Math.min(1, lockIn * 1.4), transform: `scale(${0.7 + 0.3 * lockIn})`, transformOrigin: '540px 1060px' }}>
        <Padlock x={540} y={1060} size={120} closed={shut} color={shut > 0.5 ? C.green : C.grey} glow={shut} />
      </div>
      <div style={{ position: 'absolute', top: 1170, left: 0, right: 0, textAlign: 'center', fontFamily: mono, fontSize: 32, color: C.grey, opacity: prog(frame, code + 6, code + 18) }}>
        WHERE email = <span style={{ color: C.green }}>$1</span>
      </div>
      <Sfx t={T} name="lock" at={code - 4} volume={0.4} />
    </>
  )
}

export function InjectionReel() {
  return (
    <Stage>
      <ReelAudio t={T} voiceVolume={0.85} musicVolume={0.21} duck={0.5} />
      <Scene t={T} id="hook"><Hook /></Scene>
      <Scene t={T} id="concat"><Concat /></Scene>
      <Scene t={T} id="payload"><Payload /></Scene>
      <Scene t={T} id="leak"><Leak /></Scene>
      <Scene t={T} id="fix"><Fix /></Scene>
      <Scene t={T} id="takeaway"><Takeaway /></Scene>
      <Captions t={T} />
    </Stage>
  )
}
