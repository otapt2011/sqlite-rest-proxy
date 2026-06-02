// src/database-turso.js
import { connect } from '@tursodatabase/serverless';
import { config } from '../config.js';

let connection = null;

export async function initDatabase() {
  if (connection) return connection;

  if (!process.env.TURSO_DATABASE_URL || !process.env.TURSO_AUTH_TOKEN) {
    throw new Error('Missing TURSO_DATABASE_URL or TURSO_AUTH_TOKEN environment variables');
  }

  connection = connect({
    url: process.env.TURSO_DATABASE_URL,
    authToken: process.env.TURSO_AUTH_TOKEN,
  });

  console.log('Connected to Turso database');
  return connection;
}

export async function getDatabase() {
  if (!connection) await initDatabase();
  return connection;
}

export async function selectAll(table, limit = 100, offset = 0) {
  const conn = await getDatabase();
  const stmt = conn.prepare(`SELECT * FROM ${table} LIMIT ? OFFSET ?`);
  return await stmt.all(limit, offset);
}

export async function selectById(table, id) {
  const conn = await getDatabase();
  const stmt = conn.prepare(`SELECT * FROM ${table} WHERE id = ? LIMIT 1`);
  return await stmt.get(id);
}

export async function selectWhere(table, whereClause, params = []) {
  const conn = await getDatabase();
  const stmt = conn.prepare(`SELECT * FROM ${table} WHERE ${whereClause}`);
  return await stmt.all(...params);
}

export async function insert(table, data) {
  const conn = await getDatabase();
  const columns = Object.keys(data);
  const values = Object.values(data);
  const placeholders = columns.map(() => '?').join(', ');
  const stmt = conn.prepare(`INSERT INTO ${table} (${columns.join(', ')}) VALUES (${placeholders})`);
  const result = await stmt.run(...values);
  return { id: result.lastInsertRowid, changes: result.changes };
}

export async function update(table, id, data) {
  const conn = await getDatabase();
  const updates = Object.keys(data).map(col => `${col} = ?`).join(', ');
  const values = [...Object.values(data), id];
  const stmt = conn.prepare(`UPDATE ${table} SET ${updates} WHERE id = ?`);
  const result = await stmt.run(...values);
  return { changes: result.changes };
}

export async function deleteRecord(table, id) {
  const conn = await getDatabase();
  const stmt = conn.prepare(`DELETE FROM ${table} WHERE id = ?`);
  const result = await stmt.run(id);
  return { changes: result.changes };
}

export async function executeQuery(sqlText, params = []) {
  const conn = await getDatabase();
  const stmt = conn.prepare(sqlText);
  return await stmt.all(...params);
}

export async function getTables() {
  const conn = await getDatabase();
  const stmt = conn.prepare("SELECT name FROM sqlite_master WHERE type='table' OR type='view' ORDER BY name");
  return await stmt.all();
}

export async function getTableSchema(table) {
  const conn = await getDatabase();
  const stmt = conn.prepare(`PRAGMA table_info(${table})`);
  return await stmt.all();
}

export function closeDatabase() {
  connection = null;
}
