# Lumora

**An e-learning app for everyone.**

Lumora is a web-based Learning Management System (LMS). Tutors build courses with
structured sections, study material and assessments; students enroll, learn, take
auto-graded quizzes, track their grades and compete on a per-course leaderboard.
On top of that, Lumora ships **lumiVoice**, an AI voice assistant that reads
lessons aloud and can summarize them, making the platform accessible to everyone,
including students with dyslexia or low vision.

The project is split into three independent parts that run as separate processes:

| Part | What it is | Tech | Default port |
|------|------------|------|--------------|
| **frontend** | The single-page app the user sees | Vanilla JS + Vite + Tailwind CSS v4 | 5173 |
| **backend** | The REST API with the business logic | Express.js + PostgreSQL | 3000 |
| **agent** | A small proxy for the AI summaries | Express.js + Google Gemini | 3001 |
| **database** | The relational data store | PostgreSQL 17 (via Docker) | 5433 |

---

## Table of contents

- [Architecture at a glance](#architecture-at-a-glance)
- [Requirements](#requirements)
- [Quick start](#quick-start)
- [The frontend](#the-frontend)
- [The backend](#the-backend)
- [The agent](#the-agent)
- [The database](#the-database)
- [How the three parts talk to each other](#how-the-three-parts-talk-to-each-other)
- [A note on ports](#a-note-on-ports)
- [Security notes](#security-notes)

---

## Architecture at a glance

```
Browser (SPA)  --HTTP/JSON-->  Express API  --SQL-->  PostgreSQL
     |
     +-- lumiVoice read aloud --> SpeechSynthesis (native, in the browser)
     +-- lumiVoice summarize ---> agent  --> Google Gemini
                                  (holds the API key)
```

The core idea: the **frontend** was built first against mock data shaped exactly
like the future API responses. The views never talk to the network directly; they
go through a service layer. That means the **backend** just has to fill a mould
that already exists. And the **agent** exists for one reason only: to keep the AI
API key off the browser.

---

## Requirements

- **Node.js** 18 or newer (v20 LTS recommended)
- **Docker** and Docker Compose (to run PostgreSQL the easy way)
- A database client such as **DBeaver** or **pgAdmin** (optional)
- A **Google Gemini API key** for the AI summary (optional; get one free at
  https://aistudio.google.com/apikey)

---

## Quick start

Open four terminals (database, backend, agent, frontend).

**1. Database (PostgreSQL in Docker)**

```bash
docker compose up -d
```

This starts PostgreSQL on host port **5433** and loads `database/init.sql`.

**2. Backend**

```bash
cd backend
npm install
cp .env.example .env      # then edit the values
npm run dev               # http://localhost:3000
```

**3. Agent**

```bash
cd agent
npm install
cp .env.example .env      # paste your own Gemini key
npm run dev               # http://localhost:3001
```

**4. Frontend**

```bash
cd frontend
npm install
npm run dev               # http://localhost:5173
```

Open http://localhost:5173. A test student account is seeded:
`jordan.kim@example.com` / `password123`.

---

## The frontend

A single-page application (SPA) built with **Vanilla JavaScript**, bundled by
**Vite** and styled with **Tailwind CSS v4**. No framework: the routing, state and
rendering are built from first principles.

### How it is organized

```
frontend/src/
  main.js                 App entry point
  router/                 Custom History API router + route table with role guards
  views/                  One folder per area (auth, intro, student, tutor, shared)
  components/             Reusable UI (navbar, modals, editor tabs, voiceAssistantBar)
  services/               Data layer the views call (course, content, user, tts)
  helpers/                api.js (HTTP client), auth.js (session), toast.js
  data/ + mocks/          Mock data shaped like the future API
  styles/                 Tailwind theme, fonts, base CSS
```

### Key ideas

- **SPA routing.** A custom router uses the browser's History API to change the
  URL and swap the view without reloading the page. Clicks on internal links are
  intercepted so navigation feels instant.
- **Role-based guards.** Every route declares which roles may enter. A student
  cannot open tutor pages and vice-versa; unauthorized access shows a 403 page,
  unknown URLs show a 404 page. Some routes have an extra `canAccess` check (for
  example, a tutor previewing a course must own it).
- **The intro screen.** Logged-out visitors first see an animated intro
  (`views/intro`) with a "Get Started" button that leads to the login. Logged-in
  users skip it automatically.
- **Decoupled data layer.** Views never call `fetch` directly. They call the
  service layer (`services/`), and the services call `helpers/api.js`, which adds
  the auth token and talks to the backend. Swapping mock data for the real API
  required no changes to the views.
- **Safe content rendering.** Lesson content can be Markdown, a YouTube video or a
  Canva embed. A renderer picks the right component by content type. Markdown is
  converted to HTML with **marked** and sanitized with **dompurify** to prevent
  XSS.
- **lumiVoice.** The voice assistant lives in `components/voiceAssistantBar.js`
  and `services/ttsService.js`. See the agent section for how the AI summary works.

### Libraries

- **vite** — dev server and production build.
- **tailwindcss v4** (`@tailwindcss/vite`) — styling and design system.
- **marked** — Markdown to HTML for lessons (also reused to turn Markdown into
  plain text for the voice assistant).
- **dompurify** — sanitizes the generated HTML.

### Scripts

```bash
npm run dev       # start the dev server (port 5173)
npm run build     # production build
npm run preview   # preview the production build
```

---

## The backend

A REST API built with **Express.js** that holds the business logic and talks to
**PostgreSQL**. It uses **JWT** for authentication and **bcrypt** for password
hashing.

### How it is organized

The API is modular, one folder per business area under `backend/src/api`
(`auth`, `user`, `course`, `section`, `item`, `enrollment`, `submission`,
`grade`, `leaderboard`). Each module follows the same four-layer pattern:

```
routes        Declare the endpoints and apply middleware (auth, validation)
controllers   Parse the request, call the service, format the response
services      Hold the business logic and security rules
repository    Parameterized data access to PostgreSQL
```

Shared pieces live outside the modules:

```
backend/src/
  config/postgres/   Connection pool (postgres.db.js) and startup check
  middlewares/       auth.middleware.js (reads the JWT), validation.middleware.js
  repositories/      Base repository
  utils/             Centralized error handler
  index.js           App entry point
```

### Key ideas

- **Layered by responsibility.** If the database changes, only the repository is
  touched; if a rule changes, only the service. Controllers know nothing about SQL.
- **Authentication.** On login the server verifies the password with bcrypt and,
  if valid, signs a JWT that carries the user id and role. Protected routes read
  that token via `auth.middleware.js`, which exposes `req.user = { id, role }`.
- **Passwords are never stored in plain text.** They are hashed with bcrypt; login
  compares the incoming password against the stored hash.
- **Fail-fast startup.** The server will not start listening if PostgreSQL is
  unreachable (`verifyConnection` in `postgres.db.js`), so it never runs in a
  broken state.
- **Connection pooling.** `pg` uses a pool (up to 20 clients) instead of opening a
  new connection per request.

### Business rules (enforced on the server)

Security-critical rules live in the service layer, never only in the frontend,
because the frontend runs on the user's machine and can be bypassed:

- A student only sees open courses plus the private ones they are enrolled in.
- A student cannot create courses; a tutor only edits their own.
- One attempt per quiz (a unique constraint on student + item).
- Correct answers are stripped before a quiz reaches the browser; the server grades.
- Only quizzes score points; reviews are ungraded practice.
- A course code is generated once and never changes.
- The enrolled count is derived with `COUNT(*)`, never stored.

### Current status

Authentication (login and register) is implemented end to end. The remaining
modules exist as a complete, named scaffold following the four-layer pattern,
ready to be filled against the API contract (`API_CONTRACT.md`).

### Libraries

`express`, `pg`, `jsonwebtoken`, `bcryptjs`, `cors`, `dotenv`.

### Environment (`backend/.env`)

```
PORT=3000
DB_HOST=localhost
DB_PORT=5433
DB_NAME=lumora_db
DB_USER=user
DB_PASSWORD=password
JWT_SECRET=change_this_for_a_long_secret
JWT_EXPIRES=7d
```

### Scripts

```bash
npm run dev     # start with --watch (auto restart)
npm start       # start once
```

---

## The agent

The **LumiVoice Agent** is a small, separate Express service with a single job:
generate the AI summary of a lesson. It exists so the **Gemini API key never lives
in the frontend**, where anyone could read it from the browser dev tools.

### How it works

```
Frontend (ttsService.summarizeText)  -->  POST /summary  -->  Google Gemini
                                          (agent holds the key)
```

1. The voice bar sends the lesson text to the agent.
2. The agent (`services/gemini.js`) builds a summary prompt and calls Gemini using
   the `@google/genai` library and the model `gemini-3.1-flash-lite`.
3. The summary is returned and read aloud in the browser.

### The API key can come from two places

1. **A key the user pasted** in the voice assistant settings, sent per request in
   the body as `apiKey`. This lets a user swap an expired key from the UI without
   touching any code.
2. **The server default** in `agent/.env` (`GEMINI_API_KEY`), used when the user
   did not provide one.

### Endpoints

```
POST /summary
  body:  { "text": "the lesson text", "apiKey": "optional user key" }
  200:   { "summary": "..." }
  400:   { "error": "Text is required." }

GET /
  200:   { "status": "ok", "service": "LumiVoice Agent", ... }
```

### Read-aloud vs. summary

Only the **summary** touches the agent and Gemini. The plain **read aloud** runs
entirely in the browser with the native `SpeechSynthesis` API: no server, no key,
no cost. That is why listening to a lesson always works, even if the AI is down.

### Libraries

`express`, `@google/genai`, `cors`, `dotenv`.

### Environment (`agent/.env`)

```
PORT=3001
GEMINI_API_KEY=paste_your_own_key_here
```

Get a key at https://aistudio.google.com/apikey. The `.env` is git-ignored.

### Scripts

```bash
npm run dev     # start with nodemon (auto restart)
npm start       # start once
```

---

## The database

**PostgreSQL 17**, run in Docker via `docker-compose.yml`. It exposes host port
**5433** (mapped to the container's 5432) and loads `database/init.sql` on first
start, which creates the `users` table and seeds two test accounts.

### The model

Seven core tables connected by foreign keys: `users`, `courses`, `sections`,
`contents`, `items`, `enrollments`, `submissions`.

Two columns use the native **JSONB** type: `items.payload` and
`submissions.answers`. JSONB is a native PostgreSQL data type (like `INTEGER` or
`VARCHAR`); using it does not make the database non-relational. It is used only
where the shape of the data is variable: each item type (quiz, final, the three
review formats) needs different fields, and a student's answers depend on how many
questions a quiz has. The tables keep their primary and foreign keys, so the model
stays fully relational; JSONB just avoids a rigid table per format.

### Start it

```bash
docker compose up -d      # start
docker compose down       # stop (keeps data in a named volume)
```

Connect from DBeaver/pgAdmin with host `localhost`, port `5433`, and the
credentials from your environment.

---

## How the three parts talk to each other

In development, Vite proxies API traffic so the browser only ever talks to the
frontend origin:

- `/api/*`  -> the backend at `http://localhost:3000`. The frontend's
  `helpers/api.js` calls the backend through this prefix and attaches the JWT as a
  `Bearer` token.
- The voice assistant calls the **agent** for summaries (see the note on ports
  below).

Typical flow of a request: a view calls a function in `services/`, which calls
`helpers/api.js`, which sends the request with the token through `/api` to the
backend, which runs the controller -> service -> repository chain and returns JSON.

---

## A note on ports

There is currently a small inconsistency worth knowing about, so nothing surprises
you:

- The **agent** listens on `PORT || 3001` (`agent/server.js`), and the frontend's
  `ttsService.js` calls it directly at `http://localhost:3001/summary`. With the
  agent on **3001**, the summary works.
- However, `frontend/vite.config.js` also defines a `/agent` proxy pointing at
  **4000**, and `agent/.env.example` mentions `AGENT_PORT=4000`. Those are not used
  by the direct `3001` call above.

**Recommendation:** pick one and be consistent.
- Simplest: keep the agent on **3001** (as the frontend calls it today) and set
  `PORT=3001` in `agent/.env`.
- Or route through the Vite proxy: change `ttsService.js` to call `/agent/summary`
  and run the agent on **4000**.

Either works; the point is that the port the agent listens on and the URL the
frontend calls must match.

---

## Security notes

- **The AI key never reaches the browser.** It lives in `agent/.env` (git-ignored)
  or is supplied per request by the user. The frontend never embeds it.
- **A user-supplied key is stored only in that browser** (localStorage) and sent
  to the agent per request. Convenient, but less protected than the server `.env`;
  fine for a course or demo, worth revisiting for production.
- **Never commit a real key.** If a key is ever shared in a chat, a commit, or a
  message, treat it as compromised and generate a new one.
- **Business rules are enforced on the backend**, not just the frontend, because
  the frontend can be manipulated by the user.

---

*Lumora — an e-learning website for everyone.*