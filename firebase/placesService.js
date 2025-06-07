// Environment configuration - inlined to avoid build issues
const config = {
  development: {
    GOOGLE_PLACES_API_KEY: 'AIzaSyCjUsHNXnX34z7mVgFhT12d8lHmiLx4aZI',
  },
  production: {
    // In production, load from process.env or secure storage
    GOOGLE_PLACES_API_KEY: process.env.GOOGLE_PLACES_API_KEY || 'AIzaSyCjUsHNXnX34z7mVgFhT12d8lHmiLx4aZI',
  }
};

const environment = __DEV__ ? 'development' : 'production';
const currentConfig = config[environment];

const GOOGLE_PLACES_API_KEY = currentConfig.GOOGLE_PLACES_API_KEY;
const PLACES_API_BASE_URL = 'https://maps.googleapis.com/maps/api/place';

// Cache for location results to minimize API calls
const locationCache = new Map();
const CACHE_DURATION = 10 * 60 * 1000; // 10 minutes

/**
 * Get building name from coordinates using Google Places API
 * @param {number} latitude 
 * @param {number} longitude 
 * @returns {Promise<string>} Building name or fallback location
 */
export const getBuildingNameFromCoordinates = async (latitude, longitude) => {
  try {
    // Validate inputs
    if (!latitude || !longitude || isNaN(latitude) || isNaN(longitude)) {
      console.warn('Invalid coordinates provided:', { latitude, longitude });
      return 'Unknown Location';
    }

    // Check if API key is available
    if (!GOOGLE_PLACES_API_KEY) {
      console.warn('Google Places API key not found');
      return 'Unknown Location';
    }

    // Create cache key
    const cacheKey = `${latitude.toFixed(4)},${longitude.toFixed(4)}`;
    
    // Check cache first
    const cached = locationCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      console.log('Using cached location:', cached.buildingName);
      return cached.buildingName;
    }

    console.log(`Fetching location for coordinates: ${latitude}, ${longitude}`);

    // Use Nearby Search to find specific buildings/places
    const nearbyUrl = `${PLACES_API_BASE_URL}/nearbysearch/json?location=${latitude},${longitude}&radius=50&type=establishment&key=${GOOGLE_PLACES_API_KEY}`;
    
    console.log('Making Nearby Search API call...');
    const nearbyResponse = await fetch(nearbyUrl);
    
    if (!nearbyResponse.ok) {
      console.error('Nearby Search API response not ok:', nearbyResponse.status, nearbyResponse.statusText);
      throw new Error(`API response not ok: ${nearbyResponse.status}`);
    }
    
    const nearbyData = await nearbyResponse.json();
    console.log('Nearby Search API response status:', nearbyData.status);

    if (nearbyData.status === 'OK' && nearbyData.results && nearbyData.results.length > 0) {
      console.log(`Found ${nearbyData.results.length} nearby places`);
      
      // Look for specific building types first
      const buildingTypes = ['university', 'school', 'library', 'hospital', 'shopping_mall', 'restaurant', 'cafe', 'gym'];
      
      for (const place of nearbyData.results) {
        // Check if this place has building-like types
        const hasRelevantType = place.types && place.types.some(type => 
          buildingTypes.includes(type) || 
          type.includes('establishment') ||
          type.includes('point_of_interest')
        );
        
        if (hasRelevantType && place.name) {
          const buildingName = place.name;
          console.log('Found building via Nearby Search:', buildingName);
          
          // Cache the result
          locationCache.set(cacheKey, {
            buildingName,
            timestamp: Date.now()
          });
          
          return buildingName;
        }
      }
      
      // If no relevant building found, use the first result with a name
      if (nearbyData.results[0] && nearbyData.results[0].name) {
        const buildingName = nearbyData.results[0].name;
        console.log('Using first nearby place:', buildingName);
        
        // Cache the result
        locationCache.set(cacheKey, {
          buildingName,
          timestamp: Date.now()
        });
        
        return buildingName;
      }
    } else {
      console.log('Nearby Search returned no results or error:', nearbyData.status, nearbyData.error_message);
    }

    // Fallback to reverse geocoding for address
    console.log('Falling back to reverse geocoding...');
    const geocodeUrl = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${GOOGLE_PLACES_API_KEY}`;
    
    const geocodeResponse = await fetch(geocodeUrl);
    
    if (!geocodeResponse.ok) {
      console.error('Geocoding API response not ok:', geocodeResponse.status, geocodeResponse.statusText);
      throw new Error(`Geocoding API response not ok: ${geocodeResponse.status}`);
    }
    
    const geocodeData = await geocodeResponse.json();
    console.log('Geocoding API response status:', geocodeData.status);

    if (geocodeData.status === 'OK' && geocodeData.results && geocodeData.results.length > 0) {
      const result = geocodeData.results[0];
      
      // Try to extract a meaningful location name
      let locationName = '';
      
      // Look for specific address components
      if (result.address_components) {
        for (const component of result.address_components) {
          if (component.types && (component.types.includes('establishment') || 
              component.types.includes('point_of_interest'))) {
            locationName = component.long_name;
            break;
          }
        }
      }
      
      // If no establishment found, use street address
      if (!locationName && result.address_components) {
        const streetNumber = result.address_components.find(c => 
          c.types && c.types.includes('street_number'))?.long_name || '';
        const streetName = result.address_components.find(c => 
          c.types && c.types.includes('route'))?.long_name || '';
        
        if (streetName) {
          locationName = `${streetNumber} ${streetName}`.trim();
        }
      }
      
      // Final fallback to neighborhood or locality
      if (!locationName && result.address_components) {
        const neighborhood = result.address_components.find(c => 
          c.types && c.types.includes('neighborhood'))?.long_name;
        const locality = result.address_components.find(c => 
          c.types && c.types.includes('locality'))?.long_name;
        
        locationName = neighborhood || locality || 'Unknown Location';
      }
      
      // Use formatted address as last resort
      if (!locationName && result.formatted_address) {
        // Take first part of formatted address (before first comma)
        locationName = result.formatted_address.split(',')[0] || 'Unknown Location';
      }
      
      // Ensure we have a valid location name
      if (!locationName) {
        locationName = 'Unknown Location';
      }
      
      console.log('Found location via geocoding:', locationName);
      
      // Cache the result
      locationCache.set(cacheKey, {
        buildingName: locationName,
        timestamp: Date.now()
      });
      
      return locationName;
    } else {
      console.log('Geocoding returned no results or error:', geocodeData.status, geocodeData.error_message);
    }

    // Ultimate fallback
    console.log('All API calls failed, using ultimate fallback');
    return 'Unknown Location';
    
  } catch (error) {
    console.error('Error getting building name from coordinates:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      coordinates: { latitude, longitude }
    });
    return 'Unknown Location';
  }
};

/**
 * Clear the location cache (useful for testing or memory management)
 */
export const clearLocationCache = () => {
  locationCache.clear();
};

/**
 * Get cache size (for debugging)
 */
export const getCacheSize = () => {
  return locationCache.size;
}; 