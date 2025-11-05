# GitHub OAuth Implementation Guide

## Overview
This app now supports GitHub OAuth authentication with repository access. Users can sign in with their GitHub account and view their repositories.

## Implementation Flow

### 1. **User Clicks "Sign in with GitHub"** (`app/login.tsx`)
- Opens GitHub authorization page in browser
- Requests scopes: `read:user`, `user:email`, `repo`
- Redirects to: `exp://your-app/(auth)/oauth-redirect`

### 2. **GitHub Redirects with Code** (`app/(auth)/oauth-redirect.tsx`)
- Receives temporary authorization code from GitHub
- Sends code to backend at `/auth/github/exchange`
- Backend exchanges code for access token using client secret
- Stores token and user info securely using `expo-secure-store`
- Navigates user to main app

### 3. **GitHub Service** (`services/githubService.ts`)
Provides methods to interact with GitHub API:

#### Available Methods:
```typescript
// Authentication
await githubService.isAuthenticated()
await githubService.getAccessToken()
await githubService.getUser()
await githubService.clearCredentials()

// Repositories
await githubService.getRepositories()
await githubService.getRepository(owner, repo)
await githubService.getRepositoryContents(owner, repo, path)
await githubService.getStarredRepos()
await githubService.getOrgRepositories(org)

// User
await githubService.getCurrentUser()
```

### 4. **Explore Tab** (`app/(tabs)/explore.tsx`)
- Displays user's repositories
- Shows repo details: name, description, language, stars, forks
- Pull to refresh functionality
- Opens repo in browser when tapped
- Prompts login if not authenticated

## Security

### Access Token Storage
- Tokens stored securely using `expo-secure-store`
- Never exposed in logs or console
- Automatically included in API requests

### Client Secret
- Stored only in backend (`.env` file)
- Never sent to mobile app
- Used only for code → token exchange

## GitHub API Usage

### Making Custom API Calls

```typescript
import githubService from '../services/githubService';

// Example: Get a specific file from a repo
const getFileContent = async (owner: string, repo: string, path: string) => {
  try {
    const content = await githubService.getRepositoryContents(owner, repo, path);
    return content;
  } catch (error) {
    console.error('Error fetching file:', error);
  }
};

// Example: Get user's starred repos
const getStarredRepos = async () => {
  try {
    const starred = await githubService.getStarredRepos();
    console.log(`You have ${starred.length} starred repos`);
    return starred;
  } catch (error) {
    console.error('Error fetching starred repos:', error);
  }
};
```

### Direct GitHub API Calls

```typescript
import * as SecureStore from 'expo-secure-store';

const makeCustomGitHubRequest = async (endpoint: string) => {
  const token = await SecureStore.getItemAsync('github_access_token');
  
  const response = await fetch(`https://api.github.com${endpoint}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/vnd.github.v3+json',
    },
  });
  
  return response.json();
};

// Example: Get issues for a repo
const issues = await makeCustomGitHubRequest('/repos/owner/repo/issues');

// Example: Get user's organizations
const orgs = await makeCustomGitHubRequest('/user/orgs');
```

## Common GitHub API Endpoints

| Endpoint | Description |
|----------|-------------|
| `/user` | Get authenticated user |
| `/user/repos` | List user's repositories |
| `/repos/{owner}/{repo}` | Get specific repository |
| `/repos/{owner}/{repo}/contents/{path}` | Get file/directory contents |
| `/repos/{owner}/{repo}/commits` | Get commits |
| `/repos/{owner}/{repo}/issues` | Get issues |
| `/repos/{owner}/{repo}/pulls` | Get pull requests |
| `/user/starred` | Get starred repositories |
| `/user/orgs` | Get user's organizations |
| `/orgs/{org}/repos` | Get org repositories |
| `/search/repositories?q=query` | Search repositories |

## Scopes Explained

Current scopes in `app/login.tsx`:

- **`read:user`**: Read user profile information
- **`user:email`**: Access user's email addresses
- **`repo`**: Full access to repositories (read/write public and private)

### Adding More Scopes

To request additional permissions, update `GITHUB_SCOPES` in `app/login.tsx`:

```typescript
const GITHUB_SCOPES = [
  'read:user',
  'user:email',
  'repo',
  'read:org',        // Read-only access to organizations
  'gist',            // Access to gists
  'notifications',   // Access to notifications
];
```

[Full list of GitHub OAuth scopes](https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/scopes-for-oauth-apps)

## Logout Implementation

To implement logout, clear the stored credentials:

```typescript
import githubService from '../services/githubService';
import { router } from 'expo-router';

const handleLogout = async () => {
  await githubService.clearCredentials();
  router.replace('/login');
};
```

## Error Handling

The service includes built-in error handling:

```typescript
try {
  const repos = await githubService.getRepositories();
  // Handle success
} catch (error) {
  if (error.message.includes('Not authenticated')) {
    // Redirect to login
    router.push('/login');
  } else {
    // Show error message
    Alert.alert('Error', error.message);
  }
}
```

## Rate Limits

GitHub API has rate limits:
- **Authenticated requests**: 5,000 requests per hour
- **Unauthenticated requests**: 60 requests per hour

Check rate limit status:
```typescript
const response = await fetch('https://api.github.com/rate_limit', {
  headers: {
    'Authorization': `Bearer ${token}`,
  },
});
const rateLimitData = await response.json();
console.log(rateLimitData);
```

## Testing

1. **Start the app**: `npm start`
2. **Navigate to login**
3. **Click "Sign in with GitHub"**
4. **Authorize the app on GitHub**
5. **You should be redirected back to the app**
6. **Navigate to "Explore" tab to see your repositories**

## Troubleshooting

### Redirect URI Mismatch
- Ensure GitHub OAuth App settings include: `exp://localhost:8081/(auth)/oauth-redirect`
- Check console logs for actual redirect URI being used

### Token Not Persisting
- Check if expo-secure-store is properly installed
- Verify storage permissions on device

### API Errors
- Check if token is still valid
- Verify GitHub API endpoint syntax
- Check rate limit status

## Next Steps

Possible enhancements:
1. Add search functionality for repositories
2. Display repository file trees
3. Show commits and contributors
4. Implement code viewing
5. Add repository stats and insights
6. Support multiple GitHub accounts
7. Cache repository data locally
