# BullMQ Pub/Sub Pattern with Next.js - Design Document

## Overview

This prototype demonstrates the BullMQ pub/sub pattern within a Next.js application using Docker Compose. The system showcases how a Next.js application publishes jobs to Redis-backed queues, which are then processed by dedicated worker services that persist results to PostgreSQL, enabling scalable, distributed job processing with data persistence.

## Architecture

```
┌─────────────────┐         ┌──────────┐
│   Next.js App   │────────▶│  Redis   │
│   (Publisher)   │  Pub    │          │
└─────────┬───────┘         └─────────┬┘
          |                           │
          |                           │
          |                 ┌─────────┴──────────┐
          |                 │        Sub         │
          |         ┌───────▼───────┐   ┌────────▼──────┐
          |         │  Worker 1     │   │  Worker 2     │
          |         │  (Processor)  │   │  (Processor)  │
          |         └───────┬───────┘   └───────┬───────┘
          |                 │                   │
          |                 └──────────┬────────┘
          |                            │
          |                   ┌────────▼────────┐
          └──────────────────▶│   PostgreSQL    │
                              │   (Database)    │
                              └─────────────────┘
```

## Components

### 1. **Redis Server**

- **Purpose**: Message broker and queue storage
- **Role**: Central hub for pub/sub messaging and job queues
- **Port**: 6379 (default)

### 2. **Next.js Application (Publisher)**

- **Purpose**: Web application that publishes events/jobs
- **Features**:
    - API routes to create jobs
    - Web UI to trigger events
    - Publishes messages to BullMQ queues
    - View job results from database
- **Port**: 3000

### 3. **Worker Services**

- **Purpose**: Dedicated Node.js processes that consume and process jobs
- **Features**:
    - Background workers that consume from queues
    - Job processors with retry logic
    - Write job results to PostgreSQL
    - Can scale horizontally (multiple instances)
- **Technology**: Node.js with BullMQ
- **Port**: N/A (internal service)

### 4. **PostgreSQL Database**

- **Purpose**: Persistent storage for job results and processed data
- **Role**: Stores job outcomes, status, and any processed data
- **Port**: 5432 (default)
- **Schema**: Tables for jobs, results, and related data

#### Database Schema (Example)

```sql
CREATE TABLE jobs (
  id SERIAL PRIMARY KEY,
  job_id VARCHAR(255) UNIQUE NOT NULL,  -- BullMQ job ID
  job_type VARCHAR(100) NOT NULL,       -- e.g., 'email', 'notification'
  status VARCHAR(50) NOT NULL,          -- 'pending', 'processing', 'completed', 'failed'
  job_data JSONB,                        -- Original job data
  result JSONB,                          -- Processing result
  error_message TEXT,                    -- Error if failed
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP
);

CREATE INDEX idx_jobs_status ON jobs(status);
CREATE INDEX idx_jobs_job_id ON jobs(job_id);
CREATE INDEX idx_jobs_created_at ON jobs(created_at);
```

### 5. **BullMQ Dashboard (Optional)**

- **Purpose**: Visual monitoring of queues and jobs
- **Tool**: Bull Board or similar
- **Port**: 3002

## Technology Stack

- **Next.js**: React framework for the application
- **BullMQ**: Redis-based queue system for Node.js
- **Redis**: In-memory data store and message broker
- **PostgreSQL**: Relational database for persistent storage
- **Docker Compose**: Container orchestration
- **TypeScript**: Type safety (recommended)
- **Node.js**: Runtime for worker services
- **Shared Package**: Monorepo-style shared codebase for database client and types
- **dotenv**: Environment variable management

## Docker Compose Services

### Services Structure

```yaml
services:
  redis:
    - Redis server for queues and pub/sub
    - Port: 6379

  postgres:
    - PostgreSQL database for job results
    - Port: 5432
    - Persistent volume for data
    - Environment variables from .env

  nextjs-app:
    - Main Next.js application (publisher only)
    - Publishes jobs to queues
    - Reads results from PostgreSQL
    - Port: 3000
    - Uses shared database client from shared/
    - Environment variables from .env
    - Separate Dockerfile (Next.js dependencies only)

  worker:
    - Dedicated Node.js worker service
    - Consumes jobs from queues
    - Writes results to PostgreSQL
    - Uses shared database client from shared/
    - Environment variables from .env
    - Separate Dockerfile (Worker dependencies only)
    - Can scale horizontally (docker-compose scale)
```

### Docker Compose Configuration Details

The `docker-compose.yml` will:

1. Load environment variables from root `.env` file
2. Build shared package first
3. Build Next.js and worker services (each with their own Dockerfile)
4. Mount shared code or copy it into containers
5. Pass environment variables to all services

Example structure:

```yaml
services:
  postgres:
    image: postgres:15
    environment:
      POSTGRES_USER: ${POSTGRES_USER}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      POSTGRES_DB: ${POSTGRES_DB}
    env_file:
      - .env

  nextjs-app:
    build:
      context: .
      dockerfile: nextjs-app/Dockerfile
    env_file:
      - .env
    depends_on:
      - postgres
      - redis

  worker:
    build:
      context: .
      dockerfile: worker/Dockerfile
    env_file:
      - .env
    depends_on:
      - postgres
      - redis
```

## BullMQ Pub/Sub Pattern

### Key Concepts

1. **Queues**: Named queues for job processing
   - Example: `email-queue`, `notification-queue`

2. **Publishers**: Create and add jobs to queues

   ```typescript
   await emailQueue.add('send-email', { to, subject, body });
   ```

3. **Workers**: Process jobs from queues and persist results

   ```typescript
   emailQueue.process(async (job) => {
     // Process job
     const result = await processEmail(job.data);
     // Write to PostgreSQL
     await db.jobs.create({ jobId: job.id, result, status: 'completed' });
   });
   ```

4. **Events**: Pub/sub for real-time notifications (optional)
   - `job:completed`, `job:failed`, `job:progress`
   - Can be used for monitoring/logging

### Use Cases to Demonstrate

1. **Job Queue Pattern**
   - Send email notifications
   - Process image uploads
   - Generate reports

2. **Data Persistence**
   - Workers write job results to PostgreSQL
   - Job status and outcomes stored in database
   - Historical job tracking and analytics

3. **Worker Scaling**
   - Multiple workers processing same queue
   - Load distribution
   - Horizontal scaling

## Data Flow

### Publishing a Job

1. User triggers action via Next.js UI/API
2. Next.js API route creates job in BullMQ queue
3. Job stored in Redis queue
4. Worker(s) pick up job from queue
5. Worker processes job
6. Worker writes result to PostgreSQL database
7. Job status updated in database (completed/failed)
8. Next.js can query database to display results

### Database Write Flow

1. Worker picks up job from queue
2. Worker executes job processing logic
3. Worker creates/updates record in PostgreSQL
4. Database stores:
   - Job ID (from BullMQ)
   - Job type and data
   - Processing result
   - Status (pending, processing, completed, failed)
   - Timestamps
   - Error messages (if failed)
5. Next.js queries database to show job status/results

## File Structure

```
/
├── docker-compose.yml
├── .env                                    # Shared environment variables
├── .env.example                           # Example environment variables
├── shared/                                # Shared codebase
│   ├── package.json                       # Shared package dependencies
│   ├── tsconfig.json                      # TypeScript config for shared code
│   ├── src/
│   │   ├── db/
│   │   │   ├── client.ts                  # Shared PostgreSQL client
│   │   │   ├── schema.ts                  # Database schema definitions
│   │   │   └── migrations/                # Database migrations
│   │   ├── types/
│   │   │   ├── job.ts                     # Shared job type definitions
│   │   │   ├── database.ts                # Database type definitions
│   │   │   └── index.ts
│   │   └── index.ts                       # Shared exports
│   └── Dockerfile                         # Dockerfile for building shared package
├── nextjs-app/
│   ├── app/
│   │   ├── api/
│   │   │   ├── jobs/
│   │   │   │   ├── route.ts              # Create jobs endpoint
│   │   │   │   └── [id]/
│   │   │   │       └── route.ts          # Get job status/results
│   │   │   └── results/
│   │   │       └── route.ts              # Query job results from DB
│   │   ├── page.tsx                       # Main UI
│   │   └── layout.tsx
│   ├── lib/
│   │   ├── queues/
│   │   │   ├── email-queue.ts             # Queue definitions
│   │   │   └── index.ts
│   │   └── redis/
│   │       └── client.ts                 # Redis connection (Next.js specific)
│   ├── Dockerfile                         # Next.js specific Dockerfile
│   ├── package.json                       # Next.js dependencies only
│   └── next.config.js
├── worker/
│   ├── src/
│   │   ├── index.ts                       # Worker entry point
│   │   ├── processors/
│   │   │   ├── email-processor.ts         # Job processors
│   │   │   └── index.ts
│   │   └── lib/
│   │       └── redis.ts                   # Redis connection (worker specific)
│   ├── Dockerfile                         # Worker specific Dockerfile
│   └── package.json                       # Worker dependencies only
└── README.md
```

### Shared Codebase Architecture

The `shared/` directory contains code that is used by both the Next.js app and worker services:

- **Database Client**: PostgreSQL connection and query utilities
- **Type Definitions**: Shared TypeScript types for jobs, database schemas, etc.
- **Database Schema**: Type-safe database schema definitions

Both Next.js and workers import from the shared package:

```typescript
// In Next.js or Worker
import { db } from '@shared/db/client';
import { JobStatus, JobType } from '@shared/types';
```

### Shared Code Integration

#### Build Strategy

1. **Shared Package**: Built as a TypeScript package that exports database client and types
2. **Next.js Dockerfile**:
   - Copies shared code into container
   - Installs only Next.js dependencies
   - References shared code via relative imports or workspace setup

3. **Worker Dockerfile**:
   - Copies shared code into container
   - Installs only worker dependencies (BullMQ, etc.)
   - References shared code via relative imports or workspace setup

#### Example Dockerfile Structure

**Next.js Dockerfile** (`nextjs-app/Dockerfile`):

```dockerfile
FROM node:18-alpine AS base
WORKDIR /app

# Copy shared code
COPY shared/ ./shared/

# Copy Next.js app
COPY nextjs-app/ ./nextjs-app/

# Install only Next.js dependencies
WORKDIR /app/nextjs-app
RUN npm install

# Build Next.js app
RUN npm run build

# Production image
FROM node:18-alpine AS runner
WORKDIR /app
COPY --from=base /app/nextjs-app ./
COPY --from=base /app/shared ./shared
CMD ["npm", "start"]
```

**Worker Dockerfile** (`worker/Dockerfile`):

```dockerfile
FROM node:18-alpine AS base
WORKDIR /app

# Copy shared code
COPY shared/ ./shared/

# Copy worker code
COPY worker/ ./worker/

# Install only worker dependencies
WORKDIR /app/worker
RUN npm install

# Production image
FROM node:18-alpine AS runner
WORKDIR /app
COPY --from=base /app/worker ./
COPY --from=base /app/shared ./shared
CMD ["npm", "start"]
```

#### Package.json Setup

Both Next.js and worker `package.json` files reference the shared code:

```json
{
  "dependencies": {
    "@shared/db": "file:../shared",
    // ... other dependencies
  }
}
```

Or using TypeScript path mapping in `tsconfig.json`:

```json
{
  "compilerOptions": {
    "paths": {
      "@shared/*": ["../shared/src/*"]
    }
  }
}
```

### Dockerfile Strategy

Each service has its own Dockerfile to minimize dependencies:

- **Next.js Dockerfile**: Only includes Next.js runtime dependencies
- **Worker Dockerfile**: Only includes Node.js and BullMQ dependencies
- **Shared Package**: Built separately and copied into both containers

This ensures:

- Smaller container images
- Faster builds
- No unnecessary dependencies in each service
- Shared code is compiled once and reused

## Key Features to Demonstrate

### 1. **Job Publishing**

- API endpoint to create jobs
- Different job types (email, notification, etc.)
- Job priorities and delays

### 2. **Job Processing**

- Worker processes jobs from queue
- Retry logic for failed jobs
- Job progress tracking

### 3. **Data Persistence**

- Workers write job results to PostgreSQL
- Job history and status tracking
- Query job results via API

### 4. **Monitoring**

- Queue status dashboard
- Job statistics
- Worker health

### 5. **Scaling**

- Multiple worker instances
- Load balancing across workers
- Horizontal scaling demonstration

## Environment Variables

### Shared .env File

A single `.env` file at the root is used by both Next.js and worker services via Docker Compose:

```env
# Redis Configuration
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=  # Optional

# PostgreSQL Configuration
POSTGRES_HOST=postgres
POSTGRES_PORT=5432
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_DB=bullmq_jobs

# Database Connection String
# Used by shared database client
DATABASE_URL=postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@${POSTGRES_HOST}:${POSTGRES_PORT}/${POSTGRES_DB}

# Next.js Public Variables
NEXT_PUBLIC_API_URL=http://localhost:3000

# Environment
NODE_ENV=development
```

### Environment Variable Usage

- **Docker Compose**: Reads `.env` file and makes variables available to all services
- **Next.js**: Accesses via `process.env` (server-side) and `process.env.NEXT_PUBLIC_*` (client-side)
- **Workers**: Accesses via `process.env`
- **Shared Database Client**: Uses `DATABASE_URL` from environment

### .env.example

```env
# Redis Configuration
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=

# PostgreSQL Configuration
POSTGRES_HOST=postgres
POSTGRES_PORT=5432
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_DB=bullmq_jobs

# Database Connection String
DATABASE_URL=postgresql://postgres:postgres@postgres:5432/bullmq_jobs

# Next.js Public Variables
NEXT_PUBLIC_API_URL=http://localhost:3000

# Environment
NODE_ENV=development
```

## Implementation Phases

### Phase 1: Basic Setup

- Create shared codebase structure (`shared/` directory)
- Set up shared database client and types
- Create `.env` file with PostgreSQL connection details
- Docker Compose with Redis, PostgreSQL
- Basic Redis connection
- PostgreSQL database setup with schema
- Simple queue creation

### Phase 2: Shared Codebase

- Implement shared PostgreSQL client in `shared/src/db/`
- Define shared TypeScript types in `shared/src/types/`
- Create shared package.json with database dependencies
- Set up TypeScript configuration for shared code
- Build shared package Dockerfile

### Phase 3: Next.js Publisher

- Create Next.js app structure
- Set up Next.js Dockerfile (minimal dependencies)
- Import shared database client and types
- API routes to create jobs
- UI to trigger jobs
- Job creation with different types
- Query database using shared client

### Phase 4: Worker Service

- Create worker service structure
- Set up worker Dockerfile (minimal dependencies)
- Import shared database client and types
- Standalone worker service setup
- Worker processes jobs from queue
- Write job results to PostgreSQL using shared client
- Error handling and retries

### Phase 5: Data Persistence

- Database schema for jobs and results (in shared/)
- Worker writes job outcomes to database
- API endpoints to query job results (using shared client)
- UI displays job status from database

### Phase 6: Monitoring & Scaling

- Bull Board integration
- Multiple worker instances
- Performance metrics
- Database query optimization
- Verify shared code works correctly in both services

## Benefits of This Architecture

1. **Scalability**: Workers can scale independently from Next.js app
2. **Reliability**: Jobs persist in Redis, survive restarts
3. **Data Persistence**: Job results stored in PostgreSQL for historical tracking
4. **Decoupling**: Publishers and workers are completely decoupled
5. **Separation of Concerns**: Next.js handles UI/API, workers handle processing
6. **Code Reuse**: Shared database client and types ensure consistency
7. **Type Safety**: Shared TypeScript types prevent type mismatches
8. **Minimal Dependencies**: Separate Dockerfiles keep containers lean
9. **Single Source of Truth**: Database schema and types defined once
10. **Easy Maintenance**: Changes to database client affect both services automatically
11. **Monitoring**: Built-in queue monitoring capabilities + database queries
12. **Resilience**: Retry mechanisms and error handling with persistent state
13. **Data Integrity**: PostgreSQL ensures ACID compliance for job results

## Next Steps

1. Create shared codebase structure (`shared/` directory)
2. Implement shared PostgreSQL client with connection string from `.env`
3. Define shared TypeScript types for jobs and database
4. Create `.env` file with PostgreSQL connection details
5. Set up Docker Compose configuration (Redis, PostgreSQL, Next.js, Worker)
6. Create separate Dockerfiles for Next.js and worker (minimal dependencies)
7. Create PostgreSQL database schema in shared codebase
8. Create Next.js application structure (publisher only, imports shared code)
9. Implement Redis connection and queue setup
10. Build publisher API endpoints (using shared database client)
11. Create standalone worker service (imports shared code)
12. Implement worker processors with database writes (using shared client)
13. Add API endpoints to query job results from database
14. Create monitoring dashboard
15. Test scaling with multiple worker instances
16. Verify shared code works correctly in both services
