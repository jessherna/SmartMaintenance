import React, { useEffect, useState, useCallback, useMemo } from 'react';
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
import TimeRangeSelector from '../components/TimeRangeSelector';

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
  
  // Time range state (default: Live view)
  const [timeRange, setTimeRange] = useState(0);
  
  // Store all history of sensor readings for filtering
  const [sensorHistory, setSensorHistory] = useState({});
  
  // Track when the last update for each time interval occurred
  const [lastIntervalUpdate, setLastIntervalUpdate] = useState({});
  
  // Store snapshot data for fixed interval updates
  const [snapshotData, setSnapshotData] = useState({});
  
  // Use socket context if available, otherwise use local state
  const { 
    isConnected: socketIsConnected = false, 
    sensorData = localSensorData, 
    sensorHistory: contextSensorHistory = {},
    safetyAlerts = localSafetyAlerts, 
    lastAlert = localLastAlert,
    clearAlerts = () => setLocalSafetyAlerts([])
  } = isUsingSocketContext ? socketContext : {};
  
  // Use context history if available, otherwise use local history
  const effectiveSensorHistory = isUsingSocketContext ? contextSensorHistory : sensorHistory;
  
  // Determine actual connection status based on both context and local data
  const isConnected = isUsingSocketContext 
    ? socketIsConnected
    : connectionStatus === 'connected' || Object.keys(localSensorData).length > 0;
  
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
        
        // Store current readings in regular state
        setLocalSensorData(data);
        
        // Also store in history with timestamp
        const timestamp = new Date().toISOString();
        setSensorHistory(prevHistory => {
          const newHistory = { ...prevHistory };
          
          // Update history for each sensor type
          Object.entries(data).forEach(([type, reading]) => {
            if (!newHistory[type]) {
              newHistory[type] = [];
            }
            
            // Add new reading with timestamp
            newHistory[type].push({
              ...reading,
              timestamp
            });
            
            // Keep only last 1500 readings (covers 24h at 1 reading per minute)
            if (newHistory[type].length > 1500) {
              newHistory[type] = newHistory[type].slice(-1500);
            }
          });
          
          return newHistory;
        });
        
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
        
        setConnectionStatus('connected');
      });
      
      socket.on('safetyAlert', (alert) => {
        console.log('Received safety alert:', alert);
        setLocalLastAlert(alert);
        setLocalSafetyAlerts(prev => {
          const updated = [alert, ...prev];
          const unique = [...new Map(updated.map(a => [a.timestamp + a.type, a])).values()];
          return unique.slice(0, 100);
        });
        
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
      if ((!socketIsConnected && Object.keys(sensorData).length === 0) || Object.keys(sensorData).length === 0) {
        fetchSensorData();
      } else {
        setLoading(false);
      }
    }
  }, [isUsingSocketContext, socketIsConnected, sensorData]);

  const fetchSensorData = async () => {
    try {
      setError(null);
      const response = await api.get('/api/sensors');
      
      if (response.data.status === 'success') {
        // Only update if we don't have socket data yet
        if (!isUsingSocketContext && Object.keys(localSensorData).length === 0) {
          setLocalSensorData(response.data.data);
          setConnectionStatus('connected');
        }
      }
    } catch (error) {
      console.error('Error fetching sensor data:', error);
      setError('Failed to fetch sensor data');
      setConnectionStatus('disconnected');
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
  
  const handleViewSensorDetails = (sensorType) => {
    console.log(`Viewing details for ${sensorType}`);
    // In a real app, you could navigate to a detailed view or open a modal
    // navigation.navigate('SensorDetails', { type: sensorType });
  };

  const renderSensorCards = () => {
    if (!filteredSensorData || Object.keys(filteredSensorData).length === 0) {
      return (
        <Card style={styles.noDataCard}>
          <Card.Content style={styles.noDataContent}>
            <Text style={styles.noDataText}>No sensor data available yet</Text>
          </Card.Content>
        </Card>
      );
    }

    // Safety thresholds for each sensor type
    const thresholds = {
      VIBRATION: 2.0,
      TEMPERATURE: 40.0,
      CURRENT: 35.0
    };

    return Object.entries(filteredSensorData).map(([type, data]) => {
      // Ensure data exists and is properly formatted
      if (!data) {
        data = { value: 0, unit: '', isSafe: true };
      }
      
      const sensorType = type ? type.toUpperCase() : '';
      const threshold = thresholds[sensorType] || (
        sensorType === 'VIBRATION' ? 10 :
        sensorType === 'TEMPERATURE' ? 80 :
        sensorType === 'CURRENT' ? 40 : 50
      );
      
      return (
        <SensorCard 
          key={type || Math.random().toString()} 
          type={type} 
          data={data} 
          onViewDetails={handleViewSensorDetails}
          thresholdValue={threshold}
          historicalData={data.historicalData || []}
        />
      );
    });
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

  // Handle time range change
  const handleTimeRangeChange = (newRange) => {
    console.log('Time range changed to:', newRange, 'minutes');
    
    // If switching to Live mode, clear snapshot data
    if (newRange === 0) {
      setSnapshotData({});
    } 
    // If switching to an interval mode, take an initial snapshot of current data
    else if (timeRange === 0 || !snapshotData[newRange]) {
      // Take a snapshot of current data
      takeDataSnapshot(newRange);
    }
    
    setTimeRange(newRange);
  };
  
  // Takes a snapshot of the current sensor data for a specific time range
  const takeDataSnapshot = (range) => {
    const now = new Date();
    
    // Create a new snapshot with the current data
    const snapshot = {
      data: { ...sensorData },
      timestamp: now,
      nextUpdateTime: new Date(now.getTime() + range * 60 * 1000) // Next update in 'range' minutes
    };
    
    // Update the snapshot data state
    setSnapshotData(prev => ({
      ...prev,
      [range]: snapshot
    }));
    
    console.log(`Took snapshot for ${range}min interval, next update at:`, snapshot.nextUpdateTime);
  };
  
  // Check if it's time to update any snapshot data
  useEffect(() => {
    if (timeRange === 0 || !sensorData || Object.keys(sensorData).length === 0) {
      return; // Don't run for live mode or if no data available
    }
    
    const now = new Date();
    const currentSnapshot = snapshotData[timeRange];
    
    // If we have a snapshot for this range and it's time to update it
    if (currentSnapshot && now >= currentSnapshot.nextUpdateTime) {
      console.log(`Time to update ${timeRange}min snapshot data`);
      takeDataSnapshot(timeRange);
    }
    
    // Set up interval to check for updates every second
    const checkInterval = setInterval(() => {
      const now = new Date();
      const currentSnapshot = snapshotData[timeRange];
      
      if (currentSnapshot) {
        const timeUntilNextUpdate = Math.max(0, currentSnapshot.nextUpdateTime - now);
        
        // If it's time for an update or nearly time (less than 2 seconds)
        if (now >= currentSnapshot.nextUpdateTime || timeUntilNextUpdate < 2000) {
          console.log(`Interval triggered update for ${timeRange}min snapshot`);
          takeDataSnapshot(timeRange);
        }
      }
    }, 1000); // Check every second to be more precise
    
    return () => clearInterval(checkInterval);
  }, [timeRange, sensorData, snapshotData]);
  
  // Filter sensor data based on selected time range
  const filteredSensorData = useMemo(() => {
    // For Live mode, use real-time data
    if (timeRange === 0) {
      // For live mode, add historical data for charts without modifying the current values
      const result = {};
      
      Object.entries(sensorData).forEach(([type, data]) => {
        // Get last 5 minutes of data for charts
        const cutoffTime = new Date();
        cutoffTime.setMinutes(cutoffTime.getMinutes() - 5); // Use 5 minutes of history for live view
        
        const readings = effectiveSensorHistory[type] || [];
        const historicalReadings = readings.filter(
          reading => new Date(reading.timestamp) >= cutoffTime
        );
        
        // Add current data point if it doesn't match the latest reading
        const liveReadings = [...historicalReadings];
        
        // Add current value as the last point if needed
        if (liveReadings.length === 0 || 
            liveReadings[liveReadings.length - 1].value !== data.value) {
          liveReadings.push({
            value: data.value,
            unit: data.unit,
            timestamp: new Date().toISOString(),
            isSafe: data.isSafe
          });
        }
        
        // Create a processed version with the current data
        result[type] = {
          ...data,
          historicalData: liveReadings
        };
      });
      
      return result;
    }
    
    // For interval modes, use the snapshot data if available
    if (snapshotData[timeRange]) {
      const snapshot = snapshotData[timeRange];
      
      // Calculate how much time until next update
      const now = new Date();
      const timeUntilNextUpdate = Math.max(0, snapshot.nextUpdateTime - now);
      const minutesRemaining = Math.ceil(timeUntilNextUpdate / (60 * 1000));
      
      // If the time remaining is very small (less than 30 seconds), 
      // consider it ready for update rather than showing "0 minutes"
      if (minutesRemaining === 0) {
        // Instead of showing this snapshot with 0 minutes, request a new snapshot
        console.log("Time elapsed, requesting new snapshot");
        
        // Use setTimeout to avoid state updates during render
        setTimeout(() => {
          takeDataSnapshot(timeRange);
        }, 0);
        
        // Return empty object to trigger the fallback to sensorData
        return {};
      }
      
      // Process each sensor to add historical data for charts
      const result = {};
      Object.entries(snapshot.data).forEach(([type, data]) => {
        // Get historical data for charts by filtering sensor history
        const cutoffTime = new Date();
        cutoffTime.setMinutes(cutoffTime.getMinutes() - timeRange);
        
        const readings = effectiveSensorHistory[type] || [];
        
        // For time-filtered mode, we want to only show historical data from previous snapshots
        // plus the current snapshot value (not real-time updates between snapshots)
        
        // Find readings from previous snapshots (within time range, but before this snapshot)
        // Filter the readings to only include points at the selected time interval
        const previousReadings = readings.filter(reading => {
          const readingTime = new Date(reading.timestamp);
          
          // Only include readings that fall on the interval boundary
          // This keeps only readings that are exactly at multiples of the timeRange
          if (timeRange > 0) {
            const minutesSinceReadingTimestamp = Math.floor(
              (snapshot.timestamp - readingTime) / (60 * 1000)
            );
            
            // Only keep readings that are multiples of timeRange minutes apart
            return (
              readingTime >= cutoffTime && 
              readingTime <= snapshot.timestamp && 
              (minutesSinceReadingTimestamp % timeRange === 0 || minutesSinceReadingTimestamp === 0)
            );
          }
          
          return readingTime >= cutoffTime && readingTime <= snapshot.timestamp;
        });
        
        // Create a set of "official" readings that only update on the snapshot schedule
        // Let's just pick one reading per interval period
        const officialReadings = [];
        
        // Group readings by timeRange-minute chunks and take only one reading per chunk
        if (timeRange > 0 && previousReadings.length > 0) {
          const intervalGroups = {};
          
          // Group readings by their interval
          previousReadings.forEach(reading => {
            const readingTime = new Date(reading.timestamp);
            // Calculate which interval this reading belongs to
            const intervalIndex = Math.floor(
              (snapshot.timestamp - readingTime) / (timeRange * 60 * 1000)
            );
            
            // Store the most recent reading for each interval
            if (!intervalGroups[intervalIndex] || 
                new Date(intervalGroups[intervalIndex].timestamp) < readingTime) {
              intervalGroups[intervalIndex] = reading;
            }
          });
          
          // Sort the intervals and add to officialReadings
          Object.keys(intervalGroups)
            .sort((a, b) => Number(a) - Number(b))
            .forEach(intervalIndex => {
              officialReadings.push(intervalGroups[intervalIndex]);
            });
        } else {
          // For live mode or if we don't have enough readings, use what we have
          officialReadings.push(...previousReadings);
        }
        
        // Add current snapshot value as the last point
        officialReadings.push({
          value: data.value,
          unit: data.unit,
          timestamp: snapshot.timestamp.toISOString(),
          isSafe: data.isSafe
        });
        
        // Create result with metadata about the interval
        result[type] = {
          ...data,
          sampled: true,
          periodMinutes: timeRange,
          nextUpdateMinutes: minutesRemaining,
          nextUpdateTime: snapshot.nextUpdateTime.toLocaleTimeString(),
          updatedAt: snapshot.timestamp.toLocaleTimeString(),
          historicalData: officialReadings
        };
      });
      
      return result;
    }
    
    // Fallback to original data if no snapshot yet
    return sensorData;
  }, [sensorData, effectiveSensorHistory, timeRange, snapshotData]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerTopRow}>
          <View style={styles.headerTitleContainer}>
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
          
          <View style={styles.headerRightContainer}>
            <TimeRangeSelector 
              selectedRange={timeRange}
              onRangeChange={handleTimeRangeChange}
            />
          </View>
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
            <Badge style={styles.alertBadge} size={20}>
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
            size={16} 
            color="#fff"
            style={styles.alertChevron}
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
  headerTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerTitleContainer: {
    flex: 1,
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
  headerRightContainer: {
    alignItems: 'flex-end',
    justifyContent: 'center',
    paddingLeft: 10,
    height: '100%',
    minHeight: 50,
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
    padding: 8,
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
    marginLeft: 8,
    flex: 1,
  },
  latestAlertTitle: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 13,
  },
  latestAlertMessage: {
    color: '#fff',
    fontSize: 11,
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
  alertChevron: {
    margin: 0,
    padding: 0,
  },
});

export default DashboardScreen; 