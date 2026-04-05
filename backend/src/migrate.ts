import fs from 'fs';
import path from 'path';
import { pool } from './db';

export async function migrate() {
  const sql = fs.readFileSync(
    path.join(__dirname, 'migrations', '001_initial.sql'),
    'utf8'
  );
  await pool.query(sql);
  console.log('Migrations applied');
}
