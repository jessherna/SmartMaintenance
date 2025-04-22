import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_ENDPOINTS } from '../config/index';
import { createClient } from '@supabase/supabase-js';
import socketService from './socketService';

// Supabase configuration
const SUPABASE_URL = process.env.REACT_APP_SUPABASE_URL || 'https://your-supabase-url.supabase.co';
const SUPABASE_KEY = process.env.REACT_APP_SUPABASE_KEY || 'your-supabase-anon-key';

// Initialize Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

/**
 * Service for handling user-related API operations
 */
class UserService {
  /**
   * Logs in a user using Supabase authentication
   * @param {string} email - User's email
   * @param {string} password - User's password
   * @returns {Promise<Object>} - Promise resolving to user data and token
   */
  static async login(email, password) {
    try {
      // Use Supabase for authentication
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });
      
      if (error) throw error;
      
      // Store the token in AsyncStorage
      if (data.session?.access_token) {
        await AsyncStorage.setItem('token', data.session.access_token);
        await AsyncStorage.setItem('user', JSON.stringify(data.user || {}));
        
        // Set the token for axios requests
        axios.defaults.headers.common['Authorization'] = `Bearer ${data.session.access_token}`;
        
        // Initialize socket connection after successful login
        socketService.getSocket();
        
        // Return user data in a format compatible with our application
        return {
          user: data.user,
          token: data.session.access_token
        };
      }
      
      throw new Error('Authentication failed');
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  }

  /**
   * Logs out the current user
   */
  static async logout() {
    try {
      // Sign out from Supabase
      await supabase.auth.signOut();
      
      // Clear local storage
      await AsyncStorage.removeItem('token');
      await AsyncStorage.removeItem('user');
      
      // Remove authorization header
      delete axios.defaults.headers.common['Authorization'];
      
      // Disconnect socket
      socketService.disconnectSocket();
      
    } catch (error) {
      console.error('Logout error:', error);
      throw error;
    }
  }

  /**
   * Registers a new user with Supabase
   * @param {Object} userData - User registration data
   * @returns {Promise<Object>} - Promise resolving to the created user
   */
  static async register(userData) {
    try {
      // Register with Supabase
      const { data, error } = await supabase.auth.signUp({
        email: userData.email,
        password: userData.password,
        options: {
          data: {
            first_name: userData.firstName,
            last_name: userData.lastName,
            phone: userData.phone,
            role: userData.role || 'user'
          }
        }
      });
      
      if (error) throw error;
      
      // After registration, create the user profile in your API
      // This might be handled by Supabase Edge Functions or your backend
      try {
        const response = await axios.post(
          `${API_ENDPOINTS.BASE_URL}${API_ENDPOINTS.USERS}`,
          {
            id: data.user.id,
            email: userData.email,
            firstName: userData.firstName,
            lastName: userData.lastName,
            phone: userData.phone,
            role: userData.role || 'user'
          }
        );
        return { ...data.user, profile: response.data };
      } catch (apiError) {
        console.warn('User registered in Supabase but profile creation failed:', apiError);
        return data.user;
      }
    } catch (error) {
      console.error('Registration error:', error);
      throw error;
    }
  }
  
  /**
   * Refreshes the authentication token
   * @returns {Promise<string>} - Promise resolving to the new token
   */
  static async refreshToken() {
    try {
      const { data, error } = await supabase.auth.refreshSession();
      
      if (error) throw error;
      
      if (data.session?.access_token) {
        await AsyncStorage.setItem('token', data.session.access_token);
        axios.defaults.headers.common['Authorization'] = `Bearer ${data.session.access_token}`;
        return data.session.access_token;
      }
      
      throw new Error('Failed to refresh token');
    } catch (error) {
      console.error('Token refresh error:', error);
      throw error;
    }
  }

  /**
   * Initialize authentication from stored token
   * @returns {Promise<Object|null>} - Promise resolving to user data if authenticated
   */
  static async initAuth() {
    try {
      const token = await AsyncStorage.getItem('token');
      
      if (!token) return null;
      
      // Set token for axios
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      
      // Get current session state
      const { data } = await supabase.auth.getSession();
      
      // Check if session is valid
      if (data.session) {
        // Initialize socket connection
        socketService.getSocket();
        
        // Return user data
        const userJson = await AsyncStorage.getItem('user');
        return userJson ? JSON.parse(userJson) : null;
      } else {
        // Session expired, try to refresh
        try {
          await this.refreshToken();
          // Initialize socket after refresh
          socketService.getSocket();
          
          const userJson = await AsyncStorage.getItem('user');
          return userJson ? JSON.parse(userJson) : null;
        } catch (refreshError) {
          // If refresh fails, clear auth data
          await this.logout();
          return null;
        }
      }
    } catch (error) {
      console.error('Error initializing authentication:', error);
      await this.logout();
      return null;
    }
  }

  /**
   * Fetches the current user's profile
   * @returns {Promise<Object>} - Promise resolving to the user profile
   */
  static async getCurrentUser() {
    try {
      // Get user from Supabase
      const { data: { user }, error } = await supabase.auth.getUser();
      
      if (error) throw error;
      
      // Also get additional profile data from your API
      try {
        const response = await axios.get(
          `${API_ENDPOINTS.BASE_URL}${API_ENDPOINTS.USERS}/me`
        );
        return { ...user, profile: response.data };
      } catch (apiError) {
        console.warn('Could not fetch additional profile data:', apiError);
        return user;
      }
    } catch (error) {
      console.error('Error fetching current user:', error);
      throw error;
    }
  }

  /**
   * Updates the current user's profile
   * @param {Object} userData - Updated user data
   * @returns {Promise<Object>} - Promise resolving to the updated user
   */
  static async updateProfile(userData) {
    try {
      // Update Supabase user metadata
      const { data, error } = await supabase.auth.updateUser({
        data: {
          first_name: userData.firstName,
          last_name: userData.lastName,
          phone: userData.phone,
          // Add other metadata fields here
        }
      });
      
      if (error) throw error;
      
      // Also update the profile in your API
      try {
        const response = await axios.put(
          `${API_ENDPOINTS.BASE_URL}${API_ENDPOINTS.USERS}/me`,
          userData
        );
        return { ...data.user, profile: response.data };
      } catch (apiError) {
        console.warn('User updated in Supabase but API profile update failed:', apiError);
        return data.user;
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      throw error;
    }
  }

  /**
   * Changes the user's password
   * @param {string} currentPassword - Current password (not used with Supabase)
   * @param {string} newPassword - New password
   * @returns {Promise<Object>} - Promise resolving to the response
   */
  static async changePassword(currentPassword, newPassword) {
    try {
      // With Supabase, we don't need the current password
      const { data, error } = await supabase.auth.updateUser({
        password: newPassword
      });
      
      if (error) throw error;
      
      return { success: true };
    } catch (error) {
      console.error('Error changing password:', error);
      throw error;
    }
  }

  /**
   * Initiates password reset process
   * @param {string} email - User's email
   * @returns {Promise<Object>} - Promise resolving to the response
   */
  static async requestPasswordReset(email) {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email);
      
      if (error) throw error;
      
      return { success: true };
    } catch (error) {
      console.error('Error requesting password reset:', error);
      throw error;
    }
  }

  /**
   * Fetches all users (admin function)
   * @param {Object} filters - Optional filters for users
   * @param {number} page - Page number for pagination
   * @param {number} limit - Number of items per page
   * @returns {Promise<Array>} - Promise resolving to an array of users
   */
  static async getAllUsers(filters = {}, page = 1, limit = 10) {
    try {
      const response = await axios.get(
        `${API_ENDPOINTS.BASE_URL}${API_ENDPOINTS.USERS}`,
        {
          params: {
            ...filters,
            page,
            limit
          }
        }
      );
      return response.data;
    } catch (error) {
      console.error('Error fetching users:', error);
      throw error;
    }
  }

  /**
   * Fetches a specific user by ID (admin function)
   * @param {string} userId - The ID of the user to fetch
   * @returns {Promise<Object>} - Promise resolving to the user
   */
  static async getUserById(userId) {
    try {
      const response = await axios.get(
        `${API_ENDPOINTS.BASE_URL}${API_ENDPOINTS.USERS}/${userId}`
      );
      return response.data;
    } catch (error) {
      console.error(`Error fetching user with ID ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Updates a user (admin function)
   * @param {string} userId - The ID of the user to update
   * @param {Object} userData - Updated user data
   * @returns {Promise<Object>} - Promise resolving to the updated user
   */
  static async updateUser(userId, userData) {
    try {
      const response = await axios.put(
        `${API_ENDPOINTS.BASE_URL}${API_ENDPOINTS.USERS}/${userId}`,
        userData
      );
      return response.data;
    } catch (error) {
      console.error(`Error updating user with ID ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Deletes a user (admin function)
   * @param {string} userId - The ID of the user to delete
   * @returns {Promise<Object>} - Promise resolving to the result of the deletion
   */
  static async deleteUser(userId) {
    try {
      const response = await axios.delete(
        `${API_ENDPOINTS.BASE_URL}${API_ENDPOINTS.USERS}/${userId}`
      );
      return response.data;
    } catch (error) {
      console.error(`Error deleting user with ID ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Gets assigned assets for a user
   * @param {string} userId - The ID of the user (defaults to current user if not provided)
   * @returns {Promise<Array>} - Promise resolving to an array of assets
   */
  static async getUserAssets(userId = 'me') {
    try {
      const response = await axios.get(
        `${API_ENDPOINTS.BASE_URL}${API_ENDPOINTS.USERS}/${userId}/assets`
      );
      return response.data;
    } catch (error) {
      console.error(`Error fetching assets for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Gets user activity logs
   * @param {string} userId - The ID of the user (defaults to current user if not provided)
   * @param {Object} filters - Optional filters for activity logs
   * @param {number} page - Page number for pagination
   * @param {number} limit - Number of items per page
   * @returns {Promise<Array>} - Promise resolving to an array of activity logs
   */
  static async getUserActivityLogs(userId = 'me', filters = {}, page = 1, limit = 10) {
    try {
      const response = await axios.get(
        `${API_ENDPOINTS.BASE_URL}${API_ENDPOINTS.USERS}/${userId}/activity`,
        {
          params: {
            ...filters,
            page,
            limit
          }
        }
      );
      return response.data;
    } catch (error) {
      console.error(`Error fetching activity logs for user ${userId}:`, error);
      throw error;
    }
  }
}

export default UserService; 