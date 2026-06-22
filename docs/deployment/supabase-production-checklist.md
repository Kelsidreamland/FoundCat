# FOUND CAT Supabase Production Checklist

This checklist wires the production web app to Supabase for email login, cloud backup, and the public shared cat map.

Production app:

- `https://found-cat.vercel.app`

Brand:

- Chinese: `轉角遇到貓`
- English: `FOUND CAT`

## 1. Create The Supabase Project

1. Create a Supabase project for FOUND CAT production.
2. Keep the project URL and anon public key ready.
3. Do not commit the service role key, database password, or any private key to this repo.

The app only needs these public frontend variables:

```dotenv
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

## 2. Install The Database Schema

Preferred production path:

1. Connect the Supabase project to the GitHub repo.
2. Configure the integration to use the repo root.
3. Let Supabase apply migrations from `supabase/migrations/`.

Fallback manual path:

1. Open the Supabase SQL editor.
2. Run the full file at `supabase/found-cat-schema.sql`.
3. Confirm these objects exist:
   - `public.profiles`
   - `public.cat_cards`
   - `public.public_cat_cards`
4. Confirm row-level security is enabled for user-owned tables.
5. Confirm `public.public_cat_cards` can be selected by `anon` and `authenticated`.

Local readiness check:

```bash
npm run check:cloud
```

This command checks committed Supabase migrations, the legacy schema reference, and the env example. It cannot verify Vercel production environment variables.

## 3. Configure Supabase Auth

Use Supabase email magic links for the first public launch. The app sends a
sign-in email; the user opens the link, returns to FOUND CAT, then backs up
local cat cards. This keeps launch setup light and avoids blocking release on
custom SMTP or email template work.

Set the production site URL:

```text
https://found-cat.vercel.app
```

Add redirect URLs:

```text
https://found-cat.vercel.app
https://found-cat.vercel.app/**
http://localhost:5173
http://localhost:5173/**
```

Keep the email copy simple and brand-safe:

- `FOUND CAT`
- `轉角遇到貓`

Optional email template copy:

```html
<h2>轉角遇到貓 FOUND CAT</h2>
<p>請點下方登入連結，回到轉角遇到貓備份你的貓咪地圖。</p>
<p><a href="{{ .ConfirmationURL }}">登入 FOUND CAT</a></p>
```

The deferred OTP/SMTP path is documented in
`docs/deployment/supabase-otp-guide.html`, but it is not required for the first
launch.

## 4. Add Vercel Environment Variables

In the Vercel project, add these variables for Production:

```dotenv
VITE_SUPABASE_URL=<Supabase project URL>
VITE_SUPABASE_ANON_KEY=<Supabase anon public key>
```

Optional terminal check:

```bash
vercel env ls
```

Do not paste private keys into terminal logs or commits.

## 5. Redeploy Production

After adding Vercel env vars, redeploy:

```bash
vercel deploy --prod
```

Then confirm the alias:

```bash
vercel inspect found-cat.vercel.app
```

## 6. Mobile Acceptance Checklist

Run these checks on a phone after production deploy.

1. Open `https://found-cat.vercel.app`.
2. Confirm the app still works without forcing login.
3. Open cloud backup from the home flow.
4. Enter an email and receive the sign-in email.
5. Open the sign-in link, then return to FOUND CAT.
6. Back up local cat cards.
7. Open a cat on `我的地圖`.
8. Publish the cat to `大家的地圖`.
9. Switch to `大家的地圖` and confirm the cat appears.
10. Sign out.
11. Confirm logged-out users can browse public cats but cannot publish cats.

## 7. Known Manual Boundaries

- Local-only use still works when Supabase is not configured.
- Public sharing remains explicit; new local cats are private by default.
- Raw coordinates should not be displayed in user-facing cards.
- Spot notes should remain private unless a future share-specific toggle is added.
- The first public test does not include friends, comments, likes, or payments.
