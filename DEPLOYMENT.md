# Deployment Guide

## Environments

- **Production**: Fly.io (auto-deploy on git tags `v*`)
- **Staging**: Digital Ocean droplet (auto-deploy on push to `master`)

## Staging Setup (Digital Ocean)

### 1. Server Prerequisites

SSH into your Digital Ocean droplet and install required software:

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 22
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs

# Install pnpm
npm install -g pnpm

# Install PM2
npm install -g pm2

# Setup PM2 to start on boot
pm2 startup
# Follow the command output to configure startup

# Install PostgreSQL (if not already installed)
sudo apt install -y postgresql postgresql-contrib
```

### 2. Clone Repository

```bash
# Create app directory
sudo mkdir -p /opt/burro_dos_concertos
sudo chown $USER:$USER /opt/burro_dos_concertos

# Clone repository
cd /opt/burro_dos_concertos
git clone https://github.com/azeiteiro/burro_dos_concertos.git .

# Create logs directory
mkdir -p logs
```

### 3. Configure Environment Variables

Create `.env` file on the server:

```bash
cd /opt/burro_dos_concertos
nano .env
```

Add your staging configuration:

```bash
# Telegram Bot
BOT_TOKEN=your_staging_bot_token_here
GROUP_ID=-100your_staging_group_id

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/burro_staging

# Environment
NODE_ENV=staging
```

### 4. Setup Database

```bash
# Create staging database
sudo -u postgres psql -c "CREATE DATABASE burro_staging;"
sudo -u postgres psql -c "CREATE USER burro_user WITH PASSWORD 'your_password';"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE burro_staging TO burro_user;"

# Run migrations
cd /opt/burro_dos_concertos
pnpm install
pnpm exec prisma migrate deploy
```

### 5. Initial Deployment

```bash
cd /opt/burro_dos_concertos
chmod +x deploy.sh
./deploy.sh
```

### 6. Configure GitHub Secrets

Go to your GitHub repository → Settings → Secrets and variables → Actions

Add these secrets:

| Secret Name | Description | Example |
|------------|-------------|---------|
| `DO_STAGING_HOST` | Digital Ocean droplet IP | `123.45.67.89` |
| `DO_STAGING_USER` | SSH username | `root` or `ubuntu` |
| `DO_STAGING_SSH_KEY` | Private SSH key | Contents of `~/.ssh/id_rsa` |
| `DO_STAGING_PORT` | SSH port (optional) | `22` |
| `DO_STAGING_APP_PATH` | App directory path | `/opt/burro_dos_concertos` |

#### Getting your SSH key:

```bash
# On your local machine
cat ~/.ssh/id_rsa

# Or generate a new key specifically for GitHub Actions
ssh-keygen -t ed25519 -C "github-actions" -f ~/.ssh/github_actions_key

# Add the public key to the server
ssh-copy-id -i ~/.ssh/github_actions_key.pub user@your_server

# Copy the private key and add it to GitHub Secrets
cat ~/.ssh/github_actions_key
```

### 7. Verify Deployment

After pushing to `master`, check GitHub Actions:

1. Go to your repo → Actions tab
2. Watch the "Deploy Staging to Digital Ocean" workflow
3. Verify tests pass and deployment succeeds

On the server:

```bash
# Check PM2 status
pm2 status

# View logs
pm2 logs burro_dos_concertos_staging

# Check if bot is running
pm2 describe burro_dos_concertos_staging
```

## Manual Deployment (Staging)

If you need to deploy manually:

```bash
# SSH into the server
ssh user@your_server

# Run deployment script
cd /opt/burro_dos_concertos
./deploy.sh
```

## Production Deployment (Fly.io)

Production deploys automatically when you push a version tag:

```bash
# Create and push a tag
git tag v1.0.4 -m "Release v1.0.4"
git push origin v1.0.4
```

This will:
1. Run tests
2. Deploy to Fly.io production
3. Available at your Fly.io app URL

## PM2 Commands Reference

```bash
# View all processes
pm2 status

# View logs
pm2 logs burro_dos_concertos_staging
pm2 logs burro_dos_concertos_staging --lines 100

# Restart
pm2 restart burro_dos_concertos_staging

# Stop
pm2 stop burro_dos_concertos_staging

# Start
pm2 start ecosystem.config.js --only burro_dos_concertos_staging

# Delete process
pm2 delete burro_dos_concertos_staging

# Save PM2 process list
pm2 save

# Monitor resources
pm2 monit
```

## Troubleshooting

### Deployment fails with "Permission denied"

```bash
# On the server, ensure the app directory is owned by your user
sudo chown -R $USER:$USER /opt/burro_dos_concertos
```

### Bot not starting

```bash
# Check logs for errors
pm2 logs burro_dos_concertos_staging --err

# Verify environment variables
cd /opt/burro_dos_concertos
cat .env

# Test the build manually
pnpm build
node dist/bot.js
```

### Database connection errors

```bash
# Test database connection
psql postgresql://user:password@localhost:5432/burro_staging

# Run migrations manually
cd /opt/burro_dos_concertos
pnpm exec prisma migrate deploy
```

### GitHub Actions deployment fails

1. Check Actions tab for error logs
2. Verify all secrets are set correctly
3. Test SSH connection manually:
   ```bash
   ssh -i ~/.ssh/your_key user@server_ip
   ```

## Monitoring

### Server Resources

```bash
# Check disk space
df -h

# Check memory
free -h

# Check CPU
top
```

### Application Health

```bash
# PM2 monitoring
pm2 monit

# Check process uptime
pm2 status

# View recent logs
pm2 logs burro_dos_concertos_staging --lines 50
```
