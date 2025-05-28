import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Image, 
  TouchableOpacity, 
  Animated, 
  Dimensions, 
  Share,
  Platform 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const SendCaveLinkScreen = ({ navigation }) => {
  // State to track if the image has been pressed
  const [imagePressed, setImagePressed] = useState(false);
  
  // Get screen dimensions
  const screenWidth = Dimensions.get('window').width;
  const screenHeight = Dimensions.get('window').height;
  
  // Logo dimensions
  const logoWidth = 240;
  const logoHeight = 240;
  
  // Maximum X and Y positions for the logo (use full screen height)
  const maxX = screenWidth - logoWidth;
  const maxY = screenHeight - logoHeight;
  
  // Animated values for position
  const positionX = useRef(new Animated.Value(screenWidth / 2 - logoWidth / 2)).current;
  const positionY = useRef(new Animated.Value(screenHeight / 2 - logoHeight / 2)).current;
  
  // Velocity and direction
  const velocityX = useRef(1);
  const velocityY = useRef(1);
  
  // Function to handle the share action
  const handleImagePress = async () => {
    // First make the next button visible immediately
    setImagePressed(true);
    
    // Then show the share sheet
    try {
      const result = await Share.share({
        message: 'Check out sig! Join my cave and let me know when you\'re free.',
        url: 'https://example.com/sig', // Replace with your actual app URL
        title: 'Join my cave on sig!'
      });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };
  
  // Animation loop
  useEffect(() => {
    // Set initial random position
    positionX.setValue(Math.random() * maxX);
    positionY.setValue(Math.random() * maxY);
    
    const animationFrame = requestAnimationFrame(function animate() {
      // Update position based on velocity
      const newX = positionX._value + velocityX.current;
      const newY = positionY._value + velocityY.current;
      
      // Bounce off edges
      if (newX <= 0 || newX >= maxX) {
        velocityX.current = -velocityX.current;
      }
      if (newY <= 0 || newY >= maxY) {
        velocityY.current = -velocityY.current;
      }
      
      // Apply the new position
      positionX.setValue(newX < 0 ? 0 : newX > maxX ? maxX : newX);
      positionY.setValue(newY < 0 ? 0 : newY > maxY ? maxY : newY);
      
      // Continue animation loop
      requestAnimationFrame(animate);
    });
    
    // Clean up animation when component unmounts
    return () => cancelAnimationFrame(animationFrame);
  }, [maxX, maxY]);
  
  return (
    <View style={styles.container}>
      <View style={styles.innerContainer}>
        <Text style={styles.title}>catch the sig</Text>
      </View>
      
      <Animated.View style={[
        styles.logoContainer, 
        { 
          transform: [
            { translateX: positionX },
            { translateY: positionY }
          ] 
        }
      ]}>
        <TouchableOpacity onPress={handleImagePress} activeOpacity={0.8}>
          <Image source={require('../assets/bat-logo.png')} style={styles.batLogo} />
        </TouchableOpacity>
      </Animated.View>
      
      {imagePressed && (
        <TouchableOpacity 
          style={styles.fab} 
          onPress={() => navigation.navigate('TheCave')}
          activeOpacity={0.8}
        >
          <Ionicons name="arrow-forward" size={32} color="#fff" />
        </TouchableOpacity>
      )}
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
    zIndex: 1,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 32,
    textAlign: 'center',
    color: '#111',
  },
  logoContainer: {
    position: 'absolute',
    zIndex: 10,
  },
  batLogo: {
    width: 240,
    height: 240,
    resizeMode: 'contain',
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
    zIndex: 20,
  },
});

export default SendCaveLinkScreen; 