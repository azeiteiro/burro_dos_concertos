# Burro dos Concertos - Mini App

Telegram Mini App for viewing, searching, and subscribing to upcoming concerts.

## Local Development

The Mini App is pre-configured for local development and connects to `http://localhost:3001` by default.

### Quick Start

You need **two terminals** running:

**Terminal 1 - Bot API Server:**
```bash
# From project root
pnpm dev
```
This starts the bot with API server on http://localhost:3001

**Terminal 2 - Mini App Dev Server:**
```bash
# From project root
cd web
pnpm dev
```
This starts the Mini App on http://localhost:3000

### Testing

- **In Browser**: Open http://localhost:3000 (quick testing, no Telegram features)
- **In Telegram**: Use ngrok to expose localhost:3000 and set the URL in BotFather (full features)

### Build Commands

```bash
# Start dev server
pnpm dev

# Build for production
pnpm build

# Preview production build
pnpm preview
```

## Environment Variables

Copy `.env.example` to `.env` and configure:

- `VITE_API_URL`: URL of the bot backend API (default: http://localhost:3001)

## Testing with Telegram

To test the mini app in Telegram during development:

1. Start the dev server: `pnpm dev`
2. Expose local server using ngrok or similar: `ngrok http 5173`
3. Use the ngrok URL as the Mini App URL in BotFather settings

## Features

**Concert Browsing:**
- View upcoming concerts with search/filter
- Responsive design with Telegram theme integration
- Concert details: artist, venue, date, notes, URL

**Calendar Subscriptions:**
- Component: `src/components/CalendarSubscription.tsx`
- Hook: `src/hooks/useCalendar.ts`
- Platform-specific subscription buttons (Apple, Samsung, Google)
- Generates webcal URLs for calendar app subscription
- Telegram WebApp integration for link opening and clipboard

**Technical Stack:**
- React 19 + TypeScript
- Vite build tool
- Tailwind CSS v4
- Telegram WebApp SDK (`@twa-dev/sdk`)
- date-fns for date formatting
- Vitest for testing

## Architecture

**Key Components:**
- `App.tsx` - Main app with tab navigation
- `CalendarSubscription.tsx` - Calendar subscription UI (shown in "My Concerts" tab)
- `useCalendar.ts` - Hook managing calendar subscription logic
- `api.ts` - API client for backend communication

**Calendar Implementation:**
- Generates `webcal://` URLs pointing to `/api/users/:userId/calendar.ics`
- Apple/Samsung: Opens URL directly via `webApp.openLink()`
- Google: Copies URL to clipboard + shows manual subscription instructions
- Requires authenticated user (`userId` from Telegram)

## Deployment

The mini app can be deployed to any static hosting service (Vercel, Netlify, etc.):

1. Build the app: `pnpm build`
2. Deploy the `dist` folder
3. Configure `VITE_API_URL` to point to production API
4. Update Mini App URL in BotFather with deployed URL

**Note:** Calendar subscriptions require the backend API to be accessible via HTTPS for proper webcal functionality.
