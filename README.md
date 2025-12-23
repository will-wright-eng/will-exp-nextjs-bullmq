# BullMQ Pub/Sub Pattern with Next.js

A prototype demonstrating the BullMQ pub/sub pattern within a Next.js application using Docker Compose. The system showcases how a Next.js application publishes jobs to Redis-backed queues, which are then processed by dedicated worker services that persist results to PostgreSQL.

## Architecture

```
┌─────────────────┐         ┌──────────┐
│   Next.js App   │────────▶│  Redis   │
│   (Publisher)   │  Pub    │          │
└─────────┬───────┘         └─────────┬┘
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

## Technology Stack

- **Next.js 14**: React framework for the web application
- **BullMQ**: Redis-based queue system for job processing
- **Redis**: Message broker and queue storage
- **PostgreSQL**: Persistent storage for job results
- **Docker Compose**: Container orchestration
- **TypeScript**: Type safety across the codebase

## Directory Structure

```
/
├── docker-compose.yml          # Docker Compose configuration
├── Makefile                    # Convenience commands
├── .env                        # Environment variables (create from .env.example)
├── migrations/                 # Database migrations
│   └── 001_create_jobs_table.sql
├── nextjs-app/                 # Next.js application (publisher)
│   ├── app/
│   │   ├── api/
│   │   │   └── jobs/
│   │   │       └── route.ts    # Job creation and query endpoints
│   │   ├── page.tsx            # Main UI
│   │   └── layout.tsx
│   ├── shared/                 # Shared code (used by both app and worker)
│   │   ├── db/
│   │   │   └── client.ts       # PostgreSQL client
│   │   ├── lib/
│   │   │   ├── queue.ts        # Queue setup and publishing
│   │   │   └── redis.ts        # Redis connection
│   │   └── types/
│   │       └── index.ts        # Shared TypeScript types
│   ├── worker/                 # Worker code (runs in Next.js container)
│   │   ├── index.ts            # Worker entry point
│   │   ├── processors/
│   │   │   └── email-processor.ts
│   │   └── lib/
│   │       └── redis.ts
│   ├── Dockerfile
│   └── package.json
├── worker/                     # Standalone worker service
│   ├── Dockerfile
│   └── package.json
└── docs/
    └── design-document.md      # Detailed architecture documentation
```

## Quick Start

### Prerequisites

- Docker and Docker Compose installed
- Node.js 24+ (for local development)
- Make (optional, for convenience commands)

### 1. Environment Setup

Create a `.env` file in the root directory:

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

### 2. Start Services

Using Make (recommended):

```bash
make quick-start
```

Or using Docker Compose directly:

```bash
docker compose up --build
```

This will:

- Build Docker images for Next.js app and worker
- Start Redis, PostgreSQL, Next.js app, and worker services
- Run database migrations automatically

### 3. Access the Application

- **Next.js App**: <http://localhost:3000>
- **Redis**: localhost:6379
- **PostgreSQL**: localhost:5432

### 4. Create a Job

Use the API endpoint to create a job:

```bash
curl -X POST http://localhost:3000/api/jobs \
  -H "Content-Type: application/json" \
  -d '{
    "jobType": "email",
    "jobData": {
      "to": "user@example.com",
      "subject": "Test Email",
      "body": "Hello from BullMQ!"
    }
  }'
```

### 5. Query Job Status

```bash
# Get all jobs
curl http://localhost:3000/api/jobs | jq .

# Get specific job
curl http://localhost:3000/api/jobs?jobId=<job-id>

# Filter by status
curl http://localhost:3000/api/jobs?status=completed
```

## Available Commands

### Using Make

```bash
make help              # Show all available commands
make quick-start       # Install, build, and start all services
make up                # Start all services
make down              # Stop all services
make logs              # View logs from all services
make logs-follow       # Follow logs from all services
make worker-logs        # View worker logs
make nextjs-logs       # View Next.js app logs
make redis-cli         # Open Redis CLI
make psql              # Open PostgreSQL CLI
make scale-worker      # Scale workers to 2 instances
make clean             # Clean up containers and volumes
```

### Using Docker Compose

```bash
docker compose up              # Start services
docker compose down            # Stop services
docker compose logs -f         # Follow logs
docker compose up --scale worker=2  # Scale workers
```

## How It Works

1. **Job Creation**: Next.js app receives a request to create a job via `/api/jobs` endpoint
2. **Database Record**: A job record is created in PostgreSQL with status `pending`
3. **Queue Publishing**: The job is published to a BullMQ queue in Redis
4. **Job Processing**: Worker service picks up the job from the queue
5. **Result Persistence**: Worker processes the job and writes the result back to PostgreSQL
6. **Status Updates**: Job status is updated to `completed` or `failed` in the database

## Job Types

Currently supported job types:

- `email`: Email processing jobs
- `notification`: Notification jobs
- `report`: Report generation jobs

## Scaling Workers

Scale workers horizontally to process more jobs:

```bash
docker compose up --scale worker=2
```

Or use the Make command:

```bash
make scale-worker
```

## Development

### Local Development (without Docker)

1. Install dependencies:

   ```bash
   cd nextjs-app && npm install
   cd ../worker && npm install
   ```

2. Start Redis and PostgreSQL (using Docker Compose):

   ```bash
   docker compose up redis postgres
   ```

3. Run Next.js app:

   ```bash
   cd nextjs-app && npm run dev
   ```

4. Run worker:

   ```bash
   cd worker && npm run dev
   ```

## Database Migrations

Migrations are automatically run when the Next.js app starts. The migration file is located at `migrations/001_create_jobs_table.sql`.

## Monitoring

- **Redis**: Use `make redis-cli` to inspect queues
- **PostgreSQL**: Use `make psql` to query job records
- **Logs**: Use `make logs-follow` to monitor all services

## Troubleshooting

### Services won't start

- Ensure Docker is running
- Check if ports 3000, 5432, and 6379 are available
- Verify `.env` file exists and has correct values

### Database connection errors

- Ensure PostgreSQL container is healthy: `docker compose ps`
- Check database credentials in `.env`
- Verify `DATABASE_URL` is correctly formatted

### Jobs not processing

- Check worker logs: `make worker-logs`
- Verify Redis connection: `make redis-cli` then `PING`
- Ensure worker container is running: `docker compose ps`

## Learn More

For detailed architecture and design decisions, see [docs/design-document.md](docs/design-document.md).
