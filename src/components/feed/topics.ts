// Topic chips use the reels' Manim palette, so a topic keeps the same colour everywhere it appears.
const PALETTE = ['#58C4DD', '#F4D35E', '#83C167', '#FC6255', '#9A72AC', '#5CD0B3']

const KNOWN: Record<string, string> = {
  databases: '#58C4DD',
  database: '#58C4DD',
  performance: '#83C167',
  security: '#FC6255',
  auth: '#F4D35E',
  authentication: '#F4D35E',
  architecture: '#5CD0B3',
  concurrency: '#9A72AC',
  reliability: '#5CD0B3',
  cryptography: '#9A72AC',
  frontend: '#F4D35E',
  web: '#F4D35E',
}

export function topicColor(topic: string) {
  const key = topic.trim().toLowerCase()
  if (KNOWN[key]) return KNOWN[key]
  let h = 0
  for (const ch of key) h = (h * 31 + ch.charCodeAt(0)) >>> 0
  return PALETTE[h % PALETTE.length]
}
