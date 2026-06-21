# API Design — Reference

## REST Design Principles

### URL Structure
```
# Resources are nouns, never verbs
GET    /users              → list users
POST   /users              → create user
GET    /users/:id          → get user
PATCH  /users/:id          → partial update
DELETE /users/:id          → delete user

# Nested resources for ownership relationships
GET    /courses/:id/lessons
POST   /courses/:id/lessons

# Actions that don't map to CRUD → use verb sub-resource
POST   /users/:id/activate
POST   /auth/refresh-token
POST   /payments/:id/refund
```

### Response Envelope — use consistently across ALL endpoints
```typescript
// Success
{
  "success": true,
  "data": { ... },           // single object or array
  "meta": {                  // optional — pagination, timing
    "page": 1,
    "limit": 20,
    "total": 340,
    "requestId": "uuid"
  }
}

// Error
{
  "success": false,
  "error": {
    "code": "RESOURCE_NOT_FOUND",    // machine-readable, SCREAMING_SNAKE
    "message": "User not found",     // human-readable
    "details": [...],                // optional: field-level validation errors
    "requestId": "uuid"
  }
}
```

### HTTP Status Codes — use precisely
```
200 OK              — successful GET, PATCH, DELETE
201 Created         — successful POST that creates a resource
204 No Content      — successful DELETE with no body
400 Bad Request     — validation failure, malformed input
401 Unauthorized    — missing or invalid auth token
403 Forbidden       — valid token, insufficient permissions
404 Not Found       — resource doesn't exist
409 Conflict        — duplicate resource, state conflict
422 Unprocessable   — valid syntax, failed business rule
429 Too Many Reqs   — rate limit exceeded
500 Internal Error  — unexpected server error (never expose internals)
```

### Pagination — mandatory on all list endpoints
```typescript
// Query params
GET /users?page=1&limit=20&sortBy=createdAt&sortOrder=desc

// Cursor-based (preferred for real-time / large datasets)
GET /feed?cursor=eyJpZCI6MTIzfQ&limit=20

// Response meta always includes
{
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 340,
    "hasNext": true,
    "hasPrev": false
  }
}
```

### Filtering & Search
```
GET /courses?status=published&level=beginner
GET /users?search=rafi&role=student
GET /videos?createdAfter=2024-01-01&createdBefore=2024-12-31
```

---

## Node.js / TypeScript REST — Canonical Structure

```typescript
// routes/user.routes.ts
import { Router } from 'express';
import { validate } from '../middleware/validate';
import { authenticate } from '../middleware/auth';
import { UserController } from '../controllers/user.controller';
import { createUserSchema, updateUserSchema } from '../schemas/user.schema';

const router = Router();
const controller = new UserController();

router.get('/',        authenticate, controller.list);
router.post('/',       validate(createUserSchema), controller.create);
router.get('/:id',     authenticate, controller.getById);
router.patch('/:id',   authenticate, validate(updateUserSchema), controller.update);
router.delete('/:id',  authenticate, controller.remove);

export default router;
```

```typescript
// controllers/user.controller.ts
import { Request, Response, NextFunction } from 'express';
import { UserService } from '../services/user.service';

export class UserController {
  private userService = new UserService();

  list = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { page = 1, limit = 20 } = req.query;
      const result = await this.userService.list({ page: +page, limit: +limit });
      res.json({ success: true, ...result });
    } catch (err) {
      next(err);  // always pass to central error handler
    }
  };
}
```

```typescript
// middleware/validate.ts — Zod validation middleware
import { ZodSchema } from 'zod';
import { Request, Response, NextFunction } from 'express';
import { ValidationError } from '../errors';

export const validate = (schema: ZodSchema) =>
  (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      return next(new ValidationError(result.error.flatten().fieldErrors));
    }
    req.body = result.data;
    next();
  };
```

```typescript
// middleware/error-handler.ts — central error handler (MUST be last middleware)
import { Request, Response, NextFunction } from 'express';
import { AppError } from '../errors';

export const errorHandler = (
  err: Error, _req: Request, res: Response, _next: NextFunction
) => {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      success: false,
      error: { code: err.code, message: err.message, details: err.details }
    });
  }
  console.error(err); // log unexpected errors
  res.status(500).json({
    success: false,
    error: { code: 'INTERNAL_ERROR', message: 'Something went wrong' }
  });
};
```

---

## Python / FastAPI REST — Canonical Structure

```python
# routers/user.py
from fastapi import APIRouter, Depends, Query
from app.services.user_service import UserService
from app.schemas.user import CreateUserRequest, UpdateUserRequest, UserResponse
from app.dependencies import get_current_user, get_db

router = APIRouter(prefix="/users", tags=["users"])

@router.get("/", response_model=PaginatedResponse[UserResponse])
async def list_users(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    db=Depends(get_db),
    current_user=Depends(get_current_user)
):
    service = UserService(db)
    return await service.list(page=page, limit=limit)

@router.post("/", response_model=UserResponse, status_code=201)
async def create_user(body: CreateUserRequest, db=Depends(get_db)):
    service = UserService(db)
    return await service.create(body)
```

```python
# schemas/user.py — Pydantic v2
from pydantic import BaseModel, EmailStr, field_validator
from typing import Optional
from datetime import datetime

class CreateUserRequest(BaseModel):
    name: str
    email: EmailStr
    password: str
    role: str = "student"

    @field_validator('password')
    def password_strength(cls, v):
        if len(v) < 8:
            raise ValueError('Password must be at least 8 characters')
        return v

class UserResponse(BaseModel):
    id: str
    name: str
    email: EmailStr
    role: str
    created_at: datetime

    model_config = {"from_attributes": True}
```

```python
# main.py — global exception handler
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from app.errors import AppError

app = FastAPI()

@app.exception_handler(AppError)
async def app_error_handler(request: Request, exc: AppError):
    return JSONResponse(
        status_code=exc.status_code,
        content={"success": False, "error": {"code": exc.code, "message": exc.message}}
    )
```

---

## GraphQL (Node.js — Apollo Server)

Use GraphQL when:
- Client needs flexible field selection (mobile vs web different data needs)
- Complex nested data requirements (edtech: course → modules → lessons → progress)
- Multiple consumers with different data shapes

```typescript
// schema.ts
const typeDefs = gql`
  type Query {
    course(id: ID!): Course
    courses(filter: CourseFilter, page: Int, limit: Int): CoursesPage!
  }
  type Mutation {
    createCourse(input: CreateCourseInput!): Course!
    enrollStudent(courseId: ID!): Enrollment!
  }
  type Course {
    id: ID!
    title: String!
    modules: [Module!]!          # resolved lazily — use DataLoader
    enrollmentCount: Int!
  }
`;

// Always use DataLoader to prevent N+1 in GraphQL resolvers
import DataLoader from 'dataloader';
const moduleLoader = new DataLoader(async (courseIds) => {
  const modules = await db.module.findMany({
    where: { courseId: { in: courseIds as string[] } }
  });
  return courseIds.map(id => modules.filter(m => m.courseId === id));
});
```

---

## Rate Limiting — Required on Auth & Public Endpoints

```typescript
// Node.js — express-rate-limit
import rateLimit from 'express-rate-limit';

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: 10,                   // 10 attempts per window
  message: { success: false, error: { code: 'RATE_LIMITED', message: 'Too many attempts' } }
});

app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);
```

```python
# FastAPI — slowapi
from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)

@router.post("/login")
@limiter.limit("10/15minutes")
async def login(request: Request, body: LoginRequest):
    ...
```

---

## API Versioning Strategy

Prefer URL versioning for REST: `/api/v1/`, `/api/v2/`

- Never break existing versions — add new versions for breaking changes
- Deprecate with `Deprecation` header and sunset date
- Keep v1 alive for minimum 6 months after v2 ships

---

## gRPC (Node.js — when to use)

Use gRPC for internal service-to-service communication when:
- Low latency is critical (streaming video events, real-time progress updates)
- Strongly-typed contracts needed between services
- Bidirectional streaming required

Define `.proto` files as the single source of truth. Generate types for both Node.js and Python services from the same proto.
