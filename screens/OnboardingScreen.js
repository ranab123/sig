import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, SafeAreaView, KeyboardAvoidingView, Platform, TouchableWithoutFeedback, Keyboard, Animated, Alert, ActivityIndicator, FlatList, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { createStackNavigator } from '@react-navigation/stack';
import { FirebaseRecaptchaVerifierModal } from 'expo-firebase-recaptcha';
import { sendVerificationCode, verifyCode, saveUserProfile, checkUserExistsByPhone, sendFriendRequest } from '../firebase/services';
import { useAuth } from '../context/AuthContext';
import { app, auth, db } from '../firebase/config';
import { RecaptchaVerifier } from 'firebase/auth';
import * as Contacts from 'expo-contacts';
import { collection, query, where, getDocs } from 'firebase/firestore';
import NotSharedScreen from './NotSharedScreen';
import SendCaveLinkScreen from './SendCaveLinkScreen';
import SkippedSyncingScreen from './SkippedSyncingScreen';

const Stack = createStackNavigator();

// For development only - this makes testing easier
const isDev = true; // Set to false in production
const DEV_TEST_VERIFICATION_CODE = "123456";

const NameScreen = ({ navigation }) => {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');

  const handleNext = () => {
    if (!firstName.trim() || !lastName.trim()) {
      Alert.alert('Missing Information', 'Please enter both your first and last name');
      return;
    }
    
    // Pass the names to the next screen with isSignUp flag
    navigation.navigate('NumberScreen', { firstName, lastName, isSignUp: true });
  };

  const handleSignIn = () => {
    // Navigate to sign-in flow (skip name collection)
    navigation.navigate('NumberScreen', { isSignUp: false });
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.innerContainer}>
          <Text style={styles.title}>what's your name?</Text>
          <TextInput
            style={styles.input}
            placeholder="My first name is"
            placeholderTextColor="#B0B0B0"
            value={firstName}
            onChangeText={setFirstName}
            autoCapitalize="words"
            returnKeyType="next"
            keyboardType="default"
          />
          <TextInput
            style={styles.input}
            placeholder="And my last name is"
            placeholderTextColor="#B0B0B0"
            value={lastName}
            onChangeText={setLastName}
            autoCapitalize="words"
            returnKeyType="done"
            keyboardType="default"
          />
          <TouchableOpacity onPress={handleSignIn} activeOpacity={0.8} style={styles.signInContainer}>
            <Text style={styles.signInText}>Already have an account? Sign in</Text>
          </TouchableOpacity>
        </View>
        <TouchableOpacity style={styles.fab} onPress={handleNext} activeOpacity={0.8}>
          <Ionicons name="arrow-forward" size={32} color="#fff" />
        </TouchableOpacity>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const NumberScreen = ({ navigation, route }) => {
  const { firstName, lastName, isSignUp } = route.params;
  const [phoneNumber, setPhoneNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const recaptchaVerifier = useRef(null);
  const { setConfirmationResult } = useAuth();
  const webRecaptchaRef = useRef(null);

  useEffect(() => {
    if (Platform.OS === 'web') {
      if (!window.recaptchaVerifier) {
        window.recaptchaVerifier = new RecaptchaVerifier('recaptcha-container', {
          size: 'invisible',
        }, auth);
      }
      webRecaptchaRef.current = window.recaptchaVerifier;
    }
  }, []);

  const formatPhoneNumber = (text) => {
    // Remove non-numeric characters
    const cleaned = text.replace(/\D/g, '');
    
    // Format: (xxx) xxx-xxxx
    let formatted = '';
    if (cleaned.length > 0) {
      formatted += '(';
      formatted += cleaned.substring(0, 3);
      if (cleaned.length > 3) {
        formatted += ') ';
        formatted += cleaned.substring(3, 6);
        if (cleaned.length > 6) {
          formatted += '-';
          formatted += cleaned.substring(6, 10);
        }
      }
    }
    
    return formatted;
  };

  const handlePhoneChange = (text) => {
    const formatted = formatPhoneNumber(text);
    setPhoneNumber(formatted);
    
    // Auto-submit when 10 digits are entered - use the text parameter directly
    const digits = text.replace(/\D/g, '');
    if (digits.length === 10 && !loading) {
      console.log('Auto-submitting phone number with 10 digits:', digits);
      // Small delay to make it feel responsive
      setTimeout(() => {
        if (!loading) {
          handleNext(digits); // Pass the digits directly to avoid state race condition
        }
      }, 100);
    }
  };

  const handleNext = async (providedDigits = null) => {
    // Use provided digits or extract from current phone number state
    const digits = providedDigits || phoneNumber.replace(/\D/g, '');
    
    console.log('Phone number validation:', phoneNumber, 'Digits:', digits, 'Length:', digits.length);
    
    if (digits.length !== 10) {
      Alert.alert('Invalid Phone Number', 'Please enter a valid 10-digit phone number');
      return;
    }

    try {
      setLoading(true);
      
      // Format for Firebase: +1xxxxxxxxxx (US format)
      const formattedNumber = `+1${digits}`;
      console.log('Sending verification to:', formattedNumber);
      
      // Send verification code
      const appVerifier = Platform.OS === 'web' ? webRecaptchaRef.current : recaptchaVerifier.current;
      
      const confirmation = await sendVerificationCode(formattedNumber, appVerifier);
      console.log('Verification sent successfully');
      
      // Store confirmation result in context
      setConfirmationResult(confirmation);
      
      // Navigate to verification screen
      navigation.navigate('VerificationScreen', {
        firstName,
        lastName,
        phoneNumber: formattedNumber,
        isSignUp
      });
    } catch (error) {
      console.error('Error sending code:', error.code, error.message);
      Alert.alert('Error', `Could not send verification code: ${error.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {Platform.OS !== 'web' && (
        <FirebaseRecaptchaVerifierModal
          ref={recaptchaVerifier}
          firebaseConfig={app.options}
          attemptInvisibleVerification={true}
        />
      )}
      {Platform.OS === 'web' && <div id="recaptcha-container"></div>}
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.innerContainer}>
          <Text style={styles.title}>
            {isSignUp ? "what's your number?" : "enter your number to sign in"}
          </Text>
          <TextInput
            style={styles.input}
            placeholder="(xxx) xxx-xxxx"
            placeholderTextColor="#B0B0B0"
            value={phoneNumber}
            onChangeText={handlePhoneChange}
            keyboardType="phone-pad"
            returnKeyType="done"
            maxLength={14} // (xxx) xxx-xxxx
          />
        </View>
        <TouchableOpacity 
          style={[styles.fab, loading && styles.disabledButton]} 
          onPress={() => handleNext()} 
          activeOpacity={0.8}
          disabled={loading}
        >
          {loading ? (
            <Text style={styles.buttonText}>...</Text>
          ) : (
            <Ionicons name="arrow-forward" size={32} color="#fff" />
          )}
        </TouchableOpacity>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const VerificationScreen = ({ navigation, route }) => {
  const { firstName, lastName, phoneNumber, isSignUp } = route.params;
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef(null);
  const { confirmationResult } = useAuth();

  // Focus the hidden input on mount
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  const handleChangeText = (text) => {
    // Only allow numeric input and limit to 6 characters
    const numericText = text.replace(/[^0-9]/g, '').slice(0, 6);
    setCode(numericText);
    
    // Auto-submit when all 6 digits are entered - use the text parameter directly
    if (numericText.length === 6 && !loading) {
      console.log('Auto-submitting verification code');
      setTimeout(() => {
        if (!loading) {
          handleVerification(numericText); // Pass the complete code directly to avoid state race condition
        }
      }, 300);
    }
  };

  const handleVerification = async (providedCode = null) => {
    // Use provided code or extract from current state
    const verificationCode = providedCode || code;
    
    console.log('Verification code validation:', verificationCode, 'Length:', verificationCode.length);
    
    if (verificationCode.length !== 6) {
      setError('Please enter the 6-digit verification code');
      Alert.alert('Invalid Code', 'Please enter the 6-digit verification code');
      return;
    }

    try {
      setLoading(true);
      setError('');
      
      // Verify the code
      const userCredential = await verifyCode(confirmationResult, verificationCode, isSignUp);
      console.log('Verification successful, user:', userCredential?.user?.uid);
      
      // Handle different flows based on isSignUp
      if (isSignUp) {
        // Sign-up flow: Save user data to Firestore
        try {
          await saveUserProfile(userCredential.user.uid, {
            firstName,
            lastName,
            phoneNumber,
          });
        } catch (profileError) {
          console.error('Profile save error:', profileError);
          // Don't block the flow in development
          if (!__DEV__) {
            throw profileError;
          }
        }
        
        // Navigate to onboarding flow
        navigation.navigate('IntroScreenOne', { firstName, lastName, phoneNumber });
      } else {
        // Sign-in flow: Navigate directly to main app
        navigation.navigate('NotShared');
      }
    } catch (error) {
      console.error('Verification error:', error);
      
      // Handle specific error for no account found during sign-in
      if (!isSignUp && error.message?.includes('No account found')) {
        setError('No account found with this phone number.');
        Alert.alert(
          'Account Not Found', 
          'No account exists with this phone number. Please sign up first or check your number.',
          [{ text: 'OK' }]
        );
      } else {
        setError(error.message || 'Failed to verify code. Please try again.');
        Alert.alert('Error', error.message || 'Failed to verify code. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Function to handle taps on the code container to focus the hidden input
  const handleContainerPress = () => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  // Create array of 6 digits for display
  const displayDigits = Array.from({ length: 6 }, (_, index) => code[index] || '');

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
      <SafeAreaView style={styles.container}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.innerContainer}>
            <Text style={styles.title}>verify your number.</Text>
            <Text style={styles.subtitle}>Enter the verification sent to {phoneNumber}.</Text>
            
            {/* Hidden TextInput for actual input */}
            <TextInput
              ref={inputRef}
              style={styles.hiddenInput}
              keyboardType="number-pad"
              maxLength={6}
              onChangeText={handleChangeText}
              value={code}
              autoFocus={true}
            />
            
            {/* Visual display of code boxes */}
            <TouchableOpacity style={styles.codeContainer} onPress={handleContainerPress} activeOpacity={1}>
              {displayDigits.map((digit, index) => (
                <View
                  key={index}
                  style={[
                    styles.codeInput,
                    index === code.length && styles.codeInputActive, // Highlight the current input box
                  ]}
                >
                  <Text style={styles.codeText}>{digit}</Text>
                </View>
              ))}
            </TouchableOpacity>
          </View>
          <TouchableOpacity 
            style={[styles.fab, loading && styles.disabledButton]} 
            onPress={() => handleVerification()} 
            activeOpacity={0.8}
            disabled={loading}
          >
            {loading ? (
              <Text style={styles.buttonText}>...</Text>
            ) : (
              <Ionicons name="arrow-forward" size={32} color="#fff" />
            )}
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </TouchableWithoutFeedback>
  );
};

const IntroScreenOne = ({ navigation, route }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const { firstName, lastName, phoneNumber } = route.params || {};

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 1000,
      useNativeDriver: true,
    }).start();

    const timer = setTimeout(() => {
      navigation.navigate('IntroScreenTwo', { firstName, lastName, phoneNumber });
    }, 3000); // Adjust time for reading

    return () => clearTimeout(timer);
  }, [fadeAnim, navigation, firstName, lastName, phoneNumber]);

  return (
    <SafeAreaView style={styles.container}>
      <Animated.View style={{ ...styles.innerContainer, opacity: fadeAnim }}>
        <Text style={styles.title}>sig is the easiest way to let your friends know you're free...</Text>
      </Animated.View>
    </SafeAreaView>
  );
};

const IntroScreenTwo = ({ navigation, route }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const { firstName, lastName, phoneNumber } = route.params || {};

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 1000,
      useNativeDriver: true,
    }).start();

    const timer = setTimeout(() => {
      navigation.navigate('IntroScreenThree', { firstName, lastName, phoneNumber });
    }, 3000); // Adjust time for reading

    return () => clearTimeout(timer);
  }, [fadeAnim, navigation, firstName, lastName, phoneNumber]);

  return (
    <SafeAreaView style={styles.container}>
      <Animated.View style={{ ...styles.innerContainer, opacity: fadeAnim }}>
        <Text style={styles.title}>...and to see when they are too.</Text>
      </Animated.View>
    </SafeAreaView>
  );
};

const IntroScreenThree = ({ navigation, route }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const step2FadeAnim = useRef(new Animated.Value(0)).current;
  const [batTapped, setBatTapped] = useState(false);
  const [showStep2, setShowStep2] = useState(false);
  const { firstName, lastName, phoneNumber } = route.params || {};

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 1000,
      useNativeDriver: true,
    }).start();

    // Show step 2 after 3 seconds with fade-in animation
    const step2Timer = setTimeout(() => {
      setShowStep2(true);
      Animated.timing(step2FadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }).start();
    }, 3000);

    return () => clearTimeout(step2Timer);
  }, [fadeAnim, step2FadeAnim]);

  const handleBatTap = () => {
    setBatTapped(true);
  };

  const handleNext = () => {
    navigation.navigate('SyncPermissionScreen', { firstName, lastName, phoneNumber });
  };

  return (
    <SafeAreaView style={styles.container}>
      <Animated.View style={{ ...styles.tutorialScreenContainer, opacity: fadeAnim }}>
        <Text style={styles.title}>here's how it works:</Text>
        
        <View style={styles.tutorialContainer}>
          <View style={styles.tutorialStep}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumberText}>1</Text>
            </View>
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>tap the bat to turn on your sig</Text>
              <View style={styles.batIconContainer}>
                <TouchableOpacity onPress={handleBatTap} activeOpacity={0.8}>
                  <Image 
                    source={batTapped ? require('../assets/shiny-bat-logo.png') : require('../assets/bat sig.png')} 
                    style={styles.tutorialBatIcon}
                    resizeMode="contain"
                  />
                </TouchableOpacity>
                <Text style={styles.tapHint}>
                  {batTapped ? 'nice! you just turned on your sig' : 'tap me!'}
                </Text>
              </View>
            </View>
          </View>

          {showStep2 && (
            <Animated.View style={[styles.tutorialStep, { opacity: step2FadeAnim }]}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>2</Text>
              </View>
              <View style={styles.stepContent}>
                <Text style={styles.stepTitle}>check the cave to see who's down</Text>
                <View style={styles.caveIconContainer}>
                  <TouchableOpacity style={styles.caveButton} activeOpacity={0.8}>
                    <Image 
                      source={require('../assets/caveVector.png')} 
                      style={styles.tutorialCaveIcon}
                      resizeMode="contain"
                    />
                  </TouchableOpacity>
                  <Text style={styles.caveHint}>your friends will appear here</Text>
                </View>
              </View>
            </Animated.View>
          )}
        </View>
      </Animated.View>
      
      <TouchableOpacity style={styles.fab} onPress={handleNext} activeOpacity={0.8}>
        <Ionicons name="arrow-forward" size={32} color="#fff" />
      </TouchableOpacity>
    </SafeAreaView>
  );
};

const SyncPermissionScreen = ({ navigation, route }) => {
  const [loading, setLoading] = useState(false);
  const { firstName, lastName } = route.params || {};

  const handleSync = async () => {
    try {
      setLoading(true);
      
      // Request contacts permission
      const { status } = await Contacts.requestPermissionsAsync();
      
      if (status === 'granted') {
        // Get contacts
        const { data } = await Contacts.getContactsAsync({
          fields: [Contacts.Fields.PhoneNumbers, Contacts.Fields.Name],
        });
        
        if (data.length > 0) {
          // Navigate to the FriendsOnAppScreen with the contacts data
          navigation.navigate('FriendsOnAppScreen', { 
            contacts: data,
            firstName, 
            lastName,
            contactsSynced: true // Pass this flag to indicate contacts were synced
          });
        } else {
          Alert.alert(
            "No Contacts Found",
            "We couldn't find any contacts on your device.",
            [
              { text: "Continue", onPress: () => navigation.navigate('Permissions', { screen: 'Permissions', params: { contactsSynced: true } }) }
            ]
          );
        }
      } else {
        // Permission denied
        Alert.alert(
          "Permission Required",
          "We need access to your contacts to find your friends on the app.",
          [
            { text: "Continue Anyway", onPress: () => navigation.navigate('Permissions', { screen: 'Permissions', params: { contactsSynced: false } }) }
          ]
        );
      }
    } catch (error) {
      console.error("Error accessing contacts:", error);
      Alert.alert(
        "Error",
        "There was a problem accessing your contacts. Please try again later.",
        [
          { text: "Continue", onPress: () => navigation.navigate('Permissions', { screen: 'Permissions', params: { contactsSynced: false } }) }
        ]
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = () => {
    // Skip contact sync and navigate to SkippedSyncing screen
    navigation.navigate('SkippedSyncing');
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.innerContainer}>
        <Text style={styles.title}>sync your contacts to start building your cave now.</Text>
      </View>
      <View style={styles.buttonContainer}>
        <TouchableOpacity 
          style={[styles.syncButton, loading && styles.disabledButton]} 
          onPress={handleSync} 
          activeOpacity={0.8}
          disabled={loading}
        >
          {loading ? (
            <Text style={styles.syncButtonText}>let's go</Text>
          ) : (
            <Text style={styles.syncButtonText}>let's go</Text>
          )}
        </TouchableOpacity>
        <TouchableOpacity onPress={handleSkip} activeOpacity={0.8} disabled={loading}>
          <Text style={[styles.skipText, loading && styles.disabledText]}>I do not want to sync right now.</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const FriendsOnAppScreen = ({ navigation, route }) => {
  const [loading, setLoading] = useState(true);
  const [friendsOnApp, setFriendsOnApp] = useState([]);
  const [sendingRequests, setSendingRequests] = useState(new Set());
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const { contacts, firstName, lastName } = route.params;
  const { currentUser } = useAuth();

  useEffect(() => {
    const findFriendsOnApp = async () => {
      try {
        // Get and deduplicate phone numbers from contacts
        const phoneNumberMap = new Map();
        
        contacts.forEach(contact => {
          if (contact.phoneNumbers && contact.phoneNumbers.length > 0) {
            // Use the first phone number for each contact to avoid duplicates
            const phoneObj = contact.phoneNumbers[0];
            if (phoneObj.number) {
              // Normalize phone number
              let normalizedNumber = phoneObj.number.replace(/\D/g, '');
              
              if (normalizedNumber.length === 10) {
                normalizedNumber = `+1${normalizedNumber}`;
              } else if (normalizedNumber.length > 10 && !normalizedNumber.startsWith('+')) {
                normalizedNumber = `+${normalizedNumber}`;
              }
              
              // Only store if we haven't seen this number before
              if (!phoneNumberMap.has(normalizedNumber)) {
                phoneNumberMap.set(normalizedNumber, {
                  phoneNumber: normalizedNumber,
                  contactName: contact.name || `${contact.firstName || ''} ${contact.lastName || ''}`.trim(),
                  contactId: contact.id
                });
              }
            }
          }
        });
        
        const uniquePhoneNumbers = Array.from(phoneNumberMap.values());
        console.log(`Processing ${uniquePhoneNumbers.length} unique phone numbers`);
        
        // Early exit if no phone numbers
        if (uniquePhoneNumbers.length === 0) {
          setFriendsOnApp([]);
          setLoading(false);
          return;
        }
        
        // Set initial progress
        setProgress({ current: 0, total: uniquePhoneNumbers.length });
        
        // Process in larger parallel batches
        const usersRef = collection(db, 'users');
        let allFriends = [];
        const batchSize = 30; // Larger batch size for efficiency
        const maxConcurrent = 3; // Limit concurrent requests to avoid overwhelming Firestore
        
        // Create batches
        const batches = [];
        for (let i = 0; i < uniquePhoneNumbers.length; i += batchSize) {
          batches.push(uniquePhoneNumbers.slice(i, i + batchSize));
        }
        
        console.log(`Created ${batches.length} batches for processing`);
        
        // Process batches with limited concurrency
        for (let i = 0; i < batches.length; i += maxConcurrent) {
          const currentBatches = batches.slice(i, i + maxConcurrent);
          
          // Process current set of batches in parallel
          const batchPromises = currentBatches.map(async (batch) => {
            try {
              const phoneNumbersToQuery = batch.map(p => p.phoneNumber);
              const q = query(usersRef, where('phoneNumber', 'in', phoneNumbersToQuery));
              const querySnapshot = await getDocs(q);
              
              const batchFriends = [];
              querySnapshot.forEach(doc => {
                const userData = doc.data();
                const matchingContact = batch.find(contact => 
                  contact.phoneNumber === userData.phoneNumber
                );
                
                if (matchingContact && doc.id !== currentUser?.uid) {
                  batchFriends.push({
                    id: doc.id,
                    contactName: matchingContact.contactName,
                    firstName: userData.firstName || '',
                    lastName: userData.lastName || '',
                    phoneNumber: userData.phoneNumber,
                    requestSent: false
                  });
                }
              });
              
              return batchFriends;
            } catch (error) {
              console.error('Error in batch query:', error);
              return [];
            }
          });
          
          // Wait for current batch set to complete
          const batchResults = await Promise.all(batchPromises);
          
          // Flatten and add to results
          batchResults.forEach(batchFriends => {
            allFriends.push(...batchFriends);
          });
          
          // Update progress
          const processedCount = Math.min((i + maxConcurrent) * batchSize, uniquePhoneNumbers.length);
          setProgress({ current: processedCount, total: uniquePhoneNumbers.length });
          
          // Early termination if we found enough friends (optional)
          if (allFriends.length >= 50) {
            console.log('Found 50+ friends, stopping early for performance');
            break;
          }
        }
        
        console.log(`Found ${allFriends.length} friends on app`);
        setFriendsOnApp(allFriends);
      } catch (error) {
        console.error("Error finding friends on app:", error);
        // Continue with empty list in case of error
        setFriendsOnApp([]);
      } finally {
        setLoading(false);
      }
    };
    
    findFriendsOnApp();
  }, [contacts, currentUser]);

  const handleSendFriendRequest = async (friendId) => {
    if (!currentUser || sendingRequests.has(friendId)) return;
    
    try {
      setSendingRequests(prev => new Set(prev).add(friendId));
      
      await sendFriendRequest(currentUser.uid, friendId);
      
      // Update the friend's requestSent status
      setFriendsOnApp(prev => prev.map(friend => 
        friend.id === friendId 
          ? { ...friend, requestSent: true }
          : friend
      ));
      
      Alert.alert('Success', 'Friend request sent!');
    } catch (error) {
      console.error('Error sending friend request:', error);
      Alert.alert('Error', 'Failed to send friend request');
    } finally {
      setSendingRequests(prev => {
        const newSet = new Set(prev);
        newSet.delete(friendId);
        return newSet;
      });
    }
  };

  const handleContinue = () => {
    // Navigate to PermissionsScreen as part of the onboarding flow
    navigation.navigate('Permissions');
  };

  const renderFriendItem = ({ item }) => {
    const isSending = sendingRequests.has(item.id);
    
    return (
      <View style={styles.friendItem}>
        <View style={styles.friendAvatar}>
          <Text style={styles.friendInitial}>{item.firstName[0] || item.contactName[0]}</Text>
        </View>
        <View style={styles.friendInfo}>
          <Text style={styles.friendName}>
            {item.firstName} {item.lastName}
          </Text>
          <Text style={styles.friendContact}>{item.contactName}</Text>
        </View>
        <TouchableOpacity
          style={[
            styles.addFriendButton,
            (item.requestSent || isSending) && styles.addFriendButtonDisabled
          ]}
          onPress={() => handleSendFriendRequest(item.id)}
          disabled={item.requestSent || isSending}
        >
          {isSending ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.addFriendButtonText}>
              {item.requestSent ? 'Sent' : 'Add'}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    );
  };

  const EmptyListComponent = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyText}>None of your contacts are on sig yet.</Text>
      <Text style={styles.emptySubText}>Invite them to join you!</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.innerContainer}>
        <Text style={styles.title}>friends on sig</Text>
        <Text style={styles.subtitle}>Add the friends you'd like to connect with</Text>
        
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#111" />
            <Text style={styles.loadingText}>Finding your friends...</Text>
            {progress.total > 0 && (
              <Text style={styles.progressText}>
                Checked {progress.current} of {progress.total} contacts
              </Text>
            )}
          </View>
        ) : (
          <FlatList
            data={friendsOnApp}
            renderItem={renderFriendItem}
            keyExtractor={(item) => item.id}
            ListEmptyComponent={EmptyListComponent}
            style={styles.friendsList}
            contentContainerStyle={styles.friendsListContent}
          />
        )}
      </View>
      
      <TouchableOpacity 
        style={styles.fab} 
        onPress={handleContinue} 
        activeOpacity={0.8}
      >
        <Ionicons name="arrow-forward" size={32} color="#fff" />
      </TouchableOpacity>
    </SafeAreaView>
  );
};

const OnboardingNavigator = () => {
  // Custom transition configuration for quick fade
  const fadeTransition = {
    gestureEnabled: false,
    transitionSpec: {
      open: {
        animation: 'timing',
        config: {
          duration: 200, // 0.2 seconds for smoother transition
        },
      },
      close: {
        animation: 'timing',
        config: {
          duration: 200, // 0.2 seconds for smoother transition
        },
      },
    },
    cardStyleInterpolator: ({ current }) => ({
      cardStyle: {
        opacity: current.progress,
      },
    }),
  };

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        cardStyle: { backgroundColor: '#FFFFFF' },
        ...fadeTransition,
      }}
    >
      <Stack.Screen name="NameScreen" component={NameScreen} />
      <Stack.Screen name="NumberScreen" component={NumberScreen} />
      <Stack.Screen name="VerificationScreen" component={VerificationScreen} />
      <Stack.Screen name="IntroScreenOne" component={IntroScreenOne} />
      <Stack.Screen name="IntroScreenTwo" component={IntroScreenTwo} />
      <Stack.Screen name="IntroScreenThree" component={IntroScreenThree} />
      <Stack.Screen name="SyncPermissionScreen" component={SyncPermissionScreen} />
      <Stack.Screen name="SkippedSyncing" component={SkippedSyncingScreen} />
      <Stack.Screen name="FriendsOnAppScreen" component={FriendsOnAppScreen} />
      <Stack.Screen name="SendCaveLink" component={SendCaveLinkScreen} />
      <Stack.Screen name="NotShared" component={NotSharedScreen} />
    </Stack.Navigator>
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
  },
  buttonContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    paddingBottom: 40,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#111',
    marginBottom: 40,
  },
  tutorialScreenContainer: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 100,
    paddingBottom: 140,
  },
  tutorialContainer: {
    flex: 1,
    justifyContent: 'center',
    maxWidth: '100%',
  },
  tutorialStep: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 80,
    width: '100%',
  },
  stepNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#111',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 20,
    marginTop: 8,
    flexShrink: 0,
  },
  stepNumberText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  stepContent: {
    flex: 1,
    alignItems: 'center',
    minHeight: 140,
  },
  stepTitle: {
    fontSize: 18,
    color: '#111',
    fontWeight: '600',
    marginBottom: 20,
    textAlign: 'center',
    width: '100%',
  },
  batIconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    marginLeft: -26, // Offset to center on screen (half of stepNumber width + marginRight: 32/2 + 20/2)
  },
  tutorialBatIcon: {
    width: 70,
    height: 70,
    marginBottom: 12,
  },
  tapHint: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
    textAlign: 'center',
  },
  caveIconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    marginLeft: -26, // Offset to center on screen (half of stepNumber width + marginRight: 32/2 + 20/2)
  },
  caveButton: {
    width: 80,
    height: 50,
    borderRadius: 10,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 2,
    borderColor: '#000',
  },
  tutorialCaveIcon: {
    width: 28,
    height: 28,
    tintColor: '#fff',
  },
  caveHint: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
    textAlign: 'center',
  },
  input: {
    height: 48,
    borderColor: '#D3D3D3',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 16,
    fontSize: 16,
    marginBottom: 16,
    backgroundColor: '#fff',
    color: '#111',
    width: '100%',
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
  },
  subtitle: {
    fontSize: 16,
    color: '#666666',
    marginBottom: 20,
  },
  codeContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    marginBottom: 40,
    paddingLeft: 16,
  },
  codeInput: {
    width: 40,
    height: 50,
    borderColor: '#D3D3D3',
    borderWidth: 1,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 2,
  },
  codeText: {
    fontSize: 18,
    color: '#111',
    textAlign: 'center',
  },
  hiddenInput: {
    position: 'absolute',
    width: 0,
    height: 0,
    opacity: 0,
  },
  codeInputActive: {
    borderColor: '#111',
    borderWidth: 2,
  },
  syncButton: {
    backgroundColor: '#111',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 25,
    alignItems: 'center',
    marginBottom: 5,
    width: '80%',
    alignSelf: 'center',
  },
  syncButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  skipText: {
    fontSize: 14,
    color: '#B0B0B0',
    marginTop: 20,
    textAlign: 'center',
    marginBottom: 40,
  },
  disabledButton: {
    backgroundColor: '#999',
  },
  disabledText: {
    color: '#D3D3D3',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 40,
  },
  loadingText: {
    marginTop: 20,
    fontSize: 16,
    color: '#666',
  },
  progressText: {
    marginTop: 10,
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
  friendsList: {
    marginTop: 20,
  },
  friendsListContent: {
    paddingBottom: 120,
    flexGrow: 1,
  },
  friendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  friendAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#111',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  friendInitial: {
    color: '#FFF',
    fontSize: 22,
    fontWeight: 'bold',
  },
  friendInfo: {
    flex: 1,
  },
  friendName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111',
  },
  friendContact: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 40,
  },
  emptyText: {
    fontSize: 18,
    color: '#666',
    textAlign: 'center',
    marginBottom: 8,
  },
  emptySubText: {
    fontSize: 16,
    color: '#999',
    textAlign: 'center',
  },
  signInContainer: {
    alignItems: 'center',
    marginTop: 20,
  },
  signInText: {
    color: '#B0B0B0',
    fontSize: 14,
  },
  addFriendButton: {
    backgroundColor: '#111',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    alignItems: 'center',
    marginLeft: 10,
    minWidth: 60,
  },
  addFriendButtonDisabled: {
    backgroundColor: '#999',
  },
  addFriendButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
});

export default OnboardingNavigator; 