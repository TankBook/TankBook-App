# Stage 1: build the React frontend
# Always build this stage on the runner's own architecture, never emulated: the compiled
# output is plain static JS/CSS/HTML with no platform-specific code, so there's nothing to
# gain from (and a lot of build time to lose to) running npm install/build under QEMU for
# a non-native TARGETPLATFORM in a multi-arch build.
FROM --platform=$BUILDPLATFORM node:20-alpine AS frontend-builder
WORKDIR /build
COPY frontend/package*.json ./
RUN npm install
COPY frontend/ .
RUN npm run build

# Stage 2: Python backend + bundled frontend static files
FROM python:3.12-slim
WORKDIR /app

COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY backend/ .
COPY --from=frontend-builder /build/dist /app/static

CMD ["sh", "-c", "alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port 3000"]
