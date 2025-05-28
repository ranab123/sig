import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, SafeAreaView, ActivityIndicator, Alert, TextInput, Switch } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Contacts from 'expo-contacts';
import { checkUserExistsByPhone, sendFriendRequest, searchUsersByPhoneNumbers } from '../firebase/services';
import { useAuth } from '../context/AuthContext';

// Isolated phone input component to prevent keyboard dismissal
const PhoneInput = React.memo(({ onSendRequest, isSending }) => {
  const [phoneValue, setPhoneValue] = useState('');
  
  console.log('PhoneInput render - phoneValue:', phoneValue);
  
  const formatPhoneNumber = (text) => {
    const cleaned = text.replace(/\D/g, '');
    let formatted = '';
    if (cleaned.length > 0) {
      formatted += '(';
      formatted += cleaned.substring(0, 3);
      if (cleaned.length > 3) {
        formatted += ') ';
        formatted += cleaned.substring(3, 6);
        if (cleaned.length > 6) {
          formatted += '-';
          formatted += cleaned.substring(6, 10);
        }
      }
    }
    return formatted;
  };

  const handleTextChange = (text) => {
    console.log('PhoneInput handleTextChange:', text);
    const formatted = formatPhoneNumber(text);
    setPhoneValue(formatted);
  };

  const handleSendPress = () => {
    onSendRequest(phoneValue);
    setPhoneValue(''); // Clear after sending
  };

  return (
    <View style={styles.manualContainer}>
      <Text style={styles.manualTitle}>Add Friend by Phone Number</Text>
      <TextInput
        style={styles.phoneInput}
        placeholder="(xxx) xxx-xxxx"
        placeholderTextColor="#B0B0B0"
        value={phoneValue}
        onChangeText={handleTextChange}
        keyboardType="phone-pad"
        maxLength={14}
        autoFocus={false}
        blurOnSubmit={false}
      />
      <TouchableOpacity
        style={[
          styles.manualSearchButton,
          (!phoneValue || isSending) && styles.disabledButton
        ]}
        onPress={handleSendPress}
        disabled={!phoneValue || isSending}
      >
        {isSending ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : (
          <Text style={styles.manualSearchButtonText}>Send Request</Text>
        )}
      </TouchableOpacity>
    </View>
  );
});

const AddFriendScreen = ({ navigation }) => {
  const [searchMode, setSearchMode] = useState('contacts'); // 'contacts' or 'manual'
  const [contacts, setContacts] = useState([]);
  const [filteredContacts, setFilteredContacts] = useState([]);
  const [usersOnApp, setUsersOnApp] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [sendingRequests, setSendingRequests] = useState(new Set());
  const [hasContactsPermission, setHasContactsPermission] = useState(false);
  const [isManualSending, setIsManualSending] = useState(false);
  const { currentUser } = useAuth();

  // Remove the debug log that was causing re-renders
  // console.log('AddFriendScreen render - manualPhoneNumber:', manualPhoneNumber);

  useEffect(() => {
    checkContactsPermission();
  }, []);

  useEffect(() => {
    if (searchMode === 'contacts' && hasContactsPermission) {
      loadContacts();
    }
  }, [searchMode, hasContactsPermission]);

  useEffect(() => {
    if (searchText && contacts.length > 0) {
      const filtered = contacts.filter(contact => 
        contact.name?.toLowerCase().includes(searchText.toLowerCase()) ||
        contact.phoneNumbers?.some(phone => 
          phone.number?.includes(searchText)
        )
      );
      setFilteredContacts(filtered);
    } else {
      setFilteredContacts(contacts);
    }
  }, [searchText, contacts]);

  const checkContactsPermission = async () => {
    try {
      const { status } = await Contacts.getPermissionsAsync();
      setHasContactsPermission(status === 'granted');
    } catch (error) {
      console.error('Error checking contacts permission:', error);
    }
  };

  const requestContactsPermission = async () => {
    try {
      const { status } = await Contacts.requestPermissionsAsync();
      setHasContactsPermission(status === 'granted');
      if (status === 'granted') {
        loadContacts();
      }
    } catch (error) {
      console.error('Error requesting contacts permission:', error);
      Alert.alert('Error', 'Failed to request contacts permission');
    }
  };

  const loadContacts = async () => {
    try {
      setLoading(true);
      const { data } = await Contacts.getContactsAsync({
        fields: [Contacts.Fields.PhoneNumbers, Contacts.Fields.Name],
      });
      
      // Process contacts and extract phone numbers
      const processedContacts = [];
      const phoneNumbers = [];
      
      data.forEach(contact => {
        if (contact.phoneNumbers && contact.phoneNumbers.length > 0) {
          contact.phoneNumbers.forEach(phoneObj => {
            if (phoneObj.number) {
              let normalizedNumber = phoneObj.number.replace(/\D/g, '');
              if (normalizedNumber.length === 10) {
                normalizedNumber = `+1${normalizedNumber}`;
              } else if (normalizedNumber.length > 10 && !normalizedNumber.startsWith('+')) {
                normalizedNumber = `+${normalizedNumber}`;
              }
              
              processedContacts.push({
                id: `${contact.id}-${phoneObj.number}`,
                name: contact.name || `${contact.firstName || ''} ${contact.lastName || ''}`.trim(),
                phoneNumber: normalizedNumber,
                originalContact: contact
              });
              
              phoneNumbers.push(normalizedNumber);
            }
          });
        }
      });
      
      setContacts(processedContacts);
      
      // Check which contacts are on the app
      const usersFound = await searchUsersByPhoneNumbers(phoneNumbers);
      setUsersOnApp(usersFound);
      
    } catch (error) {
      console.error('Error loading contacts:', error);
      Alert.alert('Error', 'Failed to load contacts');
    } finally {
      setLoading(false);
    }
  };

  const handleManualFriendRequest = async (phoneNumber) => {
    if (!currentUser || isManualSending) return;
    
    try {
      setIsManualSending(true);
      
      // Format phone number for search
      const digits = phoneNumber.replace(/\D/g, '');
      if (digits.length !== 10) {
        Alert.alert('Invalid Phone Number', 'Please enter a valid 10-digit phone number');
        return;
      }
      const formattedNumber = `+1${digits}`;
      
      // Check if user exists
      const userCheck = await checkUserExistsByPhone(formattedNumber);
      
      if (!userCheck.exists) {
        Alert.alert(
          'User Not Found',
          'This person is not on sig yet. Invite them to join!',
          [
            { text: 'OK', style: 'cancel' }
          ]
        );
        return;
      }
      
      // Check if it's the current user
      if (userCheck.userId === currentUser.uid) {
        Alert.alert('Error', 'You cannot send a friend request to yourself');
        return;
      }
      
      // Send friend request
      await sendFriendRequest(currentUser.uid, userCheck.userId);
      
      Alert.alert('Success', 'Friend request sent!');
      
    } catch (error) {
      console.error('Error sending friend request:', error);
      Alert.alert('Error', 'Failed to send friend request');
    } finally {
      setIsManualSending(false);
    }
  };

  const handleSendFriendRequest = async (phoneNumber, isManual = false) => {
    if (!currentUser || sendingRequests.has(phoneNumber)) return;
    
    try {
      setSendingRequests(prev => new Set(prev).add(phoneNumber));
      
      // Format phone number for search
      let formattedNumber = phoneNumber;
      if (isManual) {
        const digits = phoneNumber.replace(/\D/g, '');
        if (digits.length !== 10) {
          Alert.alert('Invalid Phone Number', 'Please enter a valid 10-digit phone number');
          return;
        }
        formattedNumber = `+1${digits}`;
      }
      
      // Check if user exists
      const userCheck = await checkUserExistsByPhone(formattedNumber);
      
      if (!userCheck.exists) {
        Alert.alert(
          'User Not Found',
          'This person is not on sig yet. Invite them to join!',
          [
            { text: 'OK', style: 'cancel' }
          ]
        );
        return;
      }
      
      // Check if it's the current user
      if (userCheck.userId === currentUser.uid) {
        Alert.alert('Error', 'You cannot send a friend request to yourself');
        return;
      }
      
      // Send friend request
      await sendFriendRequest(currentUser.uid, userCheck.userId);
      
      Alert.alert('Success', 'Friend request sent!');
      
    } catch (error) {
      console.error('Error sending friend request:', error);
      Alert.alert('Error', 'Failed to send friend request');
    } finally {
      setSendingRequests(prev => {
        const newSet = new Set(prev);
        newSet.delete(phoneNumber);
        return newSet;
      });
    }
  };

  const renderContactItem = ({ item }) => {
    const userOnApp = usersOnApp.find(user => user.phoneNumber === item.phoneNumber);
    const isProcessing = sendingRequests.has(item.phoneNumber);
    
    return (
      <View style={styles.contactItem}>
        <View style={styles.contactInfo}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {item.name?.[0] || '?'}
            </Text>
          </View>
          <View style={styles.userInfo}>
            <Text style={styles.userName}>{item.name}</Text>
            <Text style={styles.phoneNumber}>{item.phoneNumber}</Text>
            {userOnApp && (
              <Text style={styles.onAppText}>On sig</Text>
            )}
          </View>
        </View>
        
        {userOnApp ? (
          <TouchableOpacity
            style={[styles.requestButton, isProcessing && styles.disabledButton]}
            onPress={() => handleSendFriendRequest(item.phoneNumber)}
            disabled={isProcessing}
          >
            {isProcessing ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.requestButtonText}>Add</Text>
            )}
          </TouchableOpacity>
        ) : (
          <View style={styles.notOnAppContainer}>
            <Text style={styles.notOnAppText}>Not on sig</Text>
          </View>
        )}
      </View>
    );
  };

  const ContactsPermissionView = () => (
    <View style={styles.permissionContainer}>
      <Ionicons name="contacts-outline" size={64} color="#ccc" />
      <Text style={styles.permissionTitle}>Access Your Contacts</Text>
      <Text style={styles.permissionText}>
        Allow sig to access your contacts to find friends who are already on the app
      </Text>
      <TouchableOpacity style={styles.permissionButton} onPress={requestContactsPermission}>
        <Text style={styles.permissionButtonText}>Allow Access</Text>
      </TouchableOpacity>
    </View>
  );

  const ManualSearchView = React.memo(() => {
    console.log('ManualSearchView render - using PhoneInput component');
    
    return (
      <PhoneInput 
        onSendRequest={handleManualFriendRequest}
        isSending={isManualSending}
      />
    );
  });

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#111" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Add Friends</Text>
        <View style={styles.placeholder} />
      </View>

      <View style={styles.toggleContainer}>
        <TouchableOpacity
          style={[styles.toggleButton, searchMode === 'contacts' && styles.activeToggle]}
          onPress={() => setSearchMode('contacts')}
        >
          <Text style={[styles.toggleText, searchMode === 'contacts' && styles.activeToggleText]}>
            Contacts
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.toggleButton, searchMode === 'manual' && styles.activeToggle]}
          onPress={() => setSearchMode('manual')}
        >
          <Text style={[styles.toggleText, searchMode === 'manual' && styles.activeToggleText]}>
            Phone Number
          </Text>
        </TouchableOpacity>
      </View>

      {searchMode === 'contacts' ? (
        !hasContactsPermission ? (
          <ContactsPermissionView />
        ) : (
          <View style={styles.contactsContainer}>
            <TextInput
              style={styles.searchInput}
              placeholder="Search contacts..."
              placeholderTextColor="#B0B0B0"
              value={searchText}
              onChangeText={setSearchText}
            />
            
            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#111" />
                <Text style={styles.loadingText}>Loading contacts...</Text>
              </View>
            ) : (
              <FlatList
                data={filteredContacts}
                renderItem={renderContactItem}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.listContainer}
                showsVerticalScrollIndicator={false}
              />
            )}
          </View>
        )
      ) : (
        <ManualSearchView />
      )}
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
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  backButton: {
    padding: 5,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111',
  },
  placeholder: {
    width: 34,
  },
  toggleContainer: {
    flexDirection: 'row',
    margin: 20,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    padding: 4,
  },
  toggleButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 6,
  },
  activeToggle: {
    backgroundColor: '#111',
  },
  toggleText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
  },
  activeToggleText: {
    color: '#fff',
  },
  contactsContainer: {
    flex: 1,
    paddingHorizontal: 20,
  },
  searchInput: {
    height: 44,
    borderColor: '#D3D3D3',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 16,
    fontSize: 16,
    marginBottom: 20,
    backgroundColor: '#fff',
    color: '#111',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  listContainer: {
    paddingBottom: 20,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#f8f8f8',
    borderRadius: 12,
    marginBottom: 8,
  },
  contactInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    width: 45,
    height: 45,
    borderRadius: 22.5,
    backgroundColor: '#111',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111',
    marginBottom: 2,
  },
  phoneNumber: {
    fontSize: 14,
    color: '#666',
  },
  onAppText: {
    fontSize: 12,
    color: '#22c55e',
    fontWeight: '500',
    marginTop: 2,
  },
  requestButton: {
    backgroundColor: '#111',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
  },
  requestButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  notOnAppContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  notOnAppText: {
    color: '#999',
    fontSize: 12,
  },
  disabledButton: {
    opacity: 0.6,
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  permissionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111',
    marginTop: 20,
    marginBottom: 10,
  },
  permissionText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 30,
  },
  permissionButton: {
    backgroundColor: '#111',
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 8,
  },
  permissionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  manualContainer: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 40,
  },
  manualTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111',
    marginBottom: 20,
    textAlign: 'center',
  },
  phoneInput: {
    height: 48,
    borderColor: '#D3D3D3',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 16,
    fontSize: 16,
    marginBottom: 20,
    backgroundColor: '#fff',
    color: '#111',
  },
  manualSearchButton: {
    backgroundColor: '#111',
    paddingVertical: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  manualSearchButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
});

export default AddFriendScreen; 