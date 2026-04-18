# Wrapped — Universal Year-in-Review App
## SPEC.md — Source of Truth

---

## 1. Concept & Vision

**Wrapped** is a mobile-first app that delivers Spotify-Wrapped-style "year-in-review" stories for any connected app or service. It feels like unwrapping a gift — each tap reveals a bold new stat, surprise insight, or delightful comparison. The personality is confident, playful, and slightly irreverent. Stats are presented as achievements, not data dumps. The emotional beat is "you did cool things this year, here's proof."

---

## 2. Design Language

### Aesthetic Direction
Dark luxury meets data journalism. Think: Apple TV+ meets Bloomberg Terminal meets Spotify Wrapped 2024. Deep dark backgrounds with vivid gradient accents that shift per service. High contrast. Bold type. Generous whitespace.

### Color Palette
- **Background**: `#0A0A0F` (near-black with blue undertone)
- **Surface**: `#13131A` (cards, modals)
- **Border**: `#1E1E2E` (subtle dividers)
- **Primary Text**: `#FFFFFF`
- **Secondary Text**: `#8A8A9A`
- **Accent Gradient Start**: `#6C5CE7` (purple)
- **Accent Gradient End**: `#00D4FF` (cyan)
- **Spotify Green**: `#1DB954`
- **Danger/Revoke**: `#FF4757`

### Typography
- **Display/Headlines**: `Inter` 800 (ExtraBold) — big bold numbers and stat reveals
- **Body**: `Inter` 400/500
- **Mono/Data**: `JetBrains Mono` — for numbers, stats, codes
- **Scale**: 48px hero stats → 32px section heads → 16px body → 13px captions

### Spatial System
- 16px base unit
- Cards: 16px padding, 16px border-radius
- Section spacing: 48px
- Safe area respected on all sides

### Motion Philosophy
- **Story transitions**: Horizontal slide with spring physics (300ms, damping 0.8)
- **Stat reveals**: Count-up animation with overshoot easing
- **Card entrances**: Fade + scale from 0.95 → 1.0 (200ms ease-out)
- **Progress bar**: Linear fill with glow pulse on active card
- **Loading**: Rotating gradient ring (not a spinner)

### Visual Assets
- Service logos: Official brand icons (Spotify, Apple, Strava, etc.) — 48×48px
- Charts: Custom SVG — area charts, donut charts, bar charts
- Decorative: Subtle noise texture overlay on dark backgrounds
- Share cards: Template with gradient bg + stat + watermark

---

## 3. Layout & Structure

### Screen Flow
```
Splash → Onboarding (3 slides) → Service Picker → Connected Services Dashboard
  → [Connect Flow: OAuth → Loading → Done] → Wrapped Generator → Wrapped Story Player
  → End Screen → Share/Save
```

### Screens
1. **Splash** — Animated logo reveal, 1.5s max
2. **Onboarding** — 3 swipeable cards: "Connect any app", "Beautiful stories", "Privacy first"
3. **Service Picker** — Searchable grid of service cards with logos + connect button
4. **Dashboard** — List of connected services with status, last sync, revoke button
5. **Wrapped Builder** — Select services + date range → Generate
6. **Wrapped Player** — Full-screen vertical swipe story (Instagram Stories style)
7. **End Screen** — Summary, share CTA, save as PDF option

### Story Card Types
1. **Hero Stat** — Big number, unit, comparison text
2. **Top List** — Ranked 1–5 with icons
3. **Insight Card** — Witty AI copy + supporting data
4. **Chart Card** — Area/donut/bar chart
5. **Comparison Card** — "You vs. last year"
6. **Community Card** — Percentile rank ("top 5% worldwide")
7. **Share Card** — Screenshot-optimized, branded

### Responsive Strategy
- Mobile-first (375px baseline, max-width 428px centered on larger)
- Story cards fill viewport height
- Bottom sheet modals for actions
- No horizontal scroll except the story player

---

## 4. Features & Interactions

### Multi-Service OAuth Connect
- User taps a service card → OAuth popup/webview → callback → success animation
- Each service shows: name, logo, connection status, last synced date
- Revoke: swipe-to-reveal or long-press → confirmation modal
- On revoke: tokens deleted, local data purged immediately

### Data Processing
- On connect: fetch 12 months of data, strip raw identifiers, store aggregates only
- Processing happens server-side in ephemeral session
- Progress shown: "Fetching your Spotify data… 73%"
- User can cancel mid-fetch

### Wrapped Generation
- "Generate My Wrapped" button (disabled if no services connected)
- Select which connected services to include (checkboxes)
- Pick date range: "This Year" / "Last 6 Months" / "Custom"
- Loading screen: animated gradient ring + "Creating your story…"
- Generation: 10–20 cards auto-selected based on available data richness

### Story Player
- Full-screen, vertical swipe up/down between cards
- Progress dots at top (current card highlighted)
- Tap left/right: navigate within a card (charts scrub, numbers count up)
- Long-press: pause with blur overlay + "Paused" label
- Swipe up from bottom: reveal "Skip" and "Share this card" buttons
- Auto-advance: 5s per card (pauses on interaction)

### End Screen
- Summary of all connected services
- "Share All" — generates a carousel image strip for Stories
- "Save as PDF" — downloadable recap document
- "Start Over" / "Try next year"

### Service Support (MVP)
- **Spotify** — top artists, tracks, albums, minutes listened, top genre
- **Apple Health** — total steps, workouts, calories, active minutes, sleep
- **Strava** — total distance, activities, PRs, top sport
- **Goodreads** — books read, pages, top authors, genres
- **Steam** — games played, hours, achievements, top game

### Privacy Controls
- Each service shows: "We store only stats, never your raw data"
- Data retention toggle: "Save my year" (encrypted) vs "Auto-delete in 30 days"
- Revoke all button on dashboard
- Privacy policy link on every screen

---

## 5. Component Inventory

### ServiceCard
- States: disconnected, connecting, connected, error
- Shows: logo, name, status badge, last synced
- Actions: Connect (→ OAuth), Revoke (→ confirm)

### StoryCard (base)
- Full-screen, dark gradient background
- Animated number counter
- Bold headline, supporting text
- Card-type specific content slot

### TopListCard extends StoryCard
- Ranked list 1–5 with position number, icon/avatar, name, stat
- Entrance: staggered fade-in from rank 1→5

### ChartCard extends StoryCard
- SVG chart area (area/donut/bar)
- Animated draw-on entrance
- Touch to reveal data points

### InsightCard extends StoryCard
- AI-generated headline (large, centered)
- Supporting stat chips below

### CommunityCard extends StoryCard
- Big percentile badge ("Top 5%")
- Comparison bar (you vs average)

### ShareCard extends StoryCard
- Screenshot-optimized layout
- Gradient bg, service logo, stat, "Made with Wrapped" watermark
- "Share" button triggers native share sheet

### BottomSheet
- Drag handle at top
- Service list with checkboxes
- Date range selector
- Generate button

### ProgressBar
- Thin line at top of story player
- Gradient fill left-to-right
- Glows/pulses on active card

---

## 6. Technical Approach

### Frontend (React Native / Expo)
- Expo SDK 53 with `expo-router`
- `react-native-reanimated` for story swiping (SharedElement-like via gestures)
- `react-native-gesture-handler` for swipe detection
- `react-native-svg` for custom charts
- `expo-web-browser` for OAuth flow
- `expo-haptics` for tap feedback
- `@react-native-async-storage/async-storage` for local persistence
- Service worker + PWA manifest for installability

### Backend (Node.js / FastAPI / Supabase)
- **Supabase** for auth, database, ephemeral sessions
- **Supabase Edge Functions** for data fetching + anonymization
- Plugin architecture: each service = separate module
- Auth tokens stored encrypted (Supabase Vault)
- No raw user data persisted — only aggregated stats objects

### Service Plugin Schema
```typescript
interface ServicePlugin {
  id: string;                    // 'spotify' | 'apple_health' | ...
  name: string;
  logo: string;                  // URL
  oauthConfig: OAuth2Config;
  endpoints: Endpoint[];
  dataMapper: (raw: RawResponse) => ServiceStats;
  statTemplates: StatTemplate[]; // what cards this service can produce
}

interface ServiceStats {
  service: string;
  period: { start: Date; end: Date };
  aggregates: {
    top_items: { category: string; items: TopItem[] }[];
    totals: Record<string, number>;
    streaks: Record<string, number>;
    comparisons: { label: string; current: number; previous: number }[];
  };
}
```

### AI Insight Generation
- Use **Vercel AI SDK** + **OpenAI o4** for turning stats into witty copy
- Prompt template: "Given these stats for {service} over {period}, write 2-3 witty, relatable insight sentences in the voice of a cool friend. Max 30 words each."
- Cache generated insights per user+period+service hash

### Data Flow
```
OAuth Connect → Fetch raw data (ephemeral edge function)
             → Anonymize immediately (strip IDs, timestamps → day-precision only)
             → Store aggregates in user's stats table
             → Delete raw data
             → Return "connected" status
Generate Wrapped → Load aggregates from stats table
                → Select top N data-rich services
                → Call AI for insights
                → Render story cards (10–20)
                → Present player
```

### GDPR/CCPA
- No raw data stored
- Data deletion: user can revoke any service + delete all stats
- Export: user can download their aggregated stats as JSON
- Privacy policy at `/privacy`
- Cookie-less analytics (no tracking pixels)

### Deployment
- Frontend: Vercel (static PWA) or Expo EAS for native
- Backend: Supabase Edge Functions
- Domain: `wrapped.app` (placeholder)
