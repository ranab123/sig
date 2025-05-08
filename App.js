import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import OnboardingNavigator from './screens/OnboardingScreen';

export default function App() {
  return (
    <NavigationContainer>
      <OnboardingNavigator />
    </NavigationContainer>
  );
}
