import { Sequence, interpolate, useCurrentFrame } from 'remotion'
import { C, Chip, Fade, Stage, Title, TranscriptCard, mono, serif, usePop, useTween } from './primitives'

const USERS = ['ana@', 'raj@', 'li@', 'sam@', 'mo@', 'eve@', 'kai@', 'zoe@', 'ben@', 'ivy@', 'oli@', 'max@']

function Exploit() {
  const frame = useCurrentFrame()
  const chip = usePop(70)
  const slide = useTween(110, 140)
  const leak = (i: number) => interpolate(frame, [170 + i * 4, 180 + i * 4], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
  return (
    <>
      <Title from={0} top={170} size={70}>This query trusts whatever you type</Title>
      <div style={{ position: 'absolute', top: 400, left: 70, right: 70, background: '#0A0E13', border: `2px solid ${C.dim}`, borderRadius: 28, padding: '30px 34px', fontFamily: mono, fontSize: 31, lineHeight: 1.6, color: C.white }}>
        <div>db.query(</div>
        <div style={{ paddingLeft: 30 }}><span style={{ color: C.yellow }}>"SELECT * FROM users WHERE email = '"</span></div>
        <div style={{ paddingLeft: 30 }}>+ <span style={{ color: C.red }}>email</span> + <span style={{ color: C.yellow }}>"'"</span></div>
        <div>)</div>
      </div>
      <div style={{ position: 'absolute', top: 760 + slide * 120, left: 0, right: 0, textAlign: 'center', opacity: chip * (1 - slide), transform: `scale(${chip})` }}>
        <span style={{ fontSize: 34, color: C.grey, marginRight: 18 }}>email =</span>
        <Chip color={C.red} style={{ fontFamily: mono }}>' OR '1'='1</Chip>
      </div>
      <Fade from={128} style={{ top: 860, left: 70, right: 70, fontFamily: mono, fontSize: 32, lineHeight: 1.5, color: C.white, textAlign: 'center' }}>
        …WHERE email = '<span style={{ color: C.red, background: 'rgba(252,98,85,0.15)', padding: '0 6px' }}>' OR '1'='1</span>'
        <div style={{ fontFamily: serif, fontStyle: 'italic', fontSize: 44, color: C.red, marginTop: 18 }}>'1'='1' is always true</div>
      </Fade>
      <div style={{ position: 'absolute', top: 1110, left: 110, right: 110, display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
        {USERS.map((u, i) => (
          <div key={u} style={{ opacity: leak(i), transform: `translateY(${(1 - leak(i)) * 30}px)`, border: `3px solid ${C.red}`, borderRadius: 14, padding: '14px 0', textAlign: 'center', fontFamily: mono, fontSize: 26, color: C.red, background: 'rgba(252,98,85,0.08)' }}>
            {u}
          </div>
        ))}
      </div>
      <Fade from={225} style={{ top: 1400, left: 70, right: 70, textAlign: 'center', fontSize: 40, fontWeight: 600, color: C.red }}>
        Every row matches. Every user leaks.
      </Fade>
    </>
  )
}

function Fix() {
  const frame = useCurrentFrame()
  const drop = useTween(80, 115)
  const settled = frame > 118
  return (
    <>
      <Title from={0} top={170} size={70} color={C.green}>Claude's fix: send the input separately</Title>
      <TranscriptCard
        from={8}
        top={430}
        tool="Update(src/auth/lookup.ts)"
        lines={[
          { t: '- "...email = \'" + email + "\'"', kind: 'del' },
          { t: '+ "...WHERE email = $1", [email]', kind: 'add' },
        ]}
      />
      <div style={{ position: 'absolute', top: 820 + drop * 260, left: 0, right: 0, textAlign: 'center', opacity: frame > 70 ? 1 : 0 }}>
        <Chip color={settled ? C.grey : C.red} style={{ fontFamily: mono }}>' OR '1'='1</Chip>
      </div>
      <div style={{ position: 'absolute', top: 1040, left: 220, right: 220, height: 200, border: `4px solid ${C.green}`, borderTop: 'none', borderRadius: '0 0 30px 30px' }} />
      <Fade from={60} style={{ top: 1270, left: 70, right: 70, textAlign: 'center', fontFamily: serif, fontStyle: 'italic', fontSize: 46, color: C.green }}>
        $1 is always data, never SQL
      </Fade>
      <Fade from={125} style={{ top: 1370, left: 70, right: 70, textAlign: 'center', fontFamily: mono, fontSize: 36, color: C.white }}>
        0 rows returned
      </Fade>
    </>
  )
}

export function InjectionReel() {
  return (
    <Stage>
      <Sequence durationInFrames={270}>
        <Exploit />
      </Sequence>
      <Sequence from={270} durationInFrames={190}>
        <Fix />
      </Sequence>
    </Stage>
  )
}

export const INJECTION_REEL_FRAMES = 460
