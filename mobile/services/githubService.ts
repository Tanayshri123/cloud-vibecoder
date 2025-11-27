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

  /**
   * Create a new branch from the default branch
   */
  async createBranch(owner: string, repo: string, branchName: string): Promise<{ ref: string; sha: string }> {
    // Get the default branch SHA
    const repoInfo = await this.getRepository(owner, repo);
    const defaultBranch = repoInfo.default_branch;
    
    const branchRef = await this.makeRequest<any>(`/repos/${owner}/${repo}/git/refs/heads/${defaultBranch}`);
    const sha = branchRef.object.sha;

    // Create new branch
    const newBranch = await this.makeRequest<any>(`/repos/${owner}/${repo}/git/refs`, {
      method: 'POST',
      body: JSON.stringify({
        ref: `refs/heads/${branchName}`,
        sha: sha,
      }),
    });

    return { ref: newBranch.ref, sha: sha };
  }

  /**
   * Create or update a file in a repository
   */
  async createOrUpdateFile(
    owner: string,
    repo: string,
    path: string,
    content: string,
    message: string,
    branch: string,
    sha?: string
  ): Promise<any> {
    // Convert content to base64 (React Native compatible)
    const base64Content = btoa(unescape(encodeURIComponent(content)));
    
    const body: any = {
      message,
      content: base64Content,
      branch,
    };

    if (sha) {
      body.sha = sha;
    }

    return this.makeRequest(`/repos/${owner}/${repo}/contents/${path}`, {
      method: 'PUT',
      body: JSON.stringify(body),
    });
  }

  /**
   * Create a pull request
   */
  async createPullRequest(
    owner: string,
    repo: string,
    title: string,
    body: string,
    head: string,
    base: string = 'main'
  ): Promise<{ html_url: string; number: number }> {
    return this.makeRequest<any>(`/repos/${owner}/${repo}/pulls`, {
      method: 'POST',
      body: JSON.stringify({
        title,
        body,
        head,
        base,
      }),
    });
  }

  // ============================================
  // Repository Creation Methods (Phase 4)
  // ============================================

  /**
   * Create a new repository for the authenticated user
   */
  async createRepository(
    name: string,
    options: {
      description?: string;
      private?: boolean;
      autoInit?: boolean;
      gitignoreTemplate?: string;
      licenseTemplate?: string;
    } = {}
  ): Promise<GitHubRepo> {
    const body: Record<string, any> = {
      name,
      private: options.private ?? false,
      auto_init: options.autoInit ?? true,
    };

    if (options.description) {
      body.description = options.description;
    }
    if (options.gitignoreTemplate) {
      body.gitignore_template = options.gitignoreTemplate;
    }
    if (options.licenseTemplate) {
      body.license_template = options.licenseTemplate;
    }

    return this.makeRequest<GitHubRepo>('/user/repos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  }

  /**
   * Get available gitignore templates from GitHub
   */
  async getGitignoreTemplates(): Promise<string[]> {
    return this.makeRequest<string[]>('/gitignore/templates');
  }

  /**
   * Get available license templates from GitHub
   */
  async getLicenseTemplates(): Promise<Array<{ key: string; name: string; spdx_id: string }>> {
    return this.makeRequest('/licenses');
  }

  /**
   * Check if a repository name is available for the authenticated user
   * @returns Object with available status and message
   */
  async checkRepoNameAvailable(name: string): Promise<{
    available: boolean;
    message: string;
    validFormat: boolean;
  }> {
    // Validate name format first
    const validationResult = this.validateRepoName(name);
    if (!validationResult.valid) {
      return {
        available: false,
        message: validationResult.message,
        validFormat: false,
      };
    }

    try {
      const user = await this.getCurrentUser();
      // Try to get the repo - if it exists, name is not available
      await this.getRepository(user.login, name);
      return {
        available: false,
        message: `Repository '${name}' already exists`,
        validFormat: true,
      };
    } catch (error) {
      // If we get a 404, the repo doesn't exist - name is available
      if (error instanceof Error && error.message.includes('404')) {
        return {
          available: true,
          message: `Repository name '${name}' is available`,
          validFormat: true,
        };
      }
      // For other errors, assume not available
      return {
        available: false,
        message: `Error checking availability: ${error instanceof Error ? error.message : 'Unknown error'}`,
        validFormat: true,
      };
    }
  }

  /**
   * Validate repository name format according to GitHub rules
   */
  validateRepoName(name: string): { valid: boolean; message: string } {
    if (!name || name.trim().length === 0) {
      return { valid: false, message: 'Repository name cannot be empty' };
    }

    if (name.length > 100) {
      return { valid: false, message: 'Repository name cannot exceed 100 characters' };
    }

    // GitHub repo names can only contain alphanumeric, hyphens, underscores, and dots
    // Cannot start with a dot or hyphen
    const pattern = /^[a-zA-Z0-9][a-zA-Z0-9._-]*$/;
    if (!pattern.test(name)) {
      return {
        valid: false,
        message: 'Repository name can only contain letters, numbers, hyphens, underscores, and dots. Cannot start with . or -',
      };
    }

    // Reserved names
    const reserved = ['..', '.git', '.github'];
    if (reserved.includes(name.toLowerCase())) {
      return { valid: false, message: `'${name}' is a reserved name` };
    }

    return { valid: true, message: 'Valid repository name' };
  }

  /**
   * Delete a repository (use with caution!)
   */
  async deleteRepository(owner: string, repo: string): Promise<void> {
    const token = await this.getAccessToken();
    
    if (!token) {
      throw new Error('Not authenticated. Please sign in with GitHub.');
    }

    const response = await fetch(`${this.baseUrl}/repos/${owner}/${repo}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github.v3+json',
      },
    });

    if (!response.ok && response.status !== 204) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.message || `Failed to delete repository: ${response.status}`);
    }
  }
}

export default new GitHubService();
