import { interpolate, useCurrentFrame, useVideoConfig } from 'remotion'
import { Captions, ReelAudio, Scene, Sfx, buildTimeline, useCue, type Manifest } from './audio'
import manifest from './audio/injection.json'
import { C, Fade, Stage, Title, mono, sans, serif, useTween } from './primitives'
import { CodeLine, DbCylinder, GlowDefs, Panel, Tag, Verdict, springAt } from './kit-input'
import script from './scripts/injection.json'

const T = buildTimeline(script, manifest as unknown as Manifest)
export const INJECTION_REEL_FRAMES = T.total

const PAYLOAD = "' OR '1'='1"
const USERS = ['ana@', 'raj@', 'li@', 'sam@', 'mo@', 'eve@', 'kai@', 'zoe@', 'ben@', 'ivy@', 'oli@', 'max@']

// Scene 1 — hook: one apostrophe, a login that opens for anyone
function Hook() {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const apos = useCue('apostrophe', 20)
  const open = useCue('log', apos + 24)
  const pop = springAt(frame, fps, apos - 6, 11)
  const unlocked = frame >= open
  return (
    <>
      <Title from={4} top={150} size={70}>
        One apostrophe broke the login
      </Title>
      <div style={{ position: 'absolute', top: 520, left: 0, right: 0, textAlign: 'center' }}>
        <div
          style={{
            fontFamily: serif,
            fontSize: 340,
            lineHeight: 1,
            color: C.red,
            opacity: pop,
            transform: `scale(${0.6 + pop * 0.4})`,
            textShadow: '0 0 80px rgba(252,98,85,0.5)',
          }}
        >
          &rsquo;
        </div>
      </div>
      <div style={{ position: 'absolute', top: 1040, left: 190, right: 190 }}>
        <div
          style={{
            border: `3px solid ${unlocked ? C.red : C.dim}`,
            borderRadius: 22,
            padding: '26px 30px',
            background: '#0A0E13',
            fontFamily: mono,
            fontSize: 34,
            color: C.grey,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            boxShadow: unlocked ? '0 0 50px rgba(252,98,85,0.4)' : 'none',
          }}
        >
          <span>email</span>
          <span style={{ fontSize: 46 }}>{unlocked ? '\u{1F513}' : '\u{1F512}'}</span>
        </div>
        <Fade from={open + 4} style={{ position: 'static', marginTop: 26, textAlign: 'center', fontFamily: sans, fontWeight: 600, fontSize: 40, color: C.red }}>
          Logged in as anyone
        </Fade>
      </div>
      <Sfx t={T} name="impact" at={apos - 4} volume={0.4} />
      <Sfx t={T} name="error" at={open} volume={0.4} />
    </>
  )
}

// Scene 2 — concat: the email is pasted straight into the SQL string
function Concat() {
  const paste = useCue('pasted', 24)
  const flow = useTween(paste - 2, paste + 20)
  const danger = useCue('query', paste + 60)
  return (
    <>
      <Title from={0} top={150} size={64} color={C.yellow}>
        Your query trusts the input
      </Title>
      <Panel from={6} top={430} color={C.dim}>
        <CodeLine toks={[{ t: 'db.query(', c: C.white }]} style={{ fontSize: 33, lineHeight: 1.7 }} />
        <CodeLine
          toks={[
            { t: '  "SELECT * FROM users WHERE email = ', c: C.teal },
            { t: "'", c: C.yellow },
            { t: '"', c: C.teal },
          ]}
          style={{ fontSize: 33, lineHeight: 1.7 }}
        />
        <CodeLine
          toks={[
            { t: '  + ', c: C.grey },
            { t: 'email', c: C.red },
            { t: ' + ', c: C.grey },
            { t: '"\'"', c: C.teal },
          ]}
          style={{ fontSize: 33, lineHeight: 1.7 }}
        />
        <CodeLine toks={[{ t: ')', c: C.white }]} style={{ fontSize: 33, lineHeight: 1.7 }} />
      </Panel>
      {/* the user's input traveling up into the string */}
      <div style={{ position: 'absolute', top: 980, left: 0, right: 0, textAlign: 'center' }}>
        <Tag color={C.red} glow size={36} style={{ opacity: 1 - flow * 0.15, transform: `translateY(${(1 - flow) * 120}px)` }}>
          what the user typed
        </Tag>
      </div>
      <Fade from={danger - 8} style={{ top: 1250, left: 70, right: 70, textAlign: 'center', fontFamily: serif, fontStyle: 'italic', fontSize: 46, color: C.yellow, lineHeight: 1.25 }}>
        Input becomes part of the code
      </Fade>
      <Sfx t={T} name="typing" at={6} volume={0.3} />
      <Sfx t={T} name="whoosh" at={paste - 2} volume={0.35} />
    </>
  )
}

// Scene 3 — payload: the exploit slides in and the WHERE clause evaluates always-true
function Payload() {
  const frame = useCurrentFrame()
  const slide = useTween(14, 44)
  const whereCue = useCue('WHERE', 90)
  const falseCue = useCue('False', whereCue + 30)
  const trueCue = useCue('true', falseCue + 8)
  const alwaysCue = useCue('Always', trueCue + 10)
  return (
    <>
      <Title from={0} top={140} size={62} color={C.red}>
        The classic payload
      </Title>
      {/* payload sliding into the field */}
      <div style={{ position: 'absolute', top: 360, left: 120, right: 120 }}>
        <div
          style={{
            border: `3px solid ${C.red}`,
            borderRadius: 18,
            padding: '20px 26px',
            background: '#0A0E13',
            fontFamily: mono,
            fontSize: 40,
            color: C.red,
            overflow: 'hidden',
            boxShadow: '0 0 40px rgba(252,98,85,0.3)',
          }}
        >
          <span style={{ display: 'inline-block', transform: `translateX(${(1 - slide) * -520}px)`, whiteSpace: 'pre' }}>{PAYLOAD}</span>
        </div>
        <div style={{ textAlign: 'center', fontFamily: sans, fontSize: 28, color: C.grey, marginTop: 12 }}>typed into the email box</div>
      </div>
      {/* the resulting WHERE clause */}
      <Panel from={whereCue - 10} top={620} color={C.dim}>
        <div style={{ fontFamily: mono, fontSize: 34, lineHeight: 1.5, color: C.white }}>
          <span style={{ color: C.teal }}>WHERE email = </span>
          <span style={{ color: C.grey }}>''</span>
          <span style={{ color: C.yellow }}> OR </span>
          <span style={{ color: C.red, background: 'rgba(252,98,85,0.16)', padding: '0 6px', borderRadius: 6 }}>'1'='1'</span>
        </div>
      </Panel>
      {/* evaluation */}
      <div style={{ position: 'absolute', top: 820, left: 90, right: 190, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Verdict label={<span>email = ''</span>} value={false} reveal={falseCue} frame={frame} width={330} />
        <div style={{ fontFamily: mono, fontSize: 48, color: C.yellow }}>OR</div>
        <Verdict label={<span>'1' = '1'</span>} value={true} reveal={trueCue} frame={frame} width={330} />
      </div>
      {/* always true */}
      <div
        style={{
          position: 'absolute',
          top: 1120,
          left: 70,
          right: 70,
          textAlign: 'center',
          opacity: interpolate(frame, [alwaysCue, alwaysCue + 10], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }),
        }}
      >
        <div style={{ display: 'inline-block', padding: '20px 44px', border: `4px solid ${C.green}`, borderRadius: 20, background: 'rgba(131,193,103,0.12)', boxShadow: '0 0 50px rgba(131,193,103,0.4)' }}>
          <span style={{ fontFamily: sans, fontWeight: 700, fontSize: 56, color: C.green }}>always TRUE</span>
        </div>
      </div>
      <Fade from={alwaysCue + 14} style={{ top: 1320, left: 70, right: 70, textAlign: 'center', fontFamily: serif, fontStyle: 'italic', fontSize: 44, color: C.white }}>
        The filter can never fail
      </Fade>
      <Sfx t={T} name="whoosh" at={14} volume={0.35} />
      <Sfx t={T} name="error" at={falseCue} volume={0.3} />
      <Sfx t={T} name="success" at={trueCue} volume={0.25} />
      <Sfx t={T} name="impact" at={alwaysCue} volume={0.35} />
    </>
  )
}

// Scene 4 — leak: every row matches, every user spills out
function Leak() {
  const frame = useCurrentFrame()
  const start = useCue('Every', 6)
  const leak = (i: number) => interpolate(frame, [start + 10 + i * 3, start + 22 + i * 3], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
  return (
    <>
      <Title from={0} top={150} size={66} color={C.red}>
        Every row matches
      </Title>
      <svg viewBox="0 0 1080 1920" style={{ position: 'absolute', inset: 0 }}>
        <GlowDefs />
        <DbCylinder x={540} y={520} w={170} h={200} color={C.red} glow />
      </svg>
      <div style={{ position: 'absolute', top: 760, left: 130, right: 200, display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 18 }}>
        {USERS.map((u, i) => (
          <div
            key={u}
            style={{
              opacity: leak(i),
              transform: `translateY(${(1 - leak(i)) * -40}px) scale(${0.8 + leak(i) * 0.2})`,
              border: `3px solid ${C.red}`,
              borderRadius: 14,
              padding: '16px 0',
              textAlign: 'center',
              fontFamily: mono,
              fontSize: 28,
              color: C.red,
              background: 'rgba(252,98,85,0.1)',
              boxShadow: '0 0 24px rgba(252,98,85,0.25)',
            }}
          >
            {u}
          </div>
        ))}
      </div>
      <Fade from={start + 42} style={{ top: 1330, left: 70, right: 70, textAlign: 'center', fontFamily: sans, fontWeight: 600, fontSize: 44, color: C.red }}>
        The whole user table walks out
      </Fade>
      <Sfx t={T} name="leak" at={start + 8} volume={0.4} />
    </>
  )
}

// Scene 5 — fix: the query holds a placeholder, the value travels on a separate channel
function Fix() {
  const frame = useCurrentFrame()
  const sep = useCue('separately', 150)
  const dataCue = useCue('data', sep + 6)
  const travelP = useTween(sep - 30, sep + 6)
  // payload rides the data channel to the $1 slot (clamped so the chip stays inside the dashed box)
  const px = interpolate(travelP, [0, 1], [20, 360], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
  const arrived = frame >= sep + 4
  return (
    <>
      <Title from={0} top={140} size={60} color={C.green}>
        Claude&rsquo;s fix: parameters
      </Title>
      <Panel from={6} top={360} color={C.green} glow="rgba(131,193,103,0.18)">
        <CodeLine toks={[{ t: '- ', c: C.red }, { t: '...email = ', c: C.grey }, { t: "'\" + email + \"'", c: C.red }]} style={{ fontSize: 31, lineHeight: 1.7, background: 'rgba(252,98,85,0.08)', borderRadius: 8, padding: '2px 10px' }} />
        <CodeLine toks={[{ t: '+ ', c: C.green }, { t: '...WHERE email = ', c: C.teal }, { t: '$1', c: C.yellow }, { t: ', ', c: C.grey }, { t: '[email]', c: C.green }]} style={{ fontSize: 31, lineHeight: 1.7, background: 'rgba(131,193,103,0.08)', borderRadius: 8, padding: '2px 10px' }} />
      </Panel>
      {/* two channels: query text vs data */}
      <div style={{ position: 'absolute', top: 640, left: 90, right: 190 }}>
        {/* query channel */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 44 }}>
          <div style={{ fontFamily: sans, fontSize: 26, color: C.teal, width: 120 }}>query</div>
          <div style={{ flex: 1, border: `3px solid ${C.teal}`, borderRadius: 16, padding: '18px 22px', fontFamily: mono, fontSize: 32, color: C.white, background: '#0A0E13' }}>
            WHERE email = <span style={{ color: arrived ? C.green : C.yellow, background: arrived ? 'rgba(131,193,103,0.16)' : 'rgba(244,211,94,0.14)', padding: '0 8px', borderRadius: 6 }}>$1</span>
          </div>
        </div>
        {/* data channel */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ fontFamily: sans, fontSize: 26, color: C.green, width: 120 }}>data</div>
          <div style={{ flex: 1, position: 'relative', height: 76, border: `3px dashed ${C.green}`, borderRadius: 16, background: 'rgba(131,193,103,0.05)' }}>
            <div style={{ position: 'absolute', top: 10, left: px, transition: 'none' }}>
              <Tag color={arrived ? C.green : C.red} size={30} glow style={{ whiteSpace: 'nowrap' }}>{PAYLOAD}</Tag>
            </div>
          </div>
        </div>
      </div>
      <Fade from={dataCue - 4} style={{ top: 1010, left: 70, right: 70, textAlign: 'center' }}>
        <span style={{ display: 'inline-block', padding: '16px 34px', border: `3px solid ${C.green}`, borderRadius: 999, fontFamily: sans, fontWeight: 600, fontSize: 38, color: C.green, background: 'rgba(131,193,103,0.1)' }}>
          treated as a value, not SQL
        </span>
      </Fade>
      <Fade from={dataCue + 20} style={{ top: 1150, left: 70, right: 70, textAlign: 'center', fontFamily: mono, fontSize: 40, color: C.white }}>
        0 rows returned
      </Fade>
      <Sfx t={T} name="whoosh" at={sep - 30} volume={0.3} />
      <Sfx t={T} name="success" at={sep + 4} volume={0.35} />
    </>
  )
}

// Scene 6 — takeaway
function Takeaway() {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const code = useCue('code', 40)
  const pop = springAt(frame, fps, 10, 13)
  const lock = springAt(frame, fps, code - 4, 12)
  return (
    <>
      <div style={{ position: 'absolute', top: 640, left: 70, right: 70, textAlign: 'center', opacity: pop, transform: `scale(${0.9 + pop * 0.1})` }}>
        <div style={{ fontFamily: serif, fontStyle: 'italic', fontSize: 92, lineHeight: 1.1, color: C.white }}>
          Input is <span style={{ color: C.green }}>data</span>,
        </div>
        <div style={{ fontFamily: serif, fontStyle: 'italic', fontSize: 92, lineHeight: 1.1, color: C.white, marginTop: 8 }}>
          never <span style={{ color: C.red }}>code</span>.
        </div>
      </div>
      <div style={{ position: 'absolute', top: 1000, left: 0, right: 0, textAlign: 'center', opacity: lock, transform: `scale(${0.6 + lock * 0.4})` }}>
        <span style={{ fontSize: 120 }}>{'\u{1F510}'}</span>
      </div>
      <Sfx t={T} name="lock" at={code - 2} volume={0.45} />
    </>
  )
}

export function InjectionReel() {
  return (
    <Stage>
      <ReelAudio t={T} musicVolume={0.16} />
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
