# Syllabix NG

**Syllabix** is an offline-first Progressive Web App (PWA) built for Nigerian
teachers. It auto-generates curriculum-aligned lesson plans, pupil copy notes,
schemes of work and assessments — and keeps working even with poor or no
internet connectivity.

🌍 **Live app:** https://syllabixng.lovable.app

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

## Support

- In-app **Help Center** (`/help`) — FAQs for install, login and lesson
  generation.
- **Contact form** (`/contact`) — works offline and syncs when back online.
- **Email:** syllabixng@gmail.com
- **WhatsApp:** +234 802 795 7871

---

© Syllabix. Built to help Nigerian teachers do more with less.
