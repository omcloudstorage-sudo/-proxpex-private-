# Proxpex (prototype)

A lightweight client-project roadmap tool. Roles: **Admin** (company admin), **Project Manager**,
**Client**. Admin creates PMs and Clients, creates projects, assigns a PM + Client to each one,
and can edit any project directly (same editing rights as its assigned PM). Every project has a
customizable, breadcrumb-style stage timeline (Kickoff → Requirements → UI/UX → Development →
QA → Launch by default — rename, reorder, add, or remove stages freely). Each stage holds:

- **MOM entries** — one or more minutes-of-meeting records, each with notes, an optional meeting
  link (Google Meet/Zoom/etc.), and a date. Full add/edit/delete per entry.
- **Documents & links** — labeled URLs (Figma, Google Doc, Excel/Sheet, PDF, APK, or Other), shown
  with a type icon. Full add/edit/delete per link. No file uploads in this prototype — just links.
- A status (Pending / In progress / Done) and a next-milestone date with a live days-remaining
  indicator.

## 1. Create a Firebase project (free tier is enough)

1. Go to https://console.firebase.google.com → **Add project** → name it (e.g. `proxpex`).
2. **Build → Authentication → Get started → Sign-in method → Email/Password → Enable.**
3. **Build → Firestore Database → Create database** → start in **production mode** (we ship
   our own security rules below) → pick any region.
4. **Project settings (gear icon) → General → Your apps → Add app → Web (`</>`)** → register
   an app (no need for Firebase Hosting). Copy the `firebaseConfig` values.
5. **Project settings → Service accounts → Generate new private key** → downloads a JSON file.
   You'll need `project_id`, `client_email`, and `private_key` from it.

## 2. Configure environment variables

```
cp .env.local.example .env.local
```

Fill in the `NEXT_PUBLIC_FIREBASE_*` values from step 1.4, and the `FIREBASE_ADMIN_*` values
from the service account JSON in step 1.5. Keep the private key wrapped in quotes with its
`\n` sequences intact (don't convert them to real line breaks).

## 3. Deploy the security rules

Easiest path — paste the contents of `firestore.rules` into the Firebase Console:
**Firestore Database → Rules → paste → Publish.**

(Or, if you have the Firebase CLI: `firebase deploy --only firestore:rules`.)

## 4. Install and run

```
npm install
npm run dev
```

Open http://localhost:3000.

## 5. First run — create your company

1. Click **Sign in → "Set up your company"** on the login screen.
2. Enter your name, company name, email, and a password. This creates the **Admin** account
   plus the company record.
3. You'll land on the **Admin dashboard**. Go to the **Project managers** tab → **+ New project
   manager** to create a PM login (name, email, temporary password) — share those credentials
   with your PM directly (Slack/WhatsApp/etc.), there's no email-sending in this prototype.
4. Do the same under **Clients** to create a client login.
5. Go to **Projects** → **+ New project**, name it, assign the PM and client → **Create project**.
6. Open the project. As Admin or PM you can edit stage status, MOM entries, links, and the due
   date; rename, reorder, add, or remove stages. The Client sees the same roadmap read-only.

## Managing PM/Client accounts

From the **Project managers** / **Clients** tab, each row has three actions:

- **Edit** (pencil) — change their name or email.
- **Reset password** (key) — set a new temporary password for them; there's no way to view an
  old password again (not possible with Firebase Auth), so this issues a new one you share out
  of band, same as account creation.
- **Remove** (trash) — deletes their login entirely. If they're still assigned to a project, the
  project simply shows `—` where their name used to appear (same as an unassigned slot) — reassign
  the project to someone else when convenient.

## Branding

Drop a `logo.svg` (or `logo.png`, edit the path in `components/Logo.js`) into the `public/`
folder and it replaces the wordmark everywhere automatically — no code changes needed.

## Notes on this prototype

- **No file uploads** — "documents" are just typed, labeled links (Figma/Google Doc/Excel/PDF/
  APK/Other). Adding real file storage later would mean wiring in Firebase Storage.
- **No email invites** — the Admin creates PM/Client logins directly and shares credentials
  out of band. Worth adding a "send invite email" step before real customers use this.
- **Single company per Admin account** — an Admin signs up once and that creates one company.
  Multi-company-per-admin isn't supported.
- **Firestore rules** in `firestore.rules` enforce: a Client can only read projects where
  they're the assigned client; a PM only projects they're assigned to manage; an Admin
  anything inside their own company. All writes to `projects` (stage edits) are only allowed
  for the Admin or the assigned PM. Account create/edit/delete/password-reset for PMs and
  Clients goes through the `/api/*` routes using the Admin SDK (bypasses client rules, same
  pattern as account creation).
- **Timers**: "days remaining/overdue" on a stage's next milestone is computed live from the
  due date you set — there's no background job or notification yet (a nice next step, e.g.
  a scheduled Cloud Function that pings Slack/email when a milestone is close).

## Data model migration

`scripts/migrate.mjs` is a one-off script that migrated existing data to the current shape:
`users` docs with `role: 'owner'` → `role: 'admin'`, and each project stage's old single
`momNotes` string → a `momEntries` array, plus adding `type`/`id` to existing links. It's
idempotent (safe to re-run) and defaults to a dry run:

```
node --env-file=.env.local scripts/migrate.mjs           # dry run, prints what would change
node --env-file=.env.local scripts/migrate.mjs --apply   # writes the changes
```

New data is always written in the current shape, so this only matters if you're restoring
older data or importing from elsewhere. `lib/stages.js`'s `normalizeStage()` also defensively
reads the old shape at render time, as a safety net.

## Suggested next steps

- Email notifications (invite links, milestone reminders) — Firebase Extensions "Trigger Email"
  or Resend/SendGrid from an API route.
- File uploads instead of link-only (Firebase Storage).
- Activity log per project (who changed what, when).
- Custom stage templates saved per company instead of one hardcoded default.
