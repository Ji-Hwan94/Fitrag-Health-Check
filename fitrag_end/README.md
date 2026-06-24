# FitRAG Coach Backend

NestJS REST API for the FitRAG Coach MVP.

## Setup

```bash
npm install
cp .env.example .env
npm run start:dev
```

The API is served under `/api/v1`.

## Environment

- `DATABASE_URL`: PostgreSQL/Supabase connection string
- `JWT_SECRET`: JWT signing secret
- `PORT`: default `4000`
- `CORS_ORIGIN`: frontend origin, default `http://localhost:3000`

## Notes

The current database schema stores users, profiles, goals, plans, shopping items, RAG documents, and recommendation evidence. The backend keeps auth lightweight for MVP by issuing JWTs from `/auth/signup` and `/auth/login`; production Supabase Auth integration can replace this without changing downstream API contracts.
