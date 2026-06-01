import http from 'http';
import { config } from '../config.js';
import { initDatabase, closeDatabase } from './database.js';
import { routeRequest } from './router.js';

/**
 * Parse request body
 */
function parseBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', chunk => {
      data += chunk;
      if (data.length > config.api.maxBodySize) {
        reject(new Error('Request body too large'));
      }
    });
    req.on('end', () => {
      try {
        resolve(data ? JSON.parse(data) : null);
      } catch (error) {
        reject(new Error('Invalid JSON in request body'));
      }
    });
  });
}

/**
 * Add CORS headers
 */
function addCorsHeaders(res) {
  if (config.cors.enabled) {
    res.setHeader('Access-Control-Allow-Origin', config.cors.allowedOrigins[0]);
    res.setHeader('Access-Control-Allow-Methods', config.cors.allowedMethods.join(', '));
    res.setHeader('Access-Control-Allow-Headers', config.cors.allowedHeaders.join(', '));
  }
}

/**
 * Create HTTP server
 */
const server = http.createServer(async (req, res) => {
  addCorsHeaders(res);
  res.setHeader('Content-Type', 'application/json');

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  try {
    if (config.api.logging) {
      console.log(`${req.method} ${req.url}`);
    }

    // Parse URL
    const url = new URL(req.url, `http://${req.headers.host}`);
    const pathname = url.pathname;
    const query = Object.fromEntries(url.searchParams);

    // Parse request body
    let body = null;
    if (req.method === 'POST' || req.method === 'PUT') {
      body = await parseBody(req);
    }

    // Route request
    const response = routeRequest(req.method, pathname, query, body);

    res.writeHead(response.status);
    res.end(JSON.stringify(response.body));
  } catch (error) {
    console.error('Server error:', error);
    res.writeHead(500);
    res.end(JSON.stringify({ error: 'Internal server error' }));
  }
});

/**
 * Start server
 */
function start() {
  try {
    initDatabase();
    
    server.listen(config.server.port, config.server.host, () => {
      console.log(`\n✓ Server running at http://${config.server.host}:${config.server.port}`);
      console.log(`✓ API base path: ${config.api.basePath}`);
      console.log('\nExample requests:');
      console.log(`  GET  ${config.api.basePath}/users`);
      console.log(`  POST ${config.api.basePath}/users`);
      console.log(`  PUT  ${config.api.basePath}/users/1`);
      console.log(`  DELETE ${config.api.basePath}/users/1\n`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

/**
 * Handle graceful shutdown
 */
process.on('SIGINT', () => {
  console.log('\n\nShutting down gracefully...');
  closeDatabase();
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

start();
