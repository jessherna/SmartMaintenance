import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  RefreshControl,
  SafeAreaView,
} from 'react-native';
import { Card, Button, ActivityIndicator } from 'react-native-paper';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { initSocket, closeSocket } from '../services/socketService';
import SensorCard from '../components/SensorCard';

const DashboardScreen = ({ navigation }) => {
  const { authState, logout } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sensorData, setSensorData] = useState({});
  const [connectionStatus, setConnectionStatus] = useState('connecting');
  const [error, setError] = useState(null);

  useEffect(() => {
    // Initialize socket connection for real-time data
    const socket = initSocket();
    
    // Fetch initial sensor data from API
    fetchSensorData();
    
    // Listen for real-time sensor readings
    socket.on('sensorReadings', (data) => {
      console.log('Received sensor readings:', data);
      setSensorData(data);
      setLoading(false);
      setConnectionStatus('connected');
    });
    
    // Listen for connection events
    socket.on('connect', () => {
      console.log('Socket connected');
      setConnectionStatus('connected');
    });
    
    socket.on('disconnect', () => {
      console.log('Socket disconnected');
      setConnectionStatus('disconnected');
    });
    
    // Cleanup on component unmount
    return () => {
      socket.off('sensorReadings');
      socket.off('connect');
      socket.off('disconnect');
      closeSocket();
    };
  }, []);

  const fetchSensorData = async () => {
    try {
      setError(null);
      const response = await api.get('/api/sensors');
      
      if (response.data.status === 'success') {
        setSensorData(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching sensor data:', error);
      setError('Failed to fetch sensor data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchSensorData();
  };

  const handleLogout = async () => {
    closeSocket();
    await logout();
  };

  const renderSensorCards = () => {
    if (Object.keys(sensorData).length === 0) {
      return (
        <Card style={styles.noDataCard}>
          <Card.Content style={styles.noDataContent}>
            <Text style={styles.noDataText}>No sensor data available yet</Text>
          </Card.Content>
        </Card>
      );
    }

    return Object.entries(sensorData).map(([type, data]) => (
      <SensorCard key={type} type={type} data={data} />
    ));
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Equipment Monitoring</Text>
        <Text style={styles.welcomeText}>
          Welcome, {authState.user?.name || 'Technician'}
        </Text>
        <View style={styles.statusContainer}>
          <View style={[
            styles.statusIndicator,
            { backgroundColor: connectionStatus === 'connected' ? '#4CAF50' : '#F44336' }
          ]} />
          <Text style={styles.statusText}>
            {connectionStatus === 'connected' ? 'Live' : 'Offline'}
          </Text>
        </View>
      </View>

      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <Button mode="contained" onPress={fetchSensorData} style={styles.retryButton}>
            Retry
          </Button>
        </View>
      )}

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2196F3" />
          <Text style={styles.loadingText}>Loading sensor data...</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
        >
          {renderSensorCards()}
        </ScrollView>
      )}

      <View style={styles.footer}>
        <Button mode="outlined" onPress={handleLogout} style={styles.logoutButton}>
          Logout
        </Button>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f4f8',
  },
  header: {
    padding: 15,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  welcomeText: {
    fontSize: 14,
    color: '#555',
    marginBottom: 5,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 5,
  },
  statusText: {
    fontSize: 12,
    color: '#555',
  },
  scrollContent: {
    padding: 15,
  },
  noDataCard: {
    marginBottom: 15,
    elevation: 2,
  },
  noDataContent: {
    alignItems: 'center',
    paddingVertical: 30,
  },
  noDataText: {
    fontSize: 16,
    color: '#555',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#555',
  },
  errorContainer: {
    margin: 15,
    padding: 15,
    backgroundColor: '#FFEBEE',
    borderRadius: 5,
    alignItems: 'center',
  },
  errorText: {
    color: '#D32F2F',
    marginBottom: 10,
  },
  retryButton: {
    backgroundColor: '#D32F2F',
  },
  footer: {
    padding: 15,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    backgroundColor: '#fff',
  },
  logoutButton: {
    borderColor: '#2196F3',
  },
});

export default DashboardScreen; 