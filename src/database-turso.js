// src/database-turso.js
import { createClient } from '@libsql/client';

let client = null;

// Helper: convert base64 string to Uint8Array
function base64ToUint8Array(base64) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

// Helper: convert Uint8Array to base64 string
function uint8ArrayToBase64(uint8Array) {
  let binary = '';
  const len = uint8Array.length;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(uint8Array[i]);
  }
  return btoa(binary);
}

// Deep convert an object: replace any "avatar" base64 string with Uint8Array for insertion
function prepareForDb(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  for (const key in obj) {
    if (key === 'avatar' && typeof obj[key] === 'string' && obj[key].length > 0) {
      // Assume it's base64 encoded image
      obj[key] = base64ToUint8Array(obj[key]);
    } else if (typeof obj[key] === 'object') {
      prepareForDb(obj[key]);
    }
  }
  return obj;
}

// Deep convert result rows: replace any Uint8Array avatar with base64 string for JSON
function prepareForResponse(rows) {
  if (!rows) return rows;
  if (Array.isArray(rows)) {
    return rows.map(row => {
      const newRow = { ...row };
      if (newRow.avatar && newRow.avatar instanceof Uint8Array) {
        newRow.avatar = uint8ArrayToBase64(newRow.avatar);
      }
      return newRow;
    });
  } else if (rows && typeof rows === 'object') {
    if (rows.avatar && rows.avatar instanceof Uint8Array) {
      rows.avatar = uint8ArrayToBase64(rows.avatar);
    }
  }
  return rows;
}

export async function initDatabase() {
  if (client) return client;

  if (!process.env.TURSO_DATABASE_URL || !process.env.TURSO_AUTH_TOKEN) {
    throw new Error('Missing TURSO_DATABASE_URL or TURSO_AUTH_TOKEN');
  }

  let url = process.env.TURSO_DATABASE_URL;
  if (url.startsWith('libsql://')) {
    url = url.replace('libsql://', 'https://');
  }

  client = createClient({
    url: url,
    authToken: process.env.TURSO_AUTH_TOKEN,
  });

  console.log('Connected to Turso database via @libsql/client');
  return client;
}

export async function getDatabase() {
  if (!client) await initDatabase();
  return client;
}

export async function selectAll(table, limit = 100, offset = 0) {
  const db = await getDatabase();
  const result = await db.execute({
    sql: `SELECT * FROM "${table}" LIMIT ? OFFSET ?`,
    args: [limit, offset],
  });
  return prepareForResponse(result.rows);
}

export async function selectById(table, id) {
  const db = await getDatabase();
  const result = await db.execute({
    sql: `SELECT * FROM "${table}" WHERE id = ? LIMIT 1`,
    args: [id],
  });
  if (result.rows.length === 0) {
    // Try other common primary keys
    const primaryKeys = ['pk', 'primary_key', 'uid', 'username', 'userName'];
    for (const pk of primaryKeys) {
      try {
        const altResult = await db.execute({
          sql: `SELECT * FROM "${table}" WHERE "${pk}" = ? LIMIT 1`,
          args: [id],
        });
        if (altResult.rows.length > 0) return prepareForResponse(altResult.rows[0]);
      } catch (e) {}
    }
    return null;
  }
  return prepareForResponse(result.rows[0]);
}

export async function selectWhere(table, whereClause, params = []) {
  const db = await getDatabase();
  const result = await db.execute({
    sql: `SELECT * FROM "${table}" WHERE ${whereClause}`,
    args: params,
  });
  return prepareForResponse(result.rows);
}

export async function insert(table, data) {
  const db = await getDatabase();
  const preparedData = prepareForDb({ ...data }); // Convert base64 avatar to Uint8Array
  const columns = Object.keys(preparedData);
  const values = Object.values(preparedData);
  const placeholders = columns.map(() => '?').join(', ');
  const result = await db.execute({
    sql: `INSERT INTO "${table}" (${columns.map(c => `"${c}"`).join(', ')}) VALUES (${placeholders})`,
    args: values,
  });
  return {
    id: Number(result.lastInsertRowid),
    changes: result.rowsAffected || 1,
  };
}

export async function update(table, id, data) {
  const db = await getDatabase();
  const preparedData = prepareForDb({ ...data });
  const updates = Object.keys(preparedData).map(col => `"${col}" = ?`).join(', ');
  const values = [...Object.values(preparedData), id];
  const result = await db.execute({
    sql: `UPDATE "${table}" SET ${updates} WHERE id = ?`,
    args: values,
  });
  return { changes: result.rowsAffected || 0 };
}

export async function deleteRecord(table, id) {
  const db = await getDatabase();
  const result = await db.execute({
    sql: `DELETE FROM "${table}" WHERE id = ?`,
    args: [id],
  });
  return { changes: result.rowsAffected || 0 };
}

export async function executeQuery(sqlText, params = []) {
  const db = await getDatabase();
  const result = await db.execute({
    sql: sqlText,
    args: params,
  });
  return prepareForResponse(result.rows);
}

export async function getTables() {
  const db = await getDatabase();
  const result = await db.execute(
    "SELECT name FROM sqlite_master WHERE type='table' OR type='view' ORDER BY name"
  );
  return result.rows;
}

export async function getTableSchema(table) {
  const db = await getDatabase();
  const result = await db.execute(`PRAGMA table_info("${table}")`);
  return result.rows;
}

export function closeDatabase() {
  client = null;
}
