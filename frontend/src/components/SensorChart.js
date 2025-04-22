import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Dimensions, ActivityIndicator } from 'react-native';
import { LineChart } from 'react-native-chart-kit';

const { width } = Dimensions.get('window');
const CHART_WIDTH = width - 40;
const CHART_HEIGHT = 220;

/**
 * Displays a line chart of historical sensor readings
 */
const SensorChart = ({ 
  type = '', 
  currentValue = 0, 
  unit = '', 
  historicalData = [], 
  color = '#2196F3',
  thresholdValue = null
}) => {
  const [chartData, setChartData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Format and prepare chart data
  useEffect(() => {
    try {
      if (currentValue !== undefined && currentValue !== null) {
        // Create initial data if no historical data
        if (!historicalData || historicalData.length === 0) {
          // Generate 10 dummy points for demonstration
          const now = new Date();
          const dummyData = Array.from({ length: 10 }, (_, i) => {
            const time = new Date(now);
            time.setMinutes(now.getMinutes() - (10 - i));
            
            // Random value around the current reading
            const variance = Math.random() * 0.3 - 0.15; // -15% to +15%
            const value = currentValue * (1 + variance);
            
            return {
              value: Math.round(value * 100) / 100,
              timestamp: time.toISOString()
            };
          });
          
          // Add current reading
          dummyData.push({
            value: currentValue,
            timestamp: now.toISOString()
          });
          
          prepareChartData([...dummyData]);
        } else {
          // Use real historical data
          prepareChartData([...historicalData, { value: currentValue, timestamp: new Date().toISOString() }]);
        }
      } else {
        // Default data if currentValue is not defined
        const defaultData = Array.from({ length: 5 }, (_, i) => ({
          value: i * 10,
          timestamp: new Date(Date.now() - (4 - i) * 60000).toISOString()
        }));
        prepareChartData(defaultData);
      }
    } catch (err) {
      console.error("Error in SensorChart useEffect:", err);
      setError(err.message || "Failed to prepare chart data");
      setLoading(false);
    }
  }, [currentValue, historicalData]);

  const prepareChartData = (data) => {
    try {
      if (!data || data.length === 0) {
        setError("No data available for chart");
        setLoading(false);
        return;
      }

      const sortedData = [...data].sort((a, b) => 
        new Date(a.timestamp) - new Date(b.timestamp)
      );
      
      // Limit to last 20 points for display clarity
      const limitedData = sortedData.slice(-20);
      
      // Format for chart library
      const chartData = {
        labels: limitedData.map(item => {
          const time = new Date(item.timestamp);
          return `${time.getHours()}:${time.getMinutes().toString().padStart(2, '0')}`;
        }),
        datasets: [
          {
            data: limitedData.map(item => typeof item.value === 'number' ? item.value : 0),
            color: () => color || '#2196F3',
            strokeWidth: 2,
          }
        ]
      };
      
      // Add threshold line if provided, as a separate configuration
      if (thresholdValue && typeof thresholdValue === 'number') {
        chartData.legend = [`${type} Readings`, `Max Threshold`];
        // Some versions of the chart library expect threshold as a dataset
        const constantThreshold = Array(limitedData.length).fill(thresholdValue);
        chartData.datasets.push({
          data: constantThreshold,
          color: () => 'rgba(255, 0, 0, 0.5)',
          strokeWidth: 1,
          strokeDashArray: [5, 5]
        });
      }
      
      setChartData(chartData);
      setLoading(false);
    } catch (err) {
      console.error("Error in prepareChartData:", err);
      setError(err.message || "Failed to process chart data");
      setLoading(false);
    }
  };

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Chart error: {error}</Text>
        <Text style={styles.errorSubtext}>Please try again later</Text>
      </View>
    );
  }

  if (loading || !chartData) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2196F3" />
        <Text style={styles.loadingText}>Loading chart data...</Text>
      </View>
    );
  }

  // Ensure we have the chart library
  if (typeof LineChart !== 'function') {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Chart component not available</Text>
        <Text style={styles.errorSubtext}>Make sure react-native-chart-kit is installed</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{type || 'Sensor'} History</Text>
      <LineChart
        data={chartData}
        width={CHART_WIDTH}
        height={CHART_HEIGHT}
        chartConfig={{
          backgroundColor: '#ffffff',
          backgroundGradientFrom: '#ffffff',
          backgroundGradientTo: '#ffffff',
          decimalPlaces: 1,
          color: (opacity = 1) => `rgba(33, 150, 243, ${opacity})`,
          labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
          style: {
            borderRadius: 16,
          },
          propsForDots: {
            r: '4',
            strokeWidth: '1',
            stroke: color || '#2196F3',
          },
          propsForBackgroundLines: {
            strokeDasharray: '',
            stroke: "#e0e0e0",
            strokeWidth: 1
          },
          formatYLabel: (value) => value ? `${value}` : '0',
          formatXLabel: (value) => {
            if (!value) return '00';
            const parts = value.split(':');
            return parts.length > 1 ? parts[1] : '00'; // Just show minutes
          },
        }}
        bezier // Smooth curve
        style={styles.chart}
        withDots={true}
        withInnerLines={true}
        withOuterLines={true}
        withVerticalLabels={true}
        withHorizontalLabels={true}
        withVerticalLines={false}
        yAxisSuffix={` ${unit || ''}`}
        segments={5}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    padding: 15,
    marginBottom: 15,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.5,
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  chart: {
    marginVertical: 8,
    borderRadius: 16,
  },
  loadingContainer: {
    height: CHART_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 8,
    padding: 15,
    marginBottom: 15,
    elevation: 2,
  },
  loadingText: {
    marginTop: 10,
    color: '#757575',
  },
  errorContainer: {
    height: CHART_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff8f8',
    borderRadius: 8,
    padding: 15,
    marginBottom: 15,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#ffcdd2',
  },
  errorText: {
    color: '#D32F2F',
    fontWeight: 'bold',
    marginBottom: 5,
  },
  errorSubtext: {
    color: '#757575',
    fontSize: 12,
  }
});

export default SensorChart; 