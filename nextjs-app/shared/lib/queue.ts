import { Queue } from 'bullmq';
import { JobData, CreateJobInput } from '../types';

// Queue instances cache
const queues = new Map<string, Queue>();

export function getQueue(queueName: string): Queue {
  if (!queues.has(queueName)) {
    const queue = new Queue(queueName, {
      connection: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379', 10),
      },
    });

    queues.set(queueName, queue);
  }

  return queues.get(queueName)!;
}

export async function publishJob(
  queueName: string,
  jobData: JobData,
  options?: {
    delay?: number;
    attempts?: number;
    backoff?: {
      type: 'fixed' | 'exponential';
      delay: number;
    };
  }
): Promise<string> {
  const queue = getQueue(queueName);

  const job = await queue.add(
    queueName,
    jobData,
    {
      delay: options?.delay,
      attempts: options?.attempts || 3,
      backoff: options?.backoff || {
        type: 'exponential',
        delay: 2000,
      },
    }
  );

  return job.id!;
}

export async function publishEmailJob(
  input: CreateJobInput,
  options?: {
    delay?: number;
    attempts?: number;
  }
): Promise<string> {
  const jobData: JobData = {
    jobId: input.jobId,
    jobType: input.jobType,
    status: 'pending',
    jobData: input.jobData,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  return publishJob('email', jobData, options);
}

export async function closeQueues(): Promise<void> {
  for (const queue of queues.values()) {
    await queue.close();
  }
  queues.clear();
}
