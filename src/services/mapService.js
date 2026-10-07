const MAPBOX_ACCESS_TOKEN = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN;

export const geocode = async (query, proximity = null) => {
  if (!MAPBOX_ACCESS_TOKEN || MAPBOX_ACCESS_TOKEN === 'YOUR_TOKEN') {
    throw new Error("Mapbox Access Token is missing or invalid. Please add VITE_MAPBOX_ACCESS_TOKEN to .env");
  }
  
  let url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${MAPBOX_ACCESS_TOKEN}`;
  if (proximity && Array.isArray(proximity) && proximity.length === 2) {
    url += `&proximity=${proximity[0]},${proximity[1]}`;
  }
  
  const response = await fetch(url);
  if (!response.ok) throw new Error('Geocoding failed');
  const data = await response.json();
  
  return data.features.map(f => ({
    name: f.place_name,
    center: f.center, // [lng, lat]
  }));
};

export const getRoutes = async (origin, destination, preference = 'safest') => {
  if (!MAPBOX_ACCESS_TOKEN || MAPBOX_ACCESS_TOKEN === 'YOUR_TOKEN') {
    throw new Error("Mapbox Access Token is missing or invalid. Please add VITE_MAPBOX_ACCESS_TOKEN to .env");
  }
  
  // origin/destination are [lng, lat]
  const response = await fetch(
    `https://api.mapbox.com/directions/v5/mapbox/driving/${origin[0]},${origin[1]};${destination[0]},${destination[1]}?alternatives=true&geometries=geojson&overview=full&access_token=${MAPBOX_ACCESS_TOKEN}`
  );
  if (!response.ok) throw new Error('Routing failed');
  const data = await response.json();
  
  // Simulated safety logic to rank routes (In a real app, this would intersect with incident DB)
  return data.routes.map((route, index) => {
    // Generate deterministic but pseudo-random safety scores based on route distance/duration
    const baseScore = 60 + (route.distance % 30); 
    const lightingScore = 70 + (route.duration % 25);
    const activityScore = 50 + (route.distance % 40);
    const riskScore = 100 - ((lightingScore + activityScore) / 2);
    
    return {
      id: `route-${index}`,
      geometry: route.geometry,
      distance: (route.distance / 1000).toFixed(1) + ' km',
      duration: Math.round(route.duration / 60) + ' mins',
      distanceValue: route.distance,
      durationValue: route.duration,
      safetyScore: Math.min(100, Math.round(baseScore)),
      lightingScore: Math.min(100, Math.round(lightingScore)),
      activityScore: Math.min(100, Math.round(activityScore)),
      incidentRiskScore: Math.max(0, Math.round(riskScore))
    };
  });
};
