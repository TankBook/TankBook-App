<p align="center">
  <img src="aqua-log/frontend/public/favicon.svg" width="80" alt="Aqua Log logo" />
</p>

<h1 align="center">Aqua Log</h1>

<p align="center">
  A self-hosted aquarium management application.<br/>
  Track tanks, livestock, water parameters, maintenance schedules, and more.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Python-3.12-3776AB?style=flat-square&logo=python&logoColor=white" alt="Python 3.12" />
  <img src="https://img.shields.io/badge/FastAPI-009688?style=flat-square&logo=fastapi&logoColor=white" alt="FastAPI" />
  <img src="https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react&logoColor=black" alt="React 18" />
  <img src="https://img.shields.io/badge/TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/PostgreSQL-16-4169E1?style=flat-square&logo=postgresql&logoColor=white" alt="PostgreSQL 16" />
  <img src="https://img.shields.io/badge/Docker-Compose-2496ED?style=flat-square&logo=docker&logoColor=white" alt="Docker Compose" />
  <img src="https://img.shields.io/badge/self--hosted-brightgreen?style=flat-square" alt="Self-hosted" />
</p>

---

## Features

| Page | Description |
|---|---|
| **Dashboard** | Overview of all tanks with live parameter readings, alerts, and upcoming tasks |
| **Tank detail** | Per-tank view with livestock, plants, water parameters, maintenance schedule, daily tasks, and alerts |
| **Species** | Searchable catalogue of fish, invertebrates, amphibians, and plants with care data; add and edit entries via the built-in form |
| **Compatibility checker** | Build a stocklist and instantly see conflicts, temperament warnings, and water parameter overlaps |
| **Livestock journal** | Per-tank event log — observations, illness, treatments, births, deaths, and more |
| **Tank designer** | Grid-based layout tool for planning scape and hardscape placement |
| **Settings** | Date format, unit system, and full data backup / restore |

---

## Quick start

### Docker Compose (recommended)

```bash
# 1. Enter the application directory
cd aqua-log

# 2. Copy the example env file and set your database credentials
cp .env.example .env

# 3. Build and start everything
docker compose up --build -d

# Frontend  →  http://localhost:3000
# API docs  →  http://localhost:8000/docs
```

The backend applies all database migrations automatically on startup.

### Using dev.sh

`dev.sh` in the repo root is a helper for common development tasks:

```bash
./dev.sh                        # rebuild and restart all services
./dev.sh backend                # rebuild and restart only the backend
./dev.sh frontend               # rebuild and restart only the frontend
./dev.sh logs                   # tail logs for all services
./dev.sh logs backend           # tail logs for one service
./dev.sh upgrade                # apply pending Alembic migrations
./dev.sh migrate "description"  # generate a new migration
./dev.sh shell backend          # open a shell in a running container
./dev.sh psql                   # open a psql shell on the database
./dev.sh reset                  # wipe the database volume and rebuild (destructive)
```

### Local development (without Docker)

**Backend:**
```bash
cd aqua-log/backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt

export DATABASE_URL=postgresql://aqua_log:changeme@localhost/aqua_log
export SPECIES_DATA_PATH=../species-data

alembic upgrade head
uvicorn app.main:app --reload
```

**Frontend:**
```bash
cd aqua-log/frontend
npm install
npm run dev    # http://localhost:5173
```

---

## Species data

Species data lives in YAML files under `aqua-log/species-data/` and is kept as a **local copy only** — it is not tracked in git. The backend loads all YAML files on startup recursively, so the directory structure is flexible.

### Directory layout

```
species-data/
├── fish/
├── invertebrates/
├── amphibians/
└── plants/
```

### Adding a species

1. Copy the `_TEMPLATE.yaml` from the relevant directory.
2. Fill in the required fields: `slug`, `common_name`, `latin_name`, `type`.
3. Save the file as `<latin-name-hyphenated>.yaml` in the correct subdirectory.
4. Restart the backend to pick it up:
   ```bash
   ./dev.sh backend
   ```

> The `slug` must match the filename (without `.yaml`) and must **never change** once a species has been added to a tank — it is used as a stable identifier in the database.

### Supported types

| Type | Directory |
|---|---|
| `fish` | `species-data/fish/` |
| `invertebrate` | `species-data/invertebrates/` |
| `amphibian` | `species-data/amphibians/` |
| `plant` | `species-data/plants/` |

---

## Database migrations

Alembic manages all schema changes. **Never** drop and recreate tables on a database with real data — always write a migration instead.

### Making a schema change

```bash
# 1. Edit aqua-log/backend/app/models/models.py

# 2. Generate a migration
./dev.sh migrate "describe what changed"

# 3. Review the generated file in aqua-log/backend/alembic/versions/

# 4. Apply it
./dev.sh upgrade
```

### Rolling back one step

```bash
docker compose -f aqua-log/docker-compose.yml exec backend alembic downgrade -1
```

### Checking state

```bash
docker compose -f aqua-log/docker-compose.yml exec backend alembic current
docker compose -f aqua-log/docker-compose.yml exec backend alembic history
```

> **Rule:** never edit a migration file after it has been applied anywhere. Write a new one instead, even for a typo. Commit migration files in the same commit as the model change.

---

## Data backup

The **Settings** page includes a Data backup section:

- **Export** — downloads a `aqua-log-backup-YYYY-MM-DD.json` file containing all tanks, livestock, water parameters, maintenance tasks, journal entries, and app settings.
- **Import** — restores from a backup file. Requires two-step confirmation as it **replaces all current data**.

---

## Project structure

```
Aqua-Log/
├── dev.sh                         # Development helper script
└── aqua-log/
    ├── docker-compose.yml
    ├── .env.example
    ├── backend/
    │   ├── app/
    │   │   ├── main.py            # FastAPI app entry point
    │   │   ├── database.py        # SQLAlchemy engine and session
    │   │   ├── models/            # ORM models
    │   │   ├── schemas/           # Pydantic request/response schemas
    │   │   ├── routers/           # API route handlers
    │   │   └── services/          # Species loader, alert checker
    │   └── alembic/               # Database migrations
    ├── frontend/
    │   └── src/
    │       ├── api/               # Typed fetch client
    │       ├── components/        # Shared UI components
    │       ├── context/           # Settings context (date format, units, theme)
    │       ├── hooks/             # Data-fetching hooks
    │       └── pages/             # One file per page
    └── species-data/              # Local YAML files — not tracked in git
```
