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
- 💾 PostgreSQL database with Prisma ORM

## Tech Stack

- Node.js 22 + TypeScript
- [grammY](https://grammy.dev/) - Telegram Bot framework
- PostgreSQL + Prisma 7
- Jest (82%+ test coverage)
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
```

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

## Development

```bash
pnpm dev          # Start in development mode
pnpm test         # Run tests
pnpm test:watch   # Run tests in watch mode
pnpm lint         # Run linter
pnpm build        # Build for production
```

## Deployment

Deploy to Fly.io:

```bash
fly deploy
```

Auto-deploy via GitHub Actions on version tags:

```bash
git tag v1.0.3 -m "Release description"
git push origin v1.0.3
```

## License

MIT
