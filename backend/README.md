# Cloud Vibecoder Backend API 🚀

FastAPI backend for Cloud Vibecoder - handles AI code generation, GitHub integration, and database tracking.

## Features

- **AI Code Generation**: GPT-4 powered code synthesis
- **GitHub Integration**: OAuth, repository management, PR creation
- **Sandboxed Execution**: E2B for secure code execution
- **Database Tracking**: Supabase for users, jobs, plans, PRs
- **Real-time Progress**: Job status polling endpoints

## Tech Stack

- **Framework**: FastAPI
- **Language**: Python 3.11+
- **AI**: OpenAI GPT-4 / GPT-4o-mini
- **Execution**: E2B Code Interpreter
- **Database**: Supabase (PostgreSQL)
- **Validation**: Pydantic v2

## Setup

### 1. Create Virtual Environment

```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
```

### 2. Install Dependencies

```bash
pip install -r requirements.txt
```

### 3. Configure Environment

Create `.env`:

```env
# OpenAI Configuration
OPENAI_API_KEY=sk-proj-...

# GitHub OAuth
GITHUB_CLIENT_ID=your_client_id
GITHUB_CLIENT_SECRET=your_client_secret

# E2B Sandbox
E2B_API_KEY=your_e2b_key

# Supabase (required for database tracking)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your_supabase_anon_key

# Admin
ADMIN_SECRET_KEY=your_secret_key
```

### 4. Run Development Server

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

API available at `http://localhost:8000`
Docs available at `http://localhost:8000/docs`

## Project Structure

```
backend/
├── app/
│   ├── api/                          # API endpoints
│   │   ├── auth.py                  # GitHub OAuth + user tracking
│   │   ├── crs.py                   # CRS generation
│   │   ├── plan_synthesis.py        # Plan creation + tracking
│   │   ├── agent_execution.py       # Job orchestration
│   │   ├── github.py                # GitHub operations + PR tracking
│   │   └── admin.py                 # Admin endpoints
│   ├── services/                     # Business logic
│   │   ├── llm_service.py           # OpenAI GPT-4 integration
│   │   ├── orchestration_service.py # Job management + tracking
│   │   ├── plan_synthesis_service.py# Plan generation
│   │   ├── github_service.py        # GitHub API client
│   │   ├── vm_service.py            # E2B sandbox management
│   │   ├── repo_service.py          # Repository operations
│   │   ├── coding_agent_main.py     # AI coding agent
│   │   └── agent_tools.py           # Agent tool implementations
│   ├── models/                       # Pydantic models
│   │   ├── crs_model.py             # Change Request Specification
│   │   ├── plan_model.py            # Implementation Plan
│   │   ├── orchestration_model.py   # Job models
│   │   └── database.py              # Supabase models & service
│   └── core/
│       └── config.py                # Settings & configuration
├── main.py                           # FastAPI app entry point
└── requirements.txt
```

## API Endpoints

### Health Check
- `GET /api/health` - Server health status

### Authentication
- `POST /api/auth/github/exchange` - Exchange OAuth code for token
  - Returns `db_user_id` for database tracking
- `GET /api/auth/github/callback` - OAuth callback handler

### CRS Generation
- `POST /api/crs` - Generate Change Request Specification
  - Input: User prompt, repository context
  - Output: Structured CRS with goals, constraints, acceptance criteria

### Plan Synthesis
- `POST /api/plan-synthesis` - Generate implementation plan
  - Input: CRS, repository URL, user_id
  - Output: Detailed plan with steps, files, testing strategy
  - **Tracks in database** when user_id provided

### Job Execution
- `POST /api/jobs/create` - Create coding job
  - Input: Plan, repository, GitHub token, user_id
  - Output: Job ID for tracking
  - **Tracks in database** when user_id provided
- `GET /api/jobs/{job_id}/progress` - Get job status
- `GET /api/jobs/{job_id}/result` - Get job results

### GitHub Operations
- `POST /api/github/create-pr` - Create pull request
  - **Tracks in database** when user_id provided
- `POST /api/github/commits` - Get branch commits
- `POST /api/github/parse-url` - Parse repository URL
- `POST /api/github/repo-contents` - Get repository contents

### Admin
- `POST /api/admin/login` - Admin authentication
- `GET /api/admin/metrics` - Aggregated metrics
- `GET /api/admin/users` - List all users
- `GET /api/admin/users/{id}` - User details with activity
- `GET /api/admin/jobs` - All job records
- `GET /api/admin/plans` - All plan records
- `GET /api/admin/prs` - All PR records

## Database Tracking

When `SUPABASE_URL` and `SUPABASE_KEY` are configured, the backend automatically tracks:

### Users (`users` table)
- Created/updated on GitHub OAuth login
- Stores GitHub profile info
- Tracks last login time

### Plans (`plan_records` table)
- Recorded when plan is generated with `user_id`
- Stores complexity, confidence, steps count
- Tracks processing time and tokens used

### Jobs (`job_records` table)
- Recorded when job is created with `user_id`
- Updated with status, execution time, files changed
- Tracks tokens used

### PRs (`pr_records` table)
- Recorded when PR is created with `user_id`
- Links to job_id if available
- Stores PR number, URL, state

## Code Generation Flow

```
1. User Prompt
   ↓
2. CRS Generation (LLM Service)
   ↓
3. Plan Synthesis (Plan Service)
   ↓
4. Job Creation (Orchestration Service)
   ↓
5. VM Provisioning (E2B Service)
   ↓
6. Code Execution (Coding Agent)
   ↓
7. Git Operations (Repo Service)
   ↓
8. PR Creation (GitHub Service)
```

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `OPENAI_API_KEY` | Yes | OpenAI API key for GPT-4 |
| `GITHUB_CLIENT_ID` | Yes | GitHub OAuth app client ID |
| `GITHUB_CLIENT_SECRET` | Yes | GitHub OAuth app secret |
| `E2B_API_KEY` | Yes | E2B API key for sandboxed execution |
| `SUPABASE_URL` | No* | Supabase project URL |
| `SUPABASE_KEY` | No* | Supabase anon key |
| `ADMIN_SECRET_KEY` | No | Secret for admin authentication |

*Database tracking disabled if not configured

## Troubleshooting

### "OpenAI API key not configured"
- Ensure `OPENAI_API_KEY` is set in `.env`
- Restart server after changing `.env`

### Database not tracking
- Verify both `SUPABASE_URL` and `SUPABASE_KEY` are set
- Check Supabase project is active
- Look for "DB_AVAILABLE" in startup logs

### E2B execution fails
- Verify `E2B_API_KEY` is valid
- Check E2B dashboard for quota/limits
- Review VM logs in console output

### GitHub OAuth fails
- Ensure callback URL matches OAuth app settings
- Verify client ID/secret are correct
- Check for CORS issues in browser console
