# AI Notes — CI/CD Demo Setup

---

## Prerequisites

- Docker (with Docker Compose)
- Git
- A Gemini API key — get one free at https://aistudio.google.com/apikey

Check your Docker socket GID (needed for Jenkins to talk to Docker):

```bash
stat -c '%g' /var/run/docker.sock
```

If the number is not `124`, open `jenkins/Dockerfile` and update line 14 to match that number.

---

## Setup

**Step 1 — Clone the repo**

```bash
git clone <your-repo-url> ci-cd
cd ci-cd
```

**Step 2 — Add your Gemini API key**

```bash
cp .env.example .env
nano .env   # paste your real key next to GEMINI_API_KEY=
```

**Step 3 — Start Jenkins and the nginx proxy**

```bash
docker compose up -d --build
```

- Jenkins → http://localhost:8080
- App (after first deploy) → http://localhost

**Step 4 — Wait for Jenkins to boot (~60–90 seconds)**

```bash
docker logs -f jenkins
# Stop following when you see: "Jenkins is fully up and running"
```

**Step 5 — Trigger the first build**

1. Open http://localhost:8080
2. Login: `admin` / `admin123`
3. Open the **ai-notes-pipeline** job
4. Click **Build Now**

When the pipeline goes green the app is live at http://localhost.

---

## Running the Demo

Always run scripts from the project root (`ci-cd/`), not from inside the `demo/` folder.

### Demo v1 — Neon green UI (SUCCESS)

```bash
bash demo/apply-v1-ui-success.sh
```

Jenkins picks up the commit within 60 s → Build ✅ Test ✅ Deploy ✅

The whole UI switches to a black + neon green theme with animated cards. The badge in the header switches colour slot.

---

### Demo v2 — Broken build (FAIL, app stays live)

```bash
bash demo/apply-v2-broken-fail.sh
```

Jenkins: Build ✅ Test ❌ Deploy SKIPPED

The live app at http://localhost keeps running — zero downtime proven.

---

### Demo v3 — Fix and redeploy (SUCCESS)

```bash
bash demo/apply-v3-fix-feature-success.sh
```

Jenkins: Build ✅ Test ✅ Deploy ✅ — badge switches colour slot again.

---

### Reset to original blue theme

```bash
bash demo/apply-v0-reset.sh
```

Reverts everything back to the starting state so the demo can be repeated.

---

## Ports

| Port | What |
|---|---|
| `80` | Live app |
| `8080` | Jenkins — `admin` / `admin123` |

---

## Full reset (start completely fresh)

```bash
docker compose down

docker rm -f ai-notes-backend-blue ai-notes-frontend-blue \
             ai-notes-backend-green ai-notes-frontend-green 2>/dev/null || true

docker rmi ai-notes-backend:blue ai-notes-frontend:blue \
           ai-notes-backend:green ai-notes-frontend:green 2>/dev/null || true

docker volume rm ai-notes-data ci-cd-jenkins-home 2>/dev/null || true

docker compose up -d --build
```
