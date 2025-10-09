# Burro dos Concertos Bot

Telegram bot to manage concert listings for a private group.

## Features

- Add concerts with `/add` command
- List upcoming concerts with `/list`
- Stores users and concerts in PostgreSQL
- Future: RSVP / voting system

## Tech Stack

- Node.js 20+
- TypeScript
- Telegram Bot API via grammY
- PostgreSQL (local or cloud)
- Prisma ORM
- Jest for testing
- Husky + lint-staged + Prettier + ESLint for code quality

## Setup

1. Clone repo:

```bash
git clone git@github.com:yourusername/burro_dos_concertos.git
cd burro_dos_concertos
```

2. Install dependencies:

```bash
pnpm install
```

3. Configure .env:

```bash
BOT_TOKEN=<your-telegram-token>
DATABASE_URL=postgresql://user:password@localhost:5432/concerts_bot
GROUP_ID=-1001234567890
```

4. Run Prisma migrations:

```bash
pnpm prisma migrate dev --name init
pnpm prisma generate
```

5. Seed database:

```bash
pnpm seed
```

6. Start bot in dev mode:

```bash
pnpm dev
```

7. Run tests:

```bash
pnpm test
```

Commands
• /add – start adding a new concert
• /list – list upcoming concerts
