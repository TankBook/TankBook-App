# Changelog

All notable changes to TankBook are documented here.

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
