import React, { useState } from 'react';
import { View, Text, Switch, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const PermissionsScreen = ({ navigation }) => {
  const [contactsSync, setContactsSync] = useState(false);
  const [notifications, setNotifications] = useState(false);
  const [location, setLocation] = useState(false);

  return (
    <View style={styles.container}>
      <View style={styles.innerContainer}>
        <Text style={styles.title}>sig needs some{"\n"}permissions.</Text>
        <View style={styles.permissionRow}>
          <Switch
            value={contactsSync}
            onValueChange={setContactsSync}
            trackColor={{ false: '#ccc', true: '#111' }}
            thumbColor={contactsSync ? '#fff' : '#fff'}
          />
          <Text style={styles.permissionText}>Allow contacts sync</Text>
        </View>
        <View style={styles.permissionRow}>
          <Switch
            value={notifications}
            onValueChange={setNotifications}
            trackColor={{ false: '#ccc', true: '#111' }}
            thumbColor={notifications ? '#fff' : '#fff'}
          />
          <Text style={styles.permissionText}>Allow notifications</Text>
        </View>
        <View style={styles.permissionRow}>
          <Switch
            value={location}
            onValueChange={setLocation}
            trackColor={{ false: '#ccc', true: '#111' }}
            thumbColor={location ? '#fff' : '#fff'}
          />
          <Text style={styles.permissionText}>Share location</Text>
        </View>
      </View>
      <TouchableOpacity style={styles.fab} onPress={() => navigation && navigation.navigate('SendCaveLink')}>
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