import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, SafeAreaView, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getFriendRequestsReceived, acceptFriendRequest, declineFriendRequest, getUserFriends, removeFriend } from '../firebase/services';
import { useAuth } from '../context/AuthContext';

const FriendsScreen = ({ navigation }) => {
  const [activeTab, setActiveTab] = useState('requests'); // 'requests' or 'friends'
  const [friendRequests, setFriendRequests] = useState([]);
  const [friends, setFriends] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processingRequests, setProcessingRequests] = useState(new Set());
  const [unfriendingUsers, setUnfriendingUsers] = useState(new Set());
  const { currentUser } = useAuth();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    if (!currentUser) return;
    
    try {
      setLoading(true);
      const [requests, userFriends] = await Promise.all([
        getFriendRequestsReceived(currentUser.uid),
        getUserFriends(currentUser.uid)
      ]);
      setFriendRequests(requests);
      setFriends(userFriends);
    } catch (error) {
      console.error('Error loading data:', error);
      Alert.alert('Error', 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleAddFriendPress = () => {
    navigation.navigate('AddFriend');
  };

  const handleAcceptRequest = async (friendId) => {
    if (!currentUser || processingRequests.has(friendId)) return;
    
    try {
      setProcessingRequests(prev => new Set(prev).add(friendId));
      await acceptFriendRequest(currentUser.uid, friendId);
      
      // Remove from local state
      setFriendRequests(prev => prev.filter(request => request.id !== friendId));
      
      Alert.alert('Success', 'Friend request accepted!');
    } catch (error) {
      console.error('Error accepting friend request:', error);
      Alert.alert('Error', 'Failed to accept friend request');
    } finally {
      setProcessingRequests(prev => {
        const newSet = new Set(prev);
        newSet.delete(friendId);
        return newSet;
      });
    }
  };

  const handleDeclineRequest = async (friendId) => {
    if (!currentUser || processingRequests.has(friendId)) return;
    
    try {
      setProcessingRequests(prev => new Set(prev).add(friendId));
      await declineFriendRequest(currentUser.uid, friendId);
      
      // Remove from local state
      setFriendRequests(prev => prev.filter(request => request.id !== friendId));
      
      Alert.alert('Success', 'Friend request declined');
    } catch (error) {
      console.error('Error declining friend request:', error);
      Alert.alert('Error', 'Failed to decline friend request');
    } finally {
      setProcessingRequests(prev => {
        const newSet = new Set(prev);
        newSet.delete(friendId);
        return newSet;
      });
    }
  };

  const handleUnfriend = async (friendId) => {
    if (!currentUser || unfriendingUsers.has(friendId)) return;
    
    Alert.alert(
      'Unfriend',
      'Are you sure you want to remove this friend?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Unfriend', 
          style: 'destructive',
          onPress: async () => {
            try {
              setUnfriendingUsers(prev => new Set(prev).add(friendId));
              
              // Remove friend relationship (we'll need to add this function to services)
              await removeFriend(currentUser.uid, friendId);
              
              // Remove from local state
              setFriends(prev => prev.filter(friend => friend.id !== friendId));
              
              Alert.alert('Success', 'Friend removed');
            } catch (error) {
              console.error('Error removing friend:', error);
              Alert.alert('Error', 'Failed to remove friend');
            } finally {
              setUnfriendingUsers(prev => {
                const newSet = new Set(prev);
                newSet.delete(friendId);
                return newSet;
              });
            }
          }
        }
      ]
    );
  };

  const renderFriendRequest = ({ item }) => {
    const isProcessing = processingRequests.has(item.id);
    
    return (
      <View style={styles.requestItem}>
        <View style={styles.requestInfo}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {item.firstName?.[0] || item.phoneNumber?.[0] || '?'}
            </Text>
          </View>
          <View style={styles.userInfo}>
            <Text style={styles.userName}>
              {item.firstName && item.lastName 
                ? `${item.firstName} ${item.lastName}`
                : item.phoneNumber
              }
            </Text>
            <Text style={styles.phoneNumber}>{item.phoneNumber}</Text>
          </View>
        </View>
        
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={[styles.acceptButton, isProcessing && styles.disabledButton]}
            onPress={() => handleAcceptRequest(item.id)}
            disabled={isProcessing}
          >
            {isProcessing ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Ionicons name="checkmark" size={20} color="#fff" />
            )}
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.declineButton, isProcessing && styles.disabledButton]}
            onPress={() => handleDeclineRequest(item.id)}
            disabled={isProcessing}
          >
            {isProcessing ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Ionicons name="close" size={20} color="#fff" />
            )}
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderFriend = ({ item }) => {
    const isUnfriending = unfriendingUsers.has(item.id);
    
    return (
      <View style={styles.friendItem}>
        <View style={styles.requestInfo}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {item.firstName?.[0] || '?'}
            </Text>
          </View>
          <View style={styles.userInfo}>
            <Text style={styles.userName}>
              {item.firstName} {item.lastName}
            </Text>
            <Text style={styles.phoneNumber}>{item.phoneNumber}</Text>
          </View>
        </View>
        
        <TouchableOpacity
          style={[styles.unfriendButton, isUnfriending && styles.disabledButton]}
          onPress={() => handleUnfriend(item.id)}
          disabled={isUnfriending}
        >
          {isUnfriending ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Ionicons name="person-remove" size={16} color="#fff" />
          )}
        </TouchableOpacity>
      </View>
    );
  };

  const EmptyRequestsComponent = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="mail-outline" size={64} color="#ccc" />
      <Text style={styles.emptyText}>No friend requests</Text>
      <Text style={styles.emptySubText}>When someone sends you a friend request, it will appear here</Text>
    </View>
  );

  const EmptyFriendsComponent = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="people-outline" size={64} color="#ccc" />
      <Text style={styles.emptyText}>No friends yet</Text>
      <Text style={styles.emptySubText}>Add friends to see them here</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#111" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Friends</Text>
        <View style={styles.placeholder} />
      </View>

      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'requests' && styles.activeTab]}
          onPress={() => setActiveTab('requests')}
        >
          <Text style={[styles.tabText, activeTab === 'requests' && styles.activeTabText]}>
            Requests
            {friendRequests.length > 0 && (
              <Text style={styles.tabBadge}> ({friendRequests.length})</Text>
            )}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'friends' && styles.activeTab]}
          onPress={() => setActiveTab('friends')}
        >
          <Text style={[styles.tabText, activeTab === 'friends' && styles.activeTabText]}>
            Friends
            {friends.length > 0 && (
              <Text style={styles.tabBadge}> ({friends.length})</Text>
            )}
          </Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#111" />
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      ) : (
        <FlatList
          data={activeTab === 'requests' ? friendRequests : friends}
          renderItem={activeTab === 'requests' ? renderFriendRequest : renderFriend}
          keyExtractor={(item) => item.id}
          ListEmptyComponent={activeTab === 'requests' ? EmptyRequestsComponent : EmptyFriendsComponent}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Floating Action Button for Add Friends */}
      <TouchableOpacity 
        style={styles.fab} 
        onPress={handleAddFriendPress}
        activeOpacity={0.8}
      >
        <Ionicons name="person-add" size={24} color="#fff" />
        <Text style={styles.fabText}>Add Friends</Text>
      </TouchableOpacity>
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
    flexGrow: 1,
    padding: 20,
  },
  requestItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 15,
    paddingHorizontal: 20,
    backgroundColor: '#f8f8f8',
    borderRadius: 12,
    marginBottom: 10,
  },
  requestInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#111',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  avatarText: {
    color: '#fff',
    fontSize: 20,
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
  actionButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  acceptButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#22c55e',
    justifyContent: 'center',
    alignItems: 'center',
  },
  declineButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#ef4444',
    justifyContent: 'center',
    alignItems: 'center',
  },
  disabledButton: {
    opacity: 0.6,
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
  },
  friendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 15,
    paddingHorizontal: 20,
    backgroundColor: '#f8f8f8',
    borderRadius: 12,
    marginBottom: 10,
  },
  unfriendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#ef4444',
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabContainer: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginBottom: 20,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    padding: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 20,
    alignItems: 'center',
    borderRadius: 6,
  },
  activeTab: {
    backgroundColor: '#111',
  },
  tabText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  activeTabText: {
    color: '#fff',
  },
  tabBadge: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  fab: {
    position: 'absolute',
    bottom: 40,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderRadius: 28,
    backgroundColor: '#111',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  fabText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginLeft: 8,
  },
});

export default FriendsScreen; 