// Contract of the shipped OpenCode Go 2 provider block: exact model count, the
// reasoning levels restored for the adjustable models, and no embedded secret.
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const config = await readFile(join(ROOT, 'config', 'opencode-go-2.provider.yml'), 'utf8')

test('the provider block declares every OpenCode Go model', () => {
  const ids = [...config.matchAll(/^ {4}- id: (.+)$/gmu)].map((match) => match[1])
  assert.equal(ids.length, 30)
  assert.equal(new Set(ids).size, 30)
  assert.ok(ids.includes('deepseek-v4.1-flash'))
  assert.ok(ids.includes('gpt-6-luna'))
})

test('the adjustable models carry the reasoning levels from the gateway', () => {
  assert.equal([...config.matchAll(/^ {6}reasoningEfforts:$/gmu)].length, 22)
  const flash = /- id: deepseek-v4\.1-flash[\s\S]*?reasoningEfforts:\n((?: {8}.+\n)+)/u.exec(config)?.[1] ?? ''
  assert.match(flash, /low: low/u)
  assert.match(flash, /high: high/u)
  assert.match(flash, /max: max/u)
  const luna = /- id: gpt-6-luna[\s\S]*?reasoningEfforts:\n((?: {8}.+\n)+)/u.exec(config)?.[1] ?? ''
  assert.match(luna, /off: none/u)
  for (const level of ['low', 'medium', 'high', 'xhigh', 'max']) assert.match(luna, new RegExp(`${level}: ${level}`, 'u'))
})

test('the block keeps only the credential reference, never the key', () => {
  assert.match(config, /apiKeyEnv: OPENCODE_GO_2_API_KEY/u)
  assert.doesNotMatch(config, /oc_sk_/u)
  assert.doesNotMatch(config, /sk-[A-Za-z0-9]{16,}/u)
})

test('the block documents how to restore it', () => {
  assert.match(config, /Merge this block under `config\.providers`/u)
})
