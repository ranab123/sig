import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const SendCaveLinkScreen = ({ navigation }) => (
  <View style={styles.container}>
    <View style={styles.innerContainer}>
      <Text style={styles.title}>send your cave link to your friends.</Text>
      <TouchableOpacity onPress={() => navigation.navigate('ShareSheet')} activeOpacity={0.8}>
        <Image source={require('../assets/bat-logo.png')} style={styles.batLogo} />
      </TouchableOpacity>
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
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 32,
    textAlign: 'center',
    color: '#111',
  },
  batLogo: {
    width: 240,
    height: 240,
    resizeMode: 'contain',
    marginBottom: 32,
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

export default SendCaveLinkScreen; 