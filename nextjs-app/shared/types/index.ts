export type JobStatus = 'pending' | 'processing' | 'completed' | 'failed';

export type JobType = 'email' | 'notification' | 'report';

export interface JobData {
  jobId: string;
  jobType: JobType;
  status: JobStatus;
  jobData?: Record<string, any>;
  result?: Record<string, any>;
  errorMessage?: string;
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
}

export interface CreateJobInput {
  jobId: string;
  jobType: JobType;
  jobData?: Record<string, any>;
}
