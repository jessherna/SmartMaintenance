import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  RefreshControl,
  SafeAreaView,
  FlatList,
  TouchableOpacity,
  Modal,
} from 'react-native';
import { Card, Button, ActivityIndicator, Badge, IconButton, Divider } from 'react-native-paper';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import api from '../services/api';
import SensorCard from '../components/SensorCard';

// Fallback for compatibility
import socketService, { initSocket, closeSocket } from '../services/socketService';

const DashboardScreen = ({ navigation }) => {
  const { authState, logout } = useAuth();
  
  // Try to get socket data from context, but have fallbacks
  const socketContext = useSocket();
  const isUsingSocketContext = !!socketContext;
  
  // Data from socket context or local state
  const [localSensorData, setLocalSensorData] = useState({});
  const [localSafetyAlerts, setLocalSafetyAlerts] = useState([]);
  const [localLastAlert, setLocalLastAlert] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState('connecting');
  
  // Use socket context if available, otherwise use local state
  const { 
    isConnected = connectionStatus === 'connected', 
    sensorData = localSensorData, 
    safetyAlerts = localSafetyAlerts, 
    lastAlert = localLastAlert,
    clearAlerts = () => setLocalSafetyAlerts([])
  } = isUsingSocketContext ? socketContext : {};
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [alertsModalVisible, setAlertsModalVisible] = useState(false);
  
  // Only use this effect if NOT using socket context
  useEffect(() => {
    if (!isUsingSocketContext) {
      console.log('Using local socket implementation');
      // Initialize socket connection for real-time data
      const socket = initSocket();
      
      // Fetch initial sensor data from API
      fetchSensorData();
      
      // Listen for real-time sensor readings
      socket.on('sensorReadings', (data) => {
        console.log('Received sensor readings:', data);
        setLocalSensorData(data);
        setLoading(false);
        setConnectionStatus('connected');
      });
      
      // Listen for safety alerts
      socket.on('safetyAlerts', (alerts) => {
        console.log('Received safety alerts:', alerts);
        setLocalSafetyAlerts(prev => {
          const combined = [...alerts, ...prev];
          const unique = [...new Map(combined.map(a => [a.timestamp + a.type, a])).values()];
          return unique.slice(0, 100);
        });
        
        if (alerts.length > 0) {
          setLocalLastAlert(alerts[0]);
        }
      });
      
      socket.on('safetyAlert', (alert) => {
        console.log('Received safety alert:', alert);
        setLocalLastAlert(alert);
        setLocalSafetyAlerts(prev => {
          const updated = [alert, ...prev];
          const unique = [...new Map(updated.map(a => [a.timestamp + a.type, a])).values()];
          return unique.slice(0, 100);
        });
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
        socket.off('safetyAlerts');
        socket.off('safetyAlert');
        socket.off('connect');
        socket.off('disconnect');
        closeSocket();
      };
    }
  }, [isUsingSocketContext]);
  
  // This effect runs for both implementations
  useEffect(() => {
    if (isUsingSocketContext) {
      // Fetch initial sensor data from API if socket isn't connected yet
      if (!isConnected || Object.keys(sensorData).length === 0) {
        fetchSensorData();
      } else {
        setLoading(false);
      }
    }
  }, [isUsingSocketContext, isConnected, sensorData]);

  const fetchSensorData = async () => {
    try {
      setError(null);
      const response = await api.get('/api/sensors');
      
      if (response.data.status === 'success') {
        // Only update if we don't have socket data yet
        if (!isUsingSocketContext && Object.keys(localSensorData).length === 0) {
          setLocalSensorData(response.data.data);
        }
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
    if (!isUsingSocketContext) {
      closeSocket();
    }
    await logout();
  };

  const toggleAlertsModal = () => {
    setAlertsModalVisible(!alertsModalVisible);
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

  const renderAlertItem = ({ item }) => (
    <View style={styles.alertItem}>
      <View style={styles.alertHeader}>
        <Text style={styles.alertType}>{item.type}</Text>
        <Text style={styles.alertTime}>
          {new Date(item.timestamp).toLocaleTimeString()}
        </Text>
      </View>
      <Text style={styles.alertMessage}>{item.message}</Text>
      <Text style={styles.alertValue}>
        Value: {item.value} {item.unit} (Threshold: {item.threshold} {item.unit})
      </Text>
      <Divider style={styles.alertDivider} />
    </View>
  );

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
            { backgroundColor: isConnected ? '#4CAF50' : '#F44336' }
          ]} />
          <Text style={styles.statusText}>
            {isConnected ? 'Live' : 'Offline'}
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

      {lastAlert && (
        <TouchableOpacity 
          style={styles.latestAlertBanner}
          onPress={toggleAlertsModal}
        >
          <View style={styles.latestAlertContent}>
            <Badge style={styles.alertBadge} size={24}>
              {safetyAlerts.length}
            </Badge>
            <View style={styles.latestAlertTextContainer}>
              <Text style={styles.latestAlertTitle}>Safety Alert</Text>
              <Text style={styles.latestAlertMessage} numberOfLines={1}>
                {lastAlert.message}
              </Text>
            </View>
          </View>
          <IconButton 
            icon="chevron-right" 
            size={20} 
            color="#fff"
          />
        </TouchableOpacity>
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

      <Modal
        animationType="slide"
        transparent={true}
        visible={alertsModalVisible}
        onRequestClose={toggleAlertsModal}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Safety Alerts</Text>
              <IconButton
                icon="close"
                size={24}
                onPress={toggleAlertsModal}
              />
            </View>
            
            {safetyAlerts.length > 0 ? (
              <FlatList
                data={safetyAlerts}
                renderItem={renderAlertItem}
                keyExtractor={(item) => `${item.type}-${item.timestamp}`}
                contentContainerStyle={styles.alertsList}
              />
            ) : (
              <View style={styles.noAlertsContainer}>
                <Text style={styles.noAlertsText}>No safety alerts</Text>
              </View>
            )}
            
            <View style={styles.modalFooter}>
              <Button 
                mode="contained" 
                onPress={toggleAlertsModal}
                style={styles.modalCloseButton}
              >
                Close
              </Button>
              {safetyAlerts.length > 0 && (
                <Button 
                  mode="outlined" 
                  onPress={clearAlerts}
                  style={styles.clearAlertsButton}
                >
                  Clear All
                </Button>
              )}
            </View>
          </View>
        </View>
      </Modal>

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
  latestAlertBanner: {
    backgroundColor: '#F44336',
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  latestAlertContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  alertBadge: {
    backgroundColor: '#fff',
    color: '#F44336',
    fontWeight: 'bold',
  },
  latestAlertTextContainer: {
    marginLeft: 10,
    flex: 1,
  },
  latestAlertTitle: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  latestAlertMessage: {
    color: '#fff',
    fontSize: 12,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 10,
    margin: 20,
    maxHeight: '80%',
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  alertsList: {
    paddingHorizontal: 15,
  },
  alertItem: {
    paddingVertical: 10,
  },
  alertHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  alertType: {
    fontWeight: 'bold',
    color: '#F44336',
  },
  alertTime: {
    color: '#757575',
    fontSize: 12,
  },
  alertMessage: {
    marginBottom: 5,
  },
  alertValue: {
    fontSize: 12,
    color: '#757575',
  },
  alertDivider: {
    marginTop: 10,
  },
  noAlertsContainer: {
    padding: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noAlertsText: {
    color: '#757575',
    fontSize: 16,
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 15,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  modalCloseButton: {
    flex: 1,
    marginRight: 5,
  },
  clearAlertsButton: {
    flex: 1,
    marginLeft: 5,
    borderColor: '#F44336',
  },
});

export default DashboardScreen; 