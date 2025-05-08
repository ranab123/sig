import * as React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import PermissionsScreen from './screens/PermissionsScreen';
import FriendsListScreen from './screens/FriendsListScreen';
import SendCaveLinkScreen from './screens/SendCaveLinkScreen';
import SkippedSyncingScreen from './screens/SkippedSyncingScreen';
import ShareSheetScreen from './screens/ShareSheetScreen';
import OnboardingNavigator from './screens/OnboardingScreen';
import NotSharedScreen from './screens/NotSharedScreen';
import TheCaveScreen from './screens/TheCaveScreen';

// Create a context for the bat icon state
export const BatIconContext = React.createContext({
  isShiny: false,
  setIsShiny: () => {},
});

const Stack = createStackNavigator();

// Create a custom navigation theme to disable animations globally
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

// Custom navigation options to disable animations
const screenOptions = {
  headerShown: false,
  animationEnabled: false,
  cardStyle: { backgroundColor: '#fff' },
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
            name="SkippedSyncing" 
            component={SkippedSyncingScreen} 
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
        </Stack.Navigator>
      </NavigationContainer>
    </BatIconContext.Provider>
  );
}
