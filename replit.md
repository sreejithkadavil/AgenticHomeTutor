# Home Tutor

A curriculum-aware home tutor that turns school material into adaptive study sessions, persistent mastery, and spaced revision.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `lib/api-spec/openapi.yaml` — source of truth for frontend/backend contracts
- `lib/db/src/schema/learning.ts` — students, objectives, mastery, materials, revision, sessions, and attempts
- `artifacts/api-server/src/routes/tutor.ts` — dashboard and learning-loop API
- `artifacts/home-tutor/src/pages/` — parent dashboard, study, progress, materials, revision, and settings
- `artifacts/home-tutor/src/index.css` — product design tokens

## Architecture decisions

- Curriculum is modeled as data; the active seed is Phoenix Greens Grade 6 in its Cambridge Lower Secondary pathway, with French as L2 and Telugu as L3. The school does not publish an exact one-to-one Cambridge stage number for Grade 6.
- The detailed Grade 6 objectives are a tutor-ready baseline aligned to public Cambridge outlines. Parent-imported school syllabus content is higher-authority and should enrich or override that baseline.
- Tutor sessions select the weakest relevant objective, update mastery after every turn, and schedule revision separately.
- Source integrations are honest capability boundaries: sample material keeps the MVP usable, but Gmail is shown as disconnected until OAuth is authorized.
- Voice availability is explicit and must not be simulated when realtime voice is not connected.
- The current `demo-parent` ownership boundary is an MVP placeholder; production parent authentication must replace it before handling real minors' data.

## Product

- Parent dashboard with subject mastery, recent activity, revision due, and study time
- Child study flow with one-question-at-a-time hints, diagnosis, retesting, and mastery updates
- Curriculum-mapped school material library
- Objective-level progress and spaced-revision queue
- Student profile setup and source connection status

## User preferences

- Tighten the product and technical specification while building rather than blocking implementation on a separate specification phase.

## Gotchas

- Re-run API codegen after every OpenAPI change.
- Gmail OAuth was not authorized in the initial build; do not imply that live inbox sync is active.
- Realtime voice and production authentication remain connection work; keep their UI states truthful.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
