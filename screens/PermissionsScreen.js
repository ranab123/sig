import React, { useState, useEffect } from 'react';
import { View, Text, Switch, StyleSheet, TouchableOpacity, Alert, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Contacts from 'expo-contacts';
import * as Notifications from 'expo-notifications';
import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { LOCATION_TASK } from '../firebase/locationTasks';
import { startForegroundLocationTracking } from '../firebase/locationServices';

const PermissionsScreen = ({ navigation, route }) => {
  // Check if contacts were previously synced from the route params
  const contactsSynced = route.params?.contactsSynced || false;
  
  const [contactsSync, setContactsSync] = useState(contactsSynced);
  const [notifications, setNotifications] = useState(false);
  const [location, setLocation] = useState(false);
  const [loading, setLoading] = useState(true);

  // On component mount, check the status of each permission
  useEffect(() => {
    const checkPermissions = async () => {
      try {
        // Check contacts permission
        const contactStatus = await Contacts.getPermissionsAsync();
        setContactsSync(contactStatus.status === 'granted');
        
        // Check notification permission
        const notificationStatus = await Notifications.getPermissionsAsync();
        setNotifications(notificationStatus.status === 'granted');
        
        // Check location permission
        const locationStatus = await Location.getForegroundPermissionsAsync();
        // For background location, we need to check separately
        const backgroundLocationStatus = await Location.getBackgroundPermissionsAsync();
        
        // Only set location to true if both foreground and background are granted
        setLocation(
          locationStatus.status === 'granted' && 
          backgroundLocationStatus.status === 'granted'
        );
      } catch (error) {
        console.error('Error checking permissions:', error);
      } finally {
        setLoading(false);
      }
    };
    
    checkPermissions();
  }, []);

  const handleContactsToggle = async (value) => {
    try {
      if (value) {
        // Request contacts permission
        const { status } = await Contacts.requestPermissionsAsync();
        const granted = status === 'granted';
        setContactsSync(granted);
        
        if (!granted) {
          Alert.alert(
            'Permission Required', 
            'To sync contacts, please enable contacts access in your device settings.',
            [{ text: 'OK' }]
          );
        }
      } else {
        // We can't revoke permissions programmatically, so just inform the user
        Alert.alert(
          'Permission Info',
          'To revoke contacts access, please go to your device settings.',
          [{ text: 'OK' }]
        );
        // Keep the switch state as is since we can't change the permission
        setContactsSync(true);
      }
    } catch (error) {
      console.error('Error toggling contacts permission:', error);
    }
  };

  const handleNotificationsToggle = async (value) => {
    try {
      if (value) {
        // Request notification permissions
        const { status } = await Notifications.requestPermissionsAsync({
          ios: {
            allowAlert: true,
            allowBadge: true,
            allowSound: true,
            allowAnnouncements: true,
          },
        });
        
        const granted = status === 'granted';
        setNotifications(granted);
        
        if (granted) {
          // Set up notification handler
          Notifications.setNotificationHandler({
            handleNotification: async () => ({
              shouldShowAlert: true,
              shouldPlaySound: true,
              shouldSetBadge: true,
            }),
          });
        } else {
          Alert.alert(
            'Permission Required', 
            'To receive notifications, please enable notification access in your device settings.',
            [{ text: 'OK' }]
          );
        }
      } else {
        // We can't revoke permissions programmatically, so just inform the user
        Alert.alert(
          'Permission Info',
          'To disable notifications, please go to your device settings.',
          [{ text: 'OK' }]
        );
        // Keep the switch state as is since we can't change the permission
        setNotifications(true);
      }
    } catch (error) {
      console.error('Error toggling notification permission:', error);
    }
  };

  const handleLocationToggle = async (value) => {
    try {
      if (value) {
        // First, request foreground location permission
        const foregroundPermission = await Location.requestForegroundPermissionsAsync();
        
        if (foregroundPermission.status !== 'granted') {
          Alert.alert(
            'Permission Required',
            'To share your location, please enable location access in your device settings.',
            [{ text: 'OK' }]
          );
          setLocation(false);
          return;
        }
        
        // In Expo Go, we can't request background permissions, so we'll skip that part
        // and just use foreground permissions
        setLocation(true);
        
        // Check if we're running in a development build or Expo Go
        const isDevBuild = !__DEV__ || process.env.APP_VARIANT === 'development';
        
        if (isDevBuild) {
          try {
            // Only request background permissions in a development build
            console.log('Requesting background location permission...');
            const backgroundPermission = await Location.requestBackgroundPermissionsAsync();
            
            if (backgroundPermission.status === 'granted') {
              // Check if the task is defined before starting it
              const isTaskDefined = await TaskManager.isTaskRegisteredAsync(LOCATION_TASK);
              if (isTaskDefined) {
                // Start location updates
                await Location.startLocationUpdatesAsync(LOCATION_TASK, {
                  accuracy: Location.Accuracy.Balanced,
                  timeInterval: 15000, // 15 seconds
                  distanceInterval: 100, // 100 meters
                  foregroundService: {
                    notificationTitle: 'Location is being tracked',
                    notificationBody: 'sig is using your location to update your status',
                  },
                });
                console.log('Background location updates started');
              } else {
                console.warn('Location task is not registered. Background updates not started.');
              }
            } else {
              console.log('Background permission denied, but foreground is allowed');
            }
          } catch (bgError) {
            console.error('Error requesting background location:', bgError);
            // Continue with just foreground permissions
          }
        } else {
          console.log('Running in Expo Go - background location not available');
          
          // For Expo Go, use our custom foreground location service
          const started = await startForegroundLocationTracking();
          if (started) {
            console.log('Foreground location tracking started successfully');
          } else {
            console.warn('Failed to start foreground location tracking');
          }
        }
      } else {
        // We can't revoke permissions programmatically, so just inform the user
        Alert.alert(
          'Permission Info',
          'To disable location sharing, please go to your device settings.',
          [{ text: 'OK' }]
        );
        // Keep the switch state as is since we can't change the permission
        setLocation(true);
      }
    } catch (error) {
      console.error('Error toggling location permission:', error);
    }
  };

  const handleContinue = () => {
    navigation && navigation.navigate('SendCaveLink');
  };

  // Disable switches while loading
  const isDisabled = loading;

  return (
    <View style={styles.container}>
      <View style={styles.innerContainer}>
        <Text style={styles.title}>sig needs some{"\n"}permissions.</Text>
        <View style={styles.permissionRow}>
          <Switch
            value={contactsSync}
            onValueChange={handleContactsToggle}
            trackColor={{ false: '#ccc', true: '#111' }}
            thumbColor={contactsSync ? '#fff' : '#fff'}
            disabled={isDisabled}
          />
          <Text style={[styles.permissionText, isDisabled && styles.disabledText]}>
            Allow contacts sync
          </Text>
        </View>
        <View style={styles.permissionRow}>
          <Switch
            value={notifications}
            onValueChange={handleNotificationsToggle}
            trackColor={{ false: '#ccc', true: '#111' }}
            thumbColor={notifications ? '#fff' : '#fff'}
            disabled={isDisabled}
          />
          <Text style={[styles.permissionText, isDisabled && styles.disabledText]}>
            Allow notifications
          </Text>
        </View>
        <View style={styles.permissionRow}>
          <Switch
            value={location}
            onValueChange={handleLocationToggle}
            trackColor={{ false: '#ccc', true: '#111' }}
            thumbColor={location ? '#fff' : '#fff'}
            disabled={isDisabled}
          />
          <Text style={[styles.permissionText, isDisabled && styles.disabledText]}>
            Share location
          </Text>
        </View>
      </View>
      <TouchableOpacity 
        style={styles.fab} 
        onPress={handleContinue}
        activeOpacity={0.8}
        disabled={isDisabled}
      >
        <Ionicons name="arrow-forward" size={32} color="#fff" />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  innerContainer: {
    marginTop: 100,
    paddingHorizontal: 24,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#111',
    marginBottom: 40,
  },
  permissionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  permissionText: {
    fontSize: 18,
    marginLeft: 16,
    color: '#111',
  },
  disabledText: {
    color: '#999',
  },
  fab: {
    position: 'absolute',
    right: 32,
    bottom: 48,
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#111',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
});

export default PermissionsScreen; 