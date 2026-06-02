// src/router.js
import { config } from '../config.js';
import * as db from './database-turso.js';

/**
 * Route request to appropriate handler
 */
export async function routeRequest(method, pathname, query, body) {
  const basePath = config.api.basePath;
  
  if (!pathname.startsWith(basePath)) {
    return { status: 404, body: { error: 'Not found' } };
  }

  const pathParts = pathname.slice(basePath.length).split('/').filter(Boolean);
  
  if (pathParts.length === 0) {
    return { status: 400, body: { error: 'Table name required' } };
  }

  const table = pathParts[0];
  const id = pathParts[1];
  const action = pathParts[2];

  try {
    if (method === 'GET') {
      return await handleGet(table, id, query, action);
    } else if (method === 'POST') {
      return await handlePost(table, body, query);
    } else if (method === 'PUT') {
      return await handlePut(table, id, body);
    } else if (method === 'DELETE') {
      return await handleDelete(table, id);
    } else if (method === 'OPTIONS') {
      return { status: 200, body: {} };
    }
    
    return { status: 405, body: { error: 'Method not allowed' } };
  } catch (error) {
    return { status: 500, body: { error: error.message } };
  }
}

/**
 * Handle GET requests
 */
async function handleGet(table, id, query, action) {
  // Special endpoints
  if (table === 'schema' && id) {
    const schema = await db.getTableSchema(id);
    return { status: 200, body: { schema } };
  }

  if (table === 'tables') {
    const tables = await db.getTables();
    return { status: 200, body: { tables } };
  }

  // Query endpoint - for executing custom queries (GET version)
  if (table === 'query' && query.sql) {
    try {
      const records = await db.executeQuery(query.sql, []);
      return {
        status: 200,
        body: {
          data: records,
          count: records.length,
        },
      };
    } catch (error) {
      return { status: 400, body: { error: error.message } };
    }
  }

  // Standard table queries
  if (id) {
    // Get single record
    const record = await db.selectById(table, id);
    if (!record) {
      return { status: 404, body: { error: 'Record not found' } };
    }
    return { status: 200, body: record };
  }
  
  // Handle WHERE clause queries
  if (query.where) {
    try {
      const params = query.params ? JSON.parse(query.params) : [];
      const records = await db.selectWhere(table, query.where, params);
      const limit = Math.min(parseInt(query.limit) || 100, 1000);
      const sliced = records.slice(0, limit);
      
      return {
        status: 200,
        body: {
          data: sliced,
          limit,
          count: sliced.length,
          total: records.length,
        },
      };
    } catch (error) {
      return { status: 400, body: { error: error.message } };
    }
  }
  
  // Get all records with pagination
  const limit = Math.min(parseInt(query.limit) || 100, 1000);
  const offset = parseInt(query.offset) || 0;
  const records = await db.selectAll(table, limit, offset);
  
  return {
    status: 200,
    body: {
      data: records,
      limit,
      offset,
      count: records.length,
    },
  };
}

/**
 * Handle POST requests
 */
async function handlePost(table, body, query) {
  // Special case: execute raw SQL with parameters (POST /api/query)
  if (table === 'query') {
    let sql, params;
    if (body && body.sql) {
      sql = body.sql;
      params = body.params || [];
    } else {
      return { status: 400, body: { error: 'Missing "sql" field in request body' } };
    }
    try {
      const records = await db.executeQueryWithParams(sql, params);
      return {
        status: 200,
        body: {
          data: records,
          count: records.length,
        },
      };
    } catch (error) {
      return { status: 400, body: { error: error.message } };
    }
  }

  // Normal table INSERT
  if (!body || typeof body !== 'object') {
    return { status: 400, body: { error: 'Invalid request body' } };
  }
  
  const result = await db.insert(table, body);
  
  return {
    status: 201,
    body: {
      success: true,
      id: result.id,
      changes: result.changes,
    },
  };
}

/**
 * Handle PUT requests
 */
async function handlePut(table, id, body) {
  if (!id) {
    return { status: 400, body: { error: 'ID required for update' } };
  }
  
  if (!body || typeof body !== 'object') {
    return { status: 400, body: { error: 'Invalid request body' } };
  }
  
  // Check if record exists
  const record = await db.selectById(table, id);
  if (!record) {
    return { status: 404, body: { error: 'Record not found' } };
  }
  
  const result = await db.update(table, id, body);
  
  return {
    status: 200,
    body: {
      success: true,
      changes: result.changes,
    },
  };
}

/**
 * Handle DELETE requests
 */
async function handleDelete(table, id) {
  if (!id) {
    return { status: 400, body: { error: 'ID required for delete' } };
  }
  
  // Check if record exists
  const record = await db.selectById(table, id);
  if (!record) {
    return { status: 404, body: { error: 'Record not found' } };
  }
  
  const result = await db.deleteRecord(table, id);
  
  return {
    status: 200,
    body: {
      success: true,
      changes: result.changes,
    },
  };
}
