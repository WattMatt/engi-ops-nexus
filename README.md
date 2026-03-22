# WM Consulting - Engineering Operations Platform (Nexus)

## Tech Stack

- **Frontend**: React 18 + TypeScript + Vite + Tailwind CSS + shadcn/ui
- **Backend**: Supabase (PostgreSQL, Auth, Edge Functions, Storage)
- **AI**: Anthropic Claude API (Sonnet 4.6 + Haiku 4.5)
- **Hosting**: Vercel (auto-deploys from `main`)
- **Mobile**: Capacitor (iOS/Android)

## Getting Started

```sh
# Install dependencies
npm install

# Start dev server
npm run dev

# Build for production
npm run build
```

## Environment Variables

Create a `.env` file:

```
VITE_SUPABASE_PROJECT_ID=your-project-id
VITE_SUPABASE_PUBLISHABLE_KEY=your-anon-key
VITE_SUPABASE_URL=https://your-project.supabase.co
```

## Supabase Secrets

The following secrets must be set in Supabase for edge functions:

```sh
supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
```

## Deployment

Pushes to `main` auto-deploy to Vercel. Vercel environment variables are configured in the Vercel dashboard.

**Production URL**: https://engi-ops-nexus.vercel.app
