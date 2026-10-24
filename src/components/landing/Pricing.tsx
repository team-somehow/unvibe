import { ArrowUpRight, Check, Cloud, Monitor, Play } from 'lucide-react'
import { Link } from 'react-router-dom'
import { SignupLink } from './SignupSection'
import './Pricing.css'

export function Pricing() {
  return (
    <section id="pricing" className="uv-pricing uv-container" aria-labelledby="pricing-title">
      <div className="uv-section-heading">
        <div>
          <p className="uv-eyebrow">SMALL SCROLLS. NO BIG COMMITMENT.</p>
          <h2 id="pricing-title">
            Start with curiosity.
            <br />
            <em>Keep your options.</em>
          </h2>
        </div>
        <p className="uv-section-description">
          Try the feed for free. Make reels on your own machine. Choose cloud generation when it’s ready.
        </p>
      </div>

      <div className="uv-price-grid">
        <article className="uv-price-card">
          <div className="uv-price-topline">
            <Play size={19} strokeWidth={1.4} aria-hidden />
            <span>TAKE A LOOK</span>
          </div>
          <h3>Demo</h3>
          <p className="uv-price-description">A good rabbit hole. Zero setup.</p>
          <p className="uv-price-amount">
            <strong>$0</strong> <span>always free</span>
          </p>
          <Link to="/app" className="uv-price-action">
            Explore the demo <ArrowUpRight size={17} aria-hidden />
          </Link>
          <ul>
            <li>
              <Check size={14} aria-hidden /> Watch every sample reel
            </li>
            <li>
              <Check size={14} aria-hidden /> Try questions, polls & saves
            </li>
            <li>
              <Check size={14} aria-hidden /> No account or card required
            </li>
          </ul>
          <p className="uv-price-detail">Example sessions and scripted replies.</p>
        </article>

        <article className="uv-price-card uv-price-local">
          <div className="uv-price-topline">
            <Monitor size={20} strokeWidth={1.4} aria-hidden />
            <span>BRING YOUR OWN SESSION</span>
          </div>
          <h3>Local</h3>
          <p className="uv-price-description">Your code. An actual aha moment.</p>
          <p className="uv-price-amount">
            <strong>$0</strong> <span>platform fee</span>
          </p>
          <Link to="/connect" className="uv-price-action">
            Connect your machine <ArrowUpRight size={17} aria-hidden />
          </Link>
          <ul>
            <li>
              <Check size={14} aria-hidden /> Select your Claude Code sessions
            </li>
            <li>
              <Check size={14} aria-hidden /> Generate & render on your machine
            </li>
            <li>
              <Check size={14} aria-hidden /> Preview before adding to your feed
            </li>
          </ul>
          <p className="uv-price-detail">
            Requires local setup. Your Claude and optional voice provider usage is billed separately. No included AI credits.
          </p>
        </article>

        <article className="uv-price-card uv-price-cloud">
          <div className="uv-price-topline">
            <Cloud size={21} strokeWidth={1.4} aria-hidden />
            <span>PLANNED · NOT AVAILABLE YET</span>
          </div>
          <h3>Cloud Pro</h3>
          <p className="uv-price-description">More understanding. Less setup.</p>
          <p className="uv-price-amount">
            <strong>$19</strong> <span>/ month, proposed</span>
          </p>
          <SignupLink className="uv-price-action">
            Get the launch email <ArrowUpRight size={17} aria-hidden />
          </SignupLink>
          <ul>
            <li>
              <Check size={14} aria-hidden /> 30 narrated reels each month
            </li>
            <li>
              <Check size={14} aria-hidden /> 45–60 seconds per reel
            </li>
            <li>
              <Check size={14} aria-hidden /> Cloud rendering & MP4 downloads
            </li>
          </ul>
          <p className="uv-price-detail">Planned allowance; each new generation uses one reel. No checkout or payments today.</p>
        </article>
      </div>

      <div className="uv-price-fine-print">
        <span>Free to explore. Free to connect. Provider costs stay visible.</span>
        <a href="#how-it-works">
          How does local setup work? <ArrowUpRight size={13} aria-hidden />
        </a>
      </div>
    </section>
  )
}
