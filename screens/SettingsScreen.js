import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Switch, TouchableOpacity, SafeAreaView, Alert, ScrollView, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Contacts from 'expo-contacts';
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';

const SettingsScreen = ({ navigation }) => {
  const [permissions, setPermissions] = useState({
    contacts: false,
    location: false,
    notifications: false,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkPermissions();
  }, []);

  // Re-check permissions when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      checkPermissions();
    }, [])
  );

  const checkPermissions = async () => {
    try {
      // Check contacts permission
      const contactsStatus = await Contacts.getPermissionsAsync();
      
      // Check location permission
      const locationStatus = await Location.getForegroundPermissionsAsync();
      
      // Check notifications permission
      const notificationsStatus = await Notifications.getPermissionsAsync();
      
      setPermissions({
        contacts: contactsStatus.status === 'granted',
        location: locationStatus.status === 'granted',
        notifications: notificationsStatus.status === 'granted',
      });
    } catch (error) {
      console.error('Error checking permissions:', error);
    } finally {
      setLoading(false);
    }
  };

  const openDeviceSettings = () => {
    Alert.alert(
      'Open Settings',
      'You need to change this permission in your device settings.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Open Settings', 
          onPress: () => {
            // This will open the app's settings page on both iOS and Android
            Linking.openSettings();
          }
        }
      ]
    );
  };

  const handleContactsToggle = async (value) => {
    if (value) {
      // Request permission
      try {
        const { status } = await Contacts.requestPermissionsAsync();
        if (status === 'granted') {
          setPermissions(prev => ({ ...prev, contacts: true }));
          await AsyncStorage.setItem('contactsPermissionGranted', 'true');
        } else {
          // Permission denied, show alert and keep switch off
          Alert.alert(
            'Permission Denied',
            'Contacts access is required to sync your contacts and find friends. You can enable it in Settings.',
            [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Open Settings', onPress: openDeviceSettings }
            ]
          );
          // Re-check permissions to ensure UI is accurate
          await checkPermissions();
        }
      } catch (error) {
        console.error('Error requesting contacts permission:', error);
        Alert.alert('Error', 'Failed to request contacts permission');
        await checkPermissions();
      }
    } else {
      // User wants to turn off permission - direct them to settings
      Alert.alert(
        'Disable Contacts Access',
        'To disable contacts access, you need to change this setting in your device settings.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Open Settings', onPress: openDeviceSettings }
        ]
      );
    }
  };

  const handleLocationToggle = async (value) => {
    if (value) {
      // Request permission
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          setPermissions(prev => ({ ...prev, location: true }));
          await AsyncStorage.setItem('locationPermissionGranted', 'true');
        } else {
          // Permission denied, show alert and keep switch off
          Alert.alert(
            'Permission Denied',
            'Location access is required to share your location with friends when your sig is on. You can enable it in Settings.',
            [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Open Settings', onPress: openDeviceSettings }
            ]
          );
          // Re-check permissions to ensure UI is accurate
          await checkPermissions();
        }
      } catch (error) {
        console.error('Error requesting location permission:', error);
        Alert.alert('Error', 'Failed to request location permission');
        await checkPermissions();
      }
    } else {
      // User wants to turn off permission - direct them to settings
      Alert.alert(
        'Disable Location Access',
        'To disable location sharing, you need to change this setting in your device settings.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Open Settings', onPress: openDeviceSettings }
        ]
      );
    }
  };

  const handleNotificationsToggle = async (value) => {
    if (value) {
      // Request permission
      try {
        const { status } = await Notifications.requestPermissionsAsync();
        if (status === 'granted') {
          setPermissions(prev => ({ ...prev, notifications: true }));
          await AsyncStorage.setItem('notificationsPermissionGranted', 'true');
        } else {
          // Permission denied, show alert and keep switch off
          Alert.alert(
            'Permission Denied',
            'Notification access is required to receive friend requests and updates. You can enable it in Settings.',
            [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Open Settings', onPress: openDeviceSettings }
            ]
          );
          // Re-check permissions to ensure UI is accurate
          await checkPermissions();
        }
      } catch (error) {
        console.error('Error requesting notifications permission:', error);
        Alert.alert('Error', 'Failed to request notifications permission');
        await checkPermissions();
      }
    } else {
      // User wants to turn off permission - direct them to settings
      Alert.alert(
        'Disable Notifications',
        'To disable notifications, you need to change this setting in your device settings.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Open Settings', onPress: openDeviceSettings }
        ]
      );
    }
  };

  const PermissionItem = ({ icon, title, description, value, onToggle, iconColor = "#111" }) => (
    <View style={styles.permissionItem}>
      <View style={styles.permissionLeft}>
        <View style={[styles.iconContainer, { backgroundColor: iconColor + '15' }]}>
          <Ionicons name={icon} size={24} color={iconColor} />
        </View>
        <View style={styles.permissionText}>
          <Text style={styles.permissionTitle}>{title}</Text>
          <Text style={styles.permissionDescription}>{description}</Text>
        </View>
      </View>
      <Switch
        value={value}
        onValueChange={onToggle}
        trackColor={{ false: '#ccc', true: '#111' }}
        thumbColor={value ? '#fff' : '#fff'}
        ios_backgroundColor="#ccc"
      />
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#111" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Settings</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Permissions</Text>
          <Text style={styles.sectionDescription}>
            Manage your app permissions to enhance your sig experience
          </Text>
        </View>

        <View style={styles.permissionsContainer}>
          <PermissionItem
            icon="people-outline"
            title="Contacts"
            description="Sync your contacts to find friends on sig"
            value={permissions.contacts}
            onToggle={handleContactsToggle}
            iconColor="#3b82f6"
          />

          <PermissionItem
            icon="location-outline"
            title="Location"
            description="Share your location when your sig is on"
            value={permissions.location}
            onToggle={handleLocationToggle}
            iconColor="#10b981"
          />

          <PermissionItem
            icon="notifications-outline"
            title="Notifications"
            description="Get notified about friend requests and updates"
            value={permissions.notifications}
            onToggle={handleNotificationsToggle}
            iconColor="#f59e0b"
          />
        </View>

        <View style={styles.infoSection}>
          <View style={styles.infoBox}>
            <Ionicons name="information-circle-outline" size={20} color="#666" />
            <Text style={styles.infoText}>
              These permissions help sig work better. You can change them anytime in your device settings.
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111',
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
  },
  section: {
    paddingHorizontal: 20,
    paddingVertical: 24,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111',
    marginBottom: 8,
  },
  sectionDescription: {
    fontSize: 16,
    color: '#666',
    lineHeight: 22,
  },
  permissionsContainer: {
    paddingHorizontal: 20,
  },
  permissionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  permissionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  permissionText: {
    flex: 1,
  },
  permissionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111',
    marginBottom: 4,
  },
  permissionDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 18,
  },
  infoSection: {
    paddingHorizontal: 20,
    paddingVertical: 24,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#f8f9fa',
    padding: 16,
    borderRadius: 12,
  },
  infoText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginLeft: 12,
    flex: 1,
  },
});

export default SettingsScreen; 