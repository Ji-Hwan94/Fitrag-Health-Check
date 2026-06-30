# FitRAG Project Instructions

## Source Of Truth

- Before coding, refactoring, reviewing, or answering product/implementation questions, first consult the local documentation for `FitRAG Coach` under `doc/product` and the child documents under `doc/product/children/`.
- Treat the requirements in `doc/product/FitRAG Coach` and `doc/product/children/` as the primary source of truth for this project.
- Code changes, refactors, and answers should be based on the requirements defined in those documents.
- If a user request conflicts with those requirements, explain the conflict clearly and ask the user to confirm how to proceed before making the conflicting change.

## Project Layout

- `fitrag_front`: Next.js frontend.
- `fitrag_end`: NestJS backend API.
- Local Supabase configuration and migrations live under `fitrag_front/supabase`.

## Local Runtime

- Frontend runs on port `3000`.
- Backend runs on port `4000` with global prefix `/api/v1`.
- Local Supabase/PostgreSQL runs through Docker.
- The backend local DB connection is:

```env
DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:54322/postgres
```

## Supabase And Docker

- Docker is needed only for the local Supabase stack.
- Local Supabase is not a bridge to cloud Supabase. It is a local set of containers running PostgreSQL and related Supabase services.
- Cloud Supabase does not require Docker; use a cloud `DATABASE_URL` in `fitrag_end/.env` instead.
- To start local Supabase:

```powershell
cd fitrag_front
npm run supabase -- start
```

- To check local Supabase:

```powershell
npm run supabase -- status
```

- Supabase Studio is available at:

```text
http://127.0.0.1:54323
```

## Viewing User Data

- In Supabase Studio:
  - `public.users` stores signup account rows.
  - `public.health_profiles` stores FR-001 profile rows.

- From Docker/Postgres:

```powershell
docker exec -it supabase_db_fitrag_front psql -U postgres -d postgres -c "select id, email, name, created_at from public.users order by created_at desc;"
docker exec -it supabase_db_fitrag_front psql -U postgres -d postgres -c "select user_id, gender, age, height_cm, weight_kg, bmi, activity_level, injuries, allergies, dietary_restrictions from public.health_profiles order by created_at desc;"
```

## Common Errors

- `connect ECONNREFUSED 127.0.0.1:54322` means the local Supabase/PostgreSQL container is not running or the backend is pointing at the wrong DB.
- `address already in use :::4000` means another backend process is already listening on port `4000`.
- Browser CORS/private-network errors can happen if the frontend is opened through an external IP but the API URL points to `127.0.0.1`. In that case, use the same host for frontend and backend, e.g. `http://222.106.30.86:3000` calling `http://222.106.30.86:4000/api/v1`.

## Verification

- Frontend:

```powershell
cd fitrag_front
npm run lint
npm run build
```

- Backend:

```powershell
cd fitrag_end
npm run build
```

- Backend health check:

```powershell
Invoke-WebRequest http://127.0.0.1:4000/api/v1/health
```

## Notes For Codex

- Prefer using the existing local Supabase stack before changing `DATABASE_URL`.
- Do not remove Docker containers or volumes unless the user explicitly agrees; user data may be inside local volumes.
- If local Supabase is missing, try `npm run supabase -- start` from `fitrag_front`.
- If the user wants cloud Supabase, update `fitrag_end/.env` instead of using Docker.
