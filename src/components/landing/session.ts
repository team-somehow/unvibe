import type { ReelKind } from '../../reels/registry'

/** One line of the hero's Claude Code transcript. Lines with `reel` are the changes worth a reel. */
export type Line = {
  id: string
  /** Glyph Claude Code prints in front of the line. */
  glyph?: '>' | '⏺' | '⎿'
  text: string
  /** Part of `text` to colour as a result (e.g. a timing). */
  result?: { text: string; tone: 'bad' | 'good' }
  reel?: ReelKind
  tone?: 'prompt' | 'quiet' | 'good'
  /** A line that is still waiting on the reader (the poll). */
  waiting?: boolean
}

export const REPO = 'shopfront-api'

export const SESSION: Line[] = [
  { id: 'l1', glyph: '>', text: 'the orders page takes 2 seconds and a user got charged twice. fix both', tone: 'prompt' },
  { id: 'l2', glyph: '⏺', text: 'Bash(psql -c "EXPLAIN ANALYZE SELECT * FROM orders WHERE user_id = 42")' },
  { id: 'l3', glyph: '⎿', text: 'Seq Scan on orders  1.8 s', result: { text: '1.8 s', tone: 'bad' } },
  { id: 'l4', glyph: '⏺', text: 'Update(migrations/0042_orders_index.sql)', reel: 'index' },
  { id: 'l5', glyph: '⎿', text: 'Index Scan using idx_orders_user_id  4 ms', result: { text: '4 ms', tone: 'good' } },
  { id: 'l5b', glyph: '⏺', text: 'Read(src/payments/charge.ts)' },
  { id: 'l6', glyph: '⏺', text: 'Update(src/payments/charge.ts): lock the wallet row before charging', reel: 'race' },
  { id: 'l7', glyph: '⏺', text: 'Read(src/auth/lookup.ts)' },
  { id: 'l8', glyph: '⏺', text: 'Update(src/auth/lookup.ts): use a parameterized query', reel: 'injection' },
  { id: 'l9', glyph: '⏺', text: 'Update(src/auth/token.ts): verify the signature on every request', reel: 'jwt' },
  { id: 'l9b', glyph: '⏺', text: 'Search(pattern: "session", path: "src/auth")' },
  { id: 'l9c', glyph: '⎿', text: 'Found 3 files' },
  { id: 'l10', glyph: '⏺', text: 'AskUserQuestion: Where should login sessions live?', reel: 'poll' },
  { id: 'l11', glyph: '⎿', text: 'Waiting for your answer', waiting: true },
]

/** What the session prints once the reader votes in the poll. */
export function writeBack(choice: string): Line[] {
  return [
    { id: 'w1', glyph: '⎿', text: `You chose ${choice} in Unvibe`, tone: 'good' },
    choice === 'Redis'
      ? { id: 'w2', glyph: '⏺', text: 'Update(docker-compose.yml): add a redis service with a 30-day session TTL' }
      : { id: 'w2', glyph: '⏺', text: 'Update(migrations/0043_sessions.sql): add a sessions table with expires_at' },
    { id: 'w3', glyph: '⏺', text: 'Bash(npm test)' },
    { id: 'w4', glyph: '⎿', text: '42 passed', result: { text: '42 passed', tone: 'good' } },
    { id: 'w5', glyph: '⏺', text: choice === 'Redis' ? 'Done. 5 files changed, 1 migration added.' : 'Done. 5 files changed, 2 migrations added.' },
  ]
}

export type Slide = {
  kind: ReelKind
  /** The data id `agentReply` answers for. */
  replyId: string
  caption: string
  /** Short name used in labels: "Playing: {name}". */
  name: string
  /** Suggested questions. Each must match one of the reel's answers in agentReply, so check them there. */
  chips: string[]
}

/** The hero's reels, in the order the session made the changes. */
export const SLIDES: Slide[] = [
  {
    kind: 'index',
    replyId: 'r-index',
    name: 'Why one index made the orders page fast',
    caption: 'One line in a migration took the orders page from 1.8 s to 4 ms.',
    chips: ['Does an index slow writes?', 'How did you find it?'],
  },
  {
    kind: 'race',
    replyId: 'r-race',
    name: 'The double charge race condition',
    caption: 'Two taps on Pay read the same balance. Locking the row fixed it.',
    chips: ['Can the lock deadlock?', 'What about double taps?'],
  },
  {
    kind: 'injection',
    replyId: 'r-injection',
    name: 'The SQL injection in the login lookup',
    caption: 'The old login lookup pasted the email straight into the SQL.',
    chips: ['Does my ORM protect me?', 'Why not escape the input?'],
  },
  {
    kind: 'jwt',
    replyId: 'r-jwt',
    name: 'What a JWT signature protects',
    caption: 'Anyone can read a JWT. The signature check is what stops edits.',
    chips: ['Should I encrypt it?', 'Where is the secret kept?'],
  },
  {
    kind: 'poll',
    replyId: 'r-poll',
    name: 'Claude is asking where login sessions should live',
    caption: 'Claude paused here to ask you. Vote and the session carries on.',
    chips: ['Which would you pick?', 'What if Redis restarts?'],
  },
]

export const lineFor = (kind: ReelKind) => SESSION.find((l) => l.reel === kind)!

export type Person = { handle: string; color: string }

/** Reels from other people, for the explore grid. */
export const EXPLORE: { kind: ReelKind; author: Person; topic: string; caption: string; replyId: string }[] = [
  { kind: 'rls', author: { handle: 'mira.k', color: '#9A72AC' }, topic: 'Row level security', caption: 'My Supabase app handed every profile to anyone who asked.', replyId: 'r-rls' },
  { kind: 'secrets', author: { handle: 'tomhacks', color: '#FC6255' }, topic: 'Leaked API keys', caption: 'My Stripe secret key was sitting in the public JavaScript bundle.', replyId: 'r-secrets' },
  { kind: 'nplus1', author: { handle: 'devon_codes', color: '#83C167' }, topic: 'N+1 queries', caption: 'Fifty-one queries to show fifty posts. Claude got it down to two.', replyId: 'r-nplus1' },
  { kind: 'backoff', author: { handle: 'priya.ships', color: '#58C4DD' }, topic: 'Retries and backoff', caption: 'A two-second outage became ten minutes because of my retry loop.', replyId: 'r-backoff' },
  { kind: 'hashing', author: { handle: 'mira.k', color: '#9A72AC' }, topic: 'Password hashing', caption: 'I was hashing passwords with plain SHA-256. Here is why that fails.', replyId: 'r-hashing' },
  { kind: 'xss', author: { handle: 'tomhacks', color: '#FC6255' }, topic: 'Cross-site scripting', caption: 'One profile bio could have stolen the session of every visitor.', replyId: 'r-xss' },
]
