# Inventory-Logistics System

A standalone version of 1WAN's Inventory List / Warehouse Log / Delivery Tracker /
Logistics Budget system — no Claude account or Airtable needed. It's a single
static site (`index.html`) backed by a free-tier [Firebase](https://firebase.google.com)
Firestore database, deployable straight to [Vercel](https://vercel.com).

Everyone who opens the site sees the same live data. Signing in with an
`@1wan.ph` email/password account is required — Firestore itself refuses
reads and writes from anyone else, not just the page.

## 1. Create a Firebase project (free)

1. Go to https://console.firebase.google.com → **Add project** → give it any
   name (e.g. `1wan-inventory`) → finish the wizard (Google Analytics is optional,
   turn it off if you don't want it).
2. In the left sidebar: **Build → Firestore Database → Create database** →
   pick a region close to you → start in **production mode**.
3. Left sidebar: **Build → Authentication → Get started** → under
   **Sign-in method**, enable **Email/Password** → save.
4. Left sidebar: **Project settings** (gear icon) → scroll to **Your apps** →
   click the **`</>`** (web) icon → register an app (any nickname, no hosting
   needed) → copy the `firebaseConfig` object it shows you.
5. Paste those values into **`firebase-config.js`** in this folder, replacing
   the `"REPLACE_ME"` placeholders. Leave `ALLOWED_EMAIL_DOMAIN` as `"1wan.ph"`
   (or change it if your company domain is different, or blank it out — not
   recommended — to allow any email).

No "authorized domains" setup needed — that's only required for OAuth
providers (Google, etc.); plain email/password sign-in works from any
domain, including `localhost`, out of the box.

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
3. Vercel gives you a URL like `inventory-logistics-system.vercel.app`.

Every future `git push` to `main` auto-redeploys.

## 5. Add your inventory

The database starts empty. Open the deployed site, click **Create account**
with your `@1wan.ph` email and a password (everyone on the team creates their
own), then either:

- Use the **"+"** button on the Inventory List to add SKUs one at a time, or
- Use **"↑" (Bulk import serial numbers)** on the Inventory List: download the
  template, fill in Model + Serial Number rows, upload it — this also
  auto-creates any SKU that doesn't exist yet.

## Request for Testing

A separate section (and a form on the standalone Viewing Deck) for putting
units out on trial with a customer. Records live in a `test_requests`
Firestore collection — no extra setup, the existing rules already cover it.

- **Filing** takes the units out of stock immediately, like a check-out.
  "Requested by" is the signed-in email. Like the check-out form, a request
  can be a **single item** or **multiple items** (several units/models under
  one customer and PO/RFQ). Items come from the inventory list only.
- **Reference attachment (required):** the request needs a **Reference** file
  (PDF, image, Word, Excel, CSV, text or email file, max 3 MB). Name the file
  after the PO/RFQ no. (e.g. `RFQ-2026-014.pdf`) — the **Reference** column
  shows just that number (the file name without its extension).
- **Download once, then it's removed:** the uploaded file is kept in the
  database (`request_files` collection, split into small pieces) only until
  someone clicks **Download file** on that request in the main system. After
  that one download the file is deleted to save space and the request shows
  "File downloaded"; the Reference number stays. The Viewing Deck can upload
  but not download. Deleting a request also deletes a file that's still
  waiting. When editing a request the attachment is optional; choosing a new
  file replaces the Reference and the waiting file.
- **No duplicates:** a serial number that's already on another request
  (On going, Passed, or Checked out) can't be requested again, and the same
  serial can't appear twice in one request. Returned units are free again.
- **Statuses:** On going → **Passed** or **Returned**.
- **Passed** units show a *Proceed to check out* button, which opens the
  Delivery Tracker form pre-filled. Stock is *not* deducted a second time
  (item/qty/serials are locked), and the request shows "Checked out".
- **Returned** puts the units and their serial numbers back in the
  Inventory List.
- The Overview's **Units out for testing** counts On going + Passed requests
  that haven't gone to a delivery yet (plus any older check-outs logged with
  the "Internal testing" purpose).



## Return Units (Warehouse Log)

Next to **+ Check in** on the Warehouse Log there is **↩ Return units**, for
units that went out but weren't used. It works like a check-in — pick an item
from the inventory list (existing items only), a quantity and the serial
numbers (single or multiple items) — but it is logged separately in a
**Returned units** table (Firestore collection `unit_returns`, covered by the
existing rules) and adds the units and serials back to the Inventory List.

- A serial that is already in stock, on an open test request (use *Returned*
  on that request instead), or listed twice is refused.
- Edit and Delete reverse the stock change. They are blocked if any of the
  returned units have already gone out again.
- Returns also show up in the Overview activity feed.

## Testing locally before you deploy

`index.html` uses ES modules (`<script type="module">`), which browsers
block from a plain `file://` double-click. Serve the folder over `http://`
instead, from this directory:

```bash
npx serve .
# or: python -m http.server 8080
```

Email/password sign-in works the same locally as it does deployed.

## What changed from the Claude Artifact version

- The `db`/`downloads` capabilities (Claude-only APIs) are replaced by a small
  adapter (top of `index.html`) that gives the exact same
  `db.collection(...)/.doc(...)` interface, backed by real Firestore — none of
  the app's business logic (stock math, edit/delete reconciliation, multi-line
  check-in/out, the Logistics Budget rollup) needed to change.
- Excel export/import now uses a normal `<a download>` link instead of
  Claude's download prompt.
- An email/password sign-in screen (restricted to `@1wan.ph`, enforced by
  Firestore rules, not just the page) replaces Claude's built-in organization
  membership check. Each person creates their own account with **Create
  account**; **Forgot password?** sends a reset email.
- Everything else — layout, colors, the Viewing Deck at `/#deck`, the process
  flow explainer — is unchanged.

## Security note

Firestore rules currently grant the **same** read/write access to every
signed-in `@1wan.ph` account — there's no separate "view only" role. Anyone
who can sign in can also edit or delete records, same as the original system.
If you later want read-only staff accounts, that needs Firebase custom claims
and a second rule branch — ask for it as a follow-up.
