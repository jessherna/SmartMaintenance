import React from 'react';
import { StyleSheet, View, Text } from 'react-native';
import { Card, Title, Paragraph } from 'react-native-paper';

const SensorCard = ({ type, data }) => {
  // Define colors and icons based on sensor type and safety
  const getSensorConfig = () => {
    const isSafe = data.isSafe;
    
    switch (type) {
      case 'VIBRATION':
        return {
          title: 'Vibration',
          color: isSafe ? '#2196F3' : '#F44336',
          backgroundColor: isSafe ? '#E3F2FD' : '#FFEBEE',
          icon: '📳',
        };
      case 'TEMPERATURE':
        return {
          title: 'Temperature',
          color: isSafe ? '#4CAF50' : '#F44336',
          backgroundColor: isSafe ? '#E8F5E9' : '#FFEBEE',
          icon: '🌡️',
        };
      case 'CURRENT':
        return {
          title: 'Current',
          color: isSafe ? '#FF9800' : '#F44336',
          backgroundColor: isSafe ? '#FFF3E0' : '#FFEBEE',
          icon: '⚡',
        };
      default:
        return {
          title: type,
          color: isSafe ? '#9E9E9E' : '#F44336',
          backgroundColor: isSafe ? '#F5F5F5' : '#FFEBEE',
          icon: '📊',
        };
    }
  };

  // Get the configuration for this sensor
  const config = getSensorConfig();

  // Format timestamp if available
  const formattedTimestamp = data.timestamp 
    ? new Date(data.timestamp).toLocaleTimeString() 
    : 'Just now';

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
          <View style={[
            styles.statusBadge, 
            { backgroundColor: data.isSafe ? '#4CAF50' : '#F44336' }
          ]}>
            <Text style={styles.statusText}>
              {data.isSafe ? 'SAFE' : 'ALERT'}
            </Text>
          </View>
        </View>

        <View style={styles.dataRow}>
          <View style={styles.valueContainer}>
            <Text style={styles.value}>{data.value}</Text>
            <Text style={styles.unit}>{data.unit}</Text>
          </View>
        </View>

        <Paragraph style={styles.timestamp}>Updated: {formattedTimestamp}</Paragraph>
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
  dataRow: {
    marginVertical: 10,
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
  timestamp: {
    fontSize: 12,
    color: '#757575',
    marginTop: 5,
  },
});

export default SensorCard; 