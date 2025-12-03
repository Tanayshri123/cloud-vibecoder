# Cloud Vibecoder 🚀

> **AI-Powered Code Generation & Repository Management**

Cloud Vibecoder is a full-stack mobile application that uses AI to automatically generate code, create repositories, and implement features based on natural language descriptions. Built with React Native (Expo), FastAPI backend, and Next.js admin dashboard, it leverages GPT-4 and E2B sandboxes for intelligent code generation with full database tracking via Supabase.

## ✨ Key Features

### 🤖 **AI-Driven Development**
- **Natural Language to Code**: Describe what you want in plain English, get working code
- **Intelligent Planning**: Generates detailed implementation plans with CRS (Change Request Specification)
- **Multi-Step Execution**: Breaks down complex features into manageable steps
- **Smart Code Generation**: Uses GPT-4 to write, test, and refine code

### 📦 **Repository Management**
- **Create New Repos**: Automatically create GitHub repositories with generated code
- **Modify Existing Repos**: Add features to existing repositories via pull requests
- **File Browser**: Browse repository structure and select specific files
- **Branch Management**: Automatic branch creation and PR generation

### 🔐 **GitHub Integration**
- **OAuth Authentication**: Secure GitHub login via OAuth 2.0
- **Repository Access**: Browse and select from your GitHub repositories
- **Pull Request Creation**: Automatic PR generation with detailed descriptions
- **Commit History**: View all changes and commits made by the AI

### 📊 **Progress Tracking & Analytics**
- **Real-Time Updates**: Live progress tracking during code generation
- **Job Status**: Monitor execution status (pending → executing → completed)
- **Detailed Results**: View files changed, commits created, and execution metrics
- **Admin Dashboard**: Full analytics dashboard for monitoring users, jobs, plans, and PRs
- **Database Tracking**: All activities tracked in Supabase (users, plans, jobs, PRs)

## 🔄 Complete Workflow

### 1. **User Input** 📝
- Sign in with GitHub OAuth
- Choose between creating a new repository or modifying an existing one
- Describe your feature request in natural language
- Optionally select specific files to modify

### 2. **AI Processing** 🧠
```
User Prompt → CRS Generation → Plan Synthesis → Code Execution → PR/Repo Creation
```

1. **CRS Generation**: AI clarifies requirements and asks questions if needed
2. **Plan Synthesis**: Creates detailed implementation plan with steps
3. **Code Execution**: Generates code in E2B sandbox environment
4. **Delivery**: Creates repository or pull request with changes

### 3. **Review & Deploy** ✅
- View detailed changes summary
- Access generated pull request or repository
- Review commits, files, and execution metrics
- Merge PR when satisfied with changes

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│              MOBILE APP (React Native + Expo)               │
│  • GitHub OAuth • Repository Browser • File Selection      │
│  • Real-time Progress • Changes Viewer                     │
└────────────────┬────────────────────────────────────────────┘
                 │
                 │ HTTPS/REST API
                 ▼
┌─────────────────────────────────────────────────────────────┐
│                FASTAPI BACKEND                              │
│                                                             │
│  ┌────────────────────────────────────────────────────┐   │
│  │                 API ENDPOINTS                      │   │
│  │  • /api/auth/github/*     - OAuth flow           │   │
│  │  • /api/crs               - Requirements (CRS)   │   │
│  │  • /api/plan-synthesis    - Plan generation      │   │
│  │  • /api/jobs/*            - Code execution       │   │
│  │  • /api/github/*          - GitHub integration   │   │
│  │  • /api/admin/*           - Admin endpoints      │   │
│  └────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌────────────────────────────────────────────────────┐   │
│  │                   SERVICES                         │   │
│  │  • LLM Service (GPT-4)    • Database Service     │   │
│  │  • Orchestration Service  • VM Service (E2B)     │   │
│  │  • GitHub Service         • Coding Agent         │   │
│  │  • Plan Synthesis Service                         │   │
│  └────────────────────────────────────────────────────┘   │
└─────────────────┬───────────────────────────────────────────┘
                  │
    ┌─────────────┼─────────────┐
    ▼             ▼             ▼
┌─────────────┐ ┌──────────┐ ┌──────────────┐
│   E2B       │ │ Supabase │ │   GitHub     │
│  Sandbox    │ │    DB    │ │     API      │
│ (Execution) │ │(Tracking)│ │  (Repos/PRs) │
└─────────────┘ └──────────┘ └──────────────┘

┌─────────────────────────────────────────────────────────────┐
│            ADMIN DASHBOARD (Next.js)                        │
│  • User Management • Job Monitoring • Plan Analytics       │
│  • PR Tracking • Metrics Dashboard                         │
│  • Direct Supabase Connection                              │
└─────────────────────────────────────────────────────────────┘
```

## 📁 Project Structure

```
cloud-vibecoder/
├── backend/                          # FastAPI Backend
│   ├── app/
│   │   ├── api/                      # API endpoints
│   │   │   ├── auth.py              # GitHub OAuth + user tracking
│   │   │   ├── crs.py               # CRS generation
│   │   │   ├── plan_synthesis.py    # Plan creation + tracking
│   │   │   ├── agent_execution.py   # Job orchestration
│   │   │   ├── github.py            # GitHub operations + PR tracking
│   │   │   └── admin.py             # Admin endpoints
│   │   ├── services/                # Business logic
│   │   │   ├── llm_service.py       # GPT-4 integration
│   │   │   ├── orchestration_service.py  # Job management
│   │   │   ├── plan_synthesis_service.py
│   │   │   ├── github_service.py
│   │   │   ├── vm_service.py        # E2B sandbox management
│   │   │   └── coding_agent_main.py # AI coding agent
│   │   ├── models/                  # Pydantic models
│   │   │   ├── crs_model.py
│   │   │   ├── plan_model.py
│   │   │   ├── orchestration_model.py
│   │   │   └── database.py          # Supabase models & service
│   │   └── core/                    # Configuration
│   │       └── config.py
│   ├── main.py                      # FastAPI app
│   └── requirements.txt
├── mobile/                           # React Native Mobile App
│   ├── app/
│   │   ├── (tabs)/                  # Main tab navigation
│   │   │   └── index.tsx           # Home/Create screen
│   │   ├── login.tsx               # GitHub OAuth login
│   │   ├── changes.tsx             # Changes detail view + PR approval
│   │   ├── welcome.tsx             # Welcome/onboarding screen
│   │   └── _layout.tsx             # Root layout
│   ├── components/                  # UI components
│   │   ├── RepoModeSelector.tsx    # New/existing repo toggle
│   │   └── NewRepoForm.tsx         # New repo configuration
│   ├── constants/theme.ts          # Design system
│   ├── services/githubService.ts   # GitHub API client
│   └── package.json
├── admin-dashboard/                  # Next.js Admin Dashboard
│   ├── app/                         # App Router pages
│   │   ├── page.tsx                # Dashboard home
│   │   ├── users/page.tsx          # User management
│   │   ├── jobs/page.tsx           # Job monitoring
│   │   ├── plans/page.tsx          # Plan analytics
│   │   └── prs/page.tsx            # PR tracking
│   ├── components/                  # UI components
│   │   ├── ui/                     # shadcn/ui components
│   │   ├── login-page.tsx
│   │   └── dashboard-layout.tsx
│   ├── lib/supabase.ts             # Supabase client
│   └── package.json
└── README.md
```

## 🔌 API Endpoints

### Authentication
- `POST /api/auth/github/exchange` - Exchange OAuth code for token (returns `db_user_id`)
- `GET /api/auth/github/callback` - GitHub OAuth callback

### Code Generation
- `POST /api/crs` - Generate Change Request Specification
- `POST /api/plan-synthesis` - Create implementation plan (tracks in DB)
- `POST /api/jobs/create` - Start code generation job (tracks in DB)
- `GET /api/jobs/{job_id}/progress` - Get job status
- `GET /api/jobs/{job_id}/result` - Get job results

### GitHub Operations
- `POST /api/github/create-pr` - Create pull request (tracks in DB)
- `POST /api/github/commits` - Get branch commits
- `POST /api/github/parse-url` - Parse repository URL

### Admin (requires authentication)
- `GET /api/admin/metrics` - Get aggregated metrics
- `GET /api/admin/users` - List all users
- `GET /api/admin/users/{id}` - Get user details with activity
- `GET /api/admin/jobs` - List all job records
- `GET /api/admin/plans` - List all plan records
- `GET /api/admin/prs` - List all PR records

## 🚀 Quick Start

### Prerequisites

- **Node.js** (v18 or higher)
- **Python** (v3.11 or higher)
- **Expo CLI** (`npm install -g expo-cli`)
- **GitHub Account** (for OAuth)
- **Supabase Project** (for database)
- **API Keys**:
  - OpenAI API Key (GPT-4 access)
  - E2B API Key (code execution)
  - GitHub OAuth App (Client ID & Secret)
  - Supabase URL & Anon Key

### 1. Clone Repository

```bash
git clone https://github.com/Tanayshri123/cloud-vibecoder.git
cd cloud-vibecoder
```

### 2. Backend Setup

#### Environment Variables

Create `backend/.env`:

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

#### Install & Run

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Run server
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Backend will be available at `http://localhost:8000`

### 3. Mobile App Setup

#### Environment Variables

Create `mobile/.env`:

```env
# For local development, use your machine's IP address
EXPO_PUBLIC_API_URL=http://YOUR_IP:8000
EXPO_PUBLIC_GITHUB_CLIENT_ID=your_client_id
GITHUB_CLIENT_SECRET=your_client_secret
GITHUB_CLIENT_ID=your_client_id
```

#### Install & Run

```bash
cd mobile

# Install dependencies
npm install

# Start Expo development server (clear cache for env changes)
npx expo start --clear
```

Expo dev tools will open. You can:
- Press `i` for iOS Simulator
- Press `a` for Android Emulator  
- Press `w` for web browser
- Scan QR code with Expo Go app on your phone

### 4. Admin Dashboard Setup

#### Environment Variables

Create `admin-dashboard/.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
NEXT_PUBLIC_ADMIN_SECRET_KEY=your_admin_secret
```

#### Install & Run

```bash
cd admin-dashboard

# Install dependencies
npm install

# Build for production
npm run build

# Start server
npm start
```

Admin dashboard will be available at `http://localhost:3000`

### 5. GitHub OAuth Setup

1. Go to [GitHub Developer Settings](https://github.com/settings/developers)
2. Create a new OAuth App:
   - **Application name**: Cloud Vibecoder
   - **Homepage URL**: `https://cloud-vibecoder-1.onrender.com`
   - **Authorization callback URL**: `https://cloud-vibecoder-1.onrender.com/api/auth/github/callback`
3. Copy Client ID and Client Secret to your `.env` files

## 💡 Usage Guide

### Creating a New Repository

1. **Sign In**: Tap "Sign in with GitHub"
2. **Choose Mode**: Select "Create New Repository"
3. **Configure Repo**:
   - Enter repository name
   - Add description (optional)
   - Choose public/private
   - Select .gitignore template (optional)
   - Select license (optional)
4. **Describe Feature**: Enter what you want to build
5. **Generate**: Tap "Generate Plan"
6. **Review Plan**: Review the AI-generated implementation plan
7. **Execute**: Tap "Accept & Create Repository"
8. **View Changes**: Tap "View Changes" to see detailed results

### Modifying Existing Repository

1. **Sign In**: Tap "Sign in with GitHub"
2. **Choose Mode**: Select "Use Existing Repository"
3. **Select Repo**: Choose from your GitHub repositories
4. **Optional**: Browse and select specific files to modify
5. **Describe Changes**: Enter what you want to add/modify
6. **Generate**: Tap "Generate Plan"
7. **Review Plan**: Review the implementation plan
8. **Execute**: Tap "Accept & Create PR"
9. **View Results**: See detailed changes and PR link

## 🛠️ Tech Stack

### Mobile App
- **Framework**: React Native (Expo)
- **Language**: TypeScript
- **Navigation**: Expo Router (file-based)
- **State Management**: React Hooks
- **Authentication**: expo-web-browser, expo-auth-session
- **Storage**: AsyncStorage
- **UI**: Custom design system with modern typography

### Backend
- **Framework**: FastAPI
- **Language**: Python 3.11+
- **AI**: OpenAI GPT-4
- **Execution**: E2B Code Interpreter (sandboxed)
- **Validation**: Pydantic v2
- **Deployment**: Render (auto-deploy from GitHub)
- **CORS**: Configured for mobile app origins

### Admin Dashboard
- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **UI**: Tailwind CSS + shadcn/ui
- **Data Fetching**: TanStack Query
- **Database**: Direct Supabase connection

### External Services
- **GitHub API**: Repository management, PR creation
- **OpenAI API**: GPT-4 for code generation
- **E2B API**: Secure code execution environment
- **Supabase**: PostgreSQL database for tracking

## 🔒 Security

- **OAuth 2.0**: Secure GitHub authentication
- **Token Storage**: Encrypted in AsyncStorage
- **Server-Side Secrets**: Client secret never exposed to mobile
- **Sandboxed Execution**: E2B provides isolated execution environment
- **Environment Variables**: Sensitive data in .env files (gitignored)

## 📈 Performance

- **Real-time Progress**: Live updates during code generation
- **Job Polling**: 2-second intervals for status updates
- **Timeout Handling**: 6-minute maximum execution time
- **Error Recovery**: Graceful error handling with user feedback
- **Caching**: GitHub API responses cached where applicable

## 🎨 UI/UX Features

- **Modern Design**: Clean, minimalistic interface
- **Dark Mode Ready**: Theme system supports dark mode
- **Responsive**: Works on all screen sizes
- **Loading States**: Clear feedback during operations
- **Error Messages**: Helpful error descriptions
- **Progress Indicators**: Visual feedback for long operations
- **Changes Viewer**: Dedicated page to review all modifications

## 📝 License

This project is open source and available under the [MIT License](LICENSE).

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📧 Contact

For questions or support, please open an issue on GitHub.

---

## 🔗 Links

- **Backend API**: [https://cloud-vibecoder-1.onrender.com](https://cloud-vibecoder-1.onrender.com)
- **API Documentation**: [https://cloud-vibecoder-1.onrender.com/docs](https://cloud-vibecoder-1.onrender.com/docs)
- **GitHub Repository**: [https://github.com/Tanayshri123/cloud-vibecoder](https://github.com/Tanayshri123/cloud-vibecoder)

## ⭐ Star History

If you find this project useful, please consider giving it a star on GitHub!

### ✅ What's Working
- Full end-to-end AI code generation workflow
- Mobile app with GitHub OAuth and repository management
- Backend API with GPT-4 integration and E2B sandboxed execution
- Database tracking for users, plans, jobs, and PRs via Supabase
- Admin dashboard for monitoring and analytics
- Automatic PR creation with detailed change summaries

## Troubleshooting

### Mobile App Issues

1. **Network request failed**: 
   - Ensure you have internet connection
   - Check that the backend is accessible at `https://cloud-vibecoder-1.onrender.com`
   - Verify API configuration in console logs

2. **Expo issues**:
   - Clear Expo cache: `expo start -c`
   - Reset project: `npm run reset-project`

3. **Dependencies issues**:
   - Delete `node_modules` and `package-lock.json`
   - Run `npm install` again

### Backend Issues

1. **API not responding**: Check Render deployment status
2. **CORS errors**: Backend is configured to accept requests from any origin
3. **Module not found**: Dependencies are managed by Render automatically

## Dependencies

### Backend
- `fastapi` - Web framework
- `uvicorn` - ASGI server
- `pydantic` - Data validation
- `python-multipart` - Form data handling

### Mobile
- `expo` - Development platform
- `react-native` - Mobile framework
- `expo-router` - Navigation
- `typescript` - Type safety

## Support

If you encounter any issues:
1. Check the troubleshooting section above
2. Review the console logs for error messages
3. Ensure all dependencies are properly installed
4. Verify network connectivity

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test on both backend and mobile
5. Submit a pull request
