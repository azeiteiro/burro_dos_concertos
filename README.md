# 🎵 Burro dos Concertos Bot

[![CI](https://github.com/azeiteiro/burro_dos_concertos/actions/workflows/ci.yml/badge.svg)](https://github.com/azeiteiro/burro_dos_concertos/actions)
[![Coverage Status](https://coveralls.io/repos/github/azeiteiro/burro_dos_concertos/badge.svg?branch=master)](https://coveralls.io/github/azeiteiro/burro_dos_concertos?branch=master)
[![License: MIT](https://img.shields.io/badge/License-MIT-lightsalmon.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue)](https://www.typescriptlang.org/)
[![grammY](https://img.shields.io/badge/grammY-Bot_Framework-mediumslateblue)](https://grammy.dev)
[![Fly.io](https://img.shields.io/badge/deployed-fly.io-palegreen)](https://fly.io)

Telegram bot to manage concert listings for private groups.

## Features

- 🎸 Add, edit, and delete concerts
- 📋 List upcoming concerts
- 📱 **Telegram Mini App** - Beautiful web interface for browsing concerts
- 📅 **Calendar Subscriptions** - Subscribe to personal concert calendars (iCal format)
- 🔔 Automated daily/weekly/monthly notifications
- 👥 Role-based permissions (User, Moderator, Admin, SuperAdmin)
- 🔗 Smart concert link detection with automatic metadata extraction
- 🌐 JavaScript-rendered site support via Browserless.io (optional)
- 💾 PostgreSQL database with Prisma ORM

## Tech Stack

**Bot Backend:**
- Node.js 24 + TypeScript
- [grammY](https://grammy.dev/) - Telegram Bot framework
- Express.js - API server for Mini App
- PostgreSQL + Prisma 7
- Jest (80%+ test coverage)

**Mini App:**
- React 18 + TypeScript
- Vite - Build tool
- Telegram Web App SDK
- date-fns - Date formatting
- ical-generator - iCalendar feed generation

**Deployment:**
- Production: Fly.io
- Staging: Digital Ocean with Apache

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

**API Server (Optional for Mini App):**
```bash
API_PORT=3001  # Port for Express API server (default: 3001)
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
- `/announce` - Send anonymous announcement to group (logged)
- `/list_users` - List all users
- `/promote_user` - Promote user to admin
- `/demote_user` - Demote admin to user
- `/user_info` - Get user information

## Telegram Mini App

The bot includes a beautiful web interface accessible from Telegram:

- 🎵 Browse all upcoming concerts
- 🔍 Search by artist, venue, or notes
- 📅 Subscribe to personal calendar feeds
- 🌓 Dark/light mode (follows Telegram theme)
- 📱 Mobile-optimized responsive design
- 🔗 One-click to concert URLs

**Setup:** See [MINIAPP_SETUP.md](./MINIAPP_SETUP.md) for deployment instructions.

## Calendar Subscriptions

Users can subscribe to their personal concert calendars (concerts marked as "going" or "interested") in their favorite calendar apps.

**Technical Implementation:**
- **Format**: iCalendar (RFC 5545) via `ical-generator`
- **Endpoint**: `GET /api/users/:userId/calendar.ics`
- **Timezone**: Europe/Lisbon (configurable in code)
- **TTL**: 1 hour (calendar apps refresh hourly)
- **Event Features**:
  - Status prefix in title (`[Going]` or `[Interested]`)
  - Venue as location
  - Concert notes as description
  - Concert URL (if available)
  - 24-hour notification alarm
  - All-day events for concerts without specific time
  - 3-hour duration for timed concerts

**Supported Platforms:**
- Apple Calendar (iOS/macOS) - Direct subscription
- Samsung Calendar - Direct subscription
- Google Calendar - Manual subscription (webcal URL copied to clipboard)

**Filtering:**
- Only includes concerts with `responseType` = `going` or `interested`
- Excludes concerts marked as `not_going`
- Only shows upcoming concerts (from today onwards)

**Implementation Details:**
- Frontend: `CalendarSubscription` component with platform-specific buttons
- Hook: `useCalendar` handles subscription logic and Telegram WebApp integration
- Backend: Express route generates ICS feed with proper HTTP headers
- Debug endpoint: `/api/users/:userId/calendar-debug` returns JSON for troubleshooting

## Concert Link Detection

The bot automatically detects and extracts concert information when users share links in private chats:

1. **Private Chats**: Users see preview with quick-add button
2. **Supported Sites**: Most concert ticket sites (Ticketline, See Tickets, Eventim, Dice.fm, etc.)
3. **JavaScript Sites**: Queue-protected sites like Blueticket work with Browserless.io API key

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
