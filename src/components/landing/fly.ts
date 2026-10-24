import { animate } from 'motion/react'
import { HEIGHT, WIDTH } from '../../reels/registry'

/**
 * The reel's opening title, read from the live composition so the flight lands exactly where the reel
 * writes it, whatever the reel's authors change. Coordinates are in composition pixels (1080x1920).
 */
export type TitleSpot = { node: HTMLElement; x: number; y: number; w: number; h: number }

export function findTitle(root: HTMLElement | null): TitleSpot | null {
  if (!root) return null
  for (const node of root.querySelectorAll<HTMLElement>('div')) {
    if (node.style.fontStyle !== 'italic' || !node.textContent?.trim()) continue
    // offsetLeft/Top ignore transforms, so this is the title's resting layout, not its entrance scale
    let x = 0
    let y = 0
    let best: { x: number; y: number } | null = null
    let el: HTMLElement | null = node
    while (el) {
      if (el !== node && el.offsetWidth === WIDTH && el.offsetHeight === HEIGHT) best = { x, y }
      x += el.offsetLeft
      y += el.offsetTop
      el = el.offsetParent as HTMLElement | null
    }
    if (!best) continue
    return { node, x: best.x, y: best.y, w: node.offsetWidth, h: node.offsetHeight }
  }
  return null
}

/** 0..1, how far the reel's Write() has revealed the title (its wrapper animates clip-path inset). */
export function writeProgress(node: HTMLElement): number {
  let el: HTMLElement | null = node
  for (let i = 0; i < 3 && el; i++, el = el.parentElement) {
    const m = el.style.clipPath.match(/inset\(\s*-?[\d.]+%\s+(-?[\d.]+)%/)
    if (m) return 1 - Math.max(0, parseFloat(m[1])) / 100
  }
  return 1
}

const lerp = (a: number, b: number, t: number) => a + (b - a) * t
const clamp01 = (t: number) => Math.min(1, Math.max(0, t))
const seg = (t: number, a: number, b: number) => clamp01((t - a) / (b - a))
const easeOut = (t: number) => 1 - (1 - t) ** 3

export type Flight = {
  /** Resolves when the copy reaches the title's position. */
  landed: Promise<void>
  /** Fade the copy out (call once the reel shows the same title underneath). */
  release: () => void
  cancel: () => void
}

type Target = { left: number; top: number; scale: number; title: TitleSpot | null; stage: DOMRect }

/**
 * Manim's TransformFromCopy: a copy of the transcript line lifts off, travels along an arc into the
 * reel, and turns from the agent's mono line into the reel's own serif title on the way.
 * Reads the stage rect every frame so scrolling mid-flight still lands on target.
 */
export function fly({ source, stage, title, duration = 900 }: { source: HTMLElement; stage: () => HTMLElement | null; title: TitleSpot | null; duration?: number }): Flight {
  const from = source.getBoundingClientRect()
  const cs = getComputedStyle(source)

  const layer = document.createElement('div')
  layer.setAttribute('aria-hidden', 'true')
  layer.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:70;overflow:hidden;contain:strict'

  const trail = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
  trail.setAttribute('width', '100%')
  trail.setAttribute('height', '100%')
  trail.style.cssText = 'position:absolute;inset:0;overflow:visible'
  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path')
  path.setAttribute('fill', 'none')
  path.setAttribute('stroke', '#F4D35E')
  path.setAttribute('stroke-width', '1.5')
  path.setAttribute('stroke-linecap', 'round')
  path.style.opacity = '0.75'
  trail.appendChild(path)
  layer.appendChild(trail)

  const box = document.createElement('div')
  box.style.cssText = 'position:absolute;left:0;top:0;will-change:transform'
  layer.appendChild(box)

  const mono = document.createElement('div')
  mono.textContent = source.textContent
  mono.style.cssText = [
    'position:absolute;left:0;top:0;white-space:nowrap;transform-origin:0 50%',
    `font-family:${cs.fontFamily};font-size:${cs.fontSize};line-height:${from.height}px;letter-spacing:${cs.letterSpacing}`,
    `padding:0 ${cs.paddingRight} 0 ${cs.paddingLeft};height:${from.height}px;max-width:${Math.max(from.width, 120)}px;overflow:hidden;text-overflow:ellipsis`,
    'color:#F4D35E;background:rgba(244,211,94,0.14);border-radius:6px',
  ].join(';')
  box.appendChild(mono)

  const serif = document.createElement('div')
  serif.style.cssText = 'position:absolute;left:0;top:0;transform-origin:0 0;opacity:0;font-weight:400;font-synthesis:none;-webkit-font-smoothing:antialiased'
  if (title) {
    serif.style.width = `${title.w}px`
    const copy = title.node.cloneNode(true) as HTMLElement
    serif.appendChild(copy)
  }
  box.appendChild(serif)

  document.body.appendChild(layer)

  const target = (): Target => {
    const el = stage()
    const r = el?.getBoundingClientRect() ?? new DOMRect(from.left, from.top, 0, 0)
    const s = r.width / WIDTH
    if (title) return { left: r.left + title.x * s, top: r.top + title.y * s, scale: s, title, stage: r }
    return { left: r.left + r.width * 0.12, top: r.top + r.height * 0.1, scale: s, title: null, stage: r }
  }

  const p0 = { x: from.left, y: from.top }
  let done = false
  let resolveLanded = () => {}
  const landed = new Promise<void>((r) => (resolveLanded = r))

  const frameAt = (t: number) => {
    const tg = target()
    const p2 = { x: tg.left, y: tg.top }
    // Leave along the line's own row, then turn into the reel: the path reads as "this line goes there"
    // and stays clear of the headline above.
    const mid = { x: (p0.x + p2.x) / 2, y: (p0.y + p2.y) / 2 }
    const elbow = { x: p2.x, y: p0.y }
    const c = { x: lerp(mid.x, elbow.x, 0.82), y: lerp(mid.y, elbow.y, 0.82) }
    const bez = (u: number) => ({
      x: (1 - u) ** 2 * p0.x + 2 * (1 - u) * u * c.x + u ** 2 * p2.x,
      y: (1 - u) ** 2 * p0.y + 2 * (1 - u) * u * c.y + u ** 2 * p2.y,
    })
    const at = bez(t)
    box.style.transform = `translate3d(${at.x}px, ${at.y}px, 0)`

    // the line's mono letters hand over to the reel's serif title mid-flight
    const mOut = seg(t, 0.32, 0.6)
    mono.style.opacity = String(1 - mOut)
    mono.style.transform = `scale(${lerp(1, 0.86, easeOut(t))})`
    const sIn = seg(t, 0.42, 0.78)
    serif.style.opacity = String(title ? sIn : 0)
    serif.style.transform = `scale(${tg.scale * lerp(0.62, 1, easeOut(seg(t, 0.2, 1)))})`

    // a thin trace of the path, drawn through the copy's centre as it travels
    const endW = title ? title.w * tg.scale : from.width
    const endH = title ? Math.min(title.h, 90) * tg.scale : from.height
    const pts: string[] = []
    const n = 28
    for (let i = 0; i <= n; i++) {
      const u = (i / n) * t
      const q = bez(u)
      const ox = lerp(Math.min(from.width, 240) * 0.5, endW * 0.5, u)
      const oy = lerp(from.height * 0.5, endH * 0.5, u)
      pts.push(`${i ? 'L' : 'M'}${(q.x + ox).toFixed(1)} ${(q.y + oy).toFixed(1)}`)
    }
    path.setAttribute('d', pts.join(' '))
  }

  frameAt(0)
  const controls = animate(0, 1, {
    duration: duration / 1000,
    ease: [0.65, 0, 0.35, 1],
    onUpdate: (t) => frameAt(t),
    onComplete: () => {
      frameAt(1)
      animate(path, { opacity: 0 }, { duration: 0.35 })
      resolveLanded()
    },
  })

  const remove = () => {
    if (done) return
    done = true
    controls.stop()
    layer.remove()
    resolveLanded()
  }

  return {
    landed,
    release: () => {
      if (done) return
      animate(serif, { opacity: 0 }, { duration: 0.18, onComplete: remove })
    },
    cancel: remove,
  }
}
