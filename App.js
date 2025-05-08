import * as React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import PermissionsScreen from './screens/PermissionsScreen';
import FriendsListScreen from './screens/FriendsListScreen';
import SendCaveLinkScreen from './screens/SendCaveLinkScreen';
import SkippedSyncingScreen from './screens/SkippedSyncingScreen';
import ShareSheetScreen from './screens/ShareSheetScreen';

const Stack = createStackNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Permissions">
        <Stack.Screen 
          name="Permissions" 
          component={PermissionsScreen} 
          options={{ headerShown: false }}
        />
        <Stack.Screen 
          name="FriendsList" 
          component={FriendsListScreen} 
          options={{ headerShown: false }}
        />
        <Stack.Screen 
          name="SendCaveLink" 
          component={SendCaveLinkScreen} 
          options={{ headerShown: false }}
        />
        <Stack.Screen 
          name="SkippedSyncing" 
          component={SkippedSyncingScreen} 
          options={{ headerShown: false }}
        />
        <Stack.Screen 
          name="ShareSheet" 
          component={ShareSheetScreen} 
          options={{ headerShown: false }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
