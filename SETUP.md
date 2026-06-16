# AI Notes — CI/CD Demo with Docker + Jenkins + Gemini AI

A full-stack AI-powered notes app with a complete CI/CD pipeline featuring **zero-downtime blue-green deployment**, automated testing, and three live demo scenarios.

---

## Table of Contents

1. [What This Project Does](#1-what-this-project-does)
2. [Architecture Overview](#2-architecture-overview)
3. [Project Structure](#3-project-structure)
4. [Prerequisites](#4-prerequisites)
5. [Initial Setup](#5-initial-setup)
6. [Running the Demo](#6-running-the-demo)
   - [Demo v1 — UI Change (SUCCESS)](#demo-v1--ui-change-success)
   - [Demo v2 — Broken Build (FAIL, App Stays Live)](#demo-v2--broken-build-fail-app-stays-live)
   - [Demo v3 — Fix & Redeploy (SUCCESS)](#demo-v3--fix--redeploy-success)
7. [Blue-Green Deployment Explained](#7-blue-green-deployment-explained)
8. [Troubleshooting](#8-troubleshooting)

---

## 1. What This Project Does

| Feature | Detail |
|---|---|
| **App** | AI Notes — create, delete, and chat about notes with Gemini AI |
| **CI/CD** | Jenkins pipeline: Build → Test → Deploy → Verify |
| **Deployment** | Zero-downtime blue-green (nginx switches instantly, no restart) |
| **AI** | Google Gemini (`gemini-flash-lite-latest`) — chat + summarise |
| **Persistence** | JSON file stored in a Docker named volume (survives container restarts) |
| **Tests** | 12 Jest + Supertest tests run inside Docker before every deploy |
| **Demo** | 3 scripted scenarios: UI change ✅, broken build ❌, fix ✅ |

---

## 2. Architecture Overview

```
Browser
  │
  ▼
┌─────────────────────────────────────────────┐
│  nginx-proxy  (port 80)                     │
│  Routes /api/* → backend                   │
│  Routes /*    → frontend                   │
│  upstream.conf rewritten on every deploy   │
└────────┬──────────────────┬────────────────┘
         │                  │
         ▼                  ▼
  ┌─────────────┐    ┌──────────────┐
  │  backend    │    │  frontend    │
  │  blue OR    │    │  blue OR     │
  │  green      │    │  green       │
  │  Node.js    │    │  nginx SPA   │
  │  :3000      │    │  :80         │
  └──────┬──────┘    └──────────────┘
         │  /data volume (notes.json)
         ▼
  ┌──────────────┐
  │  ai-notes-   │
  │  data volume │
  └──────────────┘

┌─────────────────────────────────────────────┐
│  Jenkins  (port 8080)                        │
│  Polls git every 60s → runs Jenkinsfile      │
│  Runs tests inside Docker, then deploy.sh    │
└─────────────────────────────────────────────┘
```

### Blue-Green Flow

```
Commit pushed
     │
     ▼
Jenkins detects change (SCM poll)
     │
     ├─ Build Docker images
     ├─ Run tests in container
     │       │
     │   FAIL? ──► Stop here. Old container still live. Zero downtime.
     │       │
     │   PASS?
     │       │
     ├─ Start NEW color container (blue↔green)
     ├─ Health check new container
     ├─ Rewrite nginx upstream.conf → reload nginx (instant, no downtime)
     ├─ Stop OLD color container
     └─ Verify live endpoint
```

---

## 3. Project Structure

```
ci-cd/
├── app/
│   ├── backend/
│   │   ├── Dockerfile
│   │   ├── .dockerignore
│   │   ├── package.json
│   │   ├── src/
│   │   │   └── server.js          ← Express API + Gemini AI
│   │   └── test/
│   │       └── server.test.js     ← 12 Jest tests
│   └── frontend/
│       ├── Dockerfile
│       ├── nginx.conf             ← SPA nginx config
│       └── public/
│           ├── index.html
│           ├── style.css
│           └── app.js
├── jenkins/
│   ├── Dockerfile                 ← Jenkins + Docker CLI
│   ├── plugins.txt
│   └── casc/
│       └── jenkins.yaml           ← JCasC auto-configuration
├── nginx/
│   ├── nginx.conf                 ← Reverse proxy config
│   └── conf.d/
│       └── upstream.conf          ← Written by deploy.sh on each deploy
├── scripts/
│   ├── deploy.sh                  ← Blue-green deploy logic
│   └── health-check.sh            ← Post-deploy verification
├── demo/
│   ├── apply-v1-ui-success.sh
│   ├── apply-v2-broken-fail.sh
│   └── apply-v3-fix-feature-success.sh
├── docker-compose.yml             ← Jenkins + nginx-proxy only
├── Jenkinsfile
├── .env                           ← NEVER commit — has real API key
├── .env.example
└── .gitignore
```

---

## 4. Prerequisites

- **Docker** (with Docker Compose)
- **Git**
- **A Gemini API key** — get one free at https://aistudio.google.com/apikey

Check your Docker socket GID (needed for Jenkins to run docker commands):

```bash
stat -c '%g' /var/run/docker.sock
```

If it is not `124`, update line 14 of `jenkins/Dockerfile` to match the GID shown above, then rebuild.

---

## 5. Initial Setup

### Step 1 — Clone and configure

```bash
git clone <your-repo-url> ci-cd
cd ci-cd
```

Create your `.env` file (never commit this):

```bash
cp .env.example .env
# Edit .env and paste your real Gemini API key
nano .env
```

### Step 2 — Initialise git (if not already done)

The Jenkins pipeline polls a local git repo. Make sure you have at least one commit:

```bash
git init
git add -A
git commit -m "initial commit"
```

### Step 3 — Start the infrastructure

```bash
docker compose up -d --build
```

This starts:
- **Jenkins** on `http://localhost:8080`
- **nginx-proxy** on `http://localhost` (port 80) — shows 502 until first deploy

Check both are running:

```bash
docker compose ps
```

### Step 4 — Wait for Jenkins to finish booting (~60–90 seconds)

```bash
docker logs -f jenkins
# Wait until you see: "Jenkins is fully up and running"
# Press Ctrl+C to stop following logs
```

### Step 5 — Trigger the first build

Open `http://localhost:8080` in your browser.

- Login: `admin` / `admin123`
- Open the **ai-notes-pipeline** job
- Click **Build Now**

Watch the pipeline run. When it goes green, your app is live at `http://localhost`.

---

## 6. Running the Demo

The three demo scenarios show the full CI/CD lifecycle. Run them in order.

### Demo v1 — UI Change (SUCCESS)

**What it does:** Changes the accent colour from blue to purple, bumps version label. Shows a normal successful deploy.

```bash
bash demo/apply-v1-ui-success.sh
```

**Expected Jenkins pipeline:**

```
Checkout       ✅
Build Images   ✅
Run Tests      ✅  (12 tests pass)
Deploy         ✅  (nginx switches to opposite colour slot)
Verify         ✅
```

**What to watch:** At `http://localhost`, the deployment badge in the header switches colour (BLUE → GREEN or vice versa) and shows the new build number. Button colours change to purple.

---

### Demo v2 — Broken Build (FAIL, App Stays Live)

**What it does:** Injects a syntax error (`const brokenAnalytics = {` — unclosed object) into the backend. The tests catch it. Jenkins fails at Run Tests. The Deploy stage never runs. The live app keeps serving traffic.

```bash
bash demo/apply-v2-broken-fail.sh
```

**Expected Jenkins pipeline:**

```
Checkout       ✅
Build Images   ✅
Run Tests      ❌  (SyntaxError: Unexpected end of input)
Deploy         SKIPPED
Verify         SKIPPED
```

**What to watch:**
- Jenkins build goes red at `http://localhost:8080`
- `http://localhost` is **still working** — the previous container is still running
- The badge does NOT change — it still shows the previous build number

This is zero-downtime failure handling in action.

---

### Demo v3 — Fix & Redeploy (SUCCESS)

**What it does:** Uses a marker-based `sed` command to cleanly remove the broken lines added by v2. The fix is committed, Jenkins picks it up, tests pass, and the app redeploys.

```bash
bash demo/apply-v3-fix-feature-success.sh
```

**Expected Jenkins pipeline:**

```
Checkout       ✅
Build Images   ✅
Run Tests      ✅  (12 tests pass)
Deploy         ✅  (nginx switches to the opposite colour slot again)
Verify         ✅
```

**What to watch:** The badge at `http://localhost` switches colour again (e.g. GREEN → BLUE), showing a fresh successful deploy. The AI chat and Summarise button work again.

---

### Complete Demo Timeline

| Build | Script | Test | Deploy | Badge |
|---|---|---|---|---|
| #1 | Initial setup | ✅ | ✅ blue | BLUE |
| #N | v1 UI change | ✅ | ✅ green | GREEN |
| #N+1 | v2 broken | ❌ | skipped | GREEN (unchanged) |
| #N+2 | v3 fix | ✅ | ✅ blue | BLUE |

---

## 7. Blue-Green Deployment Explained

### Why two colour slots?

The problem with a naive deploy: stop old → start new → there's a gap where nothing is running. Users see a 502 error.

Blue-green solves this:

1. The **new version** starts in the idle slot while the old version is still serving all traffic
2. Health checks confirm the new version is healthy (`/api/health` must return `{"status":"ok"}`)
3. nginx rewrites `upstream.conf` and calls `nginx -s reload` — this is **atomic**: in-flight requests finish on the old upstream, new requests go to the new one
4. Only then is the old container stopped

The user never sees a 502.

### The state file

`/var/jenkins_home/active_color` stores which colour is currently live. It lives in the Jenkins named volume so it survives Jenkins restarts. On every deploy, `deploy.sh` reads it to know which slot is idle, and writes the new colour after switching.

### What happens on a failed build

- If `Run Tests` fails → Jenkins exits with error → `Deploy` stage is skipped → state file never updated → current containers keep running → nginx is never touched
- If new container fails its health check inside `deploy.sh` → new containers removed → state file never updated → `deploy.sh` exits 1 → Jenkins marks build failed → old containers keep running

In both cases, users experience zero downtime.

---

## 8. Troubleshooting

### Jenkins won't start

```bash
docker compose logs jenkins
```

Common cause: Docker socket GID mismatch. Check:

```bash
stat -c '%g' /var/run/docker.sock
```

Update line 14 of `jenkins/Dockerfile` with the correct GID, then rebuild:

```bash
docker compose down
docker compose up -d --build
```

### App shows 502 Bad Gateway

The app containers haven't been deployed yet. Trigger the first build in Jenkins by clicking **Build Now** at `http://localhost:8080`.

### Jenkins build says "cannot connect to docker daemon"

The Jenkins user isn't in the docker group or the GID doesn't match. Check and fix the GID as described above.

### Notes disappear after restart

Make sure the `ai-notes-data` Docker volume exists:

```bash
docker volume ls | grep ai-notes-data
```

The volume is created automatically on first deploy. If it's missing, run a new build.

### Jenkins doesn't detect commits automatically

The pipeline polls SCM every 60 seconds. If nothing happens after 2 minutes, click **Build Now** manually in Jenkins.

### Gemini AI returns errors

- **No key**: Chat returns a friendly fallback. Add key to `.env` and restart with `docker compose up -d`.
- **Quota exceeded**: The project uses `gemini-flash-lite-latest` which has the best free tier availability. Check your quota at https://aistudio.google.com.
- **Key not injected**: The key is passed at container start via `deploy.sh`. Re-run a build to redeploy.

### v3 demo says "v2 marker not found"

You must run v2 before v3:

```bash
bash demo/apply-v2-broken-fail.sh
# wait for Jenkins to pick up and fail (~60s)
bash demo/apply-v3-fix-feature-success.sh
```

### Reset everything and start fresh

```bash
# Stop infrastructure
docker compose down

# Remove app containers
docker rm -f ai-notes-backend-blue ai-notes-frontend-blue \
             ai-notes-backend-green ai-notes-frontend-green 2>/dev/null || true

# Remove app images
docker rmi ai-notes-backend:blue ai-notes-frontend:blue \
           ai-notes-backend:green ai-notes-frontend:green 2>/dev/null || true

# Remove data volume (WARNING: deletes all notes)
docker volume rm ai-notes-data 2>/dev/null || true

# Remove Jenkins home (WARNING: deletes all build history)
docker volume rm ci-cd-jenkins-home 2>/dev/null || true

# Start fresh
docker compose up -d --build
```

---

## Ports Reference

| Port | Service | URL |
|---|---|---|
| `80` | Live app (nginx proxy) | http://localhost |
| `8080` | Jenkins CI/CD | http://localhost:8080 |
| `50000` | Jenkins agent port | — |

Jenkins login: `admin` / `admin123`
