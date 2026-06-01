import Database from 'better-sqlite3';
import { config } from '../config.js';
import fs from 'fs';
import path from 'path';

let db = null;

/**
 * Initialize database connection
 */
export function initDatabase() {
  try {
    const dbPath = config.database.path;
    const dbDir = path.dirname(dbPath);

    // Create directory if it doesn't exist
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }

    db = new Database(dbPath);
    db.pragma('journal_mode = WAL');
    console.log(`Database initialized at ${dbPath}`);
    return db;
  } catch (error) {
    console.error('Failed to initialize database:', error);
    throw error;
  }
}

/**
 * Get database instance
 */
export function getDatabase() {
  if (!db) {
    initDatabase();
  }
  return db;
}

/**
 * Execute a SELECT query
 */
export function selectAll(table, limit = 100, offset = 0) {
  const database = getDatabase();
  try {
    const query = `SELECT * FROM ${sanitizeTableName(table)} LIMIT ? OFFSET ?`;
    return database.prepare(query).all(limit, offset);
  } catch (error) {
    throw new Error(`Failed to select from ${table}: ${error.message}`);
  }
}

/**
 * Execute a SELECT query for a single record by ID
 */
export function selectById(table, id) {
  const database = getDatabase();
  try {
    const query = `SELECT * FROM ${sanitizeTableName(table)} WHERE id = ?`;
    return database.prepare(query).get(id);
  } catch (error) {
    throw new Error(`Failed to select from ${table}: ${error.message}`);
  }
}

/**
 * Execute an INSERT query
 */
export function insert(table, data) {
  const database = getDatabase();
  try {
    const columns = Object.keys(data);
    const values = Object.values(data);
    const placeholders = columns.map(() => '?').join(', ');
    
    const query = `INSERT INTO ${sanitizeTableName(table)} (${columns.join(', ')}) VALUES (${placeholders})`;
    const result = database.prepare(query).run(...values);
    
    return {
      id: result.lastInsertRowid,
      changes: result.changes,
    };
  } catch (error) {
    throw new Error(`Failed to insert into ${table}: ${error.message}`);
  }
}

/**
 * Execute an UPDATE query
 */
export function update(table, id, data) {
  const database = getDatabase();
  try {
    const columns = Object.keys(data);
    const values = Object.values(data);
    const updates = columns.map(col => `${col} = ?`).join(', ');
    
    const query = `UPDATE ${sanitizeTableName(table)} SET ${updates} WHERE id = ?`;
    const result = database.prepare(query).run(...values, id);
    
    return { changes: result.changes };
  } catch (error) {
    throw new Error(`Failed to update ${table}: ${error.message}`);
  }
}

/**
 * Execute a DELETE query
 */
export function deleteRecord(table, id) {
  const database = getDatabase();
  try {
    const query = `DELETE FROM ${sanitizeTableName(table)} WHERE id = ?`;
    const result = database.prepare(query).run(id);
    
    return { changes: result.changes };
  } catch (error) {
    throw new Error(`Failed to delete from ${table}: ${error.message}`);
  }
}

/**
 * Sanitize table name to prevent SQL injection
 */
function sanitizeTableName(table) {
  if (!/^[a-zA-Z0-9_]+$/.test(table)) {
    throw new Error('Invalid table name');
  }
  return `\`${table}\``;
}

/**
 * Close database connection
 */
export function closeDatabase() {
  if (db) {
    db.close();
    db = null;
  }
}
