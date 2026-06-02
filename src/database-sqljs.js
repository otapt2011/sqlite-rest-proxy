import initSqlJs from 'sql.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { config } from '../config.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let db = null;
let SQL = null;

// Schema information for type handling (unchanged)
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
 * Initialize sql.js and load database from file if it exists
 */
export async function initDatabase() {
  try {
    if (db && SQL) {
      return db;
    }

    // Initialize sql.js with explicit locateFile for Vercel/serverless
    SQL = await initSqlJs({
      locateFile: file => path.join(__dirname, '../node_modules/sql.js/dist', file)
    });

    const dbPath = config.database.path;
    const dbDir = path.dirname(dbPath);
    const isVercel = process.env.VERCEL === '1';

    // Only create directory if NOT on Vercel (Vercel /tmp already exists)
    if (!isVercel && !fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }

    // Load existing database or create new one
    if (fs.existsSync(dbPath)) {
      const buffer = fs.readFileSync(dbPath);
      db = new SQL.Database(buffer);
      console.log(`Database loaded from ${dbPath}`);
    } else {
      db = new SQL.Database();
      console.log(`New database created at ${dbPath}`);
      // On Vercel, immediately save the empty database to /tmp
      if (isVercel) {
        saveDatabase(dbPath);
      }
    }

    // Enable foreign keys
    db.run('PRAGMA foreign_keys = ON');
    
    // For local development, save initial empty database to disk
    if (!isVercel) {
      saveDatabase(dbPath);
    }

    return db;
  } catch (error) {
    console.error('Failed to initialize database:', error);
    throw error;
  }
}

/**
 * Save database to file
 */
function saveDatabase(dbPath = config.database.path) {
  try {
    if (db) {
      const data = db.export();
      const buffer = Buffer.from(data);
      fs.writeFileSync(dbPath, buffer);
    }
  } catch (error) {
    console.error('Failed to save database:', error);
  }
}

/**
 * Get database instance
 */
export async function getDatabase() {
  if (!db || !SQL) {
    await initDatabase();
  }
  return db;
}

/**
 * Get schema info for a table
 */
export async function getTableSchema(table) {
  const database = await getDatabase();
  try {
    const query = `PRAGMA table_info(${sanitizeTableName(table)})`;
    const result = database.exec(query);
    if (result.length > 0) {
      return result[0].values.map(row => ({
        cid: row[0],
        name: row[1],
        type: row[2],
        notnull: row[3],
        dflt_value: row[4],
        pk: row[5],
      }));
    }
    return [];
  } catch (error) {
    console.error('Error getting schema:', error);
    return [];
  }
}

/**
 * Execute a SELECT query
 */
export async function selectAll(table, limit = 100, offset = 0) {
  const database = await getDatabase();
  try {
    const query = `SELECT * FROM ${sanitizeTableName(table)} LIMIT ? OFFSET ?`;
    const stmt = database.prepare(query);
    stmt.bind([limit, offset]);
    
    const result = [];
    while (stmt.step()) {
      result.push(stmt.getAsObject());
    }
    stmt.free();
    
    return result;
  } catch (error) {
    throw new Error(`Failed to select from ${table}: ${error.message}`);
  }
}

/**
 * Execute a SELECT query for a single record by ID or primary key
 */
export async function selectById(table, id) {
  const database = await getDatabase();
  try {
    let query = `SELECT * FROM ${sanitizeTableName(table)} WHERE id = ? LIMIT 1`;
    let stmt = database.prepare(query);
    stmt.bind([id]);
    
    let result = null;
    if (stmt.step()) {
      result = stmt.getAsObject();
    }
    stmt.free();
    
    if (!result) {
      // Try other common primary key names
      const primaryKeys = ['pk', 'primary_key', 'uid', 'username', 'userName'];
      for (const pk of primaryKeys) {
        try {
          query = `SELECT * FROM ${sanitizeTableName(table)} WHERE ${pk} = ? LIMIT 1`;
          stmt = database.prepare(query);
          stmt.bind([id]);
          
          if (stmt.step()) {
            result = stmt.getAsObject();
            stmt.free();
            break;
          }
          stmt.free();
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
export async function selectWhere(table, whereClause, params = []) {
  const database = await getDatabase();
  try {
    const query = `SELECT * FROM ${sanitizeTableName(table)} WHERE ${whereClause}`;
    const stmt = database.prepare(query);
    stmt.bind(params);
    
    const result = [];
    while (stmt.step()) {
      result.push(stmt.getAsObject());
    }
    stmt.free();
    
    return result;
  } catch (error) {
    throw new Error(`Failed to query ${table}: ${error.message}`);
  }
}

/**
 * Execute an INSERT query
 */
export async function insert(table, data) {
  const database = await getDatabase();
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
    const stmt = database.prepare(query);
    stmt.bind(values);
    stmt.step();
    stmt.free();
    
    // Get last insert rowid
    const idStmt = database.prepare('SELECT last_insert_rowid() as id');
    idStmt.step();
    const result = idStmt.getAsObject();
    idStmt.free();
    
    saveDatabase();
    
    return {
      id: result.id,
      changes: 1,
    };
  } catch (error) {
    throw new Error(`Failed to insert into ${table}: ${error.message}`);
  }
}

/**
 * Execute an UPDATE query
 */
export async function update(table, id, data) {
  const database = await getDatabase();
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
    const stmt = database.prepare(query);
    stmt.bind([...values, id]);
    stmt.step();
    stmt.free();
    
    saveDatabase();
    
    return { changes: 1 };
  } catch (error) {
    throw new Error(`Failed to update ${table}: ${error.message}`);
  }
}

/**
 * Execute a DELETE query
 */
export async function deleteRecord(table, id) {
  const database = await getDatabase();
  try {
    const query = `DELETE FROM ${sanitizeTableName(table)} WHERE id = ?`;
    const stmt = database.prepare(query);
    stmt.bind([id]);
    stmt.step();
    stmt.free();
    
    saveDatabase();
    
    return { changes: 1 };
  } catch (error) {
    throw new Error(`Failed to delete from ${table}: ${error.message}`);
  }
}

/**
 * Execute a custom SELECT query (for views and complex queries)
 */
export async function executeQuery(sqlText, params = []) {
  const database = await getDatabase();
  try {
    const stmt = database.prepare(sqlText);
    stmt.bind(params);
    
    const result = [];
    while (stmt.step()) {
      result.push(stmt.getAsObject());
    }
    stmt.free();
    
    return result;
  } catch (error) {
    throw new Error(`Failed to execute query: ${error.message}`);
  }
}

/**
 * Get all available tables and views
 */
export async function getTables() {
  const database = await getDatabase();
  try {
    const query = `SELECT name FROM sqlite_master WHERE type='table' OR type='view' ORDER BY name`;
    const stmt = database.prepare(query);
    
    const result = [];
    while (stmt.step()) {
      result.push(stmt.getAsObject());
    }
    stmt.free();
    
    return result;
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
    saveDatabase();
    db.close();
    db = null;
    SQL = null;
  }
}
