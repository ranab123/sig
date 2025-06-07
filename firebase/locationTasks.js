import * as TaskManager from 'expo-task-manager';
import * as Location from 'expo-location';
import { db, auth } from './config';
import { getBuildingNameFromCoordinates } from './placesService';
import { doc, updateDoc, getDoc } from 'firebase/firestore';
import { Platform } from 'react-native';

// Define the task name that will be used in the location tracking
export const LOCATION_TASK = 'LOCATION_TASK';

// Only register the task if we're not on web
if (Platform.OS !== 'web') {
  // Check if the task is already defined to avoid duplicate registrations
  if (!TaskManager.isTaskDefined(LOCATION_TASK)) {
    console.log(`Registering location task '${LOCATION_TASK}'...`);
    
    // Register the task for background location updates
    TaskManager.defineTask(LOCATION_TASK, async ({ data, error }) => {
      if (error) {
        console.error('Background location task error:', error);
        return;
      }
      
      if (data) {
        // Extract location data from the background task
        const { locations } = data;
        if (locations && locations.length > 0) {
          const { coords } = locations[0];
          const { latitude, longitude } = coords;
          
          try {
            console.log(`[BACKGROUND ${new Date().toLocaleTimeString()}] Location update: ${latitude}, ${longitude}`);
            
            // Get the current user ID
            const userId = auth.currentUser?.uid;
            if (!userId) {
              console.warn('Background: No authenticated user found for location update');
              return;
            }
            
            // Check if user still has sig ON before updating
            const userRef = doc(db, 'users', userId);
            const userDoc = await getDoc(userRef);
            
            if (!userDoc.exists() || !userDoc.data().sigStatus) {
              console.log('Background: User sig is OFF, stopping background location updates');
              try {
                await Location.stopLocationUpdatesAsync(LOCATION_TASK);
                console.log('Background location updates stopped');
              } catch (stopError) {
                console.error('Error stopping background location updates:', stopError);
              }
              return;
            }
            
            console.log(`Background: Fetching building name for coordinates...`);
            
            // Get building name from coordinates
            const buildingName = await getBuildingNameFromCoordinates(latitude, longitude);
            
            // Ensure buildingName is never undefined or empty
            const safeBuildingName = buildingName && buildingName.trim() ? buildingName.trim() : 'Unknown Location';
            
            console.log(`Background: Resolved building name: ${safeBuildingName}`);
            
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
            
            console.log(`Background: Successfully updated user location: ${safeBuildingName}`);
          } catch (error) {
            console.error('Background: Failed to update location:', error);
            
            // If there's an error getting the building name, still save the location with a fallback
            try {
              const userRef = doc(db, 'users', userId);
              await updateDoc(userRef, {
                location: {
                  latitude,
                  longitude,
                  buildingName: 'Unknown Location',
                  timestamp: new Date().toISOString(),
                },
                updatedAt: new Date(),
              });
              console.log('Background: Saved location with fallback building name');
            } catch (fallbackError) {
              console.error('Background: Failed to save location even with fallback:', fallbackError);
            }
          }
        } else {
          console.warn('Background: No location data received in task');
        }
      } else {
        console.warn('Background: No data received in location task');
      }
    });
    
    console.log(`Location task '${LOCATION_TASK}' registered successfully`);
  } else {
    console.log(`Location task '${LOCATION_TASK}' already registered`);
  }
} else {
  console.log('Web platform detected - background location tasks not available');
} 