import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  Linking,
  Animated,
} from 'react-native';
import { router } from 'expo-router';
import githubService, { GitHubRepo } from '../../services/githubService';
import { Accent, LightTheme, Typography, Spacing, Radius, Shadows } from '../../constants/theme';

export default function ExploreScreen() {
  const [repos, setRepos] = useState<GitHubRepo[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    checkAuthAndLoadRepos();
  }, []);

  useEffect(() => {
    if (!loading) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 500,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [loading]);

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

  const renderRepoItem = ({ item, index }: { item: GitHubRepo; index: number }) => (
    <Animated.View
      style={{
        opacity: fadeAnim,
        transform: [{ translateY: slideAnim }],
      }}
    >
      <TouchableOpacity
        style={styles.repoCard}
        onPress={() => handleRepoPress(item)}
        activeOpacity={0.8}>
        <View style={styles.repoHeader}>
          <View style={styles.repoIconContainer}>
            <Text style={styles.repoIcon}>{item.private ? '🔒' : '📂'}</Text>
          </View>
          <View style={styles.repoTitleContainer}>
            <Text style={styles.repoName} numberOfLines={1}>
              {item.name}
            </Text>
            <Text style={styles.repoOwner} numberOfLines={1}>
              {item.owner?.login || item.full_name.split('/')[0]}
            </Text>
          </View>
          {item.private && (
            <View style={styles.privateBadge}>
              <Text style={styles.privateBadgeText}>Private</Text>
            </View>
          )}
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
              <Text style={styles.metaIcon}>⭐</Text>
              <Text style={styles.metaText}>{item.stargazers_count}</Text>
            </View>
          )}
          {item.forks_count > 0 && (
            <View style={styles.metaItem}>
              <Text style={styles.metaIcon}>🔀</Text>
              <Text style={styles.metaText}>{item.forks_count}</Text>
            </View>
          )}
        </View>

        <Text style={styles.updatedText}>
          Updated {formatDate(item.updated_at)}
        </Text>
      </TouchableOpacity>
    </Animated.View>
  );

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={Accent.primary} />
        <Text style={styles.loadingText}>Loading repositories...</Text>
      </View>
    );
  }

  if (!isAuthenticated) {
    return (
      <View style={styles.centerContainer}>
        <View style={styles.emptyIconContainer}>
          <Text style={styles.emptyIcon}>⬢</Text>
        </View>
        <Text style={styles.emptyTitle}>Sign in to View Repositories</Text>
        <Text style={styles.emptyText}>
          Connect your GitHub account to view and manage your repositories
        </Text>
        <TouchableOpacity style={styles.loginButton} onPress={handleLoginPress}>
          <Text style={styles.loginButtonText}>Sign in with GitHub</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centerContainer}>
        <View style={[styles.emptyIconContainer, styles.errorIconContainer]}>
          <Text style={styles.emptyIcon}>!</Text>
        </View>
        <Text style={styles.errorTitle}>Something went wrong</Text>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={loadRepositories}>
          <Text style={styles.retryButtonText}>Try Again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Repositories</Text>
        <Text style={styles.subtitle}>{repos.length} repos</Text>
      </View>

      <FlatList
        data={repos}
        renderItem={renderRepoItem}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={handleRefresh}
            tintColor={Accent.primary}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>📭</Text>
            <Text style={styles.emptyText}>No repositories found</Text>
          </View>
        }
      />
    </View>
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
  return colors[language] || LightTheme.textTertiary;
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
    backgroundColor: LightTheme.background,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
    backgroundColor: LightTheme.background,
  },
  header: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xxl + Spacing.lg,
    paddingBottom: Spacing.lg,
    backgroundColor: LightTheme.background,
  },
  title: {
    ...Typography.displaySmall,
    color: LightTheme.text,
    letterSpacing: -0.5,
  },
  subtitle: {
    ...Typography.bodyMedium,
    color: LightTheme.textTertiary,
    marginTop: Spacing.xs,
  },
  listContainer: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xl,
  },
  repoCard: {
    backgroundColor: LightTheme.surface,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    ...Shadows.light.sm,
  },
  repoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  repoIconContainer: {
    width: 40,
    height: 40,
    borderRadius: Radius.md,
    backgroundColor: LightTheme.backgroundSecondary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  repoIcon: {
    fontSize: 18,
  },
  repoTitleContainer: {
    flex: 1,
  },
  repoName: {
    ...Typography.labelLarge,
    color: LightTheme.text,
  },
  repoOwner: {
    ...Typography.bodySmall,
    color: LightTheme.textTertiary,
  },
  privateBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.sm,
  },
  privateBadgeText: {
    ...Typography.labelSmall,
    color: '#92400E',
    fontWeight: '600',
  },
  repoDescription: {
    ...Typography.bodyMedium,
    color: LightTheme.textSecondary,
    marginBottom: Spacing.md,
    lineHeight: 20,
  },
  repoMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: Spacing.md,
    marginBottom: Spacing.sm,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaIcon: {
    fontSize: 12,
    marginRight: 4,
  },
  languageDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 6,
  },
  metaText: {
    ...Typography.bodySmall,
    color: LightTheme.textSecondary,
  },
  updatedText: {
    ...Typography.labelSmall,
    color: LightTheme.textTertiary,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.xxxl,
  },
  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: LightTheme.backgroundTertiary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  errorIconContainer: {
    backgroundColor: Accent.error + '15',
  },
  emptyIcon: {
    fontSize: 36,
  },
  emptyTitle: {
    ...Typography.h1,
    color: LightTheme.text,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  emptyText: {
    ...Typography.bodyLarge,
    color: LightTheme.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing.lg,
    paddingHorizontal: Spacing.xl,
    lineHeight: 24,
  },
  loginButton: {
    backgroundColor: Accent.primary,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: Radius.md,
    ...Shadows.light.md,
  },
  loginButtonText: {
    ...Typography.labelLarge,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  loadingText: {
    ...Typography.bodyMedium,
    color: LightTheme.textSecondary,
    marginTop: Spacing.md,
  },
  errorTitle: {
    ...Typography.h1,
    color: Accent.error,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  errorText: {
    ...Typography.bodyMedium,
    color: LightTheme.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing.lg,
    paddingHorizontal: Spacing.xl,
  },
  retryButton: {
    backgroundColor: Accent.primary,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: Radius.md,
  },
  retryButtonText: {
    ...Typography.labelLarge,
    color: '#FFFFFF',
    fontWeight: '600',
  },
});
