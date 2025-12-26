/**
 * Loading Screen Component
 * TIME BEYOND US - Branded Loading State
 */

import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface LoadingScreenProps {
  message?: string;
  showLogo?: boolean;
}

export default function LoadingScreen({
  message = 'Loading...',
  showLogo = true,
}: LoadingScreenProps) {
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Rotate animation
    Animated.loop(
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 2000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();

    // Pulse animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1,
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [rotateAnim, pulseAnim]);

  const rotate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <View style={styles.container}>
      {showLogo && (
        <Animated.View
          style={[
            styles.logoContainer,
            { transform: [{ scale: pulseAnim }] },
          ]}
        >
          <View style={styles.logo}>
            <Text style={styles.logoText}>T</Text>
          </View>
        </Animated.View>
      )}

      <Animated.View style={{ transform: [{ rotate }] }}>
        <View style={styles.spinnerContainer}>
          <Ionicons name="sync" size={32} color="#00ff88" />
        </View>
      </Animated.View>

      <Text style={styles.message}>{message}</Text>

      <View style={styles.dotsContainer}>
        <Animated.View
          style={[
            styles.dot,
            {
              opacity: rotateAnim.interpolate({
                inputRange: [0, 0.33, 0.66, 1],
                outputRange: [1, 0.3, 0.3, 1],
              }),
            },
          ]}
        />
        <Animated.View
          style={[
            styles.dot,
            {
              opacity: rotateAnim.interpolate({
                inputRange: [0, 0.33, 0.66, 1],
                outputRange: [0.3, 1, 0.3, 0.3],
              }),
            },
          ]}
        />
        <Animated.View
          style={[
            styles.dot,
            {
              opacity: rotateAnim.interpolate({
                inputRange: [0, 0.33, 0.66, 1],
                outputRange: [0.3, 0.3, 1, 0.3],
              }),
            },
          ]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#020617',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  logoContainer: {
    marginBottom: 32,
  },
  logo: {
    width: 80,
    height: 80,
    borderRadius: 20,
    backgroundColor: '#00ff88',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoText: {
    color: '#020617',
    fontSize: 40,
    fontWeight: 'bold',
  },
  spinnerContainer: {
    marginBottom: 24,
  },
  message: {
    color: '#94a3b8',
    fontSize: 16,
    marginBottom: 16,
  },
  dotsContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#00ff88',
  },
});
