# Authentication & Authorization — Reference

## Auth Architecture Decision

| Requirement | Strategy |
|---|---|
| Stateless API, mobile + web clients | JWT (access + refresh token pair) |
| Firebase-integrated (edtech mobile) | Firebase Auth → verify ID token server-side |
| SSO / OAuth (Google, GitHub login) | OAuth 2.0 PKCE flow → issue own JWT after |
| Server-side sessions (Django admin) | Django sessions + CSRF |
| Service-to-service (internal APIs) | API keys or mTLS |

---

## JWT — Production Setup

### Token Architecture
```
Access Token:  short-lived (15 min)  — sent in Authorization header
Refresh Token: long-lived (7–30 days) — stored in httpOnly cookie or secure storage
```

**Never:**
- Store access tokens in localStorage (XSS vulnerable)
- Make access tokens long-lived (15 min max)
- Use a weak or static JWT secret

**Always:**
- Rotate refresh tokens on every use (refresh token rotation)
- Maintain a refresh token revocation list in Redis
- Include `jti` (JWT ID) claim for revocation capability

### Token Payload — keep minimal
```typescript
interface AccessTokenPayload {
  sub: string;        // user ID
  role: string;       // "student" | "instructor" | "admin"
  iat: number;        // issued at
  exp: number;        // expiry
  jti: string;        // unique token ID (for revocation)
}
// Never include: password, email, sensitive PII, large objects
```

---

## Node.js / TypeScript — Complete Auth Implementation

```typescript
// utils/jwt.ts
import jwt from 'jsonwebtoken';
import { v4 as uuid } from 'uuid';
import { env } from '../config/env';

export const signAccessToken = (payload: { sub: string; role: string }) =>
  jwt.sign({ ...payload, jti: uuid() }, env.JWT_ACCESS_SECRET, { expiresIn: '15m' });

export const signRefreshToken = (sub: string) =>
  jwt.sign({ sub, jti: uuid() }, env.JWT_REFRESH_SECRET, { expiresIn: '7d' });

export const verifyAccessToken = (token: string) =>
  jwt.verify(token, env.JWT_ACCESS_SECRET) as AccessTokenPayload;
```

```typescript
// middleware/auth.ts
import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../utils/jwt';
import { AuthError } from '../errors';

export const authenticate = (req: Request, _res: Response, next: NextFunction) => {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) throw new AuthError('Missing token');
  try {
    req.user = verifyAccessToken(header.slice(7));
    next();
  } catch {
    throw new AuthError('Invalid or expired token');
  }
};

// Role-based — use as middleware after authenticate
export const authorize = (...roles: string[]) =>
  (req: Request, _res: Response, next: NextFunction) => {
    if (!roles.includes(req.user.role)) {
      throw new ForbiddenError('Insufficient permissions');
    }
    next();
  };

// Usage in routes:
// router.delete('/:id', authenticate, authorize('admin'), controller.delete);
```

```typescript
// services/auth.service.ts
import bcrypt from 'bcryptjs';
import { redis } from '../lib/redis';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../utils/jwt';

export class AuthService {
  async login(email: string, password: string) {
    const user = await userRepo.findByEmail(email);
    if (!user) throw new AuthError('Invalid credentials');  // same message for security

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) throw new AuthError('Invalid credentials');

    return this.issueTokenPair(user);
  }

  async refresh(refreshToken: string) {
    const payload = verifyRefreshToken(refreshToken);

    // Check revocation list
    const revoked = await redis.get(`revoked:${payload.jti}`);
    if (revoked) throw new AuthError('Token revoked');

    // Revoke current refresh token (rotation)
    await redis.setex(`revoked:${payload.jti}`, 7 * 24 * 3600, '1');

    const user = await userRepo.findById(payload.sub);
    return this.issueTokenPair(user);
  }

  async logout(refreshTokenJti: string) {
    await redis.setex(`revoked:${refreshTokenJti}`, 7 * 24 * 3600, '1');
  }

  private async issueTokenPair(user: User) {
    const accessToken = signAccessToken({ sub: user.id, role: user.role });
    const refreshToken = signRefreshToken(user.id);
    return { accessToken, refreshToken };
  }
}
```

---

## Python / FastAPI — Auth Implementation

```python
# utils/jwt.py
from jose import jwt, JWTError
from datetime import datetime, timedelta, timezone
from app.config import settings
import uuid

def create_access_token(sub: str, role: str) -> str:
    payload = {
        "sub": sub,
        "role": role,
        "jti": str(uuid.uuid4()),
        "exp": datetime.now(timezone.utc) + timedelta(minutes=15),
        "iat": datetime.now(timezone.utc),
    }
    return jwt.encode(payload, settings.JWT_ACCESS_SECRET, algorithm="HS256")

def verify_access_token(token: str) -> dict:
    try:
        return jwt.decode(token, settings.JWT_ACCESS_SECRET, algorithms=["HS256"])
    except JWTError:
        raise AuthError("Invalid or expired token")
```

```python
# dependencies/auth.py
from fastapi import Depends, Security
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from app.utils.jwt import verify_access_token

bearer = HTTPBearer()

async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Security(bearer)
) -> TokenPayload:
    return verify_access_token(credentials.credentials)

def require_role(*roles: str):
    async def checker(user=Depends(get_current_user)):
        if user["role"] not in roles:
            raise ForbiddenError("Insufficient permissions")
        return user
    return checker

# Usage:
# @router.delete("/{id}", dependencies=[Depends(require_role("admin"))])
```

---

## Firebase Auth — Server-Side Verification

Use when mobile clients authenticate with Firebase (Google Sign-In, phone OTP) and pass the Firebase ID token to your backend:

```typescript
// Node.js
import { initializeApp, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

initializeApp({ credential: cert(serviceAccount) });

export const verifyFirebaseToken = async (idToken: string) => {
  try {
    const decoded = await getAuth().verifyIdToken(idToken);
    return decoded; // contains uid, email, custom claims
  } catch {
    throw new AuthError('Invalid Firebase token');
  }
};

// After verification: upsert user in your own DB, issue your own JWT
// This keeps Firebase as the identity provider, not the session manager
```

```python
# Python
import firebase_admin
from firebase_admin import credentials, auth as firebase_auth

firebase_admin.initialize_app(credentials.Certificate("service-account.json"))

async def verify_firebase_token(id_token: str) -> dict:
    try:
        return firebase_auth.verify_id_token(id_token)
    except Exception:
        raise AuthError("Invalid Firebase token")
```

---

## Password Hashing

```typescript
// Node.js — bcryptjs
import bcrypt from 'bcryptjs';
const SALT_ROUNDS = 12;

export const hashPassword = (plain: string) => bcrypt.hash(plain, SALT_ROUNDS);
export const verifyPassword = (plain: string, hash: string) => bcrypt.compare(plain, hash);
```

```python
# Python — passlib
from passlib.context import CryptContext
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def hash_password(plain: str) -> str:
    return pwd_context.hash(plain)

def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)
```

---

## Environment Variables for Auth

```env
# Required — always validate at startup
JWT_ACCESS_SECRET=<min 64 char random string>
JWT_REFRESH_SECRET=<different min 64 char random string>
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# Firebase (if used)
FIREBASE_PROJECT_ID=
FIREBASE_PRIVATE_KEY=
FIREBASE_CLIENT_EMAIL=

# OAuth (if used)
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
OAUTH_CALLBACK_URL=
```

---

## Auth Endpoint Checklist

Every auth system must implement:
- [ ] `POST /auth/register` — with email uniqueness check
- [ ] `POST /auth/login` — with constant-time comparison, rate limited
- [ ] `POST /auth/refresh` — with token rotation
- [ ] `POST /auth/logout` — revokes refresh token
- [ ] `GET /auth/me` — returns current user (requires valid access token)
- [ ] Password reset flow (if email/password auth)
- [ ] Token revocation list backed by Redis
