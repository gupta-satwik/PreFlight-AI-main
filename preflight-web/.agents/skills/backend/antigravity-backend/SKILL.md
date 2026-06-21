---
name: antigravity-backend
description: >
  Expert backend engineering skill for Google Antigravity — covering Node.js/TypeScript and
  Python (FastAPI/Django) stacks. Use this skill whenever the user wants to design, scaffold,
  review, or ship backend systems inside Antigravity. Triggers on any request involving: API
  design (REST, GraphQL, gRPC), authentication and authorization, database schema design,
  query optimization, system architecture, microservices, event-driven systems, caching strategy,
  or deployment patterns. Covers PostgreSQL, MongoDB, Firebase, Redis, and Kafka. Outputs
  Antigravity-optimised mission prompts, production-grade code scaffolds, and architecture
  decision records — or all three as needed. Always use this skill when the user says things
  like "build an API", "design a schema", "set up auth", "how should I structure this service",
  "review my backend", or asks about scalability, queuing, caching, or any database work.
---

# Antigravity Backend Principles Skill

You are designing and shipping production-grade backend systems inside **Google Antigravity**. Your outputs must be precise enough for the Antigravity agent to execute correctly on the first attempt — the agent reads your mission prompt, writes files, runs terminal commands, and verifies via its built-in browser. Ambiguity causes loops. Specificity wins.

---

## Antigravity-Specific Context

The Antigravity agent works across three surfaces:
- **Editor** — writes source files, config, migrations, tests
- **Terminal** — installs packages, runs migrations, starts dev server, seeds DB
- **Browser** — hits API endpoints, verifies responses, checks error handling

Backend missions must always include a **terminal boot sequence** and an **API verification checklist** so the agent can self-validate without asking you.

**Execution modes:**
- **Plan mode** — agent produces an architecture plan Artifact before writing code. Use for: new services, multi-model schema design, auth systems, event pipelines.
- **Fast mode** — agent executes immediately. Use for: adding a single endpoint, writing a migration, adding a cache layer to existing code.

---

## When to Produce What

| Request type | Output |
|---|---|
| "Build a service / API / backend" | Mission Prompt + scaffold code + env template |
| "Design a schema / data model" | Schema design + migration files + query patterns |
| "Set up auth" | Mission Prompt + auth architecture + code |
| "How should I structure X?" | Architecture Decision Record (ADR) + rationale |
| "Review my backend / find issues" | Audit report: anti-patterns, missing pieces, fixes |
| "Add caching / queuing / events" | Integration plan + code + config |
| Any combination | All as needed |

---

## Core Principles (Non-Negotiable)

These apply to every output regardless of stack or domain. The Antigravity agent must never generate code that violates these.

### 1. Separation of Concerns
- **Routes** only handle HTTP: parse input, call service, return response
- **Services** contain all business logic — no DB calls in route handlers
- **Repositories / DAL** own all database access — no raw queries in services
- **Models** are data definitions only — no business logic attached

```
src/
  routes/         ← HTTP layer only
  services/       ← business logic
  repositories/   ← DB access layer
  models/         ← type/schema definitions
  middleware/     ← cross-cutting concerns
  config/         ← env, constants
  utils/          ← pure helpers
```

### 2. Input Validation at the Boundary
Every inbound payload — HTTP body, query params, headers, event message — must be validated **before** it touches business logic. No exceptions.
- Node.js: Zod or Joi at route level
- Python: Pydantic models at FastAPI route level, Django serializers for DRF

### 3. Errors as First-Class Citizens
- Never let unhandled exceptions reach the client
- Typed error classes: `ValidationError`, `NotFoundError`, `AuthError`, `ConflictError`
- Central error handler middleware maps error types to HTTP status codes
- Errors must include: `code` (machine-readable), `message` (human-readable), `requestId`

### 4. Environment Config via `.env` — Never Hardcoded
- All secrets, connection strings, ports, feature flags → environment variables
- Provide `.env.example` with every service — never commit `.env`
- Validate env vars at startup; crash fast if required vars are missing

### 5. Async by Default
- Node.js: `async/await` everywhere; never mix callbacks
- Python: `async def` for FastAPI route handlers and service calls
- Database calls, external HTTP, file I/O — always awaited, never blocking

---

## Stack Decision Logic

When the user hasn't specified a stack, use this selector:

| Use case | Stack |
|---|---|
| Real-time features, event-driven, high I/O | Node.js + TypeScript |
| ML inference endpoints, data pipelines, admin tools | Python + FastAPI |
| CRUD-heavy platform with complex ORM needs | Python + Django |
| Edtech platform APIs, student/content services | Node.js + TypeScript (primary) |
| Mixed: some services each stack | Polyglot — document per-service choice |

State your stack choice and reason before generating any code.

---

## Domain Reference Files

Load the relevant file(s) before generating output for that domain:

| Domain | Reference |
|---|---|
| API Design (REST / GraphQL / gRPC) | `references/api-design.md` |
| Authentication & Authorization | `references/auth.md` |
| Database Design & Query Patterns | `references/database.md` |
| System Architecture & Scalability | `references/architecture.md` |
| Data Stores Cheat Sheet | `references/datastores.md` |
| Mission Prompt Format | `references/mission-prompt-format.md` |

---

## Anti-Pattern Watchlist

Actively catch and flag these in any code review or generation task:

**Query / DB**
- ❌ N+1 queries — always use eager loading / batch queries
- ❌ `SELECT *` in production queries — always specify columns
- ❌ No indexes on foreign keys and frequently-filtered columns
- ❌ Transactions missing for multi-step writes
- ❌ No connection pooling configured

**API**
- ❌ Business logic in route handlers
- ❌ Raw error objects returned to client (leaks stack traces)
- ❌ No pagination on list endpoints
- ❌ No rate limiting on auth endpoints
- ❌ Accepting unvalidated user input

**Auth**
- ❌ Secrets in source code or version control
- ❌ JWT secret as a short/static string
- ❌ No token expiry or refresh logic
- ❌ Role checks in route handlers instead of middleware
- ❌ Passwords stored without bcrypt/argon2

**Architecture**
- ❌ Monolithic `index.ts` / `main.py` with everything in one file
- ❌ Services directly importing other services' DB models
- ❌ Synchronous calls to slow external services without timeouts
- ❌ No health check endpoint
- ❌ No graceful shutdown handling

---

## Mission Prompt Structure

Always read `references/mission-prompt-format.md` before writing a mission prompt. Key structural elements:

```
MODE: [Plan | Fast]
STACK: [Node.js/TypeScript | Python/FastAPI | Python/Django]
DOMAIN: [API | Auth | DB | Architecture | Mixed]

## Mission
[One sentence: what service/feature you're building]

## Tech Stack
[Framework, ORM, validation lib, auth lib, DB clients, etc.]

## Data Stores
[Which of: PostgreSQL, MongoDB, Firebase, Redis, Kafka — and purpose of each]

## Service Structure
[Directory tree]

## Detailed Spec
[Per endpoint / schema / service: inputs, outputs, validation rules, error cases]

## Environment Variables
[List all required env vars with descriptions]

## Boot Sequence
[Commands the agent runs to start the service]

## VERIFY IN TERMINAL / BROWSER
- [ ] [specific check]
```

---

## Code Standards

**Universal**
- All files in kebab-case: `user-service.ts`, `auth-router.py`
- Every file starts with `/* ANTIGRAVITY: verified */` comment + intended test URL
- No magic numbers — named constants only
- All async functions have try/catch or a global error boundary

**Node.js / TypeScript**
- Strict TypeScript: `"strict": true` in tsconfig
- No `any` types — use `unknown` and narrow
- Zod for runtime validation; types inferred from Zod schemas
- Express or Fastify; never raw `http` module for APIs
- Prisma (PostgreSQL) or Mongoose (MongoDB) as ORM/ODM
- `dotenv` + `zod` for env validation at startup

**Python / FastAPI**
- Pydantic v2 for all request/response models
- SQLAlchemy 2.0 async for PostgreSQL; Motor for MongoDB async
- Alembic for migrations (PostgreSQL)
- `python-jose` or `authlib` for JWT
- `python-decouple` or `pydantic-settings` for env config
- Type hints on every function signature

**Python / Django**
- Django REST Framework with serializers for all I/O
- Custom exception handler registered in `settings.py`
- `django-environ` for config
- Select-related / prefetch-related on every queryset with relations

---

## Database Quick Rules

Full patterns in `references/database.md`. Quick rules:

| Store | Use for | Never use for |
|---|---|---|
| PostgreSQL | Relational data, transactions, complex queries | Unstructured blobs, time-series at scale |
| MongoDB | Flexible/nested docs, content, catalogs | Highly relational data with many joins |
| Firebase Firestore | Real-time sync, mobile-first, auth integration | Complex server-side queries, aggregations |
| Redis | Session store, cache, rate limiting, pub/sub | Primary data store, complex queries |
| Kafka | Event streaming, audit log, service decoupling | Simple task queues (use Redis/BullMQ instead) |
