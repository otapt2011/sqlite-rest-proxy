import { connect } from '@tursodatabase/serverless';

let connection = null;

// Schema information for type handling (copied from database-sqljs.js)
const schemaInfo = {
  userJson: {
    columnTypes: {
      followerCount: 'integer',
      followingCount: 'integer',
      likesReceived: 'integer',
      rawFollowingJson: 'integer',
      cleanFollowingJson: 'integer',
      rawFollowerJson: 'integer',
      cleanFollowersJson: 'integer',
      friendsJson: 'integer',
    }
  },
  userApi: {
    columnTypes: {
      verified: 'integer',
      privateAccount: 'integer',
      followerCount: 'integer',
      followingCount: 'integer',
      heartCount: 'integer',
      videoCount: 'integer',
      avatar: 'blob',
    }
  },
  profiles: {
    columnTypes: {
      is_following: 'integer',
      is_follower: 'integer',
      is_blocked: 'integer',
      verified: 'integer',
      privateAccount: 'integer',
      followerCount: 'integer',
      followingCount: 'integer',
      heartCount: 'integer',
      videoCount: 'integer',
      avatar: 'blob',
    }
  },
  user_posts: {
    columnTypes: {
      likes: 'integer',
      cover_image_data: 'blob',
      cover_image_expired: 'integer',
    }
  },
  saved_queries: {
    columnTypes: {
      id: 'integer',
    }
  },
};

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
  const stmt = conn.prepare(`SELECT * FROM "${table}" LIMIT ? OFFSET ?`);
  return await stmt.all(limit, offset);
}

export async function selectById(table, id) {
  const conn = await getDatabase();
  // Try id column first
  let stmt = conn.prepare(`SELECT * FROM "${table}" WHERE id = ? LIMIT 1`);
  let result = await stmt.get(id);
  
  if (!result) {
    // Try other common primary key names
    const primaryKeys = ['pk', 'primary_key', 'uid', 'username', 'userName'];
    for (const pk of primaryKeys) {
      try {
        const altStmt = conn.prepare(`SELECT * FROM "${table}" WHERE "${pk}" = ? LIMIT 1`);
        result = await altStmt.get(id);
        if (result) break;
      } catch (e) {
        // Continue to next primary key attempt
      }
    }
  }
  return result;
}

export async function selectWhere(table, whereClause, params = []) {
  const conn = await getDatabase();
  const stmt = conn.prepare(`SELECT * FROM "${table}" WHERE ${whereClause}`);
  return await stmt.all(...params);
}

export async function insert(table, data) {
  const conn = await getDatabase();
  // Filter out null/empty BLOB columns
  const filteredData = { ...data };
  const schema = schemaInfo[table]?.columnTypes || {};
  
  for (const [key, value] of Object.entries(filteredData)) {
    if (schema[key] === 'blob' && !value) {
      delete filteredData[key];
    }
  }

  const columns = Object.keys(filteredData);
  const values = Object.values(filteredData);
  const placeholders = columns.map(() => '?').join(', ');
  
  const stmt = conn.prepare(`INSERT INTO "${table}" (${columns.map(c => `"${c}"`).join(', ')}) VALUES (${placeholders})`);
  const result = await stmt.run(...values);
  return { id: Number(result.lastInsertRowid), changes: result.changes };
}

export async function update(table, id, data) {
  const conn = await getDatabase();
  // Filter out BLOB columns for updates
  const filteredData = { ...data };
  const schema = schemaInfo[table]?.columnTypes || {};
  
  for (const [key, value] of Object.entries(filteredData)) {
    if (schema[key] === 'blob' && !value) {
      delete filteredData[key];
    }
  }

  const updates = Object.keys(filteredData).map(col => `"${col}" = ?`).join(', ');
  const values = [...Object.values(filteredData), id];
  const stmt = conn.prepare(`UPDATE "${table}" SET ${updates} WHERE id = ?`);
  const result = await stmt.run(...values);
  return { changes: result.changes };
}

export async function deleteRecord(table, id) {
  const conn = await getDatabase();
  const stmt = conn.prepare(`DELETE FROM "${table}" WHERE id = ?`);
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
  const stmt = conn.prepare(`PRAGMA table_info("${table}")`);
  return await stmt.all();
}

export function closeDatabase() {
  connection = null;
}
