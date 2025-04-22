import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  Animated, 
  Easing 
} from 'react-native';
import { Card, Button, ActivityIndicator, Icon } from 'react-native-paper';

/**
 * Component to display connection status with retry functionality
 */
const ConnectionStatus = ({ 
  isConnected, 
  isReconnecting = false,
  onRetry,
  lastSyncTime,
  showDetails = true,
  style
}) => {
  // Animation value for pulsing effect when reconnecting
  const [pulseAnim] = useState(new Animated.Value(1));
  
  // Connection status text and colors
  const statusInfo = {
    connected: {
      color: '#4CAF50',
      text: 'Connected',
      icon: 'wifi',
      details: lastSyncTime ? 
        `Last updated: ${new Date(lastSyncTime).toLocaleTimeString()}` : 
        'Real-time data'
    },
    disconnected: {
      color: '#F44336',
      text: 'Disconnected',
      icon: 'wifi-off',
      details: 'Unable to connect to server'
    },
    reconnecting: {
      color: '#FFC107',
      text: 'Reconnecting',
      icon: 'wifi-strength-1',
      details: 'Attempting to restore connection'
    }
  };
  
  // Determine current status
  const currentStatus = isReconnecting ? 
    'reconnecting' : (isConnected ? 'connected' : 'disconnected');
  const { color, text, icon, details } = statusInfo[currentStatus];
  
  // Reconnecting animation
  useEffect(() => {
    if (isReconnecting) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 0.6,
            duration: 800,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 800,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true
          })
        ])
      ).start();
    } else {
      // Reset animation when not reconnecting
      pulseAnim.setValue(1);
    }
  }, [isReconnecting]);
  
  return (
    <Card style={[styles.container, style]}>
      <View style={styles.content}>
        <View style={styles.statusSection}>
          <Animated.View style={[
            styles.indicator, 
            { 
              backgroundColor: color,
              opacity: pulseAnim 
            }
          ]} />
          
          <View style={styles.textContainer}>
            <View style={styles.statusRow}>
              <Icon source={icon} size={16} color={color} />
              <Text style={[styles.statusText, { color }]}>{text}</Text>
            </View>
            
            {showDetails && (
              <Text style={styles.details}>{details}</Text>
            )}
          </View>
        </View>
        
        {!isConnected && !isReconnecting && onRetry && (
          <Button 
            mode="contained" 
            onPress={onRetry} 
            style={[styles.retryButton, { backgroundColor: color }]}
            labelStyle={styles.retryLabel}
            compact
          >
            Retry
          </Button>
        )}
        
        {isReconnecting && (
          <ActivityIndicator size={24} color={color} />
        )}
      </View>
    </Card>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 15,
    elevation: 1,
  },
  content: {
    padding: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  indicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusText: {
    fontWeight: 'bold',
    marginLeft: 6,
  },
  details: {
    fontSize: 12,
    color: '#757575',
    marginTop: 2,
  },
  retryButton: {
    borderRadius: 4,
    marginLeft: 12,
  },
  retryLabel: {
    fontSize: 12,
    margin: 0,
    color: 'white',
  },
});

export default ConnectionStatus; 