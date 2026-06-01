import Database from 'better-sqlite3';
import { config } from '../config.js';
import fs from 'fs';
import path from 'path';

let db = null;

// Schema information for type handling
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
    db.pragma('foreign_keys = ON');
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
 * Get schema info for a table
 */
export function getTableSchema(table) {
  const database = getDatabase();
  try {
    const query = `PRAGMA table_info(${sanitizeTableName(table)})`;
    return database.prepare(query).all();
  } catch (error) {
    return [];
  }
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
 * Execute a SELECT query for a single record by ID or primary key
 */
export function selectById(table, id) {
  const database = getDatabase();
  try {
    // Try common primary key patterns
    let query = `SELECT * FROM ${sanitizeTableName(table)} WHERE id = ? LIMIT 1`;
    let result = database.prepare(query).get(id);
    
    if (!result) {
      // Try other common primary key names
      const primaryKeys = ['pk', 'primary_key', 'uid', 'username', 'userName'];
      for (const pk of primaryKeys) {
        try {
          query = `SELECT * FROM ${sanitizeTableName(table)} WHERE ${pk} = ? LIMIT 1`;
          result = database.prepare(query).get(id);
          if (result) break;
        } catch (e) {
          // Continue to next primary key attempt
        }
      }
    }
    
    return result;
  } catch (error) {
    throw new Error(`Failed to select from ${table}: ${error.message}`);
  }
}

/**
 * Execute a SELECT query with WHERE clause
 */
export function selectWhere(table, whereClause, params = []) {
  const database = getDatabase();
  try {
    const query = `SELECT * FROM ${sanitizeTableName(table)} WHERE ${whereClause}`;
    return database.prepare(query).all(...params);
  } catch (error) {
    throw new Error(`Failed to query ${table}: ${error.message}`);
  }
}

/**
 * Execute an INSERT query
 */
export function insert(table, data) {
  const database = getDatabase();
  try {
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
    // Filter out BLOB columns for updates
    const filteredData = { ...data };
    const schema = schemaInfo[table]?.columnTypes || {};
    
    for (const [key, value] of Object.entries(filteredData)) {
      if (schema[key] === 'blob' && !value) {
        delete filteredData[key];
      }
    }

    const columns = Object.keys(filteredData);
    const values = Object.values(filteredData);
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
 * Execute a custom SELECT query (for views and complex queries)
 */
export function executeQuery(sqlText, params = []) {
  const database = getDatabase();
  try {
    return database.prepare(sqlText).all(...params);
  } catch (error) {
    throw new Error(`Failed to execute query: ${error.message}`);
  }
}

/**
 * Get all available tables and views
 */
export function getTables() {
  const database = getDatabase();
  try {
    const query = `SELECT name FROM sqlite_master WHERE type='table' OR type='view' ORDER BY name`;
    return database.prepare(query).all();
  } catch (error) {
    throw new Error(`Failed to get tables: ${error.message}`);
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
