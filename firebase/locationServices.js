import * as Location from 'expo-location';
import { db, auth } from './config';
import { doc, updateDoc, getDoc } from 'firebase/firestore';
import { getBuildingNameFromCoordinates } from './placesService';

let locationSubscription = null;

// Start foreground location tracking (only when sig is ON)
export const startForegroundLocationTracking = async () => {
  try {
    // Check for permission first
    const { status } = await Location.getForegroundPermissionsAsync();
    if (status !== 'granted') {
      console.log('No foreground permission for location tracking');
      return false;
    }
    
    // Check if user has sig ON before starting location tracking
    const userId = auth.currentUser?.uid;
    if (!userId) {
      console.warn('No authenticated user found for location tracking');
      return false;
    }

    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);
    
    if (!userDoc.exists() || !userDoc.data().sigStatus) {
      console.log('User sig is OFF, not starting location tracking');
      return false;
    }
    
    // Stop any existing subscription
    if (locationSubscription) {
      await locationSubscription.remove();
    }
    
    // Start watching location in the foreground
    locationSubscription = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.Balanced,
        timeInterval: 30000, // 30 seconds (reduced frequency to save API calls)
        distanceInterval: 50, // 50 meters
      },
      async (position) => {
        try {
          const { coords } = position;
          const { latitude, longitude } = coords;
          
          console.log(`Updating location for user ${userId} at coordinates: ${latitude}, ${longitude}`);
          
          // Get building name from coordinates
          const buildingName = await getBuildingNameFromCoordinates(latitude, longitude);
          
          // Ensure buildingName is never undefined or empty
          const safeBuildingName = buildingName && buildingName.trim() ? buildingName.trim() : 'Unknown Location';
          
          console.log(`Resolved building name: ${safeBuildingName}`);
          
          // Update user's location in Firestore with building name
          await updateDoc(userRef, {
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
            await updateDoc(userRef, {
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
    
    console.log('Foreground location tracking started');
    return true;
  } catch (error) {
    console.error('Error starting foreground location tracking:', error);
    return false;
  }
};

// Stop foreground location tracking
export const stopForegroundLocationTracking = async () => {
  if (locationSubscription) {
    await locationSubscription.remove();
    locationSubscription = null;
    console.log('Foreground location tracking stopped');
    
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
  }
  return false;
};

// Update location tracking based on sig status
export const updateLocationTrackingForSigStatus = async (sigStatus) => {
  try {
    if (sigStatus) {
      // Sig is ON - start location tracking
      await startForegroundLocationTracking();
    } else {
      // Sig is OFF - stop location tracking
      await stopForegroundLocationTracking();
    }
  } catch (error) {
    console.error('Error updating location tracking for sig status:', error);
  }
};

// Get current location once (for immediate use)
export const getCurrentLocationWithBuilding = async () => {
  try {
    const { status } = await Location.getForegroundPermissionsAsync();
    if (status !== 'granted') {
      throw new Error('Location permission not granted');
    }

    const location = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });

    const { latitude, longitude } = location.coords;
    const buildingName = await getBuildingNameFromCoordinates(latitude, longitude);
    
    // Ensure buildingName is never undefined or empty
    const safeBuildingName = buildingName && buildingName.trim() ? buildingName.trim() : 'Unknown Location';

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