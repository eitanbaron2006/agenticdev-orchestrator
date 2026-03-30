# Daytona Self-Hosted Setup Guide

> Based on the [official Daytona OSS Deployment docs](https://www.daytona.io/docs/en/oss-deployment/) (v0.158)

## Prerequisites

- **Docker Desktop** installed and running
- **Docker Compose** (included with Docker Desktop)
- **Git**

## Step 1: Clone the Daytona Repository

```bash
git clone https://github.com/daytonaio/daytona.git daytona-server
cd daytona-server
```

## Step 2: Start All Services

```bash
docker compose -f docker/docker-compose.yaml up -d
```

This starts all required services:

| Service | Purpose |
|---------|---------|
| **API** | Main Daytona application server (port 3000) |
| **Proxy** | Request proxy for sandbox previews (port 4000) |
| **Runner** | Hosts and manages sandbox containers |
| **SSH Gateway** | Handles sandbox SSH access (port 2222) |
| **PostgreSQL** | Database for data persistence |
| **Redis** | Caching and sessions |
| **Dex** | OIDC authentication provider |
| **Registry** | Docker image registry |
| **MinIO** | S3-compatible object storage |

Wait for all containers to start (about 1-2 minutes on first run):

```bash
docker compose -f docker/docker-compose.yaml ps
```

## Step 3: Set Up Proxy DNS (Required for Preview URLs)

For sandbox preview URLs (`*.proxy.localhost`) to resolve locally:

```bash
# From the daytona-server root
chmod +x scripts/setup-proxy-dns.sh
./scripts/setup-proxy-dns.sh
```

> **Without this step**, SDK preview URLs and direct proxy access won't work.

On **Windows**, you can manually add to `C:\Windows\System32\drivers\etc\hosts`:
```
127.0.0.1 proxy.localhost
```

## Step 4: Access the Dashboard & Create API Key

1. Open **http://localhost:3000** in your browser
2. Log in with default credentials:
   - Email: `dev@daytona.io`
   - Password: `password`
3. Go to **http://localhost:3000/dashboard/snapshots** and make sure the default snapshot is **active**
4. Navigate to **API Keys**: http://localhost:3000/dashboard/keys
5. Click **Create Key**, give it a name, and copy the generated key

## Step 5: Configure the App

Open `.env.local` in the project root and set:

```env
DAYTONA_API_KEY=paste-your-api-key-here
DAYTONA_API_URL=http://localhost:3000/api
```

## Step 6: Start the App

```bash
npm run dev
```

## How to Use

1. Open the app and select/create a project
2. Go to the **Preview** tab
3. Click **"Start Sandbox"** — this will:
   - Create an isolated Docker container (Daytona sandbox)
   - Upload all project files
   - Start a dev server (Next.js/Express/Flask/HTTP)
   - Show the live preview in an iframe
4. Use the **Terminal** at the bottom to run commands inside the sandbox
5. Click **"Stop"** to destroy the sandbox when done

## Supported Project Types

| Project Type | Server Started | Preview Port |
|-------------|---------------|-------------|
| Static Website | `python3 -m http.server 3000` | 3000 |
| React / Vue / Svelte (CDN) | `python3 -m http.server 3000` | 3000 |
| Next.js App | `npx next dev -p 3000` | 3000 |
| Express.js API | `node server.js` | 3000 |
| Python Flask API | `python app.py` | 5000 |

## Stopping Daytona

```bash
# Stop all services (preserves data)
docker compose -f docker/docker-compose.yaml down

# Stop and remove all data (full reset)
docker compose -f docker/docker-compose.yaml down -v
```

## Troubleshooting

### "DAYTONA_API_KEY is not set"
Make sure `.env.local` has the correct values and you restarted `npm run dev`.

### "Failed to create sandbox"
- Ensure `docker compose ... up -d` completed successfully
- Check all containers are running: `docker compose -f docker/docker-compose.yaml ps`
- Make sure Docker Desktop is running
- Verify the default snapshot is active at http://localhost:3000/dashboard/snapshots

### Sandbox preview URL not loading
- Run the proxy DNS setup script: `./scripts/setup-proxy-dns.sh`
- Check the Proxy service is running on port 4000

### Dashboard login fails
- Make sure Dex (OIDC provider) container is running
- Check logs: `docker compose -f docker/docker-compose.yaml logs dex`

### Reset everything
```bash
docker compose -f docker/docker-compose.yaml down -v
docker compose -f docker/docker-compose.yaml up -d
```

## References

- [Official OSS Deployment Docs](https://www.daytona.io/docs/en/oss-deployment/)
- [TypeScript SDK Reference](https://www.daytona.io/docs/en/typescript-sdk)
- [Daytona GitHub](https://github.com/daytonaio/daytona)
- [Slack Support](https://go.daytona.io/slack)
