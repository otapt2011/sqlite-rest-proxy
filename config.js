// Configuration for SQLite REST Proxy

export const config = {
  // Database configuration
  database: {
    // On Vercel, the only writable directory is /tmp
    path: process.env.VERCEL === '1' ? '/tmp/app.db' : './data/app.db',
    // Set to true to create database if it doesn't exist
    createIfMissing: true,
  },

  // Server configuration
  server: {
    port: process.env.PORT || 3000,
    host: '0.0.0.0',
  },

  // API configuration
  api: {
    // Base path for API routes
    basePath: '/api',
    // Enable request logging
    logging: true,
    // Max request body size in bytes (10MB)
    maxBodySize: 10 * 1024 * 1024,
  },

  // CORS configuration
  cors: {
    enabled: true,
    allowedOrigins: ['*'], // Change to specific origins in production
    allowedMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  },
};
