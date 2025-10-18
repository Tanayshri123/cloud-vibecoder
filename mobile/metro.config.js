const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Add resolver configuration to handle web-only packages
config.resolver.platforms = ['ios', 'android', 'native', 'web'];

// Add resolver alias to handle problematic web-only packages
config.resolver.alias = {
  '@radix-ui/react-dialog': require.resolve('react-native'),
  '@radix-ui/react-dismissable-layer': require.resolve('react-native'),
  '@radix-ui/react-focus-scope': require.resolve('react-native'),
  '@radix-ui/react-portal': require.resolve('react-native'),
  '@radix-ui/react-presence': require.resolve('react-native'),
  '@radix-ui/react-primitive': require.resolve('react-native'),
  '@radix-ui/react-slot': require.resolve('react-native'),
};

module.exports = config;
