# Syllabix NG

**Syllabix** is an offline-first Progressive Web App (PWA) built for Nigerian
teachers. It auto-generates curriculum-aligned lesson plans, pupil copy notes,
schemes of work and assessments — and keeps working even with poor or no
internet connectivity.

🌍 **Live app:** https://syllabixng.vercel.app

---

## What Syllabix Does

Syllabix removes the repetitive, time-consuming parts of lesson preparation so
teachers can focus on teaching.

### Core Features

- **AI Lesson Plan Generator** — Enter a topic, subject, class level and
  objectives and get a structured, curriculum-aligned lesson plan to review
  before accepting.
- **Copy Note Generator** — Produce clean, pupil-ready copy notes in plain text,
  ready to share or print.
- **Schemes of Work** — Plan a full 39-week academic year or a single term, with
  note generation per week.
- **Auto Assessment Generator** — Create WAEC/NECO/UBE-style tests with answer
  keys.
- **Lesson Reviewer** — Score a lesson plan out of 10 with critiques and an
  "Improve This Lesson Plan" option.
- **Class Tracker** — Manage student rosters, scores and at-risk analytics.
- **Teacher Portfolio** — Aggregate your activity and export PDF appraisals.
- **Templates & Resources** — A searchable library of curriculum templates and a
  curated, offline resource library.
- **School Collaboration** — Join a school workspace by code, see members and
  their roles (teacher, headmaster/mistress, director, admin), share, comment
  and review work. Higher-ranked members get additional management permissions.
- **Localization** — UI available in English, Yoruba, Igbo and Hausa.

### Offline-First by Design

- Most work (lesson plans, notes, schemes, drafts) is stored locally in
  **IndexedDB** and never leaves the device unless you sign in for cloud/
  collaboration features.
- A **service worker** caches the app shell so it loads instantly and works
  offline.
- A **sync queue** pushes pending changes (including support messages) to the
  cloud automatically when the device comes back online (last-write-wins, with a
  retry limit).
- Anonymous lesson drafts persist across refresh.

---

## Tech Stack

- **Frontend:** React 18, Vite 5, TypeScript 5
- **Styling:** Tailwind CSS v3, shadcn/ui, Framer Motion
- **PWA:** vite-plugin-pwa + Workbox service worker
- **Local storage:** IndexedDB
- **Backend (Lovable Cloud / Supabase):** Postgres with Row-Level Security,
  Auth, Storage and Edge Functions
- **AI:** Lovable AI Gateway via Supabase Edge Functions (SSE streaming)

---

## Security & Privacy

- **Row-Level Security (RLS)** on all user data tables, using `SECURITY DEFINER`
  helper functions to avoid recursive policy checks.
- **Role-based authorization** for workspace actions, enforced server-side.
- **Password reset** flow and **leaked-password protection (HIBP)** on sign-up.
- **HTTP security headers** (CSP, HSTS, X-Content-Type-Options, Referrer-Policy,
  Permissions-Policy and more) configured in `public/_headers`.
- **Terms of Service** (`/terms`) and **Privacy Policy** (`/privacy`) explain
  exactly how data is handled.

### Security checklist (implemented)

| Area | Control |
| --- | --- |
| Authentication | Managed auth provider (no custom crypto); passwords hashed by the provider; email verification on sign-up |
| Password policy | Minimum 8 chars with uppercase, lowercase, number and special character — enforced on sign-up and reset (`src/lib/validation.ts`) |
| Password reset | Single-use, time-limited provider tokens; rate limited |
| Brute force | Client-side lockout after 5 failed sign-ins for 15 minutes (`src/lib/login-guard.ts`) plus provider-side rate limiting |
| Sessions | Provider-managed tokens with refresh rotation; no custom session cookies |
| Authorization | Role checks (`teacher`, `subject_head`, `headmaster`, `director`, `admin`) run server-side in edge functions; UI checks are cosmetic only |
| Database | RLS on every user table, scoped to `auth.uid()`; privileged helpers live in the `private` schema; explicit `GRANT`s per role |
| Input validation | `zod` schemas client-side, `sanitizeText` length/format validation server-side; parameterized queries only (no string-built SQL) |
| XSS | No `dangerouslySetInnerHTML` on user content; AI output rendered as plain text |
| CORS | Per-request origin allowlist (first-party origins only) — no wildcard (`supabase/functions/_shared/http/cors.ts`) |
| Rate limiting | Sliding-window server-side limiter per user/IP per endpoint (`api_rate_limits`) |
| Headers | Strict CSP, HSTS, `nosniff`, `SAMEORIGIN`, Referrer-Policy, Permissions-Policy |
| Secrets | All keys in environment/secret store; only the public anon key ships in the bundle; `.env` git-ignored |
| Logging | Structured JSON logs for auth denials, rate-limit blocks, account export/delete; no passwords or tokens logged |
| Errors | Global handler returns generic messages; details stay server-side |
| Dependencies | `npm audit` clean of high/critical; text lockfile committed; transitive pins via `overrides` |

### Data rights & retention

- **Export:** Settings → *Your Data Rights* → *Download My Data (JSON)* returns
  every server-side record plus local drafts (GDPR/NDPR portability).
- **Delete:** *Delete My Account* erases all owned rows and the auth account.
- **Data minimization:** we collect name, school name, teaching context and
  email only — no addresses, phone numbers or student identifiers beyond the
  roster names a teacher chooses to enter.
- **Retention:** support messages are kept 12 months; rate-limit rows are purged
  hourly; deleted accounts are removed immediately (no soft delete).
- **Analytics:** none. Core Web Vitals are measured in-browser and never sent to
  a third-party tracker, so no cookie consent banner is required.

---

## Environment Variables

Copy `.env.example` to `.env`. Frontend values are public by design (RLS
protects the data); backend secrets live in the Cloud secret store and are never
committed.

| Variable | Where | Purpose |
| --- | --- | --- |
| `VITE_SUPABASE_URL` | frontend | Backend API URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | frontend | Public anon key |
| `VITE_SUPABASE_PROJECT_ID` | frontend | Project reference |
| `LOVABLE_API_KEY` | backend | AI gateway key |
| `ALLOWED_ORIGINS` | backend | Optional extra CORS origins (comma separated) |

---

## Project Structure

```
public/            Static assets, manifest, service worker output, _headers, robots, sitemap
src/
  components/      Reusable UI + app shell
  pages/           Route-level screens (Dashboard, LessonPlanForm, Collaborate, ...)
  lib/             IndexedDB, sync, AI helpers, export, theme, validation
  integrations/    Supabase client + generated types
supabase/
  functions/       Edge functions (generate-lesson, copy-note-chat, ...)
  migrations/      Database schema & RLS migrations
```

---

## Development

Requires Node.js & npm.

```sh
npm install      # install dependencies
npm run dev      # start the dev server with hot reload
npm run build    # production build
```

> Offline/PWA behavior only works in the **published** app, not the in-editor
> preview.

---

## Testing

```sh
npx vitest run     # unit + integration tests
npm audit          # dependency vulnerability scan
npx tsc --noEmit   # type check
```

Covered by automated tests: password policy, login lockout, and the deny-all
policy protecting the internal rate-limit table (a real network check against
the live API).

### Manual security test checklist

1. Sign up with `password` → rejected by the password policy.
2. Enter a wrong password 5 times → sign-in locks for 15 minutes.
3. Sign in as a teacher and try a workspace role change → rejected server-side.
4. Call an edge function from an unknown origin → no CORS headers returned.
5. Call an AI endpoint 25 times in a minute → HTTP 429 with `Retry-After`.
6. Query another user's lesson plans directly through the API → zero rows.
7. Delete your account → sign-in with those credentials fails afterwards.
8. Tab through any page → visible focus ring and a working skip-to-content link.

---

## Deployment

- Publish from Lovable; hosting terminates TLS and redirects HTTP → HTTPS.
- Security headers ship with the build via `public/_headers` — verify with
  `curl -I https://<your-domain>`.
- Static assets are served immutable for one year; `sw.js` is never cached.
- Database backups are managed by the Cloud backend (daily, point-in-time).
  Users can also self-backup from Settings → Cloud Backup, and restore from a
  downloaded file.
- Monitoring: edge function logs contain structured security events; Core Web
  Vitals are reported in-browser.

---

## Support

- In-app **Help Center** (`/help`) — FAQs for install, login and lesson
  generation.
- **Contact form** (`/contact`) — works offline and syncs when back online.
- **Email:** syllabixng@gmail.com
- **WhatsApp:** +234 802 795 7871

---

© Syllabix. Built to help Nigerian teachers do more with less.
