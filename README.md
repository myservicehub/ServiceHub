# ServiceHub Codebase Overview

## Backend

The backend is built with FastAPI and Motor (MongoDB). It exposes endpoints under `/api` and includes authentication, jobs, interests, wallet, reviews, messaging, and admin routes.

### Performance: Caching Statistics with Redis

Home page statistics can be cached to avoid timeouts and reduce database load. Caching is optional and enabled by default with a safe in-memory fallback.

- Enable Redis by setting `REDIS_URL` (e.g., `redis://localhost:6379/0`).
- Control caching with environment variables:
  - `CACHE_ENABLED` (default `true`)
  - `STATS_CACHE_TTL_SEC` (default `60`)
  - `STATS_CATEGORIES_CACHE_TTL_SEC` (default `300`)

When Redis is not available or not installed, the server uses an in-memory TTL cache transparently.

Endpoints affected:

- `GET /api/stats` — cached with `STATS_CACHE_TTL_SEC`
- `GET /api/stats/categories` — cached with `STATS_CATEGORIES_CACHE_TTL_SEC`

No code changes are required to switch between Redis and in-memory caching; configuration is handled via environment variables.

## Frontend

React (Create React App) frontend in `GGospelGT/frontend`.

- `REACT_APP_BACKEND_URL` to point to the backend (defaults to `http://localhost:8001` in localhost).