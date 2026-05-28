<<<<<<< HEAD
# Tasqflow

An elegant, secure, enterprise-grade team Kanban workspace and pipeline visualization engine. This is a fully containerized full-stack suite built using Next.js 14, Express, PostgreSQL, Prisma, and Redis.

## Core Architecture Design & Flow

```
┌────────────────────────────────────────────────────────┐
│                      Next.js 14                        │ Client Frame
│            (Tailwind, @dnd-kit, Recharts)              │ Viewports
└──────────────────────────┬─────────────────────────────┘
                           │ APIs (Auth, REST JWT)
                           ▼
┌────────────────────────────────────────────────────────┐
│                      Express API                       │ Node Service
│       (Helmet Security, Zod Request Guardrails)        │ Bus Routings
└──────┬───────────────────┬──────────────────────┬──────┘
       │ Writes / Queries  │                      │ Read / Write
       ▼                   ▼ Cache checks (TTL)   ▼ Cache invalidations
┌──────────────┐    ┌──────────────┐       ┌──────────────┐
│  Prisma Client│    │   Prisma ORM │       │ Redis Cache  │ Data & Speed
├──────────────┤    ├──────────────┤       ├──────────────┤
│  PostgreSQL  │    │  PostgreSQL  │       │  Memory Store│ Engine Blocks
└──────────────┘    └──────────────┘       └──────────────┘
```

1. **Authentication Guardrails**: Handles registry and login via SHA-BCRYPT and jwt-based sessions. Directs user IDs to custom relations.
2. **REST Restful Services**: CRUD projects, task state updates, and cascade wipes are processed in strict atomic SQL queries.
3. **Redis Stats Caching (TTL 60s)**: High-performance stats calculation caches metadata keys. Mutating project/task scopes programmatically drops caching indexes to bypass stale telemetry blocks.

---

## 📂 Subdirectory Schemas

- **`frontend/`**: Next.js 14 App Router, dynamic styling Tailwind, `@dnd-kit/core` drag controllers, Recharts curves.
- **`backend/`**: Node TS REST Express engine, helmet security adapters.
- **`prisma/`**: Relational models for Users, Projects, and Cards.
- **`docker/`**: Custom optimization container build parameters.

---

## 🛠️ Local Sandbox Deployment Config

### Prerequisite Checklist
Ensure your workstation holds:
- Docker & Docker Compose
- Node.js Runtime (v18+)

### Step-by-Step Command Sequences

#### 1. Configure Environmental Variables
Construct standard env keys in both subfolders using provided `.env.example` templates:
```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

#### 2. Start Services via Docker Compose
Spin up Postgres, Redis, backend, and Next.js platforms together:
```bash
docker compose up --build
```

On complete boot:
- **Tasqflow Client**: [http://localhost:3001](http://localhost:3001)
- **Tasqflow API Server**: [http://localhost:4000](http://localhost:4000)

#### 3. Database Schema Deployments
Prisma migrations deploy safely inside docker automatically. To execute migrations or adjust DB structure manually, run:
```bash
cd backend
npx prisma migrate dev --name init
npx prisma generate
```

---

## 🧪 Service Unit Checks

We include extensive endpoint testing utilizing Jest and Supertest. Verify pipeline functionality with:
```bash
cd backend
npm test
```

---

## 📑 API Endpoint Maps

### Authentication Section
- **`POST /api/v1/auth/register`**
  - Payload: `{ "name": "User", "email": "user@com.com", "password": "password" }`
  - Responds: `201 Created` returning user record metadata and Bearer JWT.
- **`POST /api/v1/auth/login`**
  - Payload: `{ "email": "user@com.com", "password": "password" }`
  - Responds: `200 OK` + token.

### Projects Control
- **`GET /api/v1/projects`**
  - Requires: Authentication Token.
  - Responds: `200 OK` with projects list.
- **`POST /api/v1/projects`**
  - Payload: `{ "name": "Sprint Q3", "description": "Release", "colorTag": "#3b82f6" }`
  - Responds: `201 Created` with project entity coordinates.
- **`DELETE /api/v1/projects/:id`**
  - Responds: `200 OK` flushing project and cascade-purging tasks.

### Tasks Column Control
- **`GET /api/v1/projects/:id/tasks`**
  - Responds: `200 OK` rendering workspace task array.
- **`POST /api/v1/projects/:id/tasks`**
  - Payload: `{ "title": "Setup Docker", "priority": "HIGH", "dueDate": "ISO Date" }`
  - Responds: `201 Created`. Flushes stats Redis cache keys.
- **`PATCH /api/v1/tasks/:id`**
  - Payload: `{ "status": "IN_PROGRESS" }` or other fields.
  - Responds: `200 OK`. Flushes stats Redis cache key.
- **`DELETE /api/v1/tasks/:id`**
  - Responds: `200 OK` purgation message. Falls cache indexes.

### Analytics & Dashboard
- **`GET /api/v1/projects/:id/stats`**
  - Retrieves calculated status distribution, priorities, and expired alert metrics.
  - Headers returning: `X-Cache: HIT` or `X-Cache: MISS` matching Redis expiration blocks.
=======
# tasqflow-tanushri-warhade
TasqFlow is a full-stack Kanban task management web app built with Next.js 14, Express.js, PostgreSQL, Prisma, Redis, and Docker. It features JWT authentication, drag-and-drop task management, analytics dashboards, and a modern responsive SaaS UI.
>>>>>>> c1b9ff8be477764bca6d981779949e120da01622
