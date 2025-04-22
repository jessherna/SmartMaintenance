import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Animated } from 'react-native';
import { Card, Title, Paragraph, Button, IconButton, ProgressBar } from 'react-native-paper';
import SensorChart from './SensorChart';

const SensorCard = ({ 
  type, 
  data = {}, 
  historicalData = [], 
  onViewDetails,
  thresholdValue
}) => {
  const [expanded, setExpanded] = useState(false);
  const [expandAnim] = useState(new Animated.Value(0));
  
  // Ensure data object exists
  if (!data) {
    data = {
      value: 0,
      unit: '',
      timestamp: new Date().toISOString(),
      isSafe: true
    };
  }
  
  // Handle expand/collapse
  const toggleExpand = () => {
    const toValue = expanded ? 0 : 1;
    Animated.timing(expandAnim, {
      toValue,
      duration: 300,
      useNativeDriver: false,
    }).start();
    setExpanded(!expanded);
  };
  
  // Define colors and icons based on sensor type and safety
  const getSensorConfig = () => {
    // Ensure data.isSafe is defined
    const isSafe = data.isSafe !== undefined ? data.isSafe : true;
    
    // Default colors
    const defaultConfig = {
      title: type || 'Unknown',
      color: isSafe ? '#9E9E9E' : '#F44336',
      backgroundColor: isSafe ? '#F5F5F5' : '#FFEBEE',
      icon: '📊',
      threshold: thresholdValue || 50
    };
    
    // Return early if type is not defined
    if (!type) {
      return defaultConfig;
    }
    
    switch (type.toUpperCase()) {
      case 'VIBRATION':
        return {
          title: 'Vibration',
          color: isSafe ? '#2196F3' : '#F44336',
          backgroundColor: isSafe ? '#E3F2FD' : '#FFEBEE',
          icon: '📳',
          threshold: thresholdValue || 10
        };
      case 'TEMPERATURE':
        return {
          title: 'Temperature',
          color: isSafe ? '#4CAF50' : '#F44336',
          backgroundColor: isSafe ? '#E8F5E9' : '#FFEBEE',
          icon: '🌡️',
          threshold: thresholdValue || 80
        };
      case 'CURRENT':
        return {
          title: 'Current',
          color: isSafe ? '#FF9800' : '#F44336',
          backgroundColor: isSafe ? '#FFF3E0' : '#FFEBEE',
          icon: '⚡',
          threshold: thresholdValue || 40
        };
      default:
        return defaultConfig;
    }
  };

  // Get the configuration for this sensor
  const config = getSensorConfig();

  // Format timestamp if available
  const formattedTimestamp = data.timestamp 
    ? new Date(data.timestamp).toLocaleTimeString() 
    : 'Just now';

  // Calculate height for chart container based on animation
  const chartHeight = expandAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 250]
  });

  return (
    <Card style={[styles.card, { backgroundColor: config.backgroundColor }]}>
      <Card.Content>
        <View style={styles.headerRow}>
          <View style={styles.titleContainer}>
            <Text style={styles.icon}>{config.icon}</Text>
            <Title style={[styles.title, { color: config.color }]}>
              {config.title}
            </Title>
          </View>
          <View style={styles.headerControls}>
            <View style={[
              styles.statusBadge, 
              { backgroundColor: data.isSafe !== false ? '#4CAF50' : '#F44336' }
            ]}>
              <Text style={styles.statusText}>
                {data.isSafe !== false ? 'SAFE' : 'ALERT'}
              </Text>
            </View>
            
            <IconButton
              icon={expanded ? "chevron-up" : "chevron-down"}
              size={20}
              onPress={toggleExpand}
              style={styles.expandButton}
            />
          </View>
        </View>

        <View style={styles.dataRow}>
          <View style={styles.valueContainer}>
            <Text style={styles.value}>{data.value !== undefined ? data.value : 'N/A'}</Text>
            <Text style={styles.unit}>{data.unit || ''}</Text>
          </View>
          
          <View style={styles.thresholdContainer}>
            <Text style={styles.thresholdLabel}>Threshold</Text>
            <Text style={styles.thresholdValue}>{config.threshold} {data.unit || ''}</Text>
          </View>
        </View>

        {data.sampled && (
          <View style={styles.aggregationInfo}>
            <Text style={styles.aggregationText}>
              {data.periodMinutes}min view • Updated {data.updatedAt || 'recently'}
            </Text>
            {data.nextUpdateMinutes !== undefined && data.nextUpdateMinutes > 0 && (
              <View style={styles.updateCountdown}>
                <Text style={styles.nextUpdateText}>
                  Next update in {data.nextUpdateMinutes} {data.nextUpdateMinutes === 1 ? 'minute' : 'minutes'}
                </Text>
                <ProgressBar 
                  progress={1 - (data.nextUpdateMinutes / data.periodMinutes)} 
                  color={config.color}
                  style={styles.progressBar}
                />
              </View>
            )}
          </View>
        )}

        <Paragraph style={styles.timestamp}>Updated: {formattedTimestamp}</Paragraph>
        
        <Animated.View style={[styles.chartContainer, { height: chartHeight, overflow: 'hidden' }]}>
          {expanded && (
            <SensorChart 
              type={type || 'Unknown'} 
              currentValue={data?.value !== undefined ? data.value : 0} 
              unit={data?.unit || ''} 
              historicalData={Array.isArray(historicalData) ? historicalData : []}
              color={config?.color || '#2196F3'}
              thresholdValue={config?.threshold || 0}
            />
          )}
        </Animated.View>
        
        {expanded && onViewDetails && (
          <Button 
            mode="outlined" 
            onPress={() => onViewDetails(type)}
            style={[styles.detailsButton, { borderColor: config.color }]}
            labelStyle={{ color: config.color }}
          >
            View Details
          </Button>
        )}
      </Card.Content>
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    marginBottom: 15,
    elevation: 2,
    borderRadius: 8,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerControls: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  icon: {
    fontSize: 20,
    marginRight: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 12,
  },
  expandButton: {
    margin: 0,
  },
  dataRow: {
    marginVertical: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  valueContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  value: {
    fontSize: 32,
    fontWeight: 'bold',
  },
  unit: {
    fontSize: 16,
    marginLeft: 5,
    marginBottom: 5,
    color: '#555',
  },
  thresholdContainer: {
    alignItems: 'flex-end',
  },
  thresholdLabel: {
    fontSize: 12,
    color: '#757575',
  },
  thresholdValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#555',
  },
  aggregationInfo: {
    marginTop: 5,
    marginBottom: 10,
  },
  aggregationText: {
    fontSize: 12,
    color: '#757575',
  },
  timestamp: {
    fontSize: 12,
    color: '#757575',
    marginTop: 5,
  },
  chartContainer: {
    marginTop: 10,
  },
  detailsButton: {
    marginTop: 10,
  },
  nextUpdateText: {
    fontSize: 12,
    color: '#757575',
    marginTop: 5,
  },
  updateCountdown: {
    marginTop: 5,
  },
  progressBar: {
    height: 4,
    marginTop: 5,
    borderRadius: 2,
  },
});

export default SensorCard; 