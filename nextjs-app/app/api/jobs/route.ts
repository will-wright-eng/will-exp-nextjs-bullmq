import { NextRequest, NextResponse } from 'next/server';
import { getDbClient } from '@shared/db/client';
import { publishEmailJob } from '@shared/lib/queue';
import { CreateJobInput, JobType } from '@shared/types';
import { randomUUID } from 'crypto';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { jobType, jobData } = body;

    // Validate job type
    const validJobTypes: JobType[] = ['email', 'notification', 'report'];
    if (!jobType || !validJobTypes.includes(jobType)) {
      return NextResponse.json(
        { error: `Invalid job type. Must be one of: ${validJobTypes.join(', ')}` },
        { status: 400 }
      );
    }

    // Generate job ID
    const jobId = randomUUID();

    // Create job record in database
    const db = getDbClient();
    await db.query(
      `INSERT INTO jobs (id, job_type, status, job_data, created_at, updated_at)
       VALUES ($1, $2, $3, $4, NOW(), NOW())`,
      [jobId, jobType, 'pending', JSON.stringify(jobData || {})]
    );

    // Publish job to Redis queue
    const createJobInput: CreateJobInput = {
      jobId,
      jobType,
      jobData: jobData || {},
    };

    await publishEmailJob(createJobInput);

    return NextResponse.json(
      {
        success: true,
        jobId,
        message: 'Job created and published successfully',
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating job:', error);
    return NextResponse.json(
      {
        error: 'Failed to create job',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const jobId = searchParams.get('jobId');
    const status = searchParams.get('status');
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    const db = getDbClient();

    if (jobId) {
      // Get specific job
      const result = await db.query(
        'SELECT * FROM jobs WHERE id = $1',
        [jobId]
      );

      if (result.rows.length === 0) {
        return NextResponse.json(
          { error: 'Job not found' },
          { status: 404 }
        );
      }

      return NextResponse.json({ job: result.rows[0] });
    }

    // Get jobs with optional filters
    let query = 'SELECT * FROM jobs WHERE 1=1';
    const params: any[] = [];
    let paramIndex = 1;

    if (status) {
      query += ` AND status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    query += ` ORDER BY created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limit, offset);

    const result = await db.query(query, params);

    return NextResponse.json({
      jobs: result.rows,
      count: result.rows.length,
      limit,
      offset,
    });
  } catch (error) {
    console.error('Error fetching jobs:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch jobs',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
