import * as Location from 'expo-location';
import { db, auth } from './config';
import { doc, updateDoc, getDoc } from 'firebase/firestore';
import { getBuildingNameFromCoordinates } from './placesService';

let locationSubscription = null;
let isTrackingActive = false;

// Start foreground location tracking (only when sig is ON)
export const startForegroundLocationTracking = async () => {
  try {
    console.log('=== Starting Foreground Location Tracking ===');
    
    // Check for permission first
    const { status } = await Location.getForegroundPermissionsAsync();
    console.log('Foreground permission status:', status);
    if (status !== 'granted') {
      console.log('No foreground permission for location tracking');
      return false;
    }
    
    // Check if user has sig ON before starting location tracking
    const userId = auth.currentUser?.uid;
    console.log('Current user ID:', userId);
    if (!userId) {
      console.warn('No authenticated user found for location tracking');
      return false;
    }

    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);
    console.log('User doc exists:', userDoc.exists());
    
    if (!userDoc.exists()) {
      console.log('User document does not exist');
      return false;
    }
    
    const userData = userDoc.data();
    console.log('User sig status:', userData.sigStatus);
    
    if (!userData.sigStatus) {
      console.log('User sig is OFF, not starting location tracking');
      return false;
    }
    
    // Stop any existing subscription first
    if (locationSubscription) {
      console.log('Stopping existing location subscription');
      await locationSubscription.remove();
      locationSubscription = null;
    }
    
    console.log('Starting location watch with 30s interval and 50m distance threshold');
    
    // Start watching location in the foreground
    locationSubscription = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.Balanced,
        timeInterval: 30000, // 30 seconds
        distanceInterval: 50, // 50 meters
      },
      async (position) => {
        try {
          const { coords } = position;
          const { latitude, longitude } = coords;
          
          console.log(`[${new Date().toLocaleTimeString()}] Location update received: ${latitude}, ${longitude}`);
          
          // Double-check user still has sig ON before updating
          const currentUserRef = doc(db, 'users', userId);
          const currentUserDoc = await getDoc(currentUserRef);
          
          if (!currentUserDoc.exists() || !currentUserDoc.data().sigStatus) {
            console.log('User sig is now OFF, stopping location updates');
            await stopForegroundLocationTracking();
            return;
          }
          
          // Get building name from coordinates
          console.log('Fetching building name for coordinates...');
          const buildingName = await getBuildingNameFromCoordinates(latitude, longitude);
          
          // Ensure buildingName is never undefined or empty
          const safeBuildingName = buildingName && buildingName.trim() ? buildingName.trim() : 'Unknown Location';
          
          console.log(`Resolved building name: ${safeBuildingName}`);
          
          // Update user's location in Firestore with building name
          await updateDoc(currentUserRef, {
            location: {
              latitude,
              longitude,
              buildingName: safeBuildingName,
              timestamp: new Date().toISOString(),
            },
            updatedAt: new Date(),
          });
          
          console.log(`Successfully updated user location: ${safeBuildingName}`);
        } catch (error) {
          console.error('Failed to update location in foreground:', error);
          
          // If there's an error getting the building name, still save the location with a fallback
          try {
            const currentUserRef = doc(db, 'users', userId);
            await updateDoc(currentUserRef, {
              location: {
                latitude: coords.latitude,
                longitude: coords.longitude,
                buildingName: 'Unknown Location',
                timestamp: new Date().toISOString(),
              },
              updatedAt: new Date(),
            });
            console.log('Saved location with fallback building name');
          } catch (fallbackError) {
            console.error('Failed to save location even with fallback:', fallbackError);
          }
        }
      }
    );
    
    isTrackingActive = true;
    console.log('Foreground location tracking started successfully');
    return true;
  } catch (error) {
    console.error('Error starting foreground location tracking:', error);
    return false;
  }
};

// Stop foreground location tracking
export const stopForegroundLocationTracking = async () => {
  try {
    console.log('=== Stopping Foreground Location Tracking ===');
    
    if (locationSubscription) {
      await locationSubscription.remove();
      locationSubscription = null;
      console.log('Location subscription removed');
    }
    
    isTrackingActive = false;
    
    // Clear location from user profile when stopping
    try {
      const userId = auth.currentUser?.uid;
      if (userId) {
        const userRef = doc(db, 'users', userId);
        await updateDoc(userRef, {
          location: null,
          updatedAt: new Date(),
        });
        console.log('Cleared user location from profile');
      }
    } catch (error) {
      console.error('Error clearing location from profile:', error);
    }
    
    return true;
  } catch (error) {
    console.error('Error stopping foreground location tracking:', error);
    return false;
  }
};

// Update location tracking based on sig status
export const updateLocationTrackingForSigStatus = async (sigStatus) => {
  try {
    console.log(`=== Updating Location Tracking for Sig Status: ${sigStatus} ===`);
    
    if (sigStatus) {
      // Sig is ON - start location tracking
      console.log('Sig turned ON - starting location tracking');
      const started = await startForegroundLocationTracking();
      if (!started) {
        console.warn('Failed to start location tracking when sig turned ON');
      }
    } else {
      // Sig is OFF - stop location tracking
      console.log('Sig turned OFF - stopping location tracking');
      await stopForegroundLocationTracking();
    }
  } catch (error) {
    console.error('Error updating location tracking for sig status:', error);
  }
};

// Check if location tracking is currently active
export const isLocationTrackingActive = () => {
  return isTrackingActive && locationSubscription !== null;
};

// Get location tracking status for debugging
export const getLocationTrackingStatus = async () => {
  try {
    const userId = auth.currentUser?.uid;
    if (!userId) {
      return {
        error: 'No authenticated user',
        isTracking: false,
        hasSubscription: false,
        permissions: null,
        sigStatus: null
      };
    }

    // Check permissions
    const foregroundPermission = await Location.getForegroundPermissionsAsync();
    const backgroundPermission = await Location.getBackgroundPermissionsAsync();
    
    // Check user sig status
    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);
    const sigStatus = userDoc.exists() ? userDoc.data().sigStatus : null;
    
    return {
      userId,
      isTracking: isTrackingActive,
      hasSubscription: locationSubscription !== null,
      permissions: {
        foreground: foregroundPermission.status,
        background: backgroundPermission.status
      },
      sigStatus,
      error: null
    };
  } catch (error) {
    return {
      error: error.message,
      isTracking: false,
      hasSubscription: false,
      permissions: null,
      sigStatus: null
    };
  }
};

// Force restart location tracking (for debugging)
export const restartLocationTracking = async () => {
  try {
    console.log('=== Force Restarting Location Tracking ===');
    
    // Stop existing tracking
    await stopForegroundLocationTracking();
    
    // Wait a moment
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Start tracking again
    const started = await startForegroundLocationTracking();
    
    console.log(`Location tracking restart ${started ? 'successful' : 'failed'}`);
    return started;
  } catch (error) {
    console.error('Error restarting location tracking:', error);
    return false;
  }
};

// Get current location once (for immediate use)
export const getCurrentLocationWithBuilding = async () => {
  try {
    console.log('Getting current location once...');
    
    const { status } = await Location.getForegroundPermissionsAsync();
    if (status !== 'granted') {
      throw new Error('Location permission not granted');
    }

    const location = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });

    const { latitude, longitude } = location.coords;
    console.log(`Current location: ${latitude}, ${longitude}`);
    
    const buildingName = await getBuildingNameFromCoordinates(latitude, longitude);
    
    // Ensure buildingName is never undefined or empty
    const safeBuildingName = buildingName && buildingName.trim() ? buildingName.trim() : 'Unknown Location';
    
    console.log(`Current location building: ${safeBuildingName}`);

    return {
      latitude,
      longitude,
      buildingName: safeBuildingName,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    console.error('Error getting current location:', error);
    throw error;
  }
}; 