import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  StyleSheet, 
  Switch,
  ActivityIndicator,
  ScrollView
} from 'react-native';
import { Accent, LightTheme, Typography, Spacing, Radius } from '../constants/theme';
import githubService from '../services/githubService';

export interface NewRepoConfig {
  name: string;
  description: string;
  private: boolean;
  gitignoreTemplate: string | null;
  licenseTemplate: string | null;
}

interface NewRepoFormProps {
  config: NewRepoConfig;
  onConfigChange: (config: NewRepoConfig) => void;
  disabled?: boolean;
}

interface LicenseTemplate {
  key: string;
  name: string;
  spdx_id?: string;
}

// Common gitignore templates (subset for quick selection)
const COMMON_GITIGNORE = [
  'Node',
  'Python', 
  'Java',
  'Go',
  'Rust',
  'Swift',
  'Kotlin',
  'Ruby',
  'C++',
  'C',
];

// Common licenses
const COMMON_LICENSES = [
  { key: 'mit', name: 'MIT License' },
  { key: 'apache-2.0', name: 'Apache 2.0' },
  { key: 'gpl-3.0', name: 'GPL 3.0' },
  { key: 'bsd-3-clause', name: 'BSD 3-Clause' },
  { key: 'unlicense', name: 'The Unlicense' },
];

export default function NewRepoForm({ 
  config, 
  onConfigChange,
  disabled = false 
}: NewRepoFormProps) {
  const [nameError, setNameError] = useState<string | null>(null);
  const [showGitignoreOptions, setShowGitignoreOptions] = useState(false);
  const [showLicenseOptions, setShowLicenseOptions] = useState(false);

  const updateConfig = (updates: Partial<NewRepoConfig>) => {
    onConfigChange({ ...config, ...updates });
  };

  const validateName = (name: string) => {
    if (!name) {
      setNameError(null);
      return;
    }
    
    // Basic validation matching backend rules
    const pattern = /^[a-zA-Z0-9][a-zA-Z0-9._-]*$/;
    if (!pattern.test(name)) {
      setNameError('Use letters, numbers, hyphens, underscores, or dots. Cannot start with . or -');
    } else if (name.length > 100) {
      setNameError('Name cannot exceed 100 characters');
    } else {
      setNameError(null);
    }
  };

  const handleNameChange = (name: string) => {
    updateConfig({ name });
    validateName(name);
  };

  return (
    <View style={[styles.container, disabled && styles.containerDisabled]}>
      {/* Repository Name */}
      <View style={styles.field}>
        <Text style={styles.label}>Repository Name *</Text>
        <TextInput
          style={[styles.input, nameError && styles.inputError]}
          placeholder="my-awesome-project"
          placeholderTextColor={LightTheme.textTertiary}
          value={config.name}
          onChangeText={handleNameChange}
          autoCapitalize="none"
          autoCorrect={false}
          editable={!disabled}
        />
        {nameError && (
          <Text style={styles.errorText}>{nameError}</Text>
        )}
      </View>

      {/* Description */}
      <View style={styles.field}>
        <Text style={styles.label}>Description</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="A brief description of your project"
          placeholderTextColor={LightTheme.textTertiary}
          value={config.description}
          onChangeText={(description) => updateConfig({ description })}
          multiline
          numberOfLines={2}
          editable={!disabled}
        />
      </View>

      {/* Visibility Toggle */}
      <View style={styles.toggleField}>
        <View style={styles.toggleInfo}>
          <Text style={styles.toggleLabel}>Private Repository</Text>
          <Text style={styles.toggleHint}>Only you can see this repository</Text>
        </View>
        <Switch
          value={config.private}
          onValueChange={(value) => updateConfig({ private: value })}
          trackColor={{ false: LightTheme.border, true: Accent.primaryLight }}
          thumbColor={config.private ? Accent.primary : '#f4f3f4'}
          disabled={disabled}
        />
      </View>

      {/* Gitignore Template */}
      <View style={styles.field}>
        <Text style={styles.label}>Gitignore Template</Text>
        <TouchableOpacity
          style={styles.selector}
          onPress={() => !disabled && setShowGitignoreOptions(!showGitignoreOptions)}
          activeOpacity={disabled ? 1 : 0.7}
        >
          <Text style={[
            styles.selectorText,
            !config.gitignoreTemplate && styles.selectorPlaceholder
          ]}>
            {config.gitignoreTemplate || 'None (select optional)'}
          </Text>
          <Text style={styles.selectorChevron}>
            {showGitignoreOptions ? '▲' : '▼'}
          </Text>
        </TouchableOpacity>
        
        {showGitignoreOptions && (
          <View style={styles.optionsContainer}>
            <TouchableOpacity
              style={[
                styles.optionItem,
                !config.gitignoreTemplate && styles.optionItemSelected
              ]}
              onPress={() => {
                updateConfig({ gitignoreTemplate: null });
                setShowGitignoreOptions(false);
              }}
            >
              <Text style={styles.optionText}>None</Text>
            </TouchableOpacity>
            {COMMON_GITIGNORE.map((template) => (
              <TouchableOpacity
                key={template}
                style={[
                  styles.optionItem,
                  config.gitignoreTemplate === template && styles.optionItemSelected
                ]}
                onPress={() => {
                  updateConfig({ gitignoreTemplate: template });
                  setShowGitignoreOptions(false);
                }}
              >
                <Text style={[
                  styles.optionText,
                  config.gitignoreTemplate === template && styles.optionTextSelected
                ]}>
                  {template}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>

      {/* License Template */}
      <View style={styles.field}>
        <Text style={styles.label}>License</Text>
        <TouchableOpacity
          style={styles.selector}
          onPress={() => !disabled && setShowLicenseOptions(!showLicenseOptions)}
          activeOpacity={disabled ? 1 : 0.7}
        >
          <Text style={[
            styles.selectorText,
            !config.licenseTemplate && styles.selectorPlaceholder
          ]}>
            {config.licenseTemplate 
              ? COMMON_LICENSES.find(l => l.key === config.licenseTemplate)?.name || config.licenseTemplate
              : 'None (select optional)'}
          </Text>
          <Text style={styles.selectorChevron}>
            {showLicenseOptions ? '▲' : '▼'}
          </Text>
        </TouchableOpacity>
        
        {showLicenseOptions && (
          <View style={styles.optionsContainer}>
            <TouchableOpacity
              style={[
                styles.optionItem,
                !config.licenseTemplate && styles.optionItemSelected
              ]}
              onPress={() => {
                updateConfig({ licenseTemplate: null });
                setShowLicenseOptions(false);
              }}
            >
              <Text style={styles.optionText}>None</Text>
            </TouchableOpacity>
            {COMMON_LICENSES.map((license) => (
              <TouchableOpacity
                key={license.key}
                style={[
                  styles.optionItem,
                  config.licenseTemplate === license.key && styles.optionItemSelected
                ]}
                onPress={() => {
                  updateConfig({ licenseTemplate: license.key });
                  setShowLicenseOptions(false);
                }}
              >
                <Text style={[
                  styles.optionText,
                  config.licenseTemplate === license.key && styles.optionTextSelected
                ]}>
                  {license.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: Spacing.md,
  },
  containerDisabled: {
    opacity: 0.6,
  },
  field: {
    marginBottom: Spacing.md,
  },
  label: {
    ...Typography.labelMedium,
    color: LightTheme.textSecondary,
    marginBottom: Spacing.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: LightTheme.backgroundSecondary,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    ...Typography.bodyLarge,
    color: LightTheme.text,
    borderWidth: 1,
    borderColor: LightTheme.borderLight,
  },
  inputError: {
    borderColor: Accent.error,
  },
  textArea: {
    minHeight: 60,
    textAlignVertical: 'top',
  },
  errorText: {
    ...Typography.bodySmall,
    color: Accent.error,
    marginTop: Spacing.xs,
  },
  toggleField: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    backgroundColor: LightTheme.backgroundSecondary,
    borderRadius: Radius.md,
  },
  toggleInfo: {
    flex: 1,
  },
  toggleLabel: {
    ...Typography.labelMedium,
    color: LightTheme.text,
  },
  toggleHint: {
    ...Typography.bodySmall,
    color: LightTheme.textTertiary,
    marginTop: 2,
  },
  selector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: LightTheme.backgroundSecondary,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderWidth: 1,
    borderColor: LightTheme.borderLight,
  },
  selectorText: {
    ...Typography.bodyLarge,
    color: LightTheme.text,
  },
  selectorPlaceholder: {
    color: LightTheme.textTertiary,
  },
  selectorChevron: {
    ...Typography.bodySmall,
    color: LightTheme.textTertiary,
  },
  optionsContainer: {
    marginTop: Spacing.xs,
    backgroundColor: LightTheme.backgroundSecondary,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: LightTheme.borderLight,
    overflow: 'hidden',
  },
  optionItem: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 2,
    borderBottomWidth: 1,
    borderBottomColor: LightTheme.borderLight,
  },
  optionItemSelected: {
    backgroundColor: Accent.primaryLight + '20',
  },
  optionText: {
    ...Typography.bodyMedium,
    color: LightTheme.text,
  },
  optionTextSelected: {
    color: Accent.primary,
    fontWeight: '600',
  },
});
