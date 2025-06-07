import React, { createContext, useState, useEffect, useContext } from 'react';
import { auth, db } from '../firebase/config';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [confirmationResult, setConfirmationResult] = useState(null);
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState(false);
  const [isFirstLaunch, setIsFirstLaunch] = useState(true);

  // Check if user has completed onboarding
  const checkOnboardingStatus = async (userId) => {
    try {
      // Check AsyncStorage for onboarding completion
      const onboardingCompleted = await AsyncStorage.getItem(`onboarding_completed_${userId}`);
      const hasCompleted = onboardingCompleted === 'true';
      setHasCompletedOnboarding(hasCompleted);
      return hasCompleted;
    } catch (error) {
      console.error('Error checking onboarding status:', error);
      return false;
    }
  };

  // Mark onboarding as completed
  const completeOnboarding = async (userId) => {
    try {
      await AsyncStorage.setItem(`onboarding_completed_${userId}`, 'true');
      setHasCompletedOnboarding(true);
      console.log('Onboarding marked as completed for user:', userId);
    } catch (error) {
      console.error('Error saving onboarding completion:', error);
    }
  };

  // Check if this is the first app launch
  const checkFirstLaunch = async () => {
    try {
      const hasLaunchedBefore = await AsyncStorage.getItem('has_launched_before');
      if (hasLaunchedBefore === null) {
        // First time launching the app
        await AsyncStorage.setItem('has_launched_before', 'true');
        setIsFirstLaunch(true);
      } else {
        setIsFirstLaunch(false);
      }
    } catch (error) {
      console.error('Error checking first launch:', error);
      setIsFirstLaunch(true); // Default to first launch on error
    }
  };

  // Get the appropriate initial route based on auth and onboarding state
  const getInitialRoute = () => {
    if (!currentUser) {
      // Not authenticated - go to onboarding
      return 'Onboarding';
    }
    
    if (!hasCompletedOnboarding) {
      // Authenticated but hasn't completed onboarding
      return 'Permissions'; // or wherever they left off
    }
    
    // Authenticated and completed onboarding - go to main app
    return 'TheCave';
  };

  useEffect(() => {
    // Check first launch status
    checkFirstLaunch();

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      console.log('Auth state changed:', user ? `User ${user.uid}` : 'No user');
      setCurrentUser(user);
      
      if (user) {
        try {
          // Get user profile from Firestore
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            setUserProfile(userData);
            console.log('User profile loaded:', userData.firstName, userData.lastName);
          }
          
          // Check onboarding status for this user
          await checkOnboardingStatus(user.uid);
          
        } catch (error) {
          console.error('Error fetching user data:', error);
        }
      } else {
        setUserProfile(null);
        setHasCompletedOnboarding(false);
      }
      
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  // Sign out function
  const signOut = async () => {
    try {
      await auth.signOut();
      // Clear onboarding status when signing out
      if (currentUser) {
        await AsyncStorage.removeItem(`onboarding_completed_${currentUser.uid}`);
      }
      setHasCompletedOnboarding(false);
      console.log('User signed out successfully');
    } catch (error) {
      console.error('Error signing out:', error);
      throw error;
    }
  };

  // Reset all auth state (useful for debugging or clearing corrupted state)
  const resetAuthState = async () => {
    try {
      console.log('Resetting authentication state...');
      
      // Sign out from Firebase
      if (auth.currentUser) {
        await auth.signOut();
      }
      
      // Clear all auth-related storage
      const keys = await AsyncStorage.getAllKeys();
      const authKeys = keys.filter(key => 
        key.startsWith('onboarding_completed_') || 
        key === 'has_launched_before'
      );
      
      if (authKeys.length > 0) {
        await AsyncStorage.multiRemove(authKeys);
        console.log('Cleared auth storage keys:', authKeys);
      }
      
      // Reset state
      setCurrentUser(null);
      setUserProfile(null);
      setHasCompletedOnboarding(false);
      setIsFirstLaunch(true);
      
      console.log('Authentication state reset complete');
    } catch (error) {
      console.error('Error resetting auth state:', error);
    }
  };

  const value = {
    currentUser,
    userProfile,
    loading,
    confirmationResult,
    setConfirmationResult,
    hasCompletedOnboarding,
    isFirstLaunch,
    completeOnboarding,
    getInitialRoute,
    signOut,
    resetAuthState
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  return useContext(AuthContext);
}; 