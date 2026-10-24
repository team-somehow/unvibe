// Visual QA for reels: renders frames of a composition and tiles them into one contact sheet.
// Usage: node scripts/stills.mjs <compositionId> <outDir> [frames]
//   frames: comma list like "30,120,400" or "auto" (default: 12 evenly spaced frames)
import { bundle } from '@remotion/bundler'
import { renderStill, selectComposition } from '@remotion/renderer'
import { mkdirSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import puppeteer from 'puppeteer-core'
import { readdirSync, statSync } from 'node:fs'

const [id, outDir, framesArg = 'auto'] = process.argv.slice(2)
if (!id || !outDir) throw new Error('usage: node scripts/stills.mjs <compositionId> <outDir> [frames]')
mkdirSync(outDir, { recursive: true })

// Port 3000 is often taken by other local servers; pick a random one so parallel runs don't collide
const port = 3100 + Math.floor(Math.random() * 800)
const serveUrl = await bundle({ entryPoint: resolve('src/remotion/index.ts'), publicDir: resolve('public') })
const composition = await selectComposition({ serveUrl, id, inputProps: {}, port })
const total = composition.durationInFrames
const frames = framesArg === 'auto'
  ? Array.from({ length: 12 }, (_, i) => Math.min(total - 1, Math.round(((i + 0.5) / 12) * total)))
  : framesArg.split(',').map(Number)

const files = []
for (const frame of frames) {
  const output = join(outDir, `${id}-${String(frame).padStart(4, '0')}.png`)
  await renderStill({ composition, serveUrl, output, frame, scale: 0.5, inputProps: {}, port })
  files.push({ frame, output })
}

function findChrome(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name)
    if (statSync(p).isDirectory()) { const f = findChrome(p); if (f) return f } else if (name === 'chrome-headless-shell') return p
  }
  return null
}
const cols = Math.min(6, files.length)
const html = `<html><body style="margin:0;background:#222;display:grid;grid-template-columns:repeat(${cols},270px);gap:6px;padding:6px;font:14px sans-serif;color:#ddd">${files
  .map((f) => `<div><img src="file://${resolve(f.output)}" style="width:270px;display:block"/><div>frame ${f.frame} (${(f.frame / 30).toFixed(1)}s)</div></div>`)
  .join('')}</body></html>`
const htmlPath = join(outDir, `${id}-contact.html`)
writeFileSync(htmlPath, html)
const browser = await puppeteer.launch({ executablePath: findChrome('node_modules/.remotion'), args: ['--allow-file-access-from-files'] })
const page = await browser.newPage()
await page.setViewport({ width: cols * 276 + 12, height: 800 })
await page.goto(`file://${resolve(htmlPath)}`, { waitUntil: 'load' })
const sheet = join(outDir, `${id}-contact.png`)
await page.screenshot({ path: sheet, fullPage: true })
await browser.close()
console.log(`total ${total} frames (${(total / 30).toFixed(1)}s)`)
console.log(`contact sheet: ${sheet}`)
