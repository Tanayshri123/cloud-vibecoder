import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';

export interface GitHubRepo {
  id: string;
  name: string;
  full_name: string;
  owner: {
    login: string;
  };
  html_url: string;
  description: string | null;
  private: boolean;
  fork: boolean;
  created_at: string;
  updated_at: string;
  pushed_at: string;
  homepage: string | null;
  size: number;
  stargazers_count: number;
  watchers_count: number;
  language: string | null;
  forks_count: number;
  open_issues_count: number;
  master_branch: string;
  default_branch: string;
  score: number;
}

export interface GitHubUser {
  login: string;
  id: number;
  node_id: string;
  avatar_url: string;
  gravatar_id: string;
  url: string;
  html_url: string;
  followers_url: string;
  following_url: string;
  gists_url: string;
  starred_url: string;
  subscriptions_url: string;
  organizations_url: string;
  repos_url: string;
  events_url: string;
  received_events_url: string;
  type: string;
  site_admin: boolean;
  name: string | null;
  company: string | null;
  blog: string | null;
  location: string | null;
  email: string | null;
  hireable: boolean | null;
  bio: string | null;
  twitter_username: string | null;
  public_repos: number;
  public_gists: number;
  followers: number;
  following: number;
  created_at: string;
  updated_at: string;
}

const BASE_URL = 'https://api.github.com';
const ACCESS_TOKEN_KEY = 'github_access_token';

class GitHubService {
  private accessToken: string | null = null;

  constructor() {
    // Don't load token here - do it lazily when needed
  }

  private async loadStoredToken(): Promise<void> {
    try {
      // Guard against server-side rendering
      if (typeof window === 'undefined') {
        return;
      }
      
      const token = await AsyncStorage.getItem(ACCESS_TOKEN_KEY);
      this.accessToken = token;
    } catch (error) {
      console.error('Failed to load stored access token:', error);
    }
  }

  async getAccessToken(): Promise<string | null> {
    if (!this.accessToken) {
      await this.loadStoredToken();
    }
    return this.accessToken;
  }

  async setAccessToken(token: string): Promise<void> {
    try {
      await AsyncStorage.setItem(ACCESS_TOKEN_KEY, token);
      this.accessToken = token;
    } catch (error) {
      console.error('Failed to store access token:', error);
      throw error;
    }
  }

  async clearAccessToken(): Promise<void> {
    try {
      await AsyncStorage.removeItem(ACCESS_TOKEN_KEY);
      this.accessToken = null;
    } catch (error) {
      console.error('Failed to clear access token:', error);
      throw error;
    }
  }

  private async makeRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${BASE_URL}${endpoint}`;
    const headers: Record<string, string> = {
      'Accept': 'application/vnd.github.v3+json',
      ...(options.headers as Record<string, string> || {}),
    };

    if (this.accessToken) {
      headers['Authorization'] = `token ${this.accessToken}`;
    }

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`GitHub API error: ${response.status} - ${errorData.message || response.statusText}`);
    }

    return response.json();
  }

  async getUserRepos(): Promise<GitHubRepo[]> {
    try {
      const repos = await this.makeRequest<GitHubRepo[]>('/user/repos?per_page=100&sort=updated');
      return repos;
    } catch (error) {
      console.error('Failed to fetch user repositories:', error);
      throw error;
    }
  }

  async searchRepos(query: string): Promise<GitHubRepo[]> {
    try {
      const response = await this.makeRequest<{ items: GitHubRepo[] }>(
        `/search/repositories?q=${encodeURIComponent(query)}&per_page=50&sort=stars`
      );
      return response.items;
    } catch (error) {
      console.error('Failed to search repositories:', error);
      throw error;
    }
  }

  async getRepo(owner: string, repo: string): Promise<GitHubRepo> {
    try {
      const repoData = await this.makeRequest<GitHubRepo>(`/repos/${owner}/${repo}`);
      return repoData;
    } catch (error) {
      console.error('Failed to fetch repository:', error);
      throw error;
    }
  }

  async getRepoContents(owner: string, repo: string, path: string = ''): Promise<any> {
    try {
      const contents = await this.makeRequest(
        `/repos/${owner}/${repo}/contents/${encodeURIComponent(path)}`
      );
      return contents;
    } catch (error) {
      console.error('Failed to fetch repository contents:', error);
      throw error;
    }
  }

  async getUserProfile(): Promise<GitHubUser> {
    try {
      const user = await this.makeRequest<GitHubUser>('/user');
      return user;
    } catch (error) {
      console.error('Failed to fetch user profile:', error);
      throw error;
    }
  }

  async isAuthed(): Promise<boolean> {
    const token = await this.getAccessToken();
    if (!token) {
      return false;
    }

    try {
      // Test the token by making a request to get user info
      await this.getUserProfile();
      return true;
    } catch (error) {
      // Token is invalid, clear it
      await this.clearAccessToken();
      return false;
    }
  }

  parseRepoUrl(url: string): { owner: string; repo: string } | null {
    try {
      const githubUrlRegex = /^https?:\/\/(?:www\.)?github\.com\/([^\/]+)\/([^\/\?#]+)(?:\/.*)?$/;
      const match = url.match(githubUrlRegex);
      
      if (!match) {
        return null;
      }

      return {
        owner: match[1],
        repo: match[2].replace(/\.git$/, '') // Remove .git if present
      };
    } catch (error) {
      console.error('Failed to parse repository URL:', error);
      return null;
    }
  }

  async getRepoFromUrl(url: string): Promise<GitHubRepo | null> {
    try {
      const parsed = this.parseRepoUrl(url);
      if (!parsed) {
        return null;
      }

      return await this.getRepo(parsed.owner, parsed.repo);
    } catch (error) {
      console.error('Failed to get repository from URL:', error);
      return null;
    }
  }
}

export const githubService = new GitHubService();
