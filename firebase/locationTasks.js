import * as TaskManager from 'expo-task-manager';
import { db, auth } from './config';
import { doc, updateDoc } from 'firebase/firestore';
import { Platform } from 'react-native';
import { getBuildingNameFromCoordinates } from './placesService';

// Define the task name that will be used in the location tracking
export const LOCATION_TASK = 'LOCATION_TASK';

// Only register the task if we're not on web
if (Platform.OS !== 'web') {
  // Check if the task is already defined to avoid duplicate registrations
  if (!TaskManager.isTaskDefined(LOCATION_TASK)) {
    // Register the task for background location updates
    TaskManager.defineTask(LOCATION_TASK, async ({ data, error }) => {
      if (error) {
        console.error('Location task error:', error);
        return;
      }
      
      if (data) {
        // Extract location data from the background task
        const { locations } = data;
        if (locations && locations.length > 0) {
          const { coords } = locations[0];
          const { latitude, longitude } = coords;
          
          try {
            // Get the current user ID
            const userId = auth.currentUser?.uid;
            if (!userId) {
              console.warn('No authenticated user found for location update');
              return;
            }
            
            console.log(`Background: Updating location for user ${userId} at coordinates: ${latitude}, ${longitude}`);
            
            // Get building name from coordinates
            const buildingName = await getBuildingNameFromCoordinates(latitude, longitude);
            
            // Ensure buildingName is never undefined or empty
            const safeBuildingName = buildingName && buildingName.trim() ? buildingName.trim() : 'Unknown Location';
            
            console.log(`Background: Resolved building name: ${safeBuildingName}`);
            
            // Update user's location in Firestore with building name
            const userRef = doc(db, 'users', userId);
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
            console.error('Failed to update location in background:', error);
            
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
        }
      }
    });
    
    console.log(`Location task '${LOCATION_TASK}' registered successfully`);
  } else {
    console.log(`Location task '${LOCATION_TASK}' already registered`);
  }
} 