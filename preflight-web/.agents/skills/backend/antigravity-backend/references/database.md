# Database Design & Query Patterns — Reference

## Schema Design Principles

1. **Name everything consistently** — `snake_case` for columns, plural table names
2. **Every table has**: `id` (UUID preferred), `created_at`, `updated_at`
3. **Soft deletes** — `deleted_at TIMESTAMPTZ NULL` instead of hard deletes for user data
4. **Index strategy** — index every FK, every frequently-filtered column, every search column
5. **Constraints at the DB level** — NOT NULL, UNIQUE, FK constraints — never rely on app-layer only

---

## PostgreSQL — Prisma (Node.js)

### Schema Template
```prisma
// schema.prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id          String    @id @default(uuid())
  email       String    @unique
  name        String
  role        Role      @default(STUDENT)
  passwordHash String   @map("password_hash")
  deletedAt   DateTime? @map("deleted_at")
  createdAt   DateTime  @default(now()) @map("created_at")
  updatedAt   DateTime  @updatedAt @map("updated_at")

  enrollments Enrollment[]
  progress    Progress[]

  @@map("users")
  @@index([email])
  @@index([role])
}

model Course {
  id          String    @id @default(uuid())
  title       String
  slug        String    @unique
  status      CourseStatus @default(DRAFT)
  instructorId String   @map("instructor_id")
  instructor  User      @relation(fields: [instructorId], references: [id])
  modules     Module[]
  enrollments Enrollment[]
  createdAt   DateTime  @default(now()) @map("created_at")
  updatedAt   DateTime  @updatedAt @map("updated_at")

  @@map("courses")
  @@index([instructorId])
  @@index([status])
  @@index([slug])
}

enum Role { STUDENT INSTRUCTOR ADMIN }
enum CourseStatus { DRAFT PUBLISHED ARCHIVED }
```

### Query Patterns — Prisma
```typescript
// ✅ Paginated list with relations — always specify select
const courses = await prisma.course.findMany({
  where: { status: 'PUBLISHED', deletedAt: null },
  select: {
    id: true, title: true, slug: true,
    instructor: { select: { id: true, name: true } },
    _count: { select: { enrollments: true } }
  },
  orderBy: { createdAt: 'desc' },
  skip: (page - 1) * limit,
  take: limit,
});

// ✅ Transaction — always for multi-step writes
const result = await prisma.$transaction(async (tx) => {
  const enrollment = await tx.enrollment.create({
    data: { userId, courseId }
  });
  await tx.course.update({
    where: { id: courseId },
    data: { enrollmentCount: { increment: 1 } }
  });
  return enrollment;
});

// ❌ Never — N+1 pattern
const courses = await prisma.course.findMany();
for (const course of courses) {
  course.instructor = await prisma.user.findUnique({ where: { id: course.instructorId } });
}
```

---

## PostgreSQL — SQLAlchemy (Python/FastAPI)

```python
# models/user.py — SQLAlchemy 2.0 async
from sqlalchemy import String, Enum as PgEnum, DateTime, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db import Base
import uuid

class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    email: Mapped[str] = mapped_column(String, unique=True, nullable=False, index=True)
    name: Mapped[str] = mapped_column(String, nullable=False)
    role: Mapped[str] = mapped_column(String, default="student", index=True)
    password_hash: Mapped[str] = mapped_column(String, nullable=False)
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), onupdate=func.now())

    enrollments: Mapped[list["Enrollment"]] = relationship(back_populates="user")
```

```python
# repositories/user_repository.py
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload

class UserRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def find_paginated(self, page: int, limit: int):
        # ✅ Eager load relations in one query
        stmt = (
            select(User)
            .options(selectinload(User.enrollments))
            .where(User.deleted_at.is_(None))
            .order_by(User.created_at.desc())
            .offset((page - 1) * limit)
            .limit(limit)
        )
        result = await self.db.execute(stmt)
        return result.scalars().all()

    async def find_by_email(self, email: str) -> User | None:
        result = await self.db.execute(
            select(User).where(User.email == email, User.deleted_at.is_(None))
        )
        return result.scalar_one_or_none()
```

---

## MongoDB — Mongoose (Node.js)

```typescript
// models/content.model.ts — good fit: flexible content/catalog
import { Schema, model, Document } from 'mongoose';

interface ILesson extends Document {
  title: string;
  content: Record<string, unknown>;  // flexible structure
  videoUrl?: string;
  duration?: number;
  tags: string[];
  moduleId: Schema.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const LessonSchema = new Schema<ILesson>({
  title: { type: String, required: true, trim: true },
  content: { type: Schema.Types.Mixed, required: true },
  videoUrl: { type: String },
  duration: { type: Number },
  tags: [{ type: String }],
  moduleId: { type: Schema.Types.ObjectId, ref: 'Module', required: true, index: true },
}, { timestamps: true });

// Always define indexes explicitly
LessonSchema.index({ moduleId: 1, createdAt: -1 });
LessonSchema.index({ tags: 1 });
LessonSchema.index({ title: 'text' });  // text search

export const Lesson = model<ILesson>('Lesson', LessonSchema);
```

```typescript
// Query patterns
// ✅ Projection — never return all fields to client
const lessons = await Lesson.find({ moduleId })
  .select('title duration videoUrl tags')
  .sort({ createdAt: -1 })
  .skip(skip).limit(limit)
  .lean();  // .lean() for read-only — faster, returns plain objects

// ✅ Aggregation for complex data
const stats = await Progress.aggregate([
  { $match: { userId: new Types.ObjectId(userId) } },
  { $group: { _id: '$courseId', completed: { $sum: '$completedLessons' }, total: { $first: '$totalLessons' } } },
  { $project: { percentage: { $multiply: [{ $divide: ['$completed', '$total'] }, 100] } } }
]);
```

---

## Redis — Usage Patterns

```typescript
// lib/redis.ts
import { createClient } from 'redis';

export const redis = createClient({ url: process.env.REDIS_URL });
redis.on('error', (err) => console.error('Redis error:', err));
await redis.connect();
```

```typescript
// Pattern 1: Cache-aside (most common)
export async function getCachedOrFetch<T>(
  key: string,
  ttlSeconds: number,
  fetchFn: () => Promise<T>
): Promise<T> {
  const cached = await redis.get(key);
  if (cached) return JSON.parse(cached);

  const data = await fetchFn();
  await redis.setEx(key, ttlSeconds, JSON.stringify(data));
  return data;
}

// Usage
const course = await getCachedOrFetch(
  `course:${id}`,
  300,  // 5 min TTL
  () => courseRepo.findById(id)
);

// Pattern 2: Rate limiting with sliding window
export async function checkRateLimit(key: string, limit: number, windowSecs: number) {
  const current = await redis.incr(key);
  if (current === 1) await redis.expire(key, windowSecs);
  return current <= limit;
}

// Pattern 3: Session / token blacklist
await redis.setEx(`revoked:${jti}`, 7 * 24 * 3600, '1');
const isRevoked = await redis.exists(`revoked:${jti}`);

// Cache invalidation — always invalidate on write
await redis.del(`course:${id}`);
await redis.del(`course:list:*`);  // pattern delete via SCAN
```

---

## Kafka — Event Patterns

```typescript
// lib/kafka.ts
import { Kafka } from 'kafkajs';

export const kafka = new Kafka({
  clientId: process.env.SERVICE_NAME,
  brokers: process.env.KAFKA_BROKERS!.split(','),
});

export const producer = kafka.producer();
export const consumer = kafka.consumer({ groupId: process.env.KAFKA_GROUP_ID! });
```

```typescript
// Event publishing — always structured payloads
interface DomainEvent<T> {
  eventId: string;
  eventType: string;
  aggregateId: string;
  payload: T;
  timestamp: string;
  version: number;
}

export async function publish<T>(topic: string, event: DomainEvent<T>) {
  await producer.send({
    topic,
    messages: [{
      key: event.aggregateId,   // partitioning key — same entity → same partition
      value: JSON.stringify(event),
      headers: { 'event-type': event.eventType }
    }]
  });
}

// Event consumption — always idempotent handlers
await consumer.subscribe({ topic: 'course.enrolled', fromBeginning: false });
await consumer.run({
  eachMessage: async ({ message }) => {
    const event = JSON.parse(message.value!.toString());

    // Idempotency check — skip already-processed events
    const processed = await redis.exists(`event:${event.eventId}`);
    if (processed) return;

    await handleEnrollment(event.payload);

    await redis.setEx(`event:${event.eventId}`, 24 * 3600, '1');
  }
});
```

### Kafka Topic Naming Convention
```
{domain}.{entity}.{event}
course.enrollment.created
course.enrollment.cancelled
user.account.created
video.progress.updated
payment.order.completed
```

---

## Migration Strategy

```bash
# Prisma (Node.js)
npx prisma migrate dev --name add_user_roles    # development
npx prisma migrate deploy                        # production (CI/CD)
npx prisma db seed                               # seed data

# Alembic (Python)
alembic revision --autogenerate -m "add_user_roles"
alembic upgrade head
alembic downgrade -1   # rollback one step
```

**Migration rules:**
- Always write rollback for production migrations
- Never rename columns — add new, migrate data, drop old (3 deploys)
- Never drop a column in the same deploy as removing code that uses it
- All migrations run in CI before deploy
