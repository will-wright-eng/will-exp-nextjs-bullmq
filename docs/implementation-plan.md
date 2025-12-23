# Implementation Plan - BullMQ Pub/Sub Pattern with Next.js

## Overview

This document compares the current implementation against the design document and outlines the remaining work to complete the BullMQ pub/sub pattern prototype.

**Last Updated:** 2025-12-23

## Current Implementation Status

### ✅ Completed Components

1. **Infrastructure & Configuration**
   - ✅ Docker Compose setup (Redis, PostgreSQL, Next.js, Worker)
   - ✅ Next.js Dockerfile (updated for shared code location)
   - ✅ Worker Dockerfile (updated for shared code location)
   - ✅ Makefile with build/dev commands
   - ✅ TypeScript configurations for all services
   - ✅ Shared codebase moved to `nextjs-app/shared/`

2. **Shared Codebase**
   - ✅ PostgreSQL client (`shared/src/db/client.ts`)
   - ✅ TypeScript types (`shared/src/types/index.ts`)
     - JobStatus, JobType, JobData, CreateJobInput
   - ✅ Shared package.json with dependencies
   - ✅ TypeScript path mappings configured

3. **Worker Service**
   - ✅ Worker entry point (`worker/src/index.ts`)
   - ✅ Email processor (`worker/src/processors/email-processor.ts`)
   - ✅ Worker initialization and graceful shutdown
   - ✅ Database connection integration
   - ✅ BullMQ Worker setup for 'email' queue
   - ✅ Job event handlers (completed, failed, error)

### ❌ Missing Components

1. **Database Schema & Migrations**
   - ❌ Database migration files
   - ❌ Jobs table schema
   - ❌ Database indexes
   - ❌ Schema initialization on container startup

2. **Next.js Publisher Application**
   - ❌ Redis client for Next.js (`lib/redis/client.ts`)
   - ❌ Queue definitions (`lib/queues/email-queue.ts`)
   - ❌ API routes:
     - ❌ POST `/api/jobs` - Create jobs
     - ❌ GET `/api/jobs/[id]` - Get job status/results
     - ❌ GET `/api/results` - Query job results
   - ❌ UI components:
     - ❌ Job creation form
     - ❌ Job list/results display
     - ❌ Job status indicators

3. **Data Flow Implementation**
   - ❌ Job creation in database before adding to queue
   - ❌ Proper job data structure matching BullMQ JobData
   - ❌ Worker job ID to database job ID mapping

4. **Additional Features**
   - ❌ Retry logic configuration
   - ❌ Additional job processors (notification, report)
   - ❌ Bull Board dashboard integration
   - ❌ Error handling improvements
   - ❌ Job progress tracking

5. **Documentation & Configuration**
   - ❌ .env.example file
   - ❌ README.md with setup instructions
   - ❌ Database schema documentation

## Implementation Tasks

### Phase 1: Database Schema & Migrations (HIGH PRIORITY)

**Status:** 🔴 Not Started

**Tasks:**

1. Create initial database migration file
   - File: `nextjs-app/shared/src/db/migrations/001_create_jobs_table.sql`
   - Create `jobs` table with schema from design doc
   - Add indexes (status, job_id, created_at)
   - Add triggers for `updated_at` timestamp if needed

2. Update docker-compose.yml if needed
   - Verify migration volume mount is correct
   - Ensure migrations run on PostgreSQL init

3. Test database schema creation
   - Verify table creation in development
   - Test indexes are created
   - Verify migration runs on fresh database

**Acceptance Criteria:**

- [ ] Jobs table exists with correct schema
- [ ] All indexes are created
- [ ] Migrations run automatically on container start
- [ ] Schema matches design document specification

---

### Phase 2: Next.js Queue Infrastructure (HIGH PRIORITY)

**Status:** 🔴 Not Started

**Tasks:**

1. Create Redis client for Next.js
   - File: `nextjs-app/lib/redis/client.ts`
   - Connection using ioredis
   - Environment variable configuration
   - Connection error handling

2. Create email queue definition
   - File: `nextjs-app/lib/queues/email-queue.ts`
   - Queue instance with Redis connection
   - Queue configuration (default job options, etc.)
   - Export queue instance

3. Create queue index file
   - File: `nextjs-app/lib/queues/index.ts`
   - Export all queues

4. Update Next.js package.json if needed
   - Verify bullmq and ioredis dependencies

**Acceptance Criteria:**

- [ ] Redis client connects successfully
- [ ] Email queue can be imported and used
- [ ] Queue configuration matches worker expectations
- [ ] Connection uses environment variables

---

### Phase 3: API Routes - Job Creation (HIGH PRIORITY)

**Status:** 🔴 Not Started

**Tasks:**

1. Create POST `/api/jobs` route
   - File: `nextjs-app/app/api/jobs/route.ts`
   - Accept CreateJobInput from request body
   - Validate input data
   - Generate unique job ID (UUID)
   - Create job record in database (status: 'pending')
   - Add job to BullMQ queue with job data
   - Return job ID and status

2. Error handling
   - Database errors
   - Queue errors
   - Validation errors

3. Test job creation
   - Verify database record created
   - Verify job added to queue
   - Verify worker picks up job

**Acceptance Criteria:**

- [ ] API accepts job creation requests
- [ ] Job record created in database with 'pending' status
- [ ] Job added to BullMQ queue
- [ ] Proper error responses
- [ ] Job ID returned to client

---

### Phase 4: API Routes - Job Status & Results (HIGH PRIORITY)

**Status:** 🔴 Not Started

**Tasks:**

1. Create GET `/api/jobs/[id]` route
   - File: `nextjs-app/app/api/jobs/[id]/route.ts`
   - Query database for job by ID
   - Return job status, data, result, error message
   - Return 404 if job not found

2. Create GET `/api/results` route
   - File: `nextjs-app/app/api/results/route.ts`
   - Query parameters: status, jobType, limit, offset
   - Query database for jobs with filters
   - Return array of jobs
   - Pagination support

3. Add proper TypeScript types
   - API response types
   - Query parameter types

**Acceptance Criteria:**

- [ ] Can query job by ID
- [ ] Can list jobs with filters
- [ ] Proper error handling (404, 500)
- [ ] Response types are type-safe

---

### Phase 5: Fix Worker-Database Integration (HIGH PRIORITY)

**Status:** 🟡 Partially Complete - Needs Fixes

**Current Issues:**

- Worker processor expects `job.data.jobId` but BullMQ job ID is separate
- Database schema uses `job_id` (BullMQ ID) but processor uses `id` field
- Job creation flow not implemented (no database record before queue)

**Tasks:**

1. Update worker processor
   - Map BullMQ `job.id` to database `job_id`
   - Use BullMQ job ID for database queries
   - Fix job data structure expectations

2. Update database schema understanding
   - Clarify: `id` is database primary key
   - `job_id` is BullMQ job ID (UUID)
   - Ensure processor uses correct field

3. Test end-to-end flow
   - Create job via API
   - Verify worker processes job
   - Verify database updates correctly

**Acceptance Criteria:**

- [ ] Worker correctly maps BullMQ job ID to database
- [ ] Database updates work correctly
- [ ] Job status transitions: pending → processing → completed/failed
- [ ] Error messages stored correctly

---

### Phase 6: Next.js UI Components (MEDIUM PRIORITY)

**Status:** 🔴 Not Started

**Tasks:**

1. Create job creation form component
   - File: `nextjs-app/app/components/create-job-form.tsx`
   - Job type selection (email, notification, report)
   - Job data input (JSON or form fields)
   - Submit to POST `/api/jobs`
   - Success/error feedback

2. Create job list component
   - File: `nextjs-app/app/components/job-list.tsx`
   - Display jobs from GET `/api/results`
   - Status indicators (pending, processing, completed, failed)
   - Refresh functionality
   - Filter by status/job type

3. Create job detail view
   - File: `nextjs-app/app/components/job-detail.tsx`
   - Show job details from GET `/api/jobs/[id]`
   - Display job data, result, error message
   - Status badge
   - Timestamps

4. Update main page
   - File: `nextjs-app/app/page.tsx`
   - Integrate job creation form
   - Display job list
   - Add navigation/routing if needed

5. Add styling
   - Use Tailwind CSS or similar
   - Modern, clean UI
   - Responsive design

**Acceptance Criteria:**

- [ ] Can create jobs via UI
- [ ] Can view job list
- [ ] Can view job details
- [ ] UI updates when job status changes
- [ ] Professional, modern design

---

### Phase 7: Additional Job Types (MEDIUM PRIORITY)

**Status:** 🔴 Not Started

**Tasks:**

1. Create notification processor
   - File: `worker/src/processors/notification-processor.ts`
   - Process notification jobs
   - Update database status

2. Create report processor
   - File: `worker/src/processors/report-processor.ts`
   - Process report generation jobs
   - Update database status

3. Create notification queue
   - File: `nextjs-app/lib/queues/notification-queue.ts`

4. Create report queue
   - File: `nextjs-app/lib/queues/report-queue.ts`

5. Update worker index.ts
   - Add notification worker
   - Add report worker

6. Update API routes
   - Support notification and report job types

**Acceptance Criteria:**

- [ ] All job types can be created via API
- [ ] Workers process all job types
- [ ] Database correctly stores all job types

---

### Phase 8: Error Handling & Retries (MEDIUM PRIORITY)

**Status:** 🟡 Partially Complete - Needs Enhancement

**Tasks:**

1. Add retry configuration to queues
   - Retry attempts
   - Retry delays
   - Backoff strategy

2. Improve worker error handling
   - Better error messages
   - Error logging
   - Error context preservation

3. Add job failure notifications
   - Log failed jobs
   - Optional: send alerts

**Acceptance Criteria:**

- [ ] Failed jobs retry with backoff
- [ ] Error messages are informative
- [ ] Failed jobs properly tracked in database

---

### Phase 9: Bull Board Dashboard (LOW PRIORITY)

**Status:** 🔴 Not Started

**Tasks:**

1. Install Bull Board
   - Add to Next.js or separate service
   - Configure with queue connections

2. Set up dashboard route
   - `/dashboard` or separate port
   - Display queue status
   - Show job statistics

3. Configure queue access
   - Connect to all queues
   - Display real-time updates

**Acceptance Criteria:**

- [ ] Dashboard accessible
- [ ] Shows queue status
- [ ] Shows job statistics
- [ ] Real-time updates work

---

### Phase 10: Documentation & Configuration (MEDIUM PRIORITY)

**Status:** 🔴 Not Started

**Tasks:**

1. Create .env.example file
   - All required environment variables
   - Example values
   - Comments explaining each variable

2. Update README.md
   - Project overview
   - Setup instructions
   - Development workflow
   - API documentation
   - Architecture overview

3. Add inline code comments
   - Complex logic explanations
   - Architecture decisions
   - Usage examples

**Acceptance Criteria:**

- [ ] .env.example file exists
- [ ] README has complete setup instructions
- [ ] Code is well-commented
- [ ] API endpoints documented

---

## Priority Order for Implementation

1. **Phase 1** - Database Schema (BLOCKER: Nothing works without DB)
2. **Phase 2** - Queue Infrastructure (BLOCKER: Can't create jobs)
3. **Phase 3** - Job Creation API (BLOCKER: Can't test end-to-end)
4. **Phase 5** - Fix Worker Integration (BLOCKER: Jobs won't process correctly)
5. **Phase 4** - Job Status API (HIGH: Need to see results)
6. **Phase 6** - UI Components (HIGH: Makes system usable)
7. **Phase 7** - Additional Job Types (MEDIUM: Expands functionality)
8. **Phase 8** - Error Handling (MEDIUM: Improves reliability)
9. **Phase 10** - Documentation (MEDIUM: Improves maintainability)
10. **Phase 9** - Bull Board (LOW: Nice to have)

## Design Document Compliance Check

### Architecture Compliance

- ✅ Shared codebase structure (moved to nextjs-app/shared/)
- ✅ Docker Compose services configured
- ✅ Separate Dockerfiles for each service
- ✅ TypeScript configuration
- ⚠️ Shared code location differs from design (in nextjs-app/ instead of root)

### Component Compliance

- ✅ Redis server configured
- ⚠️ Next.js app structure exists but lacks functionality
- ✅ Worker service implemented
- ⚠️ PostgreSQL configured but schema missing
- ❌ Bull Board dashboard not implemented

### Data Flow Compliance

- ❌ Publishing flow not implemented (no API routes)
- ⚠️ Worker processing partially implemented (needs fixes)
- ⚠️ Database write flow partially implemented (schema missing)
- ❌ Result querying not implemented

### File Structure Compliance

- ✅ Most directories exist
- ❌ Missing: API route files
- ❌ Missing: Queue definition files
- ❌ Missing: Migration files
- ❌ Missing: Redis client for Next.js
- ❌ Missing: UI components

## Key Differences from Design Document

1. **Shared Directory Location**: Design doc shows `shared/` at root, but it's now in `nextjs-app/shared/`. This is intentional per user request and all paths have been updated.

2. **Database Schema**: Design doc specifies schema but migrations not yet created.

3. **Job ID Mapping**: Need to clarify how BullMQ job IDs map to database records. Design doc shows `job_id` field should store BullMQ job ID.

4. **Queue Naming**: Worker uses 'email' queue name directly, but design doc suggests `email-queue`. Need to standardize.

## Next Immediate Steps

1. **Create database migration** - Highest priority blocker
2. **Create Redis client and queue for Next.js** - Required for job creation
3. **Implement POST /api/jobs route** - Enables job creation
4. **Fix worker database integration** - Ensures jobs process correctly
5. **Implement GET /api/jobs/[id] route** - Enables job status checking

## Notes

- Worker is currently running but exits because there are no jobs to process (expected behavior)
- Database connection works but schema doesn't exist yet
- All infrastructure (Docker, Redis, PostgreSQL) is configured and running
- Shared code structure is complete and properly configured
- TypeScript types are defined but may need adjustments based on implementation
