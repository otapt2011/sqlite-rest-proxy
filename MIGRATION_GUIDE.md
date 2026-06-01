# Migration from better-sqlite3 to sql.js

## Overview

This project has been successfully migrated from `better-sqlite3` (native module) to `sql.js` (pure JavaScript) to enable deployment on Vercel and other serverless platforms.

## What Changed

### Dependencies
- **Removed**: `better-sqlite3` (native C++ module that requires compilation)
- **Added**: `sql.js` (pure JavaScript SQLite implementation)

### Core Files Modified
| File | Changes |
|------|---------|
| `package.json` | Replaced `better-sqlite3` with `sql.js` |
| `src/database-sqljs.js` | **NEW** - sql.js implementation replacing `database.js` |
| `src/vercel.js` | Updated to use async `initDatabase()` |
| `src/server.js` | Updated imports and added async/await |
| `src/router.js` | Made all handlers async with proper await keywords |

### API Changes

All database functions are now **async** and must be `await`ed:

```javascript
// Before (better-sqlite3)
const users = db.selectAll('users', 100, 0);
const record = db.selectById('users', 1);

// After (sql.js)
const users = await db.selectAll('users', 100, 0);
const record = await db.selectById('users', 1);
```

## Key Improvements

### Why sql.js is Better for Vercel

✅ **No native dependencies** - Pure JavaScript, no C++ compilation needed
✅ **Vercel compatible** - Deploys without build errors
✅ **Serverless-friendly** - Works with AWS Lambda, Cloudflare Workers, etc.
✅ **Same SQL** - All SQL syntax and queries remain unchanged
✅ **Automatic persistence** - Database automatically saves after writes

### Trade-offs

⚠️ **Async operations only** - All database calls must use `await`
⚠️ **Slightly slower** - JavaScript implementation vs native C++ library
⚠️ **Ephemeral storage on Vercel** - Data resets between deployments (expected)
⚠️ **Single-process only** - No concurrent access patterns

## How It Works

### Database Initialization
```javascript
// First call initializes sql.js and loads database from disk
const db = await initDatabase();

// Subsequent calls return cached instance
await getDatabase(); // Uses cached db
```

### Automatic File Persistence
The database file is automatically saved to disk after:
- INSERT operations
- UPDATE operations  
- DELETE operations
- Manual `closeDatabase()` calls

```javascript
// Database automatically saves to disk
await db.insert('users', { name: 'John' });
```

### File Location
Database is stored at: `./data/app.db` (configured in `config.js`)

## Deployment to Vercel

### Step 1: Install Dependencies
```bash
npm install
```

This installs `sql.js` (pure JavaScript) instead of `better-sqlite3`.

### Step 2: Deploy
```bash
vercel deploy
```

The build should now complete successfully! ✅

### Step 3: Important Notes

**Ephemeral Filesystem**: Vercel serverless functions have temporary file systems that reset between deployments. This means your database will not persist between deployments.

**Solutions for Production**:
1. **Cloudflare D1** (Recommended) - Serverless SQL database, works great with Vercel
2. **Supabase** - PostgreSQL with REST API
3. **MongoDB Atlas** - NoSQL alternative
4. **AWS RDS** - Traditional database service
5. **Neon** - Serverless PostgreSQL

## Local Development

### Start the Development Server
```bash
npm run dev
```

The server runs at `http://localhost:3000` with the database at `./data/app.db`.

### Test API Endpoints
```bash
# List all tables
curl http://localhost:3000/api/tables

# Get all records from a table
curl http://localhost:3000/api/users

# Get single record
curl http://localhost:3000/api/users/1

# Create new record
curl -X POST http://localhost:3000/api/users \
  -H "Content-Type: application/json" \
  -d '{"name":"John","email":"john@example.com"}'

# Update record
curl -X PUT http://localhost:3000/api/users/1 \
  -H "Content-Type: application/json" \
  -d '{"name":"Jane"}'

# Delete record
curl -X DELETE http://localhost:3000/api/users/1
```

## Troubleshooting

### Issue: "Cannot find module 'better-sqlite3'"
**Solution**: Run `npm install` to install `sql.js` dependencies.

### Issue: "sql.js is not a function"
**Solution**: Ensure all database calls use `await`:
```javascript
const db = await initDatabase();  // ✅ Correct
const db = initDatabase();         // ❌ Wrong
```

### Issue: Database file doesn't persist after Vercel deployment
**Solution**: This is expected. Use Cloudflare D1 or another database service for production.

### Issue: "PRAGMA table_info" returns empty
**Solution**: Ensure your tables exist in the database. Check that your initialization scripts have run.

## File Reference

### New File: `src/database-sqljs.js`
Complete sql.js implementation with:
- `initDatabase()` - Initialize and load database
- `selectAll()` - Get records with pagination
- `selectById()` - Get single record
- `selectWhere()` - Get records matching WHERE clause
- `insert()` - Create new record
- `update()` - Modify existing record
- `deleteRecord()` - Remove record
- `executeQuery()` - Execute custom SQL
- `getTables()` - List all tables
- `getTableSchema()` - Get table structure
- `closeDatabase()` - Clean shutdown

### Updated Files
- **`src/vercel.js`** - Added `await initDatabase()`
- **`src/server.js`** - Made async, uses `database-sqljs.js`
- **`src/router.js`** - All handlers are now async
- **`package.json`** - Replaced dependency

## Next Steps

### For Development
Continue using `npm run dev` as normal - everything works the same from a user perspective.

### For Production Deployment
1. Consider using Cloudflare D1 for persistent SQLite storage
2. Or migrate to PostgreSQL (Supabase/Neon)
3. Or use MongoDB for document storage

### If You Need better-sqlite3 Back
**This is NOT recommended for Vercel**, but if needed:
1. Update `package.json` to include `better-sqlite3`
2. Update imports back to `src/database.js` (kept for reference)
3. Remove all `await` keywords from database calls

The build will fail on Vercel because better-sqlite3 requires native compilation.

## Summary

Your project is now:
- ✅ Fully compatible with Vercel
- ✅ Using pure JavaScript SQLite (sql.js)
- ✅ Ready for serverless deployment
- ✅ Maintaining all original API functionality
- ✅ Using the same SQL query syntax

The migration is complete! Deploy with confidence. 🚀
