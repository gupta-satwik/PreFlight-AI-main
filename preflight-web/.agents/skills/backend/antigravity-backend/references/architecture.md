# System Architecture & Scalability — Reference

## Architecture Decision Framework

Before designing any system, answer:
1. **Read/write ratio** — read-heavy → cache aggressively; write-heavy → async queues
2. **Consistency requirements** — strict (payments, enrollments) vs eventual (analytics, feeds)
3. **Traffic pattern** — steady vs bursty (live class events, exam starts)
4. **Team size** — monolith is correct for small teams; microservices add operational overhead

---

## Service Architecture Patterns

### Pattern 1: Modular Monolith (Default Start)
Best for: early-stage products, small teams, edtech platforms pre-scale

```
src/
  modules/
    users/
      users.router.ts
      users.service.ts
      users.repository.ts
      users.schema.ts
    courses/
      courses.router.ts
      courses.service.ts
      courses.repository.ts
    auth/
      auth.router.ts
      auth.service.ts
  shared/
    middleware/
    errors/
    utils/
    config/
  app.ts
  server.ts
```

Rules:
- Modules communicate via service interfaces, never direct DB access across modules
- Shared DB is fine — shared models are not
- Extract to microservice only when a module has clear scaling/deployment needs

### Pattern 2: Microservices (When justified)
Extract a service when:
- Independent scaling required (video processing, search indexing)
- Different tech stack needed (Python ML service, Node.js real-time service)
- Independent deployment cadence
- Team ownership boundaries require it

```
services/
  api-gateway/          ← routes to downstream services, handles auth
  user-service/         ← user CRUD, auth (Node.js + PostgreSQL)
  course-service/       ← course/content management (Node.js + MongoDB)
  progress-service/     ← learning progress, analytics (Python + PostgreSQL)
  notification-service/ ← email, push (Node.js + Firebase)
  video-service/        ← upload, transcode (Python + cloud storage)
```

**Communication patterns:**
- Synchronous (REST/gRPC): user-facing requests, requires immediate response
- Asynchronous (Kafka): events, notifications, analytics, anything that can be delayed

---

## Node.js Service — Production Bootstrap

```typescript
// server.ts — graceful startup and shutdown
import app from './app';
import { prisma } from './lib/prisma';
import { redis } from './lib/redis';
import { producer } from './lib/kafka';

const PORT = parseInt(process.env.PORT || '3000');

async function bootstrap() {
  // Validate env vars at startup
  const { env } = await import('./config/env');  // throws if invalid

  // Connect data stores
  await redis.connect();
  await producer.connect();
  await prisma.$connect();

  const server = app.listen(PORT, () => {
    console.log(`[${env.SERVICE_NAME}] Running on :${PORT}`);
  });

  // Graceful shutdown
  const shutdown = async (signal: string) => {
    console.log(`[${signal}] Shutting down...`);
    server.close(async () => {
      await prisma.$disconnect();
      await redis.quit();
      await producer.disconnect();
      process.exit(0);
    });
    // Force shutdown after 10s
    setTimeout(() => process.exit(1), 10_000);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT',  () => shutdown('SIGINT'));
}

bootstrap().catch((err) => { console.error(err); process.exit(1); });
```

```typescript
// config/env.ts — validate all env vars at startup
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV:            z.enum(['development', 'production', 'test']),
  PORT:                z.string().default('3000'),
  DATABASE_URL:        z.string().url(),
  REDIS_URL:           z.string().url(),
  JWT_ACCESS_SECRET:   z.string().min(32),
  JWT_REFRESH_SECRET:  z.string().min(32),
  SERVICE_NAME:        z.string(),
});

export const env = envSchema.parse(process.env);
// If any var is missing or invalid, this throws at startup — fail fast
```

---

## Python / FastAPI — Production Bootstrap

```python
# main.py
from contextlib import asynccontextmanager
from fastapi import FastAPI
from app.db import engine, Base
from app.config import settings
from app.errors import register_exception_handlers
from app.routers import users, courses, auth

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    # Shutdown
    await engine.dispose()

app = FastAPI(
    title=settings.SERVICE_NAME,
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs" if settings.ENV != "production" else None,
)

register_exception_handlers(app)

app.include_router(auth.router, prefix="/api/v1")
app.include_router(users.router, prefix="/api/v1")
app.include_router(courses.router, prefix="/api/v1")

@app.get("/health")
async def health(): return {"status": "ok", "service": settings.SERVICE_NAME}
```

---

## Health Check — Required on Every Service

```typescript
// Node.js
app.get('/health', async (req, res) => {
  const checks = {
    db: 'ok',
    redis: 'ok',
    uptime: process.uptime(),
  };
  try { await prisma.$queryRaw`SELECT 1`; } catch { checks.db = 'error'; }
  try { await redis.ping(); } catch { checks.redis = 'error'; }

  const allOk = Object.values(checks).every(v => v === 'ok' || typeof v === 'number');
  res.status(allOk ? 200 : 503).json({ status: allOk ? 'ok' : 'degraded', checks });
});
```

---

## Caching Strategy

### What to cache
| Data | TTL | Invalidation |
|---|---|---|
| Course catalog / list | 5–10 min | On publish/update |
| User profile | 5 min | On update |
| Lesson content | 30 min | On edit |
| Search results | 2 min | Time-based |
| Auth token blacklist | Token lifetime | On logout |
| Rate limit counters | Window duration | Time-based |

### What NOT to cache
- User-specific progress data (changes frequently, high cardinality)
- Payment/transaction data (consistency required)
- Real-time features (defeats the purpose)

### Cache key conventions
```
{service}:{entity}:{id}              → course:abc123
{service}:{entity}:list:{page}:{filters_hash}  → course:list:1:d4f2a
{service}:{user}:{id}:{context}      → progress:user:abc:course:xyz
```

---

## Background Jobs & Queues

Use **BullMQ** (Node.js, Redis-backed) for task queues. Use **Kafka** only for event streaming between services.

```typescript
// lib/queues.ts
import { Queue, Worker } from 'bullmq';
import { redis } from './redis';

// Define queue
export const emailQueue = new Queue('emails', { connection: redis });
export const videoProcessingQueue = new Queue('video-processing', { connection: redis });

// Add job
await emailQueue.add('enrollment-confirmation', {
  userId, courseId, email
}, {
  attempts: 3,
  backoff: { type: 'exponential', delay: 5000 },
  removeOnComplete: 100,
  removeOnFail: 500,
});

// Worker (separate process or service)
new Worker('emails', async (job) => {
  await sendEmail(job.data);
}, { connection: redis, concurrency: 5 });
```

---

## Scalability Checklist

Before any service goes to production:

**Database**
- [ ] Connection pool configured (Prisma: `connection_limit`, SQLAlchemy: `pool_size`)
- [ ] Indexes on all FK columns and frequently queried fields
- [ ] Slow query logging enabled
- [ ] Read replica for analytics queries (if write-heavy)

**Caching**
- [ ] Redis cache-aside on all frequently-read, rarely-changing data
- [ ] Cache invalidation strategy defined for every cached resource
- [ ] Cache miss rate monitored

**API**
- [ ] Pagination on all list endpoints (no unbounded queries)
- [ ] Rate limiting on auth and public endpoints
- [ ] Request timeout configured (30s max)
- [ ] Response compression enabled (gzip)

**Resilience**
- [ ] Health check endpoint (`/health`)
- [ ] Graceful shutdown (drains in-flight requests)
- [ ] Circuit breaker on external service calls
- [ ] Retry with exponential backoff on transient failures

**Observability**
- [ ] Structured JSON logging with `requestId`, `userId`, `duration`
- [ ] Error tracking (Sentry or similar)
- [ ] Key metrics: p50/p95/p99 response times, error rate, queue depth

---

## Service-to-Service Communication

```typescript
// HTTP client with timeout and retry
import axios from 'axios';
import axiosRetry from 'axios-retry';

const internalClient = axios.create({
  baseURL: process.env.COURSE_SERVICE_URL,
  timeout: 5000,  // always set a timeout
  headers: { 'x-service-name': process.env.SERVICE_NAME }
});

axiosRetry(internalClient, {
  retries: 3,
  retryDelay: axiosRetry.exponentialDelay,
  retryCondition: (err) => axiosRetry.isNetworkError(err) || err.response?.status >= 500
});
```

**Never** make synchronous service calls inside a database transaction — you'll hold locks while waiting on network I/O.
