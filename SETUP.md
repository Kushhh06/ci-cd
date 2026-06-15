# AI Notes — CI/CD Pipeline Setup Guide

## Architecture

```
Git repo (local)
      │  poll every 1 min
      ▼
  Jenkins :8080
  ┌──────────────────────────────────────┐
  │ 1. Checkout                          │
  │ 2. docker build (backend + frontend) │
  │ 3. npm test (inside container)       │
  │ 4. Blue-Green deploy                 │
  │ 5. Health check & verify             │
  └──────────────────────────────────────┘
              │
              ▼
       Nginx :80  ──proxy──▶  Active colour (blue or green)
                              ┌──────────────┐
                              │  Frontend    │
                              │  Backend     │
                              │  + Gemini AI │
                              └──────────────┘
```

When a build **fails**, the old containers stay alive — zero downtime.  
When a build **succeeds**, traffic switches to the new colour instantly.

---

## Prerequisites

- Docker + Docker Compose installed
- A Gemini API key (get one free at https://aistudio.google.com/app/apikey)

---

## Step 1 — Configure your API key

```bash
cp .env.example .env
# Edit .env and paste your Gemini API key
```

---

## Step 2 — Initialise a local Git repo

Jenkins polls a git repo. We'll use a bare local repo.

```bash
cd /home/kushal/research/ci-cd

git init
git add .
git commit -m "initial: AI Notes CI/CD project"
```

---

## Step 3 — Start infrastructure (Jenkins + Nginx)

```bash
docker compose --env-file .env up -d --build
```

This starts:
- **Jenkins** at http://localhost:8080  (admin / admin123)
- **Nginx** at http://localhost:80  (shows 502 until first deploy)

Jenkins will auto-configure itself via JCasC and create the `ai-notes-pipeline` job.

> First start takes ~3 minutes while Jenkins installs plugins. Watch logs:
> `docker compose logs -f jenkins`

---

## Step 4 — Run the first build

Open http://localhost:8080, log in as `admin / admin123`, and click:

**ai-notes-pipeline → Build Now**

The pipeline will:
1. Checkout the local repo (`file:///repo`)
2. Build Docker images for backend + frontend
3. Run all Jest tests
4. Deploy blue containers
5. Switch Nginx to blue
6. Verify the deployment

After success: **http://localhost:80** shows your app.

---

## Step 5 — The 3 Demo Updates

### ✅ Update 1 — UI change (will SUCCEED)

```bash
chmod +x demo/apply-v1-ui-success.sh
./demo/apply-v1-ui-success.sh

git add -A && git commit -m "feat: purple theme + v2 label"
```

Jenkins picks up the commit within 1 minute and builds. Deployment switches blue → green.  
Watch the badge in the top-right of the app change colour live.

---

### ❌ Update 2 — Broken backend (will FAIL, app stays up)

```bash
chmod +x demo/apply-v2-broken-fail.sh
./demo/apply-v2-broken-fail.sh

git add -A && git commit -m "feat: analytics WIP"
```

Jenkins runs tests → they **fail** at the test stage → deploy is **skipped**.  
Your live app on the previous colour keeps running. Open http://localhost:80 — it's fine.

---

### ✅ Update 3 — Fix + new AI Summarise feature (will SUCCEED)

```bash
chmod +x demo/apply-v3-fix-feature-success.sh
./demo/apply-v3-fix-feature-success.sh

git add -A && git commit -m "fix: syntax error; feat: AI note summarisation"
```

Pipeline passes. App deploys again (colour switches back). A new **✨ Summarise** button  
appears in the notes panel — click it to call Gemini and get a bullet-point summary of all notes.

---

## Useful commands

```bash
# Watch Jenkins pipeline logs in real time
docker compose logs -f jenkins

# See which colour is active
cat /var/lib/docker/volumes/ci-cd-jenkins-home/_data/active_color

# List running app containers
docker ps --filter name=ai-notes

# Force a manual build trigger (without waiting for git poll)
# Go to Jenkins UI → ai-notes-pipeline → Build Now

# Tear everything down (keeps jenkins_home volume = keeps build history)
docker compose down

# Full teardown including volumes
docker compose down -v
```

---

## How blue-green deployment works

```
Build #1  →  start blue   →  health check ✅  →  nginx → blue   →  remove (none)
Build #2  →  start green  →  health check ✅  →  nginx → green  →  remove blue
Build #3  →  start blue   →  health check ✅  →  nginx → blue   →  remove green

Failed build → new colour fails health check → rollback → old colour stays active
```

The state is persisted in `/var/jenkins_home/active_color` (inside the Jenkins volume).

---

## Project layout

```
ci-cd/
├── app/
│   ├── backend/          Node.js + Express + Gemini API
│   └── frontend/         Plain HTML/CSS/JS served by nginx
├── jenkins/
│   ├── Dockerfile        Jenkins + Docker CLI
│   ├── plugins.txt       Required plugins
│   └── casc/             Jenkins Configuration as Code (auto-setup)
├── nginx/
│   ├── nginx.conf        Reverse proxy config
│   └── conf.d/
│       └── upstream.conf  Rewritten by deploy.sh on each deployment
├── scripts/
│   ├── deploy.sh         Blue-green orchestration
│   └── health-check.sh   Post-deploy verification
├── demo/
│   ├── apply-v1-ui-success.sh
│   ├── apply-v2-broken-fail.sh
│   └── apply-v3-fix-feature-success.sh
├── docker-compose.yml
├── Jenkinsfile
└── .env.example
```
