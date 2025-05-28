import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Share, Platform } from 'react-native';

const SkippedSyncingScreen = ({ navigation }) => {
  const handleShare = async () => {
    try {
      const result = await Share.share({
        message: 'Join my cave on sig!',
        url: 'https://sig.app/invite', // Replace with your actual invite URL
      });
      
      if (result.action === Share.sharedAction) {
        // User shared the content - navigate to NotShared (the screen with bat signal and "my sig")
        navigation.navigate('NotShared');
      }
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.innerContainer}>
        <Text style={styles.title}>skipped syncing?</Text>
        <Text style={styles.subtitle}>just send your invite link to start building your cave.</Text>
        <TouchableOpacity style={styles.shareButton} onPress={handleShare}>
          <Text style={styles.shareButtonText}>share</Text>
        </TouchableOpacity>
      </View>
      <TouchableOpacity style={styles.skipButton} onPress={() => navigation.navigate('NotShared')}>
        <Text style={styles.skipText}>I do not want to share right now.</Text>
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
    alignItems: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#111',
    textAlign: 'left',
    alignSelf: 'flex-start',
  },
  subtitle: {
    fontSize: 24,
    marginBottom: 48,
    color: '#111',
    textAlign: 'left',
    alignSelf: 'flex-start',
  },
  shareButton: {
    backgroundColor: '#111',
    borderRadius: 32,
    paddingVertical: 18,
    paddingHorizontal: 64,
    marginBottom: 24,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
  },
  shareButtonText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '500',
    textAlign: 'center',
  },
  skipButton: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 16,
    alignItems: 'center',
  },
  skipText: {
    color: '#bbb',
    fontSize: 16,
    fontStyle: 'italic',
    textDecorationLine: 'underline',
    padding: 8,
  },
});

export default SkippedSyncingScreen; 