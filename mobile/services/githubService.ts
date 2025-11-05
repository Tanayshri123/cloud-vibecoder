import AsyncStorage from '@react-native-async-storage/async-storage';

export interface GitHubRepo {
  id: number;
  name: string;
  full_name: string;
  description: string | null;
  html_url: string;
  private: boolean;
  fork: boolean;
  created_at: string;
  updated_at: string;
  pushed_at: string;
  stargazers_count: number;
  watchers_count: number;
  language: string | null;
  forks_count: number;
  open_issues_count: number;
  default_branch: string;
  owner: {
    login: string;
    avatar_url: string;
  };
}

export interface GitHubUser {
  id: number;
  login: string;
  name: string | null;
  avatar_url: string | null;
  email: string | null;
}

class GitHubService {
  private baseUrl = 'https://api.github.com';

  /**
   * Get the stored GitHub access token
   */
  async getAccessToken(): Promise<string | null> {
    try {
      return await AsyncStorage.getItem('github_access_token');
    } catch (error) {
      console.error('Error getting access token:', error);
      return null;
    }
  }

  /**
   * Get the stored GitHub user info
   */
  async getUser(): Promise<GitHubUser | null> {
    try {
      const userJson = await AsyncStorage.getItem('github_user');
      return userJson ? JSON.parse(userJson) : null;
    } catch (error) {
      console.error('Error getting user info:', error);
      return null;
    }
  }

  /**
   * Clear stored GitHub credentials (logout)
   */
  async clearCredentials(): Promise<void> {
    try {
      await AsyncStorage.removeItem('github_access_token');
      await AsyncStorage.removeItem('github_user');
    } catch (error) {
      console.error('Error clearing credentials:', error);
    }
  }

  /**
   * Check if user is authenticated
   */
  async isAuthenticated(): Promise<boolean> {
    const token = await this.getAccessToken();
    return token !== null;
  }

  /**
   * Make an authenticated request to GitHub API
   */
  private async makeRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const token = await this.getAccessToken();
    
    if (!token) {
      throw new Error('Not authenticated. Please sign in with GitHub.');
    }

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github.v3+json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || `GitHub API error: ${response.status}`);
    }

    return response.json();
  }

  /**
   * Get all repositories for the authenticated user
   * @param type - Type of repositories: 'all', 'owner', 'public', 'private', 'member'
   * @param sort - Sort by: 'created', 'updated', 'pushed', 'full_name'
   * @param direction - Sort direction: 'asc' or 'desc'
   */
  async getRepositories(
    type: 'all' | 'owner' | 'public' | 'private' | 'member' = 'all',
    sort: 'created' | 'updated' | 'pushed' | 'full_name' = 'updated',
    direction: 'asc' | 'desc' = 'desc'
  ): Promise<GitHubRepo[]> {
    const params = new URLSearchParams({
      type,
      sort,
      direction,
      per_page: '100', // Get up to 100 repos per request
    });

    return this.makeRequest<GitHubRepo[]>(`/user/repos?${params}`);
  }

  /**
   * Get a specific repository
   */
  async getRepository(owner: string, repo: string): Promise<GitHubRepo> {
    return this.makeRequest<GitHubRepo>(`/repos/${owner}/${repo}`);
  }

  /**
   * Get repository contents
   */
  async getRepositoryContents(owner: string, repo: string, path: string = ''): Promise<any> {
    return this.makeRequest(`/repos/${owner}/${repo}/contents/${path}`);
  }

  /**
   * Get current user's profile
   */
  async getCurrentUser(): Promise<GitHubUser> {
    return this.makeRequest<GitHubUser>('/user');
  }

  /**
   * Get user's starred repositories
   */
  async getStarredRepos(): Promise<GitHubRepo[]> {
    return this.makeRequest<GitHubRepo[]>('/user/starred?per_page=100');
  }

  /**
   * Get repositories for a specific organization
   */
  async getOrgRepositories(org: string): Promise<GitHubRepo[]> {
    return this.makeRequest<GitHubRepo[]>(`/orgs/${org}/repos?per_page=100`);
  }
}

export default new GitHubService();
