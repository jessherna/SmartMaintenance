import React, { createContext, useContext, useEffect, useState } from 'react';
import socketService from '../services/socketService';
import { useAuth } from './AuthContext';

// Create context with default values that match what DashboardScreen expects
const defaultContext = {
  isConnected: false,
  sensorData: {},
  safetyAlerts: [],
  lastAlert: null,
  subscribe: () => console.warn('Socket context not initialized'),
  unsubscribe: () => console.warn('Socket context not initialized'),
  clearAlerts: () => console.warn('Socket context not initialized')
};

const SocketContext = createContext(defaultContext);

/**
 * Socket provider component
 */
export const SocketProvider = ({ children }) => {
  const { user } = useAuth();
  const [isConnected, setIsConnected] = useState(false);
  const [sensorData, setSensorData] = useState({});
  const [safetyAlerts, setSafetyAlerts] = useState([]);
  const [lastAlert, setLastAlert] = useState(null);
  const [error, setError] = useState(null);
  const [isInitialized, setIsInitialized] = useState(false);

  // Connect to socket when component mounts
  useEffect(() => {
    const connectSocket = async () => {
      try {
        console.log('SocketContext: Connecting to socket...');
        await socketService.connect();
        setIsConnected(true);
        setIsInitialized(true);
        console.log('SocketContext: Connected successfully');
        
        // Add event listeners
        socketService.on('sensorReadings', handleSensorReadings);
        socketService.on('safetyAlerts', handleSafetyAlerts);
        socketService.on('safetyAlert', handleSafetyAlert);
        socketService.on('disconnect', () => setIsConnected(false));
        
      } catch (error) {
        console.error('SocketContext: Failed to connect to socket:', error);
        setError(error);
        setIsConnected(false);
        setIsInitialized(true); // Still mark as initialized so we return the context
      }
    };

    connectSocket();

    // Cleanup on unmount
    return () => {
      console.log('SocketContext: Cleaning up socket connections');
      if (socketService.socket) {
        socketService.off('sensorReadings');
        socketService.off('safetyAlerts');
        socketService.off('safetyAlert');
        socketService.disconnect();
      }
    };
  }, []);

  // Authenticate socket when user changes
  useEffect(() => {
    if (isConnected && user) {
      console.log('SocketContext: Authenticating socket with user data');
      socketService.authenticate({
        id: user.id,
        email: user.email,
        name: user.name
      }).catch(err => {
        console.error('SocketContext: Authentication failed:', err);
      });
    }
  }, [isConnected, user]);

  // Handle sensor readings update
  const handleSensorReadings = (data) => {
    console.log('SocketContext: Received sensor readings');
    setSensorData(data);
  };

  // Handle safety alerts update
  const handleSafetyAlerts = (alerts) => {
    console.log('SocketContext: Received safety alerts:', alerts.length);
    setSafetyAlerts((prevAlerts) => {
      // Combine alerts, avoiding duplicates and keeping newest at the beginning
      const combinedAlerts = [...alerts, ...prevAlerts];
      const uniqueAlerts = [...new Map(
        combinedAlerts.map(alert => [alert.timestamp + alert.type, alert])
      ).values()];
      
      // Sort by timestamp (newest first)
      uniqueAlerts.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      
      return uniqueAlerts.slice(0, 100); // Limit to 100 alerts
    });
    
    // Update last alert with most recent one
    if (alerts.length > 0) {
      setLastAlert(alerts[0]);
    }
  };

  // Handle single safety alert
  const handleSafetyAlert = (alert) => {
    console.log('SocketContext: Received safety alert for:', alert.type);
    setLastAlert(alert);
    setSafetyAlerts((prevAlerts) => {
      // Add new alert to the beginning
      const updatedAlerts = [alert, ...prevAlerts];
      
      // Remove duplicates
      const uniqueAlerts = [...new Map(
        updatedAlerts.map(a => [a.timestamp + a.type, a])
      ).values()];
      
      return uniqueAlerts.slice(0, 100); // Limit to 100 alerts
    });
  };

  // Subscribe to specific channels
  const subscribe = (channel) => {
    console.log('SocketContext: Subscribing to channel:', channel);
    socketService.subscribe(channel);
  };

  // Unsubscribe from specific channels
  const unsubscribe = (channel) => {
    console.log('SocketContext: Unsubscribing from channel:', channel);
    socketService.unsubscribe(channel);
  };

  // Context value
  const value = {
    isConnected,
    sensorData,
    safetyAlerts,
    lastAlert,
    subscribe,
    unsubscribe,
    clearAlerts: () => {
      console.log('SocketContext: Clearing alerts');
      setSafetyAlerts([]);
    },
    error
  };

  // Wait until initialized before rendering children
  // This prevents flash of unconnected state
  /*if (!isInitialized) {
    return null;
  }*/

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
};

/**
 * Hook to use socket context
 */
export const useSocket = () => {
  try {
    const context = useContext(SocketContext);
    return context || defaultContext;
  } catch (error) {
    console.error('useSocket error:', error);
    return defaultContext;
  }
};

export default SocketContext; 