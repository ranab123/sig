import * as React from 'react';
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
import * as Notifications from 'expo-notifications';

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

// Create a context for the bat icon state
export const BatIconContext = React.createContext({
  isShiny: false,
  setIsShiny: () => {},
});

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

export default function App() {
  // State to track if the bat icon is shiny
  const [isShiny, setIsShiny] = React.useState(false);
  
  // Create the context value object
  const batIconValue = React.useMemo(
    () => ({ isShiny, setIsShiny }),
    [isShiny]
  );

  return (
    <AuthProvider>
      <BatIconContext.Provider value={batIconValue}>
        <NavigationContainer theme={MyTheme}>
          <Stack.Navigator 
            initialRouteName="Onboarding"
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
        </NavigationContainer>
      </BatIconContext.Provider>
    </AuthProvider>
  );
}
