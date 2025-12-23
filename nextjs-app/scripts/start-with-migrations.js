const { spawn } = require('child_process');
const path = require('path');
const { readFileSync } = require('fs');
const { Pool } = require('pg');

async function runMigrations() {
  try {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      console.error('DATABASE_URL not set, skipping migrations');
      return;
    }

    const pool = new Pool({ connectionString });

    // Determine migrations directory
    const cwd = process.cwd();
    let migrationsDir;
    if (cwd.endsWith('nextjs-app')) {
      migrationsDir = path.join(cwd, '..', 'migrations');
    } else {
      migrationsDir = path.join(cwd, 'migrations');
    }

    // Create migrations table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version VARCHAR(255) PRIMARY KEY,
        applied_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      )
    `);

    // Check if migration already ran
    const result = await pool.query(
      'SELECT version FROM schema_migrations WHERE version = $1',
      ['001_create_jobs_table']
    );

    if (result.rows.length === 0) {
      console.log('Running migration: 001_create_jobs_table');

      // Read and run migration
      const migrationFile = path.join(migrationsDir, '001_create_jobs_table.sql');
      const migrationSQL = readFileSync(migrationFile, 'utf-8');

      await pool.query(migrationSQL);

      // Record migration
      await pool.query(
        'INSERT INTO schema_migrations (version) VALUES ($1)',
        ['001_create_jobs_table']
      );

      console.log('Migration completed successfully');
    } else {
      console.log('Migration 001_create_jobs_table already applied');
    }

    await pool.end();
  } catch (error) {
    console.error('Migration error:', error);
    // Don't exit - let the app start anyway in case migrations already ran
    console.log('Continuing with app startup...');
  }
}

async function start() {
  console.log('Running database migrations...');
  await runMigrations();

  console.log('Starting Next.js app...');
  const nextProcess = spawn('npm', ['start'], {
    stdio: 'inherit',
    shell: true,
    cwd: path.join(__dirname, '..'),
  });

  nextProcess.on('error', (error) => {
    console.error('Failed to start Next.js:', error);
    process.exit(1);
  });

  nextProcess.on('exit', (code) => {
    process.exit(code || 0);
  });
}

start();
