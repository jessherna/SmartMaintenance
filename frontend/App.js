import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { StatusBar } from 'expo-status-bar';
import { Provider as PaperProvider } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Screens
import LoginScreen from './src/screens/LoginScreen';
import RegisterScreen from './src/screens/RegisterScreen';
import DashboardScreen from './src/screens/DashboardScreen';

// Context
import { AuthProvider, useAuth } from './src/context/AuthContext';

const Stack = createStackNavigator();

// Auth Stack (Unauthenticated)
const AuthStack = () => (
  <Stack.Navigator 
    screenOptions={{
      headerShown: false
    }}
  >
    <Stack.Screen name="Login" component={LoginScreen} />
    <Stack.Screen name="Register" component={RegisterScreen} />
  </Stack.Navigator>
);

// App Stack (Authenticated)
const AppStack = () => (
  <Stack.Navigator
    screenOptions={{
      headerStyle: {
        backgroundColor: '#2196F3',
      },
      headerTintColor: '#fff',
      headerTitleStyle: {
        fontWeight: 'bold',
      },
    }}
  >
    <Stack.Screen 
      name="Dashboard" 
      component={DashboardScreen} 
      options={{ title: 'Smart Maintenance' }} 
    />
  </Stack.Navigator>
);

// Navigation Container with Authentication State
const AppNavigator = () => {
  const { authState, setAuthState } = useAuth();
  
  useEffect(() => {
    // Check if user is already logged in
    const checkLoginStatus = async () => {
      try {
        const token = await AsyncStorage.getItem('token');
        const user = await AsyncStorage.getItem('user');
        
        if (token && user) {
          setAuthState({
            token,
            user: JSON.parse(user),
            isLoading: false,
            isAuthenticated: true
          });
        } else {
          setAuthState({
            token: null,
            user: null,
            isLoading: false,
            isAuthenticated: false
          });
        }
      } catch (error) {
        console.error('Failed to check login status:', error);
        setAuthState({
          token: null,
          user: null,
          isLoading: false,
          isAuthenticated: false
        });
      }
    };
    
    checkLoginStatus();
  }, []);
  
  if (authState.isLoading) {
    return null; // You can add a splash screen or loading component here
  }
  
  return (
    <NavigationContainer>
      {authState.isAuthenticated ? <AppStack /> : <AuthStack />}
    </NavigationContainer>
  );
};

// Main App Component
export default function App() {
  return (
    <SafeAreaProvider>
      <PaperProvider>
        <AuthProvider>
          <StatusBar style="auto" />
          <AppNavigator />
        </AuthProvider>
      </PaperProvider>
    </SafeAreaProvider>
  );
} 