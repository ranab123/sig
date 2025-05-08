import React, { useState, useContext, useEffect } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, Dimensions, FlatList } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BatIconContext } from '../App';

const { height, width } = Dimensions.get('window');

const TheCaveScreen = ({ navigation }) => {
  // Access the shared bat icon state with fallback
  const batContext = useContext(BatIconContext);
  const isShiny = batContext?.isShiny ?? false;
  
  // Check if user can access the cave
  useEffect(() => {
    if (!isShiny) {
      // If bat is not shiny, redirect back to NotShared
      navigation.replace('NotShared');
    }
  }, [isShiny, navigation]);

  // Sample friends data with active status
  const [friends, setFriends] = useState([
    { id: '1', name: 'Brighton', isActive: true },
    { id: '2', name: 'Easton', isActive: true },
    { id: '3', name: 'Lauren', isActive: false },
    { id: '4', name: 'Sophie', isActive: false }
  ]);

  const renderFriend = ({ item }) => (
    <View style={[
      styles.friendItem, 
      item.isActive && styles.activeFriendItem
    ]}>
      <Text style={[
        styles.friendName,
        item.isActive && styles.activeItemText
      ]}>{item.name}</Text>
      <View style={[
        styles.statusIndicator,
        item.isActive ? styles.activeIndicator : styles.inactiveIndicator
      ]} />
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerText}>the cave</Text>
      </View>
      
      <View style={styles.content}>
        <FlatList
          data={friends}
          renderItem={renderFriend}
          keyExtractor={item => item.id}
          showsVerticalScrollIndicator={false}
          style={styles.friendsList}
          contentContainerStyle={styles.friendsListContent}
        />
      </View>
      
      <View style={styles.bottomNavContainer}>
        <View style={styles.bottomNav}>
          <TouchableOpacity 
            style={styles.navItem}
            onPress={() => navigation.navigate('NotShared')}
          >
            <Ionicons name="person-outline" size={32} color="#111" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.navItemActive}>
            <Image 
              source={require('../assets/caveVector.png')} 
              style={styles.caveIcon}
              resizeMode="contain"
            />
          </TouchableOpacity>
        </View>
      </View>
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
    marginBottom: 20,
  },
  headerText: {
    fontSize: 32,
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
    width: '100%',
    paddingBottom: 100, // Space for bottom nav
  },
  friendsList: {
    width: '100%',
  },
  friendsListContent: {
    paddingBottom: 20,
  },
  friendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 20,
    paddingHorizontal: 25,
    backgroundColor: '#f2f2f2',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  activeFriendItem: {
    backgroundColor: '#000',
  },
  friendName: {
    fontSize: 22,
    fontWeight: '500',
    color: '#111',
  },
  activeItemText: {
    color: '#fff',
  },
  statusIndicator: {
    width: 24,
    height: 24,
    borderRadius: 12,
  },
  activeIndicator: {
    backgroundColor: '#7c3aed', // Purple for active
  },
  inactiveIndicator: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: '#111',
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
    tintColor: '#7c3aed', // Purple tint to indicate active
  }
});

export default TheCaveScreen; 