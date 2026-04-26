# Galavant Chat UI — Design Handoff

This document is the design source of truth for Galavant's v1 chat interface.
For visual reference, render `docs/design/mockup-final.html` in a browser — the
final mockup mirrors every token in this doc.

## 1. Scope (v1)

- Single-page chat interface. `app/page.tsx` IS the chat — there's no marketing
  page or separate "/chat" route.
- Two visual states: **empty (entry moment)** and **active (conversation)**.
- Markdown-only assistant responses. No tool-call result cards, no Firecrawl
  data, no persistence in v1.
- Built on `@assistant-ui/react` + `@assistant-ui/react-ai-sdk`. Recommended
  scaffold path: `npx assistant-ui init`, then customize the generated
  `components/assistant-ui/thread.tsx`.

## 2. Design tokens

All values match `mockup-final.html`. Define them as CSS custom properties in
`app/globals.css` (or wherever Tailwind v4's `@theme` block lives).

### Palette — sky (gradient stops, top → bottom)

| Token        | Hex       | Stop |
| ------------ | --------- | ---- |
| `--sky-deep` | `#5a7da3` | 0%   |
| `--sky-mid`  | `#93b3d2` | 28%  |
| `--sky-pale` | `#c5d6e7` | 65%  |
| `--sky-haze` | `#e2e8ec` | 100% |

The full sky background composites the linear gradient with four radial
highlight blooms (faking sun/cloud lighting). Reference CSS:

```css
background:
  radial-gradient(ellipse 50% 35% at 70% 28%, rgba(255,255,255,0.85) 0%, transparent 60%),
  radial-gradient(ellipse 35% 22% at 78% 18%, rgba(255,255,255,0.60) 0%, transparent 65%),
  radial-gradient(ellipse 40% 28% at 18% 35%, rgba(255,255,255,0.50) 0%, transparent 65%),
  radial-gradient(ellipse 30% 20% at 90% 50%, rgba(255,255,255,0.35) 0%, transparent 60%),
  linear-gradient(180deg,
    var(--sky-deep) 0%,
    var(--sky-mid)  28%,
    var(--sky-pale) 65%,
    var(--sky-haze) 100%);
```

A **dark vignette** sits at the very top edge (Air-style) to add atmosphere:

```css
position: absolute; top: 0; left: 0; right: 0; height: 120px;
background: linear-gradient(180deg, rgba(15,25,45,0.45) 0%, transparent 100%);
```

### Palette — accents

| Token                 | Value                          | Used for                             |
| --------------------- | ------------------------------ | ------------------------------------ |
| `--neon-coral`        | `#ff7a9e`                      | Tagline, streaming cursor            |
| `--neon-coral-glow`   | `rgba(255, 122, 158, 0.65)`    | Glow shadow under tagline & cursor   |
| `--soft-coral`        | `#ffc1cf`                      | Markdown links, streaming glow ring  |
| `--ink`               | `#1a2540`                      | Text on light glass, send button bg  |

### Glass tokens

| Token                    | Value                       | Where                |
| ------------------------ | --------------------------- | -------------------- |
| `--glass-user-bg`        | `rgba(255, 255, 255, 0.60)` | User msg bubble      |
| `--glass-assistant-bg`   | `rgba(255, 255, 255, 0.32)` | Assistant msg bubble |
| `--glass-composer-bg`    | `rgba(255, 255, 255, 0.72)` | Composer pill        |
| `--glass-chip-bg`        | `rgba(255, 255, 255, 0.20)` | Header buttons, suggestion chips |
| `--glass-border`         | `rgba(255, 255, 255, 0.50)` | Default glass border |
| `--glass-border-strong`  | `rgba(255, 255, 255, 0.85)` | Composer border      |
| `--glass-blur`           | `28px`                      | Composer + chips     |
| `--glass-blur-msg`       | `24px`                      | Message bubbles      |

All glass elements use `backdrop-filter: blur(...)` plus its `-webkit-` prefix
for Safari.

## 3. Typography

| Use                  | Family        | Weight | Notes                     |
| -------------------- | ------------- | ------ | ------------------------- |
| Wordmark (placeholder, **TBD**) | Anton  | 400    | See note below |
| Tagline              | Caveat        | 700    | Italic feel, hand-drawn   |
| Body / UI            | Inter         | 400/500/600 | Default font family  |

Load all three via `next/font/google` in `app/layout.tsx`. Caveat 400 should
also be loaded if any future copy needs the lighter weight.

> **Wordmark typeface is not locked.** Anton is acting as a placeholder for
> v1. The eventual replacement is a bespoke 3D-rendered wordmark authored in
> Figma (and exported as SVG or transparent PNG). Build the wordmark as a
> single component (`components/galavant/wordmark.tsx`) with the typeface
> swappable in one place. Plausible alternatives if Anton doesn't feel right:
> Bebas Neue, Oswald, Big Shoulders Display, Archivo Black.

### Wordmark sizing

- Empty-state hero: `124px` font-size, `0.92` line-height, `4px` letter-spacing
- Header (top-left): `20px`, `2.5px` letter-spacing

```css
text-shadow:
  0 2px 18px rgba(0,0,0,0.22),    /* depth */
  0 0 60px  rgba(255,255,255,0.12); /* faint halo */
```

### Tagline ("travel, lifted")

- Caveat 700, `44px`
- Color: `--neon-coral`
- Rotation: `-4deg`
- Glow stack:
  ```css
  text-shadow:
    0 0 6px  var(--neon-coral-glow),
    0 0 14px rgba(255,122,158,0.4);
  ```

## 4. Components

### `<SkyBackground>` — `components/galavant/sky-background.tsx`

- Fixed-position div, `inset: 0`, behind everything (`z-index: 0`).
- Renders the full sky gradient + four radial highlight blooms (see §2 palette).
- Renders the dark vignette as a separate child, `z-index: 1`.
- Pure CSS, no JS, no images.

### `<Wordmark>` — `components/galavant/wordmark.tsx`

- Used in two places: the empty state (giant centered hero) and the header
  (small top-left). Accept a `size: 'hero' | 'header'` prop or just expose two
  components.
- Body: the literal string `GALAVANT` in Anton (see §3 wordmark).
- Hero variant also renders the tagline below.
- Empty hint copy below tagline: `Plan your trip. Skip the booking-site shuffle.`
  in `Inter 400 / 13px / rgba(255,255,255,0.78)`.

### `<SuggestionChips>` — empty state only

Three chips below the wordmark. Sample copy in mockup:

- `2 weeks in Japan, under $3k`
- `Cheapest May flight NYC → Lisbon`
- `Solo trip, beach + hiking, October`

Click should populate the composer input with the chip text and submit. Style:

```css
padding: 8px 14px;
border-radius: 999px;
background: var(--glass-chip-bg);
backdrop-filter: blur(18px);
border: 1px solid rgba(255,255,255,0.35);
color: white; font-size: 12px; font-weight: 500;
```

### `<Header>`

- Left: small `<Wordmark size="header" />`
- Right: glass header buttons (`Sign in`, `New trip`)
- Uses `--glass-chip-bg` + 20px blur, white border at 0.40 opacity, white text.

> "Sign in" and "New trip" are visual placeholders only. Wire them up in a
> later phase.

### `<Thread>` — `components/assistant-ui/thread.tsx`

The customized assistant-ui Thread. Most of the work happens here.

#### Message bubble — user

```css
align-self: flex-end;
max-width: 78%;
padding: 12px 18px;
border-radius: 22px;
border-bottom-right-radius: 8px;  /* "tail" toward sender */
background: var(--glass-user-bg);
color: var(--ink);
border: 1px solid var(--glass-border);
backdrop-filter: blur(var(--glass-blur-msg));
box-shadow: 0 2px 18px rgba(20,30,50,0.06);
font-size: 14px; line-height: 1.55;
```

#### Message bubble — assistant

Same as user, with these overrides:

```css
align-self: flex-start;
background: var(--glass-assistant-bg);
color: white;
border-bottom-left-radius: 8px;
border-bottom-right-radius: 22px;
border-color: rgba(255,255,255,0.45);
```

#### Markdown inside assistant messages

- `strong` → `color: white; font-weight: 600`
- `a` → `color: var(--soft-coral); text-decoration: none; border-bottom: 1px solid rgba(255,193,207,0.55)`
- `ul` → `padding-left: 18px; margin: 8px 0`
- `li` → `margin: 4px 0`
- `p + p` → `margin-top: 8px`

Use assistant-ui's built-in markdown rendering and override these classes.

#### Streaming indicator

Render a coral cursor at the end of the streaming token stream:

```css
.streaming-cursor {
  display: inline-block;
  width: 8px; height: 16px;
  background: var(--neon-coral);
  margin-left: 2px;
  vertical-align: text-bottom;
  box-shadow: 0 0 8px var(--neon-coral-glow);
  animation: blink 1s steps(2) infinite;
}
@keyframes blink { 50% { opacity: 0; } }
```

The streaming bubble itself gets a subtle coral glow ring (in addition to its
default shadow) to reinforce the "live" state:

```css
box-shadow:
  0 2px 18px rgba(20,30,50,0.06),
  0 0 0 1px rgba(255,193,207,0.35),
  0 0 24px rgba(255,193,207,0.18);
```

Remove both the cursor and the glow ring when the stream completes.

#### Composer (bottom-anchored glass pill)

```css
position: absolute; bottom: 24px; left: 50%;
transform: translateX(-50%);
width: calc(100% - 48px);
max-width: 672px;     /* matches the message-list max-width */
display: flex; align-items: center; gap: 12px;
padding: 10px 12px 10px 22px;
border-radius: 999px;
background: var(--glass-composer-bg);
backdrop-filter: blur(var(--glass-blur));
border: 1px solid var(--glass-border-strong);
box-shadow:
  0 8px 30px rgba(20,30,50,0.08),
  0 2px 6px  rgba(20,30,50,0.04);
```

Input: transparent background, `--ink` text, 15px font, no border.
Placeholder color: `rgba(26,37,64,0.45)`. Placeholder text: `Where to?`.

Send button: 38×38 circle, `--ink` background, white arrow `↑` icon.
Hover: `transform: scale(1.05)`. Submit on Enter; Shift+Enter inserts newline.

## 5. Layout

- **Container**: `max-width: 720px; margin: 0 auto; padding: 32px 24px 24px`
  centered over the full-bleed sky.
- **Sky** is fixed-position behind everything (`<SkyBackground>` renders once
  in the layout).
- **Composer** is `position: absolute` within the viewport, bottom-anchored.
- **Message list** scrolls within the available space; `padding-bottom: 100px`
  keeps the last message from sliding under the composer.
- Hide the message-list scrollbar (`::-webkit-scrollbar { width: 0 }`).
- Mobile: the same column scales — every `max-width` is liquid, the composer's
  `width: calc(100% - 48px)` keeps a 24px gutter on phones.

## 6. Empty → active transition

- Show `<Wordmark size="hero">` + `<SuggestionChips>` when `messages.length === 0`.
- On first user message, replace those with the message list. The composer
  stays anchored at the bottom across both states (no animated swap needed in
  v1 — instant state change is fine).

## 7. Out of scope (v1) — polish targets

These are explicitly NOT being built in v1. Capturing here so the next pass
knows where the polish budget goes:

- Animated decorations in the sky (paper plane, butterfly, particle field).
  Considered and parked.
- Bespoke 3D wordmark (Figma-authored, replaces the Anton placeholder).
- Tool-call result cards (flight-option cards, hotel cards) — currently
  rendered as plain markdown links.
- Conversation history sidebar / persistence layer.
- Light/dark mode beyond sky-blue daytime.
- Variable-typographic ASCII hero (Pretext-driven, multi-day exploration).
- "New trip" and "Sign in" wired up (currently visual only).

## 8. Visual reference

The canonical mockup lives at `docs/design/mockup-final.html`. Open it in a
browser to see the design at full fidelity (real fonts, glass, gradients).
Every value in this doc should produce the same pixels.

## 9. Implementation hints (non-binding)

- Use `next/font/google` to load Anton, Caveat, Inter — get
  `--font-anton`, `--font-caveat`, `--font-inter` CSS variables.
- Tailwind v4: register the design tokens under an `@theme` block in
  `globals.css` so they're available as utility classes.
- The assistant-ui CLI (`npx assistant-ui init`) generates a `Thread`
  component with all primitives composed; rewriting the styling there
  is faster than building from primitives manually.
- Groq model: `llama-3.3-70b-versatile` is a reasonable default for v1.
- System prompt should explicitly tell the model not to invent specific
  prices or flight numbers (no Firecrawl data yet) — surface comparison
  sites and reasoning, not fake bookings.
