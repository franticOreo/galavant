# Galavant v1 — Design Spec

**Date:** 2026-04-25
**Status:** Draft, awaiting user review
**Repo state at spec time:** `galavant/` is an untracked subdirectory in the user's `Documents/` monorepo. v1 will live in its own standalone repo (to be `git init`-ed and pushed to `franticOreo/galavant`).

## Context

Galavant is a conversational flight-search agent. A user describes a trip in natural language; the agent searches multiple booking sites in parallel, ranks the results, and returns a list of options with deep links the user can click through to book directly. The agent never handles payment or credentials.

This spec covers v1 (Phase 1 in the README): "find the best prices for a suggested itinerary." Phase 2 (form prefill) is out of scope.

## Goals

- Single deployment, public web URL, password-gated.
- Conversational chat UI usable from a phone browser.
- Searches three flight sites in parallel via Firecrawl.
- Returns a ranked list of options with deep links.
- "Skill" file (TRAVEL_SKILL.md) holds all domain knowledge; agent gets smarter as Eli edits this file from any device.
- Operates within a side-project budget (~$10-40/month at expected usage).

## Non-goals (v1)

- Hotels, multi-segment trips, or itinerary stitching.
- Booking, payment, credential handling.
- User accounts, per-user history, persistence across browser refresh.
- Form prefill past search results (Phase 2).
- Native mobile app, PWA, offline support.
- Computer-use / browser automation. Designed-in interface for future v1.5.

## Validated assumptions (Firecrawl spike, 2026-04-25)

A 1-shot `/v2/scrape` with `waitFor: 10000` against SYD→DPS (2026-06-15 to 2026-06-22, 1 adult) returned parseable price + airline + duration data on:
- Kayak (USD): $439, $438, $478…
- Skyscanner AU (AUD): $616, $540, $803…
- Google Flights (USD): $391, $391, $455…
- Momondo (USD): same backend as Kayak.
- Expedia AU: blocked by cookie wall — excluded from v1.

Latency 14-50s per site. Sufficient for an agent loop where the user expects a 30-60s response time.

## Architecture

```
              ┌──────────────────────────────────┐
              │ User (browser, mobile or desktop)│
              └──────────────┬───────────────────┘
                             │ HTTPS, password-gated
                             ▼
        ┌────────────────────────────────────────────┐
        │  Vercel: Next.js app (single deployment)   │
        │                                            │
        │  /login           — password gate          │
        │  /                — chat UI (useChat)      │
        │  /admin/skill     — edit TRAVEL_SKILL.md   │
        │  /api/chat        — streaming AI SDK route │
        │      └─ Kimi K2 via Groq                   │
        │      └─ system prompt + TRAVEL_SKILL.md    │
        │      └─ tool: firecrawl(url, waitFor?)     │
        │  /api/skill       — commit skill edits     │
        │      └─ GitHub API → repo → auto-redeploy  │
        └────────┬───────────────────────────────────┘
                 │
                 ▼
        ┌────────────────────────┐
        │  Firecrawl /v2/scrape  │   (model picks URLs, calls in parallel)
        └────────────────────────┘
```

One Vercel deployment. No database. Stateless per request — chat history lives in browser memory only. TRAVEL_SKILL.md is a markdown file in the repo, loaded into the system prompt at request time.

### Request lifecycle (one chat turn)

1. Browser POSTs message + history to `/api/chat`.
2. Server checks auth cookie via `middleware.ts`; rejects to `/login` if missing.
3. Server constructs system prompt = base instructions + TRAVEL_SKILL.md content.
4. Server calls Groq (Kimi K2) via Vercel AI SDK with messages + the single `firecrawl` tool, streams response.
5. Kimi calls `firecrawl` with three URLs in parallel (one per flight site).
6. Each call hits `https://api.firecrawl.dev/v2/scrape`, returns trimmed markdown.
7. Kimi reads results, ranks, streams a markdown summary with deep links back to the browser.
8. Browser renders streaming tokens; tool-call chips appear/resolve as `firecrawl` calls progress.

## File layout

```
galavant/
├── app/
│   ├── layout.tsx              # root layout (Tailwind, fonts)
│   ├── page.tsx                # chat UI (renders <Chat />)
│   ├── login/page.tsx          # password form
│   ├── admin/skill/page.tsx    # textarea editor for TRAVEL_SKILL.md
│   └── api/
│       ├── chat/route.ts       # AI SDK streaming endpoint
│       ├── login/route.ts      # password check, set HMAC cookie
│       └── skill/route.ts      # POST → commit skill edit via GitHub API
│
├── components/
│   ├── chat.tsx                # useChat hook, message list, composer, tool chips
│   └── message.tsx             # markdown renderer + [skill-suggest] block handler
│
├── lib/
│   ├── auth.ts                 # cookie verify (HMAC-signed, AUTH_SECRET)
│   ├── prompt.ts               # buildSystemPrompt() = base + TRAVEL_SKILL.md
│   ├── firecrawl.ts            # the one tool: firecrawlTool (~25 LOC)
│   ├── github.ts               # commit a file via GitHub Contents API
│   └── ratelimit.ts            # KV-backed sliding-window limiter
│
├── middleware.ts               # auth gate + rate limit (skip for /login + /api/login)
├── TRAVEL_SKILL.md             # the evolving knowledge file (in repo, manually + skill-suggest edited)
├── .env.example                # documented env vars
├── package.json
└── docs/
    └── superpowers/specs/2026-04-25-galavant-v1-design.md  (this file)
```

~14 source files. One Next.js app. No backend services.

## Component detail

### `lib/firecrawl.ts` — the one tool

A single primitive. The model picks URLs; the server holds the API key.

```ts
import { tool } from 'ai';
import { z } from 'zod';

export const firecrawlTool = tool({
  description:
    'Scrape a URL via Firecrawl /v2/scrape. Returns markdown of the rendered page. ' +
    'Use this for any flight-search URL. See TRAVEL_SKILL.md for site URL templates.',
  parameters: z.object({
    url: z.string().url(),
    waitFor: z.number().int().min(0).max(15000).default(10000)
      .describe('ms to wait for JS render. 10000 is a safe default for flight sites.'),
  }),
  execute: async ({ url, waitFor }) => {
    const res = await fetch('https://api.firecrawl.dev/v2/scrape', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.FIRECRAWL_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ url, formats: ['markdown'], waitFor, onlyMainContent: false }),
      signal: AbortSignal.timeout(60_000),
    });
    if (!res.ok) return { ok: false, error: `Firecrawl ${res.status}: ${await res.text()}` };
    const json = await res.json();
    const markdown: string = json?.data?.markdown ?? '';
    const first = markdown.indexOf('$');
    const last = markdown.lastIndexOf('$');
    const trimmed = first >= 0 && last > first ? markdown.slice(first, last + 200) : markdown;
    return { ok: true, url, markdown: trimmed };
  },
});
```

The trim heuristic ("first `$` to last `$` + 200") drops nav/footer/cookie-banner noise without per-site code. Validated against the spike data.

### `lib/prompt.ts` — system prompt composition

```ts
import { readFileSync } from 'fs';
import { join } from 'path';

const BASE = `You are Galavant, a conversational flight-search agent.
You have one tool: firecrawl(url, waitFor?). Read TRAVEL_SKILL.md below for
site URL templates, workflow, and learned quirks. Always call all 3 sites
in parallel for any flight search. Always include the deep link from each
site in your output. Never fabricate prices or flights.`;

export function buildSystemPrompt(): string {
  const skill = readFileSync(join(process.cwd(), 'TRAVEL_SKILL.md'), 'utf8');
  return `${BASE}\n\n---\n\n${skill}`;
}
```

Read-from-disk on every request is fine — file is <10KB and Vercel's filesystem is fast. Ensures TRAVEL_SKILL.md edits take effect on next deploy.

### `TRAVEL_SKILL.md` — initial content

```markdown
# Travel Search Skill — Galavant

You are a travel search agent. Take a user's free-text trip request, search 3
flight sites in parallel via the firecrawl tool, then return a ranked list of
3-5 best options with deep links and a one-line "why this one."

## Tool: firecrawl(url, waitFor?)

Scrapes any URL, returns trimmed markdown of the rendered page. Use waitFor=10000
for JS-heavy flight sites. Always call all 3 sites in parallel.

## Site URL templates (PARAMS in CAPS to substitute)

### Kayak (USD prices)
https://www.kayak.com/flights/ORIGIN-DEST/YYYY-MM-DD/YYYY-MM-DD?sort=bestflight_a
Example: https://www.kayak.com/flights/SYD-DPS/2026-06-15/2026-06-22?sort=bestflight_a

### Skyscanner AU (AUD prices)
https://www.skyscanner.com.au/transport/flights/ORIGIN/DEST/YYMMDD/YYMMDD/?adultsv2=N
Example: https://www.skyscanner.com.au/transport/flights/syd/dps/260615/260622/?adultsv2=1
NOTE: dates are YYMMDD (no leading 20), airports lowercase, returns AUD.

### Google Flights (USD)
https://www.google.com/travel/flights?q=Flights%20ORIGIN%20to%20DEST%20on%20YYYY-MM-DD%20through%20YYYY-MM-DD
Example: https://www.google.com/travel/flights?q=Flights%20SYD%20to%20DPS%20on%202026-06-15%20through%202026-06-22

## Workflow

1. Parse user request → origin (IATA), dest (IATA), depart date, return date, # adults.
   If anything is missing or ambiguous, ASK. Do not guess on dates.
2. Call firecrawl on all 3 site URLs in parallel.
3. From each markdown, extract: airline, depart time, arrival time, duration, stops, price, currency, deep link.
4. Normalize currencies for comparison (AUD ↔ USD; if user did not give a rate, show both currencies).
5. Return top 3-5 options ranked by total cost with one-line "why" per option.
6. Always include the deep link from each site so the user can click through.

## Output format

Numbered markdown list. Each item:
- **{currency}{price}** — {airline} {flight#} {direct|N stops}
- {duration} · departs {local time}
- → [book on {site}]({deep link})

No emojis. No multi-paragraph preamble.

## Learning loop

When you discover a new fact, quirk, or rule that would help future searches,
emit a [skill-suggest] block at the end of your response:

[skill-suggest]
Append to TRAVEL_SKILL.md under "Quirks":
<the new line>
[/skill-suggest]

The user can tap "Approve" in the UI to commit it via the GitHub API.

## Quirks learned (append as you learn)

- Skyscanner shows AUD; Kayak/Google show USD. Always note currency on each option.
- Expedia AU hits a cookie wall via Firecrawl — excluded from v1.
- Some routes return "no flights" — say so explicitly. Do not fabricate options.
```

### Admin skill editor (`/admin/skill`)

Password-gated (same cookie as `/`). Server-rendered page with a `<textarea>` containing current TRAVEL_SKILL.md content. Save button POSTs to `/api/skill`, which uses `lib/github.ts` to commit the file via the GitHub Contents API. Vercel auto-redeploys on push.

### `[skill-suggest]` blocks

The chat message renderer (`components/message.tsx`) detects `[skill-suggest]…[/skill-suggest]` blocks in assistant messages, replaces them with a styled card showing the proposed addition + an [Approve & commit] button. Tapping calls `/api/skill` with the merge plan. Human-in-the-loop self-improvement.

## Output format & UX

Single-column, mobile-first. Vercel AI SDK's `useChat` provides streaming, history, and tool-state events.

```
┌──────────────────────────────────────────┐
│  Galavant                          [↻]   │
├──────────────────────────────────────────┤
│                                          │
│   ▌ I want to fly SYD → Bali, mid-June, │
│     1 week, cheapest direct              │
│                                          │
│   🔍 Searching Kayak…                    │
│   🔍 Searching Skyscanner…               │   ← tool-state chips
│   🔍 Searching Google Flights…           │     (auto from useChat)
│                                          │
│   Top 3 options for SYD → DPS,          │
│   2026-06-15 → 2026-06-22, 1 adult:     │
│                                          │
│   1. **A$612** — Jetstar JQ37 direct    │
│      6h05m · departs 10:30 SYD          │
│      → [book on Kayak](https://...)     │
│                                          │
│   2. ...                                 │
│                                          │
├──────────────────────────────────────────┤
│ [ Tell me where you want to fly...    ] │
└──────────────────────────────────────────┘
```

Tool-call chips derive their label from the URL host (`kayak.com` → "Kayak"). Chips disappear when the call resolves.

## Error handling

| Failure | Where | Response |
|---|---|---|
| Firecrawl 4xx/5xx | tool returns `{ ok: false, error }` | Model names the failed site in output ("couldn't reach Skyscanner — here's what Kayak and Google returned") |
| Empty markdown / no `$` (e.g. cookie wall) | trim returns near-empty | Model treats as no-results from that site |
| Groq / Kimi K2 down | AI SDK throws | Route returns 503; UI shows "model unavailable, try again" |
| Auth cookie missing/expired | middleware redirects to /login | User re-enters password |
| Firecrawl call >60s | AbortController in firecrawlTool | Same as Firecrawl error |

**No automatic retries.** Doubles bills on flaky days. Model can re-issue if it decides to (visible as a new tool call).

## Cost guards

Three layers, smallest blast radius first:

1. **Per-request token cap.** `maxOutputTokens: 2000` on the Groq call.
2. **Per-request tool-call cap.** `maxSteps: 8` in the AI SDK config (3 initial searches + ~5 retries).
3. **Per-IP rate limit.** Vercel KV sliding-window: 10 req/hr/IP, 50/day/IP. Implemented in `middleware.ts` after auth check.

Optional fourth layer (recommended week 2):

4. **Daily global kill-switch.** Track `firecrawl_calls_today` + `llm_tokens_today` in KV. When either crosses threshold (e.g. 500 Firecrawl calls or 2M tokens), `/api/chat` returns 503 with "daily budget reached."

### Worst-case cost math

Single query: 3 Firecrawl scrapes (~$0.003 each = $0.01) + 1 LLM round (~50K input + 2K output at Kimi K2 prices ≈ $0.01) = **~$0.02 per query**. Per-IP cap of 50/day = $1/day single user max. Daily kill-switch at 500 Firecrawl calls = ~$3.30/day worst case across all users.

## Logging

Vercel built-in function logs only. Per request, one structured line:

```
{ ts, ip_hash, prompt_chars, tool_calls: [{url, ok, ms}], llm_in_tokens, llm_out_tokens, total_ms }
```

No PII beyond hashed IP. No prompt content.

## Testing strategy

| Layer | Tested? | What |
|---|---|---|
| `lib/firecrawl.ts` | Yes | Mock fetch, assert auth header + body, trim heuristic on fixture markdown |
| `lib/auth.ts` | Yes | HMAC verify: valid, expired, tampered |
| `lib/github.ts` | Yes | Mock GitHub API, assert file path + commit message |
| `lib/ratelimit.ts` | Yes | 11th req in window returns 429 |
| `app/api/chat/route.ts` | Smoke only | 200 + streaming response from a fake message |
| `app/api/skill/route.ts` | Yes | Auth check + GitHub call shape |
| End-to-end "real flight search" | Manual only | Eyeball deployed URL with a real route |
| TRAVEL_SKILL.md | Not tested | It is prose. Iterate by shipping. |

Stack: Vitest, ~5 small test files. No Playwright, no Cypress, no CI matrix.

## Deploy

0. Init `galavant/` as a standalone git repo (`.gitignore` excludes `.env`, `.env.local`, `.spike/`, `node_modules/`, `.next/`). Create empty `franticOreo/galavant` on GitHub. Push initial commit to `main`.
1. Vercel: import the repo, default Next.js settings. Auto-deploy on push to `main`; preview deploys on PRs.
2. Env vars (Vercel dashboard + `.env.local` for local):
   ```
   FIRECRAWL_API_KEY=fc-...        # already present in .env
   GROQ_API_KEY=gsk_...            # provision new
   APP_PASSWORD=...                # shared gate password
   AUTH_SECRET=...                 # 32-byte random for HMAC cookie sign
   GITHUB_TOKEN=ghp_...            # fine-scoped PAT, contents:write on this repo only
   GITHUB_REPO=franticOreo/galavant
   ```
3. Vercel KV: add from dashboard, free tier. Auto-injects `KV_REST_API_URL` + `KV_REST_API_TOKEN`.
4. Domain: point `galavant.global` (per README) at Vercel, ~5 min to provision SSL.
5. First deploy: push, wait ~60s, hit URL with password, ask "flights SYD to DPS in mid-June." Eyeball.

## Operational footprint

| Service | Tier | Monthly cost |
|---|---|---|
| Vercel | Hobby (free) | $0 |
| Vercel KV | Free tier | $0 |
| Firecrawl | Pay-as-you-go | ~$5-30 expected |
| Groq (Kimi K2) | Pay-as-you-go | ~$1-10 expected |
| Domain galavant.global | annual | ~$3/yr |
| **Total** | | **~$10-40/mo at side-project usage** |

## Phone-development workflow

The architecture is optimised for phone iteration because most changes happen in TRAVEL_SKILL.md, not code.

- **Edit skill from anywhere:** `/admin/skill` page in Galavant itself.
- **Approve agent-suggested edits:** [Approve & commit] button in chat.
- **Rotate secrets / view logs:** Vercel mobile app.
- **Edit any file:** GitHub mobile app or github.dev (full VS Code in browser).
- **Bigger refactors:** GitHub Codespaces in mobile browser, or laptop.

## Decisions log

| Decision | Choice | Reason |
|---|---|---|
| Chat surface | Public web app via Vercel | "Anyone can use" goal; no terminal required |
| Agent loop | Vercel AI SDK + Next.js | Polished chat UI, streaming, tool calls; deploys to Vercel free tier |
| LLM provider (default) | Kimi K2 via Groq | Cheap, fast, strong tool calling, vendor-neutral, env-swappable |
| Tool design | Single `firecrawl(url, waitFor?)` primitive | "Anti-tools" — no per-site wrappers; model + TRAVEL_SKILL.md handle everything |
| Parsing | Trimmed markdown to LLM, no regex parsers | Robust to site DOM drift; cost negligible at Kimi prices |
| Ranking | LLM does it | Lets model weigh user constraints naturally; no constraint solver in code |
| Auth | Shared password + HMAC cookie | Lean, ~30 LOC, anyone-with-password gate |
| Persistence | None (browser-only chat history) | YAGNI; stateless per request |
| Sites for v1 | Kayak + Skyscanner + Google Flights | Spike showed real prices; Expedia blocked by cookie wall (excluded) |
| Computer-use fallback | Designed-in slot, not built v1 | Spike showed Firecrawl sufficient for Phase 1 |
| Skill-editing UX | `/admin/skill` page + `[skill-suggest]` chat blocks | Phone-native iteration; human-in-the-loop self-improvement |

## Out of scope (v1)

- Hotels, multi-segment trips
- Booking, payment, credentials
- User accounts, history, persistence
- Form prefill (Phase 2)
- Native mobile app
- Computer-use / browser automation
- Loyalty point optimization

## Future / open questions

- **Phase 2 form prefill:** likely needs computer-use (Stagehand or similar). The `lib/firecrawl.ts` boundary is the right place to add a sibling tool when needed.
- **Currency normalization:** v1 shows both AUD and USD. If users ask for one ranked list across currencies, add an FX rate fetch (e.g. via Firecrawl on a rates page, or a free API).
- **Multi-user:** if Galavant grows past friends-with-the-password, swap shared password for NextAuth and add per-user rate limits.
- **Skill suggestions accuracy:** if `[skill-suggest]` blocks become noisy, add a "reject and explain why" path so the model can learn what NOT to suggest.

## Risks

- **Firecrawl quota / cost spike** if a route requires retries or a site adds anti-bot. Mitigated by daily kill-switch.
- **Site DOM changes** breaking the trim heuristic. Mitigated by trim being permissive (falls back to full markdown) and by the LLM being able to read either.
- **Groq outage** — Vercel AI SDK provider-swap is one env var change to fall back to Gemini Flash or GPT-5 mini.
- **Password leak** — rotate `APP_PASSWORD` env var, redeploy.
