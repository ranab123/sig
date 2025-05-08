import React, { useState, useContext } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, Dimensions, Modal, Switch, ScrollView, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BatIconContext } from '../App';

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
  
  // Friends data with selected state
  const [friends, setFriends] = useState([
    { id: '1', name: 'Brighton', time: 'been on sig for 3 weeks', color: '#7c3aed', initials: 'B', selected: true },
    { id: '2', name: 'Easton', time: 'been on sig for 1 week', color: '#22c55e', initials: 'E', selected: true },
    { id: '3', name: 'Lauren', time: 'been on sig for 3 months', color: '#000', initials: 'L', selected: true },
    { id: '4', name: 'Sophie', time: 'been on sig for 2 weeks', color: '#1e293b', initials: 'S', selected: true },
  ]);
  
  const handleBatPress = () => {
    if (isShiny) {
      // If the logo is already shiny, just toggle it back to normal
      setIsShiny(false);
    } else {
      // If the logo is normal, show the modal
      setShowModal(true);
    }
  };
  
  const toggleLogoType = () => {
    setIsShiny(!isShiny);
  };
  
  const handleSend = () => {
    setShowModal(false);
    toggleLogoType();
    // Additional send functionality to be defined later
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

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerText}>my sig</Text>
      </View>
      
      <View style={styles.content}>
        <TouchableOpacity 
          onPress={handleBatPress} 
          activeOpacity={0.8}
          style={styles.logoWrapper}
        >
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
        </TouchableOpacity>
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
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
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
          </View>
        </View>
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
    alignItems: 'center',
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
    width: 250,
    height: 250,
    justifyContent: 'center',
    alignItems: 'center',
  },
  batLogo: {
    width: 220,
    height: 220,
    resizeMode: 'contain',
  },
  shinyBatLogo: {
    width: 250,
    height: 250,
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
  }
});

export default NotSharedScreen; 