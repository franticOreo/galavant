# Travel Planning Agent — Project Brief

# Brand Name
Galavant, potential domain, galavant.global.

## Problem

Travel booking is fragmented and opaque. Cheaper prices exist across platforms but are buried behind comparison friction. Consumers overpay because shopping properly across Booking.com, Skyscanner, Google Flights, Kayak, etc. is tedious. Booking platforms function as a "lazy layer" — convenient but rarely surfacing the genuinely cheapest path.

We're removing that lazy tax.

## Solution

A conversational agent that does the legwork. User describes their trip in natural language. Agent researches across booking sites in parallel, compares options across price/duration/layovers/constraints, and returns a ranked, mobile-friendly list of pre-filled booking links. User clicks through and pays themselves — agent never handles payment or credentials.

# Development Philosophy
* IMPORTANT:This ideally should be completely managed by agents. This is project created by one human, so we need this to be as simple, robust and easily maintable or even auto maintained by agents.
* Speed to failure, let's get this project working in the next hour. there is no reason with opus 4.7 (superpowers plugin {paralell agents}) thats we can't do this.


# Development Phases

## Phase 1
let's just find the best prices for a suggested itinerary.

## Phase 2 
prefill forms.

## Scope (v1)

- **Interface:** minimal chat wrapper. No forms.
- **Input:** free-text trip description (origin, destination, dates, constraints, preferences).
- **Output:** mobile-friendly ranked list of options with pre-filled deep links to each booking site, stopping just before the payment gateway.
- **No booking execution.** No credential handling. Agent surfaces options; user transacts.

## Architecture

- **Primary scraper:** Firecrawl. Faster, cleaner, lower overhead.
- **Fallback:** computer use, only when Firecrawl can't handle a specific site (anti-scraping, dynamic JS, etc.).
- **Parallel execution:** run searches across multiple sites concurrently.
- **Agent harness:** Open Claw (with Kimi 2.6)
- **Cloud** AWS account for eli.simic.robertson@gmail.com, small ec2 instance. 
- Keep it simple. Side project. Maintainability > cleverness.

## Target sites (initial)
Booking.com, Skyscanner, Google Flights, Kayak, Expedia. Expand based on coverage gaps.

## Out of scope (for now)

- Actual booking / payment flow
- Multi-tenant credential management (interesting problem, deferred — see "Future")
- Loyalty point optimization
- Hotel + flight bundling logic beyond surfacing what sites already offer

## Future / open questions

- **Public agent + secure credential passing:** explored conceptually (zero-knowledge proofs, scoped OAuth tokens, session isolation). Not v1. Real challenge is multi-tenant state isolation, not crypto.
- **Business model:** affiliate links? Flat fee per trip plan? Subscription? Decide after validating the planning value.
- **Learning layer:** captured price comparison patterns and itinerary nuances could become a reusable knowledge base across users.

## Build order

1. Firecrawl integration against 2-3 target sites
2. Parallel search orchestration
3. Ranking + comparison logic
4. Pre-filled deep-link generation
5. Chat wrapper UI
6. Fallback to computer use for sites that block Firecrawl

## Run locally

```bash
cp .env.example .env.local
# fill in FIRECRAWL_API_KEY, GROQ_API_KEY, APP_PASSWORD (>=8 chars), AUTH_SECRET (>=32 chars)
npm install
npm run dev
```

Open `http://localhost:3000`, log in with `APP_PASSWORD`, ask for a flight.

## Test

```bash
npm test
```

## Deploy

See `docs/superpowers/specs/2026-04-25-galavant-v1-design.md` § Deploy.
