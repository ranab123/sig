import * as React from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator, TransitionPresets } from '@react-navigation/stack';
import PermissionsScreen from './screens/PermissionsScreen';
import FriendsListScreen from './screens/FriendsListScreen';
import SendCaveLinkScreen from './screens/SendCaveLinkScreen';
import SkippedSyncingScreen from './screens/SkippedSyncingScreen';
import ShareSheetScreen from './screens/ShareSheetScreen';
import OnboardingNavigator from './screens/OnboardingScreen';
import NotSharedScreen from './screens/NotSharedScreen';
import TheCaveScreen from './screens/TheCaveScreen';
import FriendsScreen from './screens/FriendsScreen';
import AddFriendScreen from './screens/AddFriendScreen';
import SettingsScreen from './screens/SettingsScreen';
import { AuthProvider } from './context/AuthContext';
import { BatIconContext } from './context/BatIconContext';
import * as Notifications from 'expo-notifications';
import { saveFCMToken } from './firebase/services';
import { useAuth } from './context/AuthContext';
import NotificationBanner from './components/NotificationBanner';

// Import the location task to ensure it's registered
import './firebase/locationTasks';

// Set up notifications handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

// Notification handler component
const NotificationHandler = ({ onShowNotification }) => {
  const { currentUser } = useAuth();
  
  React.useEffect(() => {
    let notificationListener;
    let responseListener;
    
    const setupNotifications = async () => {
      if (currentUser) {
        // Save FCM token when user is authenticated
        try {
          await saveFCMToken(currentUser.uid);
        } catch (error) {
          console.error('Error saving FCM token:', error);
        }
        
        // Listen for notifications when app is in foreground
        notificationListener = Notifications.addNotificationReceivedListener(notification => {
          console.log('Notification received:', notification);
          
          // Show in-app notification banner
          if (onShowNotification) {
            onShowNotification({
              title: notification.request.content.title,
              body: notification.request.content.body,
              data: notification.request.content.data,
            });
          }
        });
        
        // Handle notification tap/response
        responseListener = Notifications.addNotificationResponseReceivedListener(response => {
          console.log('Notification response:', response);
          
          const notificationData = response.notification.request.content.data;
          
          // Handle different notification types
          if (notificationData?.type === 'sig_status_change') {
            // Could navigate to specific friend or cave screen
            console.log(`Friend ${notificationData.userName} turned on their sig!`);
          }
        });
      }
    };
    
    setupNotifications();
    
    return () => {
      if (notificationListener) {
        notificationListener.remove();
      }
      if (responseListener) {
        responseListener.remove();
      }
    };
  }, [currentUser, onShowNotification]);
  
  return null;
};

const Stack = createStackNavigator();

// Create a custom navigation theme
const MyTheme = {
  dark: false,
  colors: {
    primary: '#111',
    background: '#ffffff',
    card: '#ffffff',
    text: '#111111',
    border: 'transparent',
    notification: '#7c3aed',
  },
};

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

// Custom navigation options with fade animation
const screenOptions = {
  headerShown: false,
  cardStyle: { backgroundColor: '#fff' },
  ...fadeTransition,
};

// Loading screen component
const LoadingScreen = () => (
  <View style={loadingStyles.container}>
    <Text style={loadingStyles.title}>sig</Text>
    <ActivityIndicator size="large" color="#111" style={loadingStyles.spinner} />
    <Text style={loadingStyles.subtitle}>Getting things ready...</Text>
  </View>
);

const loadingStyles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#111',
    marginBottom: 30,
  },
  spinner: {
    marginBottom: 20,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
  },
});

// Main App Navigator Component
const AppNavigator = () => {
  const { currentUser, loading, hasCompletedOnboarding } = useAuth();
  
  // Show loading screen while determining auth state
  if (loading) {
    return <LoadingScreen />;
  }
  
  // Determine initial route based on auth state
  let initialRoute = 'Onboarding';
  if (currentUser) {
    if (hasCompletedOnboarding) {
      initialRoute = 'TheCave';
    } else {
      initialRoute = 'Permissions';
    }
  }
  
  console.log('App Navigator - User:', currentUser ? 'Authenticated' : 'Not authenticated');
  console.log('App Navigator - Onboarding completed:', hasCompletedOnboarding);
  console.log('App Navigator - Initial route:', initialRoute);

  return (
    <Stack.Navigator 
      initialRouteName={initialRoute}
      screenOptions={screenOptions}
    >
      <Stack.Screen 
        name="Onboarding" 
        component={OnboardingNavigator} 
      />
      <Stack.Screen 
        name="SkippedSyncing" 
        component={SkippedSyncingScreen} 
      />
      <Stack.Screen 
        name="Permissions" 
        component={PermissionsScreen} 
      />
      <Stack.Screen 
        name="FriendsList" 
        component={FriendsListScreen} 
      />
      <Stack.Screen 
        name="SendCaveLink" 
        component={SendCaveLinkScreen} 
      />
      <Stack.Screen 
        name="ShareSheet" 
        component={ShareSheetScreen} 
      />
      <Stack.Screen 
        name="NotShared" 
        component={NotSharedScreen} 
      />
      <Stack.Screen 
        name="TheCave" 
        component={TheCaveScreen} 
      />
      <Stack.Screen 
        name="FriendsScreen" 
        component={FriendsScreen} 
      />
      <Stack.Screen 
        name="AddFriend" 
        component={AddFriendScreen} 
      />
      <Stack.Screen 
        name="Settings" 
        component={SettingsScreen} 
      />
    </Stack.Navigator>
  );
};

export default function App() {
  // State to track if the bat icon is shiny
  const [isShiny, setIsShiny] = React.useState(false);
  
  // State for in-app notifications
  const [currentNotification, setCurrentNotification] = React.useState(null);
  
  // Create the context value object
  const batIconValue = React.useMemo(
    () => ({ isShiny, setIsShiny }),
    [isShiny]
  );

  const handleShowNotification = (notification) => {
    setCurrentNotification(notification);
  };

  const handleDismissNotification = () => {
    setCurrentNotification(null);
  };

  const handleNotificationPress = (notification) => {
    // Handle notification press - could navigate to specific screen
    console.log('Notification pressed:', notification);
    
    if (notification.data?.type === 'sig_status_change') {
      // Could navigate to the cave or friend's profile
      console.log(`Navigate to see ${notification.data.userName}`);
    }
  };

  return (
    <AuthProvider>
      <BatIconContext.Provider value={batIconValue}>
        <NotificationHandler onShowNotification={handleShowNotification} />
        <NavigationContainer theme={MyTheme}>
          <AppNavigator />
          
          {/* In-app notification banner */}
          <NotificationBanner
            notification={currentNotification}
            onPress={handleNotificationPress}
            onDismiss={handleDismissNotification}
          />
        </NavigationContainer>
      </BatIconContext.Provider>
    </AuthProvider>
  );
}
