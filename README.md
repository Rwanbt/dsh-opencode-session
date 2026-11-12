# dsh-opencode-session

A DeepSeek Harness plugin that sends the per-conversation `x-opencode-session`
header that **OpenCode Go** requires on every inference request.

## Why it exists

The OpenCode Go gateway answers `400 MissingSessionID` when a request carries no
`x-opencode-session` header. pi-ai adds that header itself for the two providers
it ships (`opencode` and `opencode-go`), using the Session id the harness passes
to the provider. It cannot do so for a **hand-declared** route — and a second Go
subscription is necessarily such a route, because one pi-ai provider id carries
one credential:

```yaml
providers:
  opencode-go:
    apiKeyEnv: OPENCODE_GO_API_KEY
  opencode-go-2:                 # hand-declared: pi-ai ships no such provider
    apiKeyEnv: OPENCODE_GO_2_API_KEY
    api: openai-completions
    baseURL: https://opencode.ai/zen/go/v1
    models: [...]
```

Without this plugin, `opencode-go-2` authenticates and lists models, yet every
generation fails with `MissingSessionID`. With it, the route behaves exactly
like the shipped one: the Session id travels as the required header, so the
gateway can route and cache the conversation.

## How it works

One Host row listens to the `llm-pi-ai/request-headers` waterfall. For every
pi-ai inference call whose provider route looks like OpenCode, it sets
`x-opencode-session` to the call's Session id (or a stable fallback for
auxiliary calls that carry none) before dispatch. pi-ai then leaves the header
alone because it already exists, so a shipped route is unaffected.

## Platforms

Windows, Linux and macOS. The plugin is plain Node (no native module, no build step) and only
contributes a header through the harness waterfall, so it runs wherever the harness runs. CI
executes the packaging checks on all three operating systems.

## Configuration

```yaml
- id: opencode-session
  name: dsh-opencode-session
  config:
    headerName: x-opencode-session   # default; the name the gateway expects
    providers: [opencode-go-2]       # optional allowlist; default: any id containing "opencode"
    fallbackSessionId: ''            # optional stable id for calls without a Session
```

## Limitations

- The header is a routing/caching hint, not an authentication mechanism; each
  route still needs its own `apiKeyEnv` credential.
- A route whose provider id does not contain `opencode` needs an explicit
  `providers` entry.
