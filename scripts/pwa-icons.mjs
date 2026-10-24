// Reproducible raster icons from the landing page's vector U mark. No native dependencies.
import { deflateSync } from 'node:zlib'
import { writeFile } from 'node:fs/promises'
const crcTable = Array.from({ length: 256 }, (_, n) => {
  for (let k = 0; k < 8; k++) n = n & 1 ? 0xedb88320 ^ (n >>> 1) : n >>> 1
  return n >>> 0
})
function crc(bytes) {
  let value = 0xffffffff
  for (const byte of bytes) value = crcTable[(value ^ byte) & 255] ^ (value >>> 8)
  return (value ^ 0xffffffff) >>> 0
}
function chunk(type, data) {
  const name = Buffer.from(type),
    length = Buffer.alloc(4),
    sum = Buffer.alloc(4)
  length.writeUInt32BE(data.length)
  sum.writeUInt32BE(crc(Buffer.concat([name, data])))
  return Buffer.concat([length, name, data, sum])
}
function inside(x, y) {
  const vertical = ((x >= 11 && x <= 16) || (x >= 22 && x <= 27)) && y >= 11 && y <= 22
  const radius = Math.hypot(x - 19, y - 22)
  const curve = y >= 22 && radius <= 8 && radius >= 3
  const arrow = x >= 22 && x <= 27 && y <= 11 && y >= 11 - (x - 22) * 0.6
  return vertical || curve || arrow
}
function png(size) {
  const bg = [235, 85, 56],
    fg = [247, 245, 239],
    raw = Buffer.alloc((size * 4 + 1) * size)
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) {
      let coverage = 0
      for (let sy = 0; sy < 4; sy++)
        for (let sx = 0; sx < 4; sx++) coverage += inside(((x + (sx + 0.5) / 4) * 38) / size, ((y + (sy + 0.5) / 4) * 38) / size) ? 1 : 0
      const offset = y * (size * 4 + 1) + 1 + x * 4
      for (let channel = 0; channel < 3; channel++)
        raw[offset + channel] = Math.round(bg[channel] + ((fg[channel] - bg[channel]) * coverage) / 16)
      raw[offset + 3] = 255
    }
  const header = Buffer.alloc(13)
  header.writeUInt32BE(size, 0)
  header.writeUInt32BE(size, 4)
  header[8] = 8
  header[9] = 6
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ])
}
for (const [file, size] of [
  ['pwa-192.png', 192],
  ['pwa-512.png', 512],
  ['pwa-maskable-512.png', 512],
  ['apple-touch-icon.png', 180],
])
  await writeFile(new URL(`../public/${file}`, import.meta.url), png(size))
await writeFile(
  new URL('../public/favicon.svg', import.meta.url),
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 38 38"><rect width="38" height="38" rx="10" fill="#eb5538"/><path d="M11 11v11a8 8 0 0 0 16 0V11h-5v11a3 3 0 0 1-6 0V11zM22 11l5-3v3z" fill="#f7f5ef"/></svg>\n',
)
console.log('Generated 192px, 512px, maskable, and Apple icons from the Unvibe mark.')
