# Changelog

All notable changes to TankBook are documented here.

---

## [1.0.0] — 2026-09-02

TankBook's first stable release — no longer a single-user tool. See [RELEASE-NOTES-1.0.0.md](RELEASE-NOTES-1.0.0.md) for the full writeup.

### Features
- Multi-user accounts (local or OIDC SSO) with tiered permissions across five categories: AI assistant, general settings, user management, species catalogue, and tank creation.
- Per-tank ownership with view/edit collaborator sharing, enforced on both frontend and backend.
- Household groups — assign a tank, expense, inventory item, room, or tap water reading to a group so every member gets access, without one-to-one sharing.
- AI assistant: global chat widget backed by Anthropic, OpenAI, or a local Ollama model; can draft starting-point species entries.
- Configurable dashboard: per-slot stat cards (9 available stats), per-user section visibility, redesigned tank cards with an in-range status ring.
- Quarantine / Disease case tracking in the Tank Journal.
- Web Push notifications for due maintenance tasks.
- Selective backup export/import by category.
- Round/cylinder tank shape.
- Expense quantity, with totals as amount × quantity.

### Security
- Three internal audit passes: tightened default permissions and login brute-force protection; fixed an SSRF opportunity and a path traversal vector; scoped AI conversations and room data to their owning user; closed a DNS-rebinding bypass of the SSRF guard, a species-slug path traversal, missing rate limiting on password changes, and several outdated dependencies with known CVEs (including the OIDC library).
- Added upload size limits (10MB images, 1MB species YAML) — previously unbounded.

### Fixed
- `default_tank_id` moved from a shared setting to a per-user preference.
- Dashboard edit-mode visibility toggles, mobile Users table overflow, tank reorder controls, and AI widget overlap with the navbar/footer.
- Navbar collapse breakpoint raised from 1280px to 1650px so all 9 links fit without wrapping.
- Tank Detail's "Weekly Tasks Due Today" alert now appears above the inhabitant counts instead of below them (#12).

### Improvements
- Maintenance tasks gained a Postpone option.
- Built-in OIDC setup help; logout moved to a more consistent spot in mobile navigation.
- Desktop parameter charts now paginate (6 readings per page), matching mobile.
- Ammonia field's test-strip tab now points at API's dedicated Ammonia Test Strips chart.
- Species YAML download no longer requires a login.

---

## [0.7.2] — 2026-08-29

### Improvements
- Tank parameter graphs on mobile now show 3 readings at a time, with Older/Newer paging controls to browse the full history instead of showing every point crushed together.
- A species with inhabitants in more than one status (e.g. Added and Planned) now shows as separate lines instead of one crowded row, and collapses back to one line once every entry shares a status again.
- Added a species info button to the Inhabitants and Plants tabs, reusing the same detail view as the Species Browser.
- Edit/Remove controls on the Inhabitants and Plants tabs are now icon-only, with mobile rows showing name/status stacked above full-width action buttons.
- Species Browser's search bar and category filters redesigned for mobile: full-width search bar, filters split into two even rows.
- Tank Journal's tank selector restyled to match the app's dropdown menu (used elsewhere for tab navigation) instead of a plain browser select.
- Calculators page selector is full-width with cycle arrows on mobile; the Volume calculator's Tank Shape buttons are now equal width.
- Spending page's filter dropdowns restyled to match the app's dropdown component and given equal widths.
- Inventory's category selector shows as a dropdown at the top of the page on mobile, instead of a list rendering below the items.
- Navbar Quick Add button now uses the app's blue accent styling instead of a faint gray outline.
- Dashboard's Upcoming Tasks now shows a "Due today" tag, matching the tank Weekly tab.

### Fixed
- Assigning a tank to a room, and reordering tank cards on the dashboard, now work on touch devices — both were previously drag-and-drop only with no touch equivalent.
- Species Detail modal's footer no longer overflows off the edge of the modal on narrow screens.
- Edit Inhabitant modal's Health Status field no longer squeezes into a third column alongside Quantity and Status on mobile.
- Daily Task rows now stack onto two lines on mobile instead of squeezing time, name, days, and actions into one row.
- Enlarged several tap targets that were well under a comfortable touch-target size, across the Room, Species, and Journal pages and the notes formatting toolbar.
- Dashboard's Upcoming Tasks no longer excludes tasks due earlier today — it compared against the exact current time rather than the start of the day.
- Removed a duplicate divider that appeared under the last row on the Plants tab and the Alerts tab.

---

## [0.7.1] — 2026-08-28

### Fixed
- Restoring a backup containing a completed recurring maintenance task no longer crashes with a 500 error.
- Backup export/import now includes feeding amount, plant status, and feeding amount presets — previously silently dropped on restore.
- Dragging a tank within a room's map no longer lets it overlap the room's edges — the drag boundary now accounts for each tank's actual footprint.
- Fixed several mobile layout issues: an orphaned stat card at iPad widths on the Dashboard, cramped Species page action buttons, an overflowing category filter on the Tank Journal, and broken/overlapping layouts on the Spending and Inventory pages.

### Improvements
- Room layouts moved from browser localStorage to the database, so they persist across devices and are included in backup/restore.
- Fish Rooms reworked into a room list plus a per-room detail page, with a Create Room modal for setting name and size up front.
- Tanks placed in a room now have a quick link to their tank detail page, which shows a "Back to room" button when opened this way.
- Room dimensions now use "Width"/"Length" wording instead of "Width"/"Depth", matching how rooms — not aquariums — are normally described.
- Settings page reorganised: backup export/import combined into one section with a confirmation step before restoring, Feeding Amounts presets reordered, and a new Reset to Defaults button.
- New Local Storage section on Settings shows on-disk storage used, species catalogue size, and gallery image count.

---

## [0.7.0] — 2026-08-27

### Features
- **Room layouts** — Create rooms, assign tanks, configure room dimensions, and position tanks on a persistent 2D top-down map.
- **Recurring task start dates** — Choose the first due date for a recurring maintenance task while retaining its recurrence schedule.
- **Completed task date editing** — Correct the completion date for finished maintenance tasks from the tank detail schedule.

### Fixed
- Inhabitant records for the same species are merged when they share a status, including when a group changes status.
- Rooms are now available from the main navigation at `/rooms`.

### Improvements
- Settings are presented in one large, single-column card.
- Inhabitants with mixed statuses show one combined species row with status totals.

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
