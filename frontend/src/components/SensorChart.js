import React, { useState, useEffect, useMemo, useRef } from 'react';
import { View, Text, StyleSheet, Dimensions, ActivityIndicator } from 'react-native';
import { LineChart } from 'react-native-chart-kit';

const { width } = Dimensions.get('window');
const CHART_WIDTH = width - 40;
const CHART_HEIGHT = 220;

// Maximum number of data points to show in chart for performance
const MAX_CHART_POINTS = 12;

// Minimum time between chart recalculations (ms)
const MIN_RECALCULATION_INTERVAL = 10000; // 10 seconds

// Memoized function to avoid recalculations
const formatTimestamp = (timestamp) => {
  const time = new Date(timestamp);
  return `${time.getHours()}:${time.getMinutes().toString().padStart(2, '0')}`;
};

// Deep equality check for arrays of objects to prevent unnecessary rerenders
const areArraysEqual = (arr1, arr2) => {
  if (!arr1 || !arr2) return false;
  if (arr1.length !== arr2.length) return false;
  
  // Check only relevant properties to optimize comparison
  for (let i = 0; i < arr1.length; i++) {
    if (arr1[i].value !== arr2[i].value || 
        arr1[i].timestamp !== arr2[i].timestamp) {
      return false;
    }
  }
  return true;
};

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
  
  // Store previously processed historical data for comparison
  const prevProcessedDataRef = useRef([]);
  
  // Generate a stable chart ID that doesn't change with every render
  const chartIdRef = useRef(`chart-${type}-${Math.random().toString(36).substring(2, 9)}`);
  
  // Keep track of last render time to throttle updates
  const lastRenderTimeRef = useRef(0);
  
  // Keep a cached version of the last successfully generated chart data
  const chartDataCacheRef = useRef(null);

  // Memoize the chart data to prevent unnecessary recalculations
  const chartData = useMemo(() => {
    try {
      // Skip processing if data hasn't changed significantly
      const now = Date.now();
      
      // If we have a recent calculation and the data hasn't changed much, use cached data
      if (chartDataCacheRef.current && 
          now - lastRenderTimeRef.current < MIN_RECALCULATION_INTERVAL) {
        
        // Only recalculate if the array content has changed significantly
        const sortedData = [...historicalData].sort((a, b) => 
          new Date(a.timestamp) - new Date(b.timestamp)
        );
        
        // Sample the data points for a rough comparison (more efficient)
        const samplingFactor = Math.max(1, Math.floor(sortedData.length / 5));
        const sampledData = sortedData.filter((_, i) => i % samplingFactor === 0 || i === sortedData.length - 1);
        
        // Check if the data is substantially the same
        if (areArraysEqual(sampledData, prevProcessedDataRef.current)) {
          // Data is basically the same, so prevent recalculation
          return chartDataCacheRef.current;
        }
      }
      
      if (!historicalData || historicalData.length === 0) {
        return chartDataCacheRef.current || null;
      }

      // Use fewer data points for better performance
      const maxPoints = MAX_CHART_POINTS;
      
      // Sort by timestamp (oldest first for chart display)
      const sortedData = [...historicalData].sort((a, b) => 
        new Date(a.timestamp) - new Date(b.timestamp)
      );
      
      // Save the processed data for future comparisons
      const samplingFactor = Math.max(1, Math.floor(sortedData.length / 5));
      prevProcessedDataRef.current = sortedData.filter((_, i) => i % samplingFactor === 0 || i === sortedData.length - 1);
      
      // If we have too many points, sample them to get a smoother chart
      let chartPoints = sortedData;
      if (sortedData.length > maxPoints) {
        const skipFactor = Math.ceil(sortedData.length / maxPoints);
        // More efficient filtering using array indexing
        chartPoints = Array(Math.min(maxPoints, sortedData.length))
          .fill(null)
          .map((_, i) => {
            const index = Math.min(i * skipFactor, sortedData.length - 1);
            return sortedData[index];
          });
        
        // Always include the latest point
        if (chartPoints.length > 0 && 
            chartPoints[chartPoints.length - 1] !== sortedData[sortedData.length - 1]) {
          chartPoints[chartPoints.length - 1] = sortedData[sortedData.length - 1];
        }
      }
      
      // Ensure we have the current value as the last point, but only update if different enough
      if (chartPoints.length > 0 && 
          Math.abs(chartPoints[chartPoints.length - 1].value - currentValue) > 0.1) {
        // Only update if the difference is significant (more than 0.1 units)
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
      
      // Round the min/max values for better labeling and stability
      minValue = Math.floor(minValue);
      maxValue = Math.ceil(maxValue);
      
      // Format for chart library
      const formattedChartData = {
        // Pre-calculate labels to avoid doing this in render
        labels: chartPoints.map(item => formatTimestamp(item.timestamp)),
        datasets: [
          {
            data: chartPoints.map(item => typeof item.value === 'number' ? parseFloat(item.value.toFixed(1)) : 0),
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
        
        // Ensure threshold is properly visible in the chart
        // Create constant threshold line that will be visible at correct value
        const constantThreshold = Array(chartPoints.length).fill(thresholdValue);
        
        // Add threshold dataset
        formattedChartData.datasets.push({
          data: constantThreshold,
          color: () => 'rgba(255, 0, 0, 0.5)',
          strokeWidth: 2, // Make line thicker so it's more visible
          strokeDashArray: [5, 5]
        });
        
        // Ensure the max value includes the threshold
        // This fixes cases where the threshold might not be visible
        formattedChartData.maxValue = Math.max(maxValue, thresholdValue * 1.2);
      }
      
      // Update references
      lastRenderTimeRef.current = now;
      chartDataCacheRef.current = formattedChartData;
      
      setLoading(false);
      return formattedChartData;
    } catch (err) {
      console.error("Error in prepareChartData:", err);
      setError(err.message || "Failed to process chart data");
      setLoading(false);
      return chartDataCacheRef.current || null;
    }
  }, [historicalData, currentValue, thresholdValue, type, color]);

  // Update loading state only when necessary
  useEffect(() => {
    if (!chartData && historicalData.length > 0 && !chartDataCacheRef.current) {
      setLoading(true);
    } else if (chartData) {
      setLoading(false);
    }
  }, [chartData, historicalData]);

  // If we have cached data but loading is still true, use the cached data
  const displayData = chartData || chartDataCacheRef.current;

  if (error && !displayData) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Chart error: {error}</Text>
        <Text style={styles.errorSubtext}>Please try again later</Text>
      </View>
    );
  }

  if ((loading && !displayData) || (!displayData && historicalData.length === 0)) {
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

  // Always use displayData here, which might be the cached version
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{type || 'Sensor'} History ({unit})</Text>
      <LineChart
        key={chartIdRef.current} // Use stable key to prevent recreating the chart
        data={displayData}
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
            r: '3', // Reduced dot size for performance
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
        yAxisSuffix={''}
        segments={5}
        // Use fixed y-axis min and max values
        yAxisMinValue={displayData.minValue}
        yAxisMaxValue={displayData.maxValue}
        fromZero={displayData.minValue === 0} // Start from zero if min is zero
        // Ensure the chart doesn't try to auto-scale
        fromNumber={displayData.minValue}
        toNumber={displayData.maxValue}
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

// Use memo with custom comparison to prevent unnecessary re-renders
export default React.memo(SensorChart, (prevProps, nextProps) => {
  // Only re-render if these props have changed significantly
  return (
    prevProps.type === nextProps.type &&
    Math.abs(prevProps.currentValue - nextProps.currentValue) < 0.1 &&
    prevProps.thresholdValue === nextProps.thresholdValue &&
    prevProps.color === nextProps.color &&
    prevProps.unit === nextProps.unit &&
    // Only check data length as a simple proxy for data change
    prevProps.historicalData.length === nextProps.historicalData.length
  );
}); 