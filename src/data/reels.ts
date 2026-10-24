import type { ReelKind } from '../reels/registry'
import type { SessionReelProps } from '../reels/SessionReel'

export type Person = { handle: string; color: string }

export type Comment = {
  id: string
  author: Person
  text: string
  time: string
  likes: number
  agent?: boolean
  fresh?: boolean
}

export type Poll = {
  options: { label: string; votes: number }[]
  resolution: (choice: string) => string
}

export type Reel = {
  id: string
  kind: ReelKind
  author: Person
  caption: string
  session: { repo: string; title: string; when: string }
  likes: number
  shares: number
  comments: Comment[]
  poll?: Poll
  props?: SessionReelProps
  /** Short subject label shown on the reel, e.g. "Databases" */
  topic?: string
  /** Suggested questions shown above the comment box */
  suggestions?: string[]
}

export const ME: Person = { handle: 'you', color: '#F4D35E' }
export const CLAUDE: Person = { handle: 'claude', color: '#D97757' }

const priya: Person = { handle: 'priya.ships', color: '#58C4DD' }
const dev: Person = { handle: 'devon_codes', color: '#83C167' }
const mira: Person = { handle: 'mira.k', color: '#9A72AC' }
const tom: Person = { handle: 'tomhacks', color: '#FC6255' }

export const SEED_REELS: Reel[] = [
  {
    id: 'r-index',
    topic: 'Databases',
    kind: 'index',
    author: ME,
    caption: 'Claude added one line to a migration and my orders page got 400x faster. Here is why.',
    session: { repo: 'shopfront-api', title: 'Fix slow orders endpoint', when: '2h' },
    likes: 1284,
    shares: 96,
    comments: [
      { id: 'c1', author: priya, text: 'the tree walk animation finally made B-trees click for me', time: '1h', likes: 42 },
      { id: 'c2', author: dev, text: 'does an index slow down writes though?', time: '48m', likes: 18 },
      { id: 'c3', author: CLAUDE, agent: true, text: 'Yes, a little. Every INSERT into orders now also updates idx_orders_user_id. For a read-heavy table like this one, that trade is worth it.', time: '47m', likes: 31 },
    ],
  },
  {
    id: 'r-poll',
    topic: 'Architecture',
    kind: 'poll',
    author: ME,
    caption: 'Claude paused my auth-service session to ask this. Vote and it carries on.',
    session: { repo: 'auth-service', title: 'Add persistent login', when: 'now' },
    likes: 312,
    shares: 12,
    comments: [
      { id: 'c1', author: tom, text: 'redis every time for sessions imo', time: '4m', likes: 9 },
    ],
    poll: {
      options: [
        { label: 'Redis', votes: 58 },
        { label: 'Postgres', votes: 42 },
      ],
      resolution: (choice) =>
        choice === 'Redis'
          ? 'Going with Redis. I will add a 30-day TTL on session keys and a docker-compose service for local dev.'
          : 'Going with Postgres. I will add a sessions table with an expires_at index and a nightly cleanup job.',
    },
  },
  {
    id: 'r-injection',
    topic: 'Security',
    kind: 'injection',
    author: priya,
    caption: 'My login lookup was one quote away from dumping every user. Claude caught it during a refactor.',
    session: { repo: 'acme-dashboard', title: 'Refactor auth helpers', when: '5h' },
    likes: 8921,
    shares: 1204,
    comments: [
      { id: 'c1', author: mira, text: 'genuinely scary how normal that first line looks', time: '3h', likes: 210 },
      { id: 'c2', author: tom, text: 'ORMs protect you from this right?', time: '2h', likes: 77 },
      { id: 'c3', author: CLAUDE, agent: true, text: 'Mostly. ORM query builders parameterize for you, but raw query escapes like sequelize.query() or knex.raw() with string concatenation are just as vulnerable.', time: '2h', likes: 154 },
    ],
  },
  {
    id: 'r-race',
    topic: 'Concurrency',
    kind: 'race',
    author: dev,
    caption: 'A user double-tapped Pay and we charged them once but shipped twice. The bug was a race condition.',
    session: { repo: 'wallet-service', title: 'Investigate double spend', when: '1d' },
    likes: 4410,
    shares: 388,
    comments: [
      { id: 'c1', author: priya, text: 'FOR UPDATE is doing a lot of quiet work in so many codebases', time: '20h', likes: 64 },
    ],
  },
  {
    id: 'r-jwt',
    topic: 'Auth',
    kind: 'jwt',
    author: mira,
    caption: 'I stored the user role in a JWT and assumed nobody could read it. Wrong on one count.',
    session: { repo: 'mira-portfolio', title: 'Add admin route', when: '2d' },
    likes: 2390,
    shares: 140,
    comments: [
      { id: 'c1', author: dev, text: 'paste any token into jwt.io and you will never forget this', time: '1d', likes: 51 },
    ],
  },
]

// Hardcoded agent answers for the demo; keyed by reel, matched on keywords
const ANSWERS: Record<string, [RegExp, string][]> = {
  'r-index': [
    [/how|know|explain|plan/i, 'I ran EXPLAIN ANALYZE on the slow query and saw "Seq Scan on orders". After the index it became "Index Scan using idx_orders_user_id".'],
    [/write|insert/i, 'Each write also updates the index, so inserts get slightly slower. On orders, reads outnumber writes about 50 to 1 in your logs, so it is a clear win.'],
    [/when|every|all|column/i, 'Index columns you filter or join on often, like user_id here. Indexing everything wastes disk and slows writes, so I only add one after checking the query plan.'],
  ],
  'r-injection': [
    [/orm|prisma|sequelize|knex/i, 'ORM query builders parameterize for you. The risk comes back with raw query escape hatches when you build the string yourself.'],
    [/escape|sanitize|clean/i, 'Escaping is easy to get wrong. Parameters are safer because the database never parses your input as SQL at all.'],
    [/how|find|catch|notice/i, 'While refactoring lookup.ts I saw a value from req.body concatenated into a SQL string. That pattern is always worth flagging.'],
  ],
  'r-race': [
    [/lock|slow|deadlock/i, 'The lock only covers one wallet row for a few milliseconds, so other users are not blocked. Deadlocks need two rows locked in opposite orders, which this code never does.'],
    [/idempot|retry|double/i, 'Good instinct. I also added an idempotency key on the Pay request, so a retried request returns the first result instead of charging again.'],
  ],
  'r-jwt': [
    [/encrypt|jwe|hide/i, 'If the payload must be secret, use JWE, which encrypts it. Usually it is simpler to keep sensitive data server-side and put only an ID in the token.'],
    [/secret|key|rotate/i, 'The HMAC secret lives in JWT_SECRET and never leaves the server. Rotating it logs everyone out, so plan it.'],
  ],
  'r-poll': [[/why|differ|which/i, 'Both work. Redis is faster and expires keys for you. Postgres means one less service. Your vote decides what I do next.']],
}

export function agentReply(reelId: string, question: string): string {
  for (const [re, answer] of ANSWERS[reelId] ?? []) if (re.test(question)) return answer
  return 'Good question. In this session I made that change because the original code worked for the happy path but failed under real traffic. Ask me about any line and I will walk through it.'
}

export const REPOS = ['shopfront-api', 'auth-service', 'wallet-service', 'acme-dashboard']

export const FAKE_SESSION_LOG = (prompt: string, repo: string) => [
  { kind: 'user', text: prompt },
  { kind: 'tool', text: `Read(${repo}/src/routes/index.ts)` },
  { kind: 'tool', text: `Grep("rateLimit", ${repo}/src)` },
  { kind: 'think', text: 'No rate limiting on /login. Adding a sliding window keyed by IP.' },
  { kind: 'tool', text: `Update(${repo}/src/middleware/rateLimit.ts)` },
  { kind: 'tool', text: 'Bash(npm test)' },
  { kind: 'ok', text: '42 passed, 0 failed' },
  { kind: 'done', text: 'Done. 3 files changed, 1 migration added.' },
]

export const CONCEPTS_FOR = () => ['Sliding window rate limiting', 'Why you key limits by IP and user', 'Returning 429 with Retry-After']
