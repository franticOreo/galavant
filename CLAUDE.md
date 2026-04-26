# Galavant — Project Brief for AI Agents

You are working on **Galavant**, a conversational flight-search agent. Live URL: https://galavant.vercel.app.

This file is read on every agent run. Treat it as the project's brain stem — the conventions and constraints that should shape every change you make.

## What this project is (and isn't)

Galavant takes a user's free-text trip description, scrapes 3 flight sites in parallel via Firecrawl, ranks the results, and returns deep links the user clicks through to book. It does **not** handle payment, credentials, or actual booking — it's a "find the cheapest path" agent that stops at the booking-site results page.

**Single-user side project.** Maintainability > cleverness. Speed-to-failure over comprehensive design.

## Source of truth

Two living documents — read them before any non-trivial change:

- **Design spec:** `docs/superpowers/specs/2026-04-25-galavant-v1-design.md` — architecture, decisions log, what's in/out of scope, cost ceilings, failure modes.
- **Implementation plan:** `docs/superpowers/plans/2026-04-25-galavant-v1.md` — task-by-task build log with exact code per file.

If the code disagrees with the spec, the code is correct (the code shipped, the spec is descriptive). Update the spec when meaningfully diverging.

## Architecture in one diagram

```
User → /login (password) → /chat UI (assistant-ui Thread)
                                ↓
                          /api/chat (streamText, Kimi K2 via OpenRouter)
                                ↓
                          firecrawl tool → 3 sites in parallel → ranked output
```

One Vercel deployment. No DB. Stateless per request. Edge middleware gates auth + rate-limits per IP.

## Tech stack (do not casually swap)

- Next.js 16 (App Router, no `src/`), React 19, Tailwind v4
- Vercel AI SDK v6 (`ai`, `@ai-sdk/react`)
- LLM via OpenRouter (`@openrouter/ai-sdk-provider`); default model `moonshotai/kimi-k2`, override via `OPENROUTER_MODEL` env
- Firecrawl for scraping (`/v2/scrape` with `proxy: 'auto'`, geo-aware `location.country`)
- assistant-ui (`@assistant-ui/react` + `@assistant-ui/react-ai-sdk`) for the chat surface — DO NOT hand-roll chat components, the `<Thread />` is owned by assistant-ui
- Vitest for tests; vitest-jsdom env for component tests
- HMAC-signed cookies for auth (Web Crypto, not `node:crypto` — Edge runtime requires Web)
- Vercel KV for rate limiting (auto-disabled when env vars missing)
- GitHub API for `/admin/skill` commits

## Hard rules (non-negotiable)

1. **Never commit secrets.** `.env`, `.env.local`, `.env.*.local`, `.spike/`, `.claude/` are gitignored. Verify with `git check-ignore -v <file>` before adding.
2. **Edge runtime compatibility.** `middleware.ts` and anything it imports must use Web APIs only (Web Crypto, `crypto.subtle`) — no `node:crypto`, no `Buffer`. The Node runtime is fine for `/api/*` routes that don't run on Edge.
3. **`TRAVEL_SKILL.md` is the agent's prompt.** When you change it, you change runtime behaviour. Treat it as production code. Use `/admin/skill` (or commit a PR) — never edit it casually.
4. **Don't expand scope.** If an issue says "fix X," fix X. Don't refactor adjacent code, don't add tests for unrelated paths, don't introduce abstractions for hypothetical futures.
5. **Tests before features.** TDD when there's logic to test. UI components are exempt (manually verified).
6. **Convertible message shapes.** `useChat`/`useChatRuntime` send `UIMessage[]` (parts-shaped). `streamText` needs `ModelMessage[]`. Always pass through `await convertToModelMessages(uiMessages)`. Lesson learned the hard way (live deploy bug, 2026-04-26).

## Coding conventions

- **YAGNI ruthlessly.** Don't add error handling, fallbacks, or validation for scenarios that can't happen. Trust internal code and framework guarantees.
- **Immutable patterns.** Never mutate; spread to copy. Especially in API responses and state.
- **Small files.** ~200-400 lines typical, 800 max. Split when a file does two things.
- **No comments unless they explain *why*.** Don't restate what well-named code already says.
- **No emojis in code.** Per the user's strong preference.
- **Commit messages:** `feat:`, `fix:`, `chore:`, `docs:`, `test:`, `refactor:` prefixes. One-line subject + optional body.

## When you're not sure

**Comment on the issue asking, don't guess.** A single clarifying question saves a wrong PR. Especially for:
- Date/time interpretation ("mid-June" — which dates exactly?)
- Currency/units (USD or AUD?)
- Whether a change should land in code or in `TRAVEL_SKILL.md`
- Anything that touches the spec's "out of scope" list

## Self-maintenance scaffolding (already wired)

- **Daily smoke test** (09:00 Sydney) hits prod with a real flight query, opens an issue tagged `@claude` if anything is broken
- **Auto-merge** fires for any PR by `claude[bot]` or `dependabot[bot]` once `unit` CI job is green
- **Branch protection** on `main` requires the `unit` job to pass before merge
- **Vercel auto-deploy** kicks off on every push to `main`

When you fix a daily-smoke-test issue, link your PR to the issue with `Closes #N` so the loop closes cleanly.

## Cost ceiling

Side-project budget: **~$10-40/month** (Vercel free + Firecrawl ~$5-30 + OpenRouter ~$1-10). Don't introduce changes that would 10x this without asking.

## Stuff that is OUT OF SCOPE (do not propose without explicit ask)

- Hotels, multi-segment trips, itinerary stitching
- Booking, payment, credential handling
- User accounts, conversation persistence
- Form prefill past the search-results page
- Native mobile app, PWA, offline support
- Computer-use / browser automation beyond Firecrawl's `actions` parameter

If a user request implies any of the above, ask first.
