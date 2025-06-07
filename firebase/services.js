import { auth, db } from './config';
import { 
  signInWithPhoneNumber
} from 'firebase/auth';
import { doc, setDoc, getDoc, updateDoc, collection, query, where, getDocs, arrayUnion, arrayRemove, addDoc, deleteDoc } from 'firebase/firestore';
import { updateLocationTrackingForSigStatus } from './locationServices';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';

// For development - map of phone numbers to test verification codes
const TEST_VERIFICATION_CODES = {
  '+12092043196': '234123',  // Your current test number
  '+15551234567': '123456'   // Additional test number
};

// Send verification code to phone number
export const sendVerificationCode = async (phoneNumber, appVerifier) => {
  try {
    console.log('Service: Starting phone verification for', phoneNumber);
    console.log('Service: AppVerifier type:', appVerifier ? (appVerifier.constructor ? appVerifier.constructor.name : 'unknown') : 'null');
    
    const confirmationResult = await signInWithPhoneNumber(auth, phoneNumber, appVerifier);
    console.log('Service: Verification sent successfully');
    return confirmationResult;
  } catch (error) {
    console.error('Service: Error sending verification code:', error.code, error.message);
    console.error('Service: Stack:', error.stack);
    throw error;
  }
};

// Verify code and sign in user
export const verifyCode = async (confirmationResult, verificationCode, isSignUp = false) => {
  try {
    console.log('Starting verification...', isSignUp ? '(Sign Up)' : '(Sign In)');
    
    // If this is a test phone number in development, bypass verification
    if (__DEV__ && confirmationResult && confirmationResult.verificationId) {
      const phoneNumber = confirmationResult._phone || '';
      const testCode = TEST_VERIFICATION_CODES[phoneNumber];
      
      if (testCode && testCode === verificationCode) {
        console.log('DEV: Using test verification code for:', phoneNumber);
        
        if (!isSignUp) {
          // Sign-in: Check if account exists
          const existingUser = await checkUserExistsByPhone(phoneNumber);
          if (!existingUser.exists) {
            throw new Error('No account found with this phone number. Please sign up first.');
          }
        }
        
        return { 
          user: { 
            uid: 'test-user-' + Date.now(),
            phoneNumber: phoneNumber 
          } 
        };
      }
    }

    // Verify the phone number with Firebase Auth
    console.log('Verifying SMS code with Firebase Auth...');
    const userCredential = await confirmationResult.confirm(verificationCode);
    const phoneNumber = userCredential.user.phoneNumber;
    const currentUID = userCredential.user.uid;
    
    console.log('SMS verification successful for phone:', phoneNumber);
    console.log('Current Firebase Auth UID:', currentUID);
    
    if (!isSignUp) {
      // Sign-in flow: Check for existing account and migrate data
      console.log('Sign-in flow: Checking for existing account...');
      const existingUser = await checkUserExistsByPhone(phoneNumber);
      
      if (!existingUser.exists) {
        throw new Error('No account found with this phone number. Please sign up first.');
      }
      
      if (existingUser.userId !== currentUID) {
        console.log('Found existing account with different UID:', existingUser.userId);
        console.log('Migrating data to current Firebase Auth UID:', currentUID);
        
        // Copy existing data to current Firebase Auth UID
        const currentUserRef = doc(db, 'users', currentUID);
        await setDoc(currentUserRef, {
          ...existingUser.userData,
          updatedAt: new Date(),
        });
        
        // Update friend references in other users' documents
        await updateFriendReferences(existingUser.userId, currentUID);
        
        // Delete old document
        const oldUserRef = doc(db, 'users', existingUser.userId);
        await deleteDoc(oldUserRef);
        
        console.log('Data migration and friend reference updates complete');
      }
    }
    
    return userCredential;
    
  } catch (error) {
    console.error('Error verifying code:', error.code || 'unknown', error.message);
    throw error;
  }
};

// Save or update user profile
export const saveUserProfile = async (userId, userData) => {
  try {
    console.log('Attempting to save user profile for:', userId);
    const userRef = doc(db, 'users', userId);
    
    // In development mode, we'll allow continuing even if offline
    try {
      const userDoc = await getDoc(userRef);
      
      if (!userDoc.exists()) {
        // Create new user document with friend management fields
        console.log('Creating new user document');
        await setDoc(userRef, {
          ...userData,
          friends: [],
          friendRequestsSent: [],
          friendRequestsReceived: [],
          sigStatus: false,
          location: null,
          createdAt: new Date(),
          updatedAt: new Date()
        });
      } else {
        // Update existing user document
        console.log('Updating existing user document');
        await updateDoc(userRef, {
          ...userData,
          updatedAt: new Date()
        });
      }
    } catch (dbError) {
      // If we're in development mode and offline, create a mock success response
      if (__DEV__ && dbError.code === 'failed-precondition' || dbError.message?.includes('offline')) {
        console.log('DEV: Offline mode detected, proceeding with mock user profile save');
        return true;
      }
      throw dbError;
    }
    
    return true;
  } catch (error) {
    console.error('Error saving user profile:', error.code, error.message);
    
    // In development, don't block the flow because of database errors
    if (__DEV__) {
      console.log('DEV: Continuing despite database error');
      return true;
    }
    
    throw error;
  }
};

// Get user profile
export const getUserProfile = async (userId) => {
  try {
    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);
    
    if (userDoc.exists()) {
      return userDoc.data();
    } else {
      return null;
    }
  } catch (error) {
    console.error('Error getting user profile:', error);
    throw error;
  }
};

// Check if user exists
export const checkUserExists = async (userId) => {
  try {
    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);
    return userDoc.exists();
  } catch (error) {
    console.error('Error checking if user exists:', error);
    throw error;
  }
};

// Check if user exists by phone number
export const checkUserExistsByPhone = async (phoneNumber) => {
  try {
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('phoneNumber', '==', phoneNumber));
    const querySnapshot = await getDocs(q);
    
    if (!querySnapshot.empty) {
      const userDoc = querySnapshot.docs[0];
      return {
        exists: true,
        userId: userDoc.id,
        userData: userDoc.data()
      };
    }
    
    return { exists: false };
  } catch (error) {
    console.error('Error checking user by phone:', error);
    throw error;
  }
};

// Update sig status with location tracking integration
export const updateSigStatus = async (userId, sigStatus, selectedFriendIds = null) => {
  try {
    console.log(`=== Updating Sig Status to ${sigStatus} for user ${userId} ===`);
    
    const userRef = doc(db, 'users', userId);
    
    // Get user data for notifications
    const userDoc = await getDoc(userRef);
    let userName = 'A friend';
    if (userDoc.exists()) {
      const userData = userDoc.data();
      userName = `${userData.firstName || ''} ${userData.lastName || ''}`.trim() || 'A friend';
    }
    
    // Update sig status in database first
    await updateDoc(userRef, {
      sigStatus,
      updatedAt: new Date(),
    });
    
    console.log(`Database updated: sig status = ${sigStatus}`);
    
    // Update location tracking based on sig status
    console.log('Updating location tracking...');
    await updateLocationTrackingForSigStatus(sigStatus);
    
    if (sigStatus) {
      console.log('Sig turned ON - handling notifications and reminders');
      
      // Send notifications to friends when sig is turned ON
      await notifyFriendsOfSigStatus(userId, sigStatus, userName, selectedFriendIds);
      
      // Optionally get an immediate location update when sig turns on
      try {
        const { getCurrentLocationWithBuilding } = await import('./locationServices');
        const currentLocation = await getCurrentLocationWithBuilding();
        
        // Update with immediate location if available
        await updateDoc(userRef, {
          location: currentLocation,
          updatedAt: new Date(),
        });
        
        console.log(`Immediate location update: ${currentLocation.buildingName}`);
      } catch (locationError) {
        console.log('Could not get immediate location update:', locationError.message);
        // This is not critical, continuous tracking will handle it
      }
    } else {
      console.log('Sig turned OFF');
    }
    
    console.log(`Successfully updated sig status to ${sigStatus} for user ${userId}`);
    return true;
  } catch (error) {
    console.error('Error updating sig status:', error);
    throw error;
  }
};

// Send friend request
export const sendFriendRequest = async (fromUserId, toUserId) => {
  try {
    const fromUserRef = doc(db, 'users', fromUserId);
    const toUserRef = doc(db, 'users', toUserId);
    
    // Add to sender's sent requests
    await updateDoc(fromUserRef, {
      friendRequestsSent: arrayUnion(toUserId),
      updatedAt: new Date(),
    });
    
    // Add to receiver's received requests
    await updateDoc(toUserRef, {
      friendRequestsReceived: arrayUnion(fromUserId),
      updatedAt: new Date(),
    });
    
    console.log(`Friend request sent from ${fromUserId} to ${toUserId}`);
    return true;
  } catch (error) {
    console.error('Error sending friend request:', error);
    throw error;
  }
};

// Accept friend request
export const acceptFriendRequest = async (currentUserId, requesterId) => {
  try {
    const currentUserRef = doc(db, 'users', currentUserId);
    const requesterRef = doc(db, 'users', requesterId);
    
    // Add each other as friends
    await updateDoc(currentUserRef, {
      friends: arrayUnion(requesterId),
      friendRequestsReceived: arrayRemove(requesterId),
      updatedAt: new Date(),
    });
    
    await updateDoc(requesterRef, {
      friends: arrayUnion(currentUserId),
      friendRequestsSent: arrayRemove(currentUserId),
      updatedAt: new Date(),
    });
    
    console.log(`Friend request accepted between ${currentUserId} and ${requesterId}`);
    return true;
  } catch (error) {
    console.error('Error accepting friend request:', error);
    throw error;
  }
};

// Decline friend request
export const declineFriendRequest = async (currentUserId, requesterId) => {
  try {
    const currentUserRef = doc(db, 'users', currentUserId);
    const requesterRef = doc(db, 'users', requesterId);
    
    // Remove from both users' request arrays
    await updateDoc(currentUserRef, {
      friendRequestsReceived: arrayRemove(requesterId),
      updatedAt: new Date(),
    });
    
    await updateDoc(requesterRef, {
      friendRequestsSent: arrayRemove(currentUserId),
      updatedAt: new Date(),
    });
    
    console.log(`Friend request declined between ${currentUserId} and ${requesterId}`);
    return true;
  } catch (error) {
    console.error('Error declining friend request:', error);
    throw error;
  }
};

// Remove friend
export const removeFriend = async (currentUserId, friendId) => {
  try {
    const currentUserRef = doc(db, 'users', currentUserId);
    const friendRef = doc(db, 'users', friendId);
    
    // Remove each other from friends arrays
    await updateDoc(currentUserRef, {
      friends: arrayRemove(friendId),
      updatedAt: new Date(),
    });
    
    await updateDoc(friendRef, {
      friends: arrayRemove(currentUserId),
      updatedAt: new Date(),
    });
    
    console.log(`Friendship removed between ${currentUserId} and ${friendId}`);
    return true;
  } catch (error) {
    console.error('Error removing friend:', error);
    throw error;
  }
};

// Get friend requests received
export const getFriendRequestsReceived = async (userId) => {
  try {
    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);
    
    if (!userDoc.exists()) {
      return [];
    }
    
    const userData = userDoc.data();
    const requestIds = userData.friendRequestsReceived || [];
    
    if (requestIds.length === 0) {
      return [];
    }
    
    // Get details of users who sent requests
    const requests = [];
    for (const requesterId of requestIds) {
      const requesterRef = doc(db, 'users', requesterId);
      const requesterDoc = await getDoc(requesterRef);
      
      if (requesterDoc.exists()) {
        requests.push({
          id: requesterId,
          ...requesterDoc.data()
        });
      }
    }
    
    return requests;
  } catch (error) {
    console.error('Error getting friend requests:', error);
    throw error;
  }
};

// Get user friends with their current status and location
export const getUserFriends = async (userId) => {
  try {
    console.log('Starting to get user friends for userId:', userId);
    
    // First, get the user document from Firestore
    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);
    
    // Check if the user document exists
    let userExists = false;
    if (userDoc.exists()) {
      userExists = true;
    }
    
    if (!userExists) {
      console.log('User document does not exist');
      return [];
    }
    
    // Get the user data from the document
    const userData = userDoc.data();
    let userFriendIds = userData.friends;
    
    // Make sure we have a friends array
    if (!userFriendIds) {
      userFriendIds = [];
    }
    
    // Check if user has any friends
    let numberOfFriends = userFriendIds.length;
    console.log('User has', numberOfFriends, 'friends');
    
    if (numberOfFriends === 0) {
      console.log('User has no friends, returning empty array');
      return [];
    }
    
    // Create array to store friend details
    const friendsArray = [];
    
    // Loop through each friend ID to get their details
    for (let i = 0; i < userFriendIds.length; i++) {
      let currentFriendId = userFriendIds[i];
      console.log('Getting data for friend:', currentFriendId);
      
      // Get the friend's document from Firestore
      const friendRef = doc(db, 'users', currentFriendId);
      const friendDoc = await getDoc(friendRef);
      
      // Check if friend document exists
      let friendDocExists = false;
      if (friendDoc.exists()) {
        friendDocExists = true;
      }
      
      if (friendDocExists) {
        // Get the friend's data
        const friendData = friendDoc.data();
        
        // Check if friend has location data but missing buildingName
        let friendHasLocation = false;
        let friendHasLatitude = false;
        let friendHasLongitude = false;
        let friendHasBuildingName = false;
        
        if (friendData.location) {
          friendHasLocation = true;
          
          if (friendData.location.latitude) {
            friendHasLatitude = true;
          }
          
          if (friendData.location.longitude) {
            friendHasLongitude = true;
          }
          
          if (friendData.location.buildingName) {
            friendHasBuildingName = true;
          }
        }
        
        // Fix location data if needed
        if (friendHasLocation && friendHasLatitude && friendHasLongitude && !friendHasBuildingName) {
          console.log(`Friend ${currentFriendId} has location without buildingName, fixing...`);
          
          // Fix the location data in the background (don't wait for it)
          fixUserLocationData(currentFriendId).catch(error => {
            console.error(`Failed to fix location data for friend ${currentFriendId}:`, error);
          });
          
          // For immediate display, use a fallback
          friendData.location.buildingName = 'Unknown Location';
        }
        
        // Create friend object with all the data we need
        let friendObject = {
          id: currentFriendId,
          firstName: friendData.firstName,
          lastName: friendData.lastName,
          phoneNumber: friendData.phoneNumber,
          sigStatus: friendData.sigStatus || false,
          location: friendData.location || null,
          updatedAt: friendData.updatedAt
        };
        
        // Add friend to our array
        friendsArray.push(friendObject);
        console.log('Added friend to array:', friendObject.firstName, friendObject.lastName);
      } else {
        console.log('Friend document does not exist for ID:', currentFriendId);
      }
    }
    
    console.log('Returning', friendsArray.length, 'friends');
    return friendsArray;
    
  } catch (error) {
    console.error('Error getting user friends:', error);
    throw error;
  }
};

// Search users by phone numbers (for contact sync)
export const searchUsersByPhoneNumbers = async (phoneNumbers) => {
  try {
    const usersRef = collection(db, 'users');
    const users = [];
    
    // Process in batches to avoid large queries
    const batchSize = 10;
    for (let i = 0; i < phoneNumbers.length; i += batchSize) {
      const batch = phoneNumbers.slice(i, i + batchSize);
      const q = query(usersRef, where('phoneNumber', 'in', batch));
      const querySnapshot = await getDocs(q);
      
      querySnapshot.forEach(doc => {
        users.push({
          id: doc.id,
          ...doc.data()
        });
      });
    }
    
    return users;
  } catch (error) {
    console.error('Error searching users by phone numbers:', error);
    throw error;
  }
};

// Fix user location data by fetching building name from coordinates
const fixUserLocationData = async (userId) => {
  try {
    console.log(`Starting location fix for user ${userId}`);
    
    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);
    
    if (!userDoc.exists()) {
      console.log(`User ${userId} does not exist`);
      return;
    }
    
    const userData = userDoc.data();
    
    // Check if user has location but missing buildingName
    if (userData.location && 
        userData.location.latitude && 
        userData.location.longitude && 
        !userData.location.buildingName) {
      
      // Import here to avoid circular dependencies
      const { getBuildingNameFromCoordinates } = await import('./placesService');
      
      console.log(`Getting building name for coordinates: ${userData.location.latitude}, ${userData.location.longitude}`);
      
      const buildingName = await getBuildingNameFromCoordinates(
        userData.location.latitude, 
        userData.location.longitude
      );
      
      // Update the user's location with building name
      await updateDoc(userRef, {
        location: {
          ...userData.location,
          buildingName: buildingName
        },
        updatedAt: new Date()
      });
      
      console.log(`Updated location for user ${userId} with building name: ${buildingName}`);
    } else {
      console.log(`User ${userId} location data is already complete or missing coordinates`);
    }
    
  } catch (error) {
    console.error(`Error fixing location data for user ${userId}:`, error);
    throw error;
  }
};

// Save FCM token for push notifications
export const saveFCMToken = async (userId) => {
  try {
    if (!userId) {
      console.log('No userId provided for FCM token save');
      return;
    }

    // Get the Expo project ID
    const projectId = Constants.expoConfig?.extra?.eas?.projectId || 
                     Constants.manifest?.extra?.eas?.projectId ||
                     '24fb78d8-5ccd-4213-a0ff-0f34c71909b3'; // Fallback to your project ID
    
    // Get the FCM token
    const token = await Notifications.getExpoPushTokenAsync({
      projectId: projectId,
    });
    
    if (token?.data) {
      const userRef = doc(db, 'users', userId);
      
      // Use setDoc with merge to create or update the document
      await setDoc(userRef, {
        fcmToken: token.data,
        updatedAt: new Date(),
      }, { merge: true });
      
      console.log('FCM token saved successfully:', token.data);
      return token.data;
    }
  } catch (error) {
    console.error('Error saving FCM token:', error);
    // Don't throw error as this shouldn't block the main flow
  }
};

// Send push notification to friends when sig status changes
export const notifyFriendsOfSigStatus = async (userId, sigStatus, userName, selectedFriendIds = null) => {
  try {
    // Only send notifications when sig is turned ON
    if (!sigStatus) return;
    
    // Get user's friends
    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);
    
    if (!userDoc.exists()) return;
    
    const userData = userDoc.data();
    const allFriendIds = userData.friends || [];
    
    if (allFriendIds.length === 0) return;
    
    // Determine which friends to notify
    let friendsToNotify = allFriendIds;
    if (selectedFriendIds !== null) {
      if (selectedFriendIds.length === 0) {
        // Empty array means send to no one
        console.log('Selected friends is empty array. Sending notifications to no one.');
        return;
      } else {
        // Filter to only include selected friends who are actually friends
        friendsToNotify = allFriendIds.filter(friendId => selectedFriendIds.includes(friendId));
        console.log(`Sending notifications to selected friends only: ${friendsToNotify.length} out of ${allFriendIds.length} friends`);
      }
    } else {
      console.log(`Sending notifications to all friends: ${allFriendIds.length} friends`);
    }
    
    if (friendsToNotify.length === 0) return;
    
    // Get friends' FCM tokens
    const friendTokens = [];
    for (const friendId of friendsToNotify) {
      try {
        const friendRef = doc(db, 'users', friendId);
        const friendDoc = await getDoc(friendRef);
        
        if (friendDoc.exists()) {
          const friendData = friendDoc.data();
          if (friendData.fcmToken) {
            friendTokens.push(friendData.fcmToken);
          }
        }
      } catch (error) {
        console.error(`Error getting friend ${friendId} data:`, error);
      }
    }
    
    if (friendTokens.length === 0) return;
    
    // Create notifications for each friend
    const notifications = friendTokens.map(token => ({
      to: token,
      sound: 'default',
      title: 'Friend is available! 🎉',
      body: `${userName} just turned on their sig and is free to hang!`,
      data: {
        type: 'sig_status_change',
        userId: userId,
        userName: userName,
        sigStatus: true
      }
    }));
    
    // Send notifications using Expo's push notification service
    try {
      const response = await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Accept-encoding': 'gzip, deflate',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(notifications),
      });
      
      const result = await response.json();
      console.log('Push notifications sent:', result);
    } catch (notificationError) {
      console.error('Error sending push notifications:', notificationError);
    }
    
  } catch (error) {
    console.error('Error notifying friends of sig status:', error);
  }
};

// Update friend references in other users' documents
const updateFriendReferences = async (oldUserId, newUserId) => {
  try {
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('friends', 'array-contains', oldUserId));
    const querySnapshot = await getDocs(q);
    
    const batch = [];
    querySnapshot.forEach(doc => {
      const userData = doc.data();
      const friends = userData.friends || [];
      const updatedFriends = friends.map(friendId =>
        friendId === oldUserId ? newUserId : friendId
      );
      batch.push(updateDoc(doc.ref, {
        friends: updatedFriends,
        updatedAt: new Date(),
      }));
    });
    
    await Promise.all(batch);
  } catch (error) {
    console.error('Error updating friend references:', error);
    throw error;
  }
}; 