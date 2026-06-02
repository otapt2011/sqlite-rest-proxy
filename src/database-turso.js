import { createClient } from '@libsql/client';

let client = null;

export async function initDatabase() {
  if (client) return client;

  if (!process.env.TURSO_DATABASE_URL || !process.env.TURSO_AUTH_TOKEN) {
    throw new Error('Missing TURSO_DATABASE_URL or TURSO_AUTH_TOKEN');
  }

  // Ensure HTTPS URL format
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
  return result.rows;
}

export async function selectById(table, id) {
  const db = await getDatabase();
  const result = await db.execute({
    sql: `SELECT * FROM "${table}" WHERE id = ? LIMIT 1`,
    args: [id],
  });
  
  if (result.rows.length === 0) {
    const primaryKeys = ['pk', 'primary_key', 'uid', 'username', 'userName'];
    for (const pk of primaryKeys) {
      try {
        const altResult = await db.execute({
          sql: `SELECT * FROM "${table}" WHERE "${pk}" = ? LIMIT 1`,
          args: [id],
        });
        if (altResult.rows.length > 0) return altResult.rows[0];
      } catch (e) {}
    }
    return null;
  }
  return result.rows[0];
}

export async function selectWhere(table, whereClause, params = []) {
  const db = await getDatabase();
  const result = await db.execute({
    sql: `SELECT * FROM "${table}" WHERE ${whereClause}`,
    args: params,
  });
  return result.rows;
}

export async function insert(table, data) {
  const db = await getDatabase();
  const columns = Object.keys(data);
  const values = Object.values(data);
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
  const updates = Object.keys(data).map(col => `"${col}" = ?`).join(', ');
  const values = [...Object.values(data), id];
  
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
  return result.rows;
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
