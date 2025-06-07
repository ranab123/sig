import React, { useState, useContext, useEffect } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, Dimensions, FlatList, Linking, Alert, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppleMaps, GoogleMaps } from 'expo-maps';
import { BatIconContext } from '../context/BatIconContext';
import { useAuth } from '../context/AuthContext';
import { getUserFriends } from '../firebase/services';

const { height, width } = Dimensions.get('window');

const TheCaveScreen = ({ navigation }) => {
  // Access the shared bat icon state with fallback
  const batContext = useContext(BatIconContext);
  const isShiny = batContext?.isShiny ?? false;
  const { currentUser } = useAuth();
  
  // Check if user can access the cave
  useEffect(() => {
    if (!isShiny) {
      // If bat is not shiny, redirect back to NotShared
      navigation.replace('NotShared');
    }
  }, [isShiny, navigation]);

  // Friends data with actual sig status and location
  const [friends, setFriends] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // View toggle state - true for map view, false for list view
  const [isMapView, setIsMapView] = useState(false);
  
  // Map region state for controlling the map view
  const [mapRegion, setMapRegion] = useState({
    latitude: 37.7749, // default to San Francisco
    longitude: -122.4194,
    latitudeDelta: 0.05,
    longitudeDelta: 0.05,
  });

  useEffect(() => {
    loadFriends();
  }, [currentUser]);

  const loadFriends = async () => {
    console.log('Starting to load friends data');
    
    // first check if we have a current user
    let doWeHaveCurrentUser = false;
    if (currentUser) {
      doWeHaveCurrentUser = true;
      console.log('We have current user:', currentUser.uid);
    } else {
      console.log('No current user available');
    }
    
    if (!doWeHaveCurrentUser) {
      console.log('Cannot load friends without current user, returning early');
      return;
    }
    
    try {
      console.log('Attempting to get user friends from Firebase');
      
      // call the Firebase service to get friends
      const userFriendsFromFirebase = await getUserFriends(currentUser.uid);
      console.log('Successfully received friends data from Firebase');
      console.log('Number of friends received:', userFriendsFromFirebase.length);
      
      // update the friends state with the data we received
      setFriends(userFriendsFromFirebase);
      console.log('Friends state has been updated');
      
      // now we need to update the map region to show all friends
      console.log('Checking if we should update map region');
      
      let shouldWeUpdateMapRegion = false;
      let numberOfFriendsReceived = userFriendsFromFirebase.length;
      
      if (numberOfFriendsReceived > 0) {
        shouldWeUpdateMapRegion = true;
        console.log('We have friends, so we should update map region');
      } else {
        console.log('We have no friends, so no need to update map region');
      }
      
      if (shouldWeUpdateMapRegion === true) {
        console.log('Calling function to calculate map region for friends');
        calculateMapRegionForFriends(userFriendsFromFirebase);
      }
      
    } catch (error) {
      console.error('Something went wrong while loading friends:', error);
      console.error('Error message:', error.message);
    } finally {
      console.log('Setting loading state to false');
      setLoading(false);
      console.log('Loading friends process completed');
    }
  };
  
  // function to toggle between map view and list view
  const toggleViewMode = () => {
    
    // check what the current view mode is
    let whatIsTheCurrentViewMode = isMapView;
    
    // decide what the new view mode should be
    let whatShouldTheNewViewModeBecome = false;
    
    // if currently showing map view switch to list view
    if (whatIsTheCurrentViewMode === true) {
      whatShouldTheNewViewModeBecome = false;
    } else {
      whatShouldTheNewViewModeBecome = true;
    }
    
    let newModeDescription = '';
    if (whatShouldTheNewViewModeBecome === true) {
      newModeDescription = 'map';
    } else {
      newModeDescription = 'list';
    }

    // update the view mode state
    setIsMapView(whatShouldTheNewViewModeBecome);
  };
  
  //  calculate map region to show all friends
  const calculateMapRegionForFriends = (friendsList) => {
    
    // create empty array to store friends who have location
    let friendsWhoHaveLocation = [];

    for (let friendIndex = 0; friendIndex < friendsList.length; friendIndex++) {
      let singleFriend = friendsList[friendIndex];
      
      // check if this friend has location data
      let doesFriendHaveLocationData = false;
      let doesFriendHaveLatitude = false;
      let doesFriendHaveLongitude = false;
      
      // check if location object exists
      if (singleFriend.location) {
        
        // check if latitude exists
        if (singleFriend.location.latitude) {
          doesFriendHaveLatitude = true;
        }
        
        // check if longitude exists
        if (singleFriend.location.longitude) {
          doesFriendHaveLongitude = true;
        }
        
        // if both latitude and longitude exist
        if (doesFriendHaveLatitude === true && doesFriendHaveLongitude === true) {
          doesFriendHaveLocationData = true;
        }
      }
      
      // if friend has complete location data, add to our array
      if (doesFriendHaveLocationData === true) {
        friendsWhoHaveLocation.push(singleFriend);
      } 
    }
    
    let numberOfFriendsWithLocation = friendsWhoHaveLocation.length;
    
    // if no friends have location, keep default region
    if (numberOfFriendsWithLocation === 0) {
      return;
    }
    
    // get the first friend's location
    let firstFriendLocation = friendsWhoHaveLocation[0].location;
    let startingLatitude = firstFriendLocation.latitude;
    let startingLongitude = firstFriendLocation.longitude;
    
    // set initial min and max values
    let smallestLatitude = startingLatitude;
    let largestLatitude = startingLatitude;
    let smallestLongitude = startingLongitude;
    let largestLongitude = startingLongitude;

    // use all friends location to find bounds of map
    for (let locationIndex = 0; locationIndex < friendsWhoHaveLocation.length; locationIndex++) {
      let currentFriendWithLocation = friendsWhoHaveLocation[locationIndex];
      let currentFriendLocation = currentFriendWithLocation.location;
      let currentFriendLatitude = currentFriendLocation.latitude;
      let currentFriendLongitude = currentFriendLocation.longitude;

      if (currentFriendLatitude < smallestLatitude) {
        smallestLatitude = currentFriendLatitude;
      }
      
      // check if this latitude is larger than our current largest
      if (currentFriendLatitude > largestLatitude) {
        largestLatitude = currentFriendLatitude;
      }
      
      // check if this longitude is smaller than our current smallest
      if (currentFriendLongitude < smallestLongitude) {
        smallestLongitude = currentFriendLongitude;
      }
      
      // check if this longitude is larger than our current largest
      if (currentFriendLongitude > largestLongitude) {
        largestLongitude = currentFriendLongitude;
      }
    }
    
    // calculate center point with averaging min and max
    let centerLatitudeCalculation = smallestLatitude + largestLatitude;
    let finalCenterLatitude = centerLatitudeCalculation / 2;
    
    let centerLongitudeCalculation = smallestLongitude + largestLongitude;
    let finalCenterLongitude = centerLongitudeCalculation / 2;
    
    // calculate how much area to show
    let latitudeRange = largestLatitude - smallestLatitude;
    let longitudeRange = largestLongitude - smallestLongitude;
    
    // add padding 
    let paddingMultiplier = 1.5;
    let latitudeDeltaWithPadding = latitudeRange * paddingMultiplier;
    let longitudeDeltaWithPadding = longitudeRange * paddingMultiplier;

    // set minimum zoom level
    let minimumDeltaValue = 0.01;
    let finalLatitudeDelta = latitudeDeltaWithPadding;
    let finalLongitudeDelta = longitudeDeltaWithPadding;
    
    if (latitudeDeltaWithPadding < minimumDeltaValue) {
      finalLatitudeDelta = minimumDeltaValue;
    }
    
    if (longitudeDeltaWithPadding < minimumDeltaValue) {
      finalLongitudeDelta = minimumDeltaValue;
    }
    
    // create the new map region object
    let newCalculatedMapRegion = {
      latitude: finalCenterLatitude,
      longitude: finalCenterLongitude,
      latitudeDelta: finalLatitudeDelta,
      longitudeDelta: finalLongitudeDelta,
    };
    
    setMapRegion(newCalculatedMapRegion);
  };
  
  // this function renders the map view with friend markers
  const renderMapView = () => {
    let areWeRunningOnIOS = false;
    let areWeRunningOnAndroid = false;
    let whatPlatformAreWeOn = Platform.OS;
    
    // check if we are on iOS
    if (whatPlatformAreWeOn === 'ios') {
      areWeRunningOnIOS = true;
    } else if (whatPlatformAreWeOn === 'android') {
      areWeRunningOnAndroid = true;
    } else {
      console.log('unknown platform:', whatPlatformAreWeOn);
    }
    
    // prepare view position for the map
    
    let mapCenterLatitude = mapRegion.latitude;
    let mapCenterLongitude = mapRegion.longitude;
    let mapZoomLevel = 15; 
    
    let cameraPositionForMap = {
      coordinates: {
        latitude: mapCenterLatitude,
        longitude: mapCenterLongitude,
      },
      zoom: mapZoomLevel,
    };
    
    console.log('Camera position prepared:', cameraPositionForMap);
    
    // create markers for all friends who have location

    let arrayOfMarkersForMap = [];
    let numberOfMarkersCreated = 0;
    
    // go through each friend one by one
    for (let friendIndex = 0; friendIndex < friends.length; friendIndex++) {
      let currentFriendBeingProcessed = friends[friendIndex];

      // check if this friend has location data
      let doesThisFriendHaveLocationData = false;
      let friendLocationLatitude = null;
      let friendLocationLongitude = null;
      
      if (currentFriendBeingProcessed.location) {
        
        // check if latitude and longitude exist
        if (currentFriendBeingProcessed.location.latitude && currentFriendBeingProcessed.location.longitude) {
          doesThisFriendHaveLocationData = true;
          friendLocationLatitude = currentFriendBeingProcessed.location.latitude;
          friendLocationLongitude = currentFriendBeingProcessed.location.longitude;
        } 
      } 
      
      // if friend doesn't have location data, skip to next friend
      if (doesThisFriendHaveLocationData === false) {
        continue;
      }
      
      // create marker for this friend
      let markerUniqueId = 'marker_' + currentFriendBeingProcessed.id;
      let markerDisplayTitle = currentFriendBeingProcessed.firstName + ' ' + currentFriendBeingProcessed.lastName;
      let markerSnippetText = '';
      
      // add text to marker based on friend's sig status
      let isFriendCurrentlyAvailable = currentFriendBeingProcessed.sigStatus;
      if (isFriendCurrentlyAvailable === true) {
        let friendLocationBuildingName = currentFriendBeingProcessed.location.buildingName;
        if (friendLocationBuildingName) {
          markerSnippetText = 'Available at ' + friendLocationBuildingName;
        } else {
          markerSnippetText = 'Available at Unknown Location';
        }
      } else {
        markerSnippetText = 'Not available';
      }
      
      console.log('Marker title:', markerDisplayTitle);
      console.log('Marker snippet:', markerSnippetText);
      
      // create the marker 
      let singleMarkerData = {
        id: markerUniqueId,
        coordinates: {
          latitude: friendLocationLatitude,
          longitude: friendLocationLongitude,
        },
        title: markerDisplayTitle,
        snippet: markerSnippetText,
      };
      
      // add the marker to the array
      arrayOfMarkersForMap.push(singleMarkerData);
      numberOfMarkersCreated = numberOfMarkersCreated + 1;
    }
    
    
    // function to handle when the viewport change
    const handleMapCameraMovement = function(eventData) {
      
      let newCameraLatitude = eventData.coordinates.latitude;
      let newCameraLongitude = eventData.coordinates.longitude;

      // update our map region to the new viewport
      let updatedMapRegion = {
        latitude: newCameraLatitude,
        longitude: newCameraLongitude,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      };
      setMapRegion(updatedMapRegion);
    };
    
    // this function handles when a marker is clicked
    const handleMarkerClick = function(eventData) {
      
      let clickedMarkerUniqueId = eventData.id;
      
      // extract friend ID from marker ID
      let friendIdFromMarker = clickedMarkerUniqueId.replace('marker_', ''); 
      let friendThatWasClicked = null;
      
      for (let searchIndex = 0; searchIndex < friends.length; searchIndex++) {
        let friendToCheck = friends[searchIndex];
        if (friendToCheck.id === friendIdFromMarker) {
          friendThatWasClicked = friendToCheck;
          break;
        }
      }
      
      // if we friend is found, show action sheet
      if (friendThatWasClicked !== null) {
        
        let alertTitle = friendThatWasClicked.firstName + ' ' + friendThatWasClicked.lastName;
        let alertMessage = '';
        
        if (friendThatWasClicked.sigStatus === true) {
          alertMessage = 'Available';
        } else {
          alertMessage = 'Not available';
        }
        
        // show action sheet
        Alert.alert(
          alertTitle,
          alertMessage,
          [
            {
              text: 'Message',
              onPress: function() {
                let friendPhoneNumberForMessage = friendThatWasClicked.phoneNumber;
                let friendFirstNameForMessage = friendThatWasClicked.firstName;
                openMessage(friendPhoneNumberForMessage, friendFirstNameForMessage);
              }
            },
            {
              text: 'Navigate',
              onPress: function() {
                let friendLocationForNavigation = friendThatWasClicked.location;
                let friendFirstNameForNavigation = friendThatWasClicked.firstName;
                openMaps(friendLocationForNavigation, friendFirstNameForNavigation);
              }
            },
            {
              text: 'Cancel',
              style: 'cancel'
            }
          ]
        );
      } 
    };
    
    //  render the appropriate map component based on platform
    return (
      <View style={styles.mapContainer}>
        {/* check which platform and render appropriate map */}
        {areWeRunningOnIOS === true ? (
          // render apple maps for iOS
          <AppleMaps.View
            style={styles.map}
            cameraPosition={cameraPositionForMap}
            markers={arrayOfMarkersForMap}
            onCameraMove={handleMapCameraMovement}
            onMarkerClick={handleMarkerClick}
          />
        ) : areWeRunningOnAndroid === true ? (
          // render google maps for Android
          <GoogleMaps.View
            style={styles.map}
            cameraPosition={cameraPositionForMap}
            markers={arrayOfMarkersForMap}
            onCameraMove={handleMapCameraMovement}
            onMarkerClick={handleMarkerClick}
          />
        ) : (
          // fallback for other platforms
          <View style={styles.map}></View>
        )}
      </View>
    );
  };

  const formatLocationText = (friend) => {
    if (!friend.sigStatus || !friend.location) {
      return friend.sigStatus ? 'Available' : 'Not available';
    }

    const { buildingName, timestamp } = friend.location;
    
    // Handle cases where buildingName might be undefined (legacy data)
    const safeBuildingName = buildingName && buildingName.trim() ? buildingName.trim() : 'Unknown Location';
    
    // Calculate time since last update
    const lastUpdate = new Date(timestamp);
    const now = new Date();
    const diffMinutes = Math.floor((now - lastUpdate) / (1000 * 60));
    
    let timeText = '';
    if (diffMinutes < 1) {
      timeText = 'just now';
    } else if (diffMinutes < 60) {
      timeText = `${diffMinutes}m ago`;
    } else {
      const diffHours = Math.floor(diffMinutes / 60);
      if (diffHours < 24) {
        timeText = `${diffHours}h ago`;
      } else {
        const diffDays = Math.floor(diffHours / 24);
        timeText = `${diffDays}d ago`;
      }
    }
    
    return `at ${safeBuildingName} • ${timeText}`;
  };

  const openMessage = (phoneNumber, friendName) => {
    // check if we have a phone number
    let hasPhoneNumber = false;
    if (phoneNumber) {
      hasPhoneNumber = true;
    }
    
    if (!hasPhoneNumber) {
      // show error message if no phone number
      let errorTitle = 'No Phone Number';
      let errorMessage = `Cannot send message to ${friendName} - no phone number available.`;
      Alert.alert(errorTitle, errorMessage);
      return;
    }
    
    // create the SMS URL
    let smsUrl = 'sms:' + phoneNumber;
    let messageUrl = smsUrl;
    
    // check to see if device can open SMS and then open it
    Linking.canOpenURL(messageUrl).then(function(supported) {
      if (supported === true) {
        Linking.openURL(messageUrl);
      } else {
        // show error if can't open messaging app
        let errorTitle = 'Error';
        let errorMessage = 'Cannot open messaging app';
        Alert.alert(errorTitle, errorMessage);
      }
    });
  };

  const openMaps = (location, friendName) => {
    // check if we have location data
    let hasLocation = false;
    let hasLatitude = false;
    let hasLongitude = false;
    
    if (location) {
      hasLocation = true;
      if (location.latitude) {
        hasLatitude = true;
      }
      if (location.longitude) {
        hasLongitude = true;
      }
    }
    
    // make sure we have all required location data
    if (!hasLocation || !hasLatitude || !hasLongitude) {
      let errorTitle = 'No Location';
      let errorMessage = `Cannot open maps for ${friendName} - no location available.`;
      Alert.alert(errorTitle, errorMessage);
      return;
    }
    
    // get coordinates
    let userLatitude = location.latitude;
    let userLongitude = location.longitude;
    
    // create google maps URL
    let mapsBaseUrl = 'https://maps.google.com/maps?daddr=';
    let coordinatesString = userLatitude + ',' + userLongitude;
    let mapUrl = mapsBaseUrl + coordinatesString;
    
    // open maps
    Linking.canOpenURL(mapUrl).then(function(supported) {
      if (supported === true) {
        Linking.openURL(mapUrl);
      } else {
        // error if it can't open maps
        let errorTitle = 'Error';
        let errorMessage = 'Cannot open maps app';
        Alert.alert(errorTitle, errorMessage);
      }
    });
  };

  const renderFriend = ({ item }) => (
    <View style={[
      styles.friendItem, 
      item.sigStatus && styles.activeFriendItem
    ]}>
      <View style={styles.friendInfo}>
        <View style={styles.friendAvatar}>
          <Text style={styles.friendAvatarText}>
            {item.firstName?.[0] || '?'}
          </Text>
        </View>
        <View style={styles.friendDetails}>
          <Text style={[
            styles.friendName,
            item.sigStatus && styles.activeItemText
          ]}>
            {item.firstName} {item.lastName}
          </Text>
          <Text style={[
            styles.friendStatus,
            item.sigStatus && styles.activeItemText
          ]}>
            {formatLocationText(item)}
          </Text>
        </View>
      </View>
      
      {/* messaging and navigation buttons */}
      <View style={styles.actionButtons}>
        <TouchableOpacity 
          style={styles.actionButton}
          onPress={() => {
            // call function to send message to this friend
            let friendPhoneNumber = item.phoneNumber;
            let friendFirstName = item.firstName;
            openMessage(friendPhoneNumber, friendFirstName);
          }}
        >
          <Ionicons name="chatbubble-outline" size={18} color="#111" />
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.actionButton}
          onPress={() => {
            // call function to open maps for this friend
            let friendLocationData = item.location;
            let friendFirstName = item.firstName;
            openMaps(friendLocationData, friendFirstName);
          }}
        >
          <Ionicons name="navigate-outline" size={18} color="#111" />
        </TouchableOpacity>
      </View>
    </View>
  );

  const EmptyComponent = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="people-outline" size={64} color="#ccc" />
      <Text style={styles.emptyText}>No friends yet</Text>
      <Text style={styles.emptySubText}>Add friends to see when they're available</Text>
      <TouchableOpacity 
        style={styles.addFriendsButton}
        onPress={() => navigation.navigate('AddFriend')}
      >
        <Text style={styles.addFriendsButtonText}>Add Friends</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerText}>the cave</Text>
        <Text style={styles.headerSubtext}>see where your friends are</Text>
        
        {/* view toggle buttons */}
        <View style={styles.viewToggleContainer}>
          <TouchableOpacity 
            style={[
              styles.toggleButton, 
              !isMapView && styles.toggleButtonActive
            ]}
            onPress={() => {
              console.log('List view button was pressed by user');
              
              // check what the current view mode is
              let areWeCurrentlyShowingMapView = isMapView;
              console.log('Are we currently showing map view?', areWeCurrentlyShowingMapView);
              
              // only switch if we are currently showing map view
              if (areWeCurrentlyShowingMapView === true) {
                console.log('We are showing map view, so we should switch to list view');
                toggleViewMode();
              } else {
                console.log('We are already showing list view, no need to switch');
              }
            }}
          >
            <Ionicons 
              name="list-outline" 
              size={20} 
              color={!isMapView ? '#fff' : '#111'} 
            />
            <Text style={[
              styles.toggleButtonText,
              !isMapView && styles.toggleButtonTextActive
            ]}>
              List
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[
              styles.toggleButton, 
              isMapView && styles.toggleButtonActive
            ]}
            onPress={() => {
              console.log('Map view button was pressed by user');
              
              // check what the current view mode is
              let areWeCurrentlyShowingListView = !isMapView;
              console.log('Are we currently showing list view?', areWeCurrentlyShowingListView);
              
              // only switch if we are currently showing list view
              if (areWeCurrentlyShowingListView === true) {
                console.log('We are showing list view, so we should switch to map view');
                toggleViewMode();
              } else {
                console.log('We are already showing map view, no need to switch');
              }
            }}
          >
            <Ionicons 
              name="map-outline" 
              size={20} 
              color={isMapView ? '#fff' : '#111'} 
            />
            <Text style={[
              styles.toggleButtonText,
              isMapView && styles.toggleButtonTextActive
            ]}>
              Map
            </Text>
          </TouchableOpacity>
        </View>
      </View>
      
      <View style={styles.content}>
        {loading ? (
          // show loading state while data is being fetched
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>Loading friends...</Text>
          </View>
        ) : (
          // data has been loaded, now show either map view or list view
          <View style={styles.contentContainer}>
            {/* figure out which view to show based on toggle state */}
            {(() => {
              // check what the current view mode is set to
              let shouldWeShowMapView = isMapView;
              console.log('Content render: should we show map view?', shouldWeShowMapView);
              
              if (shouldWeShowMapView === true) {
                console.log('Content render: showing map view');
                // show map view
                return (
                  <View style={styles.mapViewContainer}>
                    {renderMapView()}
                  </View>
                );
              } else {
                console.log('Content render: showing list view');
                // show list view
                return (
                  <View style={styles.listViewContainer}>
                    <FlatList
                      data={friends}
                      renderItem={renderFriend}
                      keyExtractor={item => item.id}
                      ListEmptyComponent={EmptyComponent}
                      showsVerticalScrollIndicator={false}
                      style={styles.friendsList}
                      contentContainerStyle={styles.friendsListContent}
                    />
                  </View>
                );
              }
            })()}
          </View>
        )}
      </View>
      
      <View style={styles.bottomNavContainer}>
        <View style={styles.bottomNav}>
          <TouchableOpacity 
            style={styles.navItem}
            onPress={() => navigation.navigate('NotShared')}
          >
            <Image 
              source={require('../assets/bat-logo.png')} 
              style={styles.batSignalIcon}
              resizeMode="contain"
            />
          </TouchableOpacity>
          <TouchableOpacity style={styles.navItemActive}>
            <Image 
              source={require('../assets/caveVector.png')} 
              style={styles.caveIcon}
              resizeMode="contain"
            />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    marginTop: height / 8,
    alignItems: 'center',
    marginBottom: 30,
  },
  headerText: {
    fontSize: 32,
    fontWeight: 'bold',
  },
  headerSubtext: {
    fontSize: 16,
    color: '#666',
    marginTop: 8,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
  },
  friendsList: {
    flex: 1,
  },
  friendsListContent: {
    paddingBottom: 120,
  },
  friendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 20,
    backgroundColor: '#f8f8f8',
    borderRadius: 12,
    marginBottom: 12,
  },
  activeFriendItem: {
    backgroundColor: '#e8f5e8',
  },
  friendInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
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
  friendAvatarText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  friendDetails: {
    flex: 1,
  },
  friendName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111',
    marginBottom: 4,
  },
  friendStatus: {
    fontSize: 14,
    color: '#666',
  },
  activeItemText: {
    color: '#22c55e',
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  locationIcon: {
    marginRight: 4,
  },
  actionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  actionButton: {
    paddingTop: 10,
    paddingBottom: 10,
    paddingLeft: 10,
    paddingRight: 10,
    marginLeft: 8,
    marginRight: 0,
    marginTop: 0,
    marginBottom: 0,
    borderRadius: 8,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#dddddd',
    borderStyle: 'solid',
  },
  statusIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  activeIndicator: {
    backgroundColor: '#22c55e',
  },
  inactiveIndicator: {
    backgroundColor: '#ccc',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#666',
    marginTop: 20,
    marginBottom: 10,
  },
  emptySubText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 30,
  },
  addFriendsButton: {
    backgroundColor: '#111',
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 8,
  },
  addFriendsButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  bottomNavContainer: {
    position: 'absolute',
    bottom: height / 10,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  bottomNav: {
    flexDirection: 'row',
    borderRadius: 10,
    overflow: 'hidden',
    width: 250,
    height: 60,
    borderWidth: 2,
    borderColor: '#000',
  },
  navItem: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  navItemActive: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
  batSignalIcon: {
    width: 32,
    height: 32,
    tintColor: '#000',
  },
  caveIcon: {
    width: 32,
    height: 32,
    tintColor: '#fff',
  },
  mapContainer: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 0,
    marginTop: 0,
    marginBottom: 0,
    marginLeft: 0,
    marginRight: 0,
  },
  map: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  viewToggleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 15,
    marginBottom: 10,
  },
  toggleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 8,
    paddingBottom: 8,
    paddingLeft: 12,
    paddingRight: 12,
    borderWidth: 1,
    borderColor: '#111',
    borderStyle: 'solid',
    borderRadius: 8,
    marginLeft: 5,
    marginRight: 5,
    backgroundColor: '#ffffff',
  },
  toggleButtonActive: {
    backgroundColor: '#111',
  },
  toggleButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#111',
    marginLeft: 5,
  },
  toggleButtonTextActive: {
    color: '#ffffff',
  },
  contentContainer: {
    flex: 1,
  },
  mapViewContainer: {
    flex: 1,
  },
  listViewContainer: {
    flex: 1,
  },
  fallbackText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginTop: 100,
  },
});

export default TheCaveScreen; 