# Inventory-Logistics System

A standalone version of 1WAN's Inventory List / Warehouse Log / Delivery Tracker /
Logistics Budget system — no Claude account or Airtable needed. It's a single
static site (`index.html`) backed by a free-tier [Firebase](https://firebase.google.com)
Firestore database, deployable straight to [Vercel](https://vercel.com).

Everyone who opens the site sees the same live data. Signing in with a company
Google account is required — Firestore itself refuses reads and writes from
anyone else, not just the page.

## 1. Create a Firebase project (free)

1. Go to https://console.firebase.google.com → **Add project** → give it any
   name (e.g. `1wan-inventory`) → finish the wizard (Google Analytics is optional,
   turn it off if you don't want it).
2. In the left sidebar: **Build → Firestore Database → Create database** →
   pick a region close to you → start in **production mode**.
3. Left sidebar: **Build → Authentication → Get started** → under
   **Sign-in method**, enable **Google** → save.
4. Left sidebar: **Project settings** (gear icon) → scroll to **Your apps** →
   click the **`</>`** (web) icon → register an app (any nickname, no hosting
   needed) → copy the `firebaseConfig` object it shows you.
5. Paste those values into **`firebase-config.js`** in this folder, replacing
   the `"REPLACE_ME"` placeholders. Leave `ALLOWED_EMAIL_DOMAIN` as `"1wan.ph"`
   (or change it if your company domain is different, or blank it out — not
   recommended — to allow any Google account).
6. Still in the Firebase Console: **Authentication → Settings → Authorized
   domains** → add your Vercel domain once you have it (step 4 below) —
   `localhost` is already allowed by default for local testing.

## 2. Lock down the database

By default a fresh Firestore project's rules deny everything, which is safe
but means the app can't read or write yet. Apply the rules in this repo:

1. Firebase Console → **Firestore Database → Rules**.
2. Delete what's there and paste in the contents of **`firestore.rules`**
   (already scoped to `@1wan.ph` Google accounts only).
3. Click **Publish**.

This is the *real* access control — it's enforced by Firebase's servers, not
by the page's own login screen, so it holds even if someone bypasses the UI.

## 3. Put it on GitHub

From this folder:

```bash
git init
git add .
git commit -m "Initial commit: Inventory-Logistics System"
```

Then create an empty repository on https://github.com/new (don't check
"Add a README" — this folder already has one), and push:

```bash
git remote add origin https://github.com/<your-username>/inventory-logistics-system.git
git branch -M main
git push -u origin main
```

## 4. Deploy on Vercel

1. Go to https://vercel.com/new, sign in (GitHub login is easiest), and
   **import** the repository you just pushed.
2. Framework preset: leave it as **Other** — this is a plain static site,
   nothing to build. Click **Deploy**.
3. Vercel gives you a URL like `inventory-logistics-system.vercel.app`. Add
   that domain to Firebase's **Authorized domains** list (step 6 above) or
   Google sign-in will fail with an `auth/unauthorized-domain` error.

Every future `git push` to `main` auto-redeploys.

## 5. Add your inventory

The database starts empty. Open the deployed site, sign in, and either:

- Use the **"+"** button on the Inventory List to add SKUs one at a time, or
- Use **"↑" (Bulk import serial numbers)** on the Inventory List: download the
  template, fill in Model + Serial Number rows, upload it — this also
  auto-creates any SKU that doesn't exist yet.

## Testing locally before you deploy

`index.html` uses ES modules (`<script type="module">`), which browsers
block from a plain `file://` double-click. Serve the folder over `http://`
instead, from this directory:

```bash
npx serve .
# or: python -m http.server 8080
```

`localhost` is already in Firebase's authorized domains by default, so sign-in
works during local testing too.

## What changed from the Claude Artifact version

- The `db`/`downloads` capabilities (Claude-only APIs) are replaced by a small
  adapter (top of `index.html`) that gives the exact same
  `db.collection(...)/.doc(...)` interface, backed by real Firestore — none of
  the app's business logic (stock math, edit/delete reconciliation, multi-line
  check-in/out, the Logistics Budget rollup) needed to change.
- Excel export/import now uses a normal `<a download>` link instead of
  Claude's download prompt.
- A Google sign-in screen replaces Claude's built-in organization membership
  check, restricted to your email domain via Firestore rules.
- Everything else — layout, colors, the Viewing Deck at `/#deck`, the process
  flow explainer — is unchanged.

## Security note

Firestore rules currently grant the **same** read/write access to every
signed-in `@1wan.ph` account — there's no separate "view only" role. Anyone
who can sign in can also edit or delete records, same as the original system.
If you later want read-only staff accounts, that needs Firebase custom claims
and a second rule branch — ask for it as a follow-up.
