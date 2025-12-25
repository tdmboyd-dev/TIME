import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import TabNavigator from './TabNavigator';
import LoginScreen from '../screens/LoginScreen';
import TradeDetailScreen from '../screens/TradeDetailScreen';

export type RootStackParamList = {
  Login: undefined;
  Main: undefined;
  TradeDetail: { tradeId: string };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

interface RootNavigatorProps {
  isAuthenticated: boolean;
}

export default function RootNavigator({ isAuthenticated }: RootNavigatorProps) {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        headerStyle: {
          backgroundColor: '#020617',
        },
        headerTintColor: '#f8fafc',
        headerTitleStyle: {
          fontWeight: 'bold',
        },
      }}
    >
      {!isAuthenticated ? (
        <Stack.Screen name="Login" component={LoginScreen} />
      ) : (
        <>
          <Stack.Screen name="Main" component={TabNavigator} />
          <Stack.Screen
            name="TradeDetail"
            component={TradeDetailScreen}
            options={{
              headerShown: true,
              title: 'Trade Details',
              presentation: 'modal',
            }}
          />
        </>
      )}
    </Stack.Navigator>
  );
}
