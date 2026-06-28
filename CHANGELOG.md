# Changelog

All notable changes to TankBook are documented here.

---

## [0.6.1] — 2026-06-28

### Fixed
- Planned and removed inhabitants are now excluded from all dashboard counts (fish, species, sidebar totals).
- Maintenance tasks due today no longer appear as overdue in the dashboard sidebar count.
- Feeding plan is now only editable on inhabitants with status "Added" — planned inhabitants no longer show the option.
- Carer's guide no longer auto-opens the print dialog; a print button is shown at the bottom of the guide instead.
- `.env.example` corrected — `DATABASE_URL` removed as Docker Compose constructs it automatically from `DB_USER` and `DB_PASSWORD`.

### Improvements
- Dashboard stats moved from a right-hand sidebar to a row of cards at the top, below the page title.
- Tank cards on the dashboard now show 2 per row.
- Filter badge added to dashboard tank cards when `filter_flow_lph` is set, matching the existing Heater and CO₂ badges.
- Daily tab replaced: the 7-day/24-hour grid is gone. Today's tasks are shown as a simple list; other scheduled tasks appear in a separate section below.
- Feeding plan moved from the daily tab to each inhabitant card — click the utensil icon to set food types and feeds per day without opening the full edit form.
- Docker image now builds for both `linux/amd64` and `linux/arm64` (Raspberry Pi support).
- GitHub issue templates added for bug reports and feature requests.
- Configurable App URL setting added — set your instance's IP/hostname so species YAML shared links use the correct address instead of `localhost`.

---

## [0.6.0] — 2026-06-27

### Features
- **API test strip colour picker** — Flask button on each water parameter input opens a colour-swatch modal matching the API Master Test Kit or API 5-in-1 Test Strip; selecting a swatch fills the value automatically. GH/KH values from the 5-in-1 strip are converted from ppm to dGH/dKH on selection.
- **Livestock feeding details** — Food types (free text) and feeding frequency (times per day) can now be stored against each inhabitant entry.
- **Configurable alert retention** — New setting to auto-delete acknowledged alerts older than 7 / 14 / 30 / 90 days / 1 year, or keep them indefinitely. Individual alert deletion also added. Alert checker now deduplicates per-species alerts and skips non-active inhabitants.
- **Quick Add button** — Global `+` button in the navbar opens a modal for quickly adding a tank, logging water parameters, or recording an expense without navigating to a specific page.

### Fixed
- Maintenance tasks due today no longer show as overdue — a "Due today" badge is displayed instead, in amber. Only genuinely past-due tasks show the red "Overdue" badge.

---

## [0.5.0] — 2026-06-18

Initial tracked release.

### Features
- **Dashboard** — Tank grid with drag-and-drop reordering; stats sidebar; heater and CO2 indicator badges; redesigned tank cards; Add Tank as a dashed card inline with the grid.
- **Tank detail** — Inhabitants tab supporting fish, invertebrates, and amphibians with planned / added / removed status tracking; add and edit forms in modals; gallery tab with photo capture.
- **Water parameters** — Log pH, temperature, ammonia, nitrite, nitrate, GH, KH, and (for saltwater/brackish tanks) salinity and specific gravity; trend charts per parameter.
- **Multi-tank-type support** — Tanks can be freshwater, saltwater, or brackish; saltwater parameters shown only when relevant.
- **Tank Journal** — Rich journal with expanded event types (water change, equipment, treatment, observation, and more); rich text formatting; modal add form; inline edit; filterable by event type.
- **Species catalogue** — Browse and search species with image lightbox showing larger iNaturalist photos; type filter with count badges; compatibility checker.
- **Calculators** — Tank volume calculator; API Chemical Dosage calculator covering 13+ API products with dose, schedule, and safety notes.
- **Spending tracker** — Log purchases by category, link to a tank, add notes; improved date input and delete confirmation.
- **Settings** — Date format, unit system, default tank, app version display, and GitHub update check.
- **Mobile nav** — Collapsible burger menu; tab bar shows icons only on mobile, icons + labels on desktop.
- **Docker** — Production-ready `docker-compose.yml`; GitHub Actions workflow for Docker image build and publish.
