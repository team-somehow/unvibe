# Pricing proposal and operating model

As of October 24, 2026. Prices are USD. Only the free demo and local workflow are available; paid cloud checkout is not implemented or advertised as active.

| Plan | Price | Included | Current state |
| --- | --- | --- | --- |
| Demo | $0 | All curated sample reels, sample questions/polls, no account | Live |
| Local | $0 Unvibe platform fee | Own Claude Code sessions, local lesson generation and rendering, MP4 export, private browser library, optional own-key narration | Live, source installation required |
| Cloud Pro | Proposed $19/month | 30 narrated reels/month, target 45–60 seconds each, managed cloud rendering and MP4 downloads | Planned; no checkout or charges |

Local does not include AI or voice credits. Users authenticate the unmodified CLI through Anthropic's own flow; their usage remains under their own provider agreement and limits. Optional ElevenLabs narration uses their own local key. We do not resell a user's Claude subscription or collect its authentication tokens. See [Claude Code authentication and product integration guidance](https://code.claude.com/docs/en/legal-and-compliance).

## Why 30 reels for $19

Use a capped generation allowance rather than “unlimited AI.” A reel means one validated generated lesson and its initial narrated render, with a fixed short-duration target. Thirty is a starting allowance, not a claim of measured profitability.

Illustrative cost for a short cloud reel:

| Input | Working assumption | Cost |
| --- | --- | --- |
| Lesson generation | 12,000 input + 3,000 output tokens, Sonnet 5.5 standard API | $0.054 |
| Narration | 800 characters, ElevenLabs Multilingual v2 | $0.064 |
| Render compute | Hypothetical cloud budget, not measured in this implementation | $0.03–$0.08 |
| Remotion license allocation | Per-render rate when a company license is required, before its minimum spend | $0.01 |
| Subtotal | | $0.158–$0.208 |
| Retry / failure reserve | Add 30% | About $0.21–$0.27 |
| 30 reels | Variable generation budget | About $6.20–$8.10/month |

The token assumptions use [Anthropic's official API pricing](https://platform.claude.com/docs/en/about-claude/pricing): Sonnet 5.5 is $2/million input and $10/million output tokens. These estimates concern a future API-backed cloud worker, not the cost of the user's current local subscription.

The voice assumption uses [ElevenLabs API pricing](https://elevenlabs.io/pricing/api): Multilingual v2 is listed at $0.08 per 1,000 characters; Flash/Turbo is listed at $0.04 per 1,000. Account tier, included allowances and applicable terms can change effective costs.

[Remotion licensing](https://www.remotion.dev/docs/license/pricing) lists a free license for eligible individuals and companies up to three people; companies requiring its automation license pay $0.01/render with a $100/month minimum. At small cloud volume, that minimum is a fixed overhead, not merely one cent per job. License eligibility must be checked before commercial deployment.

Storage, bandwidth, support, taxes, payment fees, abuse, and the licensing minimum are excluded from the variable estimate. They must be budgeted before launch. Long transcripts, retries, and longer scripts cost more; the actual local generator allows bounded lessons rather than enforcing the proposed cloud plan's future quota.

## Rules to implement before a paid launch

- Reserve a credit before generation, settle it only after successful output, and release it for a system failure. User-requested regenerations consume another credit; re-downloading an existing export does not.
- Bound transcript size, script length, duration, model budget, parallelism, and retry count per job. Rate-limit new jobs and enforce monthly credits on the server.
- Re-render an existing lesson without another language-model call. Define whether changes to narration consume a credit and show that before the action.
- Add hosted authentication, durable per-user storage, billing checkout/portal, verified webhooks, and entitlement checks. Browser state must never decide a paid quota.
- Benchmark the actual cloud render worker and observed script/voice usage. Revisit the 30-reel allowance before accepting subscriptions.
- Keep Local free during this source-distributed beta; add a paid local plan only when it provides a distinct recurring benefit such as managed backup or team collaboration.

The page intentionally offers no “Buy” action for Cloud Pro until these parts exist. No annual discount, payment collection, or fake waitlist is implied.
