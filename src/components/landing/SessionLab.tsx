import { ArrowRight, ArrowUp, Check, CornerDownRight, Database, MessageSquare, Terminal } from 'lucide-react'
import { useId, useRef, useState, type FormEvent, type KeyboardEvent } from 'react'
import { agentReply } from '../../data/reels'
import { SLIDES, writeBack } from './session'
import './SessionLab.css'

const TABS = ['Watch the change', 'Ask the why', 'Make the call']
const QUESTIONS = SLIDES[0].chips

function IndexTree() {
  return (
    <svg className="lab-tree" viewBox="0 0 480 150" role="img" aria-labelledby="lab-tree-title lab-tree-description">
      <title id="lab-tree-title">An index takes a direct path to user 42</title>
      <desc id="lab-tree-description">
        A simplified B-tree with four leaf pages. The lookup follows the branch containing user 42 instead of scanning every row.
      </desc>
      <g className="lab-tree-edges" fill="none" stroke="currentColor" strokeWidth="1.4">
        <path d="M204 47V65H57V91M228 47V74H178V91M252 47V74H300V91M276 47V65H421V91" />
      </g>
      <path className="lab-tree-path" d="M252 47V74H300V91" fill="none" strokeWidth="2.5" />
      <g className="lab-tree-root">
        <rect x="180" y="13" width="120" height="34" rx="6" />
        <path d="M220 13V47M260 13V47" />
        <text x="200" y="35">
          20
        </text>
        <text x="240" y="35">
          40
        </text>
        <text x="280" y="35">
          60
        </text>
      </g>
      {[
        { x: 7, text: '04 · 12 · 19' },
        { x: 128, text: '23 · 31 · 38' },
        { x: 250, text: '40 · 42 · 59' },
        { x: 371, text: '61 · 73 · 85' },
      ].map((leaf, index) => (
        <g key={leaf.x} className={index === 2 ? 'lab-tree-leaf lab-tree-selected' : 'lab-tree-leaf'}>
          <rect x={leaf.x} y="91" width="100" height="34" rx="6" />
          <text x={leaf.x + 50} y="113">
            {leaf.text}
          </text>
        </g>
      ))}
      <path className="lab-tree-pointer" d="M300 133l-4 6h8z" />
      <text className="lab-tree-found" x="300" y="150">
        found it.
      </text>
    </svg>
  )
}

function SourceDiff() {
  return (
    <div className="lab-terminal">
      <div className="lab-terminal-bar">
        <span>
          <Terminal size={14} /> shopfront-api
        </span>
        <span>migration / 0042</span>
      </div>
      <div className="lab-code">
        <p className="lab-code-comment">-- The query your orders page runs</p>
        <p>
          <span className="lab-syntax">SELECT</span> * <span className="lab-syntax">FROM</span> orders
        </p>
        <p>
          <span className="lab-syntax">WHERE</span> user_id = <span className="lab-code-number">42</span>;
        </p>
        <div className="lab-code-rule" />
        <p className="lab-code-comment">-- The one-line fix</p>
        <div className="lab-diff">
          <span aria-hidden>+</span>
          <code>
            CREATE INDEX idx_orders_user_id
            <br />
            <span className="lab-diff-indent">ON orders (user_id);</span>
          </code>
        </div>
        <div className="lab-query-plan">
          <CornerDownRight size={14} />
          <span>Index Scan using idx_orders_user_id</span>
        </div>
      </div>
      <div className="lab-terminal-foot">
        <span className="lab-status-dot" /> One small change. A different way through the data.
      </div>
    </div>
  )
}

export function SessionLab() {
  const uid = useId()
  const [active, setActive] = useState(0)
  const [question, setQuestion] = useState(QUESTIONS[0])
  const [draft, setDraft] = useState('')
  const [choice, setChoice] = useState<string | null>(null)
  const tabs = useRef<(HTMLButtonElement | null)[]>([])

  const onTabKey = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    let next = index
    if (event.key === 'ArrowRight') next = (index + 1) % TABS.length
    else if (event.key === 'ArrowLeft') next = (index + TABS.length - 1) % TABS.length
    else if (event.key === 'Home') next = 0
    else if (event.key === 'End') next = TABS.length - 1
    else return
    event.preventDefault()
    setActive(next)
    tabs.current[next]?.focus()
  }

  const ask = (value: string) => {
    const next = value.trim()
    if (!next) return
    setQuestion(next)
    setDraft('')
  }

  const submitQuestion = (event: FormEvent) => {
    event.preventDefault()
    ask(draft)
  }

  return (
    <div className="lab-shell">
      <div className="lab-topline">
        <span className="lab-eyebrow">A LITTLE LESS BLACK BOX</span>
        <span className="lab-preview-label">
          <span /> Interactive preview · example session
        </span>
      </div>
      <div className="lab-tabs" role="tablist" aria-label="Explore what Unvibe does">
        {TABS.map((tab, index) => (
          <button
            key={tab}
            ref={(node) => {
              tabs.current[index] = node
            }}
            id={`${uid}-tab-${index}`}
            role="tab"
            type="button"
            aria-selected={active === index}
            aria-controls={`${uid}-panel-${index}`}
            tabIndex={active === index ? 0 : -1}
            onClick={() => setActive(index)}
            onKeyDown={(event) => onTabKey(event, index)}
          >
            <span className="lab-tab-number">0{index + 1}</span>
            <span>{tab}</span>
            <ArrowRight size={17} aria-hidden />
          </button>
        ))}
      </div>

      <div className="lab-panel" role="tabpanel" id={`${uid}-panel-0`} aria-labelledby={`${uid}-tab-0`} hidden={active !== 0} tabIndex={0}>
        <div className="lab-source">
          <div className="lab-column-label">
            <span>THE CHANGE</span>
            <span>01 / SQL index</span>
          </div>
          <SourceDiff />
        </div>
        <div className="lab-result lab-watch-result">
          <div className="lab-column-label">
            <span>THE “OH, I GET IT.”</span>
            <span>From the sample session</span>
          </div>
          <h3>
            Skip the search.
            <br />
            Go straight to the row.
          </h3>
          <div className="lab-timing">
            <span className="lab-timing-before">
              1.8<span>s</span>
            </span>
            <ArrowRight size={25} strokeWidth={1.5} aria-hidden />
            <span className="lab-timing-after">
              4<span>ms</span>
            </span>
            <span className="lab-timing-note">
              same query.
              <br />
              smarter route.
            </span>
          </div>
          <IndexTree />
          <p className="lab-caption">A simplified B-tree. The highlighted path finds user 42 without reading every row.</p>
        </div>
      </div>

      <div className="lab-panel" role="tabpanel" id={`${uid}-panel-1`} aria-labelledby={`${uid}-tab-1`} hidden={active !== 1} tabIndex={0}>
        <div className="lab-source lab-ask-source">
          <div className="lab-column-label">
            <span>THE QUESTION</span>
            <MessageSquare size={15} aria-hidden />
          </div>
          <h3>
            That makes sense.
            <br />
            But what about…
          </h3>
          <p className="lab-copy">The reel is the start of the conversation. Pick a question, or ask your own.</p>
          <div className="lab-question-chips">
            {QUESTIONS.map((item) => (
              <button type="button" key={item} aria-pressed={question === item} onClick={() => ask(item)}>
                {item}
                <ArrowRight size={16} aria-hidden />
              </button>
            ))}
          </div>
          <form className="lab-question-form" onSubmit={submitQuestion}>
            <label htmlFor={`${uid}-question`} className="lab-sr-only">
              Ask a question about the index
            </label>
            <input
              id={`${uid}-question`}
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder="Ask about this change…"
              maxLength={400}
              autoComplete="off"
            />
            <button type="submit" disabled={!draft.trim()} aria-label="Ask question">
              <ArrowUp size={18} />
            </button>
          </form>
        </div>
        <div className="lab-result lab-answer-result" aria-live="polite" aria-atomic="true">
          <div className="lab-column-label">
            <span>THE EXPLANATION</span>
            <span>Scripted demo response</span>
          </div>
          <div className="lab-asked">
            <span className="lab-you-mark">Y</span>
            <p>{question}</p>
          </div>
          <div className="lab-answer">
            <span className="lab-agent-mark" aria-hidden>
              ✳
            </span>
            <div>
              <span className="lab-answer-author">
                Claude <span>on this session</span>
              </span>
              <p>{agentReply('r-index', question)}</p>
            </div>
          </div>
          <p className="lab-answer-foot">Less guessing. More “now I know why.”</p>
        </div>
      </div>

      <div className="lab-panel" role="tabpanel" id={`${uid}-panel-2`} aria-labelledby={`${uid}-tab-2`} hidden={active !== 2} tabIndex={0}>
        <div className="lab-source lab-poll-source">
          <div className="lab-column-label">
            <span>THE DECISION</span>
            <span>shopfront-api / auth</span>
          </div>
          <h3>
            Some decisions
            <br />
            are still yours.
          </h3>
          <p className="lab-copy">The agent needs a direction. Choose where login sessions should live to see the example continue.</p>
          <div className="lab-poll" role="group" aria-label="Where should login sessions live?">
            {['Redis', 'Postgres'].map((option) => (
              <button key={option} type="button" aria-pressed={choice === option} onClick={() => setChoice(option)}>
                <Database size={20} aria-hidden />
                <span>
                  {option}
                  <small>{option === 'Redis' ? 'Fast lookups, automatic expiry' : 'One database, fewer moving parts'}</small>
                </span>
                <span className="lab-poll-check">{choice === option && <Check size={15} aria-hidden />}</span>
              </button>
            ))}
          </div>
          <p className="lab-caption">Your choice changes this preview. Try either route.</p>
        </div>
        <div className="lab-result lab-continuation" aria-live="polite" aria-atomic="true">
          <div className="lab-column-label">
            <span>THE NEXT MOVE</span>
            <span>Scripted session continuation</span>
          </div>
          {choice ? (
            <div className="lab-continuation-log">
              <div className="lab-log-heading">
                <Terminal size={15} />
                <span>~ / shopfront-api</span>
                <span className="lab-log-choice">{choice} selected</span>
              </div>
              {writeBack(choice).map((line) => (
                <div
                  key={`${choice}-${line.id}`}
                  className={`lab-log-line${line.tone === 'good' || line.result?.tone === 'good' ? ' lab-log-good' : ''}`}
                >
                  <span aria-hidden>{line.glyph}</span>
                  <p>{line.text}</p>
                </div>
              ))}
              <span className="lab-log-cursor" aria-hidden />
            </div>
          ) : (
            <div className="lab-awaiting">
              <div className="lab-awaiting-glyph" aria-hidden>
                <CornerDownRight size={35} strokeWidth={1.3} />
              </div>
              <p>
                A small decision.
                <br />
                Then, back to building.
              </p>
              <span>Choose Redis or Postgres to continue.</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
