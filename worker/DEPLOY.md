# Cloudflare Worker — Deploy Guide

Cost: **$0/month** on the free tier (100 k requests/day).
For higher traffic: **$5/month** Workers Paid plan, then **$0.50/million** extra requests.

## One-time setup

```bash
cd worker
npm install

# 1. Create a KV namespace
npx wrangler kv namespace create DB
# Copy the printed `id` into wrangler.toml → [[kv_namespaces]] id = "..."

# 2. Create a preview namespace for local dev
npx wrangler kv namespace create DB --preview
# Copy the printed `id` into wrangler.toml → preview_id = "..."
```

## Run locally

```bash
npx wrangler dev
# API available at http://localhost:8787
```

Set in the Next.js project root:
```
NEXT_PUBLIC_API_URL=http://localhost:8787
```

## Deploy to Cloudflare

```bash
npx wrangler deploy
# Prints: https://wellbeing-almanac-api.<subdomain>.workers.dev
```

Update `.env.local` in the Next.js project:
```
NEXT_PUBLIC_API_URL=https://wellbeing-almanac-api.<subdomain>.workers.dev
```

## API reference

| Method | Path | Description |
|--------|------|-------------|
| GET | /api/health | Health check |
| GET | /api/products | All products with sources + P&L |
| POST | /api/products | Create product |
| GET | /api/products/:id | Single product with sources + P&L |
| PUT | /api/products/:id | Update product fields (e.g. sell price) |
| DELETE | /api/products/:id | Delete product and its sources |
| POST | /api/products/:id/sources | Add wholesale source |
| DELETE | /api/sources/:id | Delete a source |
| POST | /api/reset | Re-seed KV with default data |

Data is seeded automatically from mock data on the first request.
