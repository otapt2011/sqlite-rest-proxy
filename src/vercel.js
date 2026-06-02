import { initDatabase, closeDatabase } from './database-turso.js';
import { routeRequest } from './router.js';

/**
 * Vercel Serverless Function Handler
 * This is the entry point for Vercel deployments
 */
export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token,X-Requested-With,Accept,Accept-Version,Content-Length,Content-MD5,Content-Type,Date,X-Api-Version');

  // Handle preflight
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    // Initialize Turso database connection
    await initDatabase();

    // Parse request body
    let body = null;
    if (req.method === 'POST' || req.method === 'PUT') {
      body = req.body;
    }

    // Parse URL
    const url = new URL(req.url, `https://${req.headers.host}`);
    const pathname = url.pathname;
    const query = Object.fromEntries(url.searchParams);

    // Route request
    const response = await routeRequest(req.method, pathname, query, body);

    res.status(response.status).json(response.body);
  } catch (error) {
    console.error('Vercel handler error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      details: error.message 
    });
  } finally {
    // Optional: close connection after each request (Turso driver handles pooling)
    // closeDatabase();
  }
}
