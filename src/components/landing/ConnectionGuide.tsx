import { ArrowRight, ArrowUpRight, Cable, Check, Code2, Download, Film, FolderCheck, LockKeyhole, Monitor } from 'lucide-react'
import { Link } from 'react-router-dom'
import './ConnectionGuide.css'

const STEPS = [
  {
    title: 'Download your companion.',
    body: 'A small download for the computer where you build. Set it up once, then keep it running beside Claude Code.',
    icon: Download,
  },
  {
    title: 'Connect Claude Code.',
    body: 'Sign in through Claude Code, then open your companion’s private pairing link to connect this browser.',
    icon: Cable,
  },
  {
    title: 'Choose what becomes a reel.',
    body: 'Pick a session and review its transcript. You decide what goes to Claude before generating the explanation.',
    icon: FolderCheck,
  },
  {
    title: 'Watch your code click.',
    body: 'Turn that session into a visual lesson. Watch it in your feed, save it for later, or export the video.',
    icon: Film,
  },
]

export function ConnectionGuide() {
  return (
    <section id="how-it-works" className="uv-connect-guide" aria-labelledby="connection-title">
      <div className="uv-container">
        <div className="uv-section-heading">
          <div>
            <p className="uv-eyebrow">FROM YOUR COMPUTER. TO YOUR NEXT AHA.</p>
            <h2 id="connection-title">
              Download once.
              <br />
              <em>Understand more.</em>
            </h2>
          </div>
          <div className="uv-connect-intro">
            <p className="uv-section-description">
              Meet the little companion behind your feed. It connects your Claude Code sessions to Unvibe, so the work you’ve already done
              becomes something you actually understand.
            </p>
            <a
              className="uv-button uv-button-coral uv-companion-download-action"
              href="/downloads/unvibe-companion.tar.gz"
              download="unvibe-companion.tar.gz"
            >
              <Download size={17} strokeWidth={1.7} aria-hidden="true" /> Download companion <ArrowUpRight size={17} aria-hidden="true" />
            </a>
            <p className="uv-companion-download-caption">Source package · One-time setup with Node.js 24+</p>
          </div>
        </div>
        <div className="uv-connect-layout">
          <div className="uv-companion-download">
            <div className="uv-companion-art" aria-label="Your desktop connects Claude Code sessions to an Unvibe reel" role="img">
              <div className="uv-companion-window">
                <div className="uv-companion-window-bar">
                  <span className="uv-companion-window-dots" aria-hidden="true">
                    <i />
                    <i />
                    <i />
                  </span>
                  <span>At home on your computer</span>
                  <Monitor size={13} aria-hidden="true" />
                </div>
                <div className="uv-companion-window-content">
                  <div className="uv-companion-icon">
                    <img src="/favicon.svg" alt="" width="104" height="104" />
                  </div>
                  <span className="uv-companion-sticky">
                    A little download.
                    <br />
                    <em>A lot of clarity.</em>
                  </span>
                  <div className="uv-companion-workflow" aria-hidden="true">
                    <span>
                      <Code2 size={18} strokeWidth={1.5} />
                      <strong>Claude Code</strong>
                      <small>Your sessions</small>
                    </span>
                    <ArrowRight size={19} strokeWidth={1.2} />
                    <span className="uv-companion-workflow-reel">
                      <Film size={18} strokeWidth={1.5} />
                      <strong>Your feed</strong>
                      <small>Now it makes sense</small>
                    </span>
                  </div>
                </div>
              </div>
              <span className="uv-companion-paper-note">
                <Check size={13} strokeWidth={2} /> You choose the session.
              </span>
            </div>
            <div className="uv-companion-download-info">
              <div className="uv-companion-download-title">
                <Monitor size={19} strokeWidth={1.4} />
                <div>
                  <h3>Unvibe companion</h3>
                  <p>For the computer where you use Claude Code</p>
                </div>
              </div>
              <p className="uv-companion-platforms">
                macOS · Windows · Linux <span>Source package · .tar.gz</span>
              </p>
              <p className="uv-connect-setup-note">
                Requires Node.js 24+ and a one-time terminal setup: extract, install dependencies, then run the companion. Bring your own
                Claude access; usage limits apply.
              </p>
            </div>
          </div>
          <div className="uv-connect-instructions">
            <p className="uv-connect-instructions-label">A SMALL SETUP. A BETTER HABIT.</p>
            <ol>
              {STEPS.map(({ title, body, icon: Icon }, index) => (
                <li key={title}>
                  <span className="uv-connect-step-number">0{index + 1}</span>
                  <div>
                    <h3>
                      {title}
                      <Icon size={17} strokeWidth={1.4} aria-hidden="true" />
                    </h3>
                    <p>{body}</p>
                  </div>
                </li>
              ))}
            </ol>
            <Link to="/connect" className="uv-text-link uv-companion-setup-link">
              Walk me through setup <ArrowUpRight size={17} aria-hidden="true" />
            </Link>
            <div className="uv-connect-privacy">
              <LockKeyhole size={16} strokeWidth={1.4} aria-hidden="true" />
              <p>
                Claude credentials stay on your computer. The transcript you approve goes to Claude; optional narration goes to your voice
                provider. Video rendering happens locally.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
