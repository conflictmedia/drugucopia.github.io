# Changelog

## [0.3.9] - 2026-07-18

### Changed
- Alcohol in grams in dose history shows equivalence in 40%ABV shots

## [0.3.8] - 2026-07-18

### Changed
- Inputting shots/drinks in dose logger for alcohol now automatically converts it into grams.

## [0.3.7] - 2026-07-15

### Added
- Benzo equiv calculator UI enhancements (Interactive table highlighting, Preset Dose chips, interactive swap control, direct dose logging)
- Alcohol calc UI enhancements (Visual drink presets, direct ethanol dose logging)
- Interaction checker safety and risk filtering (one tap logging, animated hazard visuals, severity filter
- Substance detail view navigation (sticky nav bar)
- Custom Substances Sync
- Medication Profile Sync


### Changed
- Replaced hardcoded tailwait utilites with daisyui design tokens
- Badge and background colors now automatically adapt across the 14 themes

## [0.3.6] - 2026-07-15

### Fixed
- Fix estimated duration badge on custom substances with duration data

## [0.3.5] - 2026-07-14

### Fixed
- No more flicker when browsing substance pages from Library

## [0.3.4] - 2026-07-14

### Added
- Alcohol Calculator standalone
- Alcohol Calculator in the dose logger modal (drinks -> grams)


## [0.3.3] - 2026-07-14

### Added
- Button to go to the android app github


## [0.3.2] - 2026-07-13

### Fixed
- Custom Substances are now visible in the logger modal
- Medications are now visible in the logger modal


## [0.3.1] - 2026-07-13

### Fixed
- Recent substances in the dose logger modal now correctly update.

## [0.3.0] - 2026-07-13

### Added
- Test Suite
- Custom Substances Enhancement
- Medication Checker
- Benzodiazapine Equivalence Calculator
- Onboarding Tour

## [0.2.5] - 2026-07-12

### Fixed
- Changelog popup not working

## [0.2.4] - 2026-07-12

### Fixed
- changelog popup maybe?

## [0.2.3] - 2026-07-12

### Fixed
- Actually fix the markdown for the changelog this time

## [0.2.2] - 2026-07-12

### Fixed
- Fixed markdown for the changelog

## [0.2.1] - 2026-07-12

### Added
- Changelog, and changelog popup.

## [0.2.0] - 2026-XX-XX

### Added
- Kratom Extract Calculator with leaf powder ↔ extract conversion, dose-tier warnings, test-dose recommendation, enhanced-extract flag, redose planner, and one-click logging
- DXM Plateau Calculator with weight-based dosing, sigma/dextrorphan ratio, and redose planner
- Harm Reduction Hub: emergency contacts, 12 principles, 20+ searchable guides, 40+ dangerous interactions, curated external resources, substance-specific deep links
- Analytics dashboard: daily/weekly/monthly charts, substance/category breakdowns, streak tracking, heuristic tolerance estimation, 7d/30d/90d/1y range selector
- PWA/offline support: service worker caching, web app manifest, full offline functionality after first visit
- Substance library: 277 substances across 10 categories with detailed pages (effects, dosage, duration, onset/peak/offset, harm reduction, interactions, chemical class, aliases)
- Interaction checker: pairwise checking with severity levels, cross-tolerance info, single-substance mode, quick-combo buttons, shareable URLs
- Dose Logger (Track): local-first logging (localStorage + IndexedDB via Dexie), session timeline with live intensity estimates, history with edit/delete/CSV export, reminder engine (one-off, interval, redose), sync conflict resolution UI
- Fuzzy search across library (name, aliases, class, description) with deep linking via `?substance=<id>`

### Changed
- Migrated to Next.js 15 App Router with static export
- Updated to React 19, Tailwind CSS 4, daisyUI 5
- Switched to Bun for package management

### Fixed
- Service worker registration for GitHub Pages deployment
- TypeScript strict mode compliance across codebase

## [0.1.0] - 2026-XX-XX

### Added
- Initial release of Drugucopia
- Substance library with core dataset
- Basic interaction checker
- Dose logging with localStorage
- Harm reduction guides and resources
- Deployment to GitHub Pages via GitHub Actions
