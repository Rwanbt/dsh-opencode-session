// Packaging contract: a bundle installs when its manifest, patch, locale and
// icon agree. These checks are platform-neutral, so CI runs them on Linux,
// macOS and Windows.
import assert from 'node:assert/strict'
import { readFile, stat } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const readText = (path) => readFile(join(ROOT, path), 'utf8')
const manifest = JSON.parse(await readText('package.json'))

test('manifest identifies a shareable Harness bundle', () => {
  assert.equal(manifest.type, 'module')
  assert.match(manifest.name, /^[a-z0-9][a-z0-9-]*$/u)
  assert.match(manifest.version, /^\d+\.\d+\.\d+$/u)
  assert.equal(manifest.dsh.bundle.patch, './cordis.patch.yml')
  assert.equal(manifest.exports['.'], './index.js')
  assert.ok(manifest.description.length > 40)
  assert.equal(manifest.dependencies ?? undefined, undefined)
})

test('the patch row resolves to this package', async () => {
  const patch = await readText('cordis.patch.yml')
  assert.match(patch, new RegExp(`name: '?${manifest.name}'?`, 'u'))
  assert.match(patch, /^ {4}- id: opencode-session$/mu)
  assert.match(patch, /^ {8}headerName: x-opencode-session$/mu)
})

test('display metadata exists for every shipped locale', async () => {
  assert.equal(manifest.exports['./locale/*.json'], './locale/*.json')
  for (const language of ['en', 'fr']) {
    const locale = JSON.parse(await readText(`locale/${language}.json`))
    assert.equal(typeof locale.meta?.title, 'string')
    assert.ok(locale.meta.title.length > 3, `${language} title is too short`)
    assert.ok(locale.meta.description.length > 20, `${language} description is too short`)
  }
})

test('the icon is a small, valid SVG exported by the manifest', async () => {
  assert.equal(manifest.exports['./icon'], './icon.svg')
  const info = await stat(join(ROOT, 'icon.svg'))
  assert.ok(info.size > 0 && info.size <= 256 * 1024)
  const svg = await readText('icon.svg')
  assert.match(svg.trimStart(), /^<svg[\s>]/u)
  assert.match(svg, /<\/svg>\s*$/u)
  assert.match(svg, /viewBox="/u)
})

test('the entry point registers the pi-ai header waterfall', async () => {
  const entry = await readText('index.js')
  assert.match(entry, /export function apply/u)
  assert.match(entry, /llm-pi-ai\/request-headers/u)
  assert.match(entry, /headers\.set\(/u)
})
