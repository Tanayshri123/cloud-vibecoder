# Cloud Vibecoder Admin Dashboard 📊

A **standalone** Next.js admin interface for monitoring Cloud Vibecoder metrics. Connects directly to Supabase - no backend required.

## Features

- **Dashboard**: Overview of all metrics (users, jobs, plans, PRs)
- **Users**: View all users and their activity history
- **Jobs**: Monitor coding agent job executions with status tracking
- **Plans**: View generated implementation plans with complexity scores
- **Pull Requests**: Track created PRs with repository details
- **Real-time Data**: Auto-refresh with TanStack Query

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Components**: shadcn/ui
- **Database**: Supabase (direct connection)
- **Data Fetching**: TanStack Query (React Query)
- **Icons**: Lucide Icons

## Setup

### 1. Install Dependencies

```bash
cd admin-dashboard
npm install
```

### 2. Configure Environment

Create `.env.local`:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key

# Admin secret key (must match backend ADMIN_SECRET_KEY)
NEXT_PUBLIC_ADMIN_SECRET_KEY=your-admin-secret
```

Get your Supabase credentials from: **Supabase Dashboard → Settings → API → Project API keys**

### 3. Run Development Server

```bash
npm run dev
```

Dashboard available at `http://localhost:3000`

### 4. Production Build

```bash
npm run build
npm start
```

## Project Structure

```
admin-dashboard/
├── app/                       # Next.js App Router pages
│   ├── layout.tsx            # Root layout with providers
│   ├── page.tsx              # Dashboard home (metrics overview)
│   ├── providers.tsx         # React Query provider
│   ├── globals.css           # Global styles + Tailwind
│   ├── users/page.tsx        # User management
│   ├── jobs/page.tsx         # Job monitoring
│   ├── plans/page.tsx        # Plan analytics
│   └── prs/page.tsx          # PR tracking
├── components/
│   ├── ui/                   # shadcn/ui components
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── table.tsx
│   │   └── ...
│   ├── login-page.tsx        # Admin login form
│   ├── dashboard-layout.tsx  # Sidebar + header layout
│   └── dashboard-page.tsx    # Main dashboard content
├── lib/
│   ├── supabase.ts           # Supabase client & queries
│   └── utils.ts              # Utility functions (cn, etc.)
└── package.json
```

## Database Schema

The dashboard reads from these Supabase tables:

### `users`
| Column | Type | Description |
|--------|------|-------------|
| id | int | Internal user ID |
| github_id | int | GitHub user ID |
| github_login | text | GitHub username |
| github_name | text | Display name |
| github_email | text | Email address |
| github_avatar_url | text | Avatar URL |
| is_admin | bool | Admin status |
| created_at | timestamp | Registration date |
| last_login_at | timestamp | Last login |

### `job_records`
| Column | Type | Description |
|--------|------|-------------|
| id | int | Record ID |
| job_id | uuid | Unique job ID |
| user_id | int | Associated user |
| repo_url | text | Repository URL |
| branch | text | Working branch |
| status | text | pending/running/completed/failed |
| tokens_used | int | AI tokens consumed |
| execution_time_seconds | float | Total execution time |
| files_changed | int | Number of files modified |
| created_at | timestamp | Job creation time |

### `plan_records`
| Column | Type | Description |
|--------|------|-------------|
| id | int | Record ID |
| user_id | int | Associated user |
| plan_title | text | Plan title |
| complexity_score | int | 1-10 complexity |
| confidence_score | float | AI confidence |
| steps_count | int | Number of steps |
| files_to_change_count | int | Files to modify |
| processing_time_ms | int | Generation time |
| model_used | text | AI model used |
| tokens_used | int | Tokens consumed |
| created_at | timestamp | Creation time |

### `pr_records`
| Column | Type | Description |
|--------|------|-------------|
| id | int | Record ID |
| user_id | int | Associated user |
| job_id | uuid | Associated job |
| pr_number | int | GitHub PR number |
| repo_owner | text | Repository owner |
| repo_name | text | Repository name |
| title | text | PR title |
| html_url | text | PR URL |
| state | text | open/closed/merged |
| head_branch | text | Source branch |
| base_branch | text | Target branch |
| created_at | timestamp | Creation time |

## Metrics Displayed

### Dashboard Overview
- Total users, jobs, plans, PRs
- Completed vs failed jobs
- Total tokens used
- Average execution time
- Total files changed

### User Details
- User activity history
- Jobs created by user
- Plans generated
- PRs created

## Troubleshooting

### "Failed to fetch" errors
- Verify Supabase URL and key in `.env.local`
- Check Supabase project is active
- Ensure tables exist with correct schema

### Empty data
- Verify backend has Supabase credentials configured
- Run through mobile app workflow to generate data
- Check Supabase table browser for records
