# Per-Account Agent

A web application where each "account" (an area of work or life) gets its own AI-powered agent with isolated memory, conversational initialization, and next-best-action recommendations.

## Quick Start

### Prerequisites

- Node.js 20+
- A PostgreSQL database (e.g., [Supabase](https://supabase.com) free tier)
- At least one LLM API key (OpenAI or Anthropic)

### Setup

1. **Install dependencies:**

   ```bash
   npm install
   ```

2. **Configure environment variables:**

   Copy `.env` to `.env.local` and fill in your values:

   ```bash
   cp .env .env.local
   ```

   Required variables:
   - `DATABASE_URL` — PostgreSQL connection string
   - `OPENAI_API_KEY` and/or `ANTHROPIC_API_KEY` — LLM provider keys
   - `AUTH_PASSWORD` — Password for the single-user login gate
   - `AUTH_SECRET` — Random string used to sign session cookies

3. **Run database migrations:**

   ```bash
   npx prisma migrate dev --name init
   ```

4. **Start the dev server:**

   ```bash
   npm run dev
   ```

5. **Open** [http://localhost:3000](http://localhost:3000) and log in with your `AUTH_PASSWORD`.

## How It Works

### Accounts

An account represents any area of work or life you want to track — a job search, a side project, a D&D campaign, an exploration goal. Each account gets:

- **Its own AI agent** with a custom system prompt generated during setup
- **Isolated memory** — chat history + a running state summary
- **Next-best-action recommendations** on demand or via scheduled reminders
- **Configurable LLM backend** — choose OpenAI or Anthropic per account

### Conversational Initialization

When you create a new account, the agent guides you through a short conversation to understand:
- What the account is about
- Your goals and what success looks like
- Current state and constraints
- What kind of support would be useful

After this conversation, the agent generates a tailored system prompt and initial state summary specific to your account type.

### State Summary

After each conversation, the agent updates a running state summary that captures current status, goals, progress, and next steps. This summary is structured differently for each account type (a job search summary looks very different from a code project summary).

### Next Best Actions

Click "Suggest Next Actions" in any account to get 1-3 specific, actionable recommendations based on the current state. You can also configure per-account reminders (e.g., every 5 days) to automatically generate these.

## Tech Stack

- **Next.js 16** (App Router) + TypeScript
- **Tailwind CSS** + shadcn/ui
- **Prisma** + PostgreSQL
- **Vercel AI SDK** (OpenAI + Anthropic)
- **Vercel** for deployment (with CRON support for reminders)

## Deployment

1. Push to GitHub and connect to Vercel
2. Set environment variables in Vercel dashboard
3. Prisma migrations run automatically via the build command
4. The CRON job for reminders is configured in `vercel.json` (runs daily at 9am UTC)
