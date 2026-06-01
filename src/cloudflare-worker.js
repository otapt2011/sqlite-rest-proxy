import { initDatabase } from './database.js';
import { routeRequest } from './router.js';

/**
 * Cloudflare Worker Handler
 * This is the entry point for Cloudflare Workers deployments
 */
export default {
  async fetch(request, env, ctx) {
    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 200,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
      });
    }

    try {
      // Initialize database
      initDatabase();

      // Parse URL
      const url = new URL(request.url);
      const pathname = url.pathname;
      const query = Object.fromEntries(url.searchParams);

      // Parse request body
      let body = null;
      if (request.method === 'POST' || request.method === 'PUT') {
        const contentType = request.headers.get('content-type');
        if (contentType?.includes('application/json')) {
          body = await request.json();
        }
      }

      // Route request
      const response = routeRequest(request.method, pathname, query, body);

      return new Response(JSON.stringify(response.body), {
        status: response.status,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
      });
    } catch (error) {
      console.error('Cloudflare Worker error:', error);
      return new Response(JSON.stringify({ error: 'Internal server error' }), {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }
  },
};
