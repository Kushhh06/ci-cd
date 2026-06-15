# AI Notes — CI/CD Demo

> Full-stack notes app with **Jenkins CI/CD**, **Docker blue-green deployment**, and **Gemini AI** — featuring three live demo scenarios.

---

## What's Inside

| Layer | Technology |
|---|---|
| Frontend | Vanilla JS + nginx (SPA) |
| Backend | Node.js + Express |
| AI | Google Gemini (`gemini-flash-lite-latest`) |
| CI/CD | Jenkins (JCasC auto-configured) |
| Deployment | Zero-downtime blue-green via nginx |
| Tests | Jest + Supertest (12 tests, run in Docker) |
| Data | JSON file in a Docker named volume |

---

## How It Works

Every git commit triggers a Jenkins pipeline:

```
Commit → Build Images → Run Tests → Deploy (Blue/Green) → Verify
```

- **Tests fail?** Deploy is skipped. The live app keeps running. Zero downtime.
- **Tests pass?** nginx switches traffic to the new container in under a second.
- The header badge on the app shows which slot (`BLUE` or `GREEN`) is live and the build version.

---

## Quick Start

### 1. Prerequisites

- Docker + Docker Compose
- Git
- A free Gemini API key from [aistudio.google.com](https://aistudio.google.com/apikey)

### 2. Configure

```bash
cp .env.example .env
# paste your Gemini API key into .env
```

### 3. Check Docker socket GID

```bash
stat -c '%g' /var/run/docker.sock
```

If it is not `124`, update `jenkins/Dockerfile` line 14:

```dockerfile
RUN if getent group docker; then groupmod -g YOUR_GID docker; ...
```

### 4. Start

```bash
git init && git add -A && git commit -m "initial commit"
docker compose up -d --build
```

Wait ~90 seconds for Jenkins to boot, then open `http://localhost:8080`.

- Login: `admin` / `admin123`
- Click **Build Now** on the `ai-notes-pipeline` job

App goes live at **`http://localhost`**

---

## Demo Scenarios

Run these three scripts in order to demonstrate the full CI/CD lifecycle:

### v1 — UI Change (Pipeline goes GREEN)

```bash
bash demo/apply-v1-ui-success.sh
```

Changes the accent colour to purple. Jenkins builds and deploys. The badge in the app header switches colour.

---

### v2 — Broken Build (Pipeline goes RED, app stays live)

```bash
bash demo/apply-v2-broken-fail.sh
```

Injects a JavaScript syntax error. Jenkins catches it at the **Run Tests** stage. Deploy is skipped. The live app at `http://localhost` keeps working — zero downtime.

---

### v3 — Fix & Redeploy (Pipeline goes GREEN again)

```bash
bash demo/apply-v3-fix-feature-success.sh
```

Removes the syntax error. Jenkins runs all 12 tests, passes, redeploys. Badge switches to the new colour slot.

---

## Project Layout

```
ci-cd/
├── app/
│   ├── backend/          Node.js API + Gemini AI + tests
│   └── frontend/         SPA + nginx
├── jenkins/              Dockerfile + JCasC config + plugins
├── nginx/                Reverse proxy + upstream.conf
├── scripts/
│   ├── deploy.sh         Blue-green deploy logic
│   └── health-check.sh   Post-deploy verification
├── demo/                 v1 / v2 / v3 demo scripts
├── docker-compose.yml    Jenkins + nginx-proxy
├── Jenkinsfile
└── SETUP.md              Full setup guide with all source code
```

---

## Ports

| Port | What |
|---|---|
| `80` | Live app — `http://localhost` |
| `8080` | Jenkins — `http://localhost:8080` |

---

## Full Documentation

See [SETUP.md](SETUP.md) for the complete guide including all source code, architecture diagrams, blue-green deployment explanation, and troubleshooting.
