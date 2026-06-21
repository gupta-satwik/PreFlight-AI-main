# Data Stores Cheat Sheet

Quick reference for your stack: PostgreSQL · MongoDB · Firebase · Redis · Kafka

---

## When to Use Which Store

| Store | Best for | Avoid for |
|---|---|---|
| **PostgreSQL** | Relational data, ACID transactions, complex joins, financial records, enrollments | Unstructured blobs, time-series at high scale, document catalogs |
| **MongoDB** | Flexible/nested documents, content catalogs, lesson content, user-generated data, rapid schema iteration | Highly relational data, strict financial transactions |
| **Firebase Firestore** | Real-time sync (live class, collaborative tools), mobile-first auth, simple document queries | Complex server-side aggregations, large-scale analytics, bulk writes |
| **Redis** | Session store, cache layer, rate limiting, pub/sub, BullMQ task queues, leaderboards | Primary data store, complex relational queries |
| **Kafka** | Event streaming between services, audit log, decoupled async processing, analytics pipeline | Simple task queues (use Redis/BullMQ), synchronous request-response |

---

## Connection Setup — All Stores

### PostgreSQL (Prisma — Node.js)
```env
DATABASE_URL="postgresql://user:password@localhost:5432/dbname?schema=public&connection_limit=10"
```
```typescript
// lib/prisma.ts
import { PrismaClient } from '@prisma/client';
export const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'warn', 'error'] : ['error'],
});
```

### PostgreSQL (SQLAlchemy — Python)
```env
DATABASE_URL="postgresql+asyncpg://user:password@localhost:5432/dbname"
```
```python
# db.py
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker
engine = create_async_engine(settings.DATABASE_URL, pool_size=10, max_overflow=5)
AsyncSession = async_sessionmaker(engine, expire_on_commit=False)
```

### MongoDB (Mongoose — Node.js)
```env
MONGODB_URI="mongodb+srv://user:password@cluster.mongodb.net/dbname"
```
```typescript
// lib/mongoose.ts
import mongoose from 'mongoose';
export const connectMongo = () =>
  mongoose.connect(process.env.MONGODB_URI!, { maxPoolSize: 10 });
```

### MongoDB (Motor — Python)
```env
MONGODB_URI="mongodb+srv://user:password@cluster.mongodb.net"
MONGODB_DB="dbname"
```
```python
# db/mongo.py
from motor.motor_asyncio import AsyncIOMotorClient
client = AsyncIOMotorClient(settings.MONGODB_URI)
db = client[settings.MONGODB_DB]
```

### Firebase Admin (Server-side — Node.js)
```env
FIREBASE_PROJECT_ID=
FIREBASE_PRIVATE_KEY=    # JSON-encoded, handle newlines
FIREBASE_CLIENT_EMAIL=
```
```typescript
// lib/firebase.ts
import { initializeApp, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

initializeApp({ credential: cert({
  projectId: process.env.FIREBASE_PROJECT_ID,
  privateKey: process.env.FIREBASE_PRIVATE_KEY!.replace(/\\n/g, '\n'),
  clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
})});

export const auth = getAuth();
export const firestore = getFirestore();
```

### Redis
```env
REDIS_URL="redis://:password@localhost:6379"
```
```typescript
// lib/redis.ts
import { createClient } from 'redis';
export const redis = createClient({ url: process.env.REDIS_URL });
await redis.connect();
```
```python
# lib/redis.py
import redis.asyncio as aioredis
redis = aioredis.from_url(settings.REDIS_URL, decode_responses=True)
```

### Kafka (KafkaJS — Node.js)
```env
KAFKA_BROKERS="localhost:9092"   # comma-separated for cluster
KAFKA_GROUP_ID="my-service-group"
SERVICE_NAME="my-service"
```
```typescript
// lib/kafka.ts
import { Kafka } from 'kafkajs';
export const kafka = new Kafka({
  clientId: process.env.SERVICE_NAME,
  brokers: process.env.KAFKA_BROKERS!.split(','),
  retry: { initialRetryTime: 300, retries: 8 }
});
```

---

## Edtech Platform — Recommended Store Allocation

| Data entity | Store | Reason |
|---|---|---|
| Users, roles, permissions | PostgreSQL | Relational, ACID |
| Enrollments, payments | PostgreSQL | Strict consistency |
| Course metadata, structure | PostgreSQL | Relational (course → module → lesson) |
| Lesson content, rich text | MongoDB | Flexible schema, nested blocks |
| Video metadata, assets | MongoDB | Flexible, nested |
| User progress (completion) | PostgreSQL | ACID, aggregations |
| Real-time class sessions | Firebase Firestore | Live sync |
| Auth tokens, sessions | Redis | Fast, TTL native |
| Rate limit counters | Redis | Atomic incr, TTL |
| Search indexes (future) | Elasticsearch or Postgres FTS | Full-text search |
| Domain events (analytics, notifications) | Kafka | Async, decoupled |
| Background jobs | Redis + BullMQ | Simple, Redis-backed |

---

## Docker Compose — Local Dev

```yaml
# docker-compose.yml
version: '3.9'
services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: dev
      POSTGRES_PASSWORD: dev
      POSTGRES_DB: app_dev
    ports: ["5432:5432"]
    volumes: [postgres_data:/var/lib/postgresql/data]

  mongo:
    image: mongo:7
    ports: ["27017:27017"]
    volumes: [mongo_data:/data/db]

  redis:
    image: redis:7-alpine
    ports: ["6379:6379"]
    command: redis-server --requirepass devpassword

  kafka:
    image: confluentinc/cp-kafka:7.6.0
    ports: ["9092:9092"]
    environment:
      KAFKA_NODE_ID: 1
      KAFKA_PROCESS_ROLES: broker,controller
      KAFKA_LISTENERS: PLAINTEXT://0.0.0.0:9092,CONTROLLER://0.0.0.0:9093
      KAFKA_ADVERTISED_LISTENERS: PLAINTEXT://localhost:9092
      KAFKA_CONTROLLER_QUORUM_VOTERS: 1@localhost:9093
      KAFKA_OFFSETS_TOPIC_REPLICATION_FACTOR: 1
      CLUSTER_ID: MkU3OEVBNTcwNTJENDM2Qk

volumes:
  postgres_data:
  mongo_data:
```

---

## Environment Variables — Complete Template

```env
# App
NODE_ENV=development
PORT=3000
SERVICE_NAME=my-service

# PostgreSQL
DATABASE_URL=postgresql://dev:dev@localhost:5432/app_dev

# MongoDB
MONGODB_URI=mongodb://localhost:27017
MONGODB_DB=app_dev

# Firebase
FIREBASE_PROJECT_ID=
FIREBASE_PRIVATE_KEY=
FIREBASE_CLIENT_EMAIL=

# Redis
REDIS_URL=redis://:devpassword@localhost:6379

# Kafka
KAFKA_BROKERS=localhost:9092
KAFKA_GROUP_ID=my-service-group

# Auth
JWT_ACCESS_SECRET=change-me-minimum-64-chars-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
JWT_REFRESH_SECRET=change-me-different-minimum-64-chars-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
```
