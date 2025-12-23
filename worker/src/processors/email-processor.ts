import { Job } from 'bullmq';
import { JobData } from '../shared/types';
import { getDbClient } from '../shared/db/client';

export async function processEmailJob(job: Job<JobData>): Promise<void> {
  console.log(`Processing email job: ${job.id}`);

  const { jobId, jobData } = job.data;

  // Update job status to processing in database
  const db = getDbClient();
  await db.query(
    'UPDATE jobs SET status = $1, updated_at = NOW() WHERE id = $2',
    ['processing', jobId]
  );

  try {
    // Simulate email processing
    console.log(`Sending email for job ${jobId}:`, jobData);

    // Simulate some work
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Update job status to completed in database
    await db.query(
      'UPDATE jobs SET status = $1, completed_at = NOW(), updated_at = NOW() WHERE id = $2',
      ['completed', jobId]
    );

    console.log(`Email job ${jobId} completed successfully`);
  } catch (error) {
    console.error(`Email job ${jobId} failed:`, error);

    // Update job status to failed in database
    const errorMessage = error instanceof Error ? error.message : String(error);
    await db.query(
      'UPDATE jobs SET status = $1, error_message = $2, updated_at = NOW() WHERE id = $3',
      ['failed', errorMessage, jobId]
    );

    throw error;
  }
}
