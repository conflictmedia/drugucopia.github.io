# Drugucopia

Substance library, interaction checker, and dose logger for harm reduction. Built with Next.js, deployed to GitHub Pages.

## Features

### Substance Library
- **304 substances** across 10 categories: stimulants, depressants, hallucinogens, dissociatives, empathogens, opioids, cannabinoids, deliriants, nootropics, and others
- Detailed pages per substance: effects, dosage ranges (per route), duration, onset/peak/offset, harm reduction tips, dangerous interactions, chemical class, common names
- Category filtering, fuzzy search (name, aliases, class, description), deep linking via `?substance=<id>`

### Interaction Checker
- Pairwise interaction checking with severity levels (fatal, high, moderate)
- Cross-tolerance information
- Single-substance mode shows all known interactions for that substance
- Quick-combo buttons for common dangerous pairs (alcohol + MDMA, benzos + alcohol, etc.)
- Shareable URLs via `?substances=id1,id2`

### Dose Logger (Track)
- Local-first logging (localStorage + IndexedDB via Dexie)
- Session timeline with live intensity estimates per active dose
- History table with edit/delete, CSV export
- Reminder engine: one-off, interval, and redose reminders with notifications and sounds
- Sync conflict resolution UI for multi-device use

### Analytics
- Daily / weekly / monthly usage charts (Recharts)
- Substance and category breakdown (pie charts)
- Streak tracking: current/longest active streaks, rest-day streaks
- Heuristic tolerance estimation per substance (exponential decay model)
- Time-range selector: 7d, 30d, 90d, 1y

### Harm Reduction Hub
- Emergency contacts (international crisis lines, poison control)
- 12 quick-reference principles (start low, test substances, stay hydrated, etc.)
- 20+ searchable guides: overdose response, testing, hydration, serotonin syndrome, withdrawal, etc.
- 40+ documented dangerous interactions with risk ratings
- Curated external resources (TripSit, PsychonautWiki, Erowid, GetYourDrugsTested, etc.)
- Substance-specific deep link: `/harm-reduction/?substance=<id>` shows tailored tips + relevant dangerous combos

### Calculators
- **Kratom Extract Calculator**: converts between leaf powder (g) and extract (%, ratio, g/mg) with dose-tier warnings, test-dose recommendation, enhanced-extract flag, redose planner, one-click logging
- **DXM Calculator**: plateau-based dosing with weight input, sigma/dextrorphan ratio, redose planner

### PWA / Offline
- Service worker (Workbox) caches all static assets
- Web App Manifest for home-screen install
- Works fully offline after first visit — log doses at festivals, clinics, or anywhere without signal

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js 15 (App Router, `output: export`) |
| Language | TypeScript 5 |
| Styling | Tailwind CSS 4 + daisyUI 5 |
| State | Zustand (stores) + React Context |
| Charts | Recharts |
| Animations | Framer Motion |
| Database | Dexie.js (IndexedDB) + localStorage |
| Forms | React Hook Form + Zod |
| Search | Custom fuzzy search (no external deps) |
| Deployment | GitHub Pages (static export) |
| CI/CD | GitHub Actions |

## Screenshots

| Page | Preview |
|------|---------|
| Substance Library | <img width="1660" height="996" alt="library" src="https://github.com/drugucopia/drugucopia.github.io/blob/dev/docs/screenshots/library.png?raw=true" /> |
| Substance Detail | <img width="1660" height="996" alt="substance_detail" src="https://github.com/drugucopia/drugucopia.github.io/blob/dev/docs/screenshots/substance_detail.png?raw=true" /> |
| Interaction Checker | <img width="1660" height="996" alt="interactions" src="https://github.com/drugucopia/drugucopia.github.io/blob/dev/docs/screenshots/interaction_checker.png?raw=true" /> |
| Dose Logger – Session | <img width="1660" height="996" alt="session" src="https://github.com/drugucopia/drugucopia.github.io/blob/dev/docs/screenshots/session.png?raw=true" /> |
| Dose Logger – History | <img width="1660" height="996" alt="history" src="https://github.com/drugucopia/drugucopia.github.io/blob/dev/docs/screenshots/history.png?raw=true" /> |
| Analytics | <img width="1660" height="996" alt="analytics" src="https://github.com/drugucopia/drugucopia.github.io/blob/dev/docs/screenshots/analytics.png?raw=true" /> |
| Harm Reduction | <img width="1660" height="996" alt="harm_reduction" src="https://github.com/drugucopia/drugucopia.github.io/blob/dev/docs/screenshots/harm_reduction.png?raw=true" /> |
| Kratom Calculator | <img width="1660" height="996" alt="kratom_calc" src="https://github.com/drugucopia/drugucopia.github.io/blob/dev/docs/screenshots/kratom_calc.png?raw=true" /> |
| DXM Calculator | <img width="1660" height="996" alt="dxm_calc" src="https://github.com/drugucopia/drugucopia.github.io/blob/dev/docs/screenshots/dxm_calc.png?raw=true" /> |


## WIP Companion Android App
You can download this WIP app to get access to better Reminder notifications!

https://github.com/conflictmedia/drugucopia-app


## Getting Started

### Prerequisites
- Node.js 20+
- Bun (recommended) or npm/pnpm

### Install
```bash
git clone https://github.com/drugucopia/drugucopia.github.io.git
cd drugucopia.github.io
bun install
```

### Development
```bash
bun dev
# Runs at http://localhost:3000
```

### Build (static export)
```bash
bun run build
# Output in ./out/ — ready for GitHub Pages
```

### Preview production build locally
```bash
bun run start
# Serves ./out/ at http://localhost:3000
```

### Lint
```bash
bun run lint
```

## Project Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── page.tsx           # Substance library (home)
│   ├── interactions/      # Interaction checker
│   ├── dose-log/          # Track: logger, reminders, timeline
│   ├── analytics/         # Charts, streaks, tolerance
│   ├── harm-reduction/    # Guides, emergency, principles
│   ├── kratom-calculator/ # Kratom extract <-> leaf converter
│   └── dxm-calculator/    # DXM plateau calculator
├── components/
│   ├── home/              # Library hero, grid, detail tabs
│   ├── layout/            # Sidebar, top bar, navigation
│   ├── ui/                # Reusable UI primitives (Button, Card, etc.)
│   └── dose-timeline/     # Timeline chart components
├── lib/
│   ├── substances/        # 300+ substance definitions (per category)
│   ├── analytics.ts       # Chart data transforms, streak/tolerance math
│   ├── harm-reduction-data.ts # Guides, interactions, resources
│   ├── interaction-checker.ts # Pairwise + single-substance logic
│   ├── reminder-engine.ts # Notification scheduling
│   └── db.ts              # Dexie schema
├── store/                 # Zustand stores (doses, reminders, UI, visualizer)
├── hooks/                 # Shared React hooks
└── contexts/              # React context providers
```

## Data Sources

Substance data compiled from:
- **TripSit** – interaction combos, dosage ranges, categories
- **PsychonautWiki** – effects, duration, pharmacology, harm reduction
- **PubMed / primary literature** – pharmacokinetics, half-lives (for tolerance model)

All data is stored as TypeScript modules under `src/lib/substances/` for version control and type safety.

## Disclaimer

> **This application is for educational and harm reduction purposes only.**
> It is not medical advice and should not replace professional medical guidance.
> Drugucopia does not encourage or condone the use of illegal substances.
> Information is compiled from publicly available resources; while we strive for accuracy, we cannot guarantee completeness or correctness.
> Always consult qualified healthcare professionals for medical advice.
> If you or someone you know is experiencing a medical emergency, call your local emergency services immediately.

## Deployment

The site is a static export (`output: export`, `trailingSlash: true`) deployed to GitHub Pages via GitHub Actions.

### Required repository settings
- **Pages source**: GitHub Actions
- **Node version**: 20 (in workflow)
- **Base path**: empty (served at root) or set `NEXT_PUBLIC_BASE_PATH` for subdirectory deployments

### Environment variables
| Variable | Description | Default |
|----------|-------------|---------|
| `NEXT_PUBLIC_BASE_PATH` | Base path for subdirectory deploys | `""` |

No secrets or API keys required — fully client-side.

## Contributing

### Adding a new substance
1. Create a new file under `src/lib/substances/<category>/<id>.ts`
2. Follow the `Substance` type from `src/lib/substances/types.ts`
3. Include: `id`, `name`, `commonNames`, `categories`, `class`, `description`, `routeData` (dosage/duration per route), `harmReduction` (array of tips), `interactions` (TripSit combo IDs), `aliases` (optional)
4. Run `bun run build` to verify no type errors
5. Open a PR

### Fixing data
- Substance data: edit the corresponding file in `src/lib/substances/`
- Harm reduction guides: edit `src/lib/harm-reduction-data.ts`
- Dangerous interactions: edit `dangerousInteractions` in `src/lib/harm-reduction-data.ts`
- Interaction combos (TripSit): edit `src/lib/tripsit-combos.ts`

### Code style
- TypeScript strict mode, ESLint (Next.js config)
- daisyUI semantic colors only — no hard-coded hex in components
- Prefer server components where possible; `'use client'` only when needed
- Run `bun run lint` before committing

## License

MIT — see [LICENSE](LICENSE) for details.
