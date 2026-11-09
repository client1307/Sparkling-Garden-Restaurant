# The Sparkling — Website + Restaurant POS

Public website (`/`) plus QR ordering, waiter, kitchen (KDS) and admin dashboards.
Based on Herb & Spice: same sage palette and roles (admin, waiter, kitchen, guest).
Stack: React 19 + Vite + Tailwind 4 (frontend) · Express + Socket.IO + MongoDB (backend).

## Live Production Deployments
- **Frontend (Vercel)**: [https://sparkling-garden-restaurant.vercel.app](https://sparkling-garden-restaurant.vercel.app)
- **Backend API (Render)**: [https://sparkling-api.onrender.com](https://sparkling-api.onrender.com)
- **Database**: MongoDB Atlas Cloud Cluster

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
Before seeding, set unique values for `SEED_ADMIN_PASSWORD`, `SEED_CHEF_PASSWORD`,
`SEED_WAITER_PASSWORD`, and `SEED_BILLING_PASSWORD` in the server environment.
Never document or commit the actual staff passwords.

## Deploy
1. **MongoDB Atlas** (free): create a cluster, copy the connection string, allow Render's IPs (or 0.0.0.0/0).
2. **Render (API)**: New → Blueprint → pick this repo (`render.yaml`). Set `MONGO_URI`, and `FRONTEND_URL` after step 3. Note the URL, e.g. `https://sparkling-api.onrender.com`.
   Free instances sleep after ~15 min idle; use the Starter plan for always-on kitchen screens.
3. **Vercel (frontend)**: import the repo, framework Vite. Env vars:
   `VITE_API_URL=https://sparkling-api.onrender.com/api`, `VITE_SOCKET_URL=https://sparkling-api.onrender.com`
4. Back on Render set `FRONTEND_URL` to your Vercel URL (comma-separate multiple domains) and redeploy. Table QR codes use this URL.
5. Seed once from your machine with the Atlas `MONGO_URI`: `npm --prefix server run seed`.

## Restaurant spec layer (QR + waiter + billing POS)
- Guests scan the table QR, enter name + 10-digit mobile (billing only), order, add more, pay cash. Table 13 never exists (tables 1-12, 14-33; enforced in the model and seed).
- Every order, add-on and item cancellation creates a `PrintJob` (kitchen receipt with table number, ADD-ON header, CANCELLED receipt). `print-agent/agent.js` runs on the billing PC and prints to the LAN printers over ESC/POS (port 9100).
- Billing desk: `/pos` (login `billing@sparkling.com`). Occupied tables, edit/remove items, edit customer, discount, print to kitchen, print bill (separate bill printer), cash payment, today's orders + date/name/mobile/table history.
- Waiter orders: `POST /api/pos/orders`. Staff routes accept only `STAFF_ALLOWED_IPS`. Orders are auto-deleted after 120 days (MongoDB TTL index).
- POS desktop: `cd pos-desktop && npm i && POS_URL=https://your-app.vercel.app npm start` (or `npm run dist` for a Windows installer).
- Print agent: `API_URL=... PRINT_AGENT_KEY=... KITCHEN_PRINTER_IP=... BILL_PRINTER_IP=... node print-agent/agent.js`
