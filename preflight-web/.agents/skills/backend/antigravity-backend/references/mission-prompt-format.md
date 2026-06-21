# Backend Mission Prompt Format — Antigravity

Backend mission prompts must give the Antigravity agent everything it needs to write files, run terminal commands, and self-verify — without asking you mid-task.

Use **Plan mode** for: new services, auth systems, multi-model schema design, event pipelines.
Use **Fast mode** for: adding an endpoint, writing a migration, adding a cache layer, fixing a bug.

---

## Full Template

```
MODE: [Plan | Fast]
STACK: [Node.js/TypeScript + Express/Fastify | Python/FastAPI | Python/Django]
DOMAIN: [API | Auth | Database | Architecture | Mixed]

## Mission
[One sentence: what service/feature/endpoint you're building and why]

## Tech Stack Details
- Runtime: Node.js 20 | Python 3.12
- Framework: Express 4 / Fastify 4 | FastAPI 0.110+
- ORM/ODM: Prisma (PG) + Mongoose (Mongo) | SQLAlchemy 2.0 async + Motor
- Validation: Zod | Pydantic v2
- Auth: jsonwebtoken + bcryptjs | python-jose + passlib
- Task queue: BullMQ (Redis-backed) — if applicable

## Data Stores in Use
- PostgreSQL — [what it stores]
- MongoDB — [what it stores]
- Firebase — [what it stores / why]
- Redis — [cache keys, session, queue]
- Kafka — [topics produced/consumed]
(omit stores not used in this task)

## Directory Structure
[Full tree of files the agent should create]

## Endpoints / Features to Implement

### [Feature / Endpoint Name]
- Method + Path: POST /api/v1/auth/login
- Auth required: No | Yes (role: student | instructor | admin)
- Request body: [field: type, required/optional, validation rules]
- Response (200): [shape]
- Errors: [400 ValidationError, 401 AuthError, 404 NotFound, etc.]
- Side effects: [publishes event, sends email, invalidates cache]
- Rate limited: Yes — 10 req / 15 min | No

## Schema / Data Model
[If creating or modifying DB schemas — Prisma schema or SQLAlchemy model]

## Environment Variables Required
[List every env var this feature needs — include in .env.example]

## Terminal Boot Sequence
[Commands the agent runs after writing files]
Example:
  npm install
  npx prisma migrate dev --name [migration-name]
  npm run dev

## Seed Data (if applicable)
[Any test data the agent should create for browser verification]

## VERIFY IN BROWSER / TERMINAL
- [ ] POST /api/v1/auth/login with valid credentials returns 200 + tokens
- [ ] POST /api/v1/auth/login with wrong password returns 401
- [ ] GET /api/v1/users without token returns 401
- [ ] Rate limit: 11th request to /auth/login returns 429
- [ ] [any other specific check]
```

---

## Example — Compact Single Endpoint

```
MODE: Fast
STACK: Node.js/TypeScript + Express
DOMAIN: API

## Mission
Add a paginated GET /api/v1/courses endpoint that returns published courses
with instructor name and enrollment count.

## Tech Stack Details
- Express + TypeScript, Prisma (PostgreSQL), Zod for query params

## Endpoints

### GET /api/v1/courses
- Auth required: No
- Query params: page (int, default 1), limit (int, default 20, max 100),
  search (string, optional), status (enum: published|draft, default: published)
- Response (200):
  { success: true, data: Course[], meta: { page, limit, total, hasNext } }
- Course shape: { id, title, slug, instructor: { id, name }, enrollmentCount, createdAt }
- Errors: 400 if invalid query params

## VERIFY IN BROWSER
- [ ] GET /api/v1/courses returns array with instructor and enrollmentCount
- [ ] GET /api/v1/courses?page=2&limit=5 returns correct slice
- [ ] GET /api/v1/courses?search=python returns filtered results
- [ ] GET /api/v1/courses?limit=999 returns 400
```

---

## Example — Full Service (Plan Mode)

```
MODE: Plan
STACK: Node.js/TypeScript + Express
DOMAIN: Mixed (Auth + API + DB)

## Mission
Build a complete user authentication service: register, login, refresh token,
logout, and /me endpoint. JWT access + refresh token pair, bcrypt passwords,
refresh token rotation with Redis revocation list.

## Tech Stack Details
- Express 4, TypeScript strict, Prisma (PostgreSQL), Redis, Zod, jsonwebtoken, bcryptjs, uuid

## Data Stores
- PostgreSQL — users table (id, email, passwordHash, role, createdAt)
- Redis — refresh token revocation list (key: revoked:{jti}, TTL: 7 days)

## Directory Structure
src/
  routes/auth.routes.ts
  controllers/auth.controller.ts
  services/auth.service.ts
  repositories/user.repository.ts
  middleware/authenticate.ts
  middleware/authorize.ts
  middleware/validate.ts
  middleware/error-handler.ts
  schemas/auth.schema.ts
  utils/jwt.ts
  utils/password.ts
  errors/index.ts
  config/env.ts
  lib/prisma.ts
  lib/redis.ts
  app.ts
  server.ts
prisma/
  schema.prisma
  migrations/
.env.example

## Endpoints
[... per the full template above ...]

## Environment Variables
JWT_ACCESS_SECRET, JWT_REFRESH_SECRET, DATABASE_URL, REDIS_URL, PORT

## Terminal Boot Sequence
npm install
npx prisma migrate dev --name init_users
npm run dev

## VERIFY IN BROWSER
- [ ] POST /api/v1/auth/register creates user, returns 201 + tokens
- [ ] POST /api/v1/auth/register with duplicate email returns 409
- [ ] POST /api/v1/auth/login with correct creds returns 200 + token pair
- [ ] POST /api/v1/auth/login with wrong password returns 401
- [ ] POST /api/v1/auth/refresh with valid refresh token returns new token pair
- [ ] POST /api/v1/auth/refresh with same token twice returns 401 (rotation)
- [ ] GET /api/v1/auth/me with valid access token returns user
- [ ] GET /api/v1/auth/me without token returns 401
- [ ] POST /api/v1/auth/login 11x in 15 min returns 429
```

---

## Tips for Writing Backend Mission Prompts

- **Specify every error case.** If you don't, the agent will only handle the happy path.
- **Paste the env template.** Agents don't know your variable names — spell them out.
- **Include the boot sequence.** The agent will run it and verify the server starts.
- **Make verification steps binary.** "Returns 201" is checkable. "Works correctly" is not.
- **State the migration name.** Helps the agent generate meaningful migration file names.
