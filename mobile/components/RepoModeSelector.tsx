import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Accent, LightTheme, Typography, Spacing, Radius } from '../constants/theme';

export type RepoMode = 'existing' | 'new';

interface RepoModeSelectorProps {
  mode: RepoMode;
  onModeChange: (mode: RepoMode) => void;
  disabled?: boolean;
}

export default function RepoModeSelector({ 
  mode, 
  onModeChange, 
  disabled = false 
}: RepoModeSelectorProps) {
  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[
          styles.option, 
          mode === 'existing' && styles.optionActive,
          disabled && styles.optionDisabled
        ]}
        onPress={() => !disabled && onModeChange('existing')}
        activeOpacity={disabled ? 1 : 0.7}
      >
        <Text style={styles.optionIcon}>📂</Text>
        <View style={styles.optionTextContainer}>
          <Text style={[
            styles.optionTitle, 
            mode === 'existing' && styles.optionTitleActive
          ]}>
            Edit Existing
          </Text>
          <Text style={styles.optionSubtitle}>
            Modify an existing repo
          </Text>
        </View>
      </TouchableOpacity>
      
      <TouchableOpacity
        style={[
          styles.option, 
          mode === 'new' && styles.optionActive,
          disabled && styles.optionDisabled
        ]}
        onPress={() => !disabled && onModeChange('new')}
        activeOpacity={disabled ? 1 : 0.7}
      >
        <Text style={styles.optionIcon}>✨</Text>
        <View style={styles.optionTextContainer}>
          <Text style={[
            styles.optionTitle, 
            mode === 'new' && styles.optionTitleActive
          ]}>
            Create New
          </Text>
          <Text style={styles.optionSubtitle}>
            Start a fresh project
          </Text>
        </View>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: LightTheme.backgroundSecondary,
    borderRadius: Radius.md,
    padding: 4,
    marginBottom: Spacing.lg,
    gap: 4,
  },
  option: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm + 4,
    paddingHorizontal: Spacing.sm,
    borderRadius: Radius.sm,
  },
  optionActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  optionDisabled: {
    opacity: 0.5,
  },
  optionIcon: {
    fontSize: 20,
    marginRight: Spacing.sm,
  },
  optionTextContainer: {
    flex: 1,
  },
  optionTitle: {
    ...Typography.labelMedium,
    color: LightTheme.textSecondary,
  },
  optionTitleActive: {
    color: Accent.primary,
    fontWeight: '600',
  },
  optionSubtitle: {
    ...Typography.bodySmall,
    color: LightTheme.textTertiary,
    marginTop: 1,
  },
});
