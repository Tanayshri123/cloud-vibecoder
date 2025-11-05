import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { router } from 'expo-router';
import githubService, { GitHubRepo } from '../../services/githubService';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Fonts } from '@/constants/theme';
import { IconSymbol } from '@/components/ui/icon-symbol';

export default function ExploreScreen() {
  const [repos, setRepos] = useState<GitHubRepo[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    checkAuthAndLoadRepos();
  }, []);

  const checkAuthAndLoadRepos = async () => {
    try {
      const authenticated = await githubService.isAuthenticated();
      setIsAuthenticated(authenticated);
      
      if (authenticated) {
        await loadRepositories();
      } else {
        setLoading(false);
      }
    } catch (err) {
      console.error('Error checking auth:', err);
      setIsAuthenticated(false);
      setLoading(false);
    }
  };

  const loadRepositories = async () => {
    try {
      setError(null);
      const repositories = await githubService.getRepositories('all', 'updated', 'desc');
      setRepos(repositories);
    } catch (err) {
      console.error('Error loading repositories:', err);
      setError(err instanceof Error ? err.message : 'Failed to load repositories');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadRepositories();
  };

  const handleRepoPress = (repo: GitHubRepo) => {
    Linking.openURL(repo.html_url);
  };

  const handleLoginPress = () => {
    router.push('/login');
  };

  const renderRepoItem = ({ item }: { item: GitHubRepo }) => (
    <TouchableOpacity
      style={styles.repoCard}
      onPress={() => handleRepoPress(item)}
      activeOpacity={0.7}>
      <View style={styles.repoHeader}>
        <View style={styles.repoTitleContainer}>
          <IconSymbol
            name="folder"
            size={20}
            color={item.private ? '#FFA500' : '#6B7280'}
            style={styles.repoIcon}
          />
          <Text style={styles.repoName} numberOfLines={1}>
            {item.name}
          </Text>
          {item.private && (
            <View style={styles.privateBadge}>
              <Text style={styles.privateBadgeText}>Private</Text>
            </View>
          )}
        </View>
      </View>

      {item.description && (
        <Text style={styles.repoDescription} numberOfLines={2}>
          {item.description}
        </Text>
      )}

      <View style={styles.repoMeta}>
        {item.language && (
          <View style={styles.metaItem}>
            <View style={[styles.languageDot, { backgroundColor: getLanguageColor(item.language) }]} />
            <Text style={styles.metaText}>{item.language}</Text>
          </View>
        )}
        {item.stargazers_count > 0 && (
          <View style={styles.metaItem}>
            <IconSymbol name="star" size={14} color="#6B7280" />
            <Text style={styles.metaText}>{item.stargazers_count}</Text>
          </View>
        )}
        {item.forks_count > 0 && (
          <View style={styles.metaItem}>
            <IconSymbol name="arrow.triangle.branch" size={14} color="#6B7280" />
            <Text style={styles.metaText}>{item.forks_count}</Text>
          </View>
        )}
        <Text style={styles.metaText}>
          Updated {formatDate(item.updated_at)}
        </Text>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#0366d6" />
        <Text style={styles.loadingText}>Loading repositories...</Text>
      </View>
    );
  }

  if (!isAuthenticated) {
    return (
      <View style={styles.centerContainer}>
        <IconSymbol name="person.circle" size={80} color="#6B7280" style={styles.emptyIcon} />
        <ThemedText type="title" style={styles.emptyTitle}>
          Sign in to View Repositories
        </ThemedText>
        <Text style={styles.emptyText}>
          Connect your GitHub account to view and manage your repositories
        </Text>
        <TouchableOpacity style={styles.loginButton} onPress={handleLoginPress}>
          <IconSymbol name="person.badge.key" size={20} color="#fff" />
          <Text style={styles.loginButtonText}>Sign in with GitHub</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centerContainer}>
        <IconSymbol name="exclamationmark.triangle" size={60} color="#EF4444" style={styles.emptyIcon} />
        <ThemedText type="title" style={styles.errorTitle}>
          Error
        </ThemedText>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={loadRepositories}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <View style={styles.header}>
        <ThemedText type="title" style={{ fontFamily: Fonts.rounded }}>
          My Repositories
        </ThemedText>
        <Text style={styles.repoCount}>{repos.length} repositories</Text>
      </View>

      <FlatList
        data={repos}
        renderItem={renderRepoItem}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <IconSymbol name="folder" size={60} color="#6B7280" style={styles.emptyIcon} />
            <Text style={styles.emptyText}>No repositories found</Text>
          </View>
        }
      />
    </ThemedView>
  );
}

// Helper function to get language colors
function getLanguageColor(language: string): string {
  const colors: Record<string, string> = {
    JavaScript: '#f1e05a',
    TypeScript: '#3178c6',
    Python: '#3572A5',
    Java: '#b07219',
    Go: '#00ADD8',
    Rust: '#dea584',
    Ruby: '#701516',
    PHP: '#4F5D95',
    Swift: '#ffac45',
    Kotlin: '#A97BFF',
    Dart: '#00B4AB',
    C: '#555555',
    'C++': '#f34b7d',
    'C#': '#178600',
    HTML: '#e34c26',
    CSS: '#563d7c',
    Shell: '#89e051',
  };
  return colors[language] || '#6B7280';
}

// Helper function to format dates
function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffInMs = now.getTime() - date.getTime();
  const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

  if (diffInDays === 0) return 'today';
  if (diffInDays === 1) return 'yesterday';
  if (diffInDays < 7) return `${diffInDays} days ago`;
  if (diffInDays < 30) return `${Math.floor(diffInDays / 7)} weeks ago`;
  if (diffInDays < 365) return `${Math.floor(diffInDays / 30)} months ago`;
  return `${Math.floor(diffInDays / 365)} years ago`;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
  },
  header: {
    padding: 20,
    paddingTop: 60,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  repoCount: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
  },
  listContainer: {
    padding: 16,
  },
  repoCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  repoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  repoTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  repoIcon: {
    marginRight: 8,
  },
  repoName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0366d6',
    flex: 1,
  },
  privateBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    marginLeft: 8,
  },
  privateBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#92400E',
  },
  repoDescription: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 12,
    lineHeight: 20,
  },
  repoMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 12,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  languageDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  metaText: {
    fontSize: 12,
    color: '#6B7280',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyIcon: {
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 24,
    paddingHorizontal: 40,
  },
  loginButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0366d6',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  loginButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6B7280',
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#EF4444',
  },
  errorText: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 24,
    paddingHorizontal: 40,
  },
  retryButton: {
    backgroundColor: '#0366d6',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
