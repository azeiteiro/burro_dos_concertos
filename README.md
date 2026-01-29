# 🎵 Burro dos Concertos Bot

[![CI](https://github.com/azeiteiro/burro_dos_concertos/actions/workflows/ci.yml/badge.svg)](https://github.com/azeiteiro/burro_dos_concertos/actions)
[![Coverage Status](https://coveralls.io/repos/github/azeiteiro/burro_dos_concertos/badge.svg?branch=master)](https://coveralls.io/github/azeiteiro/burro_dos_concertos?branch=master)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue)](https://www.typescriptlang.org/)
[![grammY](https://img.shields.io/badge/grammY-Bot_Framework-blue)](https://grammy.dev)
[![Fly.io](https://img.shields.io/badge/deployed-fly.io-blueviolet)](https://fly.io)

Telegram bot to manage concert listings for private groups.

## Features

- 🎸 Add, edit, and delete concerts
- 📋 List upcoming concerts
- 🔔 Automated daily/weekly/monthly notifications
- 👥 Role-based permissions (User, Moderator, Admin, SuperAdmin)
- 🔗 Smart concert link detection with automatic metadata extraction
- 🌐 JavaScript-rendered site support via Browserless.io (optional)
- 💾 PostgreSQL database with Prisma ORM

## Tech Stack

- Node.js 22 + TypeScript
- [grammY](https://grammy.dev/) - Telegram Bot framework
- PostgreSQL + Prisma 7
- Jest (80%+ test coverage)
- Deployed on Fly.io

## Quick Start

### 1. Install dependencies

```bash
pnpm install
```

### 2. Configure environment

Create `.env.local`:

```bash
BOT_TOKEN=your_telegram_bot_token
DATABASE_URL=postgresql://user:password@localhost:5432/concerts_bot
GROUP_ID=-100123456789  # Your Telegram group ID (optional for notifications)

# Optional: Browserless.io API key for JavaScript-rendered concert sites
# Get free tier (1000 units/month) at https://account.browserless.io/signup
BROWSERLESS_API_KEY=your_api_key_here
```

**About Browserless.io (Optional):**
- Enables extraction from JavaScript-heavy sites (e.g., queue-protected ticket sites)
- Free tier: 1,000 units/month (~1,000 pages)
- Browser runs remotely (no memory overhead on your server)
- Without it: Most concert sites still work, JS-heavy sites show manual add button

### 3. Setup database

```bash
pnpm exec prisma migrate dev
pnpm exec prisma generate
```

### 4. Run the bot

```bash
pnpm dev
```

## Commands

**Everyone:**
- `/start` - Start the bot
- `/help` - Show available commands
- `/add_concert` - Add a new concert
- `/see_concerts` - View upcoming concerts
- `/edit_concert` - Edit your concerts
- `/delete_concert` - Delete your concerts

**Admin/SuperAdmin only:**
- `/list_users` - List all users
- `/promote_user` - Promote user to admin
- `/demote_user` - Demote admin to user
- `/user_info` - Get user information

## Concert Link Detection

The bot automatically detects and extracts concert information when users share links:

1. **In Groups**: Admins receive private messages with concert preview and quick-add button
2. **In Private Chats**: Everyone sees preview with quick-add button
3. **Supported Sites**: Most concert ticket sites (Ticketline, See Tickets, Eventim, Dice.fm, etc.)
4. **JavaScript Sites**: Queue-protected sites like Blueticket work with Browserless.io API key

**How it works:**
- Extracts artist, venue, date from Open Graph metadata and HTML
- Handles SSL certificate issues automatically
- Falls back to manual entry if extraction fails
- Shows progress feedback for slow-loading sites

## Development

```bash
pnpm dev          # Start in development mode
pnpm test         # Run tests
pnpm test:watch   # Run tests in watch mode
pnpm lint         # Run linter
pnpm build        # Build for production
```

## Deployment

**Production (Fly.io):** Auto-deploys on version tags

```bash
git tag v1.0.3 -m "Release description"
git push origin v1.0.3
```

**Staging (Digital Ocean):** Auto-deploys on push to `master`

```bash
git push origin master
```

For detailed deployment setup and troubleshooting, see [DEPLOYMENT.md](./DEPLOYMENT.md)

## License

MIT
