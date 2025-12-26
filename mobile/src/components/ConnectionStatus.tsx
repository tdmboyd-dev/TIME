/**
 * Connection Status Component
 * TIME BEYOND US - WebSocket Connection Indicator
 */

import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Animated, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import websocketService, { ConnectionStatus as ConnectionStatusType } from '../services/websocket';

interface ConnectionStatusProps {
  showLabel?: boolean;
  onPress?: () => void;
}

export default function ConnectionStatus({
  showLabel = true,
  onPress,
}: ConnectionStatusProps) {
  const [status, setStatus] = useState<ConnectionStatusType>('disconnected');
  const pulseAnim = new Animated.Value(1);

  useEffect(() => {
    // Get initial status
    setStatus(websocketService.getConnectionStatus());

    // Subscribe to status changes
    const unsubscribe = websocketService.onConnectionChange((newStatus) => {
      setStatus(newStatus);
    });

    return unsubscribe;
  }, []);

  useEffect(() => {
    if (status === 'connecting') {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 0.5,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
    }
  }, [status, pulseAnim]);

  const getStatusConfig = () => {
    switch (status) {
      case 'connected':
        return {
          color: '#00ff88',
          label: 'Connected',
          icon: 'checkmark-circle' as const,
        };
      case 'connecting':
        return {
          color: '#f59e0b',
          label: 'Connecting...',
          icon: 'sync' as const,
        };
      case 'error':
        return {
          color: '#ef4444',
          label: 'Connection Error',
          icon: 'alert-circle' as const,
        };
      default:
        return {
          color: '#64748b',
          label: 'Disconnected',
          icon: 'close-circle' as const,
        };
    }
  };

  const config = getStatusConfig();

  const handlePress = () => {
    if (onPress) {
      onPress();
    } else if (status === 'disconnected' || status === 'error') {
      websocketService.reconnect();
    }
  };

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={handlePress}
      activeOpacity={0.7}
    >
      <Animated.View
        style={[
          styles.indicator,
          { backgroundColor: config.color, opacity: pulseAnim },
        ]}
      />
      {showLabel && (
        <Text style={[styles.label, { color: config.color }]}>
          {config.label}
        </Text>
      )}
    </TouchableOpacity>
  );
}

// Minimal version for headers
export function ConnectionDot() {
  const [status, setStatus] = useState<ConnectionStatusType>('disconnected');

  useEffect(() => {
    setStatus(websocketService.getConnectionStatus());
    const unsubscribe = websocketService.onConnectionChange(setStatus);
    return unsubscribe;
  }, []);

  const getColor = () => {
    switch (status) {
      case 'connected':
        return '#00ff88';
      case 'connecting':
        return '#f59e0b';
      case 'error':
        return '#ef4444';
      default:
        return '#64748b';
    }
  };

  return <View style={[styles.dot, { backgroundColor: getColor() }]} />;
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  indicator: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});
