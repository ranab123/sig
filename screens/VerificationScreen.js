// After successful verification, modify the navigation code to pass firstName and lastName:

// Navigate to the next screen
navigation.navigate('SyncPermissionScreen', {
  firstName,
  lastName,
  phoneNumber
}); 