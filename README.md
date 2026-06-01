# SQLite REST API Proxy

A vanilla JavaScript REST API proxy server for SQLite databases with support for both Vercel and Cloudflare Workers deployment.

## Features

- ✅ **Vanilla JavaScript** - No framework dependencies
- ✅ **CRUD Operations** - Create, Read, Update, Delete support
- ✅ **Vercel Ready** - Serverless deployment
- ✅ **Cloudflare Workers** - Edge computing deployment
- ✅ **JSON API** - Standard REST endpoints
- ✅ **Error Handling** - Comprehensive error responses

## Quick Start

### Local Development

```bash
npm install
npm run dev
```

Server runs on `http://localhost:3000`

## API Endpoints

### GET - Read
```bash
GET /api/:table
GET /api/:table/:id
```

### POST - Create
```bash
POST /api/:table
Content-Type: application/json

{
  "column1": "value1",
  "column2": "value2"
}
```

### PUT - Update
```bash
PUT /api/:table/:id
Content-Type: application/json

{
  "column1": "newValue1"
}
```

### DELETE - Delete
```bash
DELETE /api/:table/:id
```

## Deployment

### Vercel

The API automatically works with Vercel serverless functions.

```bash
vercel deploy
```

### Cloudflare Workers

Use the `wrangler.toml` configuration:

```bash
wrangler deploy
```

## Configuration

Update `config.js` with your database path and settings.

## License

MIT
