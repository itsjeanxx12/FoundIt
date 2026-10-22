# FoundIt

FoundIt is a small school lost-and-found app. Students and families can browse
found items, while staff can post items and mark them returned.

## What it supports

- Browse, search, sort, and filter found items
- View item photos, descriptions, dates, categories, and collection locations
- Include or hide returned items
- Post a found item with a JPEG, PNG, or WebP photo up to 2 MiB
- Mark an item returned or awaiting collection
- Protect staff actions with a shared password

The current version does not include online ownership claims, pickup approvals,
individual staff accounts, or item deletion. Collection is handled at School
reception.

## Tech stack

- Next.js 16 and React 19
- Supabase Postgres and Storage
- Node.js 22.9 or later

The browser never receives Supabase credentials. Public reads and staff writes
go through the Next.js API, and staff writes require `STAFF_PASSWORD`.

## Run locally

Install dependencies and start the development server:

```bash
npm ci
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The interface loads without
Supabase, but the item list reports a setup error until the environment variables
and database are configured.

## Connect Supabase

1. Copy the environment template:

   ```bash
   cp .env.example .env.local
   ```

2. Add your project URL, server secret, and a random staff password:

   ```env
   SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
   SUPABASE_SECRET_KEY=YOUR_SERVER_SECRET_KEY
   STAFF_PASSWORD=YOUR_RANDOM_PASSWORD_AT_LEAST_24_CHARACTERS
   ```

   Generate a suitable staff password with:

   ```bash
   node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
   ```

3. Run
   [`supabase/migrations/202610190001_school_lost_found.sql`](supabase/migrations/202610190001_school_lost_found.sql)
   in the Supabase SQL Editor.

4. Verify the connection and schema:

   ```bash
   npm run check:setup
   ```

Keep `.env.local`, the Supabase secret key, and the staff password private. Do
not use `NEXT_PUBLIC_` prefixes for them. See
[`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) for complete setup, verification,
deployment, and troubleshooting instructions.

## Development checks

```bash
npm run check
```

This runs the API tests, production build, and HTTP smoke test. The automated
tests use a simulated Supabase client, so they do not require project credentials.

You can also run the checks separately:

```bash
npm test
npm run build
npm run test:smoke
```

## Deploy

Import the repository into Vercel as a Next.js project. Add `SUPABASE_URL`,
`SUPABASE_SECRET_KEY`, and `STAFF_PASSWORD` as server-side environment variables,
then deploy. Do not configure the project as a static export because the API
routes must run on the server.

Photos and descriptions are public. Upload item-only photos without student
faces, names, ID cards, or other private information.
