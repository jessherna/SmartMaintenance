import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text, Menu, Button, IconButton } from 'react-native-paper';

/**
 * Component for selecting time ranges for sensor data display
 */
const TimeRangeSelector = ({ selectedRange, onRangeChange }) => {
  const [menuVisible, setMenuVisible] = useState(false);
  
  // Available time ranges in minutes
  const timeRanges = [
    { label: 'Live', value: 0 },
    { label: '5m', value: 5 },
    { label: '10m', value: 10 },
    { label: '30m', value: 30 },
    { label: '1h', value: 60 },
    { label: '24h', value: 1440 }
  ];
  
  // Get the label for the currently selected range
  const getSelectedLabel = () => {
    const selected = timeRanges.find(range => range.value === selectedRange);
    return selected ? selected.label : 'Live';
  };
  
  // Handle opening the menu
  const openMenu = () => setMenuVisible(true);
  
  // Handle closing the menu
  const closeMenu = () => setMenuVisible(false);
  
  // Handle selecting an item from the menu
  const handleSelect = (value) => {
    onRangeChange(value);
    closeMenu();
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Updates</Text>
      <Menu
        visible={menuVisible}
        onDismiss={closeMenu}
        anchor={
          <TouchableOpacity style={styles.dropdownButton} onPress={openMenu}>
            <Text style={[
              styles.selectedText,
              selectedRange === 0 ? styles.liveText : null
            ]}>
              {getSelectedLabel()}
            </Text>
            <IconButton 
              icon="chevron-down" 
              size={16} 
              style={styles.dropdownIcon} 
              color={selectedRange === 0 ? '#4CAF50' : '#2196F3'}
            />
          </TouchableOpacity>
        }
      >
        {timeRanges.map(range => (
          <Menu.Item
            key={range.value}
            onPress={() => handleSelect(range.value)}
            title={range.label}
            titleStyle={[
              styles.menuItemText,
              range.value === 0 ? styles.liveMenuItemText : null,
              selectedRange === range.value ? styles.selectedMenuItemText : null
            ]}
            style={[
              styles.menuItem,
              selectedRange === range.value ? styles.selectedMenuItem : null
            ]}
          />
        ))}
      </Menu>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'flex-end',
  },
  dropdownButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 12,
    paddingVertical: 2,
    paddingLeft: 10,
    paddingRight: 0,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    height: 24,
  },
  selectedText: {
    fontWeight: 'bold',
    fontSize: 12,
    color: '#2196F3',
  },
  liveText: {
    color: '#4CAF50',
  },
  dropdownIcon: {
    margin: 0,
    padding: 0,
    width: 20,
    height: 20,
  },
  menuItem: {
    height: 40,
  },
  selectedMenuItem: {
    backgroundColor: 'rgba(33, 150, 243, 0.1)',
  },
  menuItemText: {
    fontSize: 14,
  },
  selectedMenuItemText: {
    fontWeight: 'bold',
  },
  liveMenuItemText: {
    color: '#4CAF50',
  },
  label: {
    fontSize: 10,
    color: '#757575',
    marginBottom: 2,
    textAlign: 'right',
  }
});

export default TimeRangeSelector; 