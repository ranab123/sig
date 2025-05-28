import React, { useState, useContext, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, Dimensions, Modal, Switch, ScrollView, Alert, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { BatIconContext } from '../App';
import { useAuth } from '../context/AuthContext';
import { updateSigStatus, getFriendRequestsReceived, getUserFriends } from '../firebase/services';
import { useFocusEffect } from '@react-navigation/native';

const { height, width } = Dimensions.get('window');

// Sample friends data
const friends = [
  { name: 'Brighton', time: 'been on sig for 3 weeks', color: '#7c3aed', initials: 'B' },
  { name: 'Easton', time: 'been on sig for 1 week', color: '#22c55e', initials: 'E' },
  { name: 'Lauren', time: 'been on sig for 3 months', color: '#000', initials: 'L' },
  { name: 'Sophie', time: 'been on sig for 2 weeks', color: '#1e293b', initials: 'S' },
];

const NotSharedScreen = ({ navigation }) => {
  // Use the shared context, with fallback to local state if context isn't available yet
  const batContext = useContext(BatIconContext);
  const [localIsShiny, setLocalIsShiny] = useState(false);
  
  // Use context if available, otherwise use local state
  const isShiny = batContext?.isShiny ?? localIsShiny;
  const setIsShiny = batContext?.setIsShiny ?? setLocalIsShiny;
  
  const [showModal, setShowModal] = useState(false);
  const [showCaveAlert, setShowCaveAlert] = useState(false);
  const [everyoneToggle, setEveryoneToggle] = useState(true);
  const [pendingRequestsCount, setPendingRequestsCount] = useState(0);
  const { currentUser } = useAuth();
  
  // Animation for pulsing effect
  const pulseAnim = useRef(new Animated.Value(1)).current;
  
  // Friends data with selected state
  const [friends, setFriends] = useState([
    { id: '1', name: 'Brighton', time: 'been on sig for 3 weeks', color: '#7c3aed', initials: 'B', selected: true },
    { id: '2', name: 'Easton', time: 'been on sig for 1 week', color: '#22c55e', initials: 'E', selected: true },
    { id: '3', name: 'Lauren', time: 'been on sig for 3 months', color: '#000', initials: 'L', selected: true },
    { id: '4', name: 'Sophie', time: 'been on sig for 2 weeks', color: '#1e293b', initials: 'S', selected: true },
  ]);

  // Pulsing animation effect when sig is off
  useEffect(() => {
    if (!isShiny) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.08,
            duration: 2000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 2000,
            useNativeDriver: true,
          }),
        ])
      );
      pulse.start();
      return () => pulse.stop();
    } else {
      // Reset to normal scale when sig is on
      pulseAnim.setValue(1);
    }
  }, [isShiny]);

  useEffect(() => {
    loadPendingRequests();
    loadFriends();
  }, [currentUser, loadPendingRequests, loadFriends]);
  
  const loadPendingRequests = React.useCallback(async () => {
    if (!currentUser) return;
    
    try {
      const requests = await getFriendRequestsReceived(currentUser.uid);
      setPendingRequestsCount(requests.length);
    } catch (error) {
      console.error('Error loading pending requests:', error);
    }
  }, [currentUser]);

  const loadFriends = React.useCallback(async () => {
    if (!currentUser) return;
    
    try {
      const userFriends = await getUserFriends(currentUser.uid);
      // Convert to the format expected by the modal
      const formattedFriends = userFriends.map((friend, index) => ({
        id: friend.id,
        name: `${friend.firstName} ${friend.lastName}`,
        time: `been on sig for ${Math.floor(Math.random() * 12) + 1} weeks`, // Placeholder
        color: ['#7c3aed', '#22c55e', '#000', '#1e293b'][index % 4],
        initials: friend.firstName?.[0] || '?',
        selected: true
      }));
      setFriends(formattedFriends);
    } catch (error) {
      console.error('Error loading friends:', error);
    }
  }, [currentUser]);

  const handleBatPress = async () => {
    if (isShiny) {
      // If the logo is already shiny, turn off sig
      // Single haptic feedback for turning off
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      
      try {
        if (currentUser) {
          await updateSigStatus(currentUser.uid, false);
        }
        setIsShiny(false);
      } catch (error) {
        console.error('Error updating sig status:', error);
        Alert.alert('Error', 'Failed to update sig status');
      }
    } else {
      // If the logo is normal, show the modal
      setShowModal(true);
    }
  };
  
  const toggleLogoType = () => {
    setIsShiny(!isShiny);
  };
  
  const handleSend = async () => {
    try {
      if (currentUser) {
        await updateSigStatus(currentUser.uid, true);
      }
      setShowModal(false);
      toggleLogoType();
      
      // EXTREMELY INTENSE haptic feedback celebration for turning on sig!
      try {
        // Intense burst of 10 HEAVY haptics for maximum impact
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        setTimeout(async () => {
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        }, 80);
        setTimeout(async () => {
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        }, 160);
        setTimeout(async () => {
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        }, 240);
        setTimeout(async () => {
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        }, 320);
        setTimeout(async () => {
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        }, 400);
        setTimeout(async () => {
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        }, 480);
        setTimeout(async () => {
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        }, 560);
        setTimeout(async () => {
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        }, 640);
        setTimeout(async () => {
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        }, 720);
        
      } catch (error) {
        console.log('Haptic feedback not available:', error);
      }
      
      // Additional send functionality to be defined later
    } catch (error) {
      console.error('Error updating sig status:', error);
      Alert.alert('Error', 'Failed to update sig status');
    }
  };
  
  const toggleFriendSelection = (id) => {
    setFriends(friends.map(friend => 
      friend.id === id ? {...friend, selected: !friend.selected} : friend
    ));
  };

  const handleCaveNavigation = () => {
    if (isShiny) {
      // Allow navigation to the cave if sig is on
      navigation.navigate('TheCave');
    } else {
      // Show an alert if sig is not on
      setShowCaveAlert(true);
    }
  };

  const handleNotificationsPress = () => {
    navigation.navigate('FriendsScreen');
  };

  const handleSettingsPress = () => {
    navigation.navigate('Settings');
  };

  useFocusEffect(
    React.useCallback(() => {
      loadPendingRequests();
      loadFriends();
    }, [loadPendingRequests, loadFriends])
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={handleSettingsPress} style={styles.headerButton}>
          <Ionicons name="settings-outline" size={24} color="#111" />
        </TouchableOpacity>
        <Text style={styles.headerText}>my sig</Text>
        <TouchableOpacity onPress={handleNotificationsPress} style={styles.headerButton}>
          <Ionicons name="people-outline" size={24} color="#111" />
          {pendingRequestsCount > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{pendingRequestsCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>
      
      <View style={styles.content}>
        <TouchableOpacity 
          onPress={handleBatPress} 
          activeOpacity={0.8}
          style={styles.logoWrapper}
        >
          <Animated.View style={{ transform: [{ scale: !isShiny ? pulseAnim : 1 }] }}>
            <Image 
              source={isShiny 
                ? require('../assets/shiny-bat-logo.png')
                : require('../assets/bat sig.png')} 
              style={[
                styles.batLogo,
                isShiny && styles.shinyBatLogo
              ]} 
              resizeMode="contain"
            />
          </Animated.View>
        </TouchableOpacity>
        {!isShiny && (
          <Animated.Text 
            style={[styles.hintText, { opacity: pulseAnim }]}
          >
            tap to turn on your sig
          </Animated.Text>
        )}
      </View>
      
      <View style={styles.bottomNavContainer}>
        <View style={styles.bottomNav}>
          <TouchableOpacity style={styles.navItemActive}>
            <Ionicons name="person-outline" size={32} color="#7c3aed" />
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.navItem}
            onPress={handleCaveNavigation}
          >
            <Image 
              source={require('../assets/caveVector.png')} 
              style={styles.caveIcon}
              resizeMode="contain"
            />
          </TouchableOpacity>
        </View>
      </View>
      
      {/* Send Sig Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={showModal}
        onRequestClose={() => setShowModal(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowModal(false)}
        >
          <TouchableOpacity 
            style={styles.modalContainer}
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
          >
            <Text style={styles.modalTitle}>send a sig to...</Text>
            
            <View style={styles.toggleContainer}>
              <Text style={styles.toggleText}>Everyone</Text>
              <Switch
                value={everyoneToggle}
                onValueChange={setEveryoneToggle}
                trackColor={{ false: '#ccc', true: '#111' }}
                thumbColor={everyoneToggle ? '#fff' : '#fff'}
                ios_backgroundColor="#ccc"
              />
            </View>
            
            {!everyoneToggle && (
              <ScrollView style={styles.friendsList}>
                {friends.map((friend) => (
                  <View key={friend.id} style={styles.friendItem}>
                    <View style={styles.friendInfo}>
                      <View style={[styles.friendAvatar, { backgroundColor: friend.color }]}>
                        <Text style={styles.friendInitials}>{friend.initials}</Text>
                      </View>
                      <Text style={styles.friendName}>{friend.name}</Text>
                    </View>
                    <Switch
                      value={friend.selected}
                      onValueChange={() => toggleFriendSelection(friend.id)}
                      trackColor={{ false: '#ccc', true: '#111' }}
                      thumbColor={friend.selected ? '#fff' : '#fff'}
                      ios_backgroundColor="#ccc"
                    />
                  </View>
                ))}
              </ScrollView>
            )}
            
            <TouchableOpacity 
              style={styles.sendButton}
              onPress={handleSend}
            >
              <Text style={styles.sendButtonText}>Send</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
      
      {/* Cave Alert Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={showCaveAlert}
        onRequestClose={() => setShowCaveAlert(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.alertContainer}>
            <Text style={styles.alertTitle}>Cannot Enter Cave</Text>
            <Text style={styles.alertMessage}>You must turn on your sig before you can enter the cave.</Text>
            <TouchableOpacity 
              style={styles.alertButton}
              onPress={() => setShowCaveAlert(false)}
            >
              <Text style={styles.alertButtonText}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    marginTop: height / 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  headerButton: {
    padding: 8,
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: '#ef4444',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  headerText: {
    fontSize: 32,
    fontWeight: 'bold',
  },
  content: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoWrapper: {
    width: 350,
    height: 350,
    justifyContent: 'center',
    alignItems: 'center',
  },
  batLogo: {
    width: 297,
    height: 297,
    resizeMode: 'contain',
  },
  shinyBatLogo: {
    width: 338,
    height: 338,
  },
  bottomNavContainer: {
    position: 'absolute',
    bottom: height / 10,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  bottomNav: {
    flexDirection: 'row',
    borderRadius: 10,
    overflow: 'hidden',
    width: 250,
    height: 60,
  },
  navItem: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f2f2f2',
  },
  navItemActive: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#111',
  },
  caveIcon: {
    width: 32,
    height: 32,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContainer: {
    backgroundColor: '#f5f5f5',
    width: width * 0.85,
    padding: 25,
    borderRadius: 25,
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 28,
    fontWeight: '600',
    marginBottom: 30,
    textAlign: 'center',
  },
  toggleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingVertical: 18,
    borderRadius: 20,
    marginBottom: 30,
  },
  toggleText: {
    fontSize: 22,
    fontWeight: '600',
  },
  friendsList: {
    width: '100%',
    maxHeight: 300,
    marginBottom: 20,
  },
  friendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 5,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  friendInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  friendAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  friendInitials: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  friendName: {
    fontSize: 18,
    fontWeight: '500',
  },
  sendButton: {
    backgroundColor: '#111',
    paddingVertical: 15,
    paddingHorizontal: 60,
    borderRadius: 30,
    marginTop: 10,
  },
  sendButtonText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '600',
  },
  // Alert Modal Styles
  alertContainer: {
    backgroundColor: '#fff',
    width: width * 0.8,
    padding: 25,
    borderRadius: 15,
    alignItems: 'center',
  },
  alertTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
    textAlign: 'center',
  },
  alertMessage: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 25,
    lineHeight: 22,
  },
  alertButton: {
    backgroundColor: '#111',
    paddingVertical: 12,
    paddingHorizontal: 40,
    borderRadius: 25,
  },
  alertButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  hintText: {
    fontSize: 16,
    color: '#666',
    marginTop: 30,
    fontStyle: 'italic',
    textAlign: 'center',
  },
});

export default NotSharedScreen; 