import { pool } from '../db';
import { migrate } from '../migrate';

export async function setupTestDb() {
  await migrate();
}

export async function clearTables() {
  await pool.query('TRUNCATE sessions, session_songs, session_techniques, songs, techniques RESTART IDENTITY CASCADE');
}

export async function teardownTestDb() {
  await pool.end();
}
