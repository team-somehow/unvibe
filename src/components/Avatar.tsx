import type { Person } from '../data/reels'

export function Avatar({ person, size = 32, ring = false }: { person: Person; size?: number; ring?: boolean }) {
  const isClaude = person.handle === 'claude'
  return (
    <span
      className={`inline-grid shrink-0 place-items-center rounded-full font-semibold text-black ${ring ? 'ring-2 ring-white/90 ring-offset-2 ring-offset-black' : ''}`}
      style={{ width: size, height: size, background: person.color, fontSize: size * 0.42 }}
      aria-hidden
    >
      {isClaude ? (
        <svg viewBox="0 0 24 24" width={size * 0.6} height={size * 0.6} fill="#fff">
          <path d="M12 2l1.6 6.4L20 7l-4.6 4.6L22 14l-6.6.6L17 21l-5-4.4L7 21l1.6-6.4L2 14l6.6-2.4L4 7l6.4 1.4z" />
        </svg>
      ) : (
        person.handle[0].toUpperCase()
      )}
    </span>
  )
}
