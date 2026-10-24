import type { ReelKind } from '../../reels/registry'
import type { Line } from './session'

type Props = {
  lines: Line[]
  /** The reel currently on stage; its line is the one being explained. */
  active: ReelKind | null
  /** How many lines have printed so far (the load sequence). */
  printed: number
  /** Changes whenever a line becomes active, so its highlight sweeps in again. */
  sweepKey: number
  onPick: (kind: ReelKind, el: HTMLElement) => void
  /** Hint id for the buttons' aria-describedby. */
  hintId?: string
  wrap?: boolean
}

/** Lets long code lines wrap after path separators instead of mid-word. */
export function Breakable({ text }: { text: string }) {
  const parts = text.split(/(?<=[/(:,])/)
  return (
    <>
      {parts.map((p, i) => (
        <span key={i}>
          {p}
          {i < parts.length - 1 && <wbr />}
        </span>
      ))}
    </>
  )
}

const GLYPH_COLOR: Record<string, string> = { '>': 'text-chalk', '⏺': 'text-quiet', '⎿': 'text-quiet' }

function Result({ line, wrap }: { line: Line; wrap: boolean }) {
  if (!line.result) return wrap ? <Breakable text={line.text} /> : <>{line.text}</>
  const i = line.text.lastIndexOf(line.result.text)
  return (
    <>
      {line.text.slice(0, i)}
      <span className={`whitespace-nowrap ${line.result.tone === 'bad' ? 'text-mred' : 'text-mgreen'}`}>{line.result.text}</span>
      {line.text.slice(i + line.result.text.length)}
    </>
  )
}

/**
 * The session as Claude Code printed it. Mono is the agent's voice: only literal transcript lines are set in it.
 * The lines that changed how the app behaves are buttons; each one opens its reel.
 */
export function Transcript({ lines, active, printed, sweepKey, onPick, hintId, wrap = false }: Props) {
  return (
    <ol className="flex flex-col" aria-label="Claude Code session transcript">
      {lines.map((l, i) => {
        const shown = i < printed
        const indent = l.glyph === '⎿'
        const isActive = !!l.reel && l.reel === active
        const mark = !l.reel
          ? ''
          : `underline-offset-[5px] ${isActive ? 'underline decoration-myellow decoration-2' : 'underline decoration-myellow/60 decoration-dotted decoration-[1.5px] group-hover/line:decoration-solid'}`
        const body = (
          <>
            <span aria-hidden className={`inline-block w-[2ch] shrink-0 no-underline ${isActive ? 'text-myellow' : l.reel ? 'text-myellow/80' : (GLYPH_COLOR[l.glyph ?? ''] ?? 'text-quiet')}`}>
              {l.glyph === '⎿' ? '⎿' : l.glyph}
            </span>
            <span className={`${wrap ? 'min-w-0 [overflow-wrap:anywhere]' : 'min-w-0 truncate'} ${mark}`}>
              {l.waiting ? (
                <>
                  <span aria-hidden className="relative mr-2 inline-flex size-2 -translate-y-px align-middle">
                    <span className="absolute inset-0 animate-[ping_1.4s_cubic-bezier(0,0,0.2,1)_3] rounded-full bg-myellow/70" />
                    <span className="relative inline-flex size-2 rounded-full bg-myellow" />
                  </span>
                  {l.text}
                </>
              ) : (
                <Result line={l} wrap={wrap} />
              )}
            </span>
          </>
        )
        return (
          <li
            key={l.id}
            className={`${indent ? 'pl-[2ch]' : ''} transition-opacity duration-150 ease-out`}
            style={{ opacity: shown ? 1 : 0 }}
            aria-hidden={!shown || undefined}
          >
            {l.reel ? (
              <button
                type="button"
                data-reel={l.reel}
                aria-pressed={isActive}
                aria-describedby={hintId}
                tabIndex={shown ? 0 : -1}
                title={wrap ? undefined : `${l.glyph} ${l.text}`}
                onClick={(e) => onPick(l.reel!, e.currentTarget)}
                className={`group/line relative -mx-1.5 flex max-w-[calc(100%+12px)] items-baseline rounded-md px-1.5 text-left transition-colors duration-150 ${
                  isActive ? 'text-myellow' : 'text-chalk hover:text-myellow focus-visible:text-myellow'
                }`}
              >
                {isActive && <span key={sweepKey} aria-hidden className="landing-sweep pointer-events-none absolute inset-0 rounded-md bg-myellow/[0.13]" />}
                <span className="relative flex min-w-0 items-baseline">{body}</span>
              </button>
            ) : (
              <div className={`flex min-w-0 items-baseline ${l.tone === 'prompt' ? 'text-chalk' : l.tone === 'good' ? 'text-mgreen' : 'text-quiet'}`}>{body}</div>
            )}
          </li>
        )
      })}
    </ol>
  )
}
