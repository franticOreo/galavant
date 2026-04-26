# Galavant

> A travel agent that's brutally analytical in the back, warm and opinionated in the front. Tell it about a trip, get a plan — flights, hotels, the whole thing — without having to open eight tabs and trust whichever aggregator's homepage you landed on.

Live: https://www.galavant.global · Spec: [docs/superpowers/specs/2026-04-25-galavant-v1-design.md](docs/superpowers/specs/2026-04-25-galavant-v1-design.md)

## Why this exists

I missed an 11am flight to Ibiza because Google Flights didn't show it. Skyscanner had it the whole time. The aggregators don't see each other.

Then I tried to plan a last-minute Japan trip with my partner — so much back and forth, so many tabs, so many comparisons. Eventually you give up and book whatever's cheapest on the front page of one site. That's the **lazy tax**: trips are complex enough that no human will exhaustively search, so people pay a premium for the convenience of not searching.

An agent should be doing that exhausting work.

## What it feels like

You talk to it like you'd talk to a travel agent. *"We're thinking Madrid in May for a long weekend, two of us, want to keep it under $2k all-in."* It comes back with a recommendation: a specific flight pairing, a neighborhood to stay in, a few hotel options, what to watch out for. Not a wall of search results. A plan.

## What it actually does (v1)

Behind the curtain: scrapes flight aggregators (Kayak, Skyscanner, Google Flights) in parallel for any flight question and surfaces what they disagree about. For everything else (hotels, cruises, ground transport, "should we stay in Centro or Salamanca?") it scrapes whatever travel site makes sense for the question, and falls back to general travel knowledge when scraping isn't useful.

It never handles payment or credentials — you click through the deep links and transact yourself. No accounts, no saved searches, no group features.

## Who it's for

Right now, a beachhead of 5 specific people: me, my partner, my dad, and Ash + Angus (we're planning a Spain trip). The wedge is "would Ash use it twice for the Spain planning instead of opening four tabs in Skyscanner?" Once 5 people each search twice, we'll know whether the lazy-tax thesis holds.

Not for: people doing simple one-leg trips on a single airline they already know. Galavant earns its keep when the trip is complex enough to make manual comparison painful.

## What it's NOT

A clarification, since the agent and the *built infrastructure* are different things:

**The agent will help with anything travel-shaped** — flights, hotels, cruises, neighborhoods, day trips. It uses general knowledge plus its ability to scrape any URL.

**Dedicated infrastructure is flight-only for v1.** Hotels and cruises are handled conversationally + opportunistically — not yet with the same rigor as flights (3 sites in parallel, ranked, deep-linked). Adding dedicated hotel/cruise infrastructure happens after the flight wedge proves itself.

**Hard never-dos:**
- Booking, payment, credential handling
- User accounts, saved trips, sharing, group decisions
- Form prefill past the search-results page (that's Phase 2)
- Native mobile app, PWA, offline support
- Loyalty point optimisation

## How it stays alive

Galavant is built to be **self-maintaining**:

- **Daily smoke test** — a remote agent hits the live URL with a real flight query at 09:00 Sydney; if it's broken, opens a GitHub issue tagged `@claude` which auto-opens a fix PR which auto-merges when CI passes
- **Weekly retro** (Sundays) — a remote agent posts a one-screen summary of what shipped + what's worth doing
- **Monthly security audit** (1st of month) — a remote agent runs an OWASP/secret/dependency review
- **Quarterly CEO review** (Jan/Apr/Jul/Oct) — a remote agent posts ONE strategic question for me to answer: SCALE / FOCUS / PIVOT / SUNSET
- **Dependabot** — weekly grouped npm + GH Actions update PRs, auto-merged when CI green

Touch-time target: read the quarterly review. Everything else handles itself.

## Architecture (one paragraph)

Single Next.js 16 app on Vercel. Vercel AI SDK v6 streams chat from Kimi K2 via OpenRouter. One generic `firecrawl(url)` tool — the model picks URLs from templates kept in `TRAVEL_SKILL.md`. No per-site code, no parsers, no DB. assistant-ui owns the chat surface. HMAC-signed cookie auth (Web Crypto, Edge-compatible). Vercel KV rate-limits per IP.

Full architecture: [docs/superpowers/specs/2026-04-25-galavant-v1-design.md](docs/superpowers/specs/2026-04-25-galavant-v1-design.md). For AI agents working on the codebase: [CLAUDE.md](CLAUDE.md).

## Run locally

```bash
cp .env.example .env.local
# fill in FIRECRAWL_API_KEY, OPENROUTER_API_KEY, APP_PASSWORD, AUTH_SECRET (>=32 chars)
npm install
npm run dev
```

Open `http://localhost:3000`, log in with `APP_PASSWORD`, ask for a flight.

## Test

```bash
npm test
```

## Cost ceiling

Side project budget: ~$10-40/month. Vercel free + Firecrawl ~$5-30 + OpenRouter ~$1-10. If a change would 10x this, it gets discussed first.

## Status

v1 shipped 2026-04-26. Single user (me) + friends with the password. Pre-demand by definition — I built it yesterday. The Ibiza miss is the only proof yet that the lazy tax is real, and I'm the only person who's experienced it through Galavant.

Whether this scales beyond a friends-with-password tool depends entirely on whether the 5 named people in "Who it's for" actually use it twice for real trips. If they don't, FOCUS or SUNSET in Q3 2026.
