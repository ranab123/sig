import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const friends = [
  { name: 'Brighton', time: 'been on sig for 3 weeks', color: '#7c3aed', initials: 'B' },
  { name: 'Easton', time: 'been on sig for 1 week', color: '#22c55e', initials: 'E' },
  { name: 'Lauren', time: 'been on sig for 3 months', color: '#000', initials: 'L' },
  { name: 'Sophie', time: 'been on sig for 2 weeks', color: '#1e293b', initials: 'S' },
];

const FriendsListScreen = ({ navigation }) => (
  <View style={styles.container}>
    <View style={styles.innerContainer}>
      <Text style={styles.title}>your friends on sig:</Text>
      <ScrollView contentContainerStyle={styles.list}>
        {friends.map((friend) => (
          <View style={styles.friendRow} key={friend.name}>
            <View style={[styles.avatarPlaceholder, { backgroundColor: friend.color }]}> 
              <Text style={styles.avatarInitials}>{friend.initials}</Text>
            </View>
            <View>
              <Text style={styles.friendName}>{friend.name}</Text>
              <Text style={styles.friendTime}>{friend.time}</Text>
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
    <TouchableOpacity style={styles.fab} onPress={() => navigation.navigate('SkippedSyncing')}>
      <Ionicons name="arrow-forward" size={32} color="#fff" />
    </TouchableOpacity>
  </View>
);

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
    marginBottom: 32,
    color: '#111',
  },
  list: {
    paddingBottom: 120,
  },
  friendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 32,
  },
  avatarPlaceholder: {
    width: 64,
    height: 64,
    borderRadius: 32,
    marginRight: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitials: {
    color: '#fff',
    fontSize: 28,
    fontWeight: 'bold',
  },
  friendName: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  friendTime: {
    fontSize: 14,
    color: '#bbb',
    marginTop: 2,
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

export default FriendsListScreen; 