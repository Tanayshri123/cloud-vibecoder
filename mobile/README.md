# Cloud Vibecoder Mobile App 📱

The React Native mobile client for Cloud Vibecoder - an AI-powered code generation platform.

## Features

- **GitHub OAuth**: Secure authentication with GitHub
- **Repository Management**: Create new repos or modify existing ones
- **AI Code Generation**: Natural language to working code
- **Real-time Progress**: Live updates during code generation
- **PR Approval Flow**: Review changes before creating pull requests
- **File Browser**: Browse and select specific files to modify

## Tech Stack

- **Framework**: React Native (Expo SDK 54)
- **Language**: TypeScript
- **Navigation**: Expo Router (file-based)
- **State**: React Hooks + AsyncStorage
- **Authentication**: expo-auth-session
- **UI**: Custom design system with modern typography

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment

Create `.env` file:

```env
# Use your machine's IP for local development
EXPO_PUBLIC_API_URL=http://YOUR_IP:8000
EXPO_PUBLIC_GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret
GITHUB_CLIENT_ID=your_github_client_id
```

**Finding your IP:**
- macOS: `ifconfig | grep "inet " | grep -v 127.0.0.1`
- Windows: `ipconfig`

### 3. Start Development Server

```bash
# Clear cache when changing environment variables
npx expo start --clear
```

### 4. Run on Device/Simulator

- Press `i` for iOS Simulator
- Press `a` for Android Emulator
- Scan QR code with Expo Go app

## Project Structure

```
mobile/
├── app/                      # Expo Router pages
│   ├── (tabs)/              # Tab navigation
│   │   └── index.tsx        # Main screen (create/modify)
│   ├── login.tsx            # GitHub OAuth login
│   ├── changes.tsx          # Changes review + PR approval
│   ├── welcome.tsx          # Onboarding screen
│   └── _layout.tsx          # Root layout
├── components/
│   ├── RepoModeSelector.tsx # New/existing repo toggle
│   └── NewRepoForm.tsx      # New repo configuration
├── constants/
│   └── theme.ts             # Design system (colors, typography)
├── services/
│   └── githubService.ts     # GitHub API client
└── package.json
```

## Key Screens

### Home Screen (`app/(tabs)/index.tsx`)
- Repository mode selection (new/existing)
- Natural language prompt input
- CRS generation and review
- Plan generation and editing
- Job execution with progress tracking

### Changes Screen (`app/changes.tsx`)
- Detailed changes summary
- File changes list
- Commit messages
- PR approval/rejection flow

### Login Screen (`app/login.tsx`)
- GitHub OAuth authentication
- Stores access token and user ID

## Troubleshooting

### Network Request Timeout
- Verify backend is running: `curl http://YOUR_IP:8000/api/health`
- Check IP address in `.env` matches your current network
- Restart Expo with `--clear` flag after env changes

### GitHub OAuth Issues
- Ensure redirect URI matches OAuth app settings
- Check client ID/secret are correct
- Verify backend has matching GitHub credentials

### Database Not Tracking
- Log out and log back in to get fresh `db_user_id`
- Verify backend has Supabase credentials configured
