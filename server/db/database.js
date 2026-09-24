import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DB_PATH = path.join(__dirname, 'gantt_platform.db');
const SCHEMA_PATH = path.join(__dirname, 'schema.sql');

let dbInstance = null;

export function getDatabase() {
  if (dbInstance) {
    return dbInstance;
  }

  const isNew = !fs.existsSync(DB_PATH);
  dbInstance = new DatabaseSync(DB_PATH);
  
  // Enable WAL mode, foreign keys, and busy timeout
  dbInstance.exec('PRAGMA journal_mode = WAL;');
  dbInstance.exec('PRAGMA foreign_keys = ON;');
  dbInstance.exec('PRAGMA busy_timeout = 5000;');

  // Run schema migration
  const schemaSql = fs.readFileSync(SCHEMA_PATH, 'utf-8');
  dbInstance.exec(schemaSql);

  return dbInstance;
}

export function closeDatabase() {
  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
  }
}
