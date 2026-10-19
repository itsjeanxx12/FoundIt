# FoundIt

**FoundIt is a school lost-and-found app that helps staff post items and makes it easier for students and families to find where to collect them.**

Found items appear in one public list with a photo, description, category, and date. Staff can add an item and mark it returned. The collection point for this version is School reception.

## Features

- Browse recently found items and their photos
- Add an item with a description, category, date, and photo
- Mark an item as returned
- Store item details and photos between visits
- Protect staff actions with a shared password

## How it works

FoundIt uses Next.js for the app and API, Supabase for the item list and photos, and can be deployed to Vercel. Browsing is public. Adding items and changing their status require the staff password.

## Run locally

You will need Node.js 22 or later and a Supabase project.

```bash
npm install
```

Copy `.env.example` to `.env.local`, then add your Supabase project URL, a server secret key, and a staff password:

```env
SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
SUPABASE_SECRET_KEY=YOUR_SERVER_SECRET_KEY
STAFF_PASSWORD=YOUR_STAFF_PASSWORD
```

The secret key and password must stay server-side. Do not add a `NEXT_PUBLIC_` prefix or commit `.env.local`.

In your Supabase project's SQL Editor, run [`supabase/migrations/202610190001_school_lost_found.sql`](supabase/migrations/202610190001_school_lost_found.sql). This creates the items table and the public `item-photos` bucket. Run [`supabase/verify.sql`](supabase/verify.sql) to check the access settings.

Start FoundIt:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Use the staff password in the page to add items or update their status. Items are saved to Supabase, so they remain after a refresh or restart.

## Items and photos

Each item has a title, description, category, date found, photo, collection point, returned status, and date it was added. Categories are Clothing, Electronics, Books, Accessories, and Other. The collection point is School reception.

Photos can be JPEG, PNG, or WebP files up to 2 MiB. Photos are public. Upload item-only photos without student faces, names, or ID cards, and do not include private information in descriptions.

## Deploy to Vercel

Import this repository into a Vercel project. Set `SUPABASE_URL`, `SUPABASE_SECRET_KEY`, and `STAFF_PASSWORD` in the project's server-side environment variables, then deploy. Use the included `vercel.app` address. No custom domain is required. See [Vercel's Next.js deployment guide](https://vercel.com/docs/frameworks/nextjs) for project setup.

## Development

```bash
npm test
npm run build
npm run start
```

`npm run test:smoke` checks the production page and API using a temporary local server. The automated tests use a simulated Supabase connection; run FoundIt with your own Supabase project to check saved items and photos.

FoundIt is still being validated with school staff. The team needs to confirm that staff would use it and that School reception is the right collection point.
