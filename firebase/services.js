import { auth, db } from './config';
import { 
  signInWithPhoneNumber
} from 'firebase/auth';
import { doc, setDoc, getDoc, updateDoc, collection, query, where, getDocs, arrayUnion, arrayRemove, addDoc } from 'firebase/firestore';
import { updateLocationTrackingForSigStatus } from './locationServices';

// For development - map of phone numbers to test verification codes
const TEST_VERIFICATION_CODES = {
  '+12092043196': '234123'  // Updated with the correct test code
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
export const verifyCode = async (confirmationResult, verificationCode) => {
  try {
    // If this is a test phone number, bypass verification in development
    if (__DEV__ && confirmationResult && confirmationResult.verificationId) {
      const phoneNumber = confirmationResult._phone || '';
      const testCode = TEST_VERIFICATION_CODES[phoneNumber];
      
      if (testCode && testCode === verificationCode) {
        console.log('DEV: Using test verification code');
        // Create a fake user credential for development
        return { 
          user: { 
            uid: 'test-user-' + Date.now(),
            phoneNumber: phoneNumber 
          } 
        };
      }
    }
    
    const userCredential = await confirmationResult.confirm(verificationCode);
    return userCredential.user;
  } catch (error) {
    console.error('Error verifying code:', error);
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
export const updateSigStatus = async (userId, sigStatus) => {
  try {
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
      sigStatus,
      updatedAt: new Date(),
    });
    
    // Update location tracking based on sig status
    await updateLocationTrackingForSigStatus(sigStatus);
    
    console.log(`Updated sig status to ${sigStatus} for user ${userId}`);
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
    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);
    
    if (!userDoc.exists()) {
      return [];
    }
    
    const userData = userDoc.data();
    const friendIds = userData.friends || [];
    
    if (friendIds.length === 0) {
      return [];
    }
    
    // Get details of friends with their current status and location
    const friends = [];
    for (const friendId of friendIds) {
      const friendRef = doc(db, 'users', friendId);
      const friendDoc = await getDoc(friendRef);
      
      if (friendDoc.exists()) {
        const friendData = friendDoc.data();
        
        // Check if friend has location data but missing buildingName
        if (friendData.location && 
            friendData.location.latitude && 
            friendData.location.longitude && 
            !friendData.location.buildingName) {
          
          console.log(`Friend ${friendId} has location without buildingName, fixing...`);
          
          // Fix the location data in the background (don't wait for it)
          fixUserLocationData(friendId).catch(error => {
            console.error(`Failed to fix location data for friend ${friendId}:`, error);
          });
          
          // For immediate display, use a fallback
          friendData.location.buildingName = 'Unknown Location';
        }
        
        friends.push({
          id: friendId,
          firstName: friendData.firstName,
          lastName: friendData.lastName,
          phoneNumber: friendData.phoneNumber,
          sigStatus: friendData.sigStatus || false,
          location: friendData.location || null,
          updatedAt: friendData.updatedAt
        });
      }
    }
    
    return friends;
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

// Utility function to fix location data with missing buildingName
export const fixUserLocationData = async (userId) => {
  try {
    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);
    
    if (!userDoc.exists()) {
      console.log('User does not exist');
      return false;
    }
    
    const userData = userDoc.data();
    const location = userData.location;
    
    // Check if location exists but buildingName is missing
    if (location && location.latitude && location.longitude && !location.buildingName) {
      console.log(`Fixing location data for user ${userId}`);
      
      // Import here to avoid circular dependency
      const { getBuildingNameFromCoordinates } = await import('./placesService');
      
      // Get building name for existing coordinates
      const buildingName = await getBuildingNameFromCoordinates(location.latitude, location.longitude);
      const safeBuildingName = buildingName && buildingName.trim() ? buildingName.trim() : 'Unknown Location';
      
      // Update the location with building name
      await updateDoc(userRef, {
        location: {
          ...location,
          buildingName: safeBuildingName,
        },
        updatedAt: new Date(),
      });
      
      console.log(`Fixed location data for user ${userId}: ${safeBuildingName}`);
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('Error fixing user location data:', error);
    return false;
  }
}; 