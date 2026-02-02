# Telegram Mini App Setup Guide

This guide explains how to set up and deploy the Telegram Mini App alongside the bot on your Digital Ocean droplet.

## Architecture

```
Apache (Port 443, HTTPS)
├── /* → Serve Mini App static files from /var/www/miniapp
└── /api/* → Reverse proxy to localhost:3001 (Node.js bot + Express API)

Node.js Bot (localhost:3001)
├── grammY bot (handles Telegram updates)
└── Express server (provides /api/concerts endpoints)
```

## Prerequisites

1. Apache with mod_proxy, mod_proxy_http, and mod_rewrite enabled
2. SSL certificate configured (you already have this)
3. Domain pointing to your droplet (you already have this)

## Setup Steps

### 1. Enable Required Apache Modules

```bash
sudo a2enmod proxy
sudo a2enmod proxy_http
sudo a2enmod rewrite
sudo systemctl restart apache2
```

### 2. Configure Apache VirtualHost

Copy the example configuration and update it:

```bash
sudo cp apache-config.example /etc/apache2/sites-available/miniapp.conf
```

Edit `/etc/apache2/sites-available/miniapp.conf` and update:
- `ServerName` with your domain
- SSL certificate paths (if not already configured)

Enable the site:

```bash
sudo a2ensite miniapp.conf
sudo systemctl reload apache2
```

### 3. Create Mini App Directory

```bash
sudo mkdir -p /var/www/miniapp
sudo chown -R $USER:$USER /var/www/miniapp
```

### 4. Configure Environment Variables

Add to your `.env` file on the server:

```bash
# API server port (default: 3001)
API_PORT=3001
```

### 5. Add GitHub Secrets

Add the following secret to your GitHub repository:
- **Name:** `DO_STAGING_DOMAIN`
- **Value:** Your domain with protocol (e.g., `https://yourdomain.com`)

Go to: Repository → Settings → Secrets and variables → Actions → New repository secret

### 6. Deploy

The deployment workflow will automatically:
1. Build the bot backend
2. Build the Mini App with the correct API URL
3. Copy Mini App files to `/var/www/miniapp`
4. Restart the bot with API server

Push to master branch to trigger deployment:

```bash
git push origin master
```

### 7. Configure BotFather

1. Open [@BotFather](https://t.me/BotFather) in Telegram
2. Send `/mybots` and select your bot
3. Select "Bot Settings" → "Menu Button"
4. Choose "Configure menu button"
5. Enter:
   - **URL**: `https://yourdomain.com`
   - **Text**: `View Concerts` (or your preferred text)

Now users can open the Mini App by clicking the menu button in your bot.

## Verification

### Test API Endpoints

```bash
# Health check
curl https://yourdomain.com/health

# Get upcoming concerts
curl https://yourdomain.com/api/concerts/upcoming
```

### Test Mini App

1. Open your bot in Telegram
2. Click the menu button (bottom left, next to message input)
3. The Mini App should load showing upcoming concerts

## Troubleshooting

### API returns 502 Bad Gateway

- Check if bot is running: `pm2 status`
- Check bot logs: `pm2 logs burro_dos_concertos_staging`
- Verify API_PORT in .env matches Apache proxy configuration

### Mini App shows blank page

- Check browser console for errors
- Verify files are in `/var/www/miniapp/`
- Check Apache error log: `sudo tail -f /var/log/apache2/miniapp-error.log`

### CORS errors in Mini App

- Telegram Mini Apps run in Telegram's WebView, CORS should not be an issue
- If testing locally, make sure API server has CORS enabled (already configured)

## Local Development

### Setup

1. Make sure you have a local `.env.local` with your bot credentials
2. The Mini App is already configured for local development (uses `http://localhost:3001`)

### Run

You need **two terminals**:

```bash
# Terminal 1: Start bot with API server
pnpm dev
```

```bash
# Terminal 2: Start Mini App dev server
cd web
pnpm dev
```

- **Bot API**: http://localhost:3001/api/concerts/upcoming
- **Mini App**: http://localhost:3000

### Testing the Mini App locally

Since Telegram Mini Apps need to run inside Telegram, you have two options:

**Option 1: Test in browser (Quick)**
- Open http://localhost:3000 in your browser
- You'll see the Mini App interface
- Limited: No Telegram SDK features (theme, user info, openLink)

**Option 2: Test in Telegram (Full features)**
1. Use ngrok to expose your local server:
   ```bash
   ngrok http 3000
   ```
2. Copy the ngrok HTTPS URL (e.g., `https://abc123.ngrok.io`)
3. In BotFather, temporarily set this as your Mini App URL
4. Open your bot in Telegram and click the menu button
5. The Mini App will load from your local dev server through ngrok

### Build Mini App

```bash
cd web
echo "VITE_API_URL=http://localhost:3001" > .env
pnpm run build
```

Built files will be in `web/dist/`

## API Endpoints

- `GET /api/concerts` - Get all concerts
- `GET /api/concerts/upcoming` - Get upcoming concerts (from today onwards)
- `GET /health` - Health check endpoint

## Mini App Features

- 🎵 View upcoming concerts
- 🔍 Search by artist, venue, or notes
- 📅 Sorted by date
- 🔗 Click concert to open URL (if available)
- 🌓 Dark/light mode (follows Telegram theme)
