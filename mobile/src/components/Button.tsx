/**
 * Reusable Button Component
 * TIME BEYOND US - Consistent Button Styles
 */

import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

type ButtonVariant = 'primary' | 'secondary' | 'success' | 'danger' | 'outline' | 'ghost';
type ButtonSize = 'small' | 'medium' | 'large';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: keyof typeof Ionicons.glyphMap;
  iconPosition?: 'left' | 'right';
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export default function Button({
  title,
  onPress,
  variant = 'primary',
  size = 'medium',
  icon,
  iconPosition = 'left',
  disabled = false,
  loading = false,
  fullWidth = false,
  style,
  textStyle,
}: ButtonProps) {
  const getVariantStyles = (): { container: ViewStyle; text: TextStyle } => {
    switch (variant) {
      case 'primary':
        return {
          container: {
            backgroundColor: '#00ff88',
            borderColor: '#00ff88',
          },
          text: {
            color: '#020617',
          },
        };
      case 'secondary':
        return {
          container: {
            backgroundColor: '#6366f1',
            borderColor: '#6366f1',
          },
          text: {
            color: '#ffffff',
          },
        };
      case 'success':
        return {
          container: {
            backgroundColor: '#22c55e',
            borderColor: '#22c55e',
          },
          text: {
            color: '#ffffff',
          },
        };
      case 'danger':
        return {
          container: {
            backgroundColor: '#ef4444',
            borderColor: '#ef4444',
          },
          text: {
            color: '#ffffff',
          },
        };
      case 'outline':
        return {
          container: {
            backgroundColor: 'transparent',
            borderColor: '#334155',
            borderWidth: 2,
          },
          text: {
            color: '#f8fafc',
          },
        };
      case 'ghost':
        return {
          container: {
            backgroundColor: 'transparent',
            borderColor: 'transparent',
          },
          text: {
            color: '#00ff88',
          },
        };
      default:
        return {
          container: {},
          text: {},
        };
    }
  };

  const getSizeStyles = (): { container: ViewStyle; text: TextStyle; iconSize: number } => {
    switch (size) {
      case 'small':
        return {
          container: {
            paddingVertical: 8,
            paddingHorizontal: 16,
            borderRadius: 8,
          },
          text: {
            fontSize: 14,
          },
          iconSize: 16,
        };
      case 'medium':
        return {
          container: {
            paddingVertical: 12,
            paddingHorizontal: 24,
            borderRadius: 12,
          },
          text: {
            fontSize: 16,
          },
          iconSize: 20,
        };
      case 'large':
        return {
          container: {
            paddingVertical: 16,
            paddingHorizontal: 32,
            borderRadius: 14,
          },
          text: {
            fontSize: 18,
          },
          iconSize: 24,
        };
      default:
        return {
          container: {},
          text: {},
          iconSize: 20,
        };
    }
  };

  const variantStyles = getVariantStyles();
  const sizeStyles = getSizeStyles();

  const isDisabled = disabled || loading;

  return (
    <TouchableOpacity
      style={[
        styles.container,
        variantStyles.container,
        sizeStyles.container,
        fullWidth && styles.fullWidth,
        isDisabled && styles.disabled,
        style,
      ]}
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.7}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={variant === 'primary' ? '#020617' : '#ffffff'}
        />
      ) : (
        <>
          {icon && iconPosition === 'left' && (
            <Ionicons
              name={icon}
              size={sizeStyles.iconSize}
              color={variantStyles.text.color}
              style={styles.iconLeft}
            />
          )}
          <Text
            style={[
              styles.text,
              variantStyles.text,
              sizeStyles.text,
              textStyle,
            ]}
          >
            {title}
          </Text>
          {icon && iconPosition === 'right' && (
            <Ionicons
              name={icon}
              size={sizeStyles.iconSize}
              color={variantStyles.text.color}
              style={styles.iconRight}
            />
          )}
        </>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  fullWidth: {
    width: '100%',
  },
  disabled: {
    opacity: 0.5,
  },
  text: {
    fontWeight: '700',
    textAlign: 'center',
  },
  iconLeft: {
    marginRight: 8,
  },
  iconRight: {
    marginLeft: 8,
  },
});
