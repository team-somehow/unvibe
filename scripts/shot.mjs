// Screenshot a page for visual QA: node scripts/shot.mjs <url> <out.png> [width] [height] [waitMs] [scrollY] [fullPage]
import { readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import puppeteer from 'puppeteer-core'

function findChrome(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name)
    if (statSync(p).isDirectory()) {
      const found = findChrome(p)
      if (found) return found
    } else if (name === 'chrome-headless-shell') return p
  }
  return null
}

const [url, out, width = '1440', height = '900', wait = '2500', scrollY = '0', full = ''] = process.argv.slice(2)
const w = Number(width)
const browser = await puppeteer.launch({ executablePath: findChrome('node_modules/.remotion'), args: ['--hide-scrollbars', '--autoplay-policy=no-user-gesture-required'] })
const page = await browser.newPage()
await page.setViewport({ width: w, height: Number(height), deviceScaleFactor: w < 768 ? 2 : 1, isMobile: w < 768, hasTouch: w < 768 })
page.on('pageerror', (e) => console.error('pageerror:', e.message))
page.on('console', (m) => m.type() === 'error' && console.error('console.error:', m.text()))
await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 })
if (Number(scrollY)) await page.evaluate((y) => window.scrollTo(0, y), Number(scrollY))
await new Promise((r) => setTimeout(r, Number(wait)))
await page.screenshot({ path: out, fullPage: full === 'full' })
await browser.close()
console.log('saved', out)
