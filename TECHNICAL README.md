# Aqua Log — application root

This directory contains the full Aqua Log application stack.

For setup instructions, feature overview, and developer documentation see the **[root README](../README.md)**.

## Stack

- **Backend**: FastAPI + SQLAlchemy + Alembic (Python 3.12)
- **Database**: PostgreSQL 16
- **Frontend**: React 18 + TypeScript + Vite
- **Species data**: YAML files — kept as a **local copy only**, not tracked in git

## Quick start

```bash
cp .env.example .env          # set DB credentials
docker compose up --build -d  # build and start all services

# Frontend  →  http://localhost:3000
# API docs  →  http://localhost:8000/docs
```

## Directory layout

```
aquabase/
├── docker-compose.yml       # development
├── docker-compose.prod.yml  # production (pre-built images from ghcr.io)
├── backend/
│   ├── app/
│   │   ├── main.py
│   │   ├── models/
│   │   ├── schemas/
│   │   ├── routers/
│   │   └── services/
│   └── alembic/
├── frontend/
│   └── src/
│       ├── api/
│       ├── components/
│       ├── context/
│       ├── hooks/
│       └── pages/
└── species-data/            # local YAML files — not tracked in git
```
