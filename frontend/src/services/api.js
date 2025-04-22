import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// Determine API URL based on platform
// For Android emulators, use 10.0.2.2 to access the dev machine's localhost
// For iOS simulators, use localhost
// For physical devices, you need to use your computer's actual IP address
const getApiUrl = () => {
  if (Platform.OS === 'android') {
    return 'http://10.0.2.2:5000'; // Android emulator
  } else if (Platform.OS === 'ios') {
    return 'http://localhost:5000'; // iOS simulator
  } else {
    return 'http://localhost:5000'; // Web fallback
  }
};

// Create API instance
const api = axios.create({
  baseURL: getApiUrl(),
  headers: {
    'Content-Type': 'application/json',
  },
  // Add timeout to prevent long-hanging requests
  timeout: 10000,
});

// Add request interceptor for authentication
api.interceptors.request.use(
  async (config) => {
    // Get token from storage before each request
    const token = await AsyncStorage.getItem('token');
    
    // If token exists, add to headers
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add response interceptor for error handling
api.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    console.log('API Error:', error);
    
    // Handle 401 Unauthorized errors (token expired or invalid)
    if (error.response && error.response.status === 401) {
      // Clear token and user from storage
      await AsyncStorage.removeItem('token');
      await AsyncStorage.removeItem('user');
      
      // You can add additional logic here to redirect to login page
      // This would require access to the navigation object
    }
    
    return Promise.reject(error);
  }
);

export default api; 