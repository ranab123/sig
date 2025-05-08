import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, SafeAreaView, KeyboardAvoidingView, Platform, TouchableWithoutFeedback, Keyboard, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { createStackNavigator } from '@react-navigation/stack';

const Stack = createStackNavigator();

const NameScreen = ({ navigation }) => {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');

  const handleNext = () => {
    // Navigate to the NumberScreen
    navigation.navigate('NumberScreen');
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
        </View>
        <TouchableOpacity style={styles.fab} onPress={handleNext} activeOpacity={0.8}>
          <Ionicons name="arrow-forward" size={32} color="#fff" />
        </TouchableOpacity>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const NumberScreen = ({ navigation }) => {
  const [phoneNumber, setPhoneNumber] = useState('');

  const handleNext = () => {
    // Navigate to the VerificationScreen
    navigation.navigate('VerificationScreen');
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.innerContainer}>
          <Text style={styles.title}>what's your number?</Text>
          <TextInput
            style={styles.input}
            placeholder="(xxx) xxx-xxxx"
            placeholderTextColor="#B0B0B0"
            value={phoneNumber}
            onChangeText={setPhoneNumber}
            keyboardType="phone-pad"
            returnKeyType="done"
          />
        </View>
        <TouchableOpacity style={styles.fab} onPress={handleNext} activeOpacity={0.8}>
          <Ionicons name="arrow-forward" size={32} color="#fff" />
        </TouchableOpacity>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const VerificationScreen = ({ navigation }) => {
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const inputs = useRef([]);

  const handleChangeText = (text, index) => {
    const newCode = [...code];
    newCode[index] = text;
    setCode(newCode);

    // Move to next input if text is entered
    if (text && index < 5) {
      inputs.current[index + 1].focus();
    }
  };

  const handleNext = () => {
    // Navigate to the IntroScreenOne
    navigation.navigate('IntroScreenOne');
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
            <Text style={styles.subtitle}>Enter the verification sent to (xxx)-xxx-xxxx.</Text>
            <View style={styles.codeContainer}>
              {code.map((digit, index) => (
                <TextInput
                  key={index}
                  ref={(ref) => (inputs.current[index] = ref)}
                  style={styles.codeInput}
                  keyboardType="number-pad"
                  maxLength={1}
                  onChangeText={(text) => handleChangeText(text, index)}
                  value={digit}
                />
              ))}
            </View>
          </View>
          <TouchableOpacity style={styles.fab} onPress={handleNext} activeOpacity={0.8}>
            <Ionicons name="arrow-forward" size={32} color="#fff" />
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </TouchableWithoutFeedback>
  );
};

const IntroScreenOne = ({ navigation }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 1000,
      useNativeDriver: true,
    }).start();

    const timer = setTimeout(() => {
      navigation.navigate('IntroScreenTwo');
    }, 3000); // Adjust time for reading

    return () => clearTimeout(timer);
  }, [fadeAnim, navigation]);

  return (
    <SafeAreaView style={styles.container}>
      <Animated.View style={{ ...styles.innerContainer, opacity: fadeAnim }}>
        <Text style={styles.title}>sig is the easiest way to let your friends know you're free...</Text>
      </Animated.View>
    </SafeAreaView>
  );
};

const IntroScreenTwo = ({ navigation }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 1000,
      useNativeDriver: true,
    }).start();

    const timer = setTimeout(() => {
      navigation.navigate('SyncPermissionScreen');
    }, 3000); // Adjust time for reading

    return () => clearTimeout(timer);
  }, [fadeAnim, navigation]);

  return (
    <SafeAreaView style={styles.container}>
      <Animated.View style={{ ...styles.innerContainer, opacity: fadeAnim }}>
        <Text style={styles.title}>...and to see when they are too.</Text>
      </Animated.View>
    </SafeAreaView>
  );
};

const SyncPermissionScreen = ({ navigation }) => {
  const handleSync = () => {
    // Handle sync logic here
    navigation.navigate('Permissions', { screen: 'Permissions' });
  };

  const handleSkip = () => {
    // Handle skip logic here
    navigation.navigate('Permissions', { screen: 'Permissions' });
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.innerContainer}>
        <Text style={styles.title}>sync your contacts to start building your cave now.</Text>
      </View>
      <View style={styles.buttonContainer}>
        <TouchableOpacity style={styles.syncButton} onPress={handleSync} activeOpacity={0.8}>
          <Text style={styles.syncButtonText}>let's go</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={handleSkip} activeOpacity={0.8}>
          <Text style={styles.skipText}>I do not want to sync right now.</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const OnboardingNavigator = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        cardStyle: { backgroundColor: '#FFFFFF' },
      }}
    >
      <Stack.Screen name="NameScreen" component={NameScreen} />
      <Stack.Screen name="NumberScreen" component={NumberScreen} />
      <Stack.Screen name="VerificationScreen" component={VerificationScreen} />
      <Stack.Screen name="IntroScreenOne" component={IntroScreenOne} />
      <Stack.Screen name="IntroScreenTwo" component={IntroScreenTwo} />
      <Stack.Screen name="SyncPermissionScreen" component={SyncPermissionScreen} />
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
});

export default OnboardingNavigator; 