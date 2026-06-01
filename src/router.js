import { config } from '../config.js';
import * as db from './database.js';

/**
 * Route request to appropriate handler
 */
export function routeRequest(method, pathname, query, body) {
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

  try {
    if (method === 'GET') {
      return handleGet(table, id, query);
    } else if (method === 'POST') {
      return handlePost(table, body);
    } else if (method === 'PUT') {
      return handlePut(table, id, body);
    } else if (method === 'DELETE') {
      return handleDelete(table, id);
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
function handleGet(table, id, query) {
  if (id) {
    // Get single record
    const record = db.selectById(table, id);
    if (!record) {
      return { status: 404, body: { error: 'Record not found' } };
    }
    return { status: 200, body: record };
  }
  
  // Get all records with pagination
  const limit = Math.min(parseInt(query.limit) || 100, 1000);
  const offset = parseInt(query.offset) || 0;
  const records = db.selectAll(table, limit, offset);
  
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
function handlePost(table, body) {
  if (!body || typeof body !== 'object') {
    return { status: 400, body: { error: 'Invalid request body' } };
  }
  
  const result = db.insert(table, body);
  
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
function handlePut(table, id, body) {
  if (!id) {
    return { status: 400, body: { error: 'ID required for update' } };
  }
  
  if (!body || typeof body !== 'object') {
    return { status: 400, body: { error: 'Invalid request body' } };
  }
  
  // Check if record exists
  const record = db.selectById(table, id);
  if (!record) {
    return { status: 404, body: { error: 'Record not found' } };
  }
  
  const result = db.update(table, id, body);
  
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
function handleDelete(table, id) {
  if (!id) {
    return { status: 400, body: { error: 'ID required for delete' } };
  }
  
  // Check if record exists
  const record = db.selectById(table, id);
  if (!record) {
    return { status: 404, body: { error: 'Record not found' } };
  }
  
  const result = db.deleteRecord(table, id);
  
  return {
    status: 200,
    body: {
      success: true,
      changes: result.changes,
    },
  };
}
