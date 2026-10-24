import { createHash } from 'node:crypto';
import { chmod, copyFile, lstat, mkdir, mkdtemp, readFile, readdir, rm, utimes, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const template = path.join(root, 'scripts/companion-distribution');
const output = path.join(root, 'public/downloads/unvibe-companion.tar.gz');
const name = 'unvibe-companion';
const epoch = new Date('2020-01-01T00:00:00.000Z');
// Deliberate file allowlist: never traverse a repository or user-data directory.
const sourceFiles = [
  'companion/claude.mjs',
  'companion/config.mjs',
  'companion/index.mjs',
  'companion/jobs.mjs',
  'companion/narration.mjs',
  'companion/render.mjs',
  'companion/security.mjs',
  'companion/server.mjs',
  'companion/sessions.mjs',
  'shared/lesson.ts',
  'src/reels/GeneratedReel.tsx',
  'src/reels/primitives.tsx',
  'src/remotion/fonts.css',
  'src/remotion/generated.tsx',
];
const generatedFiles = ['README.md', 'package.json', 'package-lock.json', 'start.mjs', 'public/README.txt', 'checksums.sha256'];
const expected = new Set([...sourceFiles, ...generatedFiles]);
const temp = await mkdtemp(path.join(tmpdir(), 'unvibe-package-'));
const stage = path.join(temp, name);

try {
  await mkdir(stage);
  async function copy(source, destination) {
    const info = await lstat(source);
    if (!info.isFile() || info.isSymbolicLink()) throw new Error(`Refusing non-file distribution input: ${destination}`);
    const target = path.join(stage, destination);
    await mkdir(path.dirname(target), { recursive: true });
    await copyFile(source, target);
  }
  for (const file of sourceFiles) await copy(path.join(root, file), file);
  for (const file of ['README.md', 'package.json', 'package-lock.json']) await copy(path.join(template, file), file);
  const manifest = JSON.parse(await readFile(path.join(stage, 'package.json'), 'utf8'));
  const lock = JSON.parse(await readFile(path.join(stage, 'package-lock.json'), 'utf8'));
  if (JSON.stringify(manifest.dependencies) !== JSON.stringify(lock.packages?.['']?.dependencies)) throw new Error('Companion lockfile is out of date. Regenerate it in scripts/companion-distribution.');
  await writeFile(path.join(stage, 'start.mjs'), "process.env.LEARNAGRAM_FRONTEND_URL ||= 'https://unvibe-learnagram.web.app/connect';\nawait import('./companion/index.mjs');\n");
  await mkdir(path.join(stage, 'public'), { recursive: true });
  await writeFile(path.join(stage, 'public/README.txt'), 'Generated lessons use no bundled demo media. This directory is required by the local renderer.\n');
  const checksums = await Promise.all([...expected].filter((file) => file !== 'checksums.sha256').sort().map(async (file) => `${createHash('sha256').update(await readFile(path.join(stage, file))).digest('hex')}  ${file}`));
  await writeFile(path.join(stage, 'checksums.sha256'), `${checksums.join('\n')}\n`);
  const actual = [];
  async function normalize(directory) {
    for (const item of await readdir(directory, { withFileTypes: true })) {
      const filename = path.join(directory, item.name);
      if (item.isDirectory()) await normalize(filename);
      else {
        const relative = path.relative(stage, filename).split(path.sep).join('/');
        if (!item.isFile() || !expected.has(relative)) throw new Error(`Unexpected distribution file: ${relative}`);
        actual.push(relative);
        await chmod(filename, 0o644);
        await utimes(filename, epoch, epoch);
      }
    }
    await chmod(directory, 0o755);
    await utimes(directory, epoch, epoch);
  }
  await normalize(stage);
  if (actual.length !== expected.size) throw new Error('Companion package is incomplete.');
  // Emit USTAR directly so the package is identical on macOS/Linux/Windows and
  // does not depend on different system tar flags or filesystem metadata.
  const blocks = [];
  for (const file of actual.sort()) {
    const filename = `${name}/${file}`;
    if (Buffer.byteLength(filename) > 100) throw new Error(`Distribution path is too long: ${file}`);
    const body = await readFile(path.join(stage, file));
    const header = Buffer.alloc(512);
    const octal = (offset, length, value) => header.write(`${value.toString(8).padStart(length - 1, '0')}\0`, offset, length, 'ascii');
    header.write(filename, 0, 100, 'utf8');
    octal(100, 8, 0o644);
    octal(108, 8, 0);
    octal(116, 8, 0);
    octal(124, 12, body.length);
    octal(136, 12, Math.floor(epoch.getTime() / 1000));
    header.fill(32, 148, 156);
    header.write('0', 156, 1, 'ascii');
    header.write('ustar\0', 257, 6, 'ascii');
    header.write('00', 263, 2, 'ascii');
    header.write('root', 265, 32, 'ascii');
    header.write('root', 297, 32, 'ascii');
    const checksum = header.reduce((sum, byte) => sum + byte, 0);
    header.write(`${checksum.toString(8).padStart(6, '0')}\0 `, 148, 8, 'ascii');
    blocks.push(header, body, Buffer.alloc((512 - body.length % 512) % 512));
  }
  blocks.push(Buffer.alloc(1024));
  const compressed = gzipSync(Buffer.concat(blocks), { level: 9, mtime: 0 });
  await mkdir(path.dirname(output), { recursive: true });
  await writeFile(output, compressed);
  await writeFile(`${output}.sha256`, `${createHash('sha256').update(compressed).digest('hex')}  ${path.basename(output)}\n`);
  console.log(`Packaged ${expected.size} allowlisted files (${compressed.length} bytes): public/downloads/${path.basename(output)}`);
} finally {
  await rm(temp, { recursive: true, force: true });
}
