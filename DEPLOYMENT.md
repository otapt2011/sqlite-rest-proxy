# Deployment Guide

## Vercel Deployment

### Prerequisites
- Vercel account
- GitHub repository connected to Vercel

### Steps

1. **Push to GitHub**
   ```bash
   git push origin main
   ```

2. **Deploy to Vercel**
   ```bash
   vercel deploy
   ```
   Or connect your GitHub repo to Vercel dashboard for automatic deployments.

3. **Configure Environment Variables** (if needed)
   In Vercel dashboard, go to Settings > Environment Variables

### API Endpoint
```
https://your-project.vercel.app/api/:table
```

---

## Cloudflare Workers Deployment

### Prerequisites
- Cloudflare account
- Wrangler CLI installed (`npm install -g wrangler`)
- Authenticated with Cloudflare (`wrangler login`)

### Steps

1. **Build and Deploy**
   ```bash
   wrangler deploy
   ```

2. **Configure for SQLite**
   For Cloudflare Workers with SQLite support, you may need to use D1 (Cloudflare's database service).
   
   Create a binding in `wrangler.toml`:
   ```toml
   [[d1_databases]]
   binding = "DB"
   database_name = "sqlite-rest-proxy"
   database_id = "your-database-id"
   ```

3. **Access Your Worker**
   ```
   https://sqlite-rest-proxy.your-subdomain.workers.dev/api/:table
   ```

---

## Local Development

```bash
npm install
npm run dev
```

Server will run on `http://localhost:3000`

---

## Database Setup

### Create Database
```bash
# Install SQLite
sqlite3 data/app.db < example-setup.sql
```

### Alternative: Create with Node.js
```javascript
import Database from 'better-sqlite3';
const db = new Database('./data/app.db');
db.exec(fs.readFileSync('./example-setup.sql', 'utf-8'));
db.close();
```

---

## Testing API

### cURL Examples

**Get all users**
```bash
curl http://localhost:3000/api/users
```

**Get user by ID**
```bash
curl http://localhost:3000/api/users/1
```

**Create user**
```bash
curl -X POST http://localhost:3000/api/users \
  -H "Content-Type: application/json" \
  -d '{"name": "Alice", "email": "alice@example.com"}'
```

**Update user**
```bash
curl -X PUT http://localhost:3000/api/users/1 \
  -H "Content-Type: application/json" \
  -d '{"name": "John Updated"}'
```

**Delete user**
```bash
curl -X DELETE http://localhost:3000/api/users/1
```

---

## Troubleshooting

### Database not found
- Ensure `data/` directory exists
- Run the setup script: `sqlite3 data/app.db < example-setup.sql`

### CORS errors
- Check `config.js` CORS settings
- Verify `allowedOrigins` includes your domain

### Vercel: SQLite compatibility
- Note: Vercel's filesystem is ephemeral; use Vercel Postgres for production
- For persistent storage, consider using a separate database service

### Cloudflare Workers: Node.js dependencies
- Cloudflare Workers has limited Node.js compatibility
- Consider using Cloudflare D1 for SQLite
