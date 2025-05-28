import React, { useState, useContext, useEffect } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, Dimensions, FlatList } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BatIconContext } from '../App';
import { useAuth } from '../context/AuthContext';
import { getUserFriends } from '../firebase/services';

const { height, width } = Dimensions.get('window');

const TheCaveScreen = ({ navigation }) => {
  // Access the shared bat icon state with fallback
  const batContext = useContext(BatIconContext);
  const isShiny = batContext?.isShiny ?? false;
  const { currentUser } = useAuth();
  
  // Check if user can access the cave
  useEffect(() => {
    if (!isShiny) {
      // If bat is not shiny, redirect back to NotShared
      navigation.replace('NotShared');
    }
  }, [isShiny, navigation]);

  // Friends data with actual sig status and location
  const [friends, setFriends] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadFriends();
  }, [currentUser]);

  const loadFriends = async () => {
    if (!currentUser) return;
    
    try {
      const userFriends = await getUserFriends(currentUser.uid);
      setFriends(userFriends);
    } catch (error) {
      console.error('Error loading friends:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatLocationText = (friend) => {
    if (!friend.sigStatus || !friend.location) {
      return friend.sigStatus ? 'Available' : 'Not available';
    }

    const { buildingName, timestamp } = friend.location;
    
    // Handle cases where buildingName might be undefined (legacy data)
    const safeBuildingName = buildingName && buildingName.trim() ? buildingName.trim() : 'Unknown Location';
    
    // Calculate time since last update
    const lastUpdate = new Date(timestamp);
    const now = new Date();
    const diffMinutes = Math.floor((now - lastUpdate) / (1000 * 60));
    
    let timeText = '';
    if (diffMinutes < 1) {
      timeText = 'just now';
    } else if (diffMinutes < 60) {
      timeText = `${diffMinutes}m ago`;
    } else {
      const diffHours = Math.floor(diffMinutes / 60);
      if (diffHours < 24) {
        timeText = `${diffHours}h ago`;
      } else {
        const diffDays = Math.floor(diffHours / 24);
        timeText = `${diffDays}d ago`;
      }
    }
    
    return `at ${safeBuildingName} • ${timeText}`;
  };

  const renderFriend = ({ item }) => (
    <View style={[
      styles.friendItem, 
      item.sigStatus && styles.activeFriendItem
    ]}>
      <View style={styles.friendInfo}>
        <View style={styles.friendAvatar}>
          <Text style={styles.friendAvatarText}>
            {item.firstName?.[0] || '?'}
          </Text>
        </View>
        <View style={styles.friendDetails}>
          <Text style={[
            styles.friendName,
            item.sigStatus && styles.activeItemText
          ]}>
            {item.firstName} {item.lastName}
          </Text>
          <Text style={[
            styles.friendStatus,
            item.sigStatus && styles.activeItemText
          ]}>
            {formatLocationText(item)}
          </Text>
          {item.sigStatus && item.location && (
            <View style={styles.locationContainer}>
              <Ionicons 
                name="location-outline" 
                size={12} 
                color={item.sigStatus ? "#22c55e" : "#666"} 
                style={styles.locationIcon}
              />
            </View>
          )}
        </View>
      </View>
      <View style={[
        styles.statusIndicator,
        item.sigStatus ? styles.activeIndicator : styles.inactiveIndicator
      ]} />
    </View>
  );

  const EmptyComponent = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="people-outline" size={64} color="#ccc" />
      <Text style={styles.emptyText}>No friends yet</Text>
      <Text style={styles.emptySubText}>Add friends to see when they're available</Text>
      <TouchableOpacity 
        style={styles.addFriendsButton}
        onPress={() => navigation.navigate('AddFriend')}
      >
        <Text style={styles.addFriendsButtonText}>Add Friends</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerText}>the cave</Text>
        <Text style={styles.headerSubtext}>see where your friends are</Text>
      </View>
      
      <View style={styles.content}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>Loading friends...</Text>
          </View>
        ) : (
          <FlatList
            data={friends}
            renderItem={renderFriend}
            keyExtractor={item => item.id}
            ListEmptyComponent={EmptyComponent}
            showsVerticalScrollIndicator={false}
            style={styles.friendsList}
            contentContainerStyle={styles.friendsListContent}
          />
        )}
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
    marginBottom: 30,
  },
  headerText: {
    fontSize: 32,
    fontWeight: 'bold',
  },
  headerSubtext: {
    fontSize: 16,
    color: '#666',
    marginTop: 8,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
  },
  friendsList: {
    flex: 1,
  },
  friendsListContent: {
    paddingBottom: 120,
  },
  friendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 20,
    backgroundColor: '#f8f8f8',
    borderRadius: 12,
    marginBottom: 12,
  },
  activeFriendItem: {
    backgroundColor: '#e8f5e8',
  },
  friendInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  friendAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#111',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  friendAvatarText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  friendDetails: {
    flex: 1,
  },
  friendName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111',
    marginBottom: 4,
  },
  friendStatus: {
    fontSize: 14,
    color: '#666',
  },
  activeItemText: {
    color: '#22c55e',
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  locationIcon: {
    marginRight: 4,
  },
  statusIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  activeIndicator: {
    backgroundColor: '#22c55e',
  },
  inactiveIndicator: {
    backgroundColor: '#ccc',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#666',
    marginTop: 20,
    marginBottom: 10,
  },
  emptySubText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 30,
  },
  addFriendsButton: {
    backgroundColor: '#111',
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 8,
  },
  addFriendsButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
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
});

export default TheCaveScreen; 