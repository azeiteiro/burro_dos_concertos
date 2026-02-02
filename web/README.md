# Burro dos Concertos - Mini App

Telegram Mini App for viewing and searching upcoming concerts.

## Development

```bash
# Install dependencies
pnpm install

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

## Deployment

The mini app can be deployed to any static hosting service (Vercel, Netlify, etc.):

1. Build the app: `pnpm build`
2. Deploy the `dist` folder
3. Configure `VITE_API_URL` to point to production API
4. Update Mini App URL in BotFather with deployed URL
