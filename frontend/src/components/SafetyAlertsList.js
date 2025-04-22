import React from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  TouchableOpacity,
  Animated,
  Easing
} from 'react-native';
import { Button, Card, Divider, Icon } from 'react-native-paper';

// Define colors for different sensor types
const alertColors = {
  VIBRATION: '#9C27B0', // Purple
  TEMPERATURE: '#F44336', // Red
  CURRENT: '#FF9800', // Orange
  default: '#757575' // Gray as fallback
};

// Icons for different sensor types
const alertIcons = {
  VIBRATION: 'vibrate',
  TEMPERATURE: 'thermometer',
  CURRENT: 'flash',
  default: 'alert-circle'
};

/**
 * Component to display a list of safety alerts
 */
const SafetyAlertsList = ({ 
  alerts = [], 
  onClearAll, 
  onAcknowledge,
  maxAlerts = 5,
  showHeader = true,
  containerStyle = {},
  emptyMessage = "No safety alerts"
}) => {
  // Handle empty state
  if (alerts.length === 0) {
    return (
      <Card style={[styles.container, containerStyle]}>
        {showHeader && (
          <Card.Title 
            title="Safety Alerts" 
            left={(props) => <Icon {...props} source="shield-alert" color="#F44336" size={24} />}
          />
        )}
        <Card.Content style={styles.emptyContainer}>
          <Icon source="shield-check" color="#4CAF50" size={48} />
          <Text style={styles.emptyText}>{emptyMessage}</Text>
        </Card.Content>
      </Card>
    );
  }

  // Render a single alert item
  const renderAlertItem = ({ item, index }) => {
    // Get color based on alert type
    const color = alertColors[item.type] || alertColors.default;
    const icon = alertIcons[item.type] || alertIcons.default;
    
    // Format timestamp
    const time = new Date(item.timestamp);
    const formattedTime = `${time.toLocaleDateString()} ${time.toLocaleTimeString()}`;
    
    return (
      <AlertItem 
        alert={item} 
        color={color} 
        icon={icon}
        formattedTime={formattedTime}
        onAcknowledge={onAcknowledge}
        isNew={index === 0}
      />
    );
  };

  return (
    <Card style={[styles.container, containerStyle]}>
      {showHeader && (
        <Card.Title 
          title="Safety Alerts" 
          subtitle={`${alerts.length} active alerts`}
          left={(props) => <Icon {...props} source="shield-alert" color="#F44336" size={24} />}
          right={(props) => (
            <Button 
              mode="text" 
              onPress={onClearAll}
              labelStyle={{ fontSize: 12 }}
            >
              Clear All
            </Button>
          )}
        />
      )}
      
      <Card.Content style={styles.listContainer}>
        <FlatList
          data={alerts.slice(0, maxAlerts)}
          renderItem={renderAlertItem}
          keyExtractor={(item) => `${item.type}-${item.timestamp}`}
          ItemSeparatorComponent={() => <Divider style={styles.divider} />}
          contentContainerStyle={styles.listContent}
        />
        
        {alerts.length > maxAlerts && (
          <TouchableOpacity style={styles.moreContainer}>
            <Text style={styles.moreText}>View {alerts.length - maxAlerts} more alerts</Text>
          </TouchableOpacity>
        )}
      </Card.Content>
    </Card>
  );
};

/**
 * Single alert item component with animation
 */
const AlertItem = ({ alert, color, icon, formattedTime, onAcknowledge, isNew }) => {
  // Animation value for new alerts
  const [fadeAnim] = React.useState(new Animated.Value(isNew ? 0 : 1));
  const [scaleAnim] = React.useState(new Animated.Value(isNew ? 0.95 : 1));
  
  React.useEffect(() => {
    if (isNew) {
      // Start fade-in animation
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
          easing: Easing.out(Easing.quad)
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
          easing: Easing.out(Easing.back(1.5))
        })
      ]).start();
    }
  }, [isNew]);
  
  return (
    <Animated.View 
      style={[
        styles.alertItem,
        { 
          opacity: fadeAnim,
          transform: [{ scale: scaleAnim }],
          borderLeftColor: color,
        }
      ]}
    >
      <View style={styles.alertHeader}>
        <View style={styles.alertTypeContainer}>
          <Icon source={icon} size={16} color={color} />
          <Text style={[styles.alertType, { color }]}>{alert.type}</Text>
        </View>
        <Text style={styles.alertTime}>{formattedTime}</Text>
      </View>
      
      <Text style={styles.alertMessage}>{alert.message}</Text>
      
      <View style={styles.alertFooter}>
        <Text style={styles.alertValue}>
          Value: {alert.value} {alert.unit} (Threshold: {alert.threshold} {alert.unit})
        </Text>
        
        {onAcknowledge && (
          <Button 
            mode="text" 
            compact 
            onPress={() => onAcknowledge(alert)}
            style={styles.acknowledgeButton}
            labelStyle={{ fontSize: 12 }}
          >
            Acknowledge
          </Button>
        )}
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 15,
    elevation: 2,
  },
  listContainer: {
    paddingHorizontal: 0,
    paddingBottom: 0,
  },
  listContent: {
    paddingHorizontal: 16,
  },
  alertItem: {
    paddingVertical: 12,
    borderLeftWidth: 4,
    paddingLeft: 12,
  },
  alertHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  alertTypeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  alertType: {
    fontWeight: 'bold',
    marginLeft: 4,
  },
  alertTime: {
    fontSize: 12,
    color: '#757575',
  },
  alertMessage: {
    marginBottom: 8,
  },
  alertFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  alertValue: {
    fontSize: 12,
    color: '#757575',
    flex: 1,
  },
  acknowledgeButton: {
    marginLeft: 8,
  },
  divider: {
    height: 1,
    backgroundColor: '#e0e0e0',
  },
  emptyContainer: {
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    marginTop: 12,
    color: '#757575',
    fontSize: 16,
  },
  moreContainer: {
    paddingVertical: 12,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  moreText: {
    color: '#2196F3',
    fontWeight: '500',
  },
});

export default SafetyAlertsList; 