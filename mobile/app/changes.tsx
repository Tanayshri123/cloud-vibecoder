import React from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Linking } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Accent, LightTheme, Typography, Spacing, Radius } from '../constants/theme';

export default function ChangesScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  
  // Parse the data from params
  const result = params.result ? JSON.parse(params.result as string) : null;
  const prUrl = params.prUrl as string | undefined;
  const repoUrl = params.repoUrl as string | undefined;
  const isNewRepo = params.isNewRepo === 'true';

  if (!result) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>No changes data available</Text>
        <TouchableOpacity style={styles.button} onPress={() => router.back()}>
          <Text style={styles.buttonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const handleOpenUrl = (url: string) => {
    if (url) {
      Linking.openURL(url);
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Changes Summary</Text>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Status Badge */}
        <View style={styles.statusBadge}>
          <Text style={styles.statusText}>
            {result.success ? '✅ Success' : '❌ Failed'}
          </Text>
        </View>

        {/* Stats Cards */}
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{result.files_changed || 0}</Text>
            <Text style={styles.statLabel}>Files Changed</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{result.commits_created || 0}</Text>
            <Text style={styles.statLabel}>Commits</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{result.total_edits || 0}</Text>
            <Text style={styles.statLabel}>Edits</Text>
          </View>
        </View>

        {/* Execution Time */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>⏱️ Execution Time</Text>
          <Text style={styles.sectionContent}>
            {result.execution_time_seconds ? `${result.execution_time_seconds.toFixed(1)}s` : 'N/A'}
          </Text>
        </View>

        {/* AI Usage */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🤖 AI Tokens Used</Text>
          <Text style={styles.sectionContent}>{result.tokens_used || 'N/A'}</Text>
        </View>

        {/* Branch Info */}
        {result.branch_name && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🌿 Branch</Text>
            <Text style={styles.sectionContent}>{result.branch_name}</Text>
          </View>
        )}

        {/* Files Changed List */}
        {result.file_changes && result.file_changes.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>📝 Files Changed</Text>
            {result.file_changes.map((file: any, index: number) => (
              <View key={index} style={styles.fileItem}>
                <Text style={styles.fileName}>{file.path || file}</Text>
                {file.changes && (
                  <Text style={styles.fileChanges}>
                    +{file.additions || 0} -{file.deletions || 0}
                  </Text>
                )}
              </View>
            ))}
          </View>
        )}

        {/* Commit Messages */}
        {result.commit_messages && result.commit_messages.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>💬 Commit Messages</Text>
            {result.commit_messages.map((message: string, index: number) => (
              <View key={index} style={styles.commitItem}>
                <Text style={styles.commitBullet}>•</Text>
                <Text style={styles.commitMessage}>{message}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Error Message (if any) */}
        {!result.success && result.error_message && (
          <View style={[styles.section, styles.errorSection]}>
            <Text style={styles.sectionTitle}>⚠️ Error</Text>
            <Text style={styles.errorMessage}>{result.error_message}</Text>
          </View>
        )}

        {/* Action Buttons */}
        <View style={styles.actionsContainer}>
          {prUrl && (
            <TouchableOpacity 
              style={[styles.actionButton, styles.primaryButton]} 
              onPress={() => handleOpenUrl(prUrl)}
            >
              <Text style={styles.actionButtonText}>View Pull Request</Text>
            </TouchableOpacity>
          )}
          {repoUrl && (
            <TouchableOpacity 
              style={[styles.actionButton, styles.secondaryButton]} 
              onPress={() => handleOpenUrl(repoUrl)}
            >
              <Text style={styles.actionButtonTextSecondary}>
                {isNewRepo ? 'View Repository' : 'View Repository'}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: LightTheme.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingTop: 60,
    paddingBottom: Spacing.lg,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: LightTheme.border,
  },
  backButton: {
    marginRight: Spacing.md,
  },
  backButtonText: {
    ...Typography.h3,
    color: Accent.primary,
  },
  headerTitle: {
    ...Typography.h1,
    color: LightTheme.text,
  },
  scrollView: {
    flex: 1,
    padding: Spacing.lg,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: Accent.primary,
    borderRadius: Radius.full,
    marginBottom: Spacing.lg,
  },
  statusText: {
    ...Typography.bodyMedium,
    color: '#fff',
    fontWeight: '600',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.xl,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    padding: Spacing.lg,
    borderRadius: Radius.lg,
    marginHorizontal: Spacing.xs,
    alignItems: 'center',
    ...{ shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
  },
  statValue: {
    ...Typography.statSmall,
    color: Accent.primary,
    marginBottom: Spacing.xs,
  },
  statLabel: {
    ...Typography.bodySmall,
    color: LightTheme.textSecondary,
    textAlign: 'center',
  },
  section: {
    backgroundColor: '#fff',
    padding: Spacing.lg,
    borderRadius: Radius.lg,
    marginBottom: Spacing.md,
    ...{ shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 2 },
  },
  sectionTitle: {
    ...Typography.h3,
    color: LightTheme.text,
    marginBottom: Spacing.sm,
  },
  sectionContent: {
    ...Typography.bodyMedium,
    color: LightTheme.textSecondary,
  },
  fileItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: LightTheme.border,
  },
  fileName: {
    flex: 1,
    ...Typography.bodyMedium,
    color: LightTheme.text,
    fontFamily: 'monospace',
  },
  fileChanges: {
    ...Typography.labelMedium,
    color: Accent.success,
  },
  commitItem: {
    flexDirection: 'row',
    paddingVertical: Spacing.sm,
  },
  commitBullet: {
    ...Typography.h3,
    color: Accent.primary,
    marginRight: Spacing.sm,
    marginTop: -2,
  },
  commitMessage: {
    flex: 1,
    ...Typography.bodyMedium,
    color: LightTheme.textSecondary,
  },
  errorSection: {
    backgroundColor: '#FFF5F5',
    borderLeftWidth: 4,
    borderLeftColor: Accent.error,
  },
  errorMessage: {
    ...Typography.bodyMedium,
    color: Accent.error,
  },
  actionsContainer: {
    marginTop: Spacing.lg,
    gap: Spacing.md,
  },
  actionButton: {
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: Radius.lg,
    alignItems: 'center',
  },
  primaryButton: {
    backgroundColor: Accent.primary,
  },
  secondaryButton: {
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: Accent.primary,
  },
  actionButtonText: {
    ...Typography.labelLarge,
    color: '#fff',
  },
  actionButtonTextSecondary: {
    ...Typography.labelLarge,
    color: Accent.primary,
  },
  errorText: {
    ...Typography.h3,
    color: Accent.error,
    textAlign: 'center',
    marginTop: 100,
  },
  button: {
    backgroundColor: Accent.primary,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    borderRadius: Radius.lg,
    alignSelf: 'center',
    marginTop: Spacing.lg,
  },
  buttonText: {
    ...Typography.labelLarge,
    color: '#fff',
  },
});
