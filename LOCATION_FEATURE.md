# Location Sharing Feature

## Overview
The location sharing feature allows users to share their precise location with friends when their "sig" is ON. Instead of showing vague coordinates or city names, the app displays specific building names like "Engineering Library" or "Starbucks on Main St".

## Implementation

### Google Places API Integration
- **API Key**: Securely stored in `config/environment.js`
- **Caching**: 10-minute cache to minimize API calls and costs
- **Fallback Strategy**: Multiple fallback levels for reliable location names

### Location Tracking
- **Trigger**: Only when user's sig status is ON
- **Frequency**: Every 30 seconds with 50-meter distance threshold
- **Privacy**: Location cleared when sig is turned OFF

### Building Name Resolution
1. **Nearby Search**: Finds specific establishments within 50m radius
2. **Reverse Geocoding**: Falls back to street addresses
3. **Smart Filtering**: Prioritizes relevant building types (universities, cafes, etc.)

## Features

### In The Cave Screen
- Shows friends' real-time locations when they have sig ON
- Displays building names like "Gates Computer Science Building"
- Shows time since last location update
- Location icon indicator for active sharing

### Privacy Controls
- Location only tracked when sig is ON
- Automatic location clearing when sig is turned OFF
- No background tracking without explicit sig activation

## Technical Details

### Files Modified/Created
- `config/environment.js` - Secure API key storage
- `firebase/placesService.js` - Google Places API integration
- `firebase/locationServices.js` - Enhanced location tracking
- `firebase/locationTasks.js` - Background location updates
- `firebase/services.js` - Sig status with location integration
- `screens/TheCaveScreen.js` - Location display UI

### API Usage Optimization
- **Caching**: Reduces redundant API calls
- **Batch Processing**: Efficient location updates
- **Smart Triggers**: Only tracks when necessary

## Usage Example
When John turns his sig ON at Stanford:
1. Location tracking starts automatically
2. Google Places API identifies "Gates Computer Science Building"
3. Friends see "John is at Gates Computer Science Building • 2m ago"
4. When John turns sig OFF, location sharing stops

## Security
- API key hidden from public access
- Environment-based configuration for production
- No location data stored when sig is OFF 