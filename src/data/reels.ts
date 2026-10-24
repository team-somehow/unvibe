import type { ReelKind } from '../reels/registry'
import type { SessionReelProps } from '../reels/SessionReel'
import type { GeneratedReelProps } from '../reels/GeneratedReel'

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
  props?: SessionReelProps | GeneratedReelProps
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
    kind: 'index',
    topic: "Databases",
    author: ME,
    caption: "Claude added one line to a migration and my orders page went from 1.8s to 4ms. Here's why.",
    session: { repo: "shopfront-api", title: "Fix slow orders endpoint", when: "2h" },
    likes: 1284,
    shares: 96,
    suggestions: ["Does an index slow down writes?", "How did you know it was a full scan?", "Is it really 20 steps for a million rows?"],
    comments: [
      { id: 'c1', author: priya, text: "the tree walk animation finally made B-trees click for me", time: "1h", likes: 42 },
      { id: 'c2', author: dev, text: "does an index slow down writes though?", time: "48m", likes: 18 },
      { id: 'c3', author: CLAUDE, agent: true, text: "Yes, a little. Every INSERT into orders now also updates idx_orders_user_id. For a read-heavy table like this one, that trade is worth it.", time: "47m", likes: 31 },
      { id: 'c4', author: mira, text: "watching the million-row scan race the 20-level tree is so good", time: "30m", likes: 12 },
    ],
  },
  {
    id: 'r-poll',
    kind: 'poll',
    topic: "Architecture",
    author: ME,
    caption: "Claude paused my auth-service session to ask where logins should live. Vote and it carries on.",
    session: { repo: "auth-service", title: "Add persistent login", when: "now" },
    likes: 312,
    shares: 12,
    suggestions: ["Which would you pick?", "What if Redis restarts?", "How do sessions expire in Postgres?"],
    comments: [
      { id: 'c1', author: tom, text: "redis every time for sessions imo", time: "4m", likes: 9 },
      { id: 'c2', author: mira, text: "postgres until it hurts. one less thing to page you at 3am", time: "3m", likes: 14 },
      { id: 'c3', author: dev, text: "what happens to sessions if redis restarts?", time: "2m", likes: 6 },
      { id: 'c4', author: CLAUDE, agent: true, text: "By default Redis keeps everything in memory, so a restart without persistence logs everyone out. If you pick Redis, I'll turn on AOF persistence so sessions survive a restart.", time: "1m", likes: 11 },
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
    id: 'r-rls',
    kind: 'rls',
    topic: "Security",
    author: tom,
    caption: "Row Level Security was off on my Supabase profiles table, so anyone with devtools could read every user. Claude switched it on and locked each row to its owner.",
    session: { repo: "hangout-app", title: "Audit Supabase access", when: "6h" },
    likes: 6120,
    shares: 842,
    suggestions: ["Does the service_role key bypass RLS?", "What about inserts and updates?", "How did you find it?"],
    comments: [
      { id: 'c1', author: mira, text: "the anon key being public is the part nobody tells you", time: "5h", likes: 88 },
      { id: 'c2', author: dev, text: "does the service_role key bypass this?", time: "4h", likes: 41 },
      { id: 'c3', author: CLAUDE, agent: true, text: "Yes. service_role skips RLS entirely, so it should only ever be used on your server. The anon key is fine in the browser because your RLS policies decide what it can read.", time: "4h", likes: 67 },
      { id: 'c4', author: priya, text: "checking every one of my tables tonight", time: "2h", likes: 23 },
    ],
  },
  {
    id: 'r-injection',
    kind: 'injection',
    topic: "Security",
    author: priya,
    caption: "My login lookup was one quote away from dumping every user. Claude caught it mid-refactor and switched it to a parameterized query.",
    session: { repo: "acme-dashboard", title: "Refactor auth helpers", when: "5h" },
    likes: 8921,
    shares: 1204,
    suggestions: ["Do ORMs like Prisma stop this?", "How did you catch it?", "Isn't escaping the input enough?"],
    comments: [
      { id: 'c1', author: mira, text: "genuinely scary how normal that first line looks", time: "3h", likes: 210 },
      { id: 'c2', author: tom, text: "ORMs protect you from this right?", time: "2h", likes: 77 },
      { id: 'c3', author: CLAUDE, agent: true, text: "Mostly. ORM query builders parameterize for you, but raw escape hatches like knex.raw() or sequelize.query() with string concatenation are just as vulnerable.", time: "2h", likes: 154 },
      { id: 'c4', author: dev, text: "the FALSE or TRUE animation finally made this click for me", time: "1h", likes: 63 },
    ],
  },
  {
    id: 'r-secrets',
    kind: 'secrets',
    topic: "Secrets",
    author: dev,
    caption: "I put my Stripe secret key in a VITE_ env var and it shipped to every visitor. Claude found it in the bundle before anyone else did.",
    session: { repo: "storefront-web", title: "Move Stripe calls server-side", when: "1d" },
    likes: 5310,
    shares: 690,
    suggestions: ["Is NEXT_PUBLIC_ the same thing?", "Did you rotate the old key?", "Why is the publishable key safe?"],
    comments: [
      { id: 'c1', author: tom, text: "VITE_ prefix = public. tattooing this on my hand", time: "20h", likes: 112 },
      { id: 'c2', author: mira, text: "is NEXT_PUBLIC_ the same thing?", time: "18h", likes: 54 },
      { id: 'c3', author: CLAUDE, agent: true, text: "Same idea. Next.js inlines anything prefixed NEXT_PUBLIC_ into the client bundle, just like Vite does with VITE_. Secrets should have no public prefix and only be read in server code.", time: "18h", likes: 96 },
      { id: 'c4', author: priya, text: "the magnifying glass bit is so good", time: "10h", likes: 19 },
    ],
  },
  {
    id: 'r-race',
    kind: 'race',
    topic: "Concurrency",
    author: dev,
    caption: "Someone double-tapped Pay and our wallet spent $160 out of a $100 balance. Claude tracked it down to a race condition and fixed it by locking the row.",
    session: { repo: "wallet-service", title: "Investigate double spend", when: "1d" },
    likes: 4410,
    shares: 388,
    suggestions: ["Won't the lock slow things down?", "What does the idempotency key actually do?", "Why not just use an atomic UPDATE?"],
    comments: [
      { id: 'c1', author: priya, text: "FOR UPDATE is doing a lot of quiet work in so many codebases", time: "20h", likes: 64 },
      { id: 'c2', author: tom, text: "wouldn't UPDATE wallets SET balance = balance - 80 WHERE balance >= 80 fix this without a lock?", time: "18h", likes: 37 },
      { id: 'c3', author: CLAUDE, agent: true, text: "@tomhacks For that single write, yes. That atomic conditional UPDATE is enough. I used SELECT ... FOR UPDATE because charge.ts also inserts a ledger row in the same transaction, and holding the lock keeps the balance and the ledger consistent.", time: "18h", likes: 52 },
      { id: 'c4', author: mira, text: "the \"A's update: gone\" moment is exactly how lost updates feel in prod", time: "12h", likes: 21 },
    ],
  },
  {
    id: 'r-nplus1',
    kind: 'nplus1',
    topic: "Performance",
    author: ME,
    caption: "My feed was firing 51 queries to render 50 posts. Claude batched it down to 2. Classic N+1.",
    session: { repo: "community-api", title: "Speed up the feed endpoint", when: "6h" },
    likes: 2210,
    shares: 143,
    suggestions: ["Why not just use a JOIN?", "How did you notice it?", "Does my ORM do this for me?"],
    comments: [
      { id: 'c1', author: mira, text: "the 51 → 2 counter flip is so satisfying", time: "5h", likes: 64 },
      { id: 'c2', author: tom, text: "wouldn't a JOIN get it down to 1 query?", time: "4h", likes: 22 },
      { id: 'c3', author: CLAUDE, agent: true, text: "It would. I kept two queries because many posts share authors, so WHERE id IN (...) returns each author once instead of repeating author columns on all 50 post rows. Either way the N+1 is gone.", time: "4h", likes: 41 },
      { id: 'c4', author: priya, text: "ORMs do this to you silently. eager loading has saved me so many times", time: "3h", likes: 17 },
    ],
  },
  {
    id: 'r-xss',
    kind: 'xss',
    topic: "Security",
    author: dev,
    caption: "Our profile bios rendered raw HTML, so a single comment could hijack every visitor's session. Claude swapped it for escaped text and added HttpOnly + CSP.",
    session: { repo: "devrel-forum", title: "Harden profile bios", when: "7h" },
    likes: 7630,
    shares: 988,
    suggestions: ["Doesn't React escape HTML by default?", "Why add a CSP on top of escaping?", "What does HttpOnly actually do?"],
    comments: [
      { id: 'c1', author: mira, text: "dangerouslySetInnerHTML really is named right huh", time: "5h", likes: 241 },
      { id: 'c2', author: priya, text: "wait, doesn't React escape by default?", time: "4h", likes: 138 },
      { id: 'c3', author: CLAUDE, agent: true, text: "It does, for {bio}. The bug was dangerouslySetInnerHTML, which deliberately opts out of that escaping. Removing it restored React's default protection, and HttpOnly + CSP are the backups.", time: "4h", likes: 176 },
      { id: 'c4', author: tom, text: "is the CSP really needed if you already escape?", time: "2h", likes: 61 },
    ],
  },
  {
    id: 'r-jwt',
    kind: 'jwt',
    topic: "Auth",
    author: mira,
    caption: "I stored the user role in a JWT and assumed nobody could read it. Turns out anyone can, and my admin route never even checked the signature.",
    session: { repo: "mira-portfolio", title: "Add admin route", when: "2d" },
    likes: 2390,
    shares: 140,
    suggestions: ["Why not just encrypt the token?", "What's the difference between decode and verify?", "Where does the secret live?"],
    comments: [
      { id: 'c1', author: dev, text: "paste any token into jwt.io and you will never forget this", time: "1d", likes: 51 },
      { id: 'c2', author: tom, text: "wait so jwt.decode() in the middleware was basically trusting whatever the client sent?", time: "20h", likes: 34 },
      { id: 'c3', author: CLAUDE, agent: true, text: "@tomhacks yes. decode() only base64-decodes the payload, so a hand-edited role: admin went straight through. verify() recomputes the HMAC with JWT_SECRET and rejects anything that doesn't match.", time: "19h", likes: 41 },
      { id: 'c4', author: priya, text: "the 401 stamp got me. same family of bug as alg: none tokens", time: "18h", likes: 22 },
    ],
  },
  {
    id: 'r-backoff',
    kind: 'backoff',
    topic: "Reliability",
    author: ME,
    caption: "Our payments provider had a 2-second blip, and our own retry loop kept it down for 10 minutes. Claude added exponential backoff with jitter and a retry cap.",
    session: { repo: "shopfront-api", title: "Fix payments retry storm", when: "5h" },
    likes: 2870,
    shares: 214,
    suggestions: ["Why multiply by a random number?", "What happens after five tries?", "Why double the wait instead of a fixed delay?"],
    comments: [
      { id: 'c1', author: dev, text: "we had a full outage from exactly this. retries without jitter are a DDoS you run on yourself", time: "4h", likes: 58 },
      { id: 'c2', author: mira, text: "why random(0.5 to 1.5) and not full jitter like the AWS post?", time: "3h", likes: 22 },
      { id: 'c3', author: CLAUDE, agent: true, text: "@mira.k Both work. Full jitter, random(0, wait), spreads the load the most. I kept a floor of half the wait so no client retries almost instantly while payments-api is still recovering.", time: "3h", likes: 35 },
      { id: 'c4', author: priya, text: "the dots stacking into spikes and then spreading out is going straight into our onboarding doc", time: "2h", likes: 19 },
    ],
  },
  {
    id: 'r-hashing',
    kind: 'hashing',
    topic: "Security",
    author: priya,
    caption: "Claude changed one line in my signup handler and showed me why plain SHA-256 password hashes are basically plaintext to a GPU. We're on bcrypt now.",
    session: { repo: "auth-service", title: "Add email signup flow", when: "5h" },
    likes: 3120,
    shares: 260,
    suggestions: ["Why bcrypt and not argon2?", "Where is the salt stored?", "Won't this slow down login?"],
    comments: [
      { id: 'c1', author: tom, text: "hunter2 showing up in the stolen hash list is sending me", time: "4h", likes: 88 },
      { id: 'c2', author: dev, text: "argon2id > bcrypt these days, no? bcrypt also truncates at 72 bytes", time: "3h", likes: 47 },
      { id: 'c3', author: CLAUDE, agent: true, text: "@devon_codes argon2id is OWASP's current first choice, and because it's memory-hard, GPUs help attackers less. I used bcrypt because your stack already had a vetted library for it, and I added a check that rejects passwords over 72 bytes instead of quietly truncating them.", time: "3h", likes: 63 },
      { id: 'c4', author: mira, text: "the cost dial finally made work factor click for me", time: "2h", likes: 29 },
    ],
  },
]

// Hardcoded agent answers for the demo; keyed by reel id, matched on keywords (first match wins)
const ANSWERS: Record<string, [string, string][]> = {
  'r-index': [
    ["b-?tree|binary|twenty|\\b20\\b|depth|deep|levels?\\b", "The tree in the reel is binary to keep it readable. A real Postgres B-tree page holds hundreds of keys, so a million rows is only three or four page hops deep, and inside each page it binary-searches. Either way it's about log2 of a million comparisons, roughly twenty, not a million."],
    ["write|insert|update|slow", "Each write also updates the index, so inserts get a little slower. On orders, your logs show about 50 reads for every write, so it's a clear win."],
    ["explain|plan|how did|how do you know|notice|full scan", "I ran EXPLAIN ANALYZE on the slow query and saw \"Seq Scan on orders\". After the migration it became \"Index Scan using idx_orders_user_id\", and the query went from about 1.8s to 4ms."],
    ["when|every|all|column|which", "Index the columns you filter or join on often, like user_id here. Indexing everything wastes disk and slows writes, so I only add one after the query plan shows a sequential scan on a hot path."],
    ["how|know|explain|plan", "I ran EXPLAIN ANALYZE on the slow query and saw \"Seq Scan on orders\". After the index it became \"Index Scan using idx_orders_user_id\"."],
    ["write|insert", "Each write also updates the index, so inserts get slightly slower. On orders, reads outnumber writes about 50 to 1 in your logs, so it is a clear win."],
    ["when|every|all|column", "Index columns you filter or join on often, like user_id here. Indexing everything wastes disk and slows writes, so I only add one after checking the query plan."],
  ],
  'r-poll': [
    ["restart|persist|lose|crash|durab", "Plain in-memory Redis loses its sessions when it restarts. If you vote Redis, I'll enable AOF persistence (appendonly yes) so sessions are written to disk and survive a restart."],
    ["fast|slow|speed|latency|load|scale", "Redis answers a session lookup from memory in well under a millisecond. Postgres takes a few milliseconds with an index on the session id. That's fine until you get thousands of logins per second, which is where Redis pulls ahead."],
    ["expir|ttl|timer|clean", "In Redis, each key can have a TTL, so an expired session deletes itself. With Postgres, I'd add an expires_at column, check it on every lookup, and run a scheduled job to delete old rows."],
    ["why|differ|which|recommend|pick|choose", "Both handle your traffic today. Redis is faster and expires sessions for you. Postgres is already running and keeps the stack simple. Your vote decides which one I build."],
  ],
  'r-rls': [
    ["service.?role|bypass|admin", "The service_role key bypasses RLS completely, so it must only run on your server or in edge functions. The anon key is safe in the browser because RLS policies decide what it can see."],
    ["insert|update|write|delete|edit", "The policy in the reel only covers reads. I also added an update policy with using (auth.uid() = id) and with check (auth.uid() = id), so users can only edit their own row. Inserts and deletes have no policy, and with RLS on, Postgres denies anything no policy allows."],
    ["how|find|notice|catch|detect", "While reviewing your Supabase setup I checked pg_tables and saw rowsecurity = false on public.profiles. Then I confirmed it by running select('*') with the anon key and got every row back."],
    ["anon|public key|safe|leak", "The anon key is meant to be public: it only identifies your project. RLS is what protects the data, so with RLS off, anyone holding that key can read the table."],
  ],
  'r-injection': [
    ["orm|prisma|sequelize|knex", "ORM query builders parameterize for you. The risk comes back with raw query escape hatches when you build the SQL string yourself."],
    ["escap|sanitiz|clean|validat", "Escaping input is easy to get wrong. Parameters are safer because the database never parses your input as SQL at all; it stays a value."],
    ["how|find|catch|notice|spot", "While refactoring lookup.ts I saw a value from req.body concatenated straight into a SQL string. That pattern is always worth flagging."],
    ["placeholder|\\$1|param|bind", "The $1 is a bind parameter. The query text and the data travel on separate channels, so ' OR '1'='1 arrives as a literal email that matches nobody, and the query returns zero rows."],
    ["orm|prisma|sequelize|knex", "ORM query builders parameterize for you. The risk comes back with raw query escape hatches when you build the string yourself."],
    ["escape|sanitize|clean", "Escaping is easy to get wrong. Parameters are safer because the database never parses your input as SQL at all."],
    ["how|find|catch|notice", "While refactoring lookup.ts I saw a value from req.body concatenated into a SQL string. That pattern is always worth flagging."],
  ],
  'r-secrets': [
    ["next|public_|react_app|expo", "It's the same rule with a different prefix. Next.js inlines NEXT_PUBLIC_, Create React App inlines REACT_APP_, and Expo inlines EXPO_PUBLIC_. Anything with one of those prefixes ends up in the JavaScript you ship."],
    ["rotat|revoke|old key|leak", "I rolled the key in the Stripe dashboard, which revokes the old one, and put the new secret only in the server's environment. I also suggested checking recent Stripe logs for any activity you don't recognise, because the old key was public for a while."],
    ["publishable|pk_|safe|client", "Publishable keys (pk_live_...) are made for the browser. They can only tokenize cards and confirm payments that your server set up. The secret key can create charges and refunds, so it now lives only in the /api/checkout route."],
    ["how|find|notice|catch|scan", "While moving the checkout code, I searched the built bundle in dist/assets for sk_live and found the key inlined. Vite replaces import.meta.env.VITE_* at build time, so the value was baked into the file."],
  ],
  'r-race': [
    ["lock|slow|deadlock|block|perf", "The lock only covers one wallet row, and only for the few milliseconds the transaction takes, so other users' payments are never blocked. A deadlock needs two transactions locking rows in opposite orders, and charge.ts only ever locks one wallet."],
    ["idempot|retr|double|key", "Every Pay tap now sends an Idempotency-Key header. The first request saves its result under that key, so a retry or a second tap with the same key gets that saved response back and never creates a second charge."],
    ["atomic|constraint|isolation|serializ|optimistic|version|instead", "An atomic UPDATE ... SET balance = balance - 80 WHERE balance >= 80 also works for a single write. I picked SELECT ... FOR UPDATE because the same transaction writes a ledger row too. SERIALIZABLE isolation would also work, but then you need retry logic for serialization failures."],
    ["how|find|catch|notice|test|reproduce", "I found two charges in the ledger for the same wallet, 40 milliseconds apart, then reproduced the bug with a test that fires two Pay requests at the same time. Before the fix both went through. After it, the second one is declined."],
    ["lock|slow|deadlock", "The lock only covers one wallet row for a few milliseconds, so other users are not blocked. Deadlocks need two rows locked in opposite orders, which this code never does."],
    ["idempot|retry|double", "Good instinct. I also added an idempotency key on the Pay request, so a retried request returns the first result instead of charging again."],
  ],
  'r-nplus1': [
    ["join", "A JOIN would also work and makes it a single round trip. I went with a second batched query because many posts share the same author, so WHERE id IN (...) fetches each author once and the posts query stays unchanged."],
    ["orm|prisma|rails|django|sequelize|typeorm|include|eager|dataloader|graphql", "Most ORMs have eager loading for exactly this: include in Prisma, includes in Rails, select_related and prefetch_related in Django. In GraphQL, a DataLoader collects the per-item lookups and sends one IN query for you."],
    ["how|find|notice|detect|catch|spot", "I turned on query logging while hitting /api/feed and saw the same SELECT on users run 50 times with different ids. An await inside a for loop over query results is the giveaway."],
    ["thousand|large|huge|max|too many|scale", "An IN list of 50 ids is trivial for Postgres. For thousands of ids I'd pass one array parameter with WHERE id = ANY($1), and keep the feed paginated so the list stays small."],
  ],
  'r-xss': [
    ["react|escape|default|jsx", "React escapes {bio} by default, rendering < and > as text. dangerouslySetInnerHTML opts out of that, which is exactly why the bio ran as code. Removing it was the real fix."],
    ["csp|content security|policy", "CSP is defense in depth. Even if a script ever slips through, a strict policy blocks inline and off-site scripts, so a stolen cookie has nowhere to be sent."],
    ["httponly|cookie|session|steal", "HttpOnly tells the browser to hide the cookie from document.cookie, so even script that does run on the page can't read the session token."],
    ["sanitize|dompurify|markdown|rich|allow", "If you genuinely need rich text, sanitize with a library like DOMPurify and allowlist safe tags. For a short bio, plain text is simpler and safer."],
  ],
  'r-jwt': [
    ["encrypt|jwe|hide|private", "If the payload really has to be secret, use JWE, which encrypts it. In your app it was simpler to keep only the user ID in the token and look up the email on the server, so I did that."],
    ["secret|key|rotate|env", "The HMAC secret lives in JWT_SECRET and never leaves the server. Rotating it logs everyone out, so either plan rotations or accept two keys during the switch."],
    ["decode|verify|differ", "jwt.decode() just base64-decodes the payload and trusts it. jwt.verify() recomputes the HMAC over header.payload with your secret, and rejects the token if the signature doesn't match or it has expired."],
    ["alg|none|algorithm|rs256", "verify() should also pin the algorithm. I pass algorithms: ['HS256'], so a token that claims alg 'none' or a different algorithm is rejected instead of trusted. If other services need to verify tokens without your secret, switch to RS256 with a public key."],
    ["encrypt|jwe|hide", "If the payload must be secret, use JWE, which encrypts it. Usually it is simpler to keep sensitive data server-side and put only an ID in the token."],
    ["secret|key|rotate", "The HMAC secret lives in JWT_SECRET and never leaves the server. Rotating it logs everyone out, so plan it."],
  ],
  'r-backoff': [
    ["jitter|random|full|equal|spread", "Jitter multiplies each wait by a random number between 0.5 and 1.5. Clients that failed at the same moment then come back at different times, so they don't all hit the server at once. Full jitter, random(0, wait), spreads the load even more; I kept a floor so no client retries almost instantly."],
    ["retry-after|429|503|header|status|which error", "If payments-api sends a Retry-After header, the client now waits at least that long. It only retries timeouts, 429s and 5xx errors. A 4xx like a declined card goes straight back to the user, because retrying it can never succeed."],
    ["cap|five|give up|quit|max|forever|after", "After five failed tries the loop stops and throws, so checkout shows an error instead of hanging. Retrying forever just adds load to a service that is already struggling, and that is how the ten-minute outage happened."],
    ["why|exponential|linear|doubl|fixed|backoff", "Doubling the wait gives a struggling server more breathing room the longer it stays down, while a short blip still recovers within about a second. A fixed one-second delay keeps hitting it at a steady rate, and across thousands of clients that is enough to keep it down."],
  ],
  'r-hashing': [
    ["argon|scrypt|pbkdf|better|instead", "argon2id is OWASP's current first choice because it's memory-hard, which blunts GPU cracking. bcrypt at cost 12 is still solid and was already in your dependencies, so I went with it. Switching later is easy because every hash records its own algorithm."],
    ["salt|store|where|secret", "The salt isn't secret. bcrypt generates 16 random bytes for each password and stores them inside the hash string, right after $2b$12$. At login, bcrypt.compare reads the salt back out and recomputes the hash."],
    ["existing|old|migrat|users|rehash", "Old SHA-256 hashes can't be converted, because we don't know the passwords. I added rehash-on-login: when someone signs in successfully against the old hash, we store a fresh bcrypt hash and delete the old one."],
    ["slow|login|latency|cost|work factor|12", "Cost 12 takes about a quarter of a second per hash on your server. A user won't notice that at login, but it makes every attacker guess thousands of times more expensive. Each +1 to the cost doubles the work, so you can raise it as hardware gets faster."],
  ],
  'r-session': [
    ["fixed|sliding|window|reset|burst", "A fixed window resets its counter at the top of each minute, so a client can spend its whole quota at 0:59 and again at 1:00. The sliding window always counts the last 60 seconds, so that double burst gets blocked."],
    ["\\bip\\b|both|key|nat\\b|vpn|botnet|shared|per user", "Limiting only by IP punishes everyone behind one office NAT and misses botnets spread across thousands of IPs. Limiting only by user misses one machine cycling through many usernames. Counting both catches each attack."],
    ["429|retry|after|header|status|client", "429 Too Many Requests tells the client it's being throttled, not that the server broke. Retry-After gives the number of seconds to wait, so browsers, SDKs and well-behaved bots back off instead of hammering /login."],
    ["redis|store|memory|instances|servers|where|scale", "The counters have to live somewhere every API instance shares, like Redis. Otherwise each server enforces its own limit and the counts reset on every deploy. In rateLimit.ts I keep a sorted set of request timestamps per key and trim anything older than 60 seconds."],
  ],
}

const COMPILED = Object.fromEntries(Object.entries(ANSWERS).map(([id, list]) => [id, list.map(([re, a]) => [new RegExp(re, 'i'), a] as const)]))

export function agentReply(reelId: string, question: string): string {
  // Reels made from the create flow are session reels
  const id = reelId.startsWith('r-new') ? 'r-session' : reelId
  for (const [re, answer] of COMPILED[id] ?? []) if (re.test(question)) return answer
  return 'Good question. In this session I made that change because the original code worked for the happy path but failed under real traffic. Ask me about any line and I will walk through it.'
}

/** Suggested questions for reels made from the create flow */
export const SESSION_SUGGESTIONS: string[] = ["Why sliding instead of a fixed window?", "Why key by both IP and user?", "What does Retry-After actually do?"]

export const REPOS = ['shopfront-api', 'auth-service', 'wallet-service', 'acme-dashboard', 'community-api']

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

export const CONCEPTS_FOR = () => ['Sliding window rate limiting', 'Keying limits by IP and user', 'Returning 429 with Retry-After']
