import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const ShareSheetScreen = () => (
  <View style={styles.container}>
    <Text style={styles.title}>sig</Text>
    <Text style={styles.subtitle}>join my cave!</Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 20,
    marginBottom: 32,
  },
});

export default ShareSheetScreen; 