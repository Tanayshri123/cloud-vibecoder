import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  Animated,
} from 'react-native';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Accent, LightTheme, DarkTheme, Typography, Spacing, Radius, Shadows } from '../../constants/theme';

interface MenuItem {
  icon: string;
  label: string;
  sublabel?: string;
  onPress: () => void;
  danger?: boolean;
}

export default function ProfileScreen() {
  const [userName, setUserName] = useState('User');
  const [userEmail, setUserEmail] = useState('');

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    loadUserInfo();
    
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
  }, []);

  const loadUserInfo = async () => {
    try {
      const userJson = await AsyncStorage.getItem('github_user');
      if (userJson) {
        const user = JSON.parse(userJson);
        setUserName(user.name || user.login || 'GitHub User');
        setUserEmail(user.email || `@${user.login}`);
      }
    } catch (err) {
      console.log('Could not load user info');
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            await AsyncStorage.removeItem('github_access_token');
            await AsyncStorage.removeItem('github_user');
            router.push('/welcome');
          },
        },
      ]
    );
  };

  const handleEditProfile = () => {
    Alert.alert('Edit Profile', 'Profile editing feature coming soon!');
  };

  const handleSettings = () => {
    Alert.alert('Settings', 'Settings feature coming soon!');
  };

  const handleHelp = () => {
    Alert.alert('Help & Support', 'Visit our documentation at docs.cloudvibecoder.com');
  };

  const menuItems: MenuItem[] = [
    {
      icon: '✏️',
      label: 'Edit Profile',
      sublabel: 'Update your information',
      onPress: handleEditProfile,
    },
    {
      icon: '⚙️',
      label: 'Settings',
      sublabel: 'App preferences',
      onPress: handleSettings,
    },
    {
      icon: '📊',
      label: 'Usage Statistics',
      sublabel: 'View your activity',
      onPress: () => Alert.alert('Usage', 'Coming soon!'),
    },
    {
      icon: '❓',
      label: 'Help & Support',
      sublabel: 'Get assistance',
      onPress: handleHelp,
    },
  ];

  return (
    <ScrollView 
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      <Animated.View
        style={{
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        }}
      >
        <View style={styles.header}>
          <Text style={styles.title}>Profile</Text>
        </View>

        {/* Profile Card */}
        <View style={styles.profileCard}>
          <View style={styles.avatarContainer}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {userName.charAt(0).toUpperCase()}
              </Text>
            </View>
            <View style={styles.avatarBadge}>
              <Text style={styles.avatarBadgeIcon}>⬢</Text>
            </View>
          </View>
          <Text style={styles.userName}>{userName}</Text>
          <Text style={styles.userEmail}>{userEmail}</Text>
          
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>12</Text>
              <Text style={styles.statLabel}>Projects</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>48</Text>
              <Text style={styles.statLabel}>PRs Created</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>156</Text>
              <Text style={styles.statLabel}>AI Tasks</Text>
            </View>
          </View>
        </View>

        {/* Menu */}
        <View style={styles.menuCard}>
          {menuItems.map((item, index) => (
            <TouchableOpacity
              key={index}
              style={[
                styles.menuItem,
                index === menuItems.length - 1 && styles.menuItemLast,
              ]}
              onPress={item.onPress}
              activeOpacity={0.7}
            >
              <View style={styles.menuIconContainer}>
                <Text style={styles.menuIcon}>{item.icon}</Text>
              </View>
              <View style={styles.menuContent}>
                <Text style={styles.menuLabel}>{item.label}</Text>
                {item.sublabel && (
                  <Text style={styles.menuSublabel}>{item.sublabel}</Text>
                )}
              </View>
              <Text style={styles.menuChevron}>›</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Logout */}
        <TouchableOpacity 
          style={styles.logoutButton} 
          onPress={handleLogout}
          activeOpacity={0.9}
        >
          <Text style={styles.logoutButtonText}>Sign Out</Text>
        </TouchableOpacity>

        {/* App Version */}
        <Text style={styles.versionText}>Cloud Vibecoder v1.0.0</Text>
      </Animated.View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: LightTheme.background,
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xxl + Spacing.lg,
    paddingBottom: Spacing.xxl,
  },
  header: {
    marginBottom: Spacing.lg,
  },
  title: {
    ...Typography.displaySmall,
    color: LightTheme.text,
    letterSpacing: -0.5,
  },
  profileCard: {
    backgroundColor: LightTheme.surface,
    borderRadius: Radius.xl,
    padding: Spacing.xl,
    alignItems: 'center',
    marginBottom: Spacing.lg,
    ...Shadows.light.md,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: Spacing.md,
  },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: Accent.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 36,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  avatarBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: DarkTheme.background,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: LightTheme.surface,
  },
  avatarBadgeIcon: {
    fontSize: 14,
    color: '#FFFFFF',
  },
  userName: {
    ...Typography.h1,
    color: LightTheme.text,
    marginBottom: Spacing.xs,
  },
  userEmail: {
    ...Typography.bodyMedium,
    color: LightTheme.textSecondary,
    marginBottom: Spacing.lg,
  },
  statsRow: {
    flexDirection: 'row',
    width: '100%',
    backgroundColor: LightTheme.backgroundSecondary,
    borderRadius: Radius.md,
    padding: Spacing.md,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    ...Typography.h2,
    color: LightTheme.text,
    fontWeight: '700',
  },
  statLabel: {
    ...Typography.labelSmall,
    color: LightTheme.textTertiary,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    backgroundColor: LightTheme.border,
    marginHorizontal: Spacing.sm,
  },
  menuCard: {
    backgroundColor: LightTheme.surface,
    borderRadius: Radius.lg,
    marginBottom: Spacing.lg,
    ...Shadows.light.sm,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: LightTheme.borderLight,
  },
  menuItemLast: {
    borderBottomWidth: 0,
  },
  menuIconContainer: {
    width: 40,
    height: 40,
    borderRadius: Radius.md,
    backgroundColor: LightTheme.backgroundSecondary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  menuIcon: {
    fontSize: 18,
  },
  menuContent: {
    flex: 1,
  },
  menuLabel: {
    ...Typography.labelLarge,
    color: LightTheme.text,
  },
  menuSublabel: {
    ...Typography.bodySmall,
    color: LightTheme.textTertiary,
    marginTop: 2,
  },
  menuChevron: {
    fontSize: 22,
    color: LightTheme.textTertiary,
    fontWeight: '300',
  },
  logoutButton: {
    backgroundColor: Accent.error,
    borderRadius: Radius.md,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    marginBottom: Spacing.lg,
    ...Shadows.light.sm,
  },
  logoutButtonText: {
    ...Typography.labelLarge,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  versionText: {
    ...Typography.labelSmall,
    color: LightTheme.textTertiary,
    textAlign: 'center',
  },
});
