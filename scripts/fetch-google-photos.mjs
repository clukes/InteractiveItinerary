import { readFileSync, writeFileSync } from 'fs';
import { config } from 'dotenv';

config();
const API_KEY = process.env.GOOGLE_MAPS_API_KEY;

if (!API_KEY || API_KEY === 'your_api_key_here') {
  console.error('Please set GOOGLE_MAPS_API_KEY in .env');
  process.exit(1);
}

const file = 'private/seville-itinerary.json';
const data = JSON.parse(readFileSync(file, 'utf8'));

async function searchPlace(query, lat, lng) {
  const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(query)}&location=${lat},${lng}&radius=500&key=${API_KEY}`;
  const res = await fetch(url);
  const json = await res.json();
  if (json.results && json.results.length > 0) {
    return json.results[0].place_id;
  }
  return null;
}

async function getPlaceDetails(placeId) {
  const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=photos&key=${API_KEY}`;
  const res = await fetch(url);
  const json = await res.json();
  return json.result?.photos || [];
}

function getPhotoUrl(photoReference, maxWidth = 800) {
  return `https://maps.googleapis.com/maps/api/place/photo?maxwidth=${maxWidth}&photo_reference=${photoReference}&key=${API_KEY}`;
}

async function processItinerary() {
  let updated = 0;
  for (const day of data.days) {
    for (const activity of day.activities) {
      console.log(`Processing: ${activity.name}`);
      
      // Skip if it's just a generic activity without a specific place
      if (activity.name.includes('Mercadona Run') || activity.name.includes('Walk Across Triana Bridge')) {
        continue;
      }

      const placeId = await searchPlace(activity.name, activity.location.lat, activity.location.lng);
      if (!placeId) {
        console.log(`  -> Place not found for ${activity.name}`);
        continue;
      }

      const photos = await getPlaceDetails(placeId);
      if (photos.length === 0) {
        console.log(`  -> No photos found for ${activity.name}`);
        continue;
      }

      // Main image: use the first photo
      if (photos.length > 0) {
        activity.image.url = getPhotoUrl(photos[0].photo_reference);
        activity.image.alt = `Photo of ${activity.name}`;
        updated++;
      }

      // Photo examples: try to find photos that might have people (hard to guarantee via API, but we can pick later photos in the array)
      if (photos.length > 1) {
        // Pick a photo from the middle of the array, hoping it's a user-uploaded photo with people
        const examplePhotoIdx = Math.min(Math.floor(photos.length / 2), photos.length - 1);
        const examplePhoto = photos[examplePhotoIdx];
        
        activity.photoExamples = [{
          url: getPhotoUrl(examplePhoto.photo_reference),
          alt: `Visitor photo at ${activity.name}`,
          credit: "Google Maps User",
          pageUrl: activity.location.mapsUrl
        }];
      }
      
      // Add a small delay to avoid hitting API rate limits
      await new Promise(resolve => setTimeout(resolve, 200));
    }
  }

  if (updated > 0) {
    writeFileSync(file, JSON.stringify(data, null, 4) + '\n', 'utf8');
    console.log(`\nSuccessfully updated ${updated} activities with Google Maps photos.`);
  } else {
    console.log('\nNo activities were updated.');
  }
}

processItinerary().catch(console.error);
