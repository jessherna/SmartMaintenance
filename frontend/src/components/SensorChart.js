import React, { useState, useEffect, useMemo } from 'react';
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Memoize the chart data to prevent unnecessary recalculations
  const chartData = useMemo(() => {
    try {
      if (!historicalData || historicalData.length === 0) {
        return null;
      }

      // Use up to 20 data points for best visualization
      const maxPoints = 20;
      
      // Sort by timestamp (oldest first for chart display)
      const sortedData = [...historicalData].sort((a, b) => 
        new Date(a.timestamp) - new Date(b.timestamp)
      );
      
      // If we have too many points, sample them to get a smoother chart
      let chartPoints = sortedData;
      if (sortedData.length > maxPoints) {
        const skipFactor = Math.ceil(sortedData.length / maxPoints);
        chartPoints = sortedData.filter((_, index) => index % skipFactor === 0 || index === sortedData.length - 1);
        
        // Always include the latest point
        if (chartPoints.length > 0 && chartPoints[chartPoints.length - 1] !== sortedData[sortedData.length - 1]) {
          chartPoints.push(sortedData[sortedData.length - 1]);
        }
      }
      
      // Ensure we have the current value as the last point
      if (chartPoints.length > 0 && chartPoints[chartPoints.length - 1].value !== currentValue) {
        // Update the last point to match the current value displayed on the card
        chartPoints[chartPoints.length - 1] = {
          ...chartPoints[chartPoints.length - 1],
          value: currentValue
        };
      }
      
      // Calculate min and max values for Y-axis with threshold at top
      let minValue = 0;
      let maxValue = 0;
      
      // If we have a threshold, use it as the maximum
      if (thresholdValue && typeof thresholdValue === 'number') {
        // Set the max value to exactly the threshold value
        // This will place the threshold line at the top of the chart
        maxValue = thresholdValue;
        
        // Add 20% padding to ensure the threshold line is visible
        // This places the threshold at approximately 80% of the chart height
        maxValue = maxValue * 1.2;
        
        // Set minimum to 0 or the lowest value if negative
        minValue = Math.min(0, ...chartPoints.map(item => item.value));
      } else {
        // No threshold, just use data min/max with some padding
        const highestValue = Math.max(...chartPoints.map(item => item.value));
        maxValue = highestValue * 1.2;
        minValue = Math.min(0, ...chartPoints.map(item => item.value));
      }
      
      // Format for chart library
      const formattedChartData = {
        labels: chartPoints.map(item => {
          const time = new Date(item.timestamp);
          return `${time.getHours()}:${time.getMinutes().toString().padStart(2, '0')}`;
        }),
        datasets: [
          {
            data: chartPoints.map(item => typeof item.value === 'number' ? item.value : 0),
            color: () => color || '#2196F3',
            strokeWidth: 2,
          }
        ],
        // Add fixed min and max values for consistent Y-axis
        minValue: minValue,
        maxValue: maxValue
      };
      
      // Add threshold line if provided, as a separate configuration
      if (thresholdValue && typeof thresholdValue === 'number') {
        formattedChartData.legend = [`${type} Readings`, `Max Threshold`];
        // Some versions of the chart library expect threshold as a dataset
        const constantThreshold = Array(chartPoints.length).fill(thresholdValue);
        formattedChartData.datasets.push({
          data: constantThreshold,
          color: () => 'rgba(255, 0, 0, 0.5)',
          strokeWidth: 1,
          strokeDashArray: [5, 5]
        });
      }
      
      setLoading(false);
      return formattedChartData;
    } catch (err) {
      console.error("Error in prepareChartData:", err);
      setError(err.message || "Failed to process chart data");
      setLoading(false);
      return null;
    }
  }, [historicalData, currentValue, thresholdValue, type, color]);

  // Set loading state when dependencies change
  useEffect(() => {
    setLoading(!chartData);
  }, [chartData]);

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

  // Log rendering to track updates
  console.log(`Rendering chart for ${type} with ${chartData.datasets[0].data.length} points`);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{type || 'Sensor'} History</Text>
      <LineChart
        key={`chart-${type}-${historicalData.length}`}
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
        // Use fixed y-axis min and max values
        yAxisMinValue={chartData.minValue}
        yAxisMaxValue={chartData.maxValue}
        fromZero={chartData.minValue === 0} // Start from zero if min is zero
        // Ensure the chart doesn't try to auto-scale
        fromNumber={chartData.minValue}
        toNumber={chartData.maxValue}
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