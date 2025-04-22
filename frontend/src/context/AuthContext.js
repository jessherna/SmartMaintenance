import React, { createContext, useState, useContext } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../services/api';

// Create Authentication Context
const AuthContext = createContext();

// Authentication Provider Component
export const AuthProvider = ({ children }) => {
  const [authState, setAuthState] = useState({
    token: null,
    user: null,
    isLoading: true,
    isAuthenticated: false
  });

  // Login user
  const login = async (email, password) => {
    try {
      const response = await api.post('/auth/login', { email, password });
      
      if (response.data.status === 'success') {
        const { token, user } = response.data;
        
        // Store token and user data in AsyncStorage
        await AsyncStorage.setItem('token', token);
        await AsyncStorage.setItem('user', JSON.stringify(user));
        
        // Update auth state
        setAuthState({
          token,
          user,
          isLoading: false,
          isAuthenticated: true
        });
        
        return { success: true };
      } else {
        return { 
          success: false, 
          message: response.data.message || 'Login failed' 
        };
      }
    } catch (error) {
      console.error('Login error:', error);
      return { 
        success: false, 
        message: error.response?.data?.message || 'Login failed. Please check your credentials.' 
      };
    }
  };

  // Register user
  const register = async (name, email, password) => {
    try {
      const response = await api.post('/auth/register', { name, email, password });
      
      if (response.data.status === 'success') {
        const { token, user } = response.data;
        
        // Store token and user data in AsyncStorage
        await AsyncStorage.setItem('token', token);
        await AsyncStorage.setItem('user', JSON.stringify(user));
        
        // Update auth state
        setAuthState({
          token,
          user,
          isLoading: false,
          isAuthenticated: true
        });
        
        return { success: true };
      } else {
        return { 
          success: false, 
          message: response.data.message || 'Registration failed' 
        };
      }
    } catch (error) {
      console.error('Registration error:', error);
      return { 
        success: false, 
        message: error.response?.data?.message || 'Registration failed. Please try again.' 
      };
    }
  };

  // Logout user
  const logout = async () => {
    try {
      // Remove token and user data from AsyncStorage
      await AsyncStorage.removeItem('token');
      await AsyncStorage.removeItem('user');
      
      // Update auth state
      setAuthState({
        token: null,
        user: null,
        isLoading: false,
        isAuthenticated: false
      });
      
      return { success: true };
    } catch (error) {
      console.error('Logout error:', error);
      return { success: false, message: 'Logout failed' };
    }
  };

  return (
    <AuthContext.Provider 
      value={{ 
        authState, 
        setAuthState, 
        login, 
        register, 
        logout 
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook to use the auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  
  return context;
}; 