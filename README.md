# Hiring Assistants by F22 Labs

Simple React + Vite application that demonstrates email + passcode (OTP) authentication powered by [Supabase](https://supabase.com/). The interface is built with [Tailwind CSS](https://tailwindcss.com/) and [shadcn/ui](https://ui.shadcn.com/), providing composable components for requesting a passcode, verifying it, signing out, and displaying the active session. After login, users land on the “Hiring Assistants by F22 Labs” dashboard featuring a left-hand chat history, rich hero, and conversational composer modeled after the provided mockup.

## Prerequisites

- Node.js 18+ and npm
- A Supabase project with the email/password auth provider enabled

## Getting Started

1. **Install dependencies**

   ```bash
   cd supabase-login
   npm install
   ```

2. **Configure Supabase**

   - Copy `env.example` to `.env` (or `.env.local`)
   - Paste your project URL and anon key from the Supabase dashboard
   - Ensure email OTP auth is enabled under **Authentication → Providers**

3. **Run the dev server**

   ```bash
   npm run dev
   ```

   Visit the URL printed in the terminal (defaults to http://localhost:5173).

## Scripts

- `npm run dev` – local development with HMR
- `npm run build` – type-check and build production assets
- `npm run preview` – preview the production build
- `npm run lint` – run ESLint

## UI stack

- Tailwind CSS 3 with CSS variables defined in `src/index.css`
- shadcn/ui components stored under `src/components/ui`
- Utility helpers (e.g., `cn`) in `src/lib/utils.ts`
- `components.json` configured for future `npx shadcn@latest add ...` usage

## Environment variables

| Name                     | Description                            |
| ------------------------ | -------------------------------------- |
| `VITE_SUPABASE_URL`      | Supabase project URL (https endpoint)  |
| `VITE_SUPABASE_ANON_KEY` | Public anon key from your project      |

> **Note:** Vite automatically exposes variables prefixed with `VITE_` to the client bundle.

## Next steps

- Enable additional Supabase providers (OAuth, magic links, etc.)
- Persist profile data in Supabase tables
- Deploy the app to your preferred host (Vercel, Netlify, Cloudflare Pages, …)
