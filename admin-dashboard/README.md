# Cloud Vibecoder Admin Dashboard

A **standalone** Next.js admin interface for monitoring Cloud Vibecoder metrics. Connects directly to Supabase - no backend required.

## Features

- **Dashboard**: Overview of all metrics (users, jobs, plans, PRs)
- **Users**: View all users and manage admin status
- **Jobs**: Monitor coding agent job executions
- **Plans**: View generated implementation plans
- **Pull Requests**: Track created PRs

## Tech Stack

- Next.js 14 (App Router)
- TypeScript
- Tailwind CSS
- shadcn/ui components
- Supabase (direct connection)
- TanStack Query (React Query)
- Lucide Icons

## Setup

### 1. Install Dependencies

```bash
cd admin-dashboard
npm install
```

### 2. Configure Supabase

Edit `.env.local` with your Supabase credentials:

```env
NEXT_PUBLIC_SUPABASE_URL=https://fwbmyfpfckvjomzijkby.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
```

Get your anon key from: Supabase Dashboard → Settings → API → Project API keys → `anon` `public`

### 3. Create First Admin

1. Run `npm run dev`
2. Go to `http://localhost:3000`
3. Click "First time? Create admin account"
4. Enter your email and create a password
5. Click "Create Account"

**Note:** Only the first user can self-register as admin. After that, existing admins must add new admins.

### 4. Run Development Server

```bash
npm run dev
```

The admin dashboard will be available at `http://localhost:3000`

## Project Structure

```
admin-dashboard/
├── app/                    # Next.js App Router pages
│   ├── layout.tsx         # Root layout
│   ├── page.tsx           # Home/Dashboard page
│   ├── providers.tsx      # React Query provider
│   ├── globals.css        # Global styles
│   ├── users/page.tsx     # Users page
│   ├── jobs/page.tsx      # Jobs page
│   ├── plans/page.tsx     # Plans page
│   └── prs/page.tsx       # Pull Requests page
├── components/
│   ├── ui/                # shadcn/ui components
│   ├── login-page.tsx     # Login component
│   ├── dashboard-layout.tsx # Dashboard layout with sidebar
│   └── dashboard-page.tsx # Main dashboard content
├── lib/
│   ├── supabase.ts        # Supabase client & database queries
│   └── utils.ts           # Utility functions
└── package.json
```

## Database Tables

The dashboard reads from these Supabase tables:

- `users` - GitHub users with admin flag
- `job_records` - Coding agent job executions
- `plan_records` - Generated implementation plans
- `pr_records` - Created pull requests
