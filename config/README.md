# Exact OpenCode Go 2 configuration

`opencode-go-2.provider.yml` is the complete `llm-pi-ai` provider block for a **second
OpenCode Go subscription** declared by hand. It adds the `reasoningEfforts` levels that the
gateway advertises for each model, so the composer and the model picker offer the same effort
controls as the native OpenCode Go route.

The reasoning levels were read from the live capability document at
`GET https://opencode.ai/zen/go/v1/models` (snapshot **2026-11-12**), field
`capabilities.reasoning.effort`. A model whose entry advertises an empty effort list keeps no
selector: the gateway does not expose an adjustable effort for it.

## Why this file exists

A hand-declared route does not inherit the installed pi-ai catalog: the plugin schema cannot
merge catalog metadata into `llm-pi-ai` models, so without explicit `reasoningEfforts` the
proof of a reasoning model is lost and the picker hides the effort control. The native
`opencode-go` route does not have that problem because pi-ai ships its metadata.

## Restore on a fresh DSH profile

1. Install this bundle and make sure `llm-pi-ai` is mounted (it is part of the shipped web/base
   bundles).
2. Open `~/.dsh/profiles/<profile>/cordis.patch.yml` and find the row with
   `name: '@deepseek-ai/dsh-llm-pi-ai'`.
3. Under its `config.providers`, copy the whole `opencode-go-2:` block from
   `opencode-go-2.provider.yml`. If a block already exists, replace it; keep the surrounding
   providers untouched.
4. Store the second subscription key as `OPENCODE_GO_2_API_KEY` in
   **Settings → Models** (or in the credential store). The block only names the reference, never
   the secret.
5. Reload the profile (disable/enable the bundle, or restart the harness). The route then reports
   the levels below.

## Levels per model

| Models | Levels |
|---|---|
| `deepseek-v4.1-flash`, `glm-5.3`, `glm-5.3-flash`, `kimi-k3.1-pro` | low, high, max |
| `deepseek-v4-pro`, `glm-5.2`, `kimi-k3` | high, max |
| `grok-4.7` | low, medium, high, xhigh |
| `muse-spark-1.2-contributor`, `muse-spark-1.3-contributor` | minimal, low, medium, high, xhigh |
| `claude-haiku-5-5`, `minimax-m3.1-flash`, `beam-free` | low, medium, high, xhigh, max |
| `gpt-5.6-luna`, `gpt-6-luna` | off (none), low, medium, high, xhigh, max |
| `hy3`, `hy4-preview`, `hy4` | off (none), plus the levels the gateway lists |
| `step-5-preview`, `gemini-4-argon` | low, medium, high |
| `qwen3.8-max`, `qwen3.8-flash` | low, medium, xhigh |
| `kimi-k2.7-code`, `mimo-v2.6-flash`, `mimo-v2.6-pro`, `minimax-m3`, `longcat-2.0`, `qwen3.7-plus`, `iceman-contributor-free`, `longcat-2.5-free` | no adjustable effort advertised |

The route keeps the OpenAI-compatible protocol (`api: openai-completions`) for every model, so
pi-ai sends the level as `reasoning_effort`; the OpenCode gateway translates it for every
upstream family. Verified live: a `reasoning_effort: high` request on `deepseek-v4.1-flash`
through this route returns a normal completion.

## Refreshing the snapshot

When the gateway adds or changes models, re-read `/zen/go/v1/models` and regenerate the block;
the route is a deliberate snapshot, not a live discovery, because discovery would change the
profile on every read.
