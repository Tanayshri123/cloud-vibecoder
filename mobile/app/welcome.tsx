import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  StatusBar,
  Animated,
} from 'react-native';
import { router } from 'expo-router';
import { Accent, DarkTheme, Typography, Spacing, Radius } from '../constants/theme';

const { width, height } = Dimensions.get('window');

// Diagonal stripe component for visual interest
const DiagonalStripes = ({ style }: { style?: any }) => (
  <View style={[styles.stripesContainer, style]}>
    {[...Array(8)].map((_, i) => (
      <View 
        key={i} 
        style={[
          styles.stripe, 
          { 
            left: i * 12,
            opacity: 0.15 + (i * 0.08),
          }
        ]} 
      />
    ))}
  </View>
);

export default function WelcomeScreen() {
  const contentOpacity = useRef(new Animated.Value(0)).current;
  const contentTranslateY = useRef(new Animated.Value(40)).current;
  const buttonOpacity = useRef(new Animated.Value(0)).current;
  const buttonTranslateY = useRef(new Animated.Value(30)).current;
  const stripesOpacity = useRef(new Animated.Value(0)).current;
  const stripesTranslateX = useRef(new Animated.Value(-50)).current;

  useEffect(() => {
    // Staggered animation sequence
    Animated.sequence([
      // Stripes slide in
      Animated.parallel([
        Animated.timing(stripesOpacity, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(stripesTranslateX, {
          toValue: 0,
          duration: 800,
          useNativeDriver: true,
        }),
      ]),
      // Content fades in
      Animated.parallel([
        Animated.timing(contentOpacity, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(contentTranslateY, {
          toValue: 0,
          duration: 600,
          useNativeDriver: true,
        }),
      ]),
      // Buttons fade in
      Animated.parallel([
        Animated.timing(buttonOpacity, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.timing(buttonTranslateY, {
          toValue: 0,
          duration: 500,
          useNativeDriver: true,
        }),
      ]),
    ]).start();
  }, []);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={DarkTheme.background} />
      
      {/* Background with diagonal stripes */}
      <Animated.View 
        style={[
          styles.stripesWrapper,
          {
            opacity: stripesOpacity,
            transform: [{ translateX: stripesTranslateX }],
          }
        ]}
      >
        <DiagonalStripes />
      </Animated.View>

      {/* Main content */}
      <View style={styles.content}>
        <Animated.View 
          style={[
            styles.heroSection,
            {
              opacity: contentOpacity,
              transform: [{ translateY: contentTranslateY }],
            }
          ]}
        >
          <Text style={styles.appName}>Cloud</Text>
          <Text style={styles.appNameAccent}>Vibecoder</Text>
          <Text style={styles.tagline}>From idea to PR — on the go.</Text>
        </Animated.View>

        {/* Get Started Button */}
        <Animated.View 
          style={[
            styles.buttonContainer,
            {
              opacity: buttonOpacity,
              transform: [{ translateY: buttonTranslateY }],
            }
          ]}
        >
          <TouchableOpacity
            style={styles.getStartedButton}
            onPress={() => router.push('/login')}
            activeOpacity={0.9}
          >
            <Text style={styles.getStartedText}>Get started</Text>
            <View style={styles.arrowCircle}>
              <Text style={styles.arrowIcon}>→</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.guestLink}
            onPress={() => router.push('/(tabs)')}
          >
            <Text style={styles.guestText}>Continue as Guest</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: DarkTheme.background,
  },
  stripesWrapper: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  stripesContainer: {
    position: 'absolute',
    top: height * 0.15,
    left: -20,
    width: width * 0.6,
    height: height * 0.35,
    transform: [{ rotate: '-55deg' }],
  },
  stripe: {
    position: 'absolute',
    width: 4,
    height: '140%',
    backgroundColor: '#FFFFFF',
    borderRadius: 2,
  },
  content: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
    justifyContent: 'space-between',
    paddingTop: height * 0.12,
    paddingBottom: Spacing.xxl,
  },
  heroSection: {
    marginTop: height * 0.35,
  },
  appName: {
    ...Typography.displayLarge,
    color: DarkTheme.text,
    letterSpacing: -1,
  },
  appNameAccent: {
    ...Typography.displayLarge,
    color: Accent.primary,
    letterSpacing: -1,
    marginTop: -8,
  },
  tagline: {
    ...Typography.bodyLarge,
    color: DarkTheme.textSecondary,
    marginTop: Spacing.md,
    letterSpacing: 0.3,
  },
  buttonContainer: {
    alignItems: 'flex-start',
  },
  getStartedButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'transparent',
    paddingVertical: Spacing.md,
  },
  getStartedText: {
    ...Typography.h2,
    color: DarkTheme.text,
    marginRight: Spacing.md,
  },
  arrowCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Accent.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  arrowIcon: {
    fontSize: 20,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  guestLink: {
    marginTop: Spacing.lg,
    paddingVertical: Spacing.sm,
  },
  guestText: {
    ...Typography.bodyMedium,
    color: DarkTheme.textTertiary,
  },
});
