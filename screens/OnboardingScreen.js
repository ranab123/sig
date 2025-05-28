import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, SafeAreaView, KeyboardAvoidingView, Platform, TouchableWithoutFeedback, Keyboard, Animated, Alert, ActivityIndicator, FlatList } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { createStackNavigator } from '@react-navigation/stack';
import { FirebaseRecaptchaVerifierModal } from 'expo-firebase-recaptcha';
import { sendVerificationCode, verifyCode, saveUserProfile, checkUserExistsByPhone } from '../firebase/services';
import { useAuth } from '../context/AuthContext';
import { app, auth, db } from '../firebase/config';
import { RecaptchaVerifier } from 'firebase/auth';
import * as Contacts from 'expo-contacts';
import { collection, query, where, getDocs } from 'firebase/firestore';
import NotSharedScreen from './NotSharedScreen';

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
    setPhoneNumber(formatPhoneNumber(text));
  };

  const handleNext = async () => {
    // Check if phone number is valid (10 digits)
    const digits = phoneNumber.replace(/\D/g, '');
    if (digits.length !== 10) {
      Alert.alert('Invalid Phone Number', 'Please enter a valid 10-digit phone number');
      return;
    }

    try {
      setLoading(true);
      
      // Format for Firebase: +1xxxxxxxxxx (US format)
      const formattedNumber = `+1${digits}`;
      console.log('Attempting to send verification to:', formattedNumber);
      
      // For sign-in, check if user exists
      if (!isSignUp) {
        try {
          const userCheck = await checkUserExistsByPhone(formattedNumber);
          if (!userCheck.exists) {
            Alert.alert(
              'Account Not Found', 
              'No account found with this phone number. Please sign up first.',
              [
                { text: 'Sign Up', onPress: () => navigation.navigate('NameScreen') },
                { text: 'Try Again', style: 'cancel' }
              ]
            );
            setLoading(false);
            return;
          }
        } catch (error) {
          console.error('Error checking user existence:', error);
          // Continue with verification in case of error
        }
      }
      
      // Send verification code
      const appVerifier = Platform.OS === 'web' ? webRecaptchaRef.current : recaptchaVerifier.current;
      console.log('reCAPTCHA verifier initialized:', !!appVerifier);
      
      try {
        const confirmation = await sendVerificationCode(formattedNumber, appVerifier);
        console.log('Verification sent successfully, confirmation result:', !!confirmation);
        
        // Store confirmation result in context
        setConfirmationResult(confirmation);
        
        // Navigate to verification screen with user data and flow type
        navigation.navigate('VerificationScreen', {
          firstName,
          lastName,
          phoneNumber: formattedNumber,
          isSignUp
        });
      } catch (verificationError) {
        console.error('Detailed verification error:', JSON.stringify(verificationError));
        throw verificationError;
      }
    } catch (error) {
      console.error('Error sending code:', error.message, error.code);
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
          onPress={handleNext} 
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
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const inputs = useRef([]);
  const { confirmationResult } = useAuth();

  // Removed auto-fill for development - users should enter their actual verification code
  // useEffect(() => {
  //   // Auto-fill verification code in development for testing
  //   if (isDev && DEV_TEST_VERIFICATION_CODE) {
  //     const codeArray = DEV_TEST_VERIFICATION_CODE.split('');
  //     setCode(codeArray);
  //   }
  // }, []);

  const handleChangeText = (text, index) => {
    const newCode = [...code];
    newCode[index] = text;
    setCode(newCode);

    // Move to next input if text is entered
    if (text && index < 5) {
      inputs.current[index + 1].focus();
    }
  };

  const handleKeyPress = (e, index) => {
    // Handle backspace
    if (e.nativeEvent.key === 'Backspace' && !code[index] && index > 0) {
      inputs.current[index - 1].focus();
    }
  };

  const handleVerification = async () => {
    const verificationCode = code.join('');
    
    if (verificationCode.length !== 6) {
      setError('Please enter the 6-digit verification code');
      Alert.alert('Invalid Code', 'Please enter the 6-digit verification code');
      return;
    }

    try {
      setLoading(true);
      setError('');
      
      // Verify the code
      let user;
      try {
        user = await verifyCode(confirmationResult, verificationCode);
        console.log('Verification successful, user:', user?.uid);
      } catch (verifyError) {
        console.error('Verification error details:', verifyError.code, verifyError.message);
        
        // Show specific error for wrong verification code
        if (verifyError.code === 'auth/invalid-verification-code' || 
            verifyError.code === 'auth/invalid-verification-id' ||
            verifyError.message?.includes('verification code')) {
          setError('Verification failed. The code you entered is incorrect.');
          Alert.alert('Verification Failed', 'The code you entered is incorrect. Please try again.');
        } else {
          setError(verifyError.message || 'Failed to verify code. Please try again.');
          Alert.alert('Error', verifyError.message || 'Failed to verify code. Please try again.');
        }
        setLoading(false);
        return; // Prevent navigation to the next screen
      }
      
      // Handle different flows based on isSignUp
      if (isSignUp) {
        // Sign-up flow: Save user data to Firestore
        try {
          await saveUserProfile(user.uid, {
            firstName,
            lastName,
            phoneNumber,
          });
        } catch (profileError) {
          console.error('Profile save error:', profileError.code, profileError.message);
          // Don't block the flow in development if saving profile fails
          if (!isDev) {
            throw profileError;
          }
        }
        
        // Navigate to the next screen in onboarding flow
        navigation.navigate('IntroScreenOne', { firstName, lastName, phoneNumber });
      } else {
        // Sign-in flow: Navigate directly to NotShared screen
        navigation.navigate('NotShared');
      }
    } catch (error) {
      console.error('Verification process error:', error);
      setError(error.message || 'Failed to verify code. Please try again.');
      Alert.alert('Error', error.message || 'Failed to verify code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

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
            <View style={styles.codeContainer}>
              {code.map((digit, index) => (
                <TextInput
                  key={index}
                  ref={(ref) => (inputs.current[index] = ref)}
                  style={styles.codeInput}
                  keyboardType="number-pad"
                  maxLength={1}
                  onChangeText={(text) => handleChangeText(text, index)}
                  onKeyPress={(e) => handleKeyPress(e, index)}
                  value={digit}
                />
              ))}
            </View>
          </View>
          <TouchableOpacity 
            style={[styles.fab, loading && styles.disabledButton]} 
            onPress={handleVerification} 
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
      navigation.navigate('SyncPermissionScreen', { firstName, lastName, phoneNumber });
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
            <ActivityIndicator color="#fff" size="small" />
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
  const { contacts, firstName, lastName } = route.params;

  useEffect(() => {
    const findFriendsOnApp = async () => {
      try {
        // Get all phone numbers from contacts
        let phoneNumbers = [];
        
        contacts.forEach(contact => {
          if (contact.phoneNumbers && contact.phoneNumbers.length > 0) {
            contact.phoneNumbers.forEach(phoneObj => {
              if (phoneObj.number) {
                // Normalize phone number - strip non-digits and ensure it has country code
                let normalizedNumber = phoneObj.number.replace(/\D/g, '');
                
                // If it's a 10-digit US number without country code, add +1
                if (normalizedNumber.length === 10) {
                  normalizedNumber = `+1${normalizedNumber}`;
                } else if (normalizedNumber.length > 10 && !normalizedNumber.startsWith('+')) {
                  normalizedNumber = `+${normalizedNumber}`;
                }
                
                phoneNumbers.push({
                  phoneNumber: normalizedNumber,
                  contactName: contact.name || `${contact.firstName || ''} ${contact.lastName || ''}`.trim(),
                  contactId: contact.id
                });
              }
            });
          }
        });
        
        // Query Firestore for matching phone numbers
        const usersRef = collection(db, 'users');
        let friends = [];
        
        // Process in batches to avoid large queries
        const batchSize = 10;
        for (let i = 0; i < phoneNumbers.length; i += batchSize) {
          const batch = phoneNumbers.slice(i, i + batchSize);
          const phoneNumbersToQuery = batch.map(p => p.phoneNumber);
          
          // We want to find any phone number in our batch that exists in the database
          const q = query(usersRef, where('phoneNumber', 'in', phoneNumbersToQuery));
          const querySnapshot = await getDocs(q);
          
          querySnapshot.forEach(doc => {
            const userData = doc.data();
            const matchingContact = batch.find(contact => 
              contact.phoneNumber === userData.phoneNumber
            );
            
            if (matchingContact) {
              friends.push({
                id: doc.id,
                contactName: matchingContact.contactName,
                firstName: userData.firstName || '',
                lastName: userData.lastName || '',
                phoneNumber: userData.phoneNumber
              });
            }
          });
        }
        
        setFriendsOnApp(friends);
      } catch (error) {
        console.error("Error finding friends on app:", error);
        // Continue with empty list in case of error
      } finally {
        setLoading(false);
      }
    };
    
    findFriendsOnApp();
  }, [contacts]);

  const handleContinue = () => {
    // Navigate directly to NotShared (the screen with bat signal and "my sig")
    navigation.navigate('NotShared');
  };

  const renderFriendItem = ({ item }) => (
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
    </View>
  );

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
        
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#111" />
            <Text style={styles.loadingText}>Finding your friends...</Text>
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
      <Stack.Screen name="SyncPermissionScreen" component={SyncPermissionScreen} />
      <Stack.Screen name="FriendsOnAppScreen" component={FriendsOnAppScreen} />
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
    textAlign: 'center',
    fontSize: 18,
    color: '#111',
    marginHorizontal: 2,
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
});

export default OnboardingNavigator; 