# The Sparkling — Website + Restaurant POS

Public website (`/`) plus QR ordering, waiter, kitchen (KDS) and admin dashboards.
Based on Herb & Spice: same sage palette and roles (admin, waiter, kitchen, guest).
Stack: React 19 + Vite + Tailwind 4 (frontend) · Express + Socket.IO + MongoDB (backend).

## Routes
`/` website · `/table` guest QR menu · `/portal` staff entry · `/admin|waiter|kitchen/login`

## Local run
```bash
npm install && npm --prefix server install
cp .env.example .env && cp server/.env.example server/.env   # set MONGO_URI
npm --prefix server run seed      # menu (all 200+ items from your PDF), 12 tables, inventory, staff
npm --prefix server run dev       # API :5000
npm run dev                       # site :5173
```
Default staff logins (seed): admin@sparkling.com / admin123, chef@sparkling.com / chef123, waiter@sparkling.com / waiter123.
**Set `SEED_ADMIN_PASSWORD`, `SEED_CHEF_PASSWORD`, `SEED_WAITER_PASSWORD` before seeding production.**

## Deploy
1. **MongoDB Atlas** (free): create a cluster, copy the connection string, allow Render's IPs (or 0.0.0.0/0).
2. **Render (API)**: New → Blueprint → pick this repo (`render.yaml`). Set `MONGO_URI`, and `FRONTEND_URL` after step 3. Note the URL, e.g. `https://sparkling-api.onrender.com`.
   Free instances sleep after ~15 min idle; use the Starter plan for always-on kitchen screens.
3. **Vercel (frontend)**: import the repo, framework Vite. Env vars:
   `VITE_API_URL=https://sparkling-api.onrender.com/api`, `VITE_SOCKET_URL=https://sparkling-api.onrender.com`
4. Back on Render set `FRONTEND_URL` to your Vercel URL (comma-separate multiple domains) and redeploy. Table QR codes use this URL.
5. Seed once from your machine with the Atlas `MONGO_URI`: `npm --prefix server run seed`.
