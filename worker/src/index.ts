import { Worker } from 'bullmq';
import { processEmailJob } from './processors/email-processor';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { getDbClient, closeDbConnection } from './shared/db/client';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { JobData } from './shared/types';

console.log('Worker service starting...');

// Initialize database connection (verify it works)
try {
  const db = getDbClient();
  console.log('Database connection initialized');
} catch (error) {
  console.error('Failed to initialize database connection:', error);
  process.exit(1);
}

// Set up queue processors
const redisConnection = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379', 10),
};

const emailWorker = new Worker<JobData>(
  'email',
  async (job) => {
    await processEmailJob(job);
  },
  {
    connection: redisConnection,
    concurrency: 5,
  }
);

emailWorker.on('completed', (job) => {
  console.log(`Job ${job.id} completed`);
});

emailWorker.on('failed', (job, err) => {
  console.error(`Job ${job?.id} failed:`, err);
});

emailWorker.on('error', (err) => {
  console.error('Worker error:', err);
});

console.log('Email worker started, waiting for jobs...');

// Graceful shutdown
async function shutdown() {
  console.log('Shutting down worker gracefully...');

  await emailWorker.close();
  await closeDbConnection();

  console.log('Worker shut down complete');
  process.exit(0);
}

process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully...');
  shutdown();
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully...');
  shutdown();
});
