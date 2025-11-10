# Cloud Vibecoder

A full-stack application that generates implementation plans for GitHub repositories based on natural language prompts. The project consists of a React Native mobile app and a FastAPI backend deployed on Render.

## 🎯 What It Does

Cloud Vibecoder takes your natural language requests and creates structured implementation plans for GitHub repositories. Here's how it works:

1. **Input**: You provide a GitHub repository URL and describe what you want to change
2. **Processing**: The backend receives your prompt and repository information
3. **Output**: It generates a detailed plan with steps to implement your request

## 🔄 Current Flow

### User Input
- **GitHub Repository**: Enter any GitHub repo URL (e.g., `https://github.com/facebook/react`)
- **Change Request**: Describe what you want to do in plain English (e.g., "Add dark mode toggle to the settings page")

### What Happens Next
1. **Mobile App** sends the repository URL, prompt, and GitHub OAuth token to the backend API
2. **Backend** creates a coding agent job and starts Docker container execution
3. **Real AI Coding Agent** (Aider) executes your changes in an isolated environment:
   - Clones the target repository
   - Analyzes the codebase structure
   - Makes actual code modifications using AI
   - Commits changes to a new branch
   - Creates a pull request on GitHub
4. **Real-time Updates** - Mobile app polls job status every 3 seconds
5. **Completion** - Returns actual PR URL and execution details

### Current Backend Behavior
The backend now executes **real coding agent jobs** using Docker containers:
- **Aider AI Coding Agent**: Production-ready tool that actually modifies code
- **GitHub Integration**: Automatic forking, branching, and PR creation
- **Job Queue System**: Async execution with status tracking
- **Real Results**: Returns actual pull request URLs and modified files
- **Error Handling**: Comprehensive logging and graceful failure recovery

## Project Structure

```
cloud-vibecoder/
├── backend/           # FastAPI backend server (deployed on Render)
│   ├── app/
│   │   ├── api/
│   │   │   ├── agent_jobs.py    # Coding agent job endpoints
│   │   │   └── ...              # Other API endpoints
│   │   ├── services/
│   │   │   ├── coding_agent_service.py  # Docker orchestration
│   │   │   ├── github_app_service.py    # GitHub PR creation
│   │   │   └── ...              # Other services
│   │   ├── models/
│   │   │   ├── job_model.py     # Job and result data models
│   │   │   └── ...              # Other models
│   │   └── main.py              # Main API server with all routes
│   ├── docker/
│   │   └── coding-agent/        # Docker infrastructure
│   │       ├── Dockerfile       # Aider-based coding agent image
│   │       └── entrypoint.sh    # Container execution script
│   └── .venv/                   # Python virtual environment
├── mobile/           # React Native mobile app
│   ├── app/          # App screens and navigation
│   │   └── (tabs)/
│   │       └── index.tsx        # Updated with real agent integration
│   ├── components/   # Reusable UI components
│   ├── constants/    # App constants and themes
│   └── package.json  # Node.js dependencies
└── infra/           # Infrastructure configuration
```

### POST `/api/auth/github/exchange`

Exchanges a GitHub OAuth authorization code for an access token and basic profile data. The mobile client hits this after obtaining a `code` from GitHub via Expo AuthSession.

**Request Body:**
```json
{
  "code": "github-oauth-code",
  "redirect_uri": "mobile://oauth-redirect"
}
```

**Response:**
```json
{
  "access_token": "gho_...",
  "token_type": "bearer",
  "scope": "read:user,user:email",
  "user": {
    "id": 12345,
    "login": "octocat",
    "name": "The Octocat",
    "avatar_url": "https://avatars.githubusercontent.com/u/583231?v=4",
    "email": "octocat@github.com"
  }
}
```

> The backend performs the code exchange with GitHub so the mobile app never needs to store the client secret.

## Quick Start

### Prerequisites

- **Node.js** (v18 or higher)
- **Python** (v3.8 or higher)
- **Expo CLI** (`npm install -g @expo/cli`)
- **Git**

### 1. Backend Setup (Optional - Already Deployed)

The backend is already deployed at `https://cloud-vibecoder-1.onrender.com`. If you want to run locally:

```bash
cd backend

# Create virtual environment
python -m venv .venv

# Activate virtual environment
# On macOS/Linux:
source .venv/bin/activate
# On Windows:
# .venv\Scripts\activate

# Install dependencies
pip install fastapi uvicorn pydantic python-multipart

# Run the server
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

### 2. Mobile App Setup

```bash
cd mobile

# Install dependencies
npm install

# Start the development server
npm start
```

This will open the Expo development tools. You can then:
- Press `i` to open iOS Simulator
- Press `a` to open Android Emulator
- Press `w` to open in web browser
- Scan the QR code with Expo Go app on your physical device

## Features

- **Production Ready**: Backend deployed on Render with automatic HTTPS
- **Cross-Platform**: Works on iOS, Android, and Web
- **Environment Configuration**: Easy switching between local and production APIs
- **Modern UI**: Clean, responsive interface with proper theming
- **Real-time Communication**: Mobile app communicates with deployed FastAPI backend
- **GitHub Sign-In**: Native GitHub OAuth flow with server-side token exchange and profile retrieval

## API Endpoints

### POST `/api/plan`

Generates an implementation plan based on repository and prompt.

**Request Body:**
```json
{
  "repo": "https://github.com/facebook/react",
  "prompt": "Add dark mode toggle to the settings page"
}
```

**Response:**
```json
{
  "repo": "https://github.com/facebook/react",
  "plan": {
    "title": "Plan for 'Add dark mode toggle to the settings page'",
    "summary": "This mock plan outlines how Cloud Vibecoder will implement your request.",
    "steps": [
      "Inspect repository: https://github.com/facebook/react",
      "Locate relevant code areas for 'Add dark mode toggle to the settings page'",
      "Draft modification steps",
      "Generate diff and propose PR"
    ]
  }
}
```

## Configuration

### Environment Variables

The app uses environment variables for API configuration:

**Production (Default):**
- Uses `https://cloud-vibecoder-1.onrender.com`

**Local Development:**
- Create a `.env` file in the mobile directory:
  ```
  EXPO_PUBLIC_API_URL=http://localhost:8000
  EXPO_PUBLIC_GITHUB_CLIENT_ID=your_github_oauth_client_id
  ```
- Create a `.env` file in `backend/` and provide your GitHub OAuth credentials alongside the existing settings:
  ```
  OPENAI_API_KEY=sk-...
  GITHUB_CLIENT_ID=your_github_oauth_client_id
  GITHUB_CLIENT_SECRET=your_github_oauth_client_secret
  ```

GitHub requires you to register an OAuth application:
1. Head to **Settings → Developer settings → OAuth Apps** in GitHub and create a new app.
2. Add each redirect you plan to use so GitHub accepts them:
   - Expo web dev: `http://localhost:19006/oauth-redirect`
   - Expo Go / dev clients: value shown in the Expo CLI logs (usually `exp://127.0.0.1:8081/--/oauth-redirect`)
   - Native builds: `mobile://oauth-redirect`
   GitHub lets you register multiple callback URLs—add them all for reliable testing.
3. Copy the generated **Client ID** and **Client Secret** into the `.env` files above.

## Development

### Backend Development

The backend uses FastAPI with automatic API documentation available at:
- **Swagger UI**: `https://cloud-vibecoder-1.onrender.com/docs`
- **ReDoc**: `https://cloud-vibecoder-1.onrender.com/redoc`

### Mobile Development

The mobile app uses:
- **Expo Router** for navigation
- **TypeScript** for type safety
- **Environment variables** for API configuration
- **React Native** for cross-platform UI

## Current Status

### ✅ What's Working
- Mobile app with clean UI
- Backend API deployed and accessible
- Environment-based configuration
- Cross-platform compatibility
- Mock response generation

### 🚧 What's Next (Future Development)
- **AI Integration**: Replace mock responses with actual AI-powered code analysis
- **Repository Analysis**: Connect to GitHub API to analyze actual code
- **Code Generation**: Generate actual code changes based on prompts
- **Git Integration**: Create actual pull requests with proposed changes

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
