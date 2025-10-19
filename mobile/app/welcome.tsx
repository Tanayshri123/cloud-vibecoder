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
import { LinearGradient } from 'expo-linear-gradient';

const { width, height } = Dimensions.get('window');

export default function WelcomeScreen() {
  const logoPosition = useRef(new Animated.Value(0)).current;
  const logoScale = useRef(new Animated.Value(1)).current;
  const contentOpacity = useRef(new Animated.Value(0)).current;
  const contentTranslateY = useRef(new Animated.Value(50)).current;
  const buttonOpacity = useRef(new Animated.Value(0)).current;
  const buttonTranslateY = useRef(new Animated.Value(30)).current;
  
  // Cloud animations
  const cloud1Opacity = useRef(new Animated.Value(0)).current;
  const cloud1TranslateX = useRef(new Animated.Value(-50)).current;
  const cloud2Opacity = useRef(new Animated.Value(0)).current;
  const cloud2TranslateX = useRef(new Animated.Value(50)).current;
  const cloud3Opacity = useRef(new Animated.Value(0)).current;
  const cloud3TranslateY = useRef(new Animated.Value(30)).current;
  
  // Background circle animations
  const circle1Opacity = useRef(new Animated.Value(0)).current;
  const circle1Scale = useRef(new Animated.Value(0.8)).current;
  const circle2Opacity = useRef(new Animated.Value(0)).current;
  const circle2Scale = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    // Start animation sequence
    const startAnimation = () => {
      // Background circles appear first
      Animated.parallel([
        Animated.timing(circle1Opacity, {
          toValue: 0.15,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(circle1Scale, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(circle2Opacity, {
          toValue: 0.12,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(circle2Scale, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        }),
      ]).start();

      // Clouds appear
      Animated.parallel([
        Animated.timing(cloud1Opacity, {
          toValue: 0.8,
          duration: 1200,
          useNativeDriver: true,
        }),
        Animated.timing(cloud1TranslateX, {
          toValue: 0,
          duration: 1200,
          useNativeDriver: true,
        }),
        Animated.timing(cloud2Opacity, {
          toValue: 0.6,
          duration: 1200,
          useNativeDriver: true,
        }),
        Animated.timing(cloud2TranslateX, {
          toValue: 0,
          duration: 1200,
          useNativeDriver: true,
        }),
        Animated.timing(cloud3Opacity, {
          toValue: 0.7,
          duration: 1200,
          useNativeDriver: true,
        }),
        Animated.timing(cloud3TranslateY, {
          toValue: 0,
          duration: 1200,
          useNativeDriver: true,
        }),
      ]).start(() => {
        // Logo flies up and scales down
        Animated.parallel([
          Animated.timing(logoPosition, {
            toValue: -height * 0.15,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(logoScale, {
            toValue: 0.7,
            duration: 1000,
            useNativeDriver: true,
          }),
        ]).start(() => {
          // Content fades in
          Animated.parallel([
            Animated.timing(contentOpacity, {
              toValue: 1,
              duration: 800,
              useNativeDriver: true,
            }),
            Animated.timing(contentTranslateY, {
              toValue: 0,
              duration: 800,
              useNativeDriver: true,
            }),
          ]).start(() => {
            // Buttons fade in
            Animated.parallel([
              Animated.timing(buttonOpacity, {
                toValue: 1,
                duration: 600,
                useNativeDriver: true,
              }),
              Animated.timing(buttonTranslateY, {
                toValue: 0,
                duration: 600,
                useNativeDriver: true,
              }),
            ]).start();
          });
        });
      });
    };

    const timer = setTimeout(startAnimation, 300);
    return () => clearTimeout(timer);
  }, []);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1e3a8a" />
      
      {/* Background Circles */}
      <Animated.View 
        style={[
          styles.backgroundCircle1,
          {
            opacity: circle1Opacity,
            transform: [{ scale: circle1Scale }]
          }
        ]}
      />
      
      <Animated.View 
        style={[
          styles.backgroundCircle2,
          {
            opacity: circle2Opacity,
            transform: [{ scale: circle2Scale }]
          }
        ]}
      />
      
      {/* Animated Clouds */}
      <Animated.View 
        style={[
          styles.cloud1,
          {
            opacity: cloud1Opacity,
            transform: [{ translateX: cloud1TranslateX }]
          }
        ]}
      >
        <LinearGradient
          colors={['#ffffff', '#f8fafc']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.cloudGradient}
        />
      </Animated.View>

      <Animated.View 
        style={[
          styles.cloud2,
          {
            opacity: cloud2Opacity,
            transform: [{ translateX: cloud2TranslateX }]
          }
        ]}
      >
        <LinearGradient
          colors={['#ffffff', '#f1f5f9']}
          start={{ x: 1, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={styles.cloudGradient}
        />
      </Animated.View>

      {/* Animated Logo */}
      <Animated.View 
        style={[
          styles.logoContainer,
          {
            transform: [
              { translateY: logoPosition },
              { scale: logoScale }
            ]
          }
        ]}
      >
        <View style={styles.logoIcon}>
          <Text style={styles.logoText}>CV</Text>
        </View>
        <Text style={styles.appName}>Cloud Vibecoder</Text>
      </Animated.View>

      {/* Animated Buttons */}
      <Animated.View 
        style={[
          styles.buttonContainer,
          {
            opacity: buttonOpacity,
            transform: [{ translateY: buttonTranslateY }]
          }
        ]}
      >
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={() => router.push('/register')}
        >
          <Text style={styles.primaryButtonText}>Get Started</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={() => router.push('/login')}
        >
          <Text style={styles.secondaryButtonText}>Sign In</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.guestButton}
          onPress={() => router.push('/(tabs)')}
        >
          <Text style={styles.guestButtonText}>Continue as Guest</Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1e3a8a',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoContainer: {
    position: 'absolute',
    top: height * 0.4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoIcon: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#3b82f6',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 12,
  },
  logoText: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  appName: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#ffffff',
    textAlign: 'center',
  },
  content: {
    position: 'absolute',
    top: height * 0.25,
    paddingHorizontal: 32,
    alignItems: 'center',
  },
  title: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 20,
  },
  subtitle: {
    fontSize: 18,
    color: '#e2e8f0',
    textAlign: 'center',
    lineHeight: 26,
    marginBottom: 60,
    paddingHorizontal: 20,
  },
  featuresContainer: {
    alignItems: 'center',
    marginBottom: 80,
  },
  featureHeader: {
    fontSize: 20,
    fontWeight: '600',
    color: '#3b82f6',
    textAlign: 'center',
    marginBottom: 16,
    letterSpacing: 0.5,
  },
  buttonContainer: {
    position: 'absolute',
    bottom: 80,
    paddingHorizontal: 32,
    width: '100%',
  },
  primaryButton: {
    backgroundColor: '#3b82f6',
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#3b82f6',
    shadowOffset: {
      width: 0,
      height: 6,
    },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  secondaryButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  guestButton: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  guestButtonText: {
    color: '#e2e8f0',
    fontSize: 16,
    fontWeight: '500',
    letterSpacing: 0.3,
  },
  // Cloud styles
  cloud1: {
    position: 'absolute',
    top: height * 0.32,
    left: width * 0.1,
    width: 100,
    height: 60,
    borderRadius: 50,
  },
  cloud2: {
    position: 'absolute',
    top: height * 0.44,
    right: width * 0.1,
    width: 80,
    height: 50,
    borderRadius: 40,
  },
  cloudGradient: {
    flex: 1,
    borderRadius: 50,
    shadowColor: '#ffffff',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  // Background circle styles
  backgroundCircle1: {
    position: 'absolute',
    bottom: -150,
    left: -150,
    width: 500,
    height: 500,
    borderRadius: 250,
    backgroundColor: '#3b82f6',
  },
  backgroundCircle2: {
    position: 'absolute',
    top: -100,
    right: -200,
    width: 350,
    height: 350,
    borderRadius: 175,
    backgroundColor: '#60a5fa',
  },
});

