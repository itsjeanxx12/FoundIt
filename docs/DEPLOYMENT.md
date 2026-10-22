# Supabase setup and publication

## 1. Create Supabase

1. Sign in at https://supabase.com/dashboard and create a project. Choose your organization, project name, region, and a strong database password. Save that password separately; the app does not use it.
2. Wait for the project to finish provisioning.
3. Open **SQL Editor**, create a query, paste the entire contents of `supabase/migrations/202610190001_school_lost_found.sql`, and run it once. This creates the `public.items` table, its index and access rules, and the public `item-photos` Storage bucket. If `items` already exists from this migration, do not drop it or rerun the initial migration; verify the existing setup instead.
4. Run `supabase/verify.sql`. Expect RLS enabled, all six anon/authenticated permissions false, no policies for `items`, and `item-photos` public with a 2097152-byte limit and JPEG/PNG/WebP MIME types. Review any existing Storage policies: none should grant browser users upload, update, or delete access to this bucket.
5. Get the **Project URL** from the project's Connect dialog or API settings. Under **Settings → API Keys**, create/copy a secret key beginning `sb_secret_`. A legacy `service_role` key also works. Do not use the publishable or `anon` key.

The app uses Next.js API routes for database writes; it does not require Supabase Auth users, email providers, redirect URLs, or Edge Functions. Students browse publicly and staff use the shared app password. The Supabase database password, API secret, and staff password are three different credentials.

Reference: [Supabase API keys](https://supabase.com/docs/guides/api/api-keys).

## 2. Configure and verify locally

Use Node.js 22.9 or later (latest Node 22 LTS recommended).

```bash
npm ci
cp .env.example .env.local
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

The last command generates a staff password. Save it in a password manager and set these values in `.env.local`:

```dotenv
SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
SUPABASE_SECRET_KEY=sb_secret_YOUR_ACTUAL_SECRET
STAFF_PASSWORD=YOUR_GENERATED_64_CHARACTER_PASSWORD
```

Use a random password of at least 24 characters. Example placeholders and short passwords are rejected. Keep these variables server-side, without `NEXT_PUBLIC_` prefixes. `.env.local` is ignored by Git. Do not paste secrets into screenshots or submission documents.

```bash
npm run check:setup
npm run check
npm start
```

`check:setup` reads the actual Supabase table and bucket settings without changing data. It does not verify RLS policies or upload/update permissions; run the SQL verification and manual checks below. `check` runs automated tests, a production build, and HTTP smoke checks without needing Supabase credentials. GitHub Actions runs the same checks on pushes and pull requests.

## 3. Publish on Vercel

1. Push the repository to your Git provider, including the lockfile and SQL migration, excluding `.env.local`.
2. In Vercel, choose **Add New → Project**, import the repository, and select the directory containing `package.json` as the root. Use the **Next.js** framework preset and Node.js 22.x. Keep the default output directory and `npm run build` build command. A static export will not run the backend.
3. Under the project's **Settings → Environment Variables**, add `SUPABASE_URL`, `SUPABASE_SECRET_KEY`, and `STAFF_PASSWORD` with the actual values for **Production**. Prefer a separate Supabase project and credentials for Preview deployments if you enable them.
4. Deploy and open the HTTPS production URL. If you change an environment variable afterward, redeploy so the change takes effect.
5. Complete the acceptance checks below using the deployed URL.

Reference: [Vercel environment variables](https://vercel.com/docs/environment-variables).

## 4. Acceptance and submission

- Open `/api/items`; expect HTTP 200 and `{"items": [...]}` (an empty array is valid initially).
- Open Staff tools, enter a wrong password, and try adding an item; expect an authorization error and no new record/photo.
- Enter the correct password and add a clearly labeled test item with a real JPEG, PNG, or WebP under 2 MiB. Confirm its photo loads.
- Refresh and open the site in a separate browser; confirm the item persists and browsing needs no password.
- Mark it returned, then enable **Include returned items** to confirm its status. Mark it not returned and verify again after refreshing.
- For test cleanup, use the Supabase dashboard to delete the test row and its matching Storage object (`photo_path`); the app intentionally has no delete endpoint.
- Submit the repository URL, deployed URL, setup documentation, and screenshots of the working flows. Share the staff password privately only with authorized reviewers.

Photos and descriptions are public. Use item-only photos without student faces, names, or ID cards. This version uses a shared staff password, so it has no individual staff audit trail or account revocation. Rotate it by changing the deployment environment variable and redeploying. For broader public use, add staff accounts and deployment-level rate limiting; the API does not currently implement distributed rate limiting. The public list currently loads all items, appropriate for a small school inventory; add pagination before growing it substantially.

## Troubleshooting

| Symptom | Check |
| --- | --- |
| Setup checker rejects the key | Use `sb_secret_...` or legacy `service_role`, not a publishable/anon key or the database password. |
| Cannot read items table | Confirm the migration ran in the same project as the URL/key. |
| Bucket settings fail | Confirm `item-photos` is public, max size 2097152 bytes, allowed MIME types `image/jpeg`, `image/png`, `image/webp`. |
| HTTP 503 | Check server environment variables, staff password length, migration, and whether the Supabase project is available. Run `npm run check:setup` locally with the matching configuration. |
| HTTP 401 | The staff password entered in the page differs from the server's value. |
| HTTP 403 | Open the site directly on its deployed origin; a custom reverse proxy must preserve the public request origin. |
| HTTP 413 | Choose a photo no larger than 2 MiB. |
| Changes to credentials do not work | Restart local development or redeploy on Vercel after changing variables. |
